"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Play, Sparkles } from "lucide-react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const [youtubeUrl, setYoutubeUrl] = useState("")

  const router = useRouter()
  useEffect(() => {

  const token = localStorage.getItem("token")

  if (!token) {
    router.push("/login")
  }

}, [])

  const handleGenerateNotes = () => {
    if (!youtubeUrl.trim()) return
    // TODO: Implement note generation
    console.log("Generating notes for:", youtubeUrl)
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, Student
          </h1>
          <p className="text-gray-400">
            Transform your YouTube lectures into intelligent study materials
          </p>
        </div>

        {/* Generate Notes Card */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Play className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Generate Notes from YouTube
            </h2>
          </div>

          {/* URL Input */}
          <input
            type="text"
            placeholder="Paste YouTube video URL here..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="w-full px-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all mb-4"
          />

          {/* Generate Button */}
          <button
            onClick={handleGenerateNotes}
            className="w-full gradient-button py-4 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-5 h-5" />
            Generate Notes
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
