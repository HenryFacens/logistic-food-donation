import { useEffect } from 'react'
import { AppIcon, LottiePlayer } from '../../../shared/ui'
import successAnimation from '../animations/success.json'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'

export interface Celebration {
  id: number
  points: number
  subtitle: string
  title: string
}

const VISIBLE_MS = 2_200

function CelebrationPoints({ points }: { points: number }) {
  const shown = useAnimatedNumber(points, 700, 0)
  return (
    <strong className="success-burst__points metric-value">
      <AppIcon name="star" size={18} />+{Math.round(shown)} pts
    </strong>
  )
}

/** Short, non-blocking confirmation with a Lottie check and the points earned. */
export function SuccessBurst({
  celebration,
  onDone,
}: {
  celebration: Celebration | null
  onDone(): void
}) {
  useEffect(() => {
    if (!celebration) return
    const timer = window.setTimeout(onDone, VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [celebration, onDone])

  if (!celebration) return null
  return (
    <output className="success-burst" key={celebration.id} aria-live="polite">
      <div className="success-burst__card">
        <LottiePlayer animationData={successAnimation} className="success-burst__lottie" />
        <strong className="success-burst__title">{celebration.title}</strong>
        <span className="success-burst__subtitle">{celebration.subtitle}</span>
        {celebration.points > 0 ? <CelebrationPoints points={celebration.points} /> : null}
      </div>
    </output>
  )
}
