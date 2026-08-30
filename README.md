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
- **Framework**: Flask, Flask-SocketIO (WebSocket progress updates), Flask-CORS, Flask-PyMongo
- **Database**: MongoDB (via PyMongo)
- **Auth**: PyJWT (JSON Web Tokens), bcrypt (password hashing)
- **Transcript extraction**: youtube-transcript-api, defusedxml
- **NLP / summarization**: Hugging Face `transformers`, `torch`, `tokenizers`, `sentencepiece`, `safetensors`, `huggingface_hub`, `numpy`, `sympy`, `networkx`
- **Realtime**: python-socketio, python-engineio, simple-websocket, wsproto
- **Utilities**: python-dotenv, requests, PyYAML, Werkzeug, Jinja2, itsdangerous, click, tqdm

**Frontend**
- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, tailwind-merge, tw-animate-css, class-variance-authority, clsx, autoprefixer, PostCSS
- **UI components**: Radix UI primitives (accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, popover, select, tabs, toast, tooltip, and more), shadcn-style component library, `lucide-react` icons, `cmdk` (command menu), `vaul` (drawers), `sonner` (toasts)
- **Forms & validation**: react-hook-form, @hookform/resolvers, zod
- **Data & charts**: recharts, date-fns, react-day-picker
- **Animation & interaction**: framer-motion, lenis (smooth scroll), embla-carousel-react, react-resizable-panels
- **Realtime**: socket.io-client (consumes backend progress events)
- **Other**: axios (HTTP client), next-themes (dark mode), @vercel/analytics

**Tooling**
- ESLint, TypeScript compiler
- pnpm / npm for package management
- Python venv for backend dependency isolation

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
