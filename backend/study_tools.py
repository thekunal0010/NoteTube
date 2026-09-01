import re
import random

import llm
from text_filters import FILLER_WORDS, is_filler

_BASE_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be",
    "been", "being", "in", "on", "at", "to", "for", "of", "with", "by",
    "from", "as", "that", "this", "these", "those", "it", "its", "into",
    "about", "than", "then", "so", "if", "not", "no", "we", "you", "they",
    "he", "she", "his", "her", "their", "our", "your", "i", "also", "can",
    "which", "who", "what", "when", "where", "how", "will", "would",
    "could", "should", "has", "have", "had", "there", "here", "such",
}

# Channel vocabulary is folded in so words like "subscribe" or "channel" can
# never be chosen as a quiz answer or offered as a distractor, even when they
# survive line-level filtering by appearing mid-explanation.
STOPWORDS = _BASE_STOPWORDS | FILLER_WORDS

# Conversational tells. A sentence built mostly from these is the speaker
# talking rather than teaching, so it scores lower for quiz selection.
_CHATTY_WORDS = {
    "i", "im", "ive", "you", "your", "youre", "we", "were", "weve", "us",
    "me", "my", "lets", "guys", "okay", "so", "well", "now", "right",
    "gonna", "wanna", "basically", "actually", "literally", "obviously",
    "maybe", "kind", "sort", "like",
}

# Tokens that look like code or data rather than prose — a strong signal the
# sentence carries technical substance worth quizzing on.
_TECHNICAL_TOKEN = re.compile(r"[A-Za-z]+[_.][A-Za-z]|[a-z][A-Z]|\d")

# Real words that make useless quiz answers — too generic to test anyone on.
# Kept separate from STOPWORDS because they're fine as ordinary sentence
# content; they're only rejected when chosen as *the* term to quiz on.
_GENERIC_TERMS = {
    "more", "most", "much", "many", "some", "other", "another", "same",
    "very", "well", "even", "still", "also", "each", "both", "every",
    "make", "makes", "made", "take", "takes", "give", "gives", "need",
    "needs", "look", "looks", "see", "sees", "say", "says", "said",
    "does", "doing", "done", "goes", "went", "over", "under", "after",
    "before", "while", "because", "through", "into", "onto", "part",
    "different", "important", "example", "little", "better", "best",
}


def _extract_text(summary):
    """Summaries are stored as either a structured {overview, key_points,
    paragraphs} dict (current schema) or a plain string (older notes).
    Normalize to one string."""
    if isinstance(summary, dict):
        parts = (
            [summary.get("overview", "")]
            + list(summary.get("key_points", []))
            + list(summary.get("paragraphs", []))
        )
        return " ".join(p for p in parts if p)
    return summary or ""


def group_into_paragraphs(sentences, size=5):
    """Group a flat sentence list into `size`-sentence paragraphs, for the
    "Quick Summary" display mode — flowing prose instead of a bullet list."""
    return [
        " ".join(sentences[i:i + size])
        for i in range(0, len(sentences), size)
    ]


def _extract_sentences(source):
    """Source is either the uncapped study_pool list (current schema, one
    sentence per item — no re-splitting needed) or a structured/plain summary
    (older notes, or the concise display summary as a fallback)."""
    if isinstance(source, list):
        return [s.strip() for s in source if s and len(s.strip()) >= 25]
    return split_sentences(_extract_text(source))


# Tiered flashcard/MCQ limits by video length. `min` is what's generated
# up front; the "Load more" action in the UI reveals up to `max`.
# `max_chunks` controls how much of the transcript summarizer.generate_summary
# processes (each chunk is ~3000 chars), so longer videos get most/all of
# their transcript summarized instead of being cut off after a fixed prefix
# regardless of length — a 1-hour lecture needs far more than a 5-minute clip.
_STUDY_KIT_TIERS = [
    # (minutes_below, flashcards, mcqs, max_chunks)
    (5, {"min": 5, "max": 5}, {"min": 5, "max": 5}, 8),
    (10, {"min": 10, "max": 15}, {"min": 15, "max": 20}, 15),
    (15, {"min": 10, "max": 20}, {"min": 15, "max": 25}, 25),
]
# 100 chunks is ~300,000 chars, enough to cover a 4-hour lecture end to end.
# The old cap of 40 truncated anything past roughly the 2.5-hour mark; it
# existed to bound runtime, which batching + GPU decoding now handles.
_STUDY_KIT_DEFAULT = ({"min": 10, "max": 30}, {"min": 15, "max": 35}, 100)


