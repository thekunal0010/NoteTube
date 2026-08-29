"use client"

import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"

interface GenerationProgressProps {
  stage: string
  percent: number
}

export function GenerationProgress({ stage, percent }: GenerationProgressProps) {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 text-sm text-foreground/70">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>{stage || "Working..."}</span>
        <span className="ml-auto text-primary/70 font-mono text-xs">{percent}%</span>
      </div>
      <Progress value={percent} className="h-1.5" />
    </div>
  )
}
