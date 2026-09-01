"""Supadata client — how NoteTube gets YouTube transcripts in production.

Fetching captions directly from YouTube works from a home connection but not
from a datacenter: tested from EC2, `youtube-transcript-api` returned
RequestBlocked for most videos, and free datacenter proxies returned IpBlocked.
Supadata was validated end to end from the same EC2 host and is the supported
path; see transcript.py for how the two providers are selected.

Segments are requested rather than plain text (`text=true`) for two reasons:
strip_filler() matches line by line and needs one caption per line, and the
study tier limits are derived from the video duration, which only the
timestamped form carries.
"""

import os
import time

import requests

_API_BASE = "https://api.supadata.ai/v1"

# (connect, read). Generous read budget: a long video's transcript is a large
# response, and the alternative to waiting is failing a request that would
# have succeeded.
_TIMEOUT = (10, 90)

# A long video comes back as a job rather than inline. Poll rather than make
# the user retry; the ceiling stops a stuck job from pinning a worker forever.
_POLL_INTERVAL_SECONDS = 1.5
_JOB_TIMEOUT_SECONDS = 240

# "native" fetches only transcripts YouTube already has. "auto"/"generate" fall
# back to AI transcription, which is billed differently — opt in deliberately
# via NOTETUBE_SUPADATA_MODE rather than paying for it by accident.
_DEFAULT_MODE = "native"


class SupadataError(Exception):
    """Supadata could not return a transcript.

    Carries a message already suitable for showing to a user; transcript.py
    prefixes it to match the existing error contract.
    """


def _api_key():
    return (os.getenv("SUPADATA_API_KEY") or "").strip()


def is_configured():
    """True when an API key is present. Never logs or returns the key itself."""
    return bool(_api_key())


def _request(url, params):
    key = _api_key()
    if not key:
        raise SupadataError("transcript service is not configured")

    try:
        return requests.get(
            url,
            params=params,
            headers={"x-api-key": key},
            timeout=_TIMEOUT,
        )
    except requests.exceptions.Timeout:
        raise SupadataError("the transcript service timed out")
    except requests.exceptions.RequestException as exc:
        # Network-level failure (DNS, TLS, connection refused). The class name
        # is enough to diagnose without leaking the request URL or key.
        raise SupadataError(
            "could not reach the transcript service (%s)" % type(exc).__name__
        )


def _explain(response):
    """Turn a non-200 response into a user-facing reason.

    Supadata's documented statuses are mapped explicitly so an operator can
    tell a missing transcript apart from a bad key or a blocked video.
    """
    status = response.status_code

    if status == 206:
        return "no transcript is available for this video"
    if status == 404:
        return "the video is unavailable or private"
    if status in (401, 403):
        return "the transcript service rejected our API key"
    if status == 429:
        return "the transcript service is rate limiting us; try again shortly"

    # Supadata returns a JSON body with a message on most errors; fall back to
    # the status code when it does not.
    try:
        payload = response.json()
    except ValueError:
        payload = {}

    detail = payload.get("message") or payload.get("error")
    if detail:
        return str(detail)

    return "the transcript service returned HTTP %d" % status


def _await_job(job_id):
    """Poll an async transcript job until it finishes, fails, or times out."""
    deadline = time.monotonic() + _JOB_TIMEOUT_SECONDS

    while time.monotonic() < deadline:
        time.sleep(_POLL_INTERVAL_SECONDS)

        response = _request("%s/transcript/%s" % (_API_BASE, job_id), params={})
        if response.status_code != 200:
            raise SupadataError(_explain(response))

        payload = response.json()
        status = payload.get("status")

        if status == "completed":
            return payload
        if status == "failed":
            raise SupadataError(payload.get("error") or "transcript job failed")

    raise SupadataError("the transcript service took too long to respond")


def _segments_from(payload):
    """Normalize a completed payload into [{text, offset, duration}, ...]."""
    content = payload.get("content")

    # A string means the API returned plain text. We always ask for segments,
    # so this indicates a contract change rather than a per-video quirk —
    # surface it instead of silently producing a transcript with no timings.
    if isinstance(content, str):
        raise SupadataError(
            "the transcript service returned plain text where segments were expected"
        )

    if not isinstance(content, list) or not content:
        raise SupadataError("no transcript is available for this video")

    segments = []
    for item in content:
        if not isinstance(item, dict):
            continue

        text = (item.get("text") or "").strip()
        if not text:
            continue

        segments.append({
            "text": text,
            "offset": float(item.get("offset") or 0.0),
            "duration": float(item.get("duration") or 0.0),
        })

    if not segments:
        raise SupadataError("the transcript for this video is empty")

    return segments


def fetch_segments(video_url, language="en"):
    """Return [{text, offset, duration}, ...] for `video_url`.

    offset/duration are milliseconds, matching Supadata. Raises SupadataError
    with a user-safe message on any failure — callers should never see an
    HTTP-layer exception.
    """
    params = {
        "url": video_url,
        "text": "false",
        "mode": os.getenv("NOTETUBE_SUPADATA_MODE") or _DEFAULT_MODE,
    }
    if language:
        params["lang"] = language

    response = _request("%s/transcript" % _API_BASE, params)

    # Long videos are handed off to a job instead of answering inline.
    if response.status_code == 202:
        return _segments_from(_await_job(response.json().get("jobId")))

    if response.status_code != 200:
        raise SupadataError(_explain(response))

    return _segments_from(response.json())
