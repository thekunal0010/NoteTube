# NoteTube — Project Memory

Running record of decisions, their reasons, and current status. Append to this
file; do not rewrite prior entries.

---

## Current status

**Phase 1 complete (committed `02484bb`):** Transcript provider migration to
Supadata, live-verified against the real API on 3 videos.
**Phase 2 complete (committed `ff2d44e`):** Backend containerization +
dependency split. Production image builds at **255 MB** against a 4.7 GB local
venv, runs healthy with WebSocket working, and carries no torch.
**Phase 3 complete (uncommitted):** Gemini is the production AI provider,
behind the existing `llm.py` seam. Local Qwen preserved and verified working.
**Live-verified** against the real API on 2026-09-02 (one request).
**Phase 4 complete (uncommitted):** Production hardening — password-reset token
no longer returned by the API, CORS/Socket.IO origins configurable, frontend
backend URL configurable.
**Next phase:** AWS/EC2 + Nginx + Render deployment.

---

## Architecture (intended production)

```
Render (Next.js frontend)
  → HTTPS
  → AWS EC2
      → Nginx
      → Dockerized Flask backend
          → MongoDB Atlas
          → Supadata  (YouTube transcripts)
          → Gemini    (AI, not yet implemented)
```

Qwen2.5-1.5B-Instruct remains the **local development** AI provider. Gemini is
the intended production provider but is not yet built.

---

## Decision: Supadata is the YouTube transcript provider

**Date:** 2026-09-01

**Why.** Direct transcript retrieval works from a home connection but not from a
datacenter. Verified from the actual EC2 host:

| Path | Result |
|---|---|
| EC2 → `youtube-transcript-api` → YouTube | `dQw4w9WgXcQ` initially OK; `_uQrJ0TkZlc` and `kqtD5dpn9C8` **RequestBlocked** |
| EC2 → Webshare free datacenter proxy → YouTube | proxy connected, YouTube returned **IpBlocked** |
| EC2 → Crawlbase → YouTube | watch page HTTP 200 and caption tracks found, but timed-text fetch returned 207/empty; JS-token attempt failed |
| EC2 → **Supadata** → YouTube | **SUCCESS** on `_uQrJ0TkZlc`, `kqtD5dpn9C8`, `dQw4w9WgXcQ` |

**Explicitly rejected, do not reintroduce:** Webshare, Crawlbase, residential
proxies, YouTube cookies, and direct `youtube-transcript-api` *in production*.

**Earlier local finding (2026-09-01).** A transcript test run from the developer
laptop succeeded for all videos, but its egress was `AS9498 Bharti Airtel`, a
residential ISP. That result carried no predictive value for EC2 and did not
close the risk — the EC2 test above is what settled it.

---

## What changed in this phase

### `backend/supadata.py` (new)

HTTP client for `https://api.supadata.ai/v1/transcript`. Key via
`SUPADATA_API_KEY`, sent as the `x-api-key` header, read only through
`os.getenv` — never hardcoded, never logged, never in a query string.

Handles: inline 200; `202` async job with polling (1.5s interval, 240s ceiling);
`206` no transcript; `404` unavailable/private; `401`/`403` bad key; `429` rate
limit; connect/read timeouts of `(10, 90)`. All failures raise `SupadataError`
with a user-safe message. There is no path that fabricates a successful
transcript when the API fails.

**Requests timestamped segments (`text=false`), not plain text.** This is
load-bearing for two reasons:
1. `text_filters.strip_filler()` matches **line by line** and needs one caption
   per line. A single plain-text blob would mean one "subscribe" mention
   deletes the entire transcript.
2. `duration_seconds` feeds `study_tools.get_study_limits()`, which sets chunk
   and flashcard/MCQ counts. Only the timestamped form carries timings.

**Defaults to `mode=native`**, which fetches only transcripts YouTube already
has. `auto`/`generate` fall back to AI transcription and are billed
differently — opt in deliberately via `NOTETUBE_SUPADATA_MODE`.

### `backend/transcript.py` (modified — public contract unchanged)

