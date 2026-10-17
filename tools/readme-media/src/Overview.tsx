import { useCurrentFrame } from 'remotion'
import { Captions, Screen, Stage, fadeIn, fadeOut, theme, usePop } from './ui'

const STEPS = [
  { number: '1', title: 'Photo → donation', line: 'Claude reads the photo and fills the form', src: 'v1-result.png', height: 200, scroll: 0 },
  { number: '2', title: 'The right NGO', line: 'Rules + Claude score every NGO request', src: 'm3-score.png', height: 178, scroll: 0 },
  { number: '3', title: 'On the driver’s way', line: 'Deliveries ranked by minutes added to a trip', src: 'r3-map.png', height: 180, scroll: 0 },
]

function Title() {
  const frame = useCurrentFrame()
  const pop = usePop(0, 18)
  const opacity = fadeOut(frame, 74, 12)
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity }}>
      <div style={{ textAlign: 'center', transform: `scale(${0.92 + pop * 0.08})`, opacity: pop }}>
        <div style={{ fontSize: 76, fontWeight: 700, color: theme.green, letterSpacing: -1.5 }}>Resgata</div>
        <div style={{ fontSize: 26, marginTop: 8 }}>Surplus food → the right NGO → a driver already on the way</div>
      </div>
    </div>
  )
}

function Step({ index }: { index: number }) {
  const step = STEPS[index]!
  const pop = usePop(78 + index * 26)
  return (
    <div
      style={{
        position: 'absolute',
        top: 70,
        left: 36 + index * 304,
        width: 280,
        opacity: pop,
        transform: `translateY(${(1 - pop) * 24}px)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 16, background: theme.green, color: '#fff', fontWeight: 700 }}>
          {step.number}
        </span>
        <span style={{ fontSize: 22, fontWeight: 700 }}>{step.title}</span>
      </div>
      <div style={{ fontSize: 15, color: theme.muted, marginBottom: 12, minHeight: 40 }}>{step.line}</div>
      <Screen height={step.height} scroll={step.scroll} src={step.src} width={280} />
    </div>
  )
}

export function Overview() {
  const frame = useCurrentFrame()
  return (
    <Stage>
      <Title />
      <div style={{ opacity: fadeIn(frame, 74, 10) }}>
        {STEPS.map((step, index) => (
          <Step index={index} key={step.number} />
        ))}
      </div>
      <Captions
        steps={[
          { from: 84, to: 301, text: 'Shop, NGO and driver in one loop, confirmed with 6-digit codes at pickup and delivery.' },
        ]}
      />
    </Stage>
  )
}
