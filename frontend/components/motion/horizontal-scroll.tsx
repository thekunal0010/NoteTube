"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"

interface HorizontalScrollProps {
  children: React.ReactNode
  /** Rough number of items, used to size the pinned scroll section before measurement kicks in. */
  itemCount: number
}

/**
 * Pins the section while the user scrolls down, translating the horizontal
 * track left in sync with scroll progress. The classic scroll-jacked feature
 * gallery seen on interactive agency/portfolio sites.
 */
export function HorizontalScroll({ children, itemCount }: HorizontalScrollProps) {
  const targetRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [distance, setDistance] = useState(itemCount * 380)

  useEffect(() => {
    const measure = () => {
      if (trackRef.current) {
        setDistance(Math.max(trackRef.current.scrollWidth - window.innerWidth, 0))
      }
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  const { scrollYProgress } = useScroll({ target: targetRef, offset: ["start start", "end end"] })
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance])

  return (
    <section ref={targetRef} style={{ height: `${itemCount * 55}vh` }} className="relative">
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <motion.div ref={trackRef} style={{ x }} className="flex gap-6 pl-[6vw] pr-[6vw]">
          {children}
        </motion.div>
      </div>
    </section>
  )
}
