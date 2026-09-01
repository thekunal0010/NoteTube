"""Transcript retrieval. Public contract is unchanged: get_transcript(url)
returns (text, duration_seconds), or ("Transcript Error: ...", 0) on failure.

Two providers sit behind that contract:

  supadata (default) — the production path. Direct YouTube access fails from a
    datacenter: tested from EC2, youtube-transcript-api returned RequestBlocked
    for most videos and free datacenter proxies returned IpBlocked. Supadata
    was validated from that same host.

  local — youtube-transcript-api, kept for development on a home connection
    where it works fine and costs nothing. Selected explicitly, never as a
    silent fallback: if it took over automatically whenever the API key was
    missing, a production box with a misconfigured key would look healthy and
    then fail on every video with a confusing YouTube error instead of saying
    the transcript service is not configured.
"""

import os
import re

import supadata
from text_filters import strip_filler

_DEFAULT_PROVIDER = "supadata"


def extract_video_id(url):

    pattern = r"(?:v=|\/)([0-9A-Za-z_-]{11}).*"

    match = re.search(pattern, url)

    if match:
        return match.group(1)

    return None


def _provider():
    return (os.getenv("NOTETUBE_TRANSCRIPT_PROVIDER") or _DEFAULT_PROVIDER).strip().lower()


# Same sentence boundary the summarizer and study_tools use. Duplicated rather
# than imported: study_tools pulls in llm and therefore torch, which transcript
# retrieval must not depend on.
_SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?])\s+")


def _to_lines(segments):
    """Flatten segments into one sentence per line.

    Providers disagree wildly about segment size. youtube-transcript-api gives
    a caption at a time (~30 chars); Supadata returns ~30 chars for some videos
    but pre-chunked 500-char blocks for others. Since strip_filler() drops a
    whole line when it matches, a 500-char block containing one "pause the
    video" also took ~450 characters of real teaching with it — measured at 27%
    of a 5-hour Python course, including the sections on operator precedence
    and round(). Splitting to sentences first keeps the filter surgical
    whatever the provider hands back.
    """
    lines = []

    for segment in segments:
        for sentence in _SENTENCE_BOUNDARY.split(segment["text"]):
            sentence = sentence.strip()
            if sentence:
                lines.append(sentence)

    return lines


def _segments_via_supadata(video_id):
    """Ask Supadata for timestamped segments.

    The URL is rebuilt from the parsed id rather than forwarding whatever the
    user pasted, so playlist/timestamp query strings cannot change what the
    provider resolves.
    """
    return supadata.fetch_segments("https://www.youtube.com/watch?v=%s" % video_id)


def _segments_via_local(video_id):
    """Development-only path through youtube-transcript-api.

    Imported lazily so production never needs the package installed, and so a
    container built without it still starts.
    """
    from youtube_transcript_api import YouTubeTranscriptApi

    api = YouTubeTranscriptApi()
    transcript_list = api.list(video_id)

    transcript = None

    # Prefer an English transcript (manual, then auto-generated).
    try:
        transcript = transcript_list.find_transcript(["en", "en-US", "en-GB"])
    except Exception:
        pass

    # Fall back to any available transcript, translating to English when possible.
    if transcript is None:
        for candidate in transcript_list:
            transcript = candidate
            break

    if transcript is None:
        raise RuntimeError("No transcript is available for this video")

    if transcript.language_code not in ("en", "en-US", "en-GB") and transcript.is_translatable:
        try:
            transcript = transcript.translate("en")
        except Exception:
            pass

    # Normalized to the same shape (and millisecond units) Supadata returns so
    # everything downstream is provider-agnostic.
    return [
        {
            "text": snippet.text,
            "offset": snippet.start * 1000.0,
            "duration": snippet.duration * 1000.0,
        }
        for snippet in transcript.fetch()
    ]


def get_transcript(url):
    """Returns (text, duration_seconds) on success, or (error_message, 0) on failure.

    duration_seconds comes from the last segment's timing rather than a
    separate YouTube Data API call, and is measured before filler is stripped —
    it describes the video, not the surviving text.
    """
    try:
        video_id = extract_video_id(url)
        if not video_id:
            return "Transcript Error: Could not find a valid YouTube video ID in that URL", 0

        provider = _provider()

        if provider == "local":
            segments = _segments_via_local(video_id)
        elif provider == _DEFAULT_PROVIDER:
            segments = _segments_via_supadata(video_id)
        else:
            return "Transcript Error: Unknown transcript provider %r" % provider, 0

        if not segments:
            return "Transcript Error: The transcript for this video is empty", 0

        # One sentence per line: strip_filler matches line by line, so this is
        # what lets a "please subscribe" aside be dropped without taking the
        # sentence beside it.
        text = "\n".join(_to_lines(segments))

        # Drop channel boilerplate (subscribe pitches, greetings, outros) before
        # anything downstream sees it. Otherwise the summarizer treats it as
        # course material and the quiz builds questions about the bell icon.
        # Checked after filtering so a video that is nothing but promo still
        # reports as empty rather than producing an empty summary.
        text = strip_filler(text)

        if not text or not text.strip():
            return "Transcript Error: The transcript for this video is empty", 0

        last = segments[-1]
        duration_seconds = (last["offset"] + last["duration"]) / 1000.0

        return text, duration_seconds

    except supadata.SupadataError as e:

        return f"Transcript Error: {str(e)}", 0

    except Exception as e:

        return f"Transcript Error: {str(e)}", 0
