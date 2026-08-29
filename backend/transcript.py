from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import re


def extract_video_id(url):

    pattern = r"(?:v=|\/)([0-9A-Za-z_-]{11}).*"

    match = re.search(pattern, url)

    if match:
        return match.group(1)

    return None


def get_transcript(url):
    try:
        video_id = extract_video_id(url)
        if not video_id:
            return "Transcript Error: Could not find a valid YouTube video ID in that URL"

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
            return "Transcript Error: No transcript is available for this video"

        if transcript.language_code not in ("en", "en-US", "en-GB") and transcript.is_translatable:
            try:
                transcript = transcript.translate("en")
            except Exception:
                pass

        fetched_transcript = transcript.fetch()
        formatter = TextFormatter()
        text = formatter.format_transcript(fetched_transcript)

        if not text or not text.strip():
            return "Transcript Error: The transcript for this video is empty"

        return text

    except Exception as e:

        return f"Transcript Error: {str(e)}"
