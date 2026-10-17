import { loadFont } from '@remotion/google-fonts/Lexend'
import type { CSSProperties, ReactNode } from 'react'
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

const { fontFamily } = loadFont('normal', { weights: ['400', '500', '600', '700'] })

/** The app's own tokens, so the animations look like Resgata. */
export const theme = {
  canvas: '#F2F5F1',
  surface: '#FFFFFF',
  raised: '#EAF0EB',
  ink: '#12261E',
  muted: '#4A5E55',
  border: '#D5DFD8',
  green: '#0B7A5A',
  greenDark: '#08664B',
  sun: '#F2B705',
  tomato: '#C8442C',
  info: '#1D6FB8',
  font: fontFamily,
}

export const fadeIn = (frame: number, start: number, length = 12) =>
  interpolate(frame, [start, start + length], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

export const fadeOut = (frame: number, end: number, length = 10) =>
  interpolate(frame, [end - length, end], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

/** 0 → 1 spring starting at `start`. */
export const usePop = (start: number, damping = 14) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: frame - start, fps, config: { damping } })
}

export function Stage({ children }: { children: ReactNode }) {
  return (
    <AbsoluteFill
      style={{
        background: theme.canvas,
        color: theme.ink,
        fontFamily: theme.font,
      }}
    >
      {children}
    </AbsoluteFill>
  )
}

/** Small numbered heading at the top-left. */
export function Header({ number, title }: { number?: string; title: string }) {
  const frame = useCurrentFrame()
  return (
    <div
      style={{
        position: 'absolute',
        top: 26,
        left: 36,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity: fadeIn(frame, 0, 10),
      }}
    >
      {number ? (
        <span
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 34,
            height: 34,
            borderRadius: 17,
            background: theme.green,
            color: '#fff',
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          {number}
        </span>
      ) : null}
      <span style={{ fontSize: 24, fontWeight: 700 }}>{title}</span>
      <span style={{ fontSize: 16, color: theme.muted, marginLeft: 6 }}>Resgata</span>
    </div>
  )
}

export interface CaptionStep {
  from: number
  to: number
  text: string
}

/** One caption at a time along the bottom, matched to the scene. */
export function Captions({ steps }: { steps: readonly CaptionStep[] }) {
  const frame = useCurrentFrame()
  const current = steps.find((step) => frame >= step.from && frame < step.to)
  if (!current) return null
  const opacity = Math.min(fadeIn(frame, current.from, 8), fadeOut(frame, current.to, 8))
  return (
    <div
      style={{
        position: 'absolute',
        left: 36,
        right: 36,
        bottom: 22,
        padding: '12px 18px',
        borderRadius: 14,
        background: theme.ink,
        color: '#fff',
        fontSize: 19,
        fontWeight: 500,
        lineHeight: 1.3,
        opacity,
        transform: `translateY(${(1 - opacity) * 8}px)`,
      }}
    >
      {current.text}
    </div>
  )
}

/**
 * A real app screen in a rounded card. `scroll` moves the screenshot up by
 * that many source pixels (screens are captured at 2x).
 */
export function Screen({
  src,
  width,
  height,
  scroll = 0,
  style,
}: {
  src: string
  width: number
  height: number
  scroll?: number
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        width,
        height,
        overflow: 'hidden',
        borderRadius: 18,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        boxShadow: '0 14px 36px rgba(18, 38, 30, 0.16)',
        ...style,
      }}
    >
      <Img
        src={staticFile(src)}
        style={{ width, display: 'block', transform: `translateY(${-scroll}px)` }}
      />
    </div>
  )
}

export function Chip({
  children,
  tone = 'neutral',
  style,
}: {
  children: ReactNode
  tone?: 'neutral' | 'good' | 'ai' | 'warn'
  style?: CSSProperties
}) {
  const colors = {
    neutral: { bg: theme.surface, fg: theme.ink, border: theme.border },
    good: { bg: '#E3F1EA', fg: '#165E34', border: '#BFDFCC' },
    ai: { bg: '#E3EEF8', fg: '#15558E', border: '#C4DBF0' },
    warn: { bg: '#FBF0D2', fg: '#744800', border: '#F0D78A' },
  }[tone]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 999,
        background: colors.bg,
        color: colors.fg,
        border: `1px solid ${colors.border}`,
        fontSize: 18,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  )
}
