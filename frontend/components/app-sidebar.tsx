"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  FileText,
  CreditCard,
  ListChecks,
  History,
  Settings,
  Sparkles,
  HelpCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Notes", href: "/notes", icon: FileText },
  { name: "Flashcards", href: "/flashcards", icon: CreditCard },
  { name: "MCQs", href: "/mcqs", icon: ListChecks },
  { name: "History", href: "/history", icon: History },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="glass-sidebar w-64 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-semibold text-white">NoteTube AI</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-purple-500/20 to-cyan-500/10 text-white border border-purple-500/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive && "text-purple-400")} />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Help Section */}
      <div className="p-4 mx-4 mb-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-sm text-gray-400">Need help?</p>
        <Link
          href="#"
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          View Tutorial
        </Link>
      </div>
    </aside>
  )
}
