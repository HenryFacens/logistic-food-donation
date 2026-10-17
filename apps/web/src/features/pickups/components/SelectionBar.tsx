import type { CSSProperties } from 'react'
import { AppIcon, Button } from '../../../shared/ui'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { formatKg, type SelectionTotals } from '../viewModels'

interface SelectionBarProps {
  busy: boolean
  capacityKg: number | undefined
  capacityMessage: string | null
  onAccept(): void
  onClear(): void
  summary: string
  totals: SelectionTotals
}

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export function SelectionBar({
  busy,
  capacityKg,
  capacityMessage,
  onAccept,
  onClear,
  summary,
  totals,
}: SelectionBarProps) {
  const weight = useAnimatedNumber(totals.weightKg)
  const points = useAnimatedNumber(totals.points)
  const exceeds = Boolean(capacityMessage)
  const load = capacityKg ? Math.min(totals.weightKg / capacityKg, 1) : 0
  const loadTone = exceeds ? 'danger' : load >= 0.8 ? 'warning' : 'ok'

  return (
    <section className="selection-bar" aria-label="Entregas selecionadas">
      <div className="selection-bar__inner" data-exceeds={exceeds}>
        <span className="sr-only" aria-live="polite">{summary}</span>
        <div className="selection-bar__stats" aria-hidden="true">
          <span>
            <AppIcon name="package" size={18} />
            <b className="metric-value">{totals.count}</b>
            {totals.count === 1 ? 'entrega' : 'entregas'}
          </span>
          <span>
            <b className="metric-value">{decimal.format(weight)}</b> kg
          </span>
          <span className="selection-bar__points">
            <AppIcon name="star" size={16} />
            <b className="metric-value">+{Math.round(points)}</b> pts
          </span>
        </div>

        {capacityKg ? (
          <div className="capacity-meter" data-tone={loadTone}>
            <AppIcon name="truck" size={20} />
            <span className="capacity-meter__track" aria-hidden="true">
              <span style={{ '--load': load } as CSSProperties} />
            </span>
            <span className="capacity-meter__label metric-value">
              {decimal.format(weight)}/{formatKg(capacityKg)}
            </span>
          </div>
        ) : null}

        {capacityMessage ? (
          <p className="selection-bar__warning" role="alert">
            <AppIcon name="warning" size={16} />
            {capacityMessage}
          </p>
        ) : null}

        <div className="selection-bar__actions">
          <Button disabled={busy} onClick={onClear} variant="ghost">
            Limpar
          </Button>
          <Button
            className="selection-bar__accept"
            data-busy={busy}
            disabled={busy || exceeds}
            icon={busy ? 'refresh' : 'truck'}
            onClick={onAccept}
            variant="primary"
          >
            {busy ? 'Aceitando…' : 'Aceitar entregas'}
          </Button>
        </div>
      </div>
    </section>
  )
}
