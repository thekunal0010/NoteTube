import os
import re

# torch and transformers are imported lazily, inside the functions that need
# them: they exist only for the BART fallback, which the production image does
# not ship. See _bart_config().

import llm
from text_filters import is_filler, strip_meta_preamble

# --- Device & model selection -------------------------------------------------
#
# Summarization is by far the slowest step in a note generation, and its cost is
# dominated by two things: the size of the model and how many beams it decodes
# with. Both are chosen here based on what hardware is actually available, so the
# same code runs fast on a CUDA box without falling over on a CPU-only one.
#
#   GPU -> bart-large-cnn with 4-beam search (the original quality bar; on a GPU
#          there's no reason to trade it away)
#   CPU -> distilbart-cnn-12-6 with greedy decoding (~6-8x faster combined, which
#          is the difference between a usable app and a 20-minute wait)
#
# Both can be overridden via .env for tuning without a code change.

_GPU_MODEL = "facebook/bart-large-cnn"
_CPU_MODEL = "sshleifer/distilbart-cnn-12-6"


class SummarizerUnavailable(RuntimeError):
    """No summarization backend is installed.

    Raised instead of an ImportError so /summary reports a clear reason rather
    than a stack trace about a missing module.
    """


def _resolve_device(torch):
    """Return the pipeline `device` index: 0 for the first GPU, -1 for CPU.

    NOTETUBE_DEVICE ("cpu"/"cuda") forces a choice; otherwise autodetect.
    """
    requested = (os.getenv("NOTETUBE_DEVICE") or "").strip().lower()

    if requested == "cpu":
        return -1
    if requested in ("cuda", "gpu"):
        if not torch.cuda.is_available():
            raise RuntimeError(
                "NOTETUBE_DEVICE requested CUDA but torch reports no GPU available. "
                "Install the CUDA build of torch or unset NOTETUBE_DEVICE."
            )
        return 0

    return 0 if torch.cuda.is_available() else -1


_config = None


def _bart_config():
    """Resolve device, model and batching for the BART fallback, once.

    This used to run at import time, which meant `import app` required torch —
    a ~4.2GB dependency the production container has no use for. Deferring it
    keeps the import free and lets the ML stack be absent entirely.
    """
    global _config

    if _config is not None:
        return _config

    try:
        import torch
    except ImportError as exc:
        raise SummarizerUnavailable(
            "No AI provider is available: the local model stack is not installed "
            "and no hosted provider is configured."
        ) from exc

    device = _resolve_device(torch)
    on_gpu = device >= 0

    _config = {
        "torch": torch,
        "device": device,
        "on_gpu": on_gpu,
        "model_name": os.getenv("NOTETUBE_SUMMARIZER_MODEL")
        or (_GPU_MODEL if on_gpu else _CPU_MODEL),
        # Beam search multiplies decode cost by the beam count. Worth it on a
        # GPU, far too expensive on a CPU.
        "num_beams": 4 if on_gpu else 1,
        # How many chunks go through the model at once. Batching keeps the
        # device busy instead of paying per-call overhead 40+ times.
        "batch_size": 8 if on_gpu else 4,
    }

    print(
        "[summarizer] device={} fallback_model={} num_beams={} batch_size={}".format(
            "cuda:0 ({})".format(torch.cuda.get_device_name(0)) if on_gpu else "cpu",
            _config["model_name"],
            _config["num_beams"],
            _config["batch_size"],
        ),
        flush=True,
    )

    return _config


_summarizer = None


def _get_summarizer():
    """Load BART on first use rather than at import.

    It is only the fallback now, and it would otherwise sit on ~800MB of VRAM
    that the instruct model needs for its KV cache on a 6GB card.
    """
    global _summarizer

    if _summarizer is None:
        config = _bart_config()

        try:
            from transformers import pipeline
        except ImportError as exc:
            raise SummarizerUnavailable(
                "No AI provider is available: the local model stack is not "
                "installed and no hosted provider is configured."
            ) from exc

        kwargs = {}
        if config["on_gpu"]:
            kwargs["torch_dtype"] = config["torch"].float16

        print("[summarizer] loading BART fallback (%s)" % config["model_name"], flush=True)
        _summarizer = pipeline(
            "summarization",
            model=config["model_name"],
            device=config["device"],
            **kwargs,
        )

    return _summarizer