`get_transcript(url)` still returns `(text, duration_seconds)`, still returns
`("Transcript Error: ...", 0)` on failure. **`app.py` was not touched.**

Now routes between two providers behind that contract:
- `supadata` (default) — production.
- `local` — `youtube-transcript-api`, development only. Imported lazily so a
  production container can omit the package entirely.

`local` is selected **explicitly** via `NOTETUBE_TRANSCRIPT_PROVIDER`, never as
an automatic fallback when the key is missing. A silent fallback would make a
misconfigured production box look healthy and then fail every video with a
confusing YouTube error instead of "transcript service is not configured".

Both providers normalize to `[{text, offset, duration}]` in **milliseconds**, so
everything downstream is provider-agnostic.

### `backend/test_transcript.py` (new)

20 tests, stdlib `unittest`, no new dependency, fully offline. Covers the
`(text, duration)` contract, per-line filler behaviour, error mapping for every
documented status, async job polling and failure, and that the key travels as a
header and never in the query string.

### `backend/.env.example` (new)

Documents every environment variable with no real values. Tracked by git via the
existing `!.env.example` rule; `.env` itself remains ignored.

---

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `MONGO_URI` | yes | — | MongoDB Atlas connection string |
| `JWT_SECRET` | yes | — | Auth token signing key |
| `SUPADATA_API_KEY` | yes in production | — | Supadata auth. **Backend only** — never exposed to the frontend, never `NEXT_PUBLIC_` |
| `NOTETUBE_TRANSCRIPT_PROVIDER` | no | `supadata` | `supadata` or `local` |
| `NOTETUBE_SUPADATA_MODE` | no | `native` | `native` avoids AI-generation billing |
| `NOTETUBE_RELOAD` | no | `0` | Flask auto-reloader |
| `NOTETUBE_DEVICE` | no | autodetect | `cpu` forces the local model off GPU |
| `NOTETUBE_LLM_MODEL` | no | `Qwen/Qwen2.5-1.5B-Instruct` | Local model override |
| `NOTETUBE_LLM_BATCH` | no | `4` | Local generation batch size |

---

## Tests performed (pre-live-verification — SUPERSEDED)

> **Superseded by "Live verification (2026-09-01)" below.** This table records
> the state before a Supadata API key was available, when the client had only
> been exercised against stubs. Kept as history; do not cite it as current.
> **Authoritative results: 22 passing tests and 3 successful live Supadata
> video tests.**

| Test | Result |
|---|---|
| `python -m unittest test_transcript` — 20 tests | **PASS** |
| `import app` after changes | **PASS** — wiring intact |
| Live regression, `NOTETUBE_TRANSCRIPT_PROVIDER=local` | **PASS** — `dQw4w9WgXcQ` 2089 chars/211s and `_uQrJ0TkZlc` 252289 chars/18304s, byte-identical to the pre-change baseline |
| Supadata selected with no key | **PASS** — returns `Transcript Error: transcript service is not configured`, no silent fallback |
| Frontend grep for `supadata` | **PASS** — zero references |

**Not yet run: a live Supadata API call.** No `SUPADATA_API_KEY` was available
in this environment, so the real request/response path is exercised only against
stubs. This is the main open risk below.

---

## Live verification (2026-09-01) — and the bug it caught

Run against the real Supadata API with a key in `backend/.env`, loaded through
the project's existing `load_dotenv()` mechanism.

### Bug found: coarse segments destroyed 27% of a transcript

Supadata's segment granularity is **inconsistent per video**:

| Video | segments | avg chars/segment |
|---|---|---|
| `dQw4w9WgXcQ` | 61 | 33.3 |
| `kqtD5dpn9C8` | 1642 | 30.5 |
| `_uQrJ0TkZlc` | 585 | **453.0** (capped at 500) |

