"use client"

import React, { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Mail,
  Send,
  Github,
  Twitter,
  Youtube,
  Disc as Discord,
} from "lucide-react"

export interface FooterLinkItem {
  label: string
  href?: string
  onClick?: () => void
  isExternal?: boolean
}

export interface FooterColumn {
  title: string
  links: FooterLinkItem[]
}

export interface Footer7Props {
  logo?: {
    src?: string
    alt?: string
    title?: string
    href?: string
  }
  tagline?: string
  columns?: FooterColumn[]
  newsletter?: {
    title?: string
    description?: string
    placeholder?: string
    buttonText?: string
    onSubscribe?: (email: string) => Promise<void> | void
  }
  bottomText?: string
  socialLinks?: Array<{
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
  }>
  onPrivacyClick?: () => void
  onTermsClick?: () => void
  className?: string
}

export function Footer7({
  logo = {
    src: "/logo.png",
    alt: "NoteTube AI",
    title: "NoteTube AI",
    href: "/",
  },
  tagline = "Transform hours of YouTube lectures into structured notes, spaced-repetition flashcards, and instant self-testing quizzes.",
  columns = [
    {
      title: "Product",
      links: [
        { label: "Lecture Summarizer", href: "/#hero" },
        { label: "Structured Notes", href: "#features" },
        { label: "Flashcards Generator", href: "/flashcards" },
        { label: "Practice Quizzes", href: "/mcqs" },
        { label: "Study Kit Library", href: "/history" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "How It Works", href: "#features" },
        { label: "Trending Lectures", href: "#recent-searches" },
        { label: "Documentation", href: "#about" },
        { label: "Study Modes Guide", href: "#about" },
        { label: "Release Notes", href: "#about" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About NoteTube", href: "#about" },
        { label: "Editorial Mission", href: "#about" },
        { label: "Student Plans", href: "/signup" },
        { label: "Contact Support", href: "mailto:support@notetube.ai" },
      ],
    },
  ],
  newsletter = {
    title: "Stay ahead in your courses",
    description: "Receive weekly lecture breakdowns, study frameworks, and model capability updates. No spam, ever.",
    placeholder: "Enter your email address...",
    buttonText: "Subscribe",
  },
  bottomText = "© 2026 NoteTube AI. Crafted for students, researchers, and lifelong learners.",
  socialLinks = [
    { name: "Twitter", href: "https://twitter.com", icon: Twitter },
    { name: "GitHub", href: "https://github.com", icon: Github },
    { name: "YouTube", href: "https://youtube.com", icon: Youtube },
  ],
  onPrivacyClick,
  onTermsClick,
  className = "",
}: Footer7Props) {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address")
      return
    }

    setIsSubmitting(true)
    try {
      if (newsletter.onSubscribe) {
        await newsletter.onSubscribe(email)
      } else {
        // Fallback simulation
        await new Promise((resolve) => setTimeout(resolve, 600))
      }
      setIsSubscribed(true)
      toast.success("Subscribed successfully! Welcome to the study circle.")
      setEmail("")
    } catch {
      toast.error("Failed to subscribe. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <footer className={`relative border-t border-[#2e261e] bg-[#17130f] text-[#fdf6ec] pt-16 pb-12 overflow-hidden ${className}`}>
      {/* Ambient warm background glows */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[280px] bg-primary/[0.07] rounded-full blur-3xl" />
        <div className="absolute top-0 right-10 w-[400px] h-[200px] bg-[#bd5b2c]/[0.05] rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Section: Brand Info + Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-14 border-b border-[#2e261e] items-start">
          {/* Brand Info with Circular Logo Badge */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {/* Signature Circular Logo Badge */}
              <Link
                href={logo.href || "/"}
                className="group relative w-12 h-12 rounded-full p-2 bg-[#221c16] border border-[#3e3226] shadow-sm flex items-center justify-center transition-all duration-300 hover:border-primary/60 hover:bg-[#2b221b] hover:scale-105 hover:shadow-md"
                aria-label={logo.title || "Home"}
              >
                {logo.src ? (
                  <img
                    src={logo.src}
                    alt={logo.alt || "Logo"}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Sparkles className="w-5 h-5 text-primary" />
                )}
              </Link>

              <div>
                <Link href={logo.href || "/"} className="inline-block">
                  <h3 className="font-serif-display font-semibold text-xl tracking-tight text-[#fffdf8] hover:text-primary transition-colors">
                    {logo.title}
                  </h3>
                </Link>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="pulse-dot" />
                  <span className="text-[11px] text-[#a89b88] font-medium uppercase tracking-wider">
                    Study companion &middot; Active
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-[#c2b6a3] leading-relaxed max-w-sm mt-1">
              {tagline}
            </p>

            {/* Social Icons */}
            {socialLinks && socialLinks.length > 0 && (
              <div className="flex items-center gap-2.5 mt-2">
                {socialLinks.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-full bg-[#221c16] border border-[#382d22] flex items-center justify-center text-[#a89b88] hover:text-[#fffdf8] hover:border-primary/60 hover:bg-primary/20 transition-all shadow-xs"
                    aria-label={item.name}
                  >
                    <item.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Pill Newsletter Form */}
          <div className="lg:col-span-7 relative bg-[#201913]/90 border border-[#382d22] rounded-3xl p-6 sm:p-8 backdrop-blur-sm shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-52 h-52 bg-primary/[0.06] rounded-full blur-2xl pointer-events-none" />

            <div className="relative">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-[#e68254] text-xs font-semibold uppercase tracking-wider mb-3">
                <Mail className="w-3.5 h-3.5" />
                <span>NoteTube Dispatch</span>
              </div>

              <h4 className="font-serif-display font-semibold text-xl sm:text-2xl text-[#fffdf8] tracking-tight mb-2">
                {newsletter.title}
              </h4>

              <p className="text-sm text-[#a89b88] leading-relaxed mb-6 max-w-lg">
                {newsletter.description}
              </p>

              {/* Newsletter Pill Input Container */}
              {isSubscribed ? (
                <div className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-primary/15 border border-primary/30 text-[#e68254] text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#e68254] shrink-0" />
                  <span>You&apos;re subscribed! Look out for our next edition.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="max-w-md">
                  <div className="relative flex items-center p-1.5 rounded-full bg-[#15110d] border border-[#3a2f24] focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/25 transition-all shadow-inner">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={newsletter.placeholder}
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-2 text-sm text-[#fffdf8] bg-transparent placeholder:text-[#7d705f] focus:outline-none disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="group gradient-button px-5 py-2.5 rounded-full text-xs font-semibold text-primary-foreground tracking-wide uppercase flex items-center gap-1.5 shrink-0 shadow-xs hover:shadow-md transition-all disabled:opacity-70 cursor-pointer"
                    >
                      <span>{isSubmitting ? "Joining..." : newsletter.buttonText}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Middle Section: Organized Link Columns */}
        <div className="py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {columns.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <h5 className="font-serif-display text-xs font-semibold tracking-wider text-[#fffdf8] uppercase">
                {column.title}
              </h5>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.onClick ? (
                      <button
                        type="button"
                        onClick={link.onClick}
                        className="text-sm text-[#a89b88] hover:text-primary transition-colors text-left"
                      >
                        {link.label}
                      </button>
                    ) : link.href ? (
                      <Link
                        href={link.href}
                        className="text-sm text-[#a89b88] hover:text-primary transition-colors inline-block"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <span className="text-sm text-[#a89b88]">
                        {link.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Quick Study Kit summary column */}
          <div className="flex flex-col gap-3">
            <h5 className="font-serif-display text-xs font-semibold tracking-wider text-[#fffdf8] uppercase">
              Study Guarantee
            </h5>
            <p className="text-xs text-[#a89b88] leading-relaxed">
              Every lecture processed with NoteTube AI produces verified structured summaries, active-recall flashcards, and instant test questions.
            </p>
            <div className="pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#e68254] hover:text-[#fffdf8] transition-colors"
              >
                <span>Create free account</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Legal Actions */}
        <div className="pt-8 border-t border-[#2e261e] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7d705f]">
          <p>{bottomText}</p>

          <div className="flex items-center gap-6">
            {onPrivacyClick && (
              <button
                type="button"
                onClick={onPrivacyClick}
                className="hover:text-[#fffdf8] transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
            )}
            {onTermsClick && (
              <button
                type="button"
                onClick={onTermsClick}
                className="hover:text-[#fffdf8] transition-colors cursor-pointer"
              >
                Terms of Service
              </button>
            )}
            <Link
              href="mailto:support@notetube.ai"
              className="hover:text-[#fffdf8] transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer7
