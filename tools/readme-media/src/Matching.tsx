import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { Captions, Chip, Header, Screen, Stage, fadeIn, fadeOut, theme, usePop } from './ui'

// The real ranking for this donation in the running app.
const RANKING = [
  { name: 'Instituto Prato Solidário', score: 93, detail: 'Asked for pão francês · covers ~20 of 60 · 1.5 km', reason: '“Pão francês fresco, ideal para o café das crianças.”' },
  { name: 'Rede Barra de Alimentos', score: 74, detail: 'Asked for pão francês · 13 km', reason: '“Serve ao café comunitário; cobre 20 das 40.”' },
  { name: 'Mesa para Todos', score: 53, detail: 'Asked for cake for a party', reason: '“Pão francês não é bolo ou doce para festa.”' },
  { name: 'Casa Acolhedora', score: 49, detail: 'Asked for sliced bread', reason: '' },
  { name: 'Sementes do Amanhã', score: 46, detail: 'Asked for whole milk', reason: '' },
]

const REQUESTS = [
  { ngo: 'Instituto Prato Solidário', item: 'Pão francês', amount: '60 units' },
  { ngo: 'Mesa para Todos', item: 'Bolo ou doces para festa', amount: '6 kg' },
  { ngo: 'Sementes do Amanhã', item: 'Leite integral', amount: '40 units' },
]

function Setup() {
  const frame = useCurrentFrame()
  const opacity = fadeOut(frame, 120, 12)
  const donation = usePop(4)
  return (
    <div style={{ opacity }}>
      <div
        style={{
          position: 'absolute',
          left: 36,
          top: 96,
          width: 330,
          padding: 16,
          borderRadius: 18,
          background: theme.surface,
          border: `2px solid ${theme.green}`,
          boxShadow: '0 14px 36px rgba(18, 38, 30, 0.14)',
          opacity: donation,
          transform: `translateY(${(1 - donation) * 16}px)`,
        }}
      >
        <div style={{ fontSize: 14, color: theme.muted, fontWeight: 600, marginBottom: 8 }}>NEW DONATION · Padaria Cambuí</div>
        <div style={{ display: 'flex', gap: 14 }}>
          <Img src={staticFile('bread.jpg')} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 12 }} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15 }}>Pães franceses do dia</div>
            <div style={{ fontSize: 16, color: theme.muted, marginTop: 6 }}>20 units · 1 kg · good for ~24h</div>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 410, top: 92, width: 510 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, opacity: fadeIn(frame, 18) }}>
          NGO requests: item and amount
        </div>
        {REQUESTS.map((request, index) => {
          const pop = usePop(24 + index * 12)
          return (
            <div
              key={request.ngo}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                marginBottom: 10,
                borderRadius: 14,
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                opacity: pop,
                transform: `translateX(${(1 - pop) * 30}px)`,
              }}
            >
              <div>
                <div style={{ fontSize: 19, fontWeight: 700 }}>{request.item}</div>
                <div style={{ fontSize: 15, color: theme.muted }}>{request.ngo}</div>
              </div>
              <Chip tone="neutral">{request.amount}</Chip>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Ranking() {
  const frame = useCurrentFrame()
  const opacity = Math.min(fadeIn(frame, 120, 12), fadeOut(frame, 272, 12))
  const grow = interpolate(frame, [134, 190], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{ position: 'absolute', left: 36, top: 84, width: 888, opacity }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Chip style={{ fontSize: 15 }}>1 · Rules: radius, ETA vs shelf life, hours, category, safety</Chip>
        <Chip style={{ fontSize: 15 }} tone="ai">2 · Claude rates each request</Chip>
      </div>
      {RANKING.map((row, index) => {
        const width = (row.score / 100) * 420 * grow
        const top = index === 0
        return (
          <div key={row.name} style={{ display: 'grid', gridTemplateColumns: '250px 440px 1fr', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>
                #{index + 1} {row.name}
              </div>
              <div style={{ fontSize: 13, color: theme.muted }}>{row.detail}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ height: 16, width, borderRadius: 999, background: top ? theme.green : '#9DB8AA' }} />
              <strong style={{ fontSize: 22, color: top ? theme.green : theme.ink }}>{Math.round(row.score * grow)}</strong>
            </div>
            <div style={{ fontSize: 14, fontStyle: 'italic', color: theme.muted, opacity: fadeIn(frame, 196 + index * 10) }}>
              {row.reason}
            </div>
          </div>
        )
      })}
      <div style={{ marginTop: 4, opacity: fadeIn(frame, 222) }}>
        <Chip tone="good">→ Offer goes to #1 · declined or no reply: the next NGO gets it</Chip>
      </div>
    </div>
  )
}

function NgoView() {
  const frame = useCurrentFrame()
  const enter = usePop(272)
  return (
    <div style={{ opacity: enter }}>
      <div style={{ position: 'absolute', left: 60, top: 84, transform: `translateY(${(1 - enter) * 30}px)` }}>
        <Screen height={340} scroll={300} src="m2-offer.png" width={280} />
      </div>
      <div style={{ position: 'absolute', left: 380, top: 96, width: 540 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>The NGO sees the score and why</div>
        <Screen height={250} src="m4-feed.png" style={{ opacity: fadeIn(frame, 292, 12) }} width={300} />
      </div>
    </div>
  )
}

export function Matching() {
  return (
    <Stage>
      <Header number="2" title="Matching supply and demand" />
      <Setup />
      <Ranking />
      <NgoView />
      <Captions
        steps={[
          { from: 0, to: 120, text: 'A donation comes in. NGOs have published exactly what they need, item and amount.' },
          { from: 120, to: 272, text: 'Rules decide who can receive it; Claude rates how well it answers each request. Score 0–100.' },
          { from: 272, to: 391, text: 'The best NGO gets the offer with the score broken down and Claude’s reason.' },
        ]}
      />
    </Stage>
  )
}
