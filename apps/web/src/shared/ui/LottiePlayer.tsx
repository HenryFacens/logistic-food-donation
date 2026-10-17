import { useEffect, useRef } from 'react'
import { classes } from '../utils/classes'

type LottieModule = typeof import('lottie-web/build/player/lottie_light')

let lottieModule: Promise<LottieModule> | null = null
// The light SVG player has no expression engine (no eval) and loads on demand,
// so screens without animations do not pay for it.
const loadLottie = () => {
  lottieModule ??= import('lottie-web/build/player/lottie_light')
  return lottieModule
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

interface LottiePlayerProps {
  animationData: object
  className?: string
  label?: string
  loop?: boolean
  onComplete?(): void
}

/**
 * Plays a Lottie animation. With reduced motion it renders the final frame,
 * so the illustration stays meaningful without movement.
 */
export function LottiePlayer({
  animationData,
  className,
  label,
  loop = false,
  onComplete,
}: LottiePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    let destroy: (() => void) | undefined

    void loadLottie().then(({ default: lottie }) => {
      if (cancelled) return
      const reduced = prefersReducedMotion()
      const animation = lottie.loadAnimation({
        animationData,
        autoplay: !reduced,
        container,
        loop: reduced ? false : loop,
        renderer: 'svg',
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
      })
      if (reduced) {
        animation.addEventListener('DOMLoaded', () => {
          animation.goToAndStop(animation.totalFrames - 1, true)
          onCompleteRef.current?.()
        })
      } else {
        animation.addEventListener('complete', () => onCompleteRef.current?.())
      }
      destroy = () => animation.destroy()
    })

    return () => {
      cancelled = true
      destroy?.()
    }
  }, [animationData, loop])

  return (
    <div
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={classes('lottie-player', className)}
      ref={containerRef}
      role={label ? 'img' : undefined}
    />
  )
}