`text_filters.strip_filler()` drops a whole line on a match. Its patterns were
tuned against ~30-char captions, where they are surgical. Against 500-char
blocks they were destructive: **71,952 characters — 27.1% of the 5-hour Python
course — were being silently discarded**, including the sections teaching order
of operations, the exponentiation operator, and `round()`. Each was dropped
because a narration phrase like "pause the video" appeared somewhere in the
same block.

The API's `chunkSize` parameter does not help: `40` returns HTTP 400, `80` is
ignored and still yields 500-char segments.

**Fix** (`transcript.py`, `_to_lines()`): flatten segments to **one sentence per
line** before filtering, using the same `(?<=[.!?])\s+` boundary as
`study_tools.py:116` and `summarizer.py:135`. The regex is duplicated rather
than imported because `study_tools` pulls in `llm` and therefore `torch`, which
transcript retrieval must not depend on. Caption-sized segments are unaffected;
coarse ones become surgical again.

Result: `_uQrJ0TkZlc` went from 193,658 to **246,485 chars** (429 → 2,917
lines), against a 252,289-char local-provider baseline. All four previously
destroyed teaching sections verified present.

### Live results

| Video | Result | Chars | Lines | Duration | Fetch |
|---|---|---|---|---|---|
| `_uQrJ0TkZlc` | OK | 246,485 | 2,917 | 18,304.0s (305.1 min) | 4.5s |
| `kqtD5dpn9C8` | OK | 50,518 | 2,024 | 3,604.4s (60.1 min) | 3.8s |
| `dQw4w9WgXcQ` | OK | 2,089 | 90 | 211.3s (3.5 min) | 3.4s |

All non-empty, all `duration_seconds > 0`. `_uQrJ0TkZlc` duration matches the
local-provider baseline exactly (18,304.0s).

### Downstream acceptance

Full pipeline on live Supadata output for `dQw4w9WgXcQ`: `get_study_limits` →
`generate_summary` (49.6s, 520-char overview, 9-item study pool) →
`select_key_points` 5 → `generate_flashcards` 5 → `generate_mcqs` 5. All tier
caps respected.

Chunker compatibility for the long videos: `_uQrJ0TkZlc` → 16 chunks / 4 notes
per chunk; `kqtD5dpn9C8` → 4 chunks / 8 notes per chunk. Both within the
`max_chunks=100` tier.

Test suite: **22 tests, all passing** (2 added as regressions for the
granularity bug — one asserting coarse blocks are split, one asserting
caption-sized segments do not regress).

No API key was printed at any point; it is read only via `os.getenv` and sent
as a header.

---

## Open risks

1. **The 202 async path has still never fired.** All three live videos —
   including a 5-hour one — answered inline at 200. The polling code remains
   stub-tested only.
2. **Local AI model quality, pre-existing and unrelated to transcripts.** The
   `dQw4w9WgXcQ` overview attributed the song to Elton John. That is the 1.5B
   Qwen model hallucinating, a known limitation recorded earlier; Gemini in a
   later phase is the intended fix.
3. `youtube-transcript-api` and `defusedxml` remain in `requirements.txt`. Fine
   for now — the `local` provider still needs them — but they belong in a
   dev-only requirements file in the next phase.

---

## Phase 2 — Docker + production dependency split (2026-09-01)

### Dependency split

`requirements.txt` is now **production only**, derived empirically: `app.py` was
imported with `torch` and `transformers` blocked and the loaded modules
recorded, so the list is what actually runs rather than what happened to be
installed. `requirements-local.txt` does `-r requirements.txt` plus the ML
stack.

| Classification | Packages |
|---|---|
| Production | Flask stack, Flask-SocketIO stack, pymongo + dnspython, bcrypt, PyJWT, python-dotenv, requests stack, gunicorn + gevent + gevent-websocket |
| Local ML only | torch, transformers, tokenizers, safetensors, sentencepiece, huggingface_hub, numpy, regex, filelock, fsspec, networkx, sympy, mpmath, packaging, PyYAML, tqdm |
| Local dev only | youtube-transcript-api, defusedxml (the `local` transcript provider) |
| **Dropped as unused** | `Flask-PyMongo` (never imported — `db.py` uses a raw `MongoClient`), `dotenv==0.9.9` (a deprecated stub; `python-dotenv` is the real package), `websocket-client` (orphan, no `Required-by`, client-side only) |

