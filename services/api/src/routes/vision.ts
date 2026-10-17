import {
  classificationSchema,
  classifyDonationRequestSchema,
  type Classification,
  type ClassifyDonationRequest,
} from "@resgata/shared";
import {
  classifyWithClaude,
  claudeVisionEnabled,
  detectImageMediaType,
} from "../claude-vision.js";
import { getConfig } from "../config.js";
import { getPool } from "../db.js";
import { ApiError } from "../errors.js";
import { json, parseJson, type ApiHandler } from "../http.js";
import { requireActor } from "../auth.js";
import { storePhoto } from "../photos.js";

const categories: Array<{
  category: Classification["category"];
  terms: string[];
  perishabilityMinutes: number;
}> = [
  {
    category: "bakery",
    terms: ["pão", "pães", "bolo", "padaria"],
    perishabilityMinutes: 360,
  },
  {
    category: "produce",
    terms: ["fruta", "verdura", "legume", "banana"],
    perishabilityMinutes: 240,
  },
  {
    category: "dairy",
    terms: ["leite", "queijo", "iogurte"],
    perishabilityMinutes: 180,
  },
  {
    category: "prepared",
    terms: ["refeição", "marmita", "comida pronta"],
    perishabilityMinutes: 120,
  },
  {
    category: "pantry",
    terms: ["arroz", "feijão", "macarrão", "enlatado"],
    perishabilityMinutes: 2880,
  },
];

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function deterministicClassification(
  request: ClassifyDonationRequest,
): Classification {
  const description =
    request.manualDescription?.trim() ||
    (request.source === "camera"
      ? "Alimento identificado pela câmera"
      : "Alimento identificado no arquivo");
  const normalized = normalizeText(description);
  const match = categories.find((entry) =>
    entry.terms.some((term) => normalized.includes(normalizeText(term))),
  );
  return classificationSchema.parse({
    category: match?.category ?? "other",
    description,
    confidence: request.manualDescription ? 0.88 : 0.76,
    perishabilityMinutes: match?.perishabilityMinutes ?? 720,
    source: request.source,
    simulated: true,
  });
}

async function classifyWithProxy(
  body: ClassifyDonationRequest,
  correlationId: string,
): Promise<Classification> {
  const config = getConfig();
  const response = await fetch(
    `${(config.VISION_API_URL ?? config.OPENAI_BASE_URL).replace(/\/$/, "")}/classify`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.VISION_TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    throw new ApiError(
      503,
      "vision_unavailable",
      "O classificador de imagens está indisponível.",
    );
  }
  return classificationSchema.parse(await response.json());
}

async function classifyBody(
  body: ClassifyDonationRequest,
  correlationId: string,
): Promise<Classification> {
  if (claudeVisionEnabled()) {
    try {
      return await classifyWithClaude(body);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      // Keep the vendor flow usable when Claude is unreachable; the
      // deterministic result is visibly labeled SIMULADO.
      console.error(
        `[vision] Claude classification failed (${correlationId}):`,
        error instanceof Error ? error.message : error,
      );
      return deterministicClassification(body);
    }
  }
  try {
    return await classifyWithProxy(body, correlationId);
  } catch (error) {
    if (error instanceof ApiError && error.code !== "vision_unavailable") {
      throw error;
    }
    return deterministicClassification(body);
  }
}

// Saves the analyzed photo so the published donation can show it to NGOs.
async function keepPhoto(
  sellerId: string,
  body: ClassifyDonationRequest,
  correlationId: string,
): Promise<string | undefined> {
  if (!body.imageBase64) return undefined;
  const data = body.imageBase64.replace(/^data:[^,]*,/, "");
  const contentType = detectImageMediaType(data);
  if (!contentType) return undefined;
  try {
    return await storePhoto(sellerId, Buffer.from(data, "base64"), contentType);
  } catch (error) {
    console.error(
      `[vision] photo storage failed (${correlationId}):`,
      error instanceof Error ? error.message : error,
    );
    return undefined;
  }
}

export const classifyDonation: ApiHandler = async (request) => {
  const body = await parseJson(request, classifyDonationRequestSchema);
  const client = await getPool().connect();
  let sellerId: string;
  try {
    sellerId = (await requireActor(client, request, ["seller"])).profileId;
  } finally {
    client.release();
  }

  const correlationId =
    request.headers.get("x-correlation-id") ?? crypto.randomUUID();
  const [classification, photoId] = await Promise.all([
    classifyBody(body, correlationId),
    keepPhoto(sellerId, body, correlationId),
  ]);
  return json(200, photoId ? { ...classification, photoId } : classification);
};
