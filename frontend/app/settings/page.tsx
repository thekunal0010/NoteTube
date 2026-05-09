"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  User,
  Moon,
  Globe,
  Download,
  Trash2,
  LogOut,
  Bell,
  ChevronDown,
} from "lucide-react"

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [language, setLanguage] = useState("English")
  const [studyMode, setStudyMode] = useState("Comprehensive Notes")
  const router = useRouter()
  const handleLogout = () => {

  localStorage.removeItem("token")
  localStorage.removeItem("name")
  localStorage.removeItem("email")

  router.push("/login")

}

  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account and preferences</p>
        </div>

        {/* Profile Section */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Profile</h2>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-lg font-semibold">
                ST
              </div>
              <div>
                <p className="text-white font-medium">Student Name</p>
                <p className="text-gray-400 text-sm">student@university.edu</p>
              </div>
            </div>
            <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-all">
              Edit Profile
            </button>
          </div>

          <div className="border-t border-white/10 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  defaultValue="Student Name"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  defaultValue="student@university.edu"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Moon className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Appearance</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Dark Mode</p>
              <p className="text-gray-400 text-sm">
                Use dark theme for better focus
              </p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative w-14 h-7 rounded-full transition-all ${
                darkMode ? "bg-purple-500" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                  darkMode ? "left-8" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Preferences</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Language</label>
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none focus:outline-none focus:border-purple-500/50 transition-all"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Default Study Mode
              </label>
              <div className="relative">
                <select
                  value={studyMode}
                  onChange={(e) => setStudyMode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none focus:outline-none focus:border-purple-500/50 transition-all"
                >
                  <option value="Comprehensive Notes">Comprehensive Notes</option>
                  <option value="Quick Summary">Quick Summary</option>
                  <option value="Key Points Only">Key Points Only</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Notifications</p>
                <p className="text-gray-400 text-sm">
                  Receive updates about your study materials
                </p>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`relative w-14 h-7 rounded-full transition-all ${
                  notifications ? "bg-purple-500" : "bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                    notifications ? "left-8" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Data & Storage Section */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Download className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Data & Storage</h2>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Storage Used</span>
              <span className="text-white text-sm">2.4 GB / 10 GB</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500"
                style={{ width: "24%" }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
              <Download className="w-4 h-4" />
              Export All Data
            </button>
            <button className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all">
              <Trash2 className="w-4 h-4" />
              Clear All Cache
            </button>
          </div>
        </div>

        {/* Account Section */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Account</h2>
          </div>

          <div className="space-y-3">
            <button onClick={handleLogout} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
            <button className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all">
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4">
          <button className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all">
            Cancel
          </button>
          <button className="px-6 py-3 rounded-xl gradient-button text-white font-medium hover:scale-105 transition-all">
            Save Changes
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
