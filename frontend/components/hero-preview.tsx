"use client"

import { motion } from "framer-motion"
import { FileText, CreditCard, ListChecks } from "lucide-react"

/**
 * A stacked mockup of the three artefacts NoteTube actually produces —
 * used in place of stock photography so the hero shows the real product,
 * not a generic lifestyle shot.
 */
export function HeroPreview() {
  return (
    <div className="relative h-[420px] w-full flex items-center justify-center">
      {/* MCQ card, back */}
      <motion.div
        initial={{ opacity: 0, rotate: -2, y: 20 }}
        animate={{ opacity: 1, rotate: -8, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="absolute w-64 panel rounded-2xl p-5 -translate-x-24 translate-y-10"
      >
        <div className="flex items-center gap-2 mb-3 text-primary">
          <ListChecks className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Quiz</span>
        </div>
        <p className="text-sm text-foreground/80 mb-3 leading-snug">
          What technique reduces forgetting over time?
        </p>
        <div className="space-y-1.5">
          <div className="h-6 rounded-md bg-primary/10 border border-primary/20" />
          <div className="h-6 rounded-md bg-black/[0.03] border border-black/5" />
          <div className="h-6 rounded-md bg-black/[0.03] border border-black/5" />
        </div>
      </motion.div>

      {/* Flashcard, middle */}
      <motion.div
        initial={{ opacity: 0, rotate: 2, y: 20 }}
        animate={{ opacity: 1, rotate: 6, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="absolute w-64 panel rounded-2xl p-5 translate-x-20 -translate-y-6"
      >
        <div className="flex items-center gap-2 mb-3 text-primary">
          <CreditCard className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Flashcard</span>
        </div>
        <p className="font-serif-display text-lg text-foreground leading-snug">
          &ldquo;What is spaced repetition?&rdquo;
        </p>
        <p className="text-xs text-muted-foreground mt-3">Tap to reveal answer</p>
      </motion.div>

      {/* Notes card, front */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-72 panel rounded-2xl p-6 ruled-paper"
      >
        <div className="flex items-center gap-2 mb-4 text-primary">
          <FileText className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Notes</span>
        </div>
        <h3 className="font-serif-display text-xl text-foreground mb-2 leading-snug">
          Neural Networks 101
        </h3>
        <p className="text-sm text-foreground/70 leading-relaxed mb-3">
          A layered model that learns patterns from data by adjusting weighted connections.
        </p>
        <ul className="space-y-1.5 text-sm text-foreground/70">
          <li className="flex gap-2">
            <span className="text-primary mt-1.5 w-1 h-1 rounded-full bg-primary flex-shrink-0" />
            Backpropagation adjusts weights via gradient descent
          </li>
          <li className="flex gap-2">
            <span className="text-primary mt-1.5 w-1 h-1 rounded-full bg-primary flex-shrink-0" />
            Activation functions add non-linearity
          </li>
        </ul>
      </motion.div>
    </div>
  )
}
