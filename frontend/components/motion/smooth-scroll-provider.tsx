"use client"

import { ReactLenis } from "lenis/react"

/**
 * Wraps the whole app in a single global Lenis instance so every page
 * (marketing site and the authenticated app alike) gets buttery inertia
 * scrolling instead of the browser's default stepped scroll.
 */
export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: true,
      }}
    >
      {children}
    </ReactLenis>
  )
}
