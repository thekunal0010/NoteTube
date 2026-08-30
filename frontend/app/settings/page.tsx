"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { toast } from "sonner"
import { apiGet, apiPut, apiDelete } from "@/lib/api"
import {
  User,
  Moon,
  Globe,
  Download,
  Trash2,
  LogOut,
  Bell,
  ChevronDown,
  Loader2,
} from "lucide-react"
import { STUDY_MODES, DEFAULT_STUDY_MODE, getStoredStudyMode, type StudyMode } from "@/lib/study-mode"

const PREFS_KEY = "notetube_prefs"

interface Prefs {
  darkMode: boolean
  notifications: boolean
  language: string
  studyMode: StudyMode
}

const defaultPrefs: Prefs = {
  darkMode: true,
  notifications: true,
  language: "English",
  studyMode: DEFAULT_STUDY_MODE,
}

export default function SettingsPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setName(localStorage.getItem("name") || "")
    setEmail(localStorage.getItem("email") || "")

    try {
      const stored = localStorage.getItem(PREFS_KEY)
      const parsed = stored ? JSON.parse(stored) : {}
      setPrefs({ ...defaultPrefs, ...parsed, studyMode: getStoredStudyMode() })
    } catch {
      // ignore malformed local prefs
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("name")
    localStorage.removeItem("email")
    router.push("/login")
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty")
      return
    }

    setSaving(true)
    try {
      await apiPut("/profile", { name })
      localStorage.setItem("name", name)
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
      toast.success("Settings saved")
    } catch (error: any) {
      toast.error(error?.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setName(localStorage.getItem("name") || "")
    try {
      const stored = localStorage.getItem(PREFS_KEY)
      const parsed = stored ? JSON.parse(stored) : {}
      setPrefs({ ...defaultPrefs, ...parsed, studyMode: getStoredStudyMode() })
    } catch {
      setPrefs(defaultPrefs)
    }
    toast.info("Changes discarded")
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await apiGet("/notes")
      const blob = new Blob([JSON.stringify(data.notes || [], null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "notetube-export.json"
      link.click()
      URL.revokeObjectURL(url)
      toast.success("Export downloaded")
    } catch (error: any) {
      toast.error(error?.message || "Export failed")
    } finally {
      setExporting(false)
    }
  }

  const handleClearCache = () => {
    localStorage.removeItem(PREFS_KEY)
    setPrefs(defaultPrefs)
    toast.success("Local preferences cleared")
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "This will permanently delete your account and all of your notes. This cannot be undone. Continue?"
    )
    if (!confirmed) return

    setDeleting(true)
    try {
      await apiDelete("/account")
      localStorage.removeItem("token")
      localStorage.removeItem("name")
      localStorage.removeItem("email")
      toast.success("Account deleted")
      router.push("/signup")
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete account")
      setDeleting(false)
    }
  }

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?"

  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl mx-auto animate-fade-up">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-2">Account</p>
          <h1 className="text-3xl font-serif-display font-semibold text-foreground mb-2 tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {/* Profile Section */}
        <div className="panel rounded-2xl p-6 mb-5">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-serif-display font-semibold text-foreground">Profile</h2>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full gradient-accent flex items-center justify-center text-primary-foreground text-lg font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-foreground font-medium truncate">{name || "—"}</p>
              <p className="text-muted-foreground text-sm truncate">{email || "—"}</p>
            </div>
          </div>

          <div className="border-t border-black/5 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/[0.02] border border-black/10 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-3 rounded-xl bg-black/[0.02] border border-black/10 text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="panel rounded-2xl p-6 mb-5">
          <div className="flex items-center gap-3 mb-6">
            <Moon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-serif-display font-semibold text-foreground">Appearance</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-medium">Light Mode</p>
              <p className="text-muted-foreground text-sm">
                NoteTube AI currently ships as a light-only, editorial experience
              </p>
            </div>
            <button
              disabled
              title="Dark theme isn't available yet"
              className="relative w-14 h-7 rounded-full bg-primary opacity-60 cursor-not-allowed"
            >
              <span className="absolute top-1 left-8 w-5 h-5 rounded-full bg-primary-foreground" />
            </button>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="panel rounded-2xl p-6 mb-5">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-serif-display font-semibold text-foreground">Preferences</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Language</label>
              <div className="relative">
                <select
                  value={prefs.language}
                  onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black/[0.02] border border-black/10 text-foreground appearance-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                Default Study Mode
              </label>
              <div className="relative">
                <select
                  value={prefs.studyMode}
                  onChange={(e) => setPrefs({ ...prefs, studyMode: e.target.value as StudyMode })}
                  className="w-full px-4 py-3 rounded-xl bg-black/[0.02] border border-black/10 text-foreground appearance-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                >
                  {STUDY_MODES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {STUDY_MODES.find((m) => m.value === prefs.studyMode)?.description}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">Notifications</p>
                <p className="text-muted-foreground text-sm">
                  Receive updates about your study materials
                </p>
              </div>
              <button
                onClick={() => setPrefs({ ...prefs, notifications: !prefs.notifications })}
                className={`relative w-14 h-7 rounded-full transition-all ${
                  prefs.notifications ? "bg-primary" : "bg-black/10"
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                    prefs.notifications ? "left-8" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Data & Storage Section */}
        <div className="panel rounded-2xl p-6 mb-5">
          <div className="flex items-center gap-3 mb-6">
            <Download className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-serif-display font-semibold text-foreground">Data & Storage</h2>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full py-3 rounded-xl bg-black/[0.02] border border-black/10 text-foreground flex items-center justify-center gap-2 hover:bg-black/[0.04] hover:border-black/20 transition-all disabled:opacity-60"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export All Data
            </button>
            <button
              onClick={handleClearCache}
              className="w-full py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-600 flex items-center justify-center gap-2 hover:bg-red-500/15 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Clear Local Preferences
            </button>
          </div>
        </div>

        {/* Account Section */}
        <div className="panel rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-serif-display font-semibold text-foreground">Account</h2>
          </div>

          <div className="space-y-3">
            <button onClick={handleLogout} className="w-full py-3 rounded-xl bg-black/[0.02] border border-black/10 text-foreground flex items-center justify-center gap-2 hover:bg-black/[0.04] hover:border-black/20 transition-all">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="w-full py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-600 flex items-center justify-center gap-2 hover:bg-red-500/15 transition-all disabled:opacity-60"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete Account
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4">
          <button
            onClick={handleCancel}
            className="px-6 py-3 rounded-xl bg-black/[0.02] border border-black/10 text-foreground hover:bg-black/[0.04] hover:border-black/20 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 rounded-xl gradient-button text-primary-foreground font-medium hover:scale-105 transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