def get_study_limits(duration_seconds):
    """Map a video's duration to its flashcard/MCQ min & max counts."""
    minutes = (duration_seconds or 0) / 60

    for cutoff, flashcards, mcqs, max_chunks in _STUDY_KIT_TIERS:
        if minutes < cutoff:
            return {"flashcards": flashcards, "mcqs": mcqs, "max_chunks": max_chunks}

    flashcards, mcqs, max_chunks = _STUDY_KIT_DEFAULT
    return {"flashcards": flashcards, "mcqs": mcqs, "max_chunks": max_chunks}


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


def _informativeness(sentence):
    """Score a sentence by how much it teaches, for quiz selection.

    Position in the transcript says nothing about teaching value — the opening
    lines of a video are its intro, not its best material — so flashcards and
    MCQs rank by this instead of taking whatever came first.
    """
    words = re.findall(r"[A-Za-z][A-Za-z\-'.\_]*", sentence)
    if not words:
        return 0.0

    lowered = [w.lower().strip(".") for w in words]

    distinct_keywords = {w for w in lowered if w not in STOPWORDS and len(w) > 3}
    technical = sum(1 for w in words if _TECHNICAL_TOKEN.search(w))
    chatty = sum(1 for w in lowered if w in _CHATTY_WORDS)

    score = len(distinct_keywords) + (2.0 * technical) - (1.5 * chatty)

    # Normalize by length so a long ramble doesn't outrank a dense definition
    # purely on word count, and damp very short fragments that lack context.
    score = score / (1 + len(words) / 25.0)

    if len(words) < 8:
        score *= 0.5

    return score


def _best_sentences(sentences, count):
    """Candidate sentences for a quiz, best first, restored to transcript order.

    Returns more than `count` candidates because callers skip any sentence with
    no quizzable key term. Boilerplate is held back entirely and only used if
    real content cannot fill `count` on its own — a short video whose phrasing
    trips the filters should still produce a full set of cards rather than an
    empty one.

    Candidates come back **best first** so a caller taking the first `count`
    it can use is taking the most informative ones. Transcript order is
    restored afterwards by `_in_transcript_order`, once selection is done —
    doing it here instead would hand back an early-but-weak sentence ahead of
    a later strong one, which is the positional bias this exists to remove.
    """
    usable = [s for s in sentences if not is_filler(s)]
    chosen = sorted(usable, key=_informativeness, reverse=True)[:count * 3]

    if len(chosen) < count:
        filler = sorted(
            (s for s in sentences if is_filler(s)),
            key=_informativeness,
            reverse=True,
        )
        chosen = chosen + filler[:count - len(chosen)]

    return chosen


def _in_transcript_order(picked, sentences):
    """Restore transcript order to already-selected sentences, so notes and
    cards read in lecture sequence rather than in descending-score order."""
    order = {s: i for i, s in enumerate(sentences)}
    return sorted(picked, key=lambda item: order.get(item[0], 0))


def _key_term(sentence):
    """Pick the most distinctive word in a sentence to quiz on."""
    candidates = _keywords(sentence)
    if not candidates:
        return None

    # A capital mid-sentence suggests a proper noun or a named concept worth
    # quizzing on. The *first* word's capital is just grammar — treating it as
    # a signal is what made "Subscribe to the channel..." yield "Subscribe".
    first_word = next(iter(re.findall(r"[A-Za-z][A-Za-z\-']*", sentence)), None)
    capitalized = [
        w for w in candidates
        if w[0].isupper() and w != first_word
    ]

    pool = capitalized if capitalized else candidates

    # Drop terms too generic to quiz on. Returning None makes the caller skip
    # the sentence entirely rather than asking "what does the lecture say
    # about 'more'?".
    pool = [w for w in pool if w.lower() not in _GENERIC_TERMS]
    if not pool:
        return None

    return max(pool, key=len)


