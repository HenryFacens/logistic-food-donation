import type { MetricEvidence } from '@resgata/shared'
import { evidenceOrder, evidencePresentation } from './evidence'
import './dashboard.css'

export interface EvidenceLegendProps {
  evidence?: MetricEvidence[]
  label?: string
}

export function EvidenceLegend({
  evidence = evidenceOrder,
  label = 'Como interpretar os valores',
}: EvidenceLegendProps) {
  const uniqueEvidence = [...new Set(evidence)]

  return (
    <aside className="evidence-legend" aria-label={label}>
      <span className="evidence-legend__title">{label}</span>
      <ul className="evidence-legend__list">
        {uniqueEvidence.map((item) => {
          const presentation = evidencePresentation[item]

          return (
            <li className="evidence-legend__item" data-evidence={item} key={item}>
              <span className="evidence-legend__marker" aria-hidden="true" />
              <span>
                <strong>{presentation.label}</strong>
                <span>{presentation.description}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