`requirements-local.txt` pins `torch==2.11.0` without the `+cu128` local
version. Verified this does **not** clobber an existing CUDA install: per PEP
440 `2.11.0+cu128` satisfies `==2.11.0`, and `pip install --dry-run` reports
torch as already satisfied.

### Lazy imports

`app.py` previously could not be imported without torch. Fixed without changing
behaviour:

- **`llm.py`** — dropped module-level `import torch` / `transformers`. They are
  imported inside `_wanted_device()`, `_load()` and `_generate()`. A missing
  torch now reads as "no device", the same path as a missing GPU.
- **`summarizer.py`** — device/model/beam/batch selection ran *at import time*
  and called `torch.cuda.is_available()`. Moved behind `_bart_config()`, cached
  on first use. `pipeline` is imported inside `_get_summarizer()`.
- **New `SummarizerUnavailable(RuntimeError)`** — raised when neither a hosted
  provider nor the local ML stack is present, so `/summary` returns a clear
  reason instead of an ImportError traceback. **No fake success path.**
- **`study_tools.py`** needed no change: it imports `llm`, which is now light.

Verified: with torch and transformers blocked, all nine backend modules import,
`llm.is_available()` returns False, and `generate_summary` raises
`SummarizerUnavailable`. With torch present, `_bart_config()` still resolves to
`cuda:0` / `bart-large-cnn` / 4 beams / batch 8 — local dev is unchanged.

### Production server

`socketio.run()` (Werkzeug dev server) is replaced in the container by
**gunicorn + gevent**, entry point `wsgi.py`.

**eventlet was the first choice and does not work: gunicorn 26.2.0 has removed
the eventlet worker.** Confirmed empirically — the container failed to boot with
`Entry point ('gunicorn.workers', 'eventlet') not found`, and
`gunicorn.workers.SUPPORTED_WORKERS` lists only sync, gevent, gevent_wsgi,
gevent_pywsgi, tornado, gthread and asgi. gevent is the only co-operative worker
gunicorn still ships.

Final choice: `gunicorn -k geventwebsocket.gunicorn.workers.GeventWebSocketWorker -w 1`.
Verified with a real Socket.IO client against the running container:
`transport = websocket`, not long-polling.

- **`wsgi.py`** calls `monkey.patch_all()` *before* importing `app`. Patching
  after import leaves pymongo and requests blocking the whole worker. (Importing
  `wsgi` into an already-running interpreter fails with a gevent `KeyError` for
  exactly this reason — under gunicorn it is the entry point, so it patches
  first.)
- **Exactly one worker**, permanently: progress events are addressed to an
  in-memory Socket.IO sid. A second worker would hold its own disconnected set
  of sids and silently drop events. Scaling out needs Redis before more workers.
- `app.py` now reads `NOTETUBE_SOCKETIO_ASYNC_MODE`, defaulting to `threading`
  so local development is untouched; the image sets `gevent`.
- `gevent-websocket` is unmaintained (0.10.1, 2017) but imports and runs on
  gevent 26.x. If it ever breaks, plain `-k gevent` still works and Socket.IO
  degrades to long-polling, which these low-frequency progress events tolerate.

### Docker

`python:3.11-slim`. Dependencies in their own layer before the code copy so the
expensive step stays cached. Non-root `appuser` created *after* pip install, so
site-packages stays root-owned and the app cannot modify its own dependencies.
`HEALTHCHECK` hits `/`. `--timeout 600` because generation legitimately runs for
minutes. No secrets in the image; `SUPADATA_API_KEY`, `MONGO_URI` and
`JWT_SECRET` arrive at runtime.

`.dockerignore` excludes `.env*` (keeping `.env.example`), venvs, `__pycache__`,
`test_*.py`, model weights and HF caches, `requirements-local.txt`, `.git/`,
logs and editor cruft.

### Results

