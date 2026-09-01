# NoteTube — Project Memory

Running record of decisions, their reasons, and current status. Append to this
file; do not rewrite prior entries.

---

## Current status

**Phase complete:** Transcript provider migration to Supadata (backend only),
**live-verified against the real API** on 3 videos. One real bug was found and
fixed during that verification (segment granularity — see below).
**Next phase:** Backend containerization + dependency split (see "Next planned phase").
**Not started:** Gemini AI provider, AWS/EC2 deployment, Render deployment, Nginx.

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

## Next planned phase

Backend containerization and dependency split, per the Phase 0.5 findings:

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
