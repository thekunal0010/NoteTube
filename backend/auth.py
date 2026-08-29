from flask import Blueprint, request, jsonify
from functools import wraps
from db import users_collection, notes_collection
import bcrypt
import jwt
import datetime
import os
from dotenv import load_dotenv

load_dotenv()

auth = Blueprint("auth", __name__)

SECRET_KEY = os.getenv("JWT_SECRET")


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        token = None
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

        if not token:
            return jsonify({"message": "Authentication token is missing"}), 401

        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Session expired, please log in again"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Invalid authentication token"}), 401

        email = payload.get("email")
        if not email:
            return jsonify({"message": "Invalid authentication token"}), 401

        return f(email, *args, **kwargs)

    return decorated


# SIGNUP ROUTE
@auth.route("/signup", methods=["POST"])
def signup():

    data = request.json or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"message": "Name, email and password are required"}), 400

    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400

    existing_user = users_collection.find_one({
        "email": email
    })

    if existing_user:
        return jsonify({
            "message": "User already exists"
        }), 400

    hashed_password = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    )

    users_collection.insert_one({
        "name": name,
        "email": email,
        "password": hashed_password
    })

    return jsonify({
        "message": "Signup successful"
    })


# LOGIN ROUTE
@auth.route("/login", methods=["POST"])
def login():

    data = request.json or {}

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = users_collection.find_one({
        "email": email
    })

    if not user:
        return jsonify({
            "message": "User not found"
        }), 404

    password_correct = bcrypt.checkpw(
        password.encode("utf-8"),
        user["password"]
    )

    if not password_correct:
        return jsonify({
            "message": "Invalid password"
        }), 401

    token = jwt.encode({
        "email": user["email"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }, SECRET_KEY, algorithm="HS256")

    return jsonify({
        "token": token,
        "name": user["name"],
        "email": user["email"]
    })


# CURRENT USER PROFILE
@auth.route("/me", methods=["GET"])
@token_required
def me(current_user_email):
    user = users_collection.find_one({"email": current_user_email}, {"_id": 0, "password": 0})
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"user": user})


@auth.route("/profile", methods=["PUT"])
@token_required
def update_profile(current_user_email):
    data = request.json or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({"message": "Name is required"}), 400

    users_collection.update_one(
        {"email": current_user_email},
        {"$set": {"name": name}}
    )

    return jsonify({"message": "Profile updated", "name": name})


# FORGOT PASSWORD - issues a short-lived reset token.
# No email provider is configured for this project, so the reset link is
# returned directly in the response for local/dev use instead of emailed.
@auth.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.json or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"message": "Email is required"}), 400

    user = users_collection.find_one({"email": email})

    # Always respond with success to avoid leaking which emails are registered.
    if not user:
        return jsonify({"message": "If that account exists, a reset link has been generated"})

    reset_token = jwt.encode({
        "email": email,
        "purpose": "password_reset",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    }, SECRET_KEY, algorithm="HS256")

    return jsonify({
        "message": "If that account exists, a reset link has been generated",
        "resetToken": reset_token
    })


@auth.route("/account", methods=["DELETE"])
@token_required
def delete_account(current_user_email):
    notes_collection.delete_many({"email": current_user_email})
    users_collection.delete_one({"email": current_user_email})
    return jsonify({"message": "Account deleted"})


@auth.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.json or {}
    token = data.get("token")
    new_password = data.get("password") or ""

    if not token or not new_password:
        return jsonify({"message": "Token and new password are required"}), 400

    if len(new_password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return jsonify({"message": "Reset link expired, please request a new one"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"message": "Invalid or expired reset link"}), 401

    if payload.get("purpose") != "password_reset":
        return jsonify({"message": "Invalid reset link"}), 401

    email = payload.get("email")
    hashed_password = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())

    result = users_collection.update_one(
        {"email": email},
        {"$set": {"password": hashed_password}}
    )

    if result.matched_count == 0:
        return jsonify({"message": "User not found"}), 404

    return jsonify({"message": "Password reset successful"})
