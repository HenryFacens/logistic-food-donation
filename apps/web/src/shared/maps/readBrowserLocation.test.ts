import { describe, expect, it } from 'vitest'
import {
  BrowserLocationError,
  browserLocationMessage,
  readBrowserLocation,
} from './readBrowserLocation'

const position = (latitude: number, longitude: number) =>
  ({ coords: { latitude, longitude } }) as GeolocationPosition

const geolocationError = (code: number) => ({ code }) as GeolocationPositionError

describe('browser location', () => {
  it('reads a high-accuracy fix when the browser returns one', async () => {
    const calls: PositionOptions[] = []
    const geolocation = {
      getCurrentPosition(success: PositionCallback, _error?: PositionErrorCallback, options?: PositionOptions) {
        calls.push(options ?? {})
        success(position(-22.9, -47.06))
      },
    }

    await expect(readBrowserLocation(geolocation, true)).resolves.toEqual({
      latitude: -22.9,
      longitude: -47.06,
    })
    expect(calls[0]?.enableHighAccuracy).toBe(true)
  })

  it('retries without high accuracy after a timeout', async () => {
    const calls: PositionOptions[] = []
    const geolocation = {
      getCurrentPosition(success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) {
        calls.push(options ?? {})
        if (calls.length === 1) {
          error?.(geolocationError(3))
          return
        }
        success(position(-22.91, -47.07))
      },
    }

    await expect(readBrowserLocation(geolocation, true)).resolves.toEqual({
      latitude: -22.91,
      longitude: -47.07,
    })
    expect(calls.map((options) => options.enableHighAccuracy)).toEqual([true, false])
    expect(calls[1]?.timeout).toBeGreaterThan(calls[0]?.timeout ?? 0)
  })

  it('does not retry when permission is denied', async () => {
    let calls = 0
    const geolocation = {
      getCurrentPosition(_success: PositionCallback, error?: PositionErrorCallback) {
        calls += 1
        error?.(geolocationError(1))
      },
    }

    await expect(readBrowserLocation(geolocation, true)).rejects.toMatchObject({ reason: 'denied' })
    expect(calls).toBe(1)
    expect(browserLocationMessage('denied')).toBe(
      'GPS não autorizado. Será usado o ponto cadastrado.',
    )
    expect(browserLocationMessage('timeout')).not.toContain('não autorizado')
  })

  it('explains an insecure page without asking for a position', async () => {
    let calls = 0
    const geolocation = {
      getCurrentPosition() {
        calls += 1
      },
    }

    await expect(readBrowserLocation(geolocation, false)).rejects.toBeInstanceOf(BrowserLocationError)
    expect(calls).toBe(0)
    expect(browserLocationMessage('insecure')).toContain('HTTPS')
  })
})