| Measure | Value |
|---|---|
| Image size | **255 MB** (local venv: 4.7 GB) |
| site-packages in image | 57 MB |
| torch/transformers/tokenizers/safetensors/sentencepiece/huggingface_hub/numpy | **all absent** |
| youtube-transcript-api in image | absent (dev-only provider) |

### Tests performed (Phase 2)

| Test | Result |
|---|---|
| All 9 backend modules import with torch+transformers blocked | **PASS** |
| `generate_summary` with no ML stack | **PASS** — raises `SummarizerUnavailable`, no crash, no fake success |
| Local dev with torch present | **PASS** — `cuda:0`, bart-large-cnn, 4 beams, batch 8, unchanged |
| `docker build` | **PASS** |
| Container start | **PASS** — gunicorn + GeventWebSocketWorker, Docker health `healthy` |
| `GET /` health endpoint | **PASS** — HTTP 200 |
| Runs as non-root | **PASS** — `appuser` uid 1000 |
| MongoDB Atlas from container | **PASS** — `/login` returns 401 "Invalid password" |
| 22-test suite **inside** the container | **PASS** |
| WebSocket transport | **PASS** — real Socket.IO client negotiated `websocket` |
| Live Supadata **from inside the container** | **PASS** — `dQw4w9WgXcQ` 2089 chars/211.3s, `kqtD5dpn9C8` 50518 chars/3604.4s, identical to host |
| `/summary` end-to-end through container | **PASS** — auth + transcript succeed, then a clear "No AI provider is available" (expected until Gemini) |
| 22-test suite locally | **PASS** |

### Security checks (Phase 2)

- `.env` absent from the image (`ls /app/.env` → no such file)
- `SUPADATA_API_KEY` empty in the image's own environment; supplied only at runtime
- Whole-image filesystem grep for the live key value → **no matches**
- `test_transcript.py` and `requirements-local.txt` excluded from the image
- Key never printed in any output

### Open risks (Phase 2)

1. **`gevent-websocket` is unmaintained** (0.10.1, 2017). Works today on gevent
   26.x; fallback is `-k gevent` with long-polling.
2. **Single worker is a hard constraint**, not a tuning choice. Documented in
   `wsgi.py` and the Dockerfile so it is not "optimised" away later.
3. **The container has no AI provider.** `/summary` fetches the transcript then
   returns HTTP 500 with a clear message. Expected until Gemini lands; the image
   is not useful for generation before then.
4. `python:3.11-slim` pins the minor version but not a digest, so a rebuild can
   pick up a new patch release. Pin by digest if bit-identical rebuilds matter.

---

## Phase 3 — Gemini integration (2026-09-01)

Closes Phase 2's risk 3 (the container had no AI provider).

### Decision: Gemini via the `google-genai` SDK

`google-genai==2.21.0`, **not** the older `google-generativeai`. The API shape
was verified by introspecting the installed package rather than trusting docs,
which caught two things a guess would have got wrong:

- The current call is `client.interactions.create(model=, input=,
  system_instruction=, generation_config=)` returning `.output_text` — not the
  `generate_content` shape found in most older material.
- **`HttpOptions.timeout` is in milliseconds, not seconds.**

Errors are `google.genai.errors.APIError` with `ClientError` (4xx) and
`ServerError` (5xx) subclasses carrying `.code`. The SDK already retries
transient failures ~4 times with backoff before raising.

### Model: `gemini-3.5-flash-lite`

Google's documented economy tier — "fastest, most cost-effective... for
high-throughput execution". NoteTube's calls are short, templated extraction
prompts over transcript chunks, which is exactly that shape. This is a
low-traffic learning project, so a frontier model would be paid for and wasted.
Override with `NOTETUBE_GEMINI_MODEL`.

### Architecture

Same split as `transcript.py`/`supadata.py`: a router module holding the local
implementation inline, delegating the hosted provider to its own module.

- **`gemini.py` (new)** — thin client. `is_configured()`, `generate()`,
  `GeminiError`. The SDK is imported lazily so `llm.py` still imports where it
  is not installed.
