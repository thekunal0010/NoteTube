"""Tests for the AI seam (llm.py) and the Gemini provider (gemini.py).

No real Gemini calls are made: the SDK client is stubbed, so the suite runs
offline, deterministically, and without spending quota. Real
google.genai.errors instances are used for the status-mapping tests so the
error handling is exercised against the actual SDK classes rather than
look-alikes.

Nothing here fabricates a completion on a failure — every error path asserts
the failure is raised, not swallowed into an empty-but-successful result.

Run:  python -m unittest test_llm -v
"""

import os
import unittest
from unittest import mock

from google.genai import errors

import gemini
import llm


def _gemini_env(**overrides):
    """Environment with Gemini selected and configured."""
    env = {"NOTETUBE_LLM_PROVIDER": "gemini", "GEMINI_API_KEY": "test-key"}
    env.update(overrides)
    return mock.patch.dict(os.environ, env)


class FakeInteraction:
    def __init__(self, output_text):
        self.output_text = output_text


class FakeClient:
    """Stands in for genai.Client, recording what it was asked to generate."""

    def __init__(self, result=None, error=None):
        self._result = result
        self._error = error
        self.calls = []
        self.interactions = self

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if self._error is not None:
            raise self._error
        return self._result


def _client(result=None, error=None):
    fake = FakeClient(result=result, error=error)
    return fake, mock.patch.object(gemini, "_get_client", return_value=fake)


class ImportHealthTests(unittest.TestCase):
    """llm.py must import, and report a provider, with no ML stack present."""

    def test_llm_imports_without_torch(self):
        # llm.py imports torch only inside the local path's functions, so the
        # module object itself must carry no torch reference.
        self.assertNotIn("torch", dir(llm))

    def test_public_interface_is_unchanged(self):
        for name in ("is_available", "chat", "chat_batch"):
            self.assertTrue(callable(getattr(llm, name)), name)
        self.assertIsInstance(llm.BATCH_SIZE, int)

    def test_call_sites_still_use_the_seam(self):
        """summarizer and study_tools must not reach past llm.py to a provider."""
        import study_tools
        import summarizer

        for module in (summarizer, study_tools):
            self.assertTrue(hasattr(module, "llm"))
            self.assertFalse(hasattr(module, "gemini"),
                             "%s should not import a provider directly" % module.__name__)


