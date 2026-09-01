"use client"

import { motion, useReducedMotion, type Variants } from "framer-motion"

interface RevealProps {
  children: React.ReactNode
  className?: string
  id?: string
  delay?: number
  y?: number
  /** Stagger child elements marked with the `revealItem` variant. */
  stagger?: number
  as?: "div" | "section"
}

const container = (delay: number, y: number, stagger: number): Variants => ({
  hidden: {},
  show: {
    transition: {
      delayChildren: delay,
      staggerChildren: stagger,
    },
  },
})

export const revealItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
}

/**
 * Fades + slides children up as they scroll into view. Pass `stagger` to
 * cascade direct motion children (wrap each with `<motion.div variants={revealItem}>`).
 */
export function Reveal({ children, className, id, delay = 0, y = 24, stagger = 0, as = "div" }: RevealProps) {
  const Component = motion[as]
  const reduceMotion = useReducedMotion()

  // Render plainly rather than animating. framer-motion drives opacity through
  // an inline style, so a CSS `prefers-reduced-motion` rule cannot override it
  // - the content would simply stay invisible.
  if (reduceMotion) {
    const Plain = as
    return (
      <Plain id={id} className={className}>
        {children}
      </Plain>
    )
  }

  if (stagger > 0) {
    return (
      <Component
        id={id}
        className={className}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={container(delay, y, stagger)}
      >
        {children}
      </Component>
    )
  }

  return (
    <Component
      id={id}
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Component>
  )
}
