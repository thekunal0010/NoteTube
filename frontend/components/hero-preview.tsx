"use client"

import { FileText, CreditCard, ListChecks } from "lucide-react"

/**
 * A stacked mockup of the three artefacts NoteTube actually produces —
 * used in place of stock photography so the hero shows the real product,
 * not a generic lifestyle shot.
 *
 * The entrance is a CSS animation, not framer-motion: this sits above the
 * fold, and a JS-driven fade strands the cards half-transparent whenever the
 * main thread stalls. Only opacity is animated so the Tailwind translate
 * utilities keep working; the tilt uses the standalone `rotate` property,
 * which composes with `transform` rather than replacing it.
 */
export function HeroPreview() {
  return (
    <div className="relative h-[420px] w-full flex items-center justify-center">
      {/* MCQ card, back */}
      <div
        style={{ rotate: "-8deg", animationDelay: "150ms" }}
        className="animate-fade-in absolute w-64 panel rounded-2xl p-5 -translate-x-24 translate-y-10"
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
      </div>

      {/* Flashcard, middle */}
      <div
        style={{ rotate: "6deg", animationDelay: "300ms" }}
        className="animate-fade-in absolute w-64 panel rounded-2xl p-5 translate-x-20 -translate-y-6"
      >
        <div className="flex items-center gap-2 mb-3 text-primary">
          <CreditCard className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Flashcard</span>
        </div>
        <p className="font-serif-display text-lg text-foreground leading-snug">
          &ldquo;What is spaced repetition?&rdquo;
        </p>
        <p className="text-xs text-muted-foreground mt-3">Tap to reveal answer</p>
      </div>

      {/* Notes card, front */}
      <div
        className="animate-fade-in relative w-72 panel rounded-2xl p-6 ruled-paper"
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
      </div>
    </div>
  )
}