- **`llm.py`** — now routes on `NOTETUBE_LLM_PROVIDER`. Qwen internals
  unchanged. **Public interface is byte-identical**: `BATCH_SIZE`,
  `is_available()`, `chat(system, user, max_new_tokens=512)`,
  `chat_batch(system, users, max_new_tokens=512)`.
- **`summarizer.py` and `study_tools.py` were not modified at all.** The seam
  built in earlier phases did its job — all six call sites work unchanged.

### Provider selection

`NOTETUBE_LLM_PROVIDER`: `gemini` (default) or `local`.

**No silent fallback, in either direction.** A missing `GEMINI_API_KEY` makes
`is_available()` return False and never touches the local model — falling back
would turn a config mistake into a 3.1 GB Qwen load on a machine with no GPU.
This mirrors the transcript provider's rule and is covered by a test.

`is_available()` means "configured and ready to try", not "reachable" — it
spends no quota. A provider that is available and *then* fails raises rather
than returning nothing, so a live outage is never mistaken for "the model had
nothing to say".

Existing behaviour at the call sites is unchanged: `summarizer` lets the error
surface as a 500 (no fabricated summary), while `study_tools` keeps its
pre-existing `try/except` that logs and degrades to the deterministic heuristic
generators — those are plain text manipulation, not invented AI output.

### AI behaviour preserved

Prompts, parsing, batch ordering and token caps are untouched.
`max_new_tokens` maps to `max_output_tokens`; `temperature=0` matches the local
path's greedy decoding, so the same video keeps producing the same notes.

`chat_batch` issues **one request per prompt, sequentially**. Gemini has no
batch endpoint here, and firing a whole batch concurrently is the quickest way
to trip the free tier's rate limit at this project's size. `BATCH_SIZE` still
groups the caller's loop.

### Dependencies

Added to production: **`google-genai==2.21.0`** only. Its tree (httpx, pydantic,
google-auth, anyio, tenacity, websockets) is left to pip — hand-pinning part of
a large interdependent tree invites resolver conflicts.

No torch, transformers, CUDA or Qwen packages entered `requirements.txt`
(verified against requirement lines with comments stripped).
`requirements-local.txt` is unchanged and still carries the full ML stack.

### Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | yes in production | — | Gemini auth. **Backend only** — never exposed to the frontend, never `NEXT_PUBLIC_` |
| `NOTETUBE_LLM_PROVIDER` | no | `gemini` | `gemini` or `local` |
| `NOTETUBE_GEMINI_MODEL` | no | `gemini-3.5-flash-lite` | Model override |
| `NOTETUBE_GEMINI_TIMEOUT_MS` | no | `90000` | Request timeout, **milliseconds** |

### Tests performed (Phase 3)

`test_llm.py` (new, 25 tests) — **no live Gemini calls**; the client is stubbed
and real `google.genai.errors` instances drive the status-mapping tests.

| Test area | Result |
|---|---|
| `llm.py` imports with no torch; module exposes no torch attribute | **PASS** |
| Public interface unchanged (`BATCH_SIZE`, `is_available`, `chat`, `chat_batch`) | **PASS** |
| `summarizer`/`study_tools` still reach AI only through `llm` | **PASS** |
| Defaults to `gemini`; unknown provider rejected | **PASS** |
| Missing key → unavailable, and **does not** load the local model | **PASS** |
| Success normalized into the existing contract; order preserved; one call per prompt | **PASS** |
| Prompt/system/token cap reach the API intact; `temperature=0` | **PASS** |
| Missing key, 400/401/403/429, 5xx, transport error all mapped | **PASS** |
| Empty (`""`, whitespace, `None`) and malformed responses raise | **PASS** |
| API failure propagates through `chat_batch` (not swallowed as empty) | **PASS** |
| API key never appears in an error message | **PASS** |
| **Existing 22 transcript tests, unmodified** | **PASS** |
| Full suite (47 tests) | **PASS** |
| Production simulation: no torch + gemini selected, all modules import | **PASS** |
| Local Qwen still loads on GPU and generates | **PASS** |

