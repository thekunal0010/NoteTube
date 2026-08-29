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
    """Turn a list of raw chunk summaries into an Overview + Key Points structure,
    similar to how a student would actually organize lecture notes."""

    sentences = []
    for chunk in chunk_summaries:
        parts = re.split(r"(?<=[.!?])\s+", chunk.strip())
        sentences.extend(s.strip() for s in parts if s.strip())

    if not sentences:
        return {"overview": "", "key_points": []}

    overview_count = 2 if len(sentences) > 4 else 1
    overview = " ".join(sentences[:overview_count])

    seen = set()
    key_points = []
    for sentence in sentences[overview_count:]:
        normalized = sentence.lower()
        if len(sentence) < 25 or normalized in seen:
            continue
        seen.add(normalized)
        key_points.append(sentence)
        if len(key_points) >= 10:
            break

    return {"overview": overview, "key_points": key_points}


def generate_summary(text, max_chunks=6, progress_callback=None):
    """Summarize a transcript into a structured {overview, key_points} dict.

    Chunks are sized close to BART's ~1024 token input limit so each
    summarization call sees as much surrounding context as possible,
    producing more coherent, less choppy output than many tiny chunks would.
    """

    chunks = _chunk_text(text, max_chunk=3000)[:max_chunks]

    if not chunks:
        return {"overview": "", "key_points": []}

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
