"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { apiPost, apiGet } from "@/lib/api"
import { connectSocket } from "@/lib/socket"
import { STUDY_MODES, getStoredStudyMode, setStoredStudyMode, type StudyMode } from "@/lib/study-mode"
import { GenerationProgress } from "@/components/generation-progress"
import { HeroPreview } from "@/components/hero-preview"
import { LegalDialog } from "@/components/legal-dialog"
import { Reveal, revealItem } from "@/components/motion/reveal"
import { Counter } from "@/components/motion/counter"
import { Marquee } from "@/components/motion/marquee"
import { Magnetic } from "@/components/motion/magnetic"
import { HorizontalScroll } from "@/components/motion/horizontal-scroll"
import {
  Sparkles,
  Play,
  FileText,
  CreditCard,
  ListChecks,
  BookOpen,
  Download,
  ArrowRight,
  Menu,
  X,
  Zap,
  Video,
  Users,
  Layers,
  LayoutDashboard,
  LogOut,
} from "lucide-react"

const features = [
  {
    icon: FileText,
    title: "Notes worth keeping",
    description: "A clear overview plus organized key points — not a one-paragraph blur. Structured the way you'd actually write it.",
  },
  {
    icon: CreditCard,
    title: "Flashcards",
    description: "Auto-generated from the real material, ready for spaced-repetition review.",
  },
  {
    icon: ListChecks,
    title: "A quiz to prove it",
    description: "Practice questions pulled straight from the lecture, with instant feedback.",
  },
  {
    icon: BookOpen,
    title: "One connected kit",
    description: "Notes, flashcards, and quiz for a video live together — no hunting across tabs.",
  },
  {
    icon: Download,
    title: "Export & revisit",
    description: "Download your materials and pick up exactly where you left off.",
  },
]

const trendingLectures = [
  { title: "Machine Learning Basics", category: "AI/ML" },
  { title: "ReactJS Tutorial", category: "Web Dev" },
  { title: "Operating Systems", category: "CS Core" },
  { title: "Data Structures", category: "DSA" },
  { title: "DBMS Lecture", category: "Database" },
]

const stats = [
  { value: 50, suffix: "K+", label: "Notes Generated", icon: FileText },
  { value: 10, suffix: "K+", label: "Videos Processed", icon: Video },
  { value: 100, suffix: "K+", label: "Flashcards Created", icon: Layers },
  { value: 25, suffix: "K+", label: "Active Students", icon: Users },
]

interface RecentNote {
  id: string
  youtube_url: string
  summary: string | { overview: string; key_points: string[] }
}

function excerptOf(note: RecentNote) {
  const text = typeof note.summary === "string" ? note.summary : note.summary?.overview
  if (!text) return note.youtube_url
  return text.length > 60 ? `${text.slice(0, 60)}…` : text
}

