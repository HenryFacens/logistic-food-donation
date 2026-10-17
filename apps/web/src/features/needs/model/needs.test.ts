import { describe, expect, it } from 'vitest'
import { defaultNeedDeadline, formatDeadline, needProgress } from './needs'

describe('needs view model', () => {
  const now = new Date(2026, 9, 16, 10, 0)

  it('describes deadlines relative to today', () => {
    expect(formatDeadline(new Date(2026, 9, 16, 18).toISOString(), now)).toBe('hoje')
    expect(formatDeadline(new Date(2026, 9, 17, 9).toISOString(), now)).toBe('amanhã')
    expect(formatDeadline(new Date(2026, 9, 20, 9).toISOString(), now)).toBe('20/10')
  })

  it('reports how much of a need has been covered', () => {
    expect(needProgress({ quantityKg: 20, remainingKg: 15 })).toBe(25)
  })

  it('defaults new needs to the evening after tomorrow', () => {
    expect(defaultNeedDeadline(now)).toEqual(new Date(2026, 9, 18, 20, 0))
  })
})
