import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import {
  classificationSchema,
  donationCategorySchema,
  donationUnitSchema,
  foodConditionSchema,
  type Classification,
  type ClassifyDonationRequest,
} from "@resgata/shared";
import { z } from "zod";
import { getConfig } from "./config.js";
import { ApiError } from "./errors.js";

// Claude accepts images up to 5 MB; base64 inflates bytes by 4/3.
const MAX_IMAGE_BASE64_LENGTH = Math.floor((5 * 1024 * 1024 * 4) / 3);

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

// The model-facing schema stays free of numeric constraints; values are
// clamped into the public contract after parsing.
const claudeAnalysisSchema = z.object({
  isFood: z
    .boolean()
    .describe("False when the photo does not show food that could be donated."),
  category: donationCategorySchema,
  description: z
    .string()
    .describe(
      "Short pt-BR title for the donation listing, e.g. 'Pães franceses do dia'.",
    ),
  items: z
    .array(z.string())
    .describe("Distinct food items visible, in pt-BR, most prominent first."),
  suggestedQuantity: z
    .number()
    .describe("Best estimate of the amount visible, in suggestedUnit."),
  suggestedUnit: donationUnitSchema.describe(
    "kg for loose/bulk food, unit for countable items, box for boxes/crates, tray for trays/pans.",
  ),
  estimatedWeightKg: z.number().describe("Estimated total weight in kg."),
  condition: foodConditionSchema.describe(
    "good: fit to donate; attention: donate soon or check something; unsafe: must not be donated.",
  ),
  conditionNotes: z
    .string()
    .describe(
      "One or two short pt-BR sentences for the vendor about condition and handling. Empty if nothing to add.",
    ),
  shelfLifeHours: z
    .number()
    .describe(
      "Conservative hours from now during which the food stays safe to eat, assuming it is kept as it appears.",
    ),
  confidence: z
    .number()
    .describe("0 to 1: how confident you are in category and quantity."),
  valuePerKgBrl: z
    .number()
    .describe(
      "Typical retail price of this food in Campinas, in BRL per kg, for the shop's management records.",
    ),
  disposalCostBrl: z
    .number()
    .describe(
      "What the shop would pay to throw this amount away (commercial waste collection, bags, labor), in BRL.",
    ),
});

const SYSTEM_PROMPT = `You help small food vendors in Brazil (bakeries, restaurants, markets) donate surplus food to NGOs through the Resgata app. A vendor sends a photo of the food they want to donate, sometimes with a short note. Your analysis prefills the donation form; the vendor reviews it before publishing.

Identify what food is shown, estimate how much there is, and judge whether it is fit to donate. Count visible items when they are countable; otherwise estimate weight. When something is partly hidden, estimate from what is visible and lower your confidence rather than refusing.

Food safety matters more than completeness: NGOs serve this food to people in vulnerable situations. Mark the condition "unsafe" for visible mold, spoilage, damaged or swollen packaging, or high-risk perishables (meat, fish, dairy, cooked dishes) that look like they were left unrefrigerated. Mark "attention" when the food is fine but must be handled or delivered quickly. Keep shelf-life estimates conservative.

If the photo does not show food, set isFood to false, explain briefly in conditionNotes, and fill the other fields with your best neutral values.

Also give rough money figures for the shop's records: the usual retail price per kg in Brazil today, and what discarding this amount would cost a small business (commercial waste collection in Brazilian cities is typically around R$ 0,50 to R$ 1,50 per kg, plus bags and staff time). These are estimates the vendor can edit.

Write every user-facing text field (description, items, conditionNotes) in Brazilian Portuguese, in plain words a busy shop owner can read at a glance.`;

let cachedClient: Anthropic | undefined;

function getClient(apiKey: string, timeoutMs: number): Anthropic {
  cachedClient ??= new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 1 });
  return cachedClient;
}

export function detectImageMediaType(base64: string): ImageMediaType | null {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBORw0KGgo")) return "image/png";
  if (base64.startsWith("R0lGOD")) return "image/gif";
  if (base64.startsWith("UklGR")) return "image/webp";
  return null;
}

