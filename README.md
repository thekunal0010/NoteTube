# NoteTube

Turn any YouTube video into study material. Paste a link and NoteTube pulls the transcript, summarizes it, and generates flashcards and MCQs you can use to study — with live progress updates while it works.

## Features

- **YouTube summarization** — fetches a video's transcript and generates a structured summary in one of three modes: comprehensive, quick (flowing paragraphs), or key points.
- **Flashcards & MCQs** — auto-generated from the video content, scaled to the video's length (longer videos get more cards/questions).
- **Notes library** — saved notes per user, viewable and deletable later.
- **Live progress** — generation status (fetching transcript, summarizing, building study kit) streamed to the frontend over WebSockets.
- **Auth** — email/password signup and login with JWT-based sessions.

## Tech Stack

**Backend**
- Flask + Flask-SocketIO (REST API + WebSocket progress updates)
- MongoDB (via PyMongo / Flask-PyMongo)
- JWT auth (PyJWT + bcrypt)
- `youtube-transcript-api` for transcript extraction
- Hugging Face `transformers` / `torch` for summarization

**Frontend**
- Next.js 16 (React 19, TypeScript)
- Tailwind CSS + Radix UI + shadcn-style components
- `socket.io-client` for live progress updates

## Project Structure

```
NoteTube/
├── backend/
│   ├── app.py            # Flask app & API routes
│   ├── auth.py           # Signup/login, JWT auth decorator
│   ├── db.py             # MongoDB connection
│   ├── transcript.py     # YouTube transcript fetching
│   ├── summarizer.py     # Summary generation
│   ├── study_tools.py    # Flashcard/MCQ generation, tier limits
│   └── requirements.txt
└── frontend/
    ├── app/               # Next.js app router pages
    ├── components/        # UI components
    ├── hooks/
    └── lib/
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+ and pnpm (or npm)
- A MongoDB instance (local or Atlas)

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

Run the server:

```bash
python app.py
```

The API runs at `http://localhost:5000`.

### Frontend Setup

```bash
cd frontend
pnpm install
pnpm dev
```

The app runs at `http://localhost:3000`.

## API Overview

| Method | Route | Description |
|---|---|---|
| POST | `/signup` | Create a new account |
| POST | `/login` | Log in and receive a JWT |
| POST | `/summary` | Submit a YouTube URL, generate summary + flashcards + MCQs |
| GET | `/notes` | List the current user's saved notes |
| GET | `/notes/<id>` | Get a specific note with flashcards/MCQs |
| DELETE | `/notes/<id>` | Delete a note |
| GET | `/flashcards?note=<id>` | Get flashcards for a note (or the latest note) |
| GET | `/mcqs?note=<id>` | Get MCQs for a note (or the latest note) |

All routes except `/signup` and `/login` require an `Authorization: Bearer <token>` header.
