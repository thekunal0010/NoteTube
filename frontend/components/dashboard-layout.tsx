"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "./app-sidebar"
import { HelpCircle, LogOut } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {

  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.replace("/login")
      return
    }
    setChecked(true)
  }, [router])

  const handleLogout = () => {

  localStorage.removeItem("token")
  localStorage.removeItem("name")
  localStorage.removeItem("email")

  router.push("/login")

}

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen relative">
      <AppSidebar />
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 flex items-center gap-2 bg-card/80 hover:bg-destructive/10 border border-black/10 hover:border-destructive/30 text-muted-foreground hover:text-destructive px-4 py-2 rounded-xl z-50 text-sm font-medium backdrop-blur-xl transition-all"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>

      <main className="flex-1 overflow-auto relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
        {/* Help Button */}
        <button className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-card border border-black/10 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 backdrop-blur-xl transition-all shadow-sm">
          <HelpCircle className="w-5 h-5" />
        </button>
      </main>
    </div>
  )
}
