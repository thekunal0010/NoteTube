# Production backend image.
#
# Ships requirements.txt only — no torch, no transformers, no CUDA. That stack
# is ~4.2GB, is pinned to a CUDA build, and could not run on a CPU instance
# anyway; production summarization goes through a hosted provider. See
# requirements-local.txt for the development environment.
#
# Build from the backend/ directory:
#   docker build -t notetube-backend .
#
# Run (secrets supplied at runtime, never baked in):
#   docker run -p 5000:5000 --env-file .env notetube-backend

FROM python:3.11-slim

# PYTHONUNBUFFERED so logs reach docker logs immediately rather than sitting in
# a buffer; PYTHONDONTWRITEBYTECODE so no .pyc files are written into a layer.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dependencies first, in their own layer: application code changes far more
# often than the dependency list, so this keeps the expensive step cached.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Non-root at runtime. Created after the install so site-packages stays
# root-owned and the application cannot modify its own dependencies.
RUN useradd --create-home --shell /usr/sbin/nologin appuser \
    && chown -R appuser:appuser /app
USER appuser

# Flask-SocketIO needs a co-operative worker for WebSocket; see wsgi.py.
ENV NOTETUBE_SOCKETIO_ASYNC_MODE=gevent

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:5000/', timeout=4).status == 200 else 1)"

# Exactly one worker: progress events are addressed to an in-memory Socket.IO
# sid, so a second worker would silently drop the events belonging to the other.
# Generation legitimately runs for minutes, hence the long timeout.
CMD ["gunicorn", \
     "-k", "geventwebsocket.gunicorn.workers.GeventWebSocketWorker", \
     "-w", "1", "-b", "0.0.0.0:5000", \
     "--timeout", "600", "--access-logfile", "-", "wsgi:app"]
