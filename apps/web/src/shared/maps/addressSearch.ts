export interface ParsedPlaceAddress {
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

export async function searchAddresses(
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