def _chunk_text(text, max_chunk=3000):
    """Split text into chunks close to max_chunk chars, breaking on word boundaries."""

    words = text.split()
    chunks = []
    current = []
    current_len = 0

    for word in words:
        if current_len + len(word) + 1 > max_chunk and current:
            chunks.append(" ".join(current))
            current = []
            current_len = 0

        current.append(word)
        current_len += len(word) + 1

    if current:
        chunks.append(" ".join(current))

    return chunks


def _structure_summary(chunk_summaries):
    """Turn the raw per-chunk summaries into an overview string plus a
    deduplicated pool of sentences, in original order.

    The overview length scales with how much material there is — a one-line
    intro is fine for a 3-minute clip, but a real lecture needs a few
    sentences to actually summarize its span rather than just its opener.
    The remaining sentences are the pool the notes page's Key Points and the
    flashcards/MCQs both draw from — how many of them get shown is a display
    decision made by the caller (app.py), scaled to video length there.
    """

    sentences = []
    for chunk in chunk_summaries:
        parts = re.split(r"(?<=[.!?])\s+", chunk.strip())
        sentences.extend(s.strip() for s in parts if s.strip())

    seen = set()
    deduped = []
    for sentence in sentences:
        normalized = sentence.lower()
        if len(sentence) < 25 or normalized in seen:
            continue
        seen.add(normalized)
        deduped.append(sentence)

    if not deduped:
        return "", []

    if len(deduped) <= 8:
        overview_count = min(2, len(deduped))
    elif len(deduped) <= 20:
        overview_count = 3
    else:
        overview_count = 5

    overview = " ".join(deduped[:overview_count])
    study_pool = deduped[overview_count:]

    return overview, study_pool