def select_key_points(study_pool, count):
    """The `count` best sentences from a pool, for the notes page.

    Exists because app.py used to slice the pool positionally, which on a
    tutorial meant the intro and the course promo. Filler is dropped, the rest
    ranked by informativeness, and transcript order restored so the notes still
    read in lecture sequence.
    """
    sentences = _extract_sentences(study_pool)
    if not sentences:
        return []

    picked = [(s, None) for s in _best_sentences(sentences, count)[:count]]

    return [s for s, _ in _in_transcript_order(picked, sentences)]


def _heuristic_flashcards(source, count=8):
    sentences = _extract_sentences(source)

    # Candidates arrive best-first; sentences whose key term is too generic are
    # skipped, which is why _best_sentences hands back more than `count`.
    picked = []
    for sentence in _best_sentences(sentences, count):
        if len(picked) >= count:
            break

        term = _key_term(sentence)
        if not term:
            continue

        picked.append((sentence, term))

    return [
        {
            "id": i,
            "front": f"What does the lecture say about \"{term}\"?",
            "back": sentence,
        }
        for i, (sentence, term) in enumerate(_in_transcript_order(picked, sentences))
    ]


def _heuristic_mcqs(source, count=5):
    sentences = _extract_sentences(source)
    if not sentences:
        return []

    # Over-request for the same reason as generate_flashcards: sentences with
    # no quizzable term are skipped below.
    selected = _best_sentences(sentences, count)

    # Build a pool of key terms to use as distractors. Drawn from the filtered
    # sentences only, so a wrong answer is always a plausible course term
    # rather than something lifted out of the channel patter.
    term_pool = []
    for sentence in sentences:
        if not is_filler(sentence):
            term_pool.extend(_keywords(sentence))
    term_pool = list(dict.fromkeys(term_pool))  # de-duplicate, preserve order

    picked = []

    for sentence in selected:
        if len(picked) >= count:
            break

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

        picked.append((sentence, {
            "question": f"Fill in the blank: {question}",
            "options": options,
            "answer": term,
        }))

    return [
        dict(mcq, id=i)
        for i, (_, mcq) in enumerate(_in_transcript_order(picked, sentences))
    ]

# --- LLM-generated study kit -------------------------------------------------
#
# The heuristic generators below blank a word out of a sentence, which produces
# questions like 'Fill in the blank: A _____ is a function...'. Workable, but
# the distractors are random terms from elsewhere in the transcript, so the
# answer is often obvious by elimination. When the instruct model is available
# it writes real questions with plausible wrong answers instead.

_FLASHCARD_SYSTEM = (
    "You write flashcards from study notes.\n"
    "\n"
    "For each card write a question testing understanding of one concept, and "
    "a concise answer. Ask about the subject matter only - never about the "
    "course, video, or instructor.\n"
    "\n"
    "Reply with one card per line in exactly this format:\n"
    "Q: <question> | A: <answer>\n"
    "\n"
    "No numbering, no headings, no commentary."
)

_MCQ_SYSTEM = (
    "You write one multiple-choice question from a single fact.\n"
    "\n"
    "Use only the fact you are given. Do not use outside knowledge. Ask about "
    "the subject matter only, never about a course, video, or instructor.\n"
    "\n"
    "Use exactly this format:\n"
    "\n"
    "Q: <question>\n"
    "Correct: <the answer the fact supports>\n"
    "Wrong: <a clearly wrong answer>\n"
    "Wrong: <a different clearly wrong answer>\n"
    "Wrong: <a third clearly wrong answer>\n"
    "\n"
    "Do not write a lettered A/B/C/D list. Write only those six lines.\n"
    "\n"
    "Every wrong answer must be plainly contradicted by the fact, and similar "
    "in length to the correct one. Never write 'none of the above'. No "
    "numbering, no headings, no commentary."
)


def _significant(text):
    """Content words of `text`, ignoring stopwords and filler."""
    return {
        w for w in re.findall(r"[a-z0-9_]+", (text or "").lower())
        if len(w) > 2 and w not in STOPWORDS
    }


