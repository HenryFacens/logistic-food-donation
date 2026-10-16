import {
  classificationSchema,
  donationCategorySchema,
  type Classification,
  type DonationCategory,
  type MessageEnvelope,
} from "@resgata/shared";
import type { QueryResultRow } from "pg";
import type { SqlExecutor } from "../infrastructure/database.js";

interface DonationRow extends QueryResultRow {
  id: string;
  status: string;
  category: DonationCategory | null;
  description: string;
  perishability_minutes: number;
  image_url: string | null;
  classification: Classification | null;
  expires_at: Date;
}

const CATEGORY_KEYWORDS: ReadonlyArray<
  readonly [DonationCategory, readonly string[]]
> = [
  ["produce", ["fruta", "verdura", "legume", "hortifruti", "banana", "tomate"]],
  ["bakery", ["pão", "paes", "bolo", "padaria", "salgado"]],
  ["dairy", ["leite", "queijo", "iogurte", "laticínio"]],
  ["prepared", ["refeição", "marmita", "comida pronta", "sopa"]],
  ["pantry", ["arroz", "feijão", "massa", "farinha", "enlatado"]],
];

function classify(row: DonationRow): Classification {
  if (row.classification) {
    return classificationSchema.parse(row.classification);
  }

  const normalized = row.description.toLocaleLowerCase("pt-BR");
  const inferred = CATEGORY_KEYWORDS.find(([, keywords]) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  )?.[0];
  const category = donationCategorySchema.parse(
    row.category ?? inferred ?? "other",
  );
  const source = row.image_url ? "upload" : "manual";

  return classificationSchema.parse({
    category,
    description: `Classificação determinística: ${row.description}`,
    confidence: row.category ? 0.95 : inferred ? 0.82 : 0.65,
    perishabilityMinutes: row.perishability_minutes,
    source,
    simulated: true,
  });
}

export async function handleClassification(
  message: MessageEnvelope,
  transaction: SqlExecutor,
): Promise<void> {
  const result = await transaction.query<DonationRow>(
    `
      SELECT
        id,
        status,
        category,
        description,
        perishability_minutes,
        image_url,
        classification,
        expires_at
      FROM donations
      WHERE id = $1
      FOR UPDATE
    `,
    [message.aggregateId],
  );
  const donation = result.rows[0];
  if (!donation || donation.status !== "posted") {
    return;
  }

  if (donation.expires_at <= new Date()) {
    await transaction.query(
      `
        SELECT transition_donation(
          $1, 'posted', 'expired', 'donation.expired', $2,
          $3::jsonb, NULL
        )
      `,
      [
        donation.id,
        message.correlationId,
        JSON.stringify({ reason: "expired_before_classification" }),
      ],
    );
    return;
  }

  const classification = classify(donation);
  await transaction.query(
    `
      UPDATE donations
      SET category = $2,
          classification = $3::jsonb,
          classification_confidence = $4,
          perishability_minutes = $5
      WHERE id = $1
        AND status = 'posted'
    `,
    [
      donation.id,
      classification.category,
      JSON.stringify(classification),
      classification.confidence,
      classification.perishabilityMinutes,
    ],
  );
  await transaction.query(
    `
      SELECT transition_donation(
        $1, 'posted', 'classified', 'donation.classified', $2,
        $3::jsonb, 'donation.classified'
      )
    `,
    [
      donation.id,
      message.correlationId,
      JSON.stringify({ classification }),
    ],
  );
}

export const classificationInternals = { classify };
