import re
import random

STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be",
    "been", "being", "in", "on", "at", "to", "for", "of", "with", "by",
    "from", "as", "that", "this", "these", "those", "it", "its", "into",
    "about", "than", "then", "so", "if", "not", "no", "we", "you", "they",
    "he", "she", "his", "her", "their", "our", "your", "i", "also", "can",
    "which", "who", "what", "when", "where", "how", "will", "would",
    "could", "should", "has", "have", "had", "there", "here", "such",
}


def _extract_text(summary):
    """Summaries are stored as either a structured {overview, key_points} dict
    (current schema) or a plain string (older notes). Normalize to one string."""
    if isinstance(summary, dict):
        parts = [summary.get("overview", "")] + list(summary.get("key_points", []))
        return " ".join(p for p in parts if p)
    return summary or ""


def split_sentences(text):
    text = re.sub(r"\s+", " ", text or "").strip()
    if not text:
        return []

    raw = re.split(r"(?<=[.!?])\s+", text)
    sentences = [s.strip() for s in raw if len(s.strip()) >= 25]
    return sentences


def _keywords(sentence):
    words = re.findall(r"[A-Za-z][A-Za-z\-']{3,}", sentence)
    return [w for w in words if w.lower() not in STOPWORDS]


def _key_term(sentence):
    """Pick the most distinctive word in a sentence to quiz on."""
    candidates = _keywords(sentence)
    if not candidates:
        return None
    # Prefer capitalized (likely proper nouns / key terms), then longest word.
    capitalized = [w for w in candidates if w[0].isupper()]
    pool = capitalized if capitalized else candidates
    return max(pool, key=len)


def generate_flashcards(summary_text, count=8):
    sentences = split_sentences(_extract_text(summary_text))
    flashcards = []

    for i, sentence in enumerate(sentences[:count]):
        term = _key_term(sentence)
        front = f"What does the lecture say about \"{term}\"?" if term else f"Key point #{i + 1}"
        flashcards.append({
            "id": i,
            "front": front,
            "back": sentence,
        })

    return flashcards


def generate_mcqs(summary_text, count=5):
    sentences = split_sentences(_extract_text(summary_text))
    if not sentences:
        return []

    # Build a pool of key terms across all sentences to use as distractors.
    term_pool = []
    for sentence in sentences:
        term_pool.extend(_keywords(sentence))
    term_pool = list(dict.fromkeys(term_pool))  # de-duplicate, preserve order

    mcqs = []

    for i, sentence in enumerate(sentences[:count]):
        term = _key_term(sentence)
        if not term:
            continue

        # Blank out the key term to form the question stem.
        pattern = re.compile(re.escape(term), re.IGNORECASE)
        question = pattern.sub("_____", sentence, count=1)

        distractor_pool = [
            t for t in term_pool
            if t.lower() != term.lower() and len(t) > 2
        ]
        random.shuffle(distractor_pool)
        distractors = distractor_pool[:3]

        # Pad with generic distractors if the transcript didn't yield enough terms.
        filler = ["None of the above", "All of the above", "Not mentioned", "Unclear from the lecture"]
        while len(distractors) < 3:
            candidate = filler.pop(0) if filler else f"Option {len(distractors) + 1}"
            if candidate not in distractors:
                distractors.append(candidate)

        options = distractors + [term]
        random.shuffle(options)

        mcqs.append({
            "id": i,
            "question": f"Fill in the blank: {question}",
            "options": options,
            "answer": term,
        })

    return mcqs
