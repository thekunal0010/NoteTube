import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { termsSections as sections, legalLastUpdated } from "@/lib/legal-content"

export const metadata = {
  title: "Terms of Service — NoteTube AI",
  description: "The terms that govern your use of NoteTube AI.",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen relative">
      <nav className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="NoteTube AI" className="w-8 h-8 object-contain" />
            <span className="text-lg font-serif-display font-semibold tracking-tight text-foreground">
              NoteTube AI
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back home
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-4">Legal</p>
        <h1 className="text-3xl md:text-4xl font-serif-display font-semibold text-foreground mb-3 tracking-tight">
          Terms of Service
        </h1>
        <p className="text-muted-foreground mb-12">Last updated: {legalLastUpdated}</p>

        <div className="panel rounded-2xl p-8 space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-serif-display font-semibold text-foreground mb-3 tracking-tight">
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.body.map((paragraph, i) => (
                  <p key={i} className="text-foreground/70 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
