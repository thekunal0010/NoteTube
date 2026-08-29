"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  Home,
  FileText,
  CreditCard,
  ListChecks,
  History,
  Settings,
  Sparkles,
  LifeBuoy,
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
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  useEffect(() => {
    setName(localStorage.getItem("name") || "")
    setEmail(localStorage.getItem("email") || "")
  }, [])

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?"

  return (
    <aside className="glass-sidebar w-64 min-h-screen flex flex-col relative z-20">
      {/* Logo — links back to the public landing page without logging out */}
      <Link href="/" className="p-6 flex items-center gap-3 hover:opacity-80 transition-opacity">
        <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-serif-display font-semibold tracking-tight text-foreground">NoteTube AI</span>
      </Link>

      <div className="mx-6 divider-fade mb-2" />

      {/* Navigation */}
      <nav className="flex-1 px-4 py-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200",
                    isActive
                      ? "bg-primary/8 text-foreground border border-primary/20"
                      : "text-muted-foreground border border-transparent hover:text-foreground hover:bg-black/[0.03]"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="active-nav-indicator"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-primary"
                    />
                  )}
                  <item.icon
                    className={cn(
                      "w-[18px] h-[18px] transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-primary"
                    )}
                  />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Section */}
      {name && (
        <div className="mx-4 mb-3 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-black/[0.02] border border-black/5">
          <div className="w-9 h-9 rounded-full gradient-accent flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-foreground font-medium truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="p-4 mx-4 mb-4 rounded-xl bg-primary/[0.04] border border-primary/10">
        <div className="flex items-center gap-2 mb-1">
          <LifeBuoy className="w-3.5 h-3.5 text-primary" />
          <p className="text-sm text-foreground/80 font-medium">Need help?</p>
        </div>
        <Link
          href="#"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          View Tutorial &rarr;
        </Link>
      </div>
    </aside>
  )
}
