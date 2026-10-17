import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { Captions, Chip, Header, Screen, Stage, fadeIn, fadeOut, usePop } from './ui'

// Values Claude returned for this photo in the running app.
const FIELDS: Array<{ label: string; tone: 'neutral' | 'good' | 'ai' | 'warn' }> = [
  { label: 'Padaria', tone: 'neutral' },
  { label: '≈ 20 unidades', tone: 'ai' },
  { label: '1 kg no total', tone: 'ai' },
  { label: '✓ Bom para doação', tone: 'good' },
  { label: 'Bom por ~24h', tone: 'good' },
  { label: 'R$ 18,00 / kg', tone: 'ai' },
  { label: 'Descarte R$ 1,50', tone: 'ai' },
]

function Photo() {
  const frame = useCurrentFrame()
  // A scanning band sweeps the photo while Claude "reads" it.
  const scan = interpolate(frame, [8, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const scanning = frame < 74
  return (
    <div style={{ position: 'absolute', left: 36, top: 84, width: 300, opacity: fadeIn(frame, 0, 10) }}>
      <div
        style={{
          position: 'relative',
          width: 300,
          height: 340,
          overflow: 'hidden',
          borderRadius: 20,
          boxShadow: '0 14px 36px rgba(18, 38, 30, 0.2)',
        }}
      >
        <Img src={staticFile('bread.jpg')} style={{ width: 300, height: 340, objectFit: 'cover' }} />
        {scanning ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: scan * 340 - 40,
              height: 40,
              background: 'linear-gradient(180deg, rgba(79,209,160,0) 0%, rgba(79,209,160,0.55) 70%, #4fd1a0 100%)',
            }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            left: 12,
            top: 12,
            padding: '6px 12px',
            borderRadius: 999,
            background: 'rgba(18, 38, 30, 0.82)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {scanning ? 'Claude Sonnet 5.5 is reading the photo…' : '✓ Photo analysed'}
        </div>
      </div>
    </div>
  )
}

function Extracted() {
  const frame = useCurrentFrame()
  const titlePop = usePop(62)
  const opacity = fadeOut(frame, 150, 12)
  return (
    <div style={{ position: 'absolute', left: 380, top: 96, width: 540, opacity }}>
      <div
        style={{
          fontSize: 34,
          fontWeight: 700,
          lineHeight: 1.15,
          marginBottom: 18,
          opacity: titlePop,
          transform: `translateY(${(1 - titlePop) * 12}px)`,
        }}
      >
        Pães franceses do dia
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {FIELDS.map((field, index) => (
          <PopChip delay={74 + index * 8} key={field.label} label={field.label} tone={field.tone} />
        ))}
      </div>
    </div>
  )
}

function PopChip({ delay, label, tone }: { delay: number; label: string; tone: 'neutral' | 'good' | 'ai' | 'warn' }) {
  const pop = usePop(delay, 12)
  return (
    <Chip style={{ opacity: pop, transform: `scale(${0.7 + pop * 0.3})` }} tone={tone}>
      {label}
    </Chip>
  )
}

function FilledForm() {
  const frame = useCurrentFrame()
  const enter = usePop(150)
  const swap = fadeIn(frame, 262, 14)
  const points = [
    'Quantity and unit',
    'Total weight (follows the quantity)',
    'Value per kg and disposal cost',
    'Category, description, shelf life',
  ]
  return (
    <div style={{ opacity: enter }}>
      <div style={{ position: 'absolute', left: 380, top: 84, transform: `translateX(${(1 - enter) * 40}px)` }}>
        <Screen height={340} src="v2-quantity.png" style={{ position: 'absolute', opacity: 1 - swap }} width={270} />
        <Screen height={340} src="v3-money.png" style={{ position: 'absolute', opacity: swap }} width={270} />
      </div>
      <div style={{ position: 'absolute', left: 680, top: 100, width: 250 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>The form comes filled in</div>
        {points.map((point, index) => {
          const show = fadeIn(frame, 172 + index * 14, 10)
          return (
            <div
              key={point}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, opacity: show }}
            >
              <Chip style={{ padding: '2px 8px', fontSize: 13 }} tone="ai">
                IA
              </Chip>
              <span style={{ fontSize: 16, lineHeight: 1.3 }}>{point}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ImageAnalysis() {
  return (
    <Stage>
      <Header number="1" title="Image analysis" />
      <Photo />
      <Extracted />
      <FilledForm />
      <Captions
        steps={[
          { from: 0, to: 74, text: 'The shop takes one photo of what is left over.' },
          { from: 74, to: 150, text: 'Claude identifies the food, amount, weight, shelf life, and whether it is safe to donate.' },
          { from: 150, to: 262, text: 'Fields arrive filled in and tagged IA. Change the quantity and the weight follows.' },
          { from: 262, to: 361, text: 'Even value and disposal cost. The shop checks and publishes; unsafe food is blocked.' },
        ]}
      />
    </Stage>
  )
}
