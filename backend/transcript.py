from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import re

from text_filters import strip_filler


def extract_video_id(url):

    pattern = r"(?:v=|\/)([0-9A-Za-z_-]{11}).*"

    match = re.search(pattern, url)

    if match:
        return match.group(1)

    return None


def get_transcript(url):
    """Returns (text, duration_seconds) on success, or (error_message, 0) on failure.

    duration_seconds is derived from the last caption snippet's timestamp
    (start + duration) rather than a separate YouTube Data API call, since
    the transcript fetch already gives us that for free.
    """
    try:
        video_id = extract_video_id(url)
        if not video_id:
            return "Transcript Error: Could not find a valid YouTube video ID in that URL", 0

        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)

        transcript = None

        # Prefer an English transcript (manual, then auto-generated).
        try:
            transcript = transcript_list.find_transcript(["en", "en-US", "en-GB"])
        except Exception:
            pass

        # Fall back to any available transcript, translating to English when possible.
        if transcript is None:
            for candidate in transcript_list:
                transcript = candidate
                break

        if transcript is None:
            return "Transcript Error: No transcript is available for this video", 0

        if transcript.language_code not in ("en", "en-US", "en-GB") and transcript.is_translatable:
            try:
                transcript = transcript.translate("en")
            except Exception:
                pass

        fetched_transcript = transcript.fetch()
        formatter = TextFormatter()
        text = formatter.format_transcript(fetched_transcript)

        # Drop channel boilerplate (subscribe pitches, greetings, outros) before
        # anything downstream sees it. Otherwise the summarizer treats it as
        # course material and the quiz builds questions about the bell icon.
        # Checked after filtering so a video that is nothing but promo still
        # reports as empty rather than producing an empty summary.
        text = strip_filler(text)

        if not text or not text.strip():
            return "Transcript Error: The transcript for this video is empty", 0

        duration_seconds = 0.0
        if len(fetched_transcript) > 0:
            last_snippet = fetched_transcript[-1]
            duration_seconds = last_snippet.start + last_snippet.duration

        return text, duration_seconds

    except Exception as e:

        return f"Transcript Error: {str(e)}", 0
