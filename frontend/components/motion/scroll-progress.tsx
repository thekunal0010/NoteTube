"use client"

import { motion, useScroll, useSpring } from "framer-motion"

/** Thin accent progress bar pinned to the top of the viewport, tracking page scroll. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 })

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[2px] bg-[#bd5b2c] origin-left z-[60]"
    />
  )
}
