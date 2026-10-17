import { describe, expect, it } from 'vitest'
import {
  parseDriverRatingDraft,
  withoutSimulationMarker,
} from './rating-view-model'

describe('driver rating view model', () => {
  it('removes repeated simulation markers from contextual display text', () => {
    expect(withoutSimulationMarker('Ana Souza SIMULADO')).toBe('Ana Souza')
    expect(withoutSimulationMarker('SIMULADO - doação histórica 01')).toBe(
      'doação histórica 01',
    )
  })

  it('requires a score before creating the API request', () => {
    expect(
      parseDriverRatingDraft({
        comment: '',
        rating: null,
        tags: [],
      }),
    ).toEqual({ reason: 'rating-required', success: false })
  })

  it('trims comments and removes duplicate tags', () => {
    expect(
      parseDriverRatingDraft({
        comment: '  Entrega cuidadosa.  ',
        rating: 5,
        tags: ['cuidado', 'cuidado', 'pontualidade'],
      }),
    ).toEqual({
      request: {
        comment: 'Entrega cuidadosa.',
        rating: 5,
        tags: ['cuidado', 'pontualidade'],
      },
      success: true,
    })
  })

  it('omits an empty optional comment', () => {
    expect(
      parseDriverRatingDraft({
        comment: '   ',
        rating: 4,
        tags: ['comunicação'],
      }),
    ).toEqual({
      request: {
        rating: 4,
        tags: ['comunicação'],
      },
      success: true,
    })
  })

  it('rejects values outside the shared contract', () => {
    expect(
      parseDriverRatingDraft({
        comment: '',
        rating: 6,
        tags: [],
      }),
    ).toEqual({ reason: 'invalid', success: false })
  })
})
