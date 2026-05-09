from flask import Flask, request
from flask_cors import CORS
from transcript import get_transcript
from summarizer import generate_summary
from auth import auth
from db import notes_collection




app = Flask(__name__)
CORS(app)

app.register_blueprint(auth)

@app.route('/')
def home():
    return "NoteTube Backend Running"


@app.route('/test')
def test():

    url = "https://youtu.be/JMiz4wtZ1yc?si=2Sw3oGmRZyb20vkU"

    transcript = get_transcript(url)

    return transcript[:3000]


@app.route('/summary', methods=["POST"])
def summary():

    data = request.json

    youtube_url = data.get("youtubeUrl")
    email = data.get("email")

    summary = f"Dummy AI summary for: {youtube_url}"

    notes_collection.insert_one({
        "email": email,
        "youtube_url": youtube_url,
        "summary": summary
    })

    return summary


if __name__ == '__main__':
    app.run(debug=True)