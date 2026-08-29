"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { EmptyState } from "@/components/empty-state"
import { Progress } from "@/components/ui/progress"
import { apiGet } from "@/lib/api"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, RotateCw, ArrowLeft } from "lucide-react"

function FlashcardsView() {
  const searchParams = useSearchParams()
  const noteId = searchParams.get("note")

  const [flashcards, setFlashcards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [direction, setDirection] = useState(0)

  useEffect(() => {
    const fetchFlashcards = async () => {
      setLoading(true)
      try {
        const query = noteId ? `?note=${noteId}` : ""
        const data = await apiGet(`/flashcards${query}`)
        setFlashcards(data.flashcards || [])
        setCurrentIndex(0)
        setFlipped(false)
      } catch (error: any) {
        toast.error(error?.message || "Failed to load flashcards")
      } finally {
        setLoading(false)
      }
    }
    fetchFlashcards()
  }, [noteId])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col justify-center items-center h-64 gap-3 text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          Loading flashcards...
        </div>
      </DashboardLayout>
    )
  }

  if (flashcards.length === 0) {
    return (
      <DashboardLayout>
        <EmptyState
          title="No Flashcards Available"
          description="Generate notes from a YouTube video first to create flashcards."
          actionLabel="Go to Dashboard"
          actionHref="/dashboard"
        />
      </DashboardLayout>
    )
  }

  const card = flashcards[currentIndex]
  const progressPct = ((currentIndex + 1) / flashcards.length) * 100

  const goNext = () => {
    setFlipped(false)
    setDirection(1)
    setCurrentIndex((prev) => Math.min(flashcards.length - 1, prev + 1))
  }

  const goPrev = () => {
    setFlipped(false)
    setDirection(-1)
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl mx-auto flex flex-col items-center animate-fade-up">
        {noteId && (
          <Link href={`/notes/${noteId}`} className="self-start inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to study kit
          </Link>
        )}
        <h1 className="text-3xl font-serif-display font-semibold text-foreground mb-2 tracking-tight">Flashcards</h1>
        <p className="text-muted-foreground text-sm mb-8">Click a card to reveal the answer</p>

        <div className="w-full mb-6">
          <Progress value={progressPct} className="h-1.5" />
        </div>

        <div className="w-full h-80 relative" style={{ perspective: 1400 }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              initial={{ opacity: 0, x: direction >= 0 ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction >= 0 ? -40 : 40 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <motion.div
                onClick={() => setFlipped(!flipped)}
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full h-full cursor-pointer"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Front — question */}
                <div
                  className="absolute inset-0 panel panel-hover rounded-3xl p-8 flex flex-col items-center justify-center"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <span className="absolute top-5 left-6 text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border text-primary border-primary/25 bg-primary/8">
                    Question
                  </span>
                  <RotateCw className="absolute top-5 right-6 w-4 h-4 text-muted-foreground/50" />
                  <p className="text-2xl text-center text-foreground font-serif-display font-medium leading-snug px-4">
                    {card.front}
                  </p>
                  <span className="absolute bottom-5 text-xs text-muted-foreground">Click card to flip</span>
                </div>

                {/* Back — answer */}
                <div
                  className="absolute inset-0 panel panel-hover rounded-3xl p-8 flex flex-col items-center justify-center"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <span className="absolute top-5 left-6 text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border text-foreground/70 border-black/10 bg-black/[0.03]">
                    Answer
                  </span>
                  <RotateCw className="absolute top-5 right-6 w-4 h-4 text-muted-foreground/50" />
                  <p className="text-2xl text-center text-foreground font-serif-display font-medium leading-snug px-4">
                    {card.back}
                  </p>
                  <span className="absolute bottom-5 text-xs text-muted-foreground">Click card to flip</span>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-6 text-foreground mt-8">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="w-10 h-10 flex items-center justify-center bg-black/[0.02] border border-black/10 rounded-xl hover:bg-primary/8 hover:border-primary/30 disabled:opacity-40 disabled:hover:bg-black/[0.02] disabled:hover:border-black/10 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-muted-foreground font-mono text-sm min-w-[3.5rem] text-center">
            {currentIndex + 1} / {flashcards.length}
          </span>
          <button
            onClick={goNext}
            disabled={currentIndex === flashcards.length - 1}
            className="w-10 h-10 flex items-center justify-center bg-black/[0.02] border border-black/10 rounded-xl hover:bg-primary/8 hover:border-primary/30 disabled:opacity-40 disabled:hover:bg-black/[0.02] disabled:hover:border-black/10 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function FlashcardsPage() {
  return (
    <Suspense fallback={null}>
      <FlashcardsView />
    </Suspense>
  )
}
