"use client"

import React, { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Menu,
  X,
  ArrowRight,
  LayoutDashboard,
  LogOut,
  Sparkles,
} from "lucide-react"

export interface NavLinkItem {
  label: string
  href: string
  active?: boolean
}

export interface Navigation3Props {
  logo?: {
    src?: string
    alt?: string
    title?: string
    href?: string
  }
  links?: NavLinkItem[]
  isLoggedIn?: boolean
  onLogout?: () => void
  loginHref?: string
  signupHref?: string
  dashboardHref?: string
  className?: string
}

export function Navigation3({
  logo = {
    src: "/logo.png",
    alt: "NoteTube AI",
    title: "NoteTube AI",
    href: "/",
  },
  links = [
    { label: "How it works", href: "#features" },
    { label: "Recent Searches", href: "#recent-searches" },
    { label: "About", href: "#about" },
  ],
  isLoggedIn = false,
  onLogout,
  loginHref = "/login",
  signupHref = "/signup",
  dashboardHref = "/dashboard",
  className = "",
}: Navigation3Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${className}`}>
      {/* Frosted Warm Editorial Background */}
      <div className="absolute inset-0 bg-[#f4efe3]/85 dark:bg-[#1a1612]/85 backdrop-blur-md border-b border-[#e2d6bd] dark:border-[#382f25] shadow-xs" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* 1. Left: Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link
              href={logo.href || "/"}
              className="group flex items-center gap-2.5 focus:outline-none"
              aria-label={logo.title || "NoteTube AI Home"}
            >
              {logo.src ? (
                <div className="relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                  <img
                    src={logo.src}
                    alt={logo.alt || "Logo"}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : null}
              {logo.title ? (
                <span className="font-serif-display font-semibold text-lg sm:text-xl tracking-tight text-foreground transition-colors group-hover:text-primary">
                  {logo.title}
                </span>
              ) : null}
            </Link>
          </div>

          {/* 2. Center: Grouped Center Links */}
          <nav
            aria-label="Desktop primary"
            className="hidden md:flex items-center justify-center"
          >
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-card/80 border border-border/80 shadow-xs backdrop-blur-md">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wide uppercase transition-all duration-200 ${
                    link.active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* 3. Right: Auth Buttons & Mobile Menu Trigger */}
          <div className="flex items-center gap-3">
            {/* Desktop Auth Actions */}
            <div className="hidden sm:flex items-center gap-3">
              {isLoggedIn ? (
                <>
                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive px-3 py-2 rounded-lg transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  )}
                  <Link
                    href={dashboardHref}
                    className="gradient-button px-4 py-2 rounded-xl text-primary-foreground text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-2 shadow-xs hover:shadow-md transition-all"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={loginHref}
                    className="text-xs font-semibold tracking-wide uppercase text-foreground/80 hover:text-foreground px-3 py-2 rounded-lg transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href={signupHref}
                    className="group gradient-button px-5 py-2.5 rounded-full text-primary-foreground text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-2 shadow-xs hover:shadow-md transition-all"
                  >
                    <span>Start free</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05] border border-border/70 transition-colors focus:outline-none"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Mobile Menu Popover Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="md:hidden border-b border-border bg-[#fffdf8]/95 dark:bg-[#1a1612]/95 backdrop-blur-xl px-4 py-5 shadow-lg"
          >
            <div className="flex flex-col gap-2 max-w-sm mx-auto">
              {/* Grouped links */}
              <div className="flex flex-col gap-1 pb-3 border-b border-border/60">
                {links.map((link) => (
                  <Link
                    key={`mobile-${link.href}`}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Mobile Auth actions */}
              <div className="pt-2 flex flex-col gap-2">
                {isLoggedIn ? (
                  <>
                    <Link
                      href={dashboardHref}
                      onClick={() => setMobileMenuOpen(false)}
                      className="gradient-button text-center w-full py-2.5 rounded-xl text-primary-foreground text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Dashboard</span>
                    </Link>
                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => {
                          onLogout()
                          setMobileMenuOpen(false)
                        }}
                        className="w-full py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive flex items-center justify-center gap-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      href={loginHref}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-center py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      href={signupHref}
                      onClick={() => setMobileMenuOpen(false)}
                      className="gradient-button text-center py-2.5 rounded-xl text-primary-foreground text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <span>Start free</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export default Navigation3
