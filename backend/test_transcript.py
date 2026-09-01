"""Tests for transcript retrieval and the Supadata client.

Network calls are stubbed so the suite runs offline and deterministically.
Nothing here fakes a successful transcript on a real API failure: every error
path asserts that the failure is reported rather than swallowed.

Run:  python -m unittest test_transcript -v
"""

import os
import unittest
from unittest import mock

import supadata
import transcript


_INVALID_JSON = object()


class FakeResponse:
    def __init__(self, status_code, payload=None):
        self.status_code = status_code
        self._payload = payload if payload is not None else {}

    def json(self):
        if self._payload is _INVALID_JSON:
            raise ValueError("no json")
        return self._payload


def _segments(*pairs):
    return [
        {"text": text, "offset": offset, "duration": 1000.0}
        for text, offset in pairs
    ]


def _ok_segment_response():
    return FakeResponse(200, {"content": [
        {"text": "hi", "offset": 0, "duration": 1000}]})


class ExtractVideoIdTests(unittest.TestCase):
    def test_standard_watch_url(self):
        self.assertEqual(
            transcript.extract_video_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
            "dQw4w9WgXcQ",
        )

    def test_short_url(self):
        self.assertEqual(
            transcript.extract_video_id("https://youtu.be/dQw4w9WgXcQ"),
            "dQw4w9WgXcQ",
        )

    def test_rejects_non_youtube_text(self):
        self.assertIsNone(transcript.extract_video_id("not a url"))