Supadata was **not** called during Phase 3 (transcript tests are fully stubbed).
Docker was **not** rebuilt or rerun.

### Open risks (Phase 3)

1. **No live Gemini call has ever been made.** The client is written against
   the introspected SDK surface and is stub-tested only. The first real request
   is unproven — model name, quota and response shape need one live check
   before deployment.
2. **Sequential requests.** A 5-hour video is ~16 chunk calls one after
   another. Correct and rate-limit-safe, but latency adds up; bounded
   concurrency is the obvious optimisation once a live baseline exists.
3. **Default provider changed to `gemini`.** Existing local `.env` files need
   `NOTETUBE_LLM_PROVIDER=local` (or a Gemini key) or local generation will
   report the provider as unconfigured.
4. Only the direct SDK version is pinned, so its transitive tree can drift
   between builds.

---

## Live Gemini verification (2026-09-02)

One request, through the real path `llm.chat` → `chat_batch` →
`gemini.generate` → SDK. Closes Phase 3's risk 1.

| | |
|---|---|
| Result | **SUCCESS** on first attempt, no retries |
| Model | `gemini-3.5-flash-lite` — accepted |
| Prompt | `Reply with exactly: GEMINI_TEST_OK` |
| Reply | `GEMINI_TEST_OK` — exact match |
| Latency | 6.39 s |

Confirms authentication, the model name, the `interactions.create` call shape,
`.output_text` extraction, and that provider routing reaches Gemini.

**The 6.39 s is a cold-start figure** — it includes SDK import, client
construction and TLS setup. It is not a per-request steady-state latency and
should not be multiplied out to estimate a full generation.

---

## Phase 4 — Production hardening (2026-09-02)

### Password reset: token no longer returned by the API

`/forgot-password` returned `resetToken` in its response body, so anyone who
knew an email address could mint a working token for it and take the account
over. That is now withheld by default.

There is **no email delivery in this application**, and inventing one was out
of scope, so the token is instead gated behind `NOTETUBE_EXPOSE_RESET_TOKEN=1`
for local development. Production leaves it unset, which makes the endpoint
safe but means **the reset flow cannot be completed by a real user until email
delivery exists**. That is a deliberate, documented limitation rather than a
half-working mechanism.

The frontend already tolerates the token's absence (`app/forgot-password`
only renders the link `if (data.resetToken)`), so nothing there changed.

**Reset tokens are now single-use.** They previously stayed valid for their
full 15 minutes and could be replayed. The token now carries `pw`, a short
digest of the password hash it was issued against; completing a reset changes
the hash, so that token — and any minted earlier — stops verifying. No token
store or new dependency needed.

The unchanged-by-design behaviour: the endpoint still returns the same response
for known and unknown addresses, so it does not reveal who has an account.

### CORS and Socket.IO origins

Both were `"*"`, which let any site on the internet script authenticated calls
against the API with a phished token and open a progress socket. Both now read
`NOTETUBE_ALLOWED_ORIGINS` (comma-separated) via `app._allowed_origins()`.

Unset defaults to `http://localhost:3000,http://127.0.0.1:3000` — local
development only. Any other origin (a LAN address used for testing on a phone,
or the deployed frontend) must be listed explicitly; a default that guessed
would either break a setup or quietly reopen the hole. `"*"` is still reachable
for a throwaway experiment but must be asked for by name and logs a warning.

### Frontend backend URL

`getBackendUrl()` (`frontend/lib/api.ts`) derived the backend from
`window.location.hostname:5000`, which can only ever find a backend on the same
machine as the browser — unworkable for a frontend on Render talking to a
backend on EC2. It now prefers `NEXT_PUBLIC_API_URL` when set, falling back to
the existing behaviour so local development still needs no configuration.

`lib/socket.ts` already imports `getBackendUrl()`, so WebSocket traffic follows
the same setting. Verified there are no other hard-coded backend endpoints in
`frontend/`.

