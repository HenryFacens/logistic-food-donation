import { env } from '../config/env'

export interface ParsedPlaceAddress {
  /** Place name for well-known places ("BCG São Paulo"). */
  name?: string
  city: string
  district: string
  line1: string
  location: { latitude: number; longitude: number }
  postalCode: string
  state: string
}

interface PhotonProperties {
  city?: string
  countrycode?: string
  county?: string
  district?: string
  housenumber?: string
  name?: string
  postcode?: string
  state?: string
  street?: string
}

export interface PhotonFeature {
  geometry?: { coordinates?: [number, number] }
  properties?: PhotonProperties
}

const STATE_BY_NAME: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amapá: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  ceará: 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  'espírito santo': 'ES',
  goias: 'GO',
  goiás: 'GO',
  maranhao: 'MA',
  maranhão: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  pará: 'PA',
  paraiba: 'PB',
  paraíba: 'PB',
  parana: 'PR',
  paraná: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  piauí: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  rondônia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  'são paulo': 'SP',
  sergipe: 'SE',
  sp: 'SP',
  tocantins: 'TO',
}

const formatPostalCode = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 8) return value.trim()
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

const stateCode = (value: string) => {
  const normalized = value.trim().toLowerCase()
  if (/^[a-z]{2}$/i.test(value.trim())) return value.trim().toUpperCase()
  return STATE_BY_NAME[normalized] ?? value.trim()
}

export const parsePhotonFeature = (feature: PhotonFeature): ParsedPlaceAddress | null => {
  const [longitude, latitude] = feature.geometry?.coordinates ?? []
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  const properties = feature.properties ?? {}
  if (properties.countrycode && properties.countrycode.toUpperCase() !== 'BR') return null

  const street = properties.street || properties.name || ''
  const line1 = [street, properties.housenumber].filter(Boolean).join(', ')
  if (!line1) return null

  return {
    city: properties.city || properties.county || '',
    district: properties.district || '',
    line1,
    location: { latitude: latitude ?? 0, longitude: longitude ?? 0 },
    postalCode: formatPostalCode(properties.postcode || ''),
    state: stateCode(properties.state || ''),
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * Well-known places people type by name. Street search does not know "bcg"
 * or "usp", so these come first when the text matches.
 */
const LANDMARKS: ReadonlyArray<ParsedPlaceAddress & { aliases: readonly string[] }> = [
  {
    aliases: ['bcg', 'boston consulting', 'bcg sao paulo', 'bcg são paulo'],
    name: 'BCG São Paulo',
    line1: 'Avenida Brigadeiro Faria Lima, 3732',
    district: 'Itaim Bibi',
    city: 'São Paulo',
    state: 'SP',
    postalCode: '04538-132',
    location: { latitude: -23.5881923, longitude: -46.682234 },
  },
  {
    aliases: ['usp', 'universidade de sao paulo', 'universidade de são paulo', 'cidade universitaria', 'cidade universitária'],
    name: 'USP · Cidade Universitária',
    line1: 'Avenida Professor Luciano Gualberto, 315',
    district: 'Butantã',
    city: 'São Paulo',
    state: 'SP',
    postalCode: '05508-010',
    location: { latitude: -23.5629763, longitude: -46.7224134 },
  },
  {
    aliases: ['unicamp', 'universidade estadual de campinas'],
    name: 'Unicamp',
    line1: 'Cidade Universitária Zeferino Vaz',
    district: 'Barão Geraldo',
    city: 'Campinas',
    state: 'SP',
    postalCode: '13083-970',
    location: { latitude: -22.8172, longitude: -47.0698 },
  },
]

const normalize = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')

/** Landmarks whose name or alias starts with the typed text. */
export const matchLandmarks = (query: string): ParsedPlaceAddress[] => {
  const typed = normalize(query)
  if (typed.length < 2) return []
  return LANDMARKS.filter(
    (place) =>
      place.aliases.some((alias) => normalize(alias).startsWith(typed)) ||
      normalize(place.name ?? '').startsWith(typed),
  ).map(({ aliases: _aliases, ...place }) => place)
}

/** Azure Maps suggestions through our API; Photon is the fallback. */
export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<ParsedPlaceAddress[]> {
  const landmarks = matchLandmarks(query)
  const found = await searchStreets(query, signal)
  return [...landmarks, ...found]
}

async function searchStreets(
  query: string,
  signal?: AbortSignal,
): Promise<ParsedPlaceAddress[]> {
  try {
    const response = await fetch(
      `${env.apiBaseUrl}/maps/search?q=${encodeURIComponent(query)}`,
      { signal },
    )
    if (response.ok) {
      const body: unknown = await response.json()
      if (isRecord(body) && Array.isArray(body.items)) {
        return body.items.filter(isRecord).map((item) => ({
          city: String(item.city ?? ''),
          district: String(item.district ?? ''),
          line1: String(item.line1 ?? ''),
          location: {
            latitude: Number(isRecord(item.location) ? item.location.latitude : 0),
            longitude: Number(isRecord(item.location) ? item.location.longitude : 0),
          },
          postalCode: String(item.postalCode ?? ''),
          state: String(item.state ?? ''),
        }))
      }
    }
  } catch (error) {
    if (signal?.aborted) throw error
  }
  return searchPhoton(query, signal)
}

async function searchPhoton(
  query: string,
  signal?: AbortSignal,
): Promise<ParsedPlaceAddress[]> {
  const params = new URLSearchParams({
    lang: 'pt',
    lat: '-22.9056',
    limit: '6',
    lon: '-47.0608',
    q: query,
  })
  const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal })
  if (!response.ok) return []
  const body: unknown = await response.json()
  if (!isRecord(body) || !Array.isArray(body.features)) return []
  return body.features.flatMap((feature) => {
    if (!isRecord(feature)) return []
    const coordinates = isRecord(feature.geometry) ? feature.geometry.coordinates : null
    const parsed = parsePhotonFeature({
      geometry: {
        coordinates: Array.isArray(coordinates)
          ? [Number(coordinates[0]), Number(coordinates[1])]
          : undefined,
      },
      properties: isRecord(feature.properties)
        ? (feature.properties as PhotonProperties)
        : undefined,
    })
    return parsed ? [parsed] : []
  })
}
