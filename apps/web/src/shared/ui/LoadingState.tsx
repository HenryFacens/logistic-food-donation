interface LoadingStateProps {
  label?: string
}

export function LoadingState({ label = 'Carregando' }: LoadingStateProps) {
  return (
    <output className="loading-state" aria-live="polite">
      <span className="loading-state__spinner" aria-hidden="true" />
      <span>{label}</span>
    </output>
  )
}
