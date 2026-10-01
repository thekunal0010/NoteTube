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
import { CTA4 } from "@/components/cta-4"
import { Navigation3 } from "@/components/navigation-3"
import AccordionGallery, { type AccordionGalleryItem } from "@/components/AccordionGallery"
import { Footer7 } from "@/components/footer-7"
import { Stats10 } from "@/components/stats-10"
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

const howItWorksItems: AccordionGalleryItem[] = [
  {
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    step: "01",
    label: "Paste Lecture Link",
    description: "Provide any YouTube video URL. NoteTube extracts the full transcript and prepares the learning pipeline.",
  },
  {
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
    step: "02",
    label: "Notes Worth Keeping",
    description: "A clear overview plus organized key points — not a one-paragraph blur. Structured the way you'd actually write it.",
  },
  {
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
    step: "03",
    label: "Active Flashcards",
    description: "Auto-generated from the real material, ready for spaced-repetition review.",
  },
  {
    image: "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=1200&q=80",
    step: "04",
    label: "A Quiz to Prove It",
    description: "Practice questions pulled straight from the lecture, with instant feedback and score tracking.",
  },
  {
    image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80",
    step: "05",
    label: "One Connected Kit",
    description: "Notes, flashcards, and quizzes live together in your personal library for effortless revision.",
  },
]

const trendingLectures = [
  { title: "Machine Learning Basics", category: "AI/ML" },
  { title: "ReactJS Tutorial", category: "Web Dev" },
  { title: "Operating Systems", category: "CS Core" },
  { title: "Data Structures", category: "DSA" },
  { title: "DBMS Lecture", category: "Database" },
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

  const navLinks = isLoggedIn
    ? [
        { label: "Home", href: "/" },
        { label: "How It Works", href: "#features" },
        { label: "History", href: "/history" },
        { label: "About", href: "#about" },
      ]
    : [
        { label: "Home", href: "/" },
        { label: "How It Works", href: "#features" },
        { label: "Trending", href: "#recent-searches" },
        { label: "About", href: "#about" },
      ]

  return (
    <div className="min-h-screen relative overflow-x-clip">
      {/* Navigation 3 from React Bits Pro: Logo left, grouped center links, auth right with mobile menu */}
      <Navigation3
        logo={{
          src: "/logo.png",
          alt: "NoteTube AI",
          title: "NoteTube AI",
          href: "/",
        }}
        links={navLinks}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        loginHref="/login"
        signupHref="/signup"
        dashboardHref="/dashboard"
      />

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* CSS animation rather than framer-motion: this is the only
              above-the-fold content, and a JS/rAF-driven fade leaves it stuck
              part-way whenever the main thread stalls or the tab is throttled,
              which reads as a blank page. A CSS animation runs on the
              compositor and its `both` fill mode always ends fully visible. */}
          <div className="animate-fade-up">
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
          </div>

          <div className="hidden lg:block">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* Recent searches (logged in) or trending lectures (logged out) — CTA 4 block with infinitely scrolling cards */}
      <div id="recent-searches">
        <Reveal as="div" className="relative">
        <CTA4
          badge={isLoggedIn && recentNotes.length > 0 ? "Your Study Repository" : "Recent Searches & Trending"}
          title={
            isLoggedIn && recentNotes.length > 0 ? (
              <>
                Your lectures, <span className="italic text-gradient">ready to review</span>
              </>
            ) : (
              <>
                Summarize any lecture in <span className="italic text-gradient">seconds</span>
              </>
            )
          }
          description={
            isLoggedIn && recentNotes.length > 0
              ? "Revisit your generated study kits with structured notes, active-recall flashcards, and quizzes, or start fresh with a new lecture above."
              : "Explore recently transformed lectures below. Click any card to load the topic, or paste your own YouTube link above to create an instant study kit."
          }
          actionText={isLoggedIn ? "Open Dashboard" : "Start learning free"}
          actionHref={isLoggedIn ? "/dashboard" : "/signup"}
          secondaryActionText={isLoggedIn ? "View full history" : undefined}
          secondaryActionHref="/history"
          recentNotes={recentNotes}
          isLoggedIn={isLoggedIn}
          onSelectLecture={(url) => {
            setYoutubeUrl(url)
            window.scrollTo({ top: 0, behavior: "smooth" })
            toast.info("Lecture URL loaded into generator")
          }}
        />
      </Reveal>
    </div>

      {/* Features — AccordionGallery from React Bits */}
      <section id="features" className="relative py-20 px-4 max-w-6xl mx-auto">
        <Reveal className="max-w-3xl mx-auto text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-3">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-serif-display font-semibold text-foreground mb-4 tracking-tight">
            Three artefacts from <span className="italic text-gradient">one link</span>
          </h2>
          <p className="text-foreground/70 max-w-xl mx-auto">
            One automated pipeline turns any lecture into a full study kit. Hover or tap across each step to explore.
          </p>
        </Reveal>

        <Reveal>
          <div className="p-2.5 sm:p-3.5 rounded-[24px] bg-card/60 border border-border/80 shadow-sm backdrop-blur-sm">
            <AccordionGallery
              items={howItWorksItems}
              defaultIndex={1}
              expandRatio={0.46}
              trigger="hover"
              accentColor="#bd5b2c"
              overlayColor="#2a241c"
              textColor="#fffdf8"
              height={460}
              radius={16}
              gap={10}
              grayscale={true}
            />
          </div>
        </Reveal>
      </section>

      {/* Stats 10 from React Bits Pro: Color-blocked stat cards with count-up numbers and supporting labels */}
      <Stats10
        badge="Proven Study Impact"
        title={
          <>
            Built for students <br className="hidden sm:inline" />
            who study <span className="font-serif italic font-normal text-primary">relentlessly</span>
          </>
        }
        description="Transforming passive YouTube lectures into active, high-yield academic retention across thousands of universities."
        stats={[
          {
            value: 50,
            suffix: "K+",
            label: "Notes generated across college courses",
            sublabel: "98% conceptual accuracy",
            bgColor: "#fffdf8",
            textColor: "#2a241c",
            borderColor: "#e2d6bd",
          },
          {
            value: 10,
            suffix: "K+",
            label: "Lecture videos distilled into concise study kits",
            sublabel: "3.5x average study speedup",
            bgColor: "#1e1813",
            textColor: "#fdf6ec",
            borderColor: "#382d23",
          },
          {
            value: 100,
            suffix: "K+",
            label: "Active-recall flashcards & quiz questions created",
            sublabel: "Spaced-repetition ready",
            bgColor: "#bd5b2c",
            textColor: "#fffdf8",
            borderColor: "#a6491e",
          },
          {
            value: 25,
            suffix: "K+",
            label: "Active students studying with NoteTube AI",
            sublabel: "Across 140+ institutions",
            bgColor: "#ede1c8",
            textColor: "#2a241c",
            borderColor: "#dcceb0",
          },
        ]}
      />

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

      {/* Footer 7 from React Bits Pro: Minimal footer with circular logo badge, link columns, and pill newsletter form */}
      <Footer7
        logo={{
          src: "/logo.png",
          alt: "NoteTube AI",
          title: "NoteTube AI",
          href: "/",
        }}
        tagline="Transform hours of YouTube lectures into structured notes, spaced-repetition flashcards, and instant self-testing quizzes."
        onPrivacyClick={() => setLegalDoc("privacy")}
        onTermsClick={() => setLegalDoc("terms")}
      />

      <LegalDialog type={legalDoc} onOpenChange={(open) => !open && setLegalDoc(null)} />
    </div>
  )
}