class ProviderSelectionTests(unittest.TestCase):
    def test_defaults_to_gemini(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("NOTETUBE_LLM_PROVIDER", None)
            self.assertEqual(llm._provider(), "gemini")

    def test_available_when_gemini_configured(self):
        with _gemini_env():
            self.assertTrue(llm.is_available())

    def test_unavailable_when_gemini_key_missing(self):
        with _gemini_env(GEMINI_API_KEY=""):
            self.assertFalse(llm.is_available())
            self.assertFalse(gemini.is_configured())

    def test_missing_key_does_not_fall_back_to_local_model(self):
        """A missing production key must not silently load 3GB of Qwen."""
        with _gemini_env(GEMINI_API_KEY=""):
            with mock.patch.object(llm, "_load") as load:
                self.assertFalse(llm.is_available())
            load.assert_not_called()

    def test_unknown_provider_is_rejected(self):
        with mock.patch.dict(os.environ, {"NOTETUBE_LLM_PROVIDER": "openai"}):
            self.assertFalse(llm.is_available())

    def test_local_provider_still_routes_to_qwen(self):
        with mock.patch.dict(os.environ, {"NOTETUBE_LLM_PROVIDER": "local"}):
            with mock.patch.object(llm, "_load") as load:
                llm._model = None
                self.assertFalse(llm.is_available())
            load.assert_called_once()


class GeminiSuccessTests(unittest.TestCase):
    def setUp(self):
        gemini._client = None
        self.addCleanup(setattr, gemini, "_client", None)

    def test_reply_is_normalized_into_the_llm_contract(self):
        fake, patch_client = _client(result=FakeInteraction("  A note about lists.  "))
        with _gemini_env(), patch_client:
            replies = llm.chat_batch("SYSTEM", ["prompt one"], max_new_tokens=120)

        self.assertEqual(replies, ["A note about lists."])

    def test_chat_returns_a_single_string(self):
        fake, patch_client = _client(result=FakeInteraction("An overview."))
        with _gemini_env(), patch_client:
            self.assertEqual(llm.chat("SYSTEM", "prompt"), "An overview.")

    def test_batch_preserves_order_and_issues_one_call_per_prompt(self):
        class Sequenced(FakeClient):
            def create(self, **kwargs):
                self.calls.append(kwargs)
                return FakeInteraction("reply to %s" % kwargs["input"])

        fake = Sequenced()
        with _gemini_env(), mock.patch.object(gemini, "_get_client", return_value=fake):
            replies = llm.chat_batch("SYSTEM", ["a", "b", "c"])

        self.assertEqual(replies, ["reply to a", "reply to b", "reply to c"])
        self.assertEqual(len(fake.calls), 3)

    def test_prompt_shape_is_preserved(self):
        """System prompt, user prompt and token cap must reach the API intact."""
        fake, patch_client = _client(result=FakeInteraction("ok"))
        with _gemini_env(), patch_client:
            llm.chat_batch("SYS", ["USER"], max_new_tokens=321)

        call = fake.calls[0]
        self.assertEqual(call["system_instruction"], "SYS")
        self.assertEqual(call["input"], "USER")
        self.assertEqual(call["generation_config"]["max_output_tokens"], 321)

    def test_generation_is_deterministic(self):
        """Matches the local path's greedy decoding, so notes are reproducible."""
        fake, patch_client = _client(result=FakeInteraction("ok"))
        with _gemini_env(), patch_client:
            llm.chat_batch("SYS", ["USER"])

        self.assertEqual(fake.calls[0]["generation_config"]["temperature"], 0)

    def test_empty_prompt_list_makes_no_api_call(self):
        fake, patch_client = _client(result=FakeInteraction("ok"))
        with _gemini_env(), patch_client:
            self.assertEqual(llm.chat_batch("SYS", []), [])
        self.assertEqual(fake.calls, [])

    def test_unconfigured_returns_empty_without_calling_api(self):
        fake, patch_client = _client(result=FakeInteraction("ok"))
        with _gemini_env(GEMINI_API_KEY=""), patch_client:
            self.assertEqual(llm.chat_batch("SYS", ["a"]), [])
            self.assertEqual(llm.chat("SYS", "a"), "")
        self.assertEqual(fake.calls, [])


class GeminiFailureTests(unittest.TestCase):
    """Failures must surface. None of these may return a usable-looking reply."""

    def setUp(self):
        gemini._client = None
        self.addCleanup(setattr, gemini, "_client", None)

    def test_missing_key_raises_a_clear_error(self):
        with mock.patch.dict(os.environ, {"GEMINI_API_KEY": ""}):
            with self.assertRaises(gemini.GeminiError) as ctx:
                gemini.generate("SYS", "USER", 100)

        self.assertIn("not configured", str(ctx.exception))
        self.assertIn("GEMINI_API_KEY", str(ctx.exception))

    def test_status_mapping(self):
        cases = {
            401: "rejected our API key",
            403: "rejected our API key",
            429: "rate limiting",
            400: "rejected the request as invalid",
        }
        for code, expected in cases.items():
            with self.subTest(code=code):
                gemini._client = None
                err = errors.ClientError(code, {"error": {"message": "x", "code": code}})
                _, patch_client = _client(error=err)
                with _gemini_env(), patch_client:
                    with self.assertRaises(gemini.GeminiError) as ctx:
                        gemini.generate("SYS", "USER", 100)
                self.assertIn(expected, str(ctx.exception))

    def test_server_error_is_reported_as_transient(self):
        err = errors.ServerError(503, {"error": {"message": "x", "code": 503}})
        _, patch_client = _client(error=err)
        with _gemini_env(), patch_client:
            with self.assertRaises(gemini.GeminiError) as ctx:
                gemini.generate("SYS", "USER", 100)

        self.assertIn("temporarily unavailable", str(ctx.exception))

    def test_transport_error_is_wrapped_not_leaked(self):
        _, patch_client = _client(error=OSError("connection reset"))
        with _gemini_env(), patch_client:
            with self.assertRaises(gemini.GeminiError) as ctx:
                gemini.generate("SYS", "USER", 100)

        self.assertIn("could not reach", str(ctx.exception))

    def test_empty_response_raises_rather_than_returning_blank(self):
        for blank in ("", "   ", None):
            with self.subTest(value=repr(blank)):
                gemini._client = None
                _, patch_client = _client(result=FakeInteraction(blank))
                with _gemini_env(), patch_client:
                    with self.assertRaises(gemini.GeminiError) as ctx:
                        gemini.generate("SYS", "USER", 100)
                self.assertIn("empty response", str(ctx.exception))

    def test_malformed_response_object_raises(self):
        """A response with no output_text at all must not become a blank note."""
        _, patch_client = _client(result=object())
        with _gemini_env(), patch_client:
            with self.assertRaises(gemini.GeminiError):
                gemini.generate("SYS", "USER", 100)

    def test_api_failure_propagates_through_the_seam(self):
        """chat_batch must not turn a live outage into an empty result, which
        callers read as 'nothing to say' rather than 'it broke'."""
        err = errors.ClientError(429, {"error": {"message": "x", "code": 429}})
        _, patch_client = _client(error=err)
        with _gemini_env(), patch_client:
            with self.assertRaises(gemini.GeminiError):
                llm.chat_batch("SYS", ["a"])


class SecretHandlingTests(unittest.TestCase):
    def test_key_is_never_in_an_error_message(self):
        gemini._client = None
        self.addCleanup(setattr, gemini, "_client", None)

        err = errors.ClientError(403, {"error": {"message": "denied", "code": 403}})
        _, patch_client = _client(error=err)
        with _gemini_env(GEMINI_API_KEY="super-secret-value"), patch_client:
            with self.assertRaises(gemini.GeminiError) as ctx:
                gemini.generate("SYS", "USER", 100)

        self.assertNotIn("super-secret-value", str(ctx.exception))

    def test_is_configured_returns_a_bool_not_the_key(self):
        with _gemini_env(GEMINI_API_KEY="super-secret-value"):
            self.assertIs(gemini.is_configured(), True)


if __name__ == "__main__":
    unittest.main(verbosity=2)
