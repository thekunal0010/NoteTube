from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
from bson import ObjectId
from bson.errors import InvalidId
import datetime
import os
from dotenv import load_dotenv

from auth import auth, token_required
from db import notes_collection
from summarizer import generate_summary
from transcript import get_transcript
from study_tools import generate_flashcards, generate_mcqs

load_dotenv()

app = Flask(__name__)
CORS(app)
app.register_blueprint(auth)

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")


def _serialize_note(note):
    note["id"] = str(note.pop("_id"))
    if note.get("created_at"):
        note["created_at"] = note["created_at"].isoformat()
    return note


def _find_note(current_user_email, note_id=None):
    """Fetch a specific note by id, or the most recent note if no id is given."""
    if note_id:
        try:
            object_id = ObjectId(note_id)
        except (InvalidId, TypeError):
            return "invalid"
        return notes_collection.find_one({"_id": object_id, "email": current_user_email})

    return notes_collection.find_one({"email": current_user_email}, sort=[("_id", -1)])


@app.route('/')
def home():
    return "NoteTube Backend Running"


@app.route('/summary', methods=["POST"])
@token_required
def summary(current_user_email):
    data = request.json or {}
    youtube_url = (data.get("youtubeUrl") or "").strip()
    sid = data.get("sid")

    if not youtube_url:
        return jsonify({"message": "Missing YouTube URL"}), 400

    def notify(stage, percent):
        if sid:
            socketio.emit("generation_progress", {"stage": stage, "percent": percent}, to=sid)

    try:
        notify("Fetching transcript...", 5)
        transcript_text = get_transcript(youtube_url)

        if transcript_text.startswith("Transcript Error"):
            if sid:
                socketio.emit("generation_error", {"message": transcript_text}, to=sid)
            return jsonify({"message": transcript_text}), 400

        notify("Transcript ready. Summarizing...", 20)

        def on_chunk(i, total):
            percent = 20 + int(60 * i / total)
            notify(f"Summarizing part {i}/{total}...", percent)

        structured_summary = generate_summary(transcript_text, progress_callback=on_chunk)

        notify("Building your study kit...", 88)

        flashcards = generate_flashcards(structured_summary)
        mcqs = generate_mcqs(structured_summary)

        notify("Saving your notes...", 95)

        result = notes_collection.insert_one({
            "email": current_user_email,
            "youtube_url": youtube_url,
            "summary": structured_summary,
            "created_at": datetime.datetime.utcnow(),
        })

        note_id = str(result.inserted_id)

        notify("Done!", 100)
        if sid:
            socketio.emit("generation_complete", {"id": note_id}, to=sid)

        return jsonify({
            "summary": structured_summary,
            "flashcards": flashcards,
            "mcqs": mcqs,
            "message": "Summary generated",
            "id": note_id,
        })
    except Exception as e:
        if sid:
            socketio.emit("generation_error", {"message": str(e)}, to=sid)
        return jsonify({"message": str(e)}), 500


@app.route('/notes', methods=["GET"])
@token_required
def get_notes(current_user_email):
    notes = list(
        notes_collection.find({"email": current_user_email}).sort("_id", -1)
    )
    notes = [_serialize_note(note) for note in notes]

    return jsonify({"notes": notes})


@app.route('/notes/<note_id>', methods=["GET"])
@token_required
def get_note_detail(current_user_email, note_id):
    note = _find_note(current_user_email, note_id)

    if note == "invalid":
        return jsonify({"message": "Invalid note id"}), 400
    if not note:
        return jsonify({"message": "Note not found"}), 404

    summary_data = note.get("summary", "")
    flashcards = generate_flashcards(summary_data)
    mcqs = generate_mcqs(summary_data)

    return jsonify({
        "note": _serialize_note(note),
        "flashcards": flashcards,
        "mcqs": mcqs,
    })


@app.route('/notes/<note_id>', methods=["DELETE"])
@token_required
def delete_note(current_user_email, note_id):
    try:
        object_id = ObjectId(note_id)
    except (InvalidId, TypeError):
        return jsonify({"message": "Invalid note id"}), 400

    result = notes_collection.delete_one({
        "_id": object_id,
        "email": current_user_email,
    })

    if result.deleted_count == 0:
        return jsonify({"message": "Note not found"}), 404

    return jsonify({"message": "Note deleted"})


@app.route('/flashcards', methods=["GET"])
@token_required
def get_flashcards(current_user_email):
    note = _find_note(current_user_email, request.args.get("note"))

    if note == "invalid":
        return jsonify({"message": "Invalid note id"}), 400
    if not note:
        return jsonify({"flashcards": []})

    flashcards = generate_flashcards(note.get("summary", ""))
    return jsonify({
        "flashcards": flashcards,
        "source": note.get("youtube_url"),
        "noteId": str(note["_id"]),
    })


@app.route('/mcqs', methods=["GET"])
@token_required
def get_mcqs(current_user_email):
    note = _find_note(current_user_email, request.args.get("note"))

    if note == "invalid":
        return jsonify({"message": "Invalid note id"}), 400
    if not note:
        return jsonify({"mcqs": []})

    mcqs = generate_mcqs(note.get("summary", ""))
    return jsonify({
        "mcqs": mcqs,
        "source": note.get("youtube_url"),
        "noteId": str(note["_id"]),
    })


@socketio.on("connect")
def handle_connect():
    pass


if __name__ == '__main__':
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)
