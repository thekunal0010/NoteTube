"use client"

import React, { useRef, useEffect } from "react"
import { motion, useInView, useMotionValue, useSpring } from "framer-motion"

export interface StatItem {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  label: string
  sublabel?: string
  bgColor?: string
  textColor?: string
  borderColor?: string
}

export interface Stats10Props {
  badge?: string
  title?: React.ReactNode
  description?: string
  stats?: StatItem[]
  className?: string
}

function StatCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })
  const motionVal = useMotionValue(0)
  const springVal = useSpring(motionVal, { damping: 28, stiffness: 85 })

  useEffect(() => {
    if (inView) {
      motionVal.set(value)
    }
  }, [inView, value, motionVal])

  useEffect(() => {
    return springVal.on("change", (latest) => {
      if (ref.current) {
        const formatted =
          decimals > 0
            ? latest.toFixed(decimals)
            : Math.round(latest).toLocaleString()
        ref.current.textContent = `${prefix}${formatted}${suffix}`
      }
    })
  }, [springVal, prefix, suffix, decimals])

  const initialText = `${prefix}${
    decimals > 0 ? (0).toFixed(decimals) : "0"
  }${suffix}`

  return (
    <span ref={ref} className="tabular-nums">
      {initialText}
    </span>
  )
}

const defaultStats: StatItem[] = [
  {
    value: 50,
    suffix: "K+",
    label: "Notes generated across college courses",
    sublabel: "98% conceptual accuracy",
    bgColor: "#fffdf8",
    textColor: "#2a241c",
    borderColor: "#e2d6bd",
  },
  {
    value: 10,
    suffix: "K+",
    label: "Lecture videos distilled into concise study kits",
    sublabel: "3.5x average study speedup",
    bgColor: "#1e1813",
    textColor: "#fdf6ec",
    borderColor: "#382d23",
  },
  {
    value: 100,
    suffix: "K+",
    label: "Active-recall flashcards & quiz items created",
    sublabel: "Spaced-repetition ready",
    bgColor: "#bd5b2c",
    textColor: "#fffdf8",
    borderColor: "#a6491e",
  },
  {
    value: 25,
    suffix: "K+",
    label: "Active students studying with NoteTube AI",
    sublabel: "Across 140+ institutions",
    bgColor: "#ede1c8",
    textColor: "#2a241c",
    borderColor: "#dcceb0",
  },
]

export function Stats10({
  badge = "Measurable Learning Impact",
  title = (
    <>
      Built for students <br className="hidden sm:inline" />
      who study <span className="font-serif italic font-normal text-primary">relentlessly</span>
    </>
  ),
  description = "NoteTube AI transforms passive video watching into active, high-yield academic retention across thousands of lectures every day.",
  stats = defaultStats,
  className = "",
}: Stats10Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inView = useInView(containerRef, { once: true, margin: "-50px" })

  return (
    <section
      ref={containerRef}
      className={`relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden ${className}`}
    >
      {/* Header section */}
      <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
        {badge && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold uppercase tracking-[0.15em] mb-4">
            <span>{badge}</span>
          </div>
        )}

        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.12]">
          {title}
        </h2>

        {description && (
          <p className="mt-4 text-base sm:text-lg text-foreground/70 max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* 4 Color-Blocked Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, idx) => {
          const isHexBg = stat.bgColor?.startsWith("#")
          const isHexText = stat.textColor?.startsWith("#")
          const isHexBorder = stat.borderColor?.startsWith("#")

          return (
            <motion.div
              key={stat.label + idx}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              transition={{
                duration: 0.55,
                delay: idx * 0.1,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              style={{
                backgroundColor: isHexBg ? stat.bgColor : undefined,
                color: isHexText ? stat.textColor : undefined,
                borderColor: isHexBorder ? stat.borderColor : undefined,
              }}
              className={`group relative rounded-[28px] sm:rounded-[32px] p-7 sm:p-9 min-h-[300px] sm:min-h-[340px] lg:min-h-[360px] flex flex-col justify-between border shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md ${
                !isHexBg ? stat.bgColor || "bg-card" : ""
              } ${!isHexText ? stat.textColor || "text-foreground" : ""} ${
                !isHexBorder ? stat.borderColor || "border-border" : ""
              }`}
            >
              {/* Top: Large count-up stat number */}
              <div className="pt-1">
                <div className="text-5xl sm:text-6xl font-bold tracking-tight leading-none">
                  <StatCounter
                    value={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    decimals={stat.decimals}
                  />
                </div>
              </div>

              {/* Bottom: Supporting label */}
              <div className="mt-8">
                <p className="text-sm sm:text-base font-medium leading-snug opacity-90 max-w-[220px]">
                  {stat.label}
                </p>
                {stat.sublabel && (
                  <p className="text-xs opacity-70 mt-1 font-normal">
                    {stat.sublabel}
                  </p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

export default Stats10
