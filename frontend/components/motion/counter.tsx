"use client"

import { useEffect, useRef } from "react"
import { useInView, useMotionValue, useSpring } from "framer-motion"

interface CounterProps {
  /** Target value, e.g. 50 for "50K+" */
  value: number
  suffix?: string
  className?: string
}

export function Counter({ value, suffix = "", className }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { damping: 30, stiffness: 90 })

  useEffect(() => {
    if (inView) motionValue.set(value)
  }, [inView, value, motionValue])

  useEffect(() => {
    return spring.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = `${Math.round(latest)}${suffix}`
      }
    })
  }, [spring, suffix])

  return (
    <span ref={ref} className={className}>
      0{suffix}
    </span>
  )
}
