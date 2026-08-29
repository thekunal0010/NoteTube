"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { EmptyState } from "@/components/empty-state"
import { Reveal, revealItem } from "@/components/motion/reveal"
import { motion } from "framer-motion"
import { apiGet } from "@/lib/api"
import { toast } from "sonner"
import { Clock, ArrowRight } from "lucide-react"

interface Note {
  id: string
  youtube_url: string
  summary: string | { overview: string; key_points: string[] }
  created_at?: string
}

function excerptOf(note: Note) {
  if (typeof note.summary === "string") return note.summary
  return note.summary?.overview || ""
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const data = await apiGet("/notes")
        setNotes(data.notes || [])
      } catch (error: any) {
        toast.error(error?.message || "Failed to load notes")
      } finally {
        setLoading(false)
      }
    }
    fetchNotes()
  }, [])

  return (
    <DashboardLayout>
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 gap-3 text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          Loading notes...
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          title="No Notes Available"
          description="Generate notes from a YouTube video first."
          actionLabel="Go to Dashboard"
          actionHref="/dashboard"
        />
      ) : (
        <div className="p-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-2">Library</p>
              <h1 className="text-3xl font-serif-display font-semibold text-foreground tracking-tight">Your Notes</h1>
            </div>
            <span className="badge-pill px-3 py-1 rounded-full text-xs font-medium text-primary">
              {notes.length} {notes.length === 1 ? "study kit" : "study kits"}
            </span>
          </div>
          <Reveal className="grid sm:grid-cols-2 gap-5" stagger={0.08}>
            {notes.map((note) => (
              <motion.div key={note.id} variants={revealItem}>
                <Link
                  href={`/notes/${note.id}`}
                  className="panel panel-hover rounded-2xl p-6 flex flex-col h-full group"
                >
                  {note.created_at && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <Clock className="w-3 h-3" />
                      {new Date(note.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  <p className="text-foreground/80 leading-relaxed line-clamp-4 mb-4 flex-1">
                    {excerptOf(note) || "No summary available."}
                  </p>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
                    Open study kit
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </Reveal>
        </div>
      )}
    </DashboardLayout>
  )
}
