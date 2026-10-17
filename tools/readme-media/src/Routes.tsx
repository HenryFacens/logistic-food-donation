import { interpolate, useCurrentFrame } from 'remotion'
import { Captions, Chip, Header, Screen, Stage, fadeIn, fadeOut, theme, usePop } from './ui'

// Live Azure Maps result for BCG (Faria Lima) → USP, leaving 16:00.
const DIRECT_MINUTES = 13
const CANDIDATES = [
  { label: 'Hortifruti Butantã → Casa de Acolhida', minutes: 8, kind: 'way' as const },
  { label: 'Padaria Funchal → Cozinha Solidária', minutes: 10, kind: 'way' as const },
  { label: 'Empório Pinheiros → Instituto Rio Pequeno', minutes: 19, kind: 'detour' as const },
  { label: 'Doceria Vila Olímpia (pickup by 16:02)', minutes: null, kind: 'late' as const },
  { label: 'Atacado Mooca → Banco Santana', minutes: 77, kind: 'off' as const },
]
const STOPS = [
  ['16:00', 'Leave BCG São Paulo'],
  ['16:06', 'Pick up · Padaria Funchal'],
  ['16:20', 'Pick up · Hortifruti Butantã'],
  ['16:27', 'Drop off · Cozinha Solidária Butantã'],
  ['16:45', 'Drop off · Casa de Acolhida Butantã'],
  ['16:55', 'Arrive USP'],
]

function Trip() {
  const frame = useCurrentFrame()
  const enter = usePop(2)
  const opacity = fadeOut(frame, 100, 12)
  return (
    <div style={{ opacity }}>
      <div style={{ position: 'absolute', left: 60, top: 84, transform: `translateY(${(1 - enter) * 20}px)`, opacity: enter }}>
        <Screen height={340} src="r1-form.png" width={260} />
      </div>
      <div style={{ position: 'absolute', left: 380, top: 120, width: 540 }}>
        <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.15, opacity: fadeIn(frame, 14) }}>
          The driver is already going somewhere.
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', opacity: fadeIn(frame, 34) }}>
          <Chip>BCG Faria Lima</Chip>
          <Chip>→ USP</Chip>
          <Chip>16:00</Chip>
          <Chip tone="good">Direct trip: {DIRECT_MINUTES} min · 7 km</Chip>
        </div>
      </div>
    </div>
  )
}

function Ranked() {
  const frame = useCurrentFrame()
  const opacity = Math.min(fadeIn(frame, 100, 12), fadeOut(frame, 250, 12))
  const grow = interpolate(frame, [116, 170], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const color = { way: theme.green, detour: '#C79300', late: '#9AA8A0', off: theme.tomato }
  return (
    <div style={{ position: 'absolute', left: 36, top: 84, width: 888, opacity }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>
        Open deliveries, ranked by minutes added to the trip
      </div>
      {CANDIDATES.map((row, index) => (
        <div
          key={row.label}
          style={{
            display: 'grid',
            gridTemplateColumns: '360px 1fr',
            alignItems: 'center',
            gap: 14,
            marginBottom: 12,
            opacity: fadeIn(frame, 108 + index * 6),
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 600 }}>{row.label}</div>
          {row.minutes === null ? (
            <Chip style={{ justifySelf: 'start', fontSize: 15 }}>Não dá tempo: deadline before the car can get there</Chip>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  height: 18,
                  width: Math.max(6, (row.minutes / 80) * 300 * grow),
                  borderRadius: 999,
                  background: color[row.kind],
                }}
              />
              <strong style={{ fontSize: 20, color: color[row.kind] }}>+{Math.round(row.minutes * grow)} min</strong>
              {row.kind === 'off' ? <span style={{ fontSize: 15, color: theme.muted }}>wrong direction</span> : null}
            </div>
          )}
        </div>
      ))}
      <div style={{ opacity: fadeIn(frame, 186), marginTop: 6 }}>
        <Chip tone="good">The two on the way are combined automatically</Chip>
      </div>
    </div>
  )
}

function Combined() {
  const frame = useCurrentFrame()
  const enter = usePop(250)
  return (
    <div style={{ opacity: enter }}>
      <div style={{ position: 'absolute', left: 36, top: 84, transform: `scale(${0.94 + enter * 0.06})`, transformOrigin: 'top left' }}>
        <Screen height={300} src="r3-map.png" width={434} />
      </div>
      <div style={{ position: 'absolute', left: 500, top: 84, width: 430 }}>
        {STOPS.map(([time, label], index) => (
          <div
            key={label}
            style={{
              display: 'grid',
              gridTemplateColumns: '64px 1fr',
              gap: 10,
              marginBottom: 8,
              fontSize: 18,
              opacity: fadeIn(frame, 262 + index * 12, 8),
            }}
          >
            <strong style={{ color: theme.green }}>{time}</strong>
            <span>{label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, opacity: fadeIn(frame, 340) }}>
          <Chip>13 → 35 min (+22)</Chip>
          <Chip tone="good">2 deliveries · 52 kg</Chip>
          <Chip tone="warn">+122 pts</Chip>
        </div>
      </div>
    </div>
  )
}

export function Routes() {
  return (
    <Stage>
      <Header number="3" title="Route optimization for drivers" />
      <Trip />
      <Ranked />
      <Combined />
      <Captions
        steps={[
          { from: 0, to: 100, text: 'Like BlaBlaCar, not Uber: the driver enters the trip they already plan to make.' },
          { from: 100, to: 250, text: 'Each delivery is scored by real road minutes added, with deadlines checked from departure.' },
          { from: 250, to: 421, text: 'One optimized route: both pickups, both drop-offs, still ending at USP.' },
        ]}
      />
    </Stage>
  )
}
