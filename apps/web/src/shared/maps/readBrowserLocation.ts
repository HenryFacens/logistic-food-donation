import type { GeoPoint } from '@resgata/shared'

export type BrowserLocationReason =
  | 'denied'
  | 'insecure'
  | 'timeout'
  | 'unavailable'
  | 'unsupported'

export class BrowserLocationError extends Error {
  readonly reason: BrowserLocationReason

  constructor(reason: BrowserLocationReason) {
    super(reason)
    this.name = 'BrowserLocationError'
    this.reason = reason
  }
}

export const browserLocationMessage = (reason: BrowserLocationReason) => {
  if (reason === 'insecure') {
    return 'O GPS exige HTTPS. Será usado o ponto cadastrado.'
  }
  if (reason === 'unsupported') {
    return 'GPS indisponível. Será usado o ponto cadastrado.'
  }
  if (reason === 'denied') {
    return 'GPS não autorizado. Será usado o ponto cadastrado.'
  }
  if (reason === 'timeout') {
    return 'O GPS demorou para responder. Será usado o ponto cadastrado.'
  }
  return 'Localização indisponível neste dispositivo. Será usado o ponto cadastrado.'
}

const reasonFor = (error: unknown): BrowserLocationReason => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? Number(error.code)
      : 0
  if (code === 1) return 'denied'
  if (code === 3) return 'timeout'
  return 'unavailable'
}

const requestPosition = (
  geolocation: Pick<Geolocation, 'getCurrentPosition'>,
  options: PositionOptions,
) =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    geolocation.getCurrentPosition(resolve, reject, options)
  })

export async function readBrowserLocation(
  geolocation: Pick<Geolocation, 'getCurrentPosition'> | null = typeof navigator ===
  'undefined'
    ? null
    : navigator.geolocation,
  secure = typeof window === 'undefined' ? true : window.isSecureContext,
): Promise<GeoPoint> {
  if (!secure) throw new BrowserLocationError('insecure')
  if (!geolocation) throw new BrowserLocationError('unsupported')

  try {
    const position = await requestPosition(geolocation, {
      enableHighAccuracy: true,
      maximumAge: 30_000,
      timeout: 12_000,
    }).catch(async (error: unknown) => {
      if (reasonFor(error) === 'denied') throw new BrowserLocationError('denied')
      return requestPosition(geolocation, {
        enableHighAccuracy: false,
        maximumAge: 300_000,
        timeout: 20_000,
      })
    })
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    }
  } catch (error) {
    if (error instanceof BrowserLocationError) throw error
    throw new BrowserLocationError(reasonFor(error))
  }
}