def _summarize_with_bart(text, max_chunks, progress_callback):
    """Summarize a transcript into (overview, study_pool).

    Chunks are sized close to BART's ~1024 token input limit so each
    summarization call sees as much surrounding context as possible,
    producing more coherent, less choppy output than many tiny chunks would.
    `max_chunks` scales with video length (see study_tools.get_study_limits)
    so longer lectures get most/all of their transcript summarized instead of
    being cut off after the first ~18,000 characters regardless of length.

    Chunks are fed to the model in batches (see _bart_config) rather than one at
    a time — the per-call overhead dominated runtime on long videos, where
    there can be 100 of them.
    """

    chunks = _chunk_text(text, max_chunk=3000)[:max_chunks]

    if not chunks:
        return "", []

    # Every chunk is ~3000 chars by construction, so one set of length bounds
    # serves all of them — which is what lets them share a batch. (Sizing them
    # per chunk would force one call each.) Aim for roughly half-length
    # summaries, within sane bounds.
    mean_words = sum(len(c.split()) for c in chunks) // len(chunks)
    max_length = max(40, min(160, mean_words // 2))
    min_length = max(20, min(60, max_length - 20))

    summaries = []
    total = len(chunks)

    batch_size = _bart_config()["batch_size"]

    for start in range(0, total, batch_size):
        batch = chunks[start:start + batch_size]

        results = _get_summarizer()(
            batch,
            max_length=max_length,
            min_length=min_length,
            do_sample=False,
            num_beams=_bart_config()["num_beams"],
            batch_size=len(batch),
        )

        summaries.extend(r['summary_text'] for r in results)

        if progress_callback:
            # Reports chunks completed, so the caller's percentage maths is
            # unchanged — it just advances a batch at a time now.
            progress_callback(len(summaries), total)

    return _structure_summary(summaries)

# --- LLM extraction ----------------------------------------------------------

# Qwen2.5 has a 32k context against BART's 1024, so chunks can be far larger.
# A 4-hour transcript becomes ~13 chunks instead of ~100: fewer calls, each
# seeing much more context, which is what stops notes coming out as
# disconnected fragments. Larger chunks also cut total runtime, since each one
# costs a fixed number of decode steps regardless of how much text it covers.
_LLM_CHUNK_CHARS = 16000

_EXTRACT_SYSTEM = (
    "You extract study notes from lecture transcripts.\n"
    "\n"
    "Write only facts about the SUBJECT being taught. Each note must be a "
    "complete, standalone sentence that makes sense on its own, without having "
    "watched the video.\n"
    "\n"
    "Never write about:\n"
    "- the course, lecture, section, or video itself\n"
    "- what the speaker will show, cover, or explain later\n"
    "- the instructor, their experience, salaries, or job prospects\n"
    "- greetings, sign-offs, subscribing, or promotions\n"
    "\n"
    "Write 'A decorator wraps a function to extend its behaviour.' "
    "Never write 'In this lecture we will look at decorators.'\n"
    "\n"
    "Reply with one note per line, starting each line with '- '. "
    "No headings, no preamble, no commentary."
)

_OVERVIEW_SYSTEM = (
    "You write the opening paragraph of a reference article.\n"
    "\n"
    "Given a list of notes, write 2 to 4 sentences stating the facts they "
    "cover, as an encyclopedia entry would. Stop after 4 sentences.\n"
    "\n"
    "Use ONLY facts present in the notes. Never add examples, tool names, "
    "or library names that do not appear in the notes.\n"
    "\n"
    "Write about the subject directly. Never refer to notes, a guide, a "
    "course, a video, an instructor, or salaries. Never write 'this guide "
    "covers', 'we will explore', or 'you will learn'.\n"
    "\n"
    "Reply with the paragraph only. No heading, no bullet points.\n"
)


def _parse_notes(reply):
    """Pull note sentences out of a model reply, tolerating format drift."""
    notes = []

    for line in (reply or "").splitlines():
        line = line.strip()
        if not line:
            continue

        # Strip bullet markers and numbering the model may add anyway.
        line = re.sub(r"^[-*•]\s*", "", line)
        line = re.sub(r"^\d+[.)]\s*", "", line)
        line = line.strip(" *_`")

        if len(line) < 25:
            continue

        # A model occasionally emits a heading despite instructions.
        if line.endswith(":") or line.lower().startswith(("here are", "note:", "notes:")):
            continue

        notes.append(line)

    return notes


# Two notes sharing this fraction of their content words are the same point.
# Tuned to catch restatements without merging genuinely distinct facts that
# happen to share vocabulary.
_DUPLICATE_OVERLAP = 0.75


def _overlap(a, b):
    """Jaccard similarity of two word signatures."""
    union = a | b
    if not union:
        return 0.0
    return len(a & b) / len(union)


def _clean_pool(notes):
    """Filter and de-duplicate extracted notes.

    The prompt does most of the work, but a deterministic net catches anything
    that slips through - and near-duplicates are common when consecutive chunks
    overlap in subject matter.
    """
    cleaned = []
    seen = []

    for note in notes:
        if is_filler(note):
            continue

        note = strip_meta_preamble(note)
        if not note or is_filler(note):
            continue

        # Near-duplicate check by word overlap rather than exact match.
        # Consecutive chunks restate the same point constantly, and exact
        # comparison misses trivial variations - "behaviour"/"behavior", or an
        # extra trailing clause - which would otherwise both survive.
        signature = frozenset(
            w for w in re.findall(r"[a-z]+", note.lower()) if len(w) > 3
        )
        if not signature:
            continue

        if any(_overlap(signature, other) >= _DUPLICATE_OVERLAP for other in seen):
            continue

        seen.append(signature)
        cleaned.append(note)

    return cleaned


# Total notes to aim for across the whole video, regardless of its length.
# The notes page shows at most ~35 (study_tools tier limits) and the quiz draws
# from the same pool, so this leaves a selection margin without paying for
# notes nothing will display. Runtime is dominated by the number of tokens
# decoded - roughly 82ms per token on this hardware - so the note budget is
# the single biggest lever on how long a video takes.
_NOTE_BUDGET = 60

# Bounds per chunk, so a single-chunk video still gets a useful set and a very
# long one does not thin out to one note per chunk.
_MIN_NOTES_PER_CHUNK = 4
_MAX_NOTES_PER_CHUNK = 8


def _notes_per_chunk(total_chunks):
    """Split the note budget across the chunks this video actually has."""
    if total_chunks <= 0:
        return _MIN_NOTES_PER_CHUNK

    return max(
        _MIN_NOTES_PER_CHUNK,
        min(_MAX_NOTES_PER_CHUNK, _NOTE_BUDGET // total_chunks),
    )


def _extract_prompt(chunk, wanted):
    return (
        "Write %d notes from this transcript section. Cover every distinct "
        "fact, definition, tool, and convention mentioned.\n\n"
        "Transcript section:\n\n%s" % (wanted, chunk)
    )


def _trim_sentences(text, limit):
    """Keep at most `limit` complete sentences.

    The model overruns the requested length and gets cut off mid-word at
    the token limit, so drop any trailing fragment.
    """
    parts = re.split(r"(?<=[.!?])\s+", (text or "").strip())
    complete = [p for p in parts if p.endswith((".", "!", "?"))]
    return " ".join(complete[:limit])


def _summarize_with_llm(text, max_chunks, progress_callback):
    """Extract notes with the instruct model. Returns None if it can't."""
    chunks = _chunk_text(text, max_chunk=_LLM_CHUNK_CHARS)[:max_chunks]
    if not chunks:
        return None

    notes = []
    total = len(chunks)
    done = 0
    per_chunk = _notes_per_chunk(total)

    for start in range(0, total, llm.BATCH_SIZE):
        batch = chunks[start:start + llm.BATCH_SIZE]

        replies = llm.chat_batch(
            _EXTRACT_SYSTEM,
            [_extract_prompt(chunk, per_chunk) for chunk in batch],
            # The token cap, not the requested count, is what actually bounds
            # runtime: the model writes past the number of notes it was asked
            # for and stops at the cap, so lowering the count alone saved
            # nothing. ~45 tokens covers one note plus its bullet marker.
            max_new_tokens=min(600, 45 * per_chunk),
        )

        if not replies:
            return None

        for reply in replies:
            notes.extend(_parse_notes(reply))

        done += len(batch)
        if progress_callback:
            progress_callback(done, total)

    pool = _clean_pool(notes)
    if not pool:
        return None

    # Build the overview from the notes, not from the transcript head - that is
    # what kept putting the instructor's bio in the opening paragraph.
    overview = llm.chat(
        _OVERVIEW_SYSTEM,
        "Notes:\n\n" + "\n".join("- %s" % n for n in pool[:40]),
        max_new_tokens=320,
    ).strip()

    overview = _trim_sentences(overview, 4)

    if is_filler(overview) or len(overview) < 40:
        overview = " ".join(pool[:3])

    return overview, pool


def generate_summary(text, max_chunks=6, progress_callback=None):
    """Summarize a transcript into (overview, study_pool).

    Prefers the instruct model, which can be told to extract subject matter and
    ignore course narration. Falls back to BART when no GPU is available, or if
    the model fails or returns nothing usable - the fallback produces weaker,
    more transcript-like notes, but it keeps the app working on CPU.

    `max_chunks` scales with video length (see study_tools.get_study_limits).
    The two paths use very different chunk sizes, so the same value covers far
    more transcript on the LLM path.
    """
    if llm.is_available():
        result = _summarize_with_llm(text, max_chunks, progress_callback)
        if result is not None:
            return result
        print("[summarizer] LLM path yielded nothing; falling back to BART", flush=True)

    return _summarize_with_bart(text, max_chunks, progress_callback)

