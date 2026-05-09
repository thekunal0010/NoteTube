"use client"

import { useState } from "react"
import axios from "axios"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Sparkles,
  Play,
  FileText,
  CreditCard,
  ListChecks,
  BookOpen,
  Download,
  ArrowRight,
  Menu,
  X,
} from "lucide-react"

const features = [
  {
    icon: FileText,
    title: "AI Summaries",
    description: "Get comprehensive summaries of any lecture",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: CreditCard,
    title: "Flashcards",
    description: "Auto-generate flashcards for efficient studying",
    color: "from-cyan-500 to-cyan-600",
  },
  {
    icon: ListChecks,
    title: "MCQ Generator",
    description: "Practice with AI-generated questions",
    color: "from-pink-500 to-pink-600",
  },
  {
    icon: BookOpen,
    title: "Revision Notes",
    description: "Key concepts organized for quick review",
    color: "from-orange-500 to-orange-600",
  },
  {
    icon: Download,
    title: "PDF Export",
    description: "Download your materials for offline study",
    color: "from-green-500 to-green-600",
  },
]

const trendingLectures = [
  { title: "Machine Learning Basics", category: "AI/ML" },
  { title: "ReactJS Tutorial", category: "Web Dev" },
  { title: "Operating Systems", category: "CS Core" },
  { title: "Data Structures", category: "DSA" },
  { title: "DBMS Lecture", category: "Database" },
]

const stats = [
  { value: "50K+", label: "Notes Generated" },
  { value: "10K+", label: "Videos Processed" },
  { value: "100K+", label: "Flashcards Created" },
  { value: "25K+", label: "Active Students" },
]

export default function LandingPage() {
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState("")

  

  const handleGenerateNotes = async () => {

  const email = localStorage.getItem("email")
  const token = localStorage.getItem("token")

  if (!token) {

    alert("Please login first")

    router.push("/login")

    return
  }

  try {

    setLoading(true)

    const response = await axios.post(
      "http://127.0.0.1:5000/summary",
      {
        youtubeUrl,
        email
      }
    )

    setSummary(response.data)

  } catch (error) {

    console.log(error)

  } finally {

    setLoading(false)

  }

}

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-sidebar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-purple flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-white">NoteTube AI</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-gray-400 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="#about" className="text-gray-400 hover:text-white transition-colors">
                About
              </Link>
              <Link
                href="/login"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="gradient-button px-4 py-2 rounded-lg text-white text-sm font-medium"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-card border-t border-white/10">
            <div className="px-4 py-4 space-y-3">
              <Link href="#features" className="block text-gray-400 hover:text-white">
                Features
              </Link>
              <Link href="#about" className="block text-gray-400 hover:text-white">
                About
              </Link>
              <Link href="/login" className="block text-gray-400 hover:text-white">
                Login
              </Link>
              <Link
                href="/signup"
                className="block gradient-button px-4 py-2 rounded-lg text-white text-sm font-medium text-center"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Turn YouTube Lectures Into{" "}
            <span className="text-gradient">Smart Study Material</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            AI-powered notes, flashcards, MCQs, and revision materials from any YouTube lecture. Study smarter, not harder.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="/signup"
              className="gradient-button px-8 py-4 rounded-xl text-white font-medium flex items-center gap-2 hover:scale-105 transition-transform"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-all"
            >
              Try Demo
            </Link>
          </div>

          {/* YouTube URL Input */}
          <div className="max-w-2xl mx-auto glass-card rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Play className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-white font-medium">Try it now</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Paste a YouTube lecture URL here..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="flex-1 px-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
              />
              <button
                onClick={handleGenerateNotes}
                className="gradient-button px-6 py-4 rounded-xl text-white font-medium flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Sparkles className="w-5 h-5" />
                Generate Notes
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Lectures */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            Trending Lectures
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {trendingLectures.map((lecture) => (
              <button
                key={lecture.title}
                className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 hover:border-purple-500/30 transition-all"
              >
                {lecture.title}
                <span className="ml-2 text-xs text-purple-400">{lecture.category}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4 text-center">
            Powerful Features
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Everything you need to transform lectures into effective study materials
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-card rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 transition-all group"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-gradient mb-2">
                  {stat.value}
                </p>
                <p className="text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="about" className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-gray-400 mb-8">
            Join thousands of students using NoteTube AI to study more effectively.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 gradient-button px-8 py-4 rounded-xl text-white font-medium hover:scale-105 transition-transform"
          >
            Get Started for Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md gradient-purple flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm text-gray-400">
              NoteTube AI - Transform lectures into knowledge
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="#" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
