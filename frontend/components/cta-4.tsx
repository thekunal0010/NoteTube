"use client"

import React, { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  FileText,
  CreditCard,
  ListChecks,
  Play,
  Clock,
  ExternalLink,
  Zap,
} from "lucide-react"

export interface RecentNoteItem {
  id: string
  youtube_url?: string
  summary: string | { overview?: string; key_points?: string[] }
  title?: string
  createdAt?: string
}

export interface CTACardData {
  id?: string
  title: string
  category: string
  excerpt: string
  duration?: string
  flashcardCount?: number
  quizCount?: number
  youtubeUrl?: string
  thumbnailUrl?: string
  href?: string
}

export interface CTA4Props {
  badge?: string
  title?: React.ReactNode
  description?: string
  actionText?: string
  actionHref?: string
  onActionClick?: () => void
  secondaryActionText?: string
  secondaryActionHref?: string
  recentNotes?: RecentNoteItem[]
  onSelectLecture?: (url: string) => void
  className?: string
  isLoggedIn?: boolean
}

// Curated backup/trending lectures with real educational YouTube content & high-res thumbnails
const DEFAULT_TRENDING_CARDS: CTACardData[] = [
  {
    id: "trending-1",
    title: "Stanford CS229: Machine Learning & Gradient Descent",
    category: "AI & Data Science",
    excerpt: "Fundamental mechanics of loss curves, cost functions, learning rate schedules, and backpropagation in modern networks.",
    duration: "48:12",
    flashcardCount: 16,
    quizCount: 10,
    youtubeUrl: "https://www.youtube.com/watch?v=jGwO_UgTS7I",
    thumbnailUrl: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "trending-2",
    title: "MIT 6.006: Introduction to Algorithms & Heaps",
    category: "Computer Science",
    excerpt: "Priority queues, asymptotic runtime proofs, and binary tree balance theorems explained visually.",
    duration: "51:40",
    flashcardCount: 22,
    quizCount: 12,
    youtubeUrl: "https://www.youtube.com/watch?v=B3OddPVWGGg",
    thumbnailUrl: "https://images.unsplash.com/photo-1516116211227-bbc13c6b5420?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "trending-3",
    title: "Harvard CS50: Memory Allocation, Pointers & The Heap",
    category: "Software Eng",
    excerpt: "Demystifying pointers, segmentation faults, dynamic memory leak diagnosis, and stack frame layouts.",
    duration: "64:25",
    flashcardCount: 28,
    quizCount: 15,
    youtubeUrl: "https://www.youtube.com/watch?v=zYIER3UahWQ",
    thumbnailUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "trending-4",
    title: "Attention Is All You Need: Transformer Architecture",
    category: "Deep Learning",
    excerpt: "Multi-head scaled dot-product self-attention, positional encoding, and token embeddings dissected.",
    duration: "42:08",
    flashcardCount: 19,
    quizCount: 8,
    youtubeUrl: "https://www.youtube.com/watch?v=iDulhoQ2pro",
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "trending-5",
    title: "Designing Data-Intensive Applications: Distributed Systems",
    category: "System Design",
    excerpt: "CAP theorem tradeoffs, Raft consensus, two-phase commits, and partition tolerance in high-throughput clusters.",
    duration: "55:30",
    flashcardCount: 24,
    quizCount: 14,
    youtubeUrl: "https://www.youtube.com/watch?v=v=kGg447G447",
    thumbnailUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "trending-6",
    title: "UC Berkeley CS61A: Functional Programming Paradigms",
    category: "Programming",
    excerpt: "Higher-order lambda closures, lexical scoping rules, immutable environments, and tail-call optimization.",
    duration: "39:15",
    flashcardCount: 15,
    quizCount: 8,
    youtubeUrl: "https://www.youtube.com/watch?v=dO3h46Zk4hA",
    thumbnailUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=700&q=80",
  },
]

function extractYouTubeId(url?: string): string | null {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  return match ? match[1] : null
}

function getNoteExcerpt(note: RecentNoteItem): string {
  if (typeof note.summary === "string") {
    return note.summary.slice(0, 110)
  }
  if (note.summary?.overview) {
    return note.summary.overview.slice(0, 110)
  }
  return "Comprehensive lecture notes, auto-generated flashcards, and instant knowledge assessment."
}

