import type { MatchingScore } from '@resgata/shared'
import { scoreParts } from '../viewModels'

/** The matching score and what it is made of. */
export function ScoreBreakdown({ score }: { score: MatchingScore }) {
  return (
    <div className="score-breakdown">
      <div className="score-breakdown__total">
        <strong>{Math.round(score.total)}</strong>
        <span>
          de 100
          <small>combinação</small>
        </span>
      </div>
      <ul aria-label="Como a nota foi calculada">
        {scoreParts(score).map((item) => (
          <li key={item.label}>
            <span>
              {item.label} <small>peso {item.weight}%</small>
            </span>
            <span className="score-breakdown__track" aria-hidden="true">
              <span style={{ width: `${item.percent}%` }} />
            </span>
            <strong>{item.percent}%</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
