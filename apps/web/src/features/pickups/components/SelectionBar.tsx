import { AppIcon, Button } from '../../../shared/ui'

interface SelectionBarProps {
  busy: boolean
  capacityMessage: string | null
  onAccept(): void
  onClear(): void
  summary: string
}

export function SelectionBar({
  busy,
  capacityMessage,
  onAccept,
  onClear,
  summary,
}: SelectionBarProps) {
  return (
    <section className="selection-bar" aria-label="Entregas selecionadas">
      <div className="selection-bar__inner">
        <strong className="selection-bar__summary metric-value" aria-live="polite">
          {summary}
        </strong>
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
            disabled={busy || Boolean(capacityMessage)}
            icon="check"
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