export function CTA4({
  badge = "Recently Generated & Trending",
  title = (
    <>
      Ready to study from <span className="italic text-gradient">any lecture</span>?
    </>
  ),
  description = "Join students turning hour-long YouTube lectures into clear notes, active-recall flashcards, and self-testing quizzes.",
  actionText = "Get started for free",
  actionHref = "/signup",
  onActionClick,
  secondaryActionText,
  secondaryActionHref,
  recentNotes = [],
  onSelectLecture,
  className = "",
  isLoggedIn = false,
}: CTA4Props) {
  // Convert any user recentNotes into card data, fallback to trending cards
  const userCards: CTACardData[] = recentNotes.map((note, index) => {
    const videoId = extractYouTubeId(note.youtube_url)
    const excerpt = getNoteExcerpt(note)
    const title =
      note.title ||
      (typeof note.summary === "object" && note.summary?.overview
        ? note.summary.overview.slice(0, 50) + "..."
        : `Lecture Note #${index + 1}`)

    return {
      id: note.id,
      title,
      category: "Your Lecture",
      excerpt: excerpt + (excerpt.length >= 110 ? "…" : ""),
      duration: "Saved Note",
      flashcardCount: 15,
      quizCount: 10,
      youtubeUrl: note.youtube_url,
      thumbnailUrl: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined,
      href: `/notes/${note.id}`,
    }
  })

  // Mix user cards with defaults if fewer than 5 user notes to keep marquee dense & infinitely rich
  const displayCards: CTACardData[] =
    userCards.length > 0
      ? userCards.length < 5
        ? [...userCards, ...DEFAULT_TRENDING_CARDS.slice(0, 6 - userCards.length)]
        : userCards
      : DEFAULT_TRENDING_CARDS

  return (
    <section className={`relative py-20 overflow-hidden border-y border-border/60 ${className}`}>
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[340px] bg-primary/[0.04] rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-[380px] h-[220px] bg-chart-2/[0.03] rounded-full blur-2xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12">
        {/* Badge */}
        {badge && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium badge-pill mb-6">
            <span className="pulse-dot" />
            <span className="text-primary font-semibold tracking-wide uppercase text-[11px]">{badge}</span>
          </div>
        )}

        {/* Heading */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif-display font-semibold text-foreground tracking-tight max-w-3xl mx-auto leading-[1.15] mb-5">
          {title}
        </h2>

        {/* Subtitle */}
        {description && (
          <p className="text-base sm:text-lg text-foreground/70 max-w-2xl mx-auto leading-relaxed mb-8 text-balance">
            {description}
          </p>
        )}

        {/* Centered Pill CTA Button (Signature React Bits Pro button design) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {onActionClick ? (
            <button
              onClick={onActionClick}
              className="group inline-flex items-center gap-3 bg-foreground text-background hover:bg-foreground/90 pl-6 pr-2 py-2 rounded-full font-medium text-sm transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5"
            >
              <span>{actionText}</span>
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5 group-hover:scale-105">
                <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          ) : (
            <Link
              href={actionHref}
              className="group inline-flex items-center gap-3 bg-foreground text-background hover:bg-foreground/90 pl-6 pr-2 py-2 rounded-full font-medium text-sm transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5"
            >
              <span>{actionText}</span>
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5 group-hover:scale-105">
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          )}

          {secondaryActionText && secondaryActionHref && (
            <Link
              href={secondaryActionHref}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
            >
              {secondaryActionText} &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Infinite scrolling cards marquee */}
      <div className="relative w-full overflow-hidden">
        {/* Left & Right gradient fade masks (React Bits Pro edge mask) */}
        <div className="absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-background via-background/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none" />

        {/* Marquee Track */}
        <div className="marquee-track flex gap-5 py-4 px-2">
          {/* Loop Set 1 */}
          <div className="flex gap-5 shrink-0 items-stretch">
            {displayCards.map((card, idx) => (
              <LectureCard key={`set1-${card.id || idx}`} card={card} onSelectLecture={onSelectLecture} />
            ))}
          </div>

          {/* Loop Set 2 (for seamless infinite loop) */}
          <div className="flex gap-5 shrink-0 items-stretch" aria-hidden="true">
            {displayCards.map((card, idx) => (
              <LectureCard key={`set2-${card.id || idx}`} card={card} onSelectLecture={onSelectLecture} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      {isLoggedIn && recentNotes.length > 0 && (
        <div className="text-center mt-6">
          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <span>View your entire study library in History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </section>
  )
}

function LectureCard({
  card,
  onSelectLecture,
}: {
  card: CTACardData
  onSelectLecture?: (url: string) => void
}) {
  const content = (
    <div className="group relative w-[310px] sm:w-[350px] rounded-2xl panel panel-hover p-4 flex flex-col justify-between overflow-hidden bg-card text-left transition-all duration-300 hover:border-primary/40 hover:shadow-lg">
      <div>
        {/* Visual Header / Thumbnail */}
        <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3.5 bg-black/[0.04] border border-border/50">
          {card.thumbnailUrl ? (
            <img
              src={card.thumbnailUrl}
              alt={card.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-chart-2/10 to-transparent p-4 text-center">
              <BookOpen className="w-7 h-7 text-primary/70 mb-2" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                NoteTube Transcript
              </span>
            </div>
          )}

          {/* Category Chip */}
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-background/90 backdrop-blur-md border border-border/60 text-foreground shadow-sm">
            {card.category}
          </span>

          {/* Duration or Saved badge */}
          {card.duration && (
            <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-medium bg-black/75 text-white backdrop-blur-sm flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {card.duration}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-serif-display font-semibold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors mb-1.5">
          {card.title}
        </h3>

        {/* Excerpt */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
          {card.excerpt}
        </p>
      </div>

      {/* Card Footer: Metadata Badges & Action */}
      <div className="pt-3 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {card.flashcardCount ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-foreground/70 bg-black/[0.03] dark:bg-white/[0.05] px-2 py-0.5 rounded-full border border-border/40">
              <CreditCard className="w-3 h-3 text-primary" />
              {card.flashcardCount} cards
            </span>
          ) : null}
          {card.quizCount ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-foreground/70 bg-black/[0.03] dark:bg-white/[0.05] px-2 py-0.5 rounded-full border border-border/40">
              <ListChecks className="w-3 h-3 text-chart-3" />
              Quiz
            </span>
          ) : null}
        </div>

        <div className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:translate-x-0.5 transition-transform">
          <span>Open</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  )

  if (card.href) {
    return (
      <Link href={card.href} className="block shrink-0">
        {content}
      </Link>
    )
  }

  if (card.youtubeUrl && onSelectLecture) {
    return (
      <button
        type="button"
        onClick={() => onSelectLecture(card.youtubeUrl!)}
        className="block shrink-0 text-left cursor-pointer"
      >
        {content}
      </button>
    )
  }

  return <div className="block shrink-0">{content}</div>
}

export default CTA4
