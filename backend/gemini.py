"""Gemini client — the production AI provider.

The local Qwen path in llm.py needs ~4.2GB of torch and a CUDA GPU, neither of
which a small production instance has. Gemini is an HTTPS call, so the
production image carries no ML stack at all (see Phase 2 in
docs/PROJECT_MEMORY.md).

Shaped like supadata.py deliberately: a thin client that raises one error type
carrying a user-safe message, with the provider choice made in the router
module (llm.py, mirroring transcript.py).
"""

import os

# The SDK is imported lazily so llm.py can be imported — and the provider
# reported as unconfigured — on an environment that has not installed it.

# gemini-3.5-flash-lite is the economy tier: Google documents it as their
# fastest and most cost-effective model for high-throughput work. NoteTube's
# calls are short, templated extraction prompts over transcript chunks, which
# is exactly that shape, and this is a low-traffic learning project where a
# frontier model would be paid for and wasted.
_DEFAULT_MODEL = "gemini-3.5-flash-lite"

_MODEL = os.getenv("NOTETUBE_GEMINI_MODEL") or _DEFAULT_MODEL

# Milliseconds — the SDK's HttpOptions.timeout is documented in ms, not
# seconds. A summarization prompt over a large chunk is not fast, and failing a
# request that would have succeeded is worse than waiting.
_TIMEOUT_MS = int(os.getenv("NOTETUBE_GEMINI_TIMEOUT_MS") or 90000)

_client = None


class GeminiError(Exception):
    """Gemini could not produce a completion.

    Carries a message already suitable for showing to a user.
    """


def _api_key():
    return (os.getenv("GEMINI_API_KEY") or "").strip()


def is_configured():
    """True when a key is present and the SDK is installed.

    Deliberately does not call the API: this answers "is this provider set up",
    not "is Google reachable right now". Never logs or returns the key.
    """
    if not _api_key():
        return False

    try:
        import google.genai  # noqa: F401
    except ImportError:
        return False

    return True


def _get_client():
    """Build the client once. Raises GeminiError rather than ImportError/KeyError."""
    global _client

    if _client is not None:
        return _client

    key = _api_key()
    if not key:
        raise GeminiError(
            "the AI service is not configured (GEMINI_API_KEY is not set)"
        )

    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise GeminiError(
            "the AI service is not configured (the google-genai package is "
            "not installed)"
        ) from exc

    _client = genai.Client(
        api_key=key,
        http_options=types.HttpOptions(timeout=_TIMEOUT_MS),
    )

    print("[gemini] using model %s" % _MODEL, flush=True)

    return _client


def _explain(exc):
    """Turn an SDK error into a user-facing reason.

    Mapped by status code so an operator can tell a bad key apart from a quota
    problem apart from Google having a bad day.
    """
    code = getattr(exc, "code", None)

    if code in (401, 403):
        return "the AI service rejected our API key"
    if code == 429:
        return "the AI service is rate limiting us; try again shortly"
    if code == 400:
        return "the AI service rejected the request as invalid"
    if isinstance(code, int) and code >= 500:
        # The SDK already retries transient 5xx/503 with backoff before this.
        return "the AI service is temporarily unavailable; try again shortly"

    message = getattr(exc, "message", None) or str(exc)
    return "the AI service failed: %s" % message


def generate(system, user, max_output_tokens):
    """Return the model's reply as text.

    Raises GeminiError with a user-safe message on any failure. Callers never
    see an SDK exception, and nothing here invents a reply when the call fails.
    """
    client = _get_client()

    try:
        from google.genai import errors
    except ImportError as exc:  # pragma: no cover - _get_client would have raised
        raise GeminiError("the AI service is not configured") from exc

    try:
        interaction = client.interactions.create(
            model=_MODEL,
            system_instruction=system,
            input=user,
            generation_config={
                # Deterministic, matching the local path's greedy decoding, so
                # the same video keeps producing the same notes.
                "temperature": 0,
                "max_output_tokens": max_output_tokens,
            },
        )
    except errors.APIError as exc:
        raise GeminiError(_explain(exc)) from exc
    except Exception as exc:  # noqa: BLE001 - transport/unexpected SDK failure
        raise GeminiError(
            "could not reach the AI service (%s)" % type(exc).__name__
        ) from exc

    text = getattr(interaction, "output_text", None)

    # An empty or missing completion is a failure, not an empty note set. A
    # blank string here would sail through the parsers and produce a summary
    # with no content in it.
    if not text or not text.strip():
        raise GeminiError("the AI service returned an empty response")

    return text.strip()
