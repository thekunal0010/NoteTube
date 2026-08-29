interface MarqueeProps {
  children: React.ReactNode
  className?: string
}

/** Infinite horizontal scroll ticker. Renders children twice, back to back,
 *  and animates the whole track left by exactly 50% so the loop is seamless. */
export function Marquee({ children, className }: MarqueeProps) {
  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <div className="marquee-track">
        <div className="flex items-center gap-3 pr-3">{children}</div>
        <div className="flex items-center gap-3 pr-3" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  )
}
