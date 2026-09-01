"""Production entry point.

    gunicorn -k geventwebsocket.gunicorn.workers.GeventWebSocketWorker \
        -w 1 -b 0.0.0.0:5000 wsgi:app

Flask-SocketIO needs a co-operative worker to serve the WebSocket transport;
gunicorn's sync and threaded workers can only manage HTTP long-polling. gevent
provides that (gunicorn 26 removed its eventlet worker), but it works by
replacing blocking stdlib calls with green-thread-aware ones, and anything
imported *before* the patch keeps the original blocking versions. So this module
patches first and imports the app second — importing app.py at the top of this
file would leave pymongo and requests blocking the whole worker on every call.

One worker, always. Generation progress is emitted to an in-memory Socket.IO
sid, so a second worker would hold its own disconnected set of sids and
silently drop the events belonging to the other one. Scaling out needs a
message queue (Redis) before it needs more workers.
"""

from gevent import monkey

monkey.patch_all()

from app import app, socketio  # noqa: E402  (must follow monkey_patch)

__all__ = ["app", "socketio"]
