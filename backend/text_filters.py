"""Shared vocabulary for stripping YouTube channel boilerplate out of transcripts.

Educational videos carry a formulaic wrapper around the actual teaching — an
intro greeting, a subscribe pitch, an outro. Left in, the summarizer treats it
as course material and the quiz generator happily builds questions about the
bell icon. Filtering it here, before the transcript reaches the model, keeps it
out of every downstream artefact (overview, key points, flashcards, MCQs) at
once.

Lives in its own module so both transcript.py and study_tools.py can use it
without study_tools becoming a dependency of transcript.
"""

import re

# Channel patter. Each pattern is matched against a single caption line; a hit
# discards that line. Kept deliberately specific — these should never fire on a
# sentence that is actually teaching something.
_FILLER_SOURCES = (
    # Engagement pitches
    r"\bsubscribe\b",
    r"\bsubscri(bed|bing|ption)\b",
    r"\bbell icon\b",
    r"\bnotification bell\b",
    r"\bhit (the |that )?like\b",
    r"\bsmash (the |that )?like\b",
    r"\blike (and|&) share\b",
    r"\bthumbs up\b",
    r"\bcomment (down )?below\b",
    r"\bleave a comment\b",
    r"\blet me know in the comments\b",
    # Loose on purpose: "the link to the source code is in the description"
    # puts several words between the link and where it lives.
    r"\blinks?\b.{0,50}\b(description|bio|below)\b",
    r"\b(description|bio)\b.{0,30}\blinks?\b",
    r"\bcheck (out )?(the )?(description|my other|my channel)\b",
    r"\bdon'?t forget to\b",
    r"\bmake sure to (like|subscribe|hit)\b",

    # Sponsorship / promotion
    r"\bpatreon\b",
    r"\bsponsor(ed|ship|s)?\b",
    r"\bthis video is brought to you by\b",
    r"\bpromo code\b",
    r"\bdiscount code\b",
    r"\bdiscord (server|channel)\b",
    r"\bjoin (my|our) (discord|community|channel)\b",
    r"\bmerch\b",

    # Greetings / intros
    r"\bwelcome back\b",
    r"\bwelcome to (my|the|this) (channel|video|series)\b",
    r"\bwhat'?s up (guys|everyone|you all|y'?all)\b",
    r"\bhey (guys|everyone|there|folks|y'?all)\b",
    r"\bhello (guys|everyone|there|folks|y'?all)\b",
    r"\bhi (guys|everyone|there|folks|y'?all)\b",
    r"\bgood (morning|afternoon|evening) (guys|everyone|folks)\b",
    r"\bmy name is\b",
    r"\bin (today'?s|this) (video|tutorial|lesson)\b",
    r"\bbefore we (get started|start|begin|dive in)\b",

    # Outros
    r"\bthanks? (for|so much for) watching\b",
    r"\bsee you (guys )?(in|on) the next\b",
    r"\bsee you next (time|video)\b",
    r"\bthat'?s (it|all) for (this|today'?s) (video|tutorial|lesson)\b",
    r"\bcatch you (guys )?(in|on) the next\b",
    r"\bstay tuned\b",
    r"\bpeace out\b",

    # Course meta-narration and promotion. A tutorial transcript is full of
    # the speaker describing the course rather than teaching the subject;
    # left in, it outranks the real content (an "average salary" line scored
    # higher than "Pep 8 is a style guide for python code").
    r"\bin (this|the next|today\'?s) (course|lecture|section|video|tutorial)\b",
    r"\bi\'?m going to (show|teach|walk)\b",
    r"\bwe\'?re going to (learn|look at|talk about|cover|see)\b",
    r"\bwe will (learn|look at|talk about|cover)\b",
    r"\blet me show you\b",
    r"\blet\'?s (talk about|start by|begin by|get started)\b",
    r"\byour instructor\b",
    r"\b(full|complete|entire)\b.{0,30}\bcourse\b",
    r"\bmy\b.{0,30}\bcourse\b",
    r"\bcourse covers\b",
    r"\b(larger|bigger|paid|premium|extended) course\b",
    r"\bpart of a\b.{0,25}\bcourse\b",
    r"\bthis (tutorial|video|lesson) is\b.{0,40}\bcourse\b",
    r"\bnext level\b",
    r"\bhands-?on projects\b",
    r"\byears of experience\b",
    r"\bhas taught\b|\bhe\'?s taught\b|\bshe\'?s taught\b",
    r"\baverage salary\b",
    r"\baccording to indeed\b",
    r"\bpause the video\b",
    r"\b(keep|continue) watching\b",
    r"\bin the (next|previous) (section|lecture|video|part)\b",

    # Caption artefacts
    r"^\s*\[\s*(music|applause|laughter|silence|inaudible)\s*\]\s*$",
    r"^\s*\(\s*(music|applause|laughter|silence|inaudible)\s*\)\s*$",
)

