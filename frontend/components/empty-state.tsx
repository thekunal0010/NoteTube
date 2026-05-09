"use client"

import Link from "next/link"
import { AlertCircle } from "lucide-react"

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}

export function EmptyState({
  title,
  description,
  actionLabel = "Go to Dashboard",
  actionHref = "/dashboard",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-full border-2 border-purple-500/50 flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-purple-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-gray-400 mb-6 max-w-md">{description}</p>
      <Link
        href={actionHref}
        className="gradient-button px-6 py-3 rounded-xl text-white font-medium transition-all hover:scale-105"
      >
        {actionLabel}
      </Link>
    </div>
  )
}