export default function LandingPage() {
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ stage: "", percent: 0 })
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([])
  const [legalDoc, setLegalDoc] = useState<"privacy" | "terms" | null>(null)
  const [studyMode, setStudyMode] = useState<StudyMode>("comprehensive")

  useEffect(() => {
    setStudyMode(getStoredStudyMode())

    const token = localStorage.getItem("token")
    if (!token) return

    setIsLoggedIn(true)
    apiGet("/notes")
      .then((data) => setRecentNotes((data.notes || []).slice(0, 8)))
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("name")
    localStorage.removeItem("email")
    setIsLoggedIn(false)
    setRecentNotes([])
    toast.success("Logged out")
  }

  const handleGenerateNotes = async () => {

    if (!youtubeUrl.trim()) {
      toast.error("Paste a YouTube URL first")
      return
    }

    const token = localStorage.getItem("token")

    if (!token) {
      toast.error("Please login first")
      router.push("/login")
      return
    }

    setLoading(true)
    setProgress({ stage: "Connecting...", percent: 0 })

    try {
      const socket = await connectSocket().catch(() => null)

      socket?.on("generation_progress", setProgress)

      const data = await apiPost("/summary", { youtubeUrl, sid: socket?.id, mode: studyMode })

      toast.success("Notes generated successfully")
      router.push(`/notes/${data.id}`)

      socket?.off("generation_progress", setProgress)
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate notes")
    } finally {
      setLoading(false)
      setProgress({ stage: "", percent: 0 })
    }

  }

  return (
    <div className="min-h-screen relative overflow-x-clip">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="NoteTube AI" className="w-8 h-8 object-contain" />
              <span className="text-lg font-serif-display font-semibold tracking-tight text-foreground">NoteTube AI</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                How it works
              </Link>
              <Link href="#about" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                About
              </Link>
              {isLoggedIn ? (
                <>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-destructive transition-colors text-sm"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Logout
                  </button>
                  <Magnetic strength={0.25}>
                    <Link
                      href="/dashboard"
                      className="gradient-button px-4 py-2 rounded-lg text-primary-foreground text-sm font-medium inline-flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      Dashboard
                    </Link>
                  </Magnetic>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    Login
                  </Link>
                  <Magnetic strength={0.25}>
                    <Link
                      href="/signup"
                      className="gradient-button px-4 py-2 rounded-lg text-primary-foreground text-sm font-medium inline-block"
                    >
                      Start free
                    </Link>
                  </Magnetic>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden panel border-t">
            <div className="px-4 py-4 space-y-3">
              <Link href="#features" className="block text-muted-foreground hover:text-foreground">
                How it works
              </Link>
              <Link href="#about" className="block text-muted-foreground hover:text-foreground">
                About
              </Link>
              {isLoggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className="block gradient-button px-4 py-2 rounded-lg text-primary-foreground text-sm font-medium text-center"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="block text-muted-foreground hover:text-foreground">
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="block gradient-button px-4 py-2 rounded-lg text-primary-foreground text-sm font-medium text-center"
                  >
                    Start free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-5">
              Study companion &middot; no dark mode required
            </p>

            <h1 className="text-4xl md:text-6xl font-serif-display font-semibold text-foreground mb-6 leading-[1.1] tracking-tight">
              Your lectures,{" "}
              <span className="italic text-gradient">rewritten</span>{" "}
              as notes worth keeping.
            </h1>
            <p className="text-lg text-foreground/70 mb-8 max-w-lg text-balance">
              Paste a YouTube lecture. NoteTube AI reads it end to end and hands back notes
              you&apos;d have written yourself — plus flashcards and a quiz to prove you know it.
            </p>

            {/* YouTube URL Input */}
            <div className="max-w-xl panel rounded-2xl p-5 text-left mb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={loading}
                  onKeyDown={(e) => e.key === "Enter" && !loading && handleGenerateNotes()}
                  className="flex-1 px-4 py-3 rounded-xl bg-black/[0.02] border border-black/10 text-foreground placeholder-muted-foreground/70 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all disabled:opacity-60"
                />
                <button
                  onClick={handleGenerateNotes}
                  disabled={loading}
                  className="gradient-button px-6 py-3 rounded-xl text-primary-foreground font-medium flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-70"
                >
                  <Sparkles className="w-4 h-4" />
                  {loading ? "Generating..." : "Generate notes"}
                </button>
              </div>

              {/* Summary style */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-xs text-muted-foreground mr-0.5">Summary style:</span>
                {STUDY_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    title={m.description}
                    disabled={loading}
                    onClick={() => {
                      setStudyMode(m.value)
                      setStoredStudyMode(m.value)
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all disabled:opacity-60 ${
                      studyMode === m.value
                        ? "bg-primary/12 border-primary/40 text-foreground"
                        : "bg-black/[0.02] border-black/10 text-muted-foreground hover:bg-black/[0.04] hover:border-black/20"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {loading && <GenerationProgress stage={progress.stage} percent={progress.percent} />}
            </div>
            <p className="text-xs text-muted-foreground">Free for your first three lectures. No card required.</p>
          </motion.div>

          <div className="hidden lg:block">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* Recent searches (logged in) or trending lectures (logged out) — infinite marquee */}
      <Reveal as="section" className="relative py-14 border-y border-border">
        <div className="flex items-center justify-center gap-2 mb-8 px-4">
          <Zap className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {isLoggedIn && recentNotes.length > 0 ? "Your Recent Searches" : "Trending Lectures"}
          </h2>
        </div>

        {isLoggedIn && recentNotes.length > 0 ? (
          <>
            <Marquee>
              {recentNotes.map((note) => (
                <Link
                  key={note.id}
                  href={`/notes/${note.id}`}
                  className="px-4 py-2 rounded-full panel panel-hover text-foreground/80 text-sm whitespace-nowrap inline-block"
                >
                  {excerptOf(note)}
                </Link>
              ))}
            </Marquee>
            <p className="text-center mt-6">
              <Link href="/history" className="text-sm text-primary hover:text-primary/80 transition-colors">
                View full history &rarr;
              </Link>
            </p>
          </>
        ) : isLoggedIn ? (
          <p className="text-center text-sm text-muted-foreground px-4">
            You haven&apos;t generated any notes yet — paste a link above to get started.
          </p>
        ) : (
          <Marquee>
            {trendingLectures.map((lecture) => (
              <span
                key={lecture.title}
                className="px-4 py-2 rounded-full panel text-foreground/80 text-sm whitespace-nowrap"
              >
                {lecture.title}
                <span className="ml-2 text-xs text-primary">{lecture.category}</span>
              </span>
            ))}
          </Marquee>
        )}
      </Reveal>

      {/* Features — pinned horizontal scroll */}
      <div id="features" className="relative">
        <Reveal className="max-w-3xl mx-auto text-center px-4 pt-16 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-4">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-serif-display font-semibold text-foreground mb-4 tracking-tight">
            Three artefacts from one link
          </h2>
          <p className="text-foreground/60">
            One pipeline turns a lecture into a full study kit. Keep scrolling to see how.
          </p>
        </Reveal>

        <HorizontalScroll itemCount={features.length}>
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="panel panel-hover rounded-2xl p-8 w-[340px] sm:w-[380px] h-[380px] flex-shrink-0 flex flex-col justify-between relative overflow-hidden"
            >
              <span className="absolute top-6 right-7 font-serif-display text-5xl font-semibold text-primary/[0.07] select-none">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-serif-display font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-foreground/65 leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </HorizontalScroll>
      </div>

      {/* Stats Section */}
      <Reveal as="section" className="relative py-16 px-4" stagger={0.1}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <motion.div key={stat.label} variants={revealItem} className="panel rounded-2xl p-6 text-center">
                <stat.icon className="w-5 h-5 text-primary mx-auto mb-3" />
                <p className="text-3xl md:text-4xl font-serif-display font-semibold text-foreground mb-1">
                  <Counter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* CTA Section */}
      <Reveal as="section" id="about" className="relative py-24 px-4">
        <div className="relative max-w-3xl mx-auto text-center panel rounded-3xl p-12 ruled-paper">
          <h2 className="text-3xl font-serif-display font-semibold text-foreground mb-4 tracking-tight">
            Ready to <span className="italic text-gradient">transform</span> your learning?
          </h2>
          <p className="text-foreground/65 mb-8">
            Join thousands of students using NoteTube AI to study more effectively.
          </p>
          <Magnetic>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 gradient-button px-8 py-4 rounded-xl text-primary-foreground font-medium"
            >
              Get started for free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Magnetic>
        </div>
      </Reveal>

      {/* Footer */}
      <footer className="relative border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="NoteTube AI" className="w-6 h-6 object-contain" />
            <span className="text-sm text-muted-foreground">
              NoteTube AI &mdash; Transform lectures into knowledge
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => setLegalDoc("privacy")}
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => setLegalDoc("terms")}
              className="hover:text-foreground transition-colors"
            >
              Terms
            </button>
            <Link href="#" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>

      <LegalDialog type={legalDoc} onOpenChange={(open) => !open && setLegalDoc(null)} />
    </div>
  )
}