def _support(text, note):
    """Fraction of `text`'s content words that appear in `note`.

    0.0 means the two are unrelated; 1.0 means everything the text says is
    stated in the note.
    """
    words = _significant(text)
    if not words:
        return 0.0

    return len(words & _significant(note)) / len(words)


def _grounded(answer, note):
    """True if `answer` plausibly comes from `note`.

    The model labels its options correctly but cannot reliably mark which
    letter is right - asked for the default implementation of Python it wrote
    'A: CPython' and then 'Answer: B' (Java). Labelling by role removes the
    letter bookkeeping; this checks the result actually came from the source.
    """
    return _support(answer, note) > 0


# The model does not stick to one output shape. Across runs it produces:
#   Correct: D) CPython          (text, with a letter prefix)
#   Correct: D                   (letter only, no text)
#   A) ... B) ...                (a lettered list, then)
#   The correct answer is B: X   (a prose statement instead of Correct:)
# Rather than fight it, accept all of these. _grounded is what keeps a wrong
# answer out, so resolving a bare letter back to its option is safe.

# How much of a distractor must be stated in the source note before we treat
# it as a second correct answer and drop the question.
_DISTRACTOR_CONFLICT = 0.7

# A question about the material's packaging rather than its subject. The
# filler patterns target transcript lines; these catch the model asking
# "What is the primary goal of the course?" from a note that merely
# mentioned one. Phrased to spare legitimate uses like a `course_name`
# variable, which a bare "course" ban would reject.
_META_QUESTION = re.compile(
    r"\b(this|the|his|her|their) (course|lecture|tutorial|video|instructor|channel)\b(?!\s+name)",
    re.IGNORECASE,
)

# The prompt forbids these, but the model emits them anyway; as an option they
# make the question unanswerable rather than merely easy.
_BANNED_OPTION = re.compile(
    r"\b(none|all|both) of (the )?(above|these)\b|^\s*(none|n/a|unknown)\s*$",
    re.IGNORECASE,
)

_OPTION_LINE = re.compile(r"^\s*([A-D])\s*[.):]\s*(.+)$")
_PREFIX = re.compile(r"^\s*[A-Z]\s*[.):]\s*")
_PROSE_ANSWER = re.compile(
    r"(?:correct answer is|answer is|answer:)\s*(.+)$", re.IGNORECASE
)


def _strip_prefix(text):
    """Remove a leading 'A)' / 'B:' label from an option's text."""
    return _PREFIX.sub("", (text or "").strip()).strip()


def _normalize(text):
    """Compare option texts ignoring case and trailing punctuation.

    The model restates its answer in prose with a full stop ("Iron Python.")
    while the lettered list has none, so a naive comparison treats them as two
    different options and the correct answer ends up listed twice.
    """
    return (text or "").strip().rstrip(".!?,;:").strip().lower()


def _resolve(value, lettered):
    """Turn an option reference into its text, or "" if it is only a letter.

    A bare letter is deliberately NOT resolved. The model assigns its options
    correctly but mislabels which letter is right - it answered "D" for PEP 8
    when D was "Python Enhancement Package" and the correct "Python
    Enhancement Proposal" was A. Grounding cannot catch that (both mention
    Python), so a letter-only answer is dropped instead. A missing question
    beats teaching a wrong fact.
    """
    value = (value or "").strip()
    if not value:
        return ""

    bare = value.rstrip(".):").strip()
    if len(bare) <= 1:
        return ""

    return _strip_prefix(value)


