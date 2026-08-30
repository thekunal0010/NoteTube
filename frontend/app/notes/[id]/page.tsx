"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Reveal, revealItem } from "@/components/motion/reveal"
import { apiGet } from "@/lib/api"
import { toast } from "sonner"
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  FileText,
  CreditCard,
  ListChecks,
  ArrowRight,
} from "lucide-react"

interface Flashcard {
  id: number
  front: string
  back: string
}

interface MCQ {
  id: number
  question: string
  options: string[]
  answer: string
}

interface Note {
  id: string
  youtube_url: string
  summary: string | { overview: string; key_points: string[]; paragraphs?: string[]; mode?: string }
  created_at?: string
}

export default function NoteDetailPage() {
  const params = useParams<{ id: string }>()
  const [note, setNote] = useState<Note | null>(null)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [mcqs, setMcqs] = useState<MCQ[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await apiGet(`/notes/${params.id}`)
        setNote(data.note)
        setFlashcards(data.flashcards || [])
        setMcqs(data.mcqs || [])
      } catch (error: any) {
        if (error?.status === 404 || error?.status === 400) {
          setNotFound(true)
        } else {
          toast.error(error?.message || "Failed to load this study kit")
        }
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [params.id])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col justify-center items-center h-64 gap-3 text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          Loading your study kit...
        </div>
      </DashboardLayout>
    )
  }

  if (notFound || !note) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <h2 className="text-2xl font-serif-display font-semibold text-foreground mb-2">Study kit not found</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            This note may have been deleted, or the link is incorrect.
          </p>
          <Link href="/notes" className="gradient-button px-6 py-3 rounded-xl text-primary-foreground font-medium">
            Back to your notes
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const rawSummary: { overview?: string; key_points?: string[]; paragraphs?: string[]; mode?: string } =
    typeof note.summary === "string" ? { overview: note.summary } : note.summary || {}
  const summary = {
    mode: rawSummary.mode || "comprehensive",
    overview: rawSummary.overview || "",
    paragraphs: rawSummary.paragraphs || ([] as string[]),
    key_points: rawSummary.key_points || ([] as string[]),
  }

  const headline =
    summary.overview.split(/(?<=[.!?])\s+/)[0] ||
    summary.paragraphs[0]?.split(/(?<=[.!?])\s+/)[0] ||
    summary.key_points[0] ||
    "Study Kit"

  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl mx-auto animate-fade-up">
        {/* Header */}
        <Link href="/notes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to your notes
        </Link>

        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <a
            href={note.youtube_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors truncate max-w-full"
          >
            {note.youtube_url}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
          {note.created_at && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
              <Clock className="w-3 h-3" />
              {new Date(note.created_at).toLocaleString()}
            </span>
          )}
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-3">Study Kit</p>
        <h1 className="text-3xl font-serif-display font-semibold text-foreground mb-8 leading-snug">
          {headline}
        </h1>

        {/* Summary */}
        <div className="panel ruled-paper rounded-2xl p-8 mb-8 space-y-6">
          {summary.overview && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {summary.mode === "quick" ? "Summary" : "Overview"}
                </h2>
              </div>
              <p className="text-foreground/85 leading-relaxed text-[15px]">{summary.overview}</p>
            </div>
          )}

          {summary.paragraphs.length > 0 && (
            <div className="space-y-4">
              {summary.paragraphs.map((para, i) => (
                <p key={i} className="text-foreground/85 leading-relaxed text-[15px]">
                  {para}
                </p>
              ))}
            </div>
          )}

          {summary.key_points.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                {!summary.overview && <FileText className="w-4 h-4 text-primary" />}
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Key Points</h2>
              </div>
              <Reveal className="space-y-3" stagger={0.06}>
                {summary.key_points.map((point, i) => (
                  <motion.li
                    key={i}
                    variants={revealItem}
                    className="flex gap-3 text-foreground/80 leading-relaxed text-[15px] list-none"
                  >
                    <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    {point}
                  </motion.li>
                ))}
              </Reveal>
            </div>
          )}

          {!summary.overview && summary.paragraphs.length === 0 && summary.key_points.length === 0 && (
            <p className="text-foreground/85 leading-relaxed text-[15px]">No summary is available for this note.</p>
          )}
        </div>

        {/* Flashcards preview */}
        {flashcards.length > 0 && (
          <Reveal className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Flashcards &middot; {flashcards.length}
              </h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 mb-3">
              {flashcards.slice(0, 3).map((card) => (
                <div key={card.id} className="panel rounded-xl p-4 h-28 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">Q</span>
                  <p className="text-sm text-foreground/80 leading-snug line-clamp-3">{card.front}</p>
                </div>
              ))}
            </div>
            <Link
              href={`/flashcards?note=${note.id}`}
              className="panel panel-hover rounded-xl p-4 flex items-center justify-between group"
            >
              <span className="text-sm font-medium text-foreground">
                Study all {flashcards.length} flashcards
              </span>
              <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
            </Link>
          </Reveal>
        )}

        {/* MCQ preview */}
        {mcqs.length > 0 && (
          <Reveal className="mb-4">
            <div className="flex items-center gap-2 mb-4">
              <ListChecks className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Practice Quiz &middot; {mcqs.length} questions
              </h2>
            </div>
            <div className="panel rounded-xl p-5 mb-3">
              <p className="text-sm font-medium text-foreground mb-3">{mcqs[0].question}</p>
              <div className="grid grid-cols-2 gap-2">
                {mcqs[0].options.map((opt, i) => (
                  <div key={i} className="text-xs px-3 py-2 rounded-lg bg-black/[0.02] border border-black/5 text-foreground/60 truncate">
                    {opt}
                  </div>
                ))}
              </div>
            </div>
            <Link
              href={`/mcqs?note=${note.id}`}
              className="panel panel-hover rounded-xl p-4 flex items-center justify-between group"
            >
              <span className="text-sm font-medium text-foreground">
                Practice all {mcqs.length} questions
              </span>
              <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
            </Link>
          </Reveal>
        )}
      </div>
    </DashboardLayout>
  )
}
