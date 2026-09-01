"""Tests for the Phase 4 production-hardening changes.

Covers the password-reset flow and the CORS/Socket.IO origin configuration.
No network calls, no database: the users collection is stubbed, so this runs
offline and touches neither MongoDB, Supadata nor Gemini.

Run:  python -m unittest test_hardening -v
"""

import datetime
import os
import sys
import types
import unittest
from unittest import mock

import bcrypt
import jwt

# db.py opens a MongoClient at import time, which resolves the Atlas SRV record
# over the network. Stub the module before importing anything that pulls it in,
# so these tests need no database and no connectivity.
if "db" not in sys.modules:
    _stub_db = types.ModuleType("db")
    _stub_db.users_collection = None
    _stub_db.notes_collection = None
    sys.modules["db"] = _stub_db

import auth


SECRET = auth.SECRET_KEY


def _hashed(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())


def _reset_token(email, password_hash, purpose="password_reset", minutes=15):
    return jwt.encode(
        {
            "email": email,
            "purpose": purpose,
            "pw": auth._password_fingerprint(password_hash),
            "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=minutes),
        },
        SECRET,
        algorithm="HS256",
    )


class _FakeUsers:
    """Minimal stand-in for the users collection."""

    def __init__(self, user):
        self.user = user
        self.updates = []

    def find_one(self, query, *a, **k):
        if self.user and query.get("email") == self.user["email"]:
            return self.user
        return None

    def update_one(self, query, update, *a, **k):
        self.updates.append((query, update))
        if self.user and query.get("email") == self.user["email"]:
            self.user["password"] = update["$set"]["password"]
            return mock.Mock(matched_count=1)
        return mock.Mock(matched_count=0)


class ForgotPasswordTests(unittest.TestCase):
    """The reset token must not leak through the API by default."""

    def setUp(self):
        self.password_hash = _hashed("OriginalPass1")
        self.users = _FakeUsers({"email": "a@b.c", "password": self.password_hash})
        p = mock.patch.object(auth, "users_collection", self.users)
        p.start()
        self.addCleanup(p.stop)

        self.app = __import__("flask").Flask(__name__)
        self.app.register_blueprint(auth.auth)
        self.client = self.app.test_client()

    def _post(self, path, payload):
        return self.client.post(path, json=payload)

    def test_token_is_not_returned_by_default(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("NOTETUBE_EXPOSE_RESET_TOKEN", None)
            res = self._post("/forgot-password", {"email": "a@b.c"})

        self.assertEqual(res.status_code, 200)
        self.assertNotIn("resetToken", res.get_json())

    def test_token_absent_even_when_flag_is_not_exactly_one(self):
        for value in ("0", "true", "yes", ""):
            with self.subTest(value=value):
                with mock.patch.dict(os.environ, {"NOTETUBE_EXPOSE_RESET_TOKEN": value}):
                    res = self._post("/forgot-password", {"email": "a@b.c"})
                self.assertNotIn("resetToken", res.get_json())

    def test_token_returned_only_when_explicitly_enabled(self):
        with mock.patch.dict(os.environ, {"NOTETUBE_EXPOSE_RESET_TOKEN": "1"}):
            res = self._post("/forgot-password", {"email": "a@b.c"})

        self.assertIn("resetToken", res.get_json())

    def test_response_does_not_reveal_whether_the_account_exists(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("NOTETUBE_EXPOSE_RESET_TOKEN", None)
            known = self._post("/forgot-password", {"email": "a@b.c"})
            unknown = self._post("/forgot-password", {"email": "nobody@b.c"})

        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.get_json(), unknown.get_json())


class ResetPasswordTests(unittest.TestCase):
    def setUp(self):
        self.password_hash = _hashed("OriginalPass1")
        self.users = _FakeUsers({"email": "a@b.c", "password": self.password_hash})
        p = mock.patch.object(auth, "users_collection", self.users)
        p.start()
        self.addCleanup(p.stop)

        self.app = __import__("flask").Flask(__name__)
        self.app.register_blueprint(auth.auth)
        self.client = self.app.test_client()

    def _reset(self, token, password="BrandNewPass1"):
        return self.client.post(
            "/reset-password", json={"token": token, "password": password}
        )

    def test_valid_token_resets_the_password(self):
        res = self._reset(_reset_token("a@b.c", self.password_hash))

        self.assertEqual(res.status_code, 200)
        self.assertTrue(
            bcrypt.checkpw(b"BrandNewPass1", self.users.user["password"])
        )

    def test_token_cannot_be_replayed(self):
        token = _reset_token("a@b.c", self.password_hash)

        first = self._reset(token, "FirstNewPass1")
        second = self._reset(token, "AttackerPass1")

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 401)
        self.assertIn("already been used", second.get_json()["message"])
        # The attacker's password must not have been applied.
        self.assertTrue(
            bcrypt.checkpw(b"FirstNewPass1", self.users.user["password"])
        )

    def test_token_issued_before_an_earlier_reset_is_rejected(self):
        stale = _reset_token("a@b.c", self.password_hash)
        self._reset(_reset_token("a@b.c", self.password_hash), "Intermediate1")

        res = self._reset(stale, "AttackerPass1")

        self.assertEqual(res.status_code, 401)

    def test_expired_token_is_rejected(self):
        token = _reset_token("a@b.c", self.password_hash, minutes=-1)
        res = self._reset(token)

        self.assertEqual(res.status_code, 401)
        self.assertIn("expired", res.get_json()["message"].lower())

    def test_token_with_wrong_purpose_is_rejected(self):
        token = _reset_token("a@b.c", self.password_hash, purpose="login")
        self.assertEqual(self._reset(token).status_code, 401)

    def test_token_signed_with_another_key_is_rejected(self):
        token = jwt.encode(
            {
                "email": "a@b.c",
                "purpose": "password_reset",
                "pw": auth._password_fingerprint(self.password_hash),
                "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=5),
            },
            "not-the-real-secret",
            algorithm="HS256",
        )
        self.assertEqual(self._reset(token).status_code, 401)

    def test_short_password_is_rejected(self):
        token = _reset_token("a@b.c", self.password_hash)
        res = self._reset(token, "abc")

        self.assertEqual(res.status_code, 400)


class AllowedOriginsTests(unittest.TestCase):
    """CORS / Socket.IO origins must not default to a wildcard."""

    def _origins(self, value=None):
        env = {} if value is None else {"NOTETUBE_ALLOWED_ORIGINS": value}
        with mock.patch.dict(os.environ, env, clear=False):
            if value is None:
                os.environ.pop("NOTETUBE_ALLOWED_ORIGINS", None)
            import app as app_module
            return app_module._allowed_origins()

    def test_default_is_local_only_not_wildcard(self):
        origins = self._origins(None)

        self.assertNotEqual(origins, "*")
        self.assertIn("http://localhost:3000", origins)
        self.assertIn("http://127.0.0.1:3000", origins)

    def test_comma_separated_list_is_parsed_and_trimmed(self):
        origins = self._origins(" https://a.example.com , https://b.example.com ")

        self.assertEqual(origins, ["https://a.example.com", "https://b.example.com"])

    def test_wildcard_requires_asking_for_it_explicitly(self):
        self.assertEqual(self._origins("*"), "*")

    def test_blank_value_falls_back_to_the_local_default(self):
        self.assertNotEqual(self._origins("   "), "*")

    def test_app_applies_the_configured_origins_to_socketio(self):
        import app as app_module

        self.assertEqual(
            app_module.socketio.server.eio.cors_allowed_origins,
            app_module._ALLOWED_ORIGINS,
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