def _parse_mcq_block(block, note=None):
    """Parse one question block into an MCQ dict, or None."""
    question = None
    lettered = {}
    correct_raw = None
    wrong_raw = []
    prose_raw = None

    for line in block.splitlines():
        line = line.strip()
        if not line:
            continue

        match = re.match(r"^Q\d*\s*:\s*(.+)$", line, re.IGNORECASE)
        if match:
            question = match.group(1).strip()
            continue

        match = re.match(r"^Correct:\s*(.+)$", line, re.IGNORECASE)
        if match:
            correct_raw = match.group(1).strip()
            continue

        match = re.match(r"^Wrong:\s*(.+)$", line, re.IGNORECASE)
        if match:
            wrong_raw.append(match.group(1).strip())
            continue

        match = _OPTION_LINE.match(line)
        if match:
            lettered[match.group(1).upper()] = match.group(2).strip()
            continue

        match = _PROSE_ANSWER.search(line)
        if match:
            prose_raw = match.group(1).strip()

    if not question or len(question) < 10:
        return None

    correct = _resolve(correct_raw or prose_raw, lettered)
    if not correct:
        return None

    wrong = [w for w in (_resolve(w, lettered) for w in wrong_raw) if w]

    # No explicit wrong answers - take whatever is left of the lettered list.
    if len(wrong) < 3:
        wrong = [
            text for text in lettered.values()
            if _normalize(text) != _normalize(correct)
        ]

    if len(wrong) < 3:
        return None

    options = [correct] + wrong[:3]
    if len(set(_normalize(o) for o in options)) != 4:
        return None
    if is_filler(question) or any(is_filler(o) for o in options):
        return None
    if _META_QUESTION.search(question):
        return None
    if any(_BANNED_OPTION.search(o) for o in options):
        return None

    # Reject an answer that has nothing to do with the fact it was built from.
    # This is what catches the model naming a letter whose option contradicts
    # the source ("Answer: B" pointing at Java for a fact about CPython).
    if note is not None and not _grounded(correct, note):
        return None

    # Reject questions with more than one defensible answer. When the source
    # note lists several items ("...including Jython, Iron Python, and PyPy"),
    # the model happily builds "which is an implementation of Python?" and
    # draws its distractors from that same list, making three options correct.
    # A distractor sharing one incidental word with the note ("Python") is not
    # a second correct answer; requiring most of its content words to appear
    # there is what separates "also correct" from "merely related". Checking
    # for any overlap rejected almost every question.
    if note is not None and any(
        _support(w, note) >= _DISTRACTOR_CONFLICT for w in options[1:]
    ):
        return None

    # Present every option the same way. The correct answer often arrives from
    # a prose restatement and keeps its full stop while the distractors do not,
    # which would let a reader spot it by punctuation alone.
    options = [o.strip().rstrip(".") for o in options]
    correct = correct.strip().rstrip(".")

    shuffled = list(options)
    random.shuffle(shuffled)

    return {"question": question, "options": shuffled, "answer": correct}


# Questions to generate with the model, regardless of the tier's maximum.
# Each one costs its own call: grouping several facts into one prompt was ~5x
# faster but the model dropped the Correct:/Wrong: format when asked for more
# than one question at a time, marking no answer at all. Reliability wins, so
# the count is capped to keep generation time bounded instead.
_MAX_LLM_QUESTIONS = 15


def _llm_mcqs(sentences, count, cards=None):
    """Build questions from flashcards rather than asking for them directly.

    Asking the model for a question plus one correct and three wrong answers
    was both the slowest step and the least reliable: it assigned options
    correctly but mislabelled which was right (answering "D" for PEP 8 when D
    read "Python Enhancement Package"), and most replies were truncated before
    the answer lines at all. Only 2 in 10 survived validation.

    Flashcards are the same model doing an easier job - a question and its
    answer, no bookkeeping - and they come back essentially every time. So the
    card's answer becomes the correct option and other cards' answers become
    the distractors. The correct option is a fact drawn straight from the
    transcript, so it cannot be wrong, and this adds no model calls at all.
    """
    if cards is None:
        cards = _llm_flashcards(sentences, count)

    if len(cards) < 4:
        return []

    answers = [c["back"] for c in cards]

    mcqs = []
    for i, card in enumerate(cards):
        correct = card["back"]

        # Distractors are other cards' answers: on-topic, similar in register,
        # and definitely not the answer to this question.
        pool = [a for j, a in enumerate(answers) if j != i and _distinct(a, correct)]
        if len(pool) < 3:
            continue

        distractors = random.sample(pool, 3)

        options = [correct] + distractors
        random.shuffle(options)

        mcqs.append({
            "id": len(mcqs),
            "question": card["front"],
            "options": options,
            "answer": correct,
        })

        if len(mcqs) >= count:
            break

    return mcqs


