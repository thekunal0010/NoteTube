from flask import Blueprint, request, jsonify
from db import users_collection
import bcrypt
import jwt
import datetime
import os
from dotenv import load_dotenv

load_dotenv()

auth = Blueprint("auth", __name__)

SECRET_KEY = os.getenv("JWT_SECRET")


# SIGNUP ROUTE
@auth.route("/signup", methods=["POST"])
def signup():

    data = request.json

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

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

    data = request.json

    email = data.get("email")
    password = data.get("password")

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