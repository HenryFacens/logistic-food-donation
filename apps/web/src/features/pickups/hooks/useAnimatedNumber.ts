import { useEffect, useRef, useState } from 'react'

const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Eases from the previous value to the next one (ease-out cubic). */
export function useAnimatedNumber(value: number, durationMs = 450) {
  const [display, setDisplay] = useState(value)
  const currentRef = useRef(value)

  useEffect(() => {
    const from = currentRef.current
    if (from === value) return
    if (reducedMotion()) {
      currentRef.current = value
      const frame = requestAnimationFrame(() => setDisplay(value))
      return () => cancelAnimationFrame(frame)
    }
    const startedAt = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs)
      const next = from + (value - from) * (1 - (1 - progress) ** 3)
      currentRef.current = next
      setDisplay(next)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [durationMs, value])

  return display
}
