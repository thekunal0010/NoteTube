"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Search, Play, FileText, Clock, Download, Trash2 } from "lucide-react"

const stats = [
  { label: "Total Videos", value: "5", color: "text-purple-400" },
  { label: "Notes Generated", value: "90", color: "text-cyan-400" },
  { label: "Flashcards Created", value: "167", color: "text-pink-400" },
  { label: "MCQs Generated", value: "108", color: "text-orange-400" },
]

const videos = [
  {
    id: 1,
    title: "Introduction to Machine Learning",
    channel: "Stanford Online",
    duration: "45:32",
    timeAgo: "2 minutes ago",
    notes: 12,
    flashcards: 24,
    mcqs: 15,
  },
  {
    id: 2,
    title: "Data Structures and Algorithms",
    channel: "MIT OpenCourseWare",
    duration: "1:12:45",
    timeAgo: "1 hour ago",
    notes: 18,
    flashcards: 32,
    mcqs: 20,
  },
  {
    id: 3,
    title: "Web Development Fundamentals",
    channel: "freeCodeCamp",
    duration: "2:30:15",
    timeAgo: "Yesterday",
    notes: 25,
    flashcards: 45,
    mcqs: 30,
  },
  {
    id: 4,
    title: "Introduction to Python Programming",
    channel: "Corey Schafer",
    duration: "1:45:00",
    timeAgo: "2 days ago",
    notes: 20,
    flashcards: 35,
    mcqs: 25,
  },
]

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredVideos = videos.filter((video) =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">History</h1>
          <p className="text-gray-400">
            View and manage your previously generated study materials
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass-card rounded-xl p-4 border border-white/10"
            >
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Video List */}
        <div className="space-y-4">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="glass-card rounded-xl p-4 border border-white/10 flex items-center gap-4"
            >
              {/* Thumbnail Placeholder */}
              <div className="w-28 h-20 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Play className="w-8 h-8 text-purple-400" />
              </div>

              {/* Video Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium mb-1 truncate">
                  {video.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <span>{video.channel}</span>
                  <span>•</span>
                  <span>{video.duration}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {video.timeAgo}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-gray-400">
                    <FileText className="w-3 h-3" />
                    {video.notes} notes
                  </span>
                  <span className="text-cyan-400">{video.flashcards} flashcards</span>
                  <span className="text-pink-400">{video.mcqs} MCQs</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                  <Download className="w-4 h-4" />
                </button>
                <button className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
