"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Search, Play, FileText, Clock, Trash2, Loader2, Video, Layers, ListChecks } from "lucide-react"
import { apiGet, apiDelete } from "@/lib/api"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Reveal, revealItem } from "@/components/motion/reveal"
import { Counter } from "@/components/motion/counter"

interface Note {
  id: string
  youtube_url: string
  summary: string | { overview: string; key_points: string[] }
  created_at?: string
}

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [history, setHistory] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const data = await apiGet("/notes")
      setHistory(data.notes || [])
    } catch (error: any) {
      toast.error(error?.message || "Failed to load history")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await apiDelete(`/notes/${id}`)
      setHistory((prev) => prev.filter((note) => note.id !== id))
      toast.success("Deleted")
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete")
    } finally {
      setDeletingId(null)
    }
  }

  const filteredVideos = history.filter((video) =>
    video.youtube_url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = [
    { label: "Total Videos", value: history.length, icon: Video },
    { label: "Notes Generated", value: history.length, icon: FileText },
    { label: "Flashcards Created", value: history.length * 8, icon: Layers },
    { label: "MCQs Generated", value: history.length * 5, icon: ListChecks },
  ]

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto animate-fade-up">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-2">Archive</p>
          <h1 className="text-3xl font-serif-display font-semibold text-foreground mb-2 tracking-tight">History</h1>
          <p className="text-muted-foreground">
            View and manage your previously generated study materials
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search YouTube URLs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-xl bg-black/[0.02] border border-black/10 text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
          />
        </div>

        {/* Stats Cards */}
        <Reveal className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" stagger={0.08}>
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={revealItem} className="panel rounded-xl p-4">
              <stat.icon className="w-4 h-4 text-primary mb-2" />
              <p className="text-3xl font-serif-display font-semibold text-foreground">
                <Counter value={stat.value} />
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </Reveal>

        {/* Video List */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-40 gap-3 text-muted-foreground">
            <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            Loading history...
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVideos.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No history found.</p>
            ) : (
              <AnimatePresence initial={false}>
                {filteredVideos.map((video) => (
                  <motion.div
                    key={video.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="panel panel-hover rounded-xl p-4 flex items-center gap-4"
                  >
                    <Link href={`/notes/${video.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-28 h-20 rounded-lg bg-primary/8 border border-primary/10 flex items-center justify-center flex-shrink-0">
                        <Play className="w-8 h-8 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium mb-1 truncate">
                          {video.youtube_url}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {video.created_at ? new Date(video.created_at).toLocaleString() : "Recently"}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <FileText className="w-3 h-3" />
                            1 note
                          </span>
                          <span className="text-primary">flashcards & MCQs available</span>
                        </div>
                      </div>
                    </Link>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleDelete(video.id)}
                        disabled={deletingId === video.id}
                        className="w-10 h-10 rounded-lg bg-black/[0.02] border border-black/10 flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-500/8 hover:border-red-400/30 transition-all disabled:opacity-50"
                      >
                        {deletingId === video.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