FILLER_PATTERNS = tuple(re.compile(p, re.IGNORECASE) for p in _FILLER_SOURCES)

# Words that must never be picked as a quiz answer or offered as a distractor,
# merged into study_tools.STOPWORDS. These survive line-level filtering when a
# creator drops them mid-explanation ("so like, the video shows...").
FILLER_WORDS = {
    "subscribe", "subscribed", "subscribing", "subscription", "channel",
    "video", "videos", "tutorial", "lesson", "series", "episode", "guys",
    "everyone", "folks", "welcome", "hello", "hey", "comment", "comments",
    "share", "watching", "watch", "patreon", "sponsor", "sponsored", "merch",
    "discord", "notification", "bell", "icon", "today", "todays", "gonna",
    "wanna", "gotta", "okay", "alright", "basically", "actually", "literally",
    "really", "just", "know", "think", "going", "want", "let", "lets", "come",
    "back", "next", "thing", "things", "stuff", "guy", "yeah", "yep", "hmm",
    "please", "thanks", "thank",
}


def is_filler(text):
    """True if `text` reads as channel boilerplate rather than content."""
    if not text:
        return True
    return any(pattern.search(text) for pattern in FILLER_PATTERNS)


def strip_filler(text):
    """Drop boilerplate lines from a formatted transcript.

    TextFormatter emits one caption per line, so filtering line by line is
    precise — a "please subscribe" aside reliably occupies its own captions
    rather than being welded onto a sentence that teaches something.
    """
    if not text:
        return text

    kept = [line for line in text.splitlines() if not is_filler(line)]

    return "\n".join(kept)

# Leading narration clauses that wrap real content. Stripping the clause keeps
# the substance — "In this section we're going to look at the built-in primitive
# types in Python" carries a genuine topic, and dropping the whole sentence
# would lose it. Anchored to the start of the sentence only.
_PREAMBLE_SOURCES = (
    r"^(so|okay|alright|now|and|but)\b[,\s]*",
    r"^in (this|the next|today\'?s) (course|lecture|section|video|tutorial)[,\s]*",
    r"^(i\'?m|i am) going to (show you|teach you|walk you through)( how to| what| that)?[,\s]*",
    r"^(we\'?re|we are) going to (learn about|look at|talk about|cover|see|discuss)[,\s]*",
    r"^we will (learn about|look at|talk about|cover|discuss)[,\s]*",
    r"^let me show you( how to| what| that)?[,\s]*",
    r"^let\'?s (talk about|look at|start by|begin by)[,\s]*",
    r"^(here|this) is (how|what|where)[,\s]*",
    r"^you can see that[,\s]*",
    r"^(basically|essentially|actually)[,\s]*",
)

PREAMBLE_PATTERNS = tuple(
    re.compile(p, re.IGNORECASE) for p in _PREAMBLE_SOURCES
)

# A stripped sentence needs to retain real substance; below this it was all
# preamble and nothing worth keeping.
_MIN_REMAINDER_CHARS = 25


def strip_meta_preamble(sentence):
    """Remove leading narration from a sentence, keeping the content.

    Returns "" when nothing substantive survives, so the caller can drop the
    sentence entirely rather than keeping a fragment.
    """
    if not sentence:
        return ""

    text = sentence.strip()

    # Clauses stack ("So in this lecture I'm going to show you..."), so peel
    # repeatedly until nothing more matches.
    for _ in range(4):
        before = text
        for pattern in PREAMBLE_PATTERNS:
            text = pattern.sub("", text, count=1).lstrip()
        if text == before:
            break

    if len(text) < _MIN_REMAINDER_CHARS:
        return ""

    # Re-capitalize: the original capital usually left with the preamble.
    text = text[0].upper() + text[1:]

    if text and text[-1] not in ".!?":
        text += "."

    return text
