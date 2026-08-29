"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { GenerationProgress } from "@/components/generation-progress"
import { Reveal, revealItem } from "@/components/motion/reveal"
import { motion } from "framer-motion"
import { Play, Sparkles, Link2, Brain, GraduationCap, ArrowRight, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { apiPost, apiGet } from "@/lib/api"
import { connectSocket, getSocket } from "@/lib/socket"

const steps = [
  {
    icon: Link2,
    title: "1. Paste a link",
    description: "Drop in any YouTube lecture URL",
  },
  {
    icon: Brain,
    title: "2. AI processes it",
    description: "Transcript is summarized in real time",
  },
  {
    icon: GraduationCap,
    title: "3. Study smarter",
    description: "Get notes, flashcards & MCQs instantly",
  },
]

interface RecentNote {
  id: string
  youtube_url: string
  summary: string | { overview: string; key_points: string[] }
  created_at?: string
}

export default function DashboardPage() {
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ stage: "", percent: 0 })
  const [name, setName] = useState("")
  const [recentNote, setRecentNote] = useState<RecentNote | null>(null)
  const router = useRouter()

  useEffect(() => {
    setName(localStorage.getItem("name") || "")

    apiGet("/notes")
      .then((data) => setRecentNote(data.notes?.[0] || null))
      .catch(() => {})

    const socket = getSocket()

    const onProgress = (data: { stage: string; percent: number }) => setProgress(data)

    socket.on("generation_progress", onProgress)
    return () => {
      socket.off("generation_progress", onProgress)
    }
  }, [])

  const handleGenerateNotes = async () => {
    if (!youtubeUrl.trim()) {
      toast.error("Paste a YouTube URL first")
      return
    }

    setLoading(true)
    setProgress({ stage: "Connecting...", percent: 0 })

    try {
      const socket = await connectSocket().catch(() => null)

      const data = await apiPost("/summary", {
        youtubeUrl,
        sid: socket?.id,
      })

      toast.success("Notes generated successfully")
      router.push(`/notes/${data.id}`)
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate notes")
    } finally {
      setLoading(false)
      setProgress({ stage: "", percent: 0 })
    }
  }

  const recentExcerpt = recentNote
    ? (typeof recentNote.summary === "string" ? recentNote.summary : recentNote.summary?.overview) || ""
    : ""

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto animate-fade-up">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="badge-pill mb-4 px-3 py-1 rounded-full text-xs font-medium text-primary inline-flex">
            <span className="pulse-dot" />
            Ready to generate
          </div>
          <h1 className="text-3xl font-serif-display font-semibold text-foreground mb-2 tracking-tight">
            Welcome back{name ? `, ${name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Transform your YouTube lectures into intelligent study materials
          </p>
        </div>

        {/* Generate Notes Card */}
        <div className="panel rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-primary/8 border border-primary/20 flex items-center justify-center">
              <Play className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-serif-display font-semibold text-foreground">
              Generate Notes from YouTube
            </h2>
          </div>

          {/* URL Input */}
          <input
            type="text"
            placeholder="Paste YouTube video URL here..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleGenerateNotes()}
            className="w-full px-4 py-4 rounded-xl bg-black/[0.02] border border-black/10 text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all mb-4 disabled:opacity-60"
          />

          {/* Generate Button */}
          <button
            onClick={handleGenerateNotes}
            disabled={loading}
            className="w-full gradient-button py-4 rounded-xl text-primary-foreground font-medium flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
          >
            <Sparkles className="w-5 h-5" />
            {loading ? "Generating Notes..." : "Generate Notes"}
          </button>

          {loading && <GenerationProgress stage={progress.stage} percent={progress.percent} />}
        </div>

        {/* Continue where you left off */}
        {recentNote && (
          <Link
            href={`/notes/${recentNote.id}`}
            className="panel panel-hover rounded-2xl p-5 mb-8 flex items-center gap-4 group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/8 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground mb-0.5">Continue where you left off</p>
              <p className="text-sm text-foreground/85 truncate">{recentExcerpt || recentNote.youtube_url}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </Link>
        )}

        {/* How it works */}
        <Reveal className="grid grid-cols-1 sm:grid-cols-3 gap-4" stagger={0.1}>
          {steps.map((step) => (
            <motion.div key={step.title} variants={revealItem} className="panel rounded-xl p-5">
              <div className="w-9 h-9 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center mb-3">
                <step.icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{step.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </Reveal>
      </div>
    </DashboardLayout>
  )
}
