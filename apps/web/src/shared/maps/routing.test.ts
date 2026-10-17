import { describe, expect, it } from 'vitest'
import { parseOsrmRoute } from './routing'

describe('parseOsrmRoute', () => {
  it('reads the driving distance and the road geometry', () => {
    expect(
      parseOsrmRoute({
        code: 'Ok',
        routes: [
          {
            distance: 1480,
            duration: 210,
            geometry: {
              coordinates: [
                [-47.0612, -22.9071],
                [-47.0606, -22.9008],
              ],
              type: 'LineString',
            },
          },
        ],
      }),
    ).toEqual({
      distanceKm: 1.48,
      durationMinutes: 4,
      path: [
        [-22.9071, -47.0612],
        [-22.9008, -47.0606],
      ],
    })
  })

  it('ignores an empty routing response', () => {
    expect(parseOsrmRoute({ code: 'NoRoute', routes: [] })).toBeNull()
  })
})