New `frontend/.env.example` documents the variable and warns that anything
`NEXT_PUBLIC_` is embedded in the browser bundle and must never hold a secret.

### Environment variables added

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `NOTETUBE_ALLOWED_ORIGINS` | backend | `http://localhost:3000,http://127.0.0.1:3000` | CORS + Socket.IO origins |
| `NOTETUBE_EXPOSE_RESET_TOKEN` | backend | unset (off) | Dev only — returns the reset token |
| `NEXT_PUBLIC_API_URL` | frontend | unset (derive from page host) | Backend base URL |

### Tests performed (Phase 4)

`test_hardening.py` (new, 16 tests). Offline — `db.py` opens a MongoClient at
import time and resolves the Atlas SRV record over the network, so the module
is stubbed in `sys.modules` before `auth` is imported. No database, no
Supadata, no Gemini.

| Test area | Result |
|---|---|
| Reset token withheld by default, and for any flag value other than `"1"` | **PASS** |
| Reset token returned only when explicitly enabled | **PASS** |
| Response identical for known and unknown addresses | **PASS** |
| Valid token resets the password | **PASS** |
| Token cannot be replayed; attacker's password not applied | **PASS** |
| Token minted before an earlier reset is rejected | **PASS** |
| Expired / wrong-purpose / wrong-key tokens rejected | **PASS** |
| Origins default to localhost, never `"*"`; list parsed and trimmed | **PASS** |
| `"*"` only when asked for by name | **PASS** |
| Socket.IO actually receives the configured origins | **PASS** |
| Full backend suite (63 tests) | **PASS** |
| Frontend `tsc --noEmit` | **PASS** |

Docker was not rebuilt or rerun. Supadata was not called. No additional live
Gemini request was made.

### Open risks (Phase 4)

1. **`JWT_SECRET` is 19 bytes.** PyJWT warns during signing:
   `InsecureKeyLengthWarning: The HMAC key is 19 bytes long, which is below the
   minimum recommended length of 32 bytes for SHA256` (RFC 7518 §3.2). This key
   signs both session tokens and password-reset tokens, so a weak one
   undermines both. **Rotate to ≥32 random bytes before deploying** — note that
   rotating invalidates every existing session, so it is a deliberate action,
   not a code change. Discovered incidentally during Phase 4 testing; not fixed
   here because the value is the operator's to choose.
2. **Password reset is incomplete in production** by design, until email
   delivery exists (see above).
3. **Changing a password does not invalidate existing sessions.** Previously
   issued JWTs remain valid until they expire, so a reset does not evict an
   attacker who already holds a token.
4. `NOTETUBE_ALLOWED_ORIGINS` must be set at deploy time or the deployed
   frontend will be blocked by CORS. This is intentional — it fails closed.

---

## Next planned phase

Deployment: AWS/EC2 + Nginx + Render.

Before deploying: rotate `JWT_SECRET` (risk 1), set `NOTETUBE_ALLOWED_ORIGINS`
to the real frontend origin, and set `NEXT_PUBLIC_API_URL` to the real backend
URL.

---

## Superseded plan — Phase 2 as originally scoped

Backend containerization and dependency split, per the Phase 0.5 findings.
**Completed above.** Retained for history:

- **torch is 4,214 MB of a 4,678 MB venv (~90%)** and pinned to `+cu128`. A CUDA
  build on a CPU-only EC2 box is dead weight it can never use.
- `app.py` **cannot import without torch today**: `summarizer.py:4-5` and
  `llm.py:21-22` import `torch`/`transformers` unconditionally at module level.
  These must become lazy/conditional.
- Split `requirements.txt` (core, no ML) from `requirements-local.txt` (torch,
  transformers) so the production image carries neither.
- Replace `socketio.run()` with a production WSGI server; note `async_mode="threading"`
  interacts with gunicorn worker classes and needs care.
- Then: Gemini provider behind `llm.py`'s existing `is_available()` / `chat()` /
  `chat_batch()` seam — all six call sites already go through it, so callers
  need no changes.