def _distinct(candidate, correct):
    """True if `candidate` is different enough from `correct` to be a wrong
    answer. Two notes restating the same fact would otherwise give a question
    with two correct options."""
    return _support(candidate, correct) < 0.5 and _support(correct, candidate) < 0.5


def _split_mcq_blocks(reply):
    """Group a reply into one block per question.

    Splitting on blank lines does not work: the model puts a blank line
    between the options and the "Answer:" line, which tears the answer off
    the question it belongs to. Each "Q:" line starts a new block instead.
    """
    blocks = []
    current = []

    for line in (reply or "").splitlines():
        if re.match(r"^\s*Q\d*\s*:", line, re.IGNORECASE):
            if current:
                blocks.append("\n".join(current))
            current = [line]
        elif current:
            current.append(line)

    if current:
        blocks.append("\n".join(current))

    return blocks


def _notes_prompt(sentences, count, kind):
    return (
        "Write %d %s from these notes.\n\nNotes:\n%s"
        % (count, kind, "\n".join("- %s" % s for s in sentences))
    )


# Cards per prompt. Generation cost is the number of decode steps, and those
# are sequential within one reply: asking for 30 cards in a single call meant
# ~1000 steps back to back (~80s). Splitting into groups lets several run as a
# batch, cutting wall time roughly by the batch size.
_CARDS_PER_PROMPT = 8


def _llm_flashcards(sentences, count):
    groups = [
        sentences[i:i + _CARDS_PER_PROMPT]
        for i in range(0, min(len(sentences), count * 2), _CARDS_PER_PROMPT)
    ]
    if not groups:
        return []

    prompts = [
        _notes_prompt(group, min(len(group), _CARDS_PER_PROMPT), "flashcards")
        for group in groups
    ]

    replies = llm.chat_batch(
        _FLASHCARD_SYSTEM, prompts, max_new_tokens=90 * _CARDS_PER_PROMPT
    )

    cards = []
    for reply in replies:
        for line in reply.splitlines():
            if "Q:" not in line or "A:" not in line:
                continue

            try:
                question, answer = line.split("|", 1)
            except ValueError:
                continue

            question = re.sub(r"^\s*Q:\s*", "", question).strip()
            answer = re.sub(r"^\s*A:\s*", "", answer).strip()

            if len(question) < 10 or len(answer) < 2:
                continue
            if is_filler(question) or is_filler(answer):
                continue
            if _META_QUESTION.search(question):
                continue

            cards.append({"id": len(cards), "front": question, "back": answer})

            if len(cards) >= count:
                return cards

    return cards


def generate_flashcards(source, count=8):
    """Flashcards for a note's study pool.

    Uses the instruct model when available, falling back to the heuristic
    term-blanking generator on CPU or if the model's output can't be parsed.
    """
    sentences = _extract_sentences(source)
    if not sentences:
        return []

    if llm.is_available():
        try:
            cards = _llm_flashcards(_best_sentences(sentences, count), count)
        except Exception as exc:  # noqa: BLE001 - never fail a request over this
            print("[study_tools] LLM flashcards failed: %s" % exc, flush=True)
            cards = []

        if cards:
            return cards

    return _heuristic_flashcards(source, count=count)


def generate_mcqs(source, count=5, flashcards=None):
    """Multiple-choice questions for a note's study pool.

    `flashcards` accepts an already-generated set to build from; the LLM path
    derives questions from flashcards, so passing them in avoids generating
    the same cards twice when a caller needs both.
    """
    sentences = _extract_sentences(source)
    if not sentences:
        return []

    if llm.is_available():
        try:
            mcqs = _llm_mcqs(_best_sentences(sentences, count), count, cards=flashcards)
        except Exception as exc:  # noqa: BLE001
            print("[study_tools] LLM MCQs failed: %s" % exc, flush=True)
            mcqs = []

        if mcqs:
            return mcqs

    return _heuristic_mcqs(source, count=count)