class GetTranscriptContractTests(unittest.TestCase):
    """The (text, duration_seconds) / "Transcript Error: " contract app.py relies on."""

    def test_returns_text_and_duration_from_segments(self):
        with mock.patch.object(
            supadata, "fetch_segments",
            return_value=_segments(("Python is a language.", 0.0),
                                   ("Lists are mutable.", 5000.0)),
        ):
            text, duration = transcript.get_transcript(
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ")

        self.assertEqual(text, "Python is a language.\nLists are mutable.")
        # last offset 5000ms + duration 1000ms = 6.0s
        self.assertAlmostEqual(duration, 6.0)

    def test_segments_are_joined_one_per_line_so_filler_filtering_works(self):
        """strip_filler matches per line, so a promo caption must not take the
        caption beside it."""
        with mock.patch.object(
            supadata, "fetch_segments",
            return_value=_segments(("Please subscribe to the channel.", 0.0),
                                   ("A tuple is immutable.", 2000.0)),
        ):
            text, _ = transcript.get_transcript(
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ")

        self.assertEqual(text, "A tuple is immutable.")

    def test_coarse_segments_are_split_so_filler_does_not_destroy_teaching(self):
        """Regression: Supadata returns 500-char blocks for some videos.

        Live testing showed one "pause the video" inside such a block dropped
        ~450 characters of real teaching with it — 27% of a 5-hour course.
        Splitting to sentences first keeps the filter surgical.
        """
        block = ("Pause the video and think about it. "
                 "The exponentiation operator raises a number to a power. "
                 "2 to the power of 3 is 8.")

        with mock.patch.object(
            supadata, "fetch_segments", return_value=_segments((block, 0.0)),
        ):
            text, _ = transcript.get_transcript(
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ")

        self.assertNotIn("Pause the video", text)
        self.assertIn("exponentiation operator", text)
        self.assertIn("2 to the power of 3 is 8.", text)

    def test_caption_sized_segments_are_left_alone(self):
        """Fine-grained captions (the other provider shape) must not regress."""
        with mock.patch.object(
            supadata, "fetch_segments",
            return_value=_segments(("a variable holds", 0.0),
                                   ("a value in memory", 1000.0)),
        ):
            text, _ = transcript.get_transcript(
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ")

        self.assertEqual(text, "a variable holds\na value in memory")

    def test_invalid_url_reports_error_without_calling_provider(self):
        with mock.patch.object(supadata, "fetch_segments") as fetch:
            text, duration = transcript.get_transcript("nonsense")

        fetch.assert_not_called()
        self.assertTrue(text.startswith("Transcript Error"))
        self.assertEqual(duration, 0)

    def test_supadata_failure_surfaces_as_transcript_error(self):
        with mock.patch.object(
            supadata, "fetch_segments",
            side_effect=supadata.SupadataError("the transcript service timed out"),
        ):
            text, duration = transcript.get_transcript(
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ")

        self.assertTrue(text.startswith("Transcript Error"))
        self.assertIn("timed out", text)
        self.assertEqual(duration, 0)

    def test_all_filler_transcript_reports_empty_rather_than_blank_success(self):
        with mock.patch.object(
            supadata, "fetch_segments",
            return_value=_segments(("Please subscribe.", 0.0),
                                   ("Hit the like button.", 1000.0)),
        ):
            text, duration = transcript.get_transcript(
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ")

        self.assertTrue(text.startswith("Transcript Error"))
        self.assertEqual(duration, 0)

    def test_unknown_provider_is_rejected_loudly(self):
        with mock.patch.dict(os.environ, {"NOTETUBE_TRANSCRIPT_PROVIDER": "webshare"}):
            text, duration = transcript.get_transcript(
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ")

        self.assertTrue(text.startswith("Transcript Error"))
        self.assertIn("Unknown transcript provider", text)
        self.assertEqual(duration, 0)


class SupadataClientTests(unittest.TestCase):
    def setUp(self):
        env = mock.patch.dict(os.environ, {"SUPADATA_API_KEY": "test-key"})
        env.start()
        self.addCleanup(env.stop)

    def test_missing_key_is_reported_not_silently_skipped(self):
        with mock.patch.dict(os.environ, {"SUPADATA_API_KEY": ""}):
            self.assertFalse(supadata.is_configured())
            with self.assertRaises(supadata.SupadataError) as ctx:
                supadata.fetch_segments("https://www.youtube.com/watch?v=x")

        self.assertIn("not configured", str(ctx.exception))

    def test_api_key_is_sent_as_header_and_never_in_query(self):
        captured = {}

        def fake_get(url, params=None, headers=None, timeout=None):
            captured["params"] = params
            captured["headers"] = headers
            return _ok_segment_response()

        with mock.patch.object(supadata.requests, "get", side_effect=fake_get):
            supadata.fetch_segments("https://www.youtube.com/watch?v=x")

        self.assertEqual(captured["headers"]["x-api-key"], "test-key")
        self.assertNotIn("test-key", str(captured["params"]))

    def test_requests_segments_not_plain_text(self):
        """text=false is required: duration and per-line filtering depend on it."""
        captured = {}

        def fake_get(url, params=None, headers=None, timeout=None):
            captured.update(params or {})
            return _ok_segment_response()

        with mock.patch.object(supadata.requests, "get", side_effect=fake_get):
            supadata.fetch_segments("https://www.youtube.com/watch?v=x")

        self.assertEqual(captured["text"], "false")

    def test_defaults_to_native_mode_to_avoid_ai_generation_billing(self):
        captured = {}

        def fake_get(url, params=None, headers=None, timeout=None):
            captured.update(params or {})
            return _ok_segment_response()

        with mock.patch.dict(os.environ, {"NOTETUBE_SUPADATA_MODE": ""}):
            with mock.patch.object(supadata.requests, "get", side_effect=fake_get):
                supadata.fetch_segments("https://www.youtube.com/watch?v=x")

        self.assertEqual(captured["mode"], "native")

    def test_async_job_is_polled_to_completion(self):
        responses = [
            FakeResponse(202, {"jobId": "job-1"}),
            FakeResponse(200, {"status": "active"}),
            FakeResponse(200, {"status": "completed", "content": [
                {"text": "done", "offset": 0, "duration": 2000}]}),
        ]

        with mock.patch.object(supadata.requests, "get",
                               side_effect=lambda *a, **k: responses.pop(0)):
            with mock.patch.object(supadata.time, "sleep"):
                segments = supadata.fetch_segments("https://www.youtube.com/watch?v=x")

        self.assertEqual(segments[0]["text"], "done")

    def test_failed_job_raises_rather_than_returning_empty(self):
        responses = [
            FakeResponse(202, {"jobId": "job-1"}),
            FakeResponse(200, {"status": "failed", "error": "source unavailable"}),
        ]

        with mock.patch.object(supadata.requests, "get",
                               side_effect=lambda *a, **k: responses.pop(0)):
            with mock.patch.object(supadata.time, "sleep"):
                with self.assertRaises(supadata.SupadataError) as ctx:
                    supadata.fetch_segments("https://www.youtube.com/watch?v=x")

        self.assertIn("source unavailable", str(ctx.exception))

    def test_http_status_mapping(self):
        cases = {
            206: "no transcript is available",
            404: "unavailable or private",
            401: "rejected our API key",
            403: "rejected our API key",
            429: "rate limiting",
        }

        for status, expected in cases.items():
            with self.subTest(status=status):
                with mock.patch.object(supadata.requests, "get",
                                       return_value=FakeResponse(status, _INVALID_JSON)):
                    with self.assertRaises(supadata.SupadataError) as ctx:
                        supadata.fetch_segments("https://www.youtube.com/watch?v=x")

                self.assertIn(expected, str(ctx.exception))

    def test_timeout_is_reported_as_error(self):
        with mock.patch.object(supadata.requests, "get",
                               side_effect=supadata.requests.exceptions.Timeout()):
            with self.assertRaises(supadata.SupadataError) as ctx:
                supadata.fetch_segments("https://www.youtube.com/watch?v=x")

        self.assertIn("timed out", str(ctx.exception))

    def test_plain_text_response_is_rejected_not_silently_accepted(self):
        with mock.patch.object(supadata.requests, "get",
                               return_value=FakeResponse(200, {"content": "just text"})):
            with self.assertRaises(supadata.SupadataError):
                supadata.fetch_segments("https://www.youtube.com/watch?v=x")

    def test_empty_content_raises_rather_than_returning_empty_list(self):
        with mock.patch.object(supadata.requests, "get",
                               return_value=FakeResponse(200, {"content": []})):
            with self.assertRaises(supadata.SupadataError):
                supadata.fetch_segments("https://www.youtube.com/watch?v=x")

    def test_timeout_is_configured(self):
        self.assertEqual(supadata._TIMEOUT, (10, 90))


if __name__ == "__main__":
    unittest.main(verbosity=2)
