import re
from transformers import pipeline

summarizer = pipeline(
    "summarization",
    model="facebook/bart-large-cnn"
)


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


def generate_summary(text, max_chunks=6, progress_callback=None):
    """Summarize a transcript into (overview, study_pool).

    Chunks are sized close to BART's ~1024 token input limit so each
    summarization call sees as much surrounding context as possible,
    producing more coherent, less choppy output than many tiny chunks would.
    `max_chunks` scales with video length (see study_tools.get_study_limits)
    so longer lectures get most/all of their transcript summarized instead of
    being cut off after the first ~18,000 characters regardless of length.
    """

    chunks = _chunk_text(text, max_chunk=3000)[:max_chunks]

    if not chunks:
        return "", []

    summaries = []
    total = len(chunks)

    for i, chunk in enumerate(chunks, start=1):

        word_count = len(chunk.split())
        # Aim for roughly half-length summaries, within sane bounds.
        max_length = max(40, min(160, word_count // 2))
        min_length = max(20, min(60, max_length - 20))

        summary = summarizer(
            chunk,
            max_length=max_length,
            min_length=min_length,
            do_sample=False
        )

        summaries.append(summary[0]['summary_text'])

        if progress_callback:
            progress_callback(i, total)

    return _structure_summary(summaries)
