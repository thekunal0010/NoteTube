"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { EmptyState } from "@/components/empty-state"
import { Reveal, revealItem } from "@/components/motion/reveal"
import { motion } from "framer-motion"
import { apiGet } from "@/lib/api"
import { toast } from "sonner"
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react"

function MCQsView() {
  const searchParams = useSearchParams()
  const noteId = searchParams.get("note")

  const [mcqs, setMcqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<number, string>>({})

  useEffect(() => {
    const fetchMCQs = async () => {
      setLoading(true)
      try {
        const query = noteId ? `?note=${noteId}` : ""
        const data = await apiGet(`/mcqs${query}`)
        setMcqs(data.mcqs || [])
        setAnswers({})
      } catch (error: any) {
        toast.error(error?.message || "Failed to load MCQs")
      } finally {
        setLoading(false)
      }
    }
    fetchMCQs()
  }, [noteId])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col justify-center items-center h-64 gap-3 text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          Loading MCQs...
        </div>
      </DashboardLayout>
    )
  }

  if (mcqs.length === 0) {
    return (
      <DashboardLayout>
        <EmptyState
          title="No MCQs Available"
          description="Generate notes from a YouTube video first to create practice questions."
          actionLabel="Go to Dashboard"
          actionHref="/dashboard"
        />
      </DashboardLayout>
    )
  }

  const answeredCount = Object.keys(answers).length
  const correctCount = mcqs.filter((mcq, idx) => answers[idx] === mcq.answer).length
  const allAnswered = answeredCount === mcqs.length

  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl mx-auto space-y-6 animate-fade-up">
        {noteId && (
          <Link href={`/notes/${noteId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to study kit
          </Link>
        )}
        <div className="flex items-center justify-between mb-2 flex-wrap gap-4">
          <h1 className="text-3xl font-serif-display font-semibold text-foreground tracking-tight">Practice MCQs</h1>
          {answeredCount > 0 && (
            <span className="badge-pill px-4 py-1.5 rounded-full text-sm text-primary">
              Score <span className="text-foreground font-semibold">{correctCount}</span>
              <span className="text-primary/60">/{answeredCount}</span>
              {allAnswered && <span className="text-primary/70 ml-1">&middot; complete</span>}
            </span>
          )}
        </div>

        <Reveal className="space-y-6" stagger={0.08}>
          {mcqs.map((mcq, idx) => (
            <motion.div key={idx} variants={revealItem} className="panel rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/8 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary mt-0.5">
                  {idx + 1}
                </span>
                <h3 className="text-lg text-foreground font-medium leading-snug">{mcq.question}</h3>
              </div>
              <div className="space-y-2.5 pl-10">
                {mcq.options.map((option: string, optIdx: number) => {
                  const isSelected = answers[idx] === option;
                  const isCorrect = option === mcq.answer;
                  const showResult = answers[idx] !== undefined;

                  let btnClass = "w-full flex items-center justify-between text-left px-4 py-3 rounded-xl transition-all border "
                  if (!showResult) {
                    btnClass += isSelected ? "bg-primary/12 border-primary/40 text-foreground" : "bg-black/[0.02] border-black/10 text-foreground/70 hover:bg-black/[0.04] hover:border-black/20"
                  } else {
                    if (isCorrect) btnClass += "bg-primary/12 border-primary/40 text-foreground"
                    else if (isSelected) btnClass += "bg-red-500/10 border-red-400/40 text-foreground"
                    else btnClass += "bg-black/[0.01] border-black/5 text-muted-foreground"
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => !showResult && setAnswers({ ...answers, [idx]: option })}
                      disabled={showResult}
                      className={btnClass}
                    >
                      {option}
                      {showResult && isCorrect && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                      {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
              {answers[idx] !== undefined && (
                <p className={`mt-3 pl-10 text-sm ${answers[idx] === mcq.answer ? "text-primary" : "text-red-500"}`}>
                  {answers[idx] === mcq.answer ? "Correct!" : `Incorrect. The correct answer is: ${mcq.answer}`}
                </p>
              )}
            </motion.div>
          ))}
        </Reveal>
      </div>
    </DashboardLayout>
  )
}

export default function MCQsPage() {
  return (
    <Suspense fallback={null}>
      <MCQsView />
    </Suspense>
  )
}
