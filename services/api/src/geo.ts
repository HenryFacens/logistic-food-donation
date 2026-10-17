import type { Address, GeoPoint, GeocodeResult } from "@resgata/shared";
import { getConfig } from "./config.js";
import { ApiError } from "./errors.js";

const TIMEOUT_MS = 6000;
// Campinas centroid, used only for clearly labeled simulated results.
const SIMULATED_POINT: GeoPoint = { latitude: -22.9056, longitude: -47.0608 };
const UNKNOWN_POSTAL_CODE = "00000-000";

const formatCep = (digits: string) => `${digits.slice(0, 5)}-${digits.slice(5)}`;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "accept-language": "pt-BR",
      "user-agent": getConfig().GEO_USER_AGENT,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${new URL(url).host} returned ${response.status}`);
  }
  return (await response.json()) as T;
}

interface ViaCepResponse {
  erro?: boolean | string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

interface NominatimPlace {
  lat: string;
  lon: string;
  address?: {
    road?: string;
    pedestrian?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    postcode?: string;
    "ISO3166-2-lvl4"?: string;
  };
}

async function nominatimSearch(params: Record<string, string>) {
  const url = new URL("/search", getConfig().NOMINATIM_URL);
  for (const [key, value] of Object.entries({
    format: "jsonv2",
    countrycodes: "br",
    limit: "1",
    ...params,
  })) {
    url.searchParams.set(key, value);
  }
  const places = await fetchJson<NominatimPlace[]>(url.toString());
  const place = places[0];
  return place
    ? { latitude: Number(place.lat), longitude: Number(place.lon) }
    : null;
}

export async function lookupCep(rawCep: string): Promise<GeocodeResult> {
  const digits = rawCep.replace(/\D/g, "");
  if (digits.length !== 8) {
    throw new ApiError(422, "invalid_cep", "CEP inválido. Use 8 dígitos.");
  }
  const config = getConfig();
  if (config.GEO_PROVIDER === "simulated") return simulatedCep(digits);
  try {
    const cep = await fetchJson<ViaCepResponse>(
      `${config.VIACEP_URL.replace(/\/$/, "")}/${digits}/json/`,
    );
    if (cep.erro) {
      throw new ApiError(404, "cep_not_found", "CEP não encontrado.");
    }
    const city = cep.localidade || "Campinas";
    const state = (cep.uf || "SP").toUpperCase();
    const line1 = cep.logradouro || "Endereço do CEP";
    const location =
      (await nominatimSearch({
        street: line1,
        city,
        state,
        postalcode: formatCep(digits),
      }).catch(() => null)) ??
      (await nominatimSearch({ q: `${formatCep(digits)}, ${city}, ${state}` }).catch(
        () => null,
      ));
    if (!location) {
      throw new ApiError(
        404,
        "location_not_found",
        "Não encontramos a localização deste CEP. Use o GPS.",
      );
    }
    return {
      address: {
        line1,
        district: cep.bairro || "Centro",
        city,
        state,
        postalCode: formatCep(digits),
        location,
      },
      source: "viacep",
      simulated: false,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("[geo] CEP lookup failed:", (error as Error).message);
    return simulatedCep(digits);
  }
}

export async function reverseGeocode(point: GeoPoint): Promise<GeocodeResult> {
  const config = getConfig();
  if (config.GEO_PROVIDER === "simulated") return simulatedReverse(point);
  try {
    const url = new URL("/reverse", config.NOMINATIM_URL);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("lat", String(point.latitude));
    url.searchParams.set("lon", String(point.longitude));
    const place = await fetchJson<NominatimPlace>(url.toString());
    const address = place.address ?? {};
    const street = address.road || address.pedestrian;
    const postcodeDigits = (address.postcode ?? "").replace(/\D/g, "");
    return {
      address: {
        line1: street
          ? [street, address.house_number].filter(Boolean).join(", ")
          : "Localização atual (GPS)",
        district:
          address.suburb ||
          address.neighbourhood ||
          address.quarter ||
          address.city_district ||
          "Centro",
        city:
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          "Campinas",
        state: address["ISO3166-2-lvl4"]?.replace(/^BR-/, "") || "SP",
        postalCode:
          postcodeDigits.length === 8
            ? formatCep(postcodeDigits)
            : UNKNOWN_POSTAL_CODE,
        location: point,
      },
      source: "nominatim",
      simulated: false,
    };
  } catch (error) {
    console.error("[geo] reverse geocode failed:", (error as Error).message);
    return simulatedReverse(point);
  }
}

function simulatedCep(digits: string): GeocodeResult {
  return {
    address: {
      line1: "Endereço SIMULADO",
      district: "Centro",
      city: "Campinas",
      state: "SP",
      postalCode: formatCep(digits),
      location: SIMULATED_POINT,
    },
    source: "simulated",
    simulated: true,
  };
}

function simulatedReverse(point: GeoPoint): GeocodeResult {
  const address: Address = {
    line1: "Localização atual (GPS)",
    district: "Não identificado",
    city: "Campinas",
    state: "SP",
    postalCode: UNKNOWN_POSTAL_CODE,
    location: point,
  };
  return { address, source: "simulated", simulated: true };
}
