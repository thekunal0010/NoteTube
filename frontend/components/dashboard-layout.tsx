"use client"

import { AppSidebar } from "./app-sidebar"
import { HelpCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {

  const router = useRouter()

  const handleLogout = () => {

  localStorage.removeItem("token")
  localStorage.removeItem("name")
  localStorage.removeItem("email")

  router.push("/login")

}

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <button
  onClick={handleLogout}
  className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50"
>
  Logout
</button>

      <main className="flex-1 overflow-auto relative">
        {children}
        {/* Help Button */}
        <button className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/20 transition-all">
          <HelpCircle className="w-5 h-5" />
        </button>
      </main>
    </div>
  )
}
