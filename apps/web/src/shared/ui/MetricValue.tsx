import { classes } from '../utils/classes'

const NUMERIC_PART = /^(.*?)(-?\d[\d.,]*)(.*)$/s

/**
 * Renders the numeric part of a formatted metric in the mono face and keeps
 * prefixes or units ("R$", "kg", "doações") in the body face.
 */
export function splitMetric(value: string | number) {
  const text = String(value)
  const match = NUMERIC_PART.exec(text)
  if (!match) return { number: '', prefix: text, suffix: '' }
  return { number: match[2], prefix: match[1].trim(), suffix: match[3].trim() }
}

export function MetricValue({
  className,
  value,
}: {
  className?: string
  value: string | number
}) {
  const { number, prefix, suffix } = splitMetric(value)
  return (
    <span className={classes('metric', className)}>
      {prefix ? <span className="metric-unit metric-unit--prefix">{prefix}</span> : null}
      {number ? <span className="metric-value">{number}</span> : null}
      {suffix ? <span className="metric-unit">{suffix}</span> : null}
    </span>
  )
}
