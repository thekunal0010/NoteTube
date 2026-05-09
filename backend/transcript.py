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

        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        transcript = transcript_list.find_transcript(['en'])

        fetched_transcript = transcript.fetch()

        formatter = TextFormatter()

        text = formatter.format_transcript(fetched_transcript)

        return text

    except Exception as e:

        return f"Transcript Error: {str(e)}"