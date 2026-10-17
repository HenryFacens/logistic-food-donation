import type { DashboardSection } from '@resgata/shared'
import { useId } from 'react'
import { MetricGrid } from './MetricGrid'
import { MonthlySeriesBars } from './MonthlySeriesBars'
import './dashboard.css'

interface DashboardSectionViewProps {
  section: DashboardSection
}

function DashboardSectionView({ section }: DashboardSectionViewProps) {
  const generatedId = useId()
  const titleId = `${generatedId}-title`
  const detailId = section.detail ? `${generatedId}-detail` : undefined

  return (
    <section
      className="dashboard-section"
      aria-describedby={detailId}
      aria-labelledby={titleId}
    >
      <div className="dashboard-section__heading">
        <h2 id={titleId}>{section.title}</h2>
        {section.detail ? (
          <p className="dashboard-section__detail" id={detailId}>
            {section.detail}
          </p>
        ) : null}
      </div>

      {section.metrics.length > 0 ? (
        <MetricGrid
          ariaLabel={`Indicadores de ${section.title}`}
          metrics={section.metrics}
        />
      ) : null}

      {section.monthlySeries.length > 0 ? (
        <ul
          className="dashboard-monthly-series-grid"
          aria-label={`Séries mensais de ${section.title}`}
        >
          {section.monthlySeries.map((series) => (
            <li key={series.key}>
              <MonthlySeriesBars series={series} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export interface DashboardSectionsProps {
  emptyMessage?: string
  sections: DashboardSection[]
}

export function DashboardSections({
  emptyMessage = 'Nenhum indicador disponível para este período.',
  sections,
}: DashboardSectionsProps) {
  if (sections.length === 0) {
    return (
      <output className="dashboard-sections__empty">
        {emptyMessage}
      </output>
    )
  }

  return (
    <div className="dashboard-sections">
      {sections.map((section) => (
        <DashboardSectionView key={section.key} section={section} />
      ))}
    </div>
  )
}