function stripDataUrlPrefix(value: string): string {
  const separator = value.indexOf(",");
  return value.startsWith("data:") && separator >= 0
    ? value.slice(separator + 1)
    : value;
}

function buildContent(
  request: ClassifyDonationRequest,
): Anthropic.Beta.BetaContentBlockParam[] {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (request.imageBase64) {
    const data = stripDataUrlPrefix(request.imageBase64);
    if (data.length > MAX_IMAGE_BASE64_LENGTH) {
      throw new ApiError(
        413,
        "image_too_large",
        "A foto é muito grande. Tente novamente com uma foto menor.",
      );
    }
    const mediaType = detectImageMediaType(data);
    if (!mediaType) {
      throw new ApiError(
        422,
        "unsupported_image",
        "Formato de imagem não suportado. Use uma foto JPG ou PNG.",
      );
    }
    content.push({
      type: "image",
      source: { type: "base64", media_type: mediaType, data },
    });
  } else if (request.imageUrl) {
    content.push({ type: "image", source: { type: "url", url: request.imageUrl } });
  }

  const note = request.manualDescription?.trim();
  const hasImage = content.length > 0;
  content.push({
    type: "text",
    text: hasImage
      ? note
        ? `Vendor note: ${note}\n\nAnalyze the food in this photo.`
        : "Analyze the food in this photo."
      : `The vendor has no photo and described the food as: ${note}\n\nAnalyze this description.`,
  });
  return content;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function toClassification(
  analysis: z.infer<typeof claudeAnalysisSchema>,
  request: ClassifyDonationRequest,
  model: string,
): Classification {
  const items = analysis.items.map((item) => item.trim()).filter(Boolean);
  const description =
    analysis.description.trim() ||
    items[0] ||
    request.manualDescription?.trim() ||
    "Alimento para doação";
  const conditionNotes = analysis.conditionNotes.trim();
  return classificationSchema.parse({
    category: analysis.category,
    description,
    confidence: clamp(analysis.confidence, 0, 1),
    perishabilityMinutes: Math.round(
      clamp(analysis.shelfLifeHours * 60, 15, 7 * 24 * 60),
    ),
    source: request.source,
    simulated: false,
    isFood: analysis.isFood,
    items: items.slice(0, 20),
    suggestedQuantity:
      analysis.suggestedQuantity > 0 ? analysis.suggestedQuantity : undefined,
    suggestedUnit: analysis.suggestedUnit,
    estimatedWeightKg:
      analysis.estimatedWeightKg > 0
        ? Math.round(analysis.estimatedWeightKg * 10) / 10
        : undefined,
    condition: analysis.condition,
    conditionNotes: conditionNotes ? conditionNotes.slice(0, 500) : undefined,
    model,
    estimatedValuePerKgBrl:
      analysis.valuePerKgBrl > 0 ? Math.round(analysis.valuePerKgBrl * 100) / 100 : undefined,
    estimatedDisposalCostBrl:
      analysis.disposalCostBrl > 0 ? Math.round(analysis.disposalCostBrl * 100) / 100 : undefined,
  });
}

export function claudeVisionEnabled(): boolean {
  return Boolean(getConfig().ANTHROPIC_API_KEY);
}

export async function classifyWithClaude(
  request: ClassifyDonationRequest,
): Promise<Classification> {
  const config = getConfig();
  if (!config.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  const client = getClient(config.ANTHROPIC_API_KEY, config.CLAUDE_TIMEOUT_MS);
  const content = buildContent(request);

  const response = await client.beta.messages.parse({
    model: config.ANTHROPIC_MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: betaZodOutputFormat(claudeAnalysisSchema),
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    throw new ApiError(
      422,
      "vision_refused",
      "Não foi possível analisar esta foto. Tente outra foto ou descreva o alimento.",
    );
  }
  if (!response.parsed_output) {
    throw new Error(`Claude returned no parsed output (${response.stop_reason})`);
  }
  return toClassification(response.parsed_output, request, response.model);
}
