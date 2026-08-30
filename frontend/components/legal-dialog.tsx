"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { privacySections, termsSections, legalLastUpdated } from "@/lib/legal-content"

type LegalDocType = "privacy" | "terms"

interface LegalDialogProps {
  type: LegalDocType | null
  onOpenChange: (open: boolean) => void
}

const docs = {
  privacy: { title: "Privacy Policy", sections: privacySections },
  terms: { title: "Terms of Service", sections: termsSections },
}

export function LegalDialog({ type, onOpenChange }: LegalDialogProps) {
  const doc = type ? docs[type] : null

  return (
    <Dialog open={!!type} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] grid-rows-[auto_1fr] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="font-serif-display text-xl tracking-tight">
            {doc?.title}
          </DialogTitle>
          <DialogDescription>Last updated: {legalLastUpdated}</DialogDescription>
        </DialogHeader>

        <div data-lenis-prevent className="overflow-y-auto overscroll-contain px-6 py-6 space-y-8">
          {doc?.sections.map((section) => (
            <section key={section.title}>
              <h3 className="text-base font-serif-display font-semibold text-foreground mb-2 tracking-tight">
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.body.map((paragraph, i) => (
                  <p key={i} className="text-sm text-foreground/70 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
