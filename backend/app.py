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
from study_tools import (
    generate_flashcards,
    generate_mcqs,
    get_study_limits,
    group_into_paragraphs,
    select_key_points,
)

STUDY_MODES = {"comprehensive", "quick", "key_points"}

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


def _study_pool(note):
    """The uncapped sentence pool flashcards/MCQs are generated from, falling
    back to the (shorter) display summary for notes saved before this field existed."""
    return note.get("study_pool") or note.get("summary") or ""


def _stored_or_generate(note, field, generator, count):
    """Return a note's stored study kit, generating it only if absent.

    Cards are generated once at creation time now. Notes saved before that
    change have nothing stored, so they fall back to generating on the fly as
    they always did.
    """
    stored = note.get(field)
    if stored:
        return stored[:count]

    return generator(_study_pool(note), count=count)


def _limits_for(note):
    """Flashcard/MCQ min & max, pinned at creation time so tier changes later
    don't shift limits out from under an already-generated note. Notes saved
    before duration tracking existed default to the 5-10 min tier rather than
    being squeezed into the shortest one."""
    limits = note.get("study_limits")
    if limits and limits.get("flashcards") and limits.get("mcqs"):
        return limits
    return get_study_limits(note.get("duration_seconds") or 600)


@app.route('/')
def home():
    return "NoteTube Backend Running"


@app.route('/summary', methods=["POST"])
@token_required
def summary(current_user_email):
    data = request.json or {}
    youtube_url = (data.get("youtubeUrl") or "").strip()
    sid = data.get("sid")
    mode = data.get("mode") if data.get("mode") in STUDY_MODES else "comprehensive"

    if not youtube_url:
        return jsonify({"message": "Missing YouTube URL"}), 400

    def notify(stage, percent):
        if sid:
            socketio.emit("generation_progress", {"stage": stage, "percent": percent}, to=sid)

    try:
        notify("Fetching transcript...", 5)
        transcript_text, duration_seconds = get_transcript(youtube_url)

        if transcript_text.startswith("Transcript Error"):
            if sid:
                socketio.emit("generation_error", {"message": transcript_text}, to=sid)
            return jsonify({"message": transcript_text}), 400

        notify("Transcript ready. Summarizing...", 20)

        limits = get_study_limits(duration_seconds)

        def on_chunk(i, total):
            percent = 20 + int(60 * i / total)
            notify(f"Summarizing part {i}/{total}...", percent)

        overview, study_pool = generate_summary(
            transcript_text, max_chunks=limits["max_chunks"], progress_callback=on_chunk
        )

        # How much of the pool feeds the notes page scales with video length
        # too — capped at the tier's MCQ max rather than a flat 10, so a
        # 1-hour lecture actually reads as a full set of notes.
        #
        # Selected by informativeness rather than by position: a positional
        # slice took whatever the speaker happened to say first, which on a
        # tutorial is the intro and the course promo.
        notes_points_cap = limits["mcqs"]["max"]
        selected_pool = select_key_points(study_pool, notes_points_cap)

        if mode == "quick":
            # Flowing paragraphs instead of a bullet list — same amount of
            # underlying material, just read as prose rather than a scan list.
            structured_summary = {
                "mode": mode,
                "overview": overview,
                "paragraphs": group_into_paragraphs(selected_pool, size=5),
                "key_points": [],
            }
        elif mode == "key_points":
            structured_summary = {
                "mode": mode,
                "overview": "",
                "paragraphs": [],
                "key_points": selected_pool,
            }
        else:
            structured_summary = {
                "mode": mode,
                "overview": overview,
                "paragraphs": [],
                "key_points": selected_pool,
            }

        notify("Building your study kit...", 88)

        # Generate the tier's full set once and store it. The /flashcards and
        # /mcqs endpoints used to regenerate on every page load, which was free
        # with heuristics but is a multi-second model call now.
        all_flashcards = generate_flashcards(study_pool, count=limits["flashcards"]["max"])

        # MCQs are built from flashcards, so hand over the ones just made
        # rather than paying to generate the same cards a second time.
        all_mcqs = generate_mcqs(
            study_pool, count=limits["mcqs"]["max"], flashcards=all_flashcards
        )

        flashcards = all_flashcards[:limits["flashcards"]["min"]]
        mcqs = all_mcqs[:limits["mcqs"]["min"]]

        notify("Saving your notes...", 95)

        result = notes_collection.insert_one({
            "email": current_user_email,
            "youtube_url": youtube_url,
            "summary": structured_summary,
            "study_pool": study_pool,
            "flashcards": all_flashcards,
            "mcqs": all_mcqs,
            "duration_seconds": duration_seconds,
            "study_limits": {"flashcards": limits["flashcards"], "mcqs": limits["mcqs"]},
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

    limits = _limits_for(note)
    pool = _study_pool(note)
    flashcards = generate_flashcards(pool, count=limits["flashcards"]["min"])
    mcqs = generate_mcqs(pool, count=limits["mcqs"]["min"])

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

    limits = _limits_for(note)["flashcards"]
    flashcards = _stored_or_generate(
        note, "flashcards", generate_flashcards, limits["max"]
    )
    return jsonify({
        "flashcards": flashcards,
        "min": limits["min"],
        "max": limits["max"],
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

    limits = _limits_for(note)["mcqs"]
    mcqs = _stored_or_generate(note, "mcqs", generate_mcqs, limits["max"])
    return jsonify({
        "mcqs": mcqs,
        "min": limits["min"],
        "max": limits["max"],
        "source": note.get("youtube_url"),
        "noteId": str(note["_id"]),
    })


@socketio.on("connect")
def handle_connect():
    pass


if __name__ == '__main__':
    # The reloader is off by default. It forks a second process that re-imports
    # torch and reloads the ~3GB model on every file save, and it left orphaned
    # workers holding port 5000 whenever a parent died - which made the app look
    # broken while a stale process answered requests with old code.
    # Set NOTETUBE_RELOAD=1 while actively editing backend code.
    use_reloader = os.getenv("NOTETUBE_RELOAD") == "1"

    socketio.run(
        app,
        debug=use_reloader,
        use_reloader=use_reloader,
        host="0.0.0.0",
        port=5000,
    )
