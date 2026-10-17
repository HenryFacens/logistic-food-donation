import {
  driverDashboardRequestSchema,
  driverDashboardSchema,
  ngoDashboardRequestSchema,
  ngoDashboardSchema,
  platformDashboardRequestSchema,
  platformDashboardSchema,
  sellerDashboardNotice,
  sellerDashboardRequestSchema,
  sellerDashboardSchema,
  type DashboardMetric,
  type DashboardRequest,
  type DashboardSection,
  type MetricEvidence,
  type MonthlyMetricSeries,
} from "@resgata/shared";
import type { HttpRequest } from "@azure/functions";
import type { PoolClient } from "pg";
import { requireActor } from "../auth.js";
import { getPool } from "../db.js";
import { ApiError } from "../errors.js";
import { json, type ApiHandler } from "../http.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PERIOD_DAYS = 90;
const MEAL_EQUIVALENT_KG = 0.5;
const CO2_EQUIVALENT_KG_PER_FOOD_KG = 2.5;

type DashboardWindow = DashboardRequest & {
  periodStart: string;
  periodEnd: string;
};

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function numeric(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value);
}

function nullableNumeric(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function percentage(numerator: number, denominator: number): number {
  return denominator > 0 ? round((numerator / denominator) * 100) : 0;
}

function availableMetric(
  key: string,
  label: string,
  value: number,
  unit: string,
  evidence: Exclude<MetricEvidence, "unavailable">,
  detail?: string,
): DashboardMetric {
  return {
    key,
    label,
    value: round(value),
    unit,
    evidence,
    ...(detail ? { detail } : {}),
  };
}

function optionalMetric(
  key: string,
  label: string,
  value: number | null,
  unit: string,
  evidence: Exclude<MetricEvidence, "unavailable">,
  unavailableDetail: string,
  detail?: string,
): DashboardMetric {
  return value === null
    ? unavailableMetric(key, label, unit, unavailableDetail)
    : availableMetric(key, label, value, unit, evidence, detail);
}

function unavailableMetric(
  key: string,
  label: string,
  unit: string,
  detail: string,
): DashboardMetric {
  return {
    key,
    label,
    value: null,
    unit,
    evidence: "unavailable",
    detail,
  };
}

function parseDashboardWindow(
  request: HttpRequest,
  schema:
    | typeof sellerDashboardRequestSchema
    | typeof driverDashboardRequestSchema
    | typeof ngoDashboardRequestSchema
    | typeof platformDashboardRequestSchema,
): DashboardWindow {
  const includeMonthlySeries = request.query.get("includeMonthlySeries");
  if (
    includeMonthlySeries !== null &&
    includeMonthlySeries !== "true" &&
    includeMonthlySeries !== "false"
  ) {
    throw new ApiError(
      422,
      "validation_error",
      "includeMonthlySeries deve ser true ou false.",
    );
  }
  const parsed = schema.parse({
    periodStart: request.query.get("periodStart") ?? undefined,
    periodEnd: request.query.get("periodEnd") ?? undefined,
    includeMonthlySeries:
      includeMonthlySeries === null
        ? undefined
        : includeMonthlySeries === "true",
  });
  const periodEnd = parsed.periodEnd ?? new Date().toISOString();
  const periodStart =
    parsed.periodStart ??
    new Date(Date.parse(periodEnd) - DEFAULT_PERIOD_DAYS * DAY_MS).toISOString();
  return { ...parsed, periodStart, periodEnd };
}

function monthlySeries(
  key: string,
  label: string,
  unit: string,
  evidence: Exclude<MetricEvidence, "unavailable">,
  rows: Array<{ month: string; value: unknown }>,
  detail?: string,
): MonthlyMetricSeries {
  return {
    key,
    label,
    unit,
    evidence,
    points: rows.map((row) => ({
      month: row.month,
      value: numeric(row.value),
    })),
    ...(detail ? { detail } : {}),
  };
}

async function sellerMonthlySeries(
  client: PoolClient,
  sellerId: string,
  window: DashboardWindow,
): Promise<MonthlyMetricSeries[]> {
  if (!window.includeMonthlySeries) {
    return [];
  }
  const result = await client.query<{ month: string; donations: number; weight: number }>(
    `SELECT
       to_char(date_trunc('month', donation.created_at), 'YYYY-MM') AS month,
       count(*)::int AS donations,
       coalesce(sum(donation.estimated_weight_kg), 0)::float8 AS weight
     FROM donations AS donation
     WHERE donation.seller_id = $1
       AND donation.created_at >= $2
       AND donation.created_at < $3
     GROUP BY date_trunc('month', donation.created_at)
     ORDER BY date_trunc('month', donation.created_at)`,
    [sellerId, window.periodStart, window.periodEnd],
  );
  return [
    monthlySeries(
      "donationsByMonth",
      "Doações publicadas por mês",
      "doações",
      "calculated",
      result.rows.map((row) => ({ month: row.month, value: row.donations })),
    ),
    monthlySeries(
      "publishedKgByMonth",
      "Kg publicados por mês",
      "kg",
      "calculated",
      result.rows.map((row) => ({ month: row.month, value: row.weight })),
      "Peso informado pelo doador na publicação.",
    ),
  ];
}

export const getSellerDashboard: ApiHandler = async (request) => {
  const window = parseDashboardWindow(request, sellerDashboardRequestSchema);
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request, ["seller"]);
    const totalsResult = await client.query(
      `WITH scoped AS (
         SELECT
           donation.*,
           pickup.id AS pickup_id,
           pickup.collected_at,
           receipt.id AS receipt_id,
           receipt.received_weight_kg,
           receipt.rejected_weight_kg,
           lag(donation.created_at) OVER (ORDER BY donation.created_at) AS previous_created_at
         FROM donations AS donation
         LEFT JOIN pickups AS pickup ON pickup.donation_id = donation.id
         LEFT JOIN delivery_receipts AS receipt
           ON receipt.pickup_id = pickup.id
          AND receipt.created_at >= $2
          AND receipt.created_at < $3
         WHERE donation.seller_id = $1
           AND donation.created_at >= $2
           AND donation.created_at < $3
       )
       SELECT
         count(*)::int AS donations,
         coalesce(sum(estimated_weight_kg), 0)::float8 AS published_weight_kg,
         coalesce(sum(estimated_weight_kg) FILTER (WHERE collected_at IS NOT NULL), 0)::float8
           AS collected_weight_kg,
         coalesce(sum(received_weight_kg), 0)::float8 AS received_weight_kg,
         coalesce(sum(rejected_weight_kg), 0)::float8 AS rejected_weight_kg,
         count(*) FILTER (WHERE receipt_id IS NOT NULL)::int AS received_donations,
         avg(extract(epoch FROM (created_at - previous_created_at)) / 86400.0)
           FILTER (WHERE previous_created_at IS NOT NULL) AS average_frequency_days,
         avg(extract(epoch FROM (collected_at - created_at)) / 60.0)
           FILTER (WHERE collected_at IS NOT NULL) AS publication_to_collection_minutes,
         count(*) FILTER (
           WHERE collected_at IS NOT NULL AND collected_at <= expires_at
         )::int AS collected_before_expiration,
         count(*) FILTER (WHERE collected_at IS NOT NULL)::int AS collected_donations,
         count(*) FILTER (
           WHERE previous_created_at IS NOT NULL
             AND created_at - previous_created_at <= interval '30 days'
         )::int AS repeated_30,
         count(*) FILTER (
           WHERE previous_created_at IS NOT NULL
             AND created_at - previous_created_at <= interval '60 days'
         )::int AS repeated_60,
         count(*) FILTER (
           WHERE previous_created_at IS NOT NULL
             AND created_at - previous_created_at <= interval '90 days'
         )::int AS repeated_90,
         count(*) FILTER (WHERE previous_created_at IS NOT NULL)::int AS repeatable_donations,
         count(*) FILTER (
           WHERE receipt_id IS NOT NULL AND unit_value_brl IS NOT NULL
         )::int AS priced_receipts,
         coalesce(sum(received_weight_kg * unit_value_brl)
           FILTER (WHERE receipt_id IS NOT NULL AND unit_value_brl IS NOT NULL), 0)::float8
           AS gross_donation_value,
         count(*) FILTER (
           WHERE receipt_id IS NOT NULL AND disposal_cost_brl IS NOT NULL
         )::int AS costed_disposals,
         coalesce(sum(disposal_cost_brl)
           FILTER (WHERE receipt_id IS NOT NULL AND disposal_cost_brl IS NOT NULL), 0)::float8
           AS avoided_disposal_cost,
         coalesce(bool_or(simulated), false) AS simulated,
         max(created_at) AS last_donation_at
       FROM scoped`,
      [actor.profileId, window.periodStart, window.periodEnd],
    );
    const row = totalsResult.rows[0]!;
    const donations = numeric(row.donations);
    const collectedDonations = numeric(row.collected_donations);
    const receivedDonations = numeric(row.received_donations);
    const receivedWeight = numeric(row.received_weight_kg);
    const rejectedWeight = numeric(row.rejected_weight_kg);
    const repeatable = numeric(row.repeatable_donations);

    const firstOfferResult = await client.query<{
      accepted: number;
      accepted_first: number;
    }>(
      `SELECT
         count(*) FILTER (WHERE offer.status = 'accepted')::int AS accepted,
         count(*) FILTER (
           WHERE offer.status = 'accepted' AND offer.rank = 1
         )::int AS accepted_first
       FROM offers AS offer
       JOIN donations AS donation ON donation.id = offer.donation_id
       WHERE donation.seller_id = $1
         AND donation.created_at >= $2
         AND donation.created_at < $3`,
      [actor.profileId, window.periodStart, window.periodEnd],
    );
    const rankResult = await client.query<{ position: number | null }>(
      `WITH seller_weights AS (
         SELECT
           donation.seller_id,
           coalesce(sum(receipt.received_weight_kg), 0)::float8 AS received_weight
         FROM donations AS donation
         LEFT JOIN pickups AS pickup ON pickup.donation_id = donation.id
         LEFT JOIN delivery_receipts AS receipt
           ON receipt.pickup_id = pickup.id
          AND receipt.created_at >= $2
          AND receipt.created_at < $3
         WHERE donation.created_at >= $2 AND donation.created_at < $3
         GROUP BY donation.seller_id
       ),
       ranked AS (
         SELECT
           seller_id,
           dense_rank() OVER (ORDER BY received_weight DESC) AS position
         FROM seller_weights
       )
       SELECT position::int FROM ranked WHERE seller_id = $1`,
      [actor.profileId, window.periodStart, window.periodEnd],
    );
    const monthly = await sellerMonthlySeries(
      client,
      actor.profileId,
      window,
    );
    const pricedReceipts = numeric(row.priced_receipts);
    const costedDisposals = numeric(row.costed_disposals);
    const firstOffer = firstOfferResult.rows[0] ?? {
      accepted: 0,
      accepted_first: 0,
    };
    const lastDonationAt = row.last_donation_at
      ? Date.parse(String(row.last_donation_at))
      : null;
    const sections: DashboardSection[] = [
      {
        key: "donations",
        title: "Métricas de doação",
        metrics: [
          availableMetric(
            "publishedWeightKg",
            "Quantidade publicada",
            numeric(row.published_weight_kg),
            "kg",
            "calculated",
            "Peso informado pelo doador.",
          ),
          availableMetric(
            "collectedWeightKg",
            "Quantidade coletada",
            numeric(row.collected_weight_kg),
            "kg",
            "calculated",
            "Proxy baseado no peso estimado das doações com coleta registrada.",
          ),
          availableMetric(
            "receivedWeightKg",
            "Quantidade recebida pela ONG",
            receivedWeight,
            "kg",
            "recorded",
            "Somente conferências registradas pela ONG.",
          ),
          availableMetric(
            "completionRate",
            "Doação concluída",
            percentage(receivedDonations, donations),
            "%",
            "calculated",
            "Doações com recebimento confirmado pela ONG sobre publicações.",
          ),
          availableMetric(
            "donations",
            "Doações realizadas",
            donations,
            "doações",
            "calculated",
          ),
          optionalMetric(
            "averageDonationFrequency",
            "Frequência média de doação",
            nullableNumeric(row.average_frequency_days),
            "dias",
            "calculated",
            "São necessárias ao menos duas doações no período.",
          ),
          optionalMetric(
            "averagePublicationToCollection",
            "Tempo médio entre publicação e coleta",
            nullableNumeric(row.publication_to_collection_minutes),
            "min",
            "calculated",
            "Não há coletas no período.",
          ),
          availableMetric(
            "collectedBeforeExpirationRate",
            "Coletado antes do vencimento",
            percentage(
              numeric(row.collected_before_expiration),
              collectedDonations,
            ),
            "%",
            "calculated",
          ),
          availableMetric(
            "qualityRejectionRate",
            "Rejeitado por qualidade",
            percentage(rejectedWeight, receivedWeight + rejectedWeight),
            "%",
            "calculated",
            "Peso rejeitado sobre o peso total conferido pela ONG.",
          ),
        ],
        monthlySeries: monthly,
      },
      {
        key: "fiscal",
        title: "Métricas fiscais e financeiras",
        metrics: [
          pricedReceipts > 0 && pricedReceipts === receivedDonations
            ? availableMetric(
                "grossDonationValue",
                "Valor contábil bruto da doação",
                numeric(row.gross_donation_value),
                "BRL",
                "calculated",
                "Peso recebido pela ONG multiplicado pelo valor unitário informado.",
              )
            : unavailableMetric(
                "grossDonationValue",
                "Valor contábil bruto da doação",
                "BRL",
                "Nem todos os recebimentos possuem valor unitário informado.",
              ),
          unavailableMetric(
            "potentialDeductibleValue",
            "Valor potencialmente dedutível",
            "BRL",
            "Regime tributário, percentual permitido e teto não estão configurados.",
          ),
          unavailableMetric(
            "estimatedTaxSavings",
            "Economia fiscal estimada",
            "BRL",
            "Alíquota e validação tributária não estão configuradas.",
          ),
          availableMetric(
            "receiptCount",
            "Comprovantes de recebimento",
            receivedDonations,
            "comprovantes",
            "recorded",
            "Comprovantes operacionais emitidos pela ONG; não são documentos fiscais.",
          ),
          costedDisposals > 0
            ? availableMetric(
                "avoidedDisposalCost",
                "Custo evitado de descarte",
                numeric(row.avoided_disposal_cost),
                "BRL",
                "calculated",
                "Soma dos custos de descarte informados nas doações recebidas.",
              )
            : unavailableMetric(
                "avoidedDisposalCost",
                "Custo evitado de descarte",
                "BRL",
                "Nenhuma doação recebida possui custo de descarte informado.",
              ),
          unavailableMetric(
            "esgReports",
            "Relatórios ESG gerados",
            "relatórios",
            "A geração e persistência de relatórios ESG ainda não existe.",
          ),
          availableMetric(
            "equivalentMeals",
            "Refeições equivalentes",
            receivedWeight / MEAL_EQUIVALENT_KG,
            "refeições",
            "estimated",
            `Estimativa de ${MEAL_EQUIVALENT_KG} kg por refeição.`,
          ),
          availableMetric(
            "avoidedCo2e",
            "CO₂e evitado",
            receivedWeight * CO2_EQUIVALENT_KG_PER_FOOD_KG,
            "kg CO₂e",
            "estimated",
            `Fator demonstrativo de ${CO2_EQUIVALENT_KG_PER_FOOD_KG} kg CO₂e por kg recebido.`,
          ),
        ],
        monthlySeries: [],
      },
      {
        key: "loyalty",
        title: "Indicadores de fidelização",
        metrics: [
          availableMetric(
            "repeat30Days",
            "Taxa de repetição em 30 dias",
            percentage(numeric(row.repeated_30), repeatable),
            "%",
            "calculated",
            "Intervalos entre publicações consecutivas no período.",
          ),
          availableMetric(
            "repeat60Days",
            "Taxa de repetição em 60 dias",
            percentage(numeric(row.repeated_60), repeatable),
            "%",
            "calculated",
          ),
          availableMetric(
            "repeat90Days",
            "Taxa de repetição em 90 dias",
            percentage(numeric(row.repeated_90), repeatable),
            "%",
            "calculated",
          ),
          optionalMetric(
            "donorRanking",
            "Posição no ranking de doadores",
            nullableNumeric(rankResult.rows[0]?.position),
            "posição",
            "calculated",
            "Não há dados suficientes para formar o ranking.",
            "Ranking por kg efetivamente recebido pela ONG no período.",
          ),
          availableMetric(
            "activeDonorBadge",
            "Selo de doador ativo",
            lastDonationAt !== null &&
              Date.parse(window.periodEnd) - lastDonationAt <= 30 * DAY_MS
              ? 1
              : 0,
            "indicador",
            "calculated",
            "Ativo quando houve publicação nos 30 dias anteriores ao fim do período.",
          ),
          availableMetric(
            "acceptedWithoutReofferRate",
            "Ofertas aceitas sem reoferta",
            percentage(
              numeric(firstOffer.accepted_first),
              numeric(firstOffer.accepted),
            ),
            "%",
            "calculated",
            "Aceites com rank 1 sobre todas as ofertas aceitas.",
          ),
          unavailableMetric(
            "averageNgoRating",
            "Avaliação média das ONGs",
            "nota",
            "O contrato atual registra avaliações do motorista, não da ONG.",
          ),
        ],
        monthlySeries: [],
      },
    ];
    const simulated = Boolean(row.simulated);
    return json(
      200,
      sellerDashboardSchema.parse({
        sellerId: actor.profileId,
        periodStart: window.periodStart,
        periodEnd: window.periodEnd,
        generatedAt: new Date().toISOString(),
        fiscalNotice: sellerDashboardNotice,
        sections,
        simulated,
        simulationLabel: simulated ? "SIMULADO" : null,
      }),
    );
  } finally {
    client.release();
  }
};

export const getDriverDashboard: ApiHandler = async (request) => {
  const window = parseDashboardWindow(request, driverDashboardRequestSchema);
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request, ["driver"]);
    const result = await client.query(
      `WITH scoped AS (
         SELECT
           pickup.*,
           donation.estimated_weight_kg,
           donation.simulated,
           receipt.received_weight_kg,
           ST_Distance(pickup.pickup_location, pickup.delivery_location) / 1000.0
             AS straight_distance_km
         FROM pickups AS pickup
         JOIN donations AS donation ON donation.id = pickup.donation_id
         LEFT JOIN delivery_receipts AS receipt ON receipt.pickup_id = pickup.id
         WHERE pickup.driver_id = $1
           AND coalesce(pickup.assigned_at, pickup.created_at) >= $2
           AND coalesce(pickup.assigned_at, pickup.created_at) < $3
       )
       SELECT
         count(*)::int AS accepted,
         count(*) FILTER (WHERE status = 'delivered')::int AS completed,
         count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
         avg(extract(epoch FROM (assigned_at - created_at)))
           FILTER (WHERE assigned_at IS NOT NULL) AS accept_seconds,
         avg(extract(epoch FROM (collected_at - assigned_at)) / 60.0)
           FILTER (WHERE collected_at IS NOT NULL AND assigned_at IS NOT NULL)
           AS collection_minutes,
         avg(extract(epoch FROM (delivered_at - collected_at)) / 60.0)
           FILTER (WHERE delivered_at IS NOT NULL AND collected_at IS NOT NULL)
           AS delivery_minutes,
         coalesce(sum(straight_distance_km)
           FILTER (WHERE status = 'delivered'), 0)::float8 AS distance_km,
         coalesce(sum(estimated_weight_kg)
           FILTER (WHERE collected_at IS NOT NULL), 0)::float8 AS transported_weight_kg,
         coalesce(sum(received_weight_kg), 0)::float8 AS delivered_weight_kg,
         count(*) FILTER (
           WHERE delivered_at IS NOT NULL AND delivery_due_at IS NOT NULL
         )::int AS deliveries_with_due_date,
         count(*) FILTER (
           WHERE delivered_at IS NOT NULL
             AND delivery_due_at IS NOT NULL
             AND delivered_at <= delivery_due_at
         )::int AS on_time,
         count(*) FILTER (
           WHERE delivered_at IS NOT NULL
             AND delivery_due_at IS NOT NULL
             AND delivered_at > delivery_due_at
         )::int AS late,
         coalesce(bool_or(simulated), false) AS simulated
       FROM scoped`,
      [actor.profileId, window.periodStart, window.periodEnd],
    );
    const ratingResult = await client.query(
      `SELECT
         (avg(rating) FILTER (WHERE reviewer_role = 'ngo'))::float8 AS ngo_rating,
         (avg(rating) FILTER (WHERE reviewer_role = 'seller'))::float8 AS seller_rating,
         count(*)::int AS ratings
       FROM driver_ratings
       WHERE driver_id = $1 AND created_at >= $2 AND created_at < $3`,
      [actor.profileId, window.periodStart, window.periodEnd],
    );
    const availableResult = await client.query<{ available: number }>(
      `SELECT count(*)::int AS available
       FROM pickups
       WHERE driver_id IS NULL AND status = 'awaiting_driver'`,
    );
    const driverResult = await client.query<{ points: number }>(
      "SELECT points FROM drivers WHERE id = $1",
      [actor.profileId],
    );
    const rewardResult = await client.query<{
      coupons_received: number;
      coupons_used: number;
    }>(
      `SELECT
         count(*)::int AS coupons_received,
         count(*) FILTER (WHERE status = 'used')::int AS coupons_used
       FROM redemptions
       WHERE driver_id = $1 AND issued_at >= $2 AND issued_at < $3`,
      [actor.profileId, window.periodStart, window.periodEnd],
    );
    const geoResult = await client.query<{ confirmed: number; completed: number }>(
      `SELECT
         count(*) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM events AS collected_event
             WHERE collected_event.donation_id = pickup.donation_id
               AND collected_event.event_type = 'pickup.collected'
               AND collected_event.payload ? 'location'
           )
           AND EXISTS (
             SELECT 1 FROM events AS delivered_event
             WHERE delivered_event.donation_id = pickup.donation_id
               AND delivered_event.event_type = 'pickup.delivered'
               AND delivered_event.payload ? 'location'
           )
         )::int AS confirmed,
         count(*)::int AS completed
       FROM pickups AS pickup
       WHERE pickup.driver_id = $1
         AND pickup.status = 'delivered'
         AND pickup.delivered_at >= $2
         AND pickup.delivered_at < $3`,
      [actor.profileId, window.periodStart, window.periodEnd],
    );
    const row = result.rows[0]!;
    const ratings = ratingResult.rows[0]!;
    const rewards = rewardResult.rows[0]!;
    const accepted = numeric(row.accepted);
    const completed = numeric(row.completed);
    const withDueDate = numeric(row.deliveries_with_due_date);
    const geo = geoResult.rows[0] ?? { confirmed: 0, completed: 0 };
    const sections: DashboardSection[] = [
      {
        key: "operations",
        title: "Métricas operacionais",
        metrics: [
          availableMetric(
            "availableMissions",
            "Missões disponíveis",
            numeric(availableResult.rows[0]?.available),
            "missões",
            "calculated",
            "Coletas abertas na rede; ainda não há filtro de elegibilidade individual.",
          ),
          availableMetric("acceptedMissions", "Missões aceitas", accepted, "missões", "calculated"),
          availableMetric("completedMissions", "Missões concluídas", completed, "missões", "calculated"),
          availableMetric(
            "cancelledMissions",
            "Missões canceladas",
            numeric(row.cancelled),
            "missões",
            "calculated",
          ),
          availableMetric(
            "completionRate",
            "Taxa de conclusão",
            percentage(completed, accepted),
            "%",
            "calculated",
          ),
          optionalMetric(
            "averageAcceptanceTime",
            "Tempo médio para aceitar",
            nullableNumeric(row.accept_seconds),
            "s",
            "calculated",
            "Não há missões atribuídas no período.",
          ),
          optionalMetric(
            "averageCollectionTime",
            "Tempo médio de coleta",
            nullableNumeric(row.collection_minutes),
            "min",
            "calculated",
            "Não há coletas concluídas no período.",
          ),
          optionalMetric(
            "averageDeliveryTime",
            "Tempo médio de entrega",
            nullableNumeric(row.delivery_minutes),
            "min",
            "calculated",
            "Não há entregas concluídas no período.",
          ),
          availableMetric(
            "distanceKm",
            "Quilômetros percorridos",
            numeric(row.distance_km),
            "km",
            "estimated",
            "Distância em linha reta entre origem e destino; não é telemetria da rota.",
          ),
          availableMetric(
            "transportedWeightKg",
            "Kg transportados",
            numeric(row.transported_weight_kg),
            "kg",
            "calculated",
            "Peso estimado das doações coletadas.",
          ),
          availableMetric(
            "deliveredWeightKg",
            "Kg entregues com sucesso",
            numeric(row.delivered_weight_kg),
            "kg",
            "recorded",
            "Peso efetivamente confirmado pela ONG.",
          ),
          withDueDate > 0
            ? availableMetric(
                "onTimeDeliveries",
                "Entregas dentro do prazo",
                numeric(row.on_time),
                "entregas",
                "calculated",
              )
            : unavailableMetric(
                "onTimeDeliveries",
                "Entregas dentro do prazo",
                "entregas",
                "As entregas do período não possuem prazo prometido.",
              ),
          withDueDate > 0
            ? availableMetric(
                "lateDeliveries",
                "Entregas atrasadas",
                numeric(row.late),
                "entregas",
                "calculated",
              )
            : unavailableMetric(
                "lateDeliveries",
                "Entregas atrasadas",
                "entregas",
                "As entregas do período não possuem prazo prometido.",
              ),
          unavailableMetric(
            "completeEvidenceRate",
            "Fotos e comprovantes corretos",
            "%",
            "Não existe validação persistida das evidências de coleta e entrega.",
          ),
        ],
        monthlySeries: [],
      },
      {
        key: "reputation",
        title: "Métricas de reputação",
        metrics: [
          optionalMetric(
            "ngoRating",
            "Nota média das ONGs",
            nullableNumeric(ratings.ngo_rating),
            "nota",
            "calculated",
            "Não há avaliações de ONGs no período.",
          ),
          optionalMetric(
            "sellerRating",
            "Nota média dos produtores",
            nullableNumeric(ratings.seller_rating),
            "nota",
            "calculated",
            "Não há avaliações de produtores no período.",
          ),
          unavailableMetric(
            "reliabilityIndex",
            "Índice de confiabilidade",
            "pontos",
            "A fórmula de confiabilidade ainda não foi configurada e versionada.",
          ),
          availableMetric(
            "geolocationConfirmationRate",
            "Confirmação com geolocalização",
            percentage(numeric(geo.confirmed), numeric(geo.completed)),
            "%",
            "calculated",
            "Mede coordenadas informadas nos dois eventos; não valida proximidade geográfica.",
          ),
          unavailableMetric(
            "occurrences",
            "Ocorrências",
            "ocorrências",
            "Não existe entidade de incidentes operacionais.",
          ),
          unavailableMetric(
            "lateRecurrenceRate",
            "Reincidência em atrasos",
            "%",
            "Depende de prazos registrados e histórico de ocorrências.",
          ),
          unavailableMetric(
            "driverLevel",
            "Nível do transportador",
            "nível",
            "Os níveis Iniciante, Confiável, Parceiro e Embaixador ainda não possuem regra versionada.",
          ),
        ],
        monthlySeries: [],
      },
      {
        key: "rewards",
        title: "Métricas de recompensa",
        metrics: [
          availableMetric(
            "pointsBalance",
            "Pontos acumulados",
            numeric(driverResult.rows[0]?.points),
            "pontos",
            "recorded",
            "Saldo atual; não representa o total histórico ganho.",
          ),
          availableMetric(
            "couponsReceived",
            "Cupons recebidos",
            numeric(rewards.coupons_received),
            "cupons",
            "calculated",
          ),
          availableMetric(
            "couponsRedeemed",
            "Cupons resgatados",
            numeric(rewards.coupons_used),
            "cupons",
            "calculated",
          ),
          unavailableMetric(
            "benefitValue",
            "Valor dos benefícios recebidos",
            "BRL",
            "Cupons não possuem valor monetário registrado.",
          ),
          unavailableMetric(
            "averageRewardPerMission",
            "Recompensa média por missão",
            "pontos",
            "Não existe ledger histórico de recompensas por missão.",
          ),
          unavailableMetric(
            "rewardPerKg",
            "Recompensa por kg transportado",
            "pontos/kg",
            "Não existe regra ou lançamento por kg.",
          ),
          unavailableMetric(
            "urgentDeliveryReward",
            "Recompensa por entrega urgente",
            "pontos",
            "A urgência e sua recompensa não são persistidas.",
          ),
          unavailableMetric(
            "levelBenefits",
            "Benefícios desbloqueados por nível",
            "benefícios",
            "Níveis e benefícios associados ainda não estão configurados.",
          ),
        ],
        monthlySeries: [],
      },
    ];
    const simulated = Boolean(row.simulated);
    return json(
      200,
      driverDashboardSchema.parse({
        driverId: actor.profileId,
        periodStart: window.periodStart,
        periodEnd: window.periodEnd,
        generatedAt: new Date().toISOString(),
        sections,
        simulated,
        simulationLabel: simulated ? "SIMULADO" : null,
      }),
    );
  } finally {
    client.release();
  }
};

export const getNgoDashboard: ApiHandler = async (request) => {
  const window = parseDashboardWindow(request, ngoDashboardRequestSchema);
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request, ["ngo"]);
    const result = await client.query(
      `WITH delivered AS (
         SELECT
           pickup.*,
           donation.seller_id,
           donation.expires_at,
           donation.simulated,
           receipt.id AS receipt_id,
           receipt.condition,
           receipt.received_weight_kg,
           receipt.rejected_weight_kg,
           receipt.created_at AS receipt_created_at,
           accepted_offer.created_at AS offer_created_at,
           ST_Distance(pickup.pickup_location, pickup.delivery_location) / 1000.0
             AS straight_distance_km
         FROM pickups AS pickup
         JOIN donations AS donation ON donation.id = pickup.donation_id
         LEFT JOIN delivery_receipts AS receipt
           ON receipt.pickup_id = pickup.id
          AND receipt.created_at >= $2
          AND receipt.created_at < $3
         LEFT JOIN offers AS accepted_offer
           ON accepted_offer.donation_id = pickup.donation_id
          AND accepted_offer.ngo_id = pickup.ngo_id
          AND accepted_offer.status = 'accepted'
         WHERE pickup.ngo_id = $1
           AND pickup.delivered_at >= $2
           AND pickup.delivered_at < $3
       )
       SELECT
         count(*) FILTER (WHERE receipt_id IS NOT NULL)::int AS receipts,
         coalesce(sum(received_weight_kg), 0)::float8 AS received_weight_kg,
         coalesce(sum(rejected_weight_kg), 0)::float8 AS rejected_weight_kg,
         count(DISTINCT seller_id) FILTER (WHERE receipt_id IS NOT NULL)::int
           AS producers,
         count(DISTINCT driver_id) FILTER (
           WHERE receipt_id IS NOT NULL AND driver_id IS NOT NULL
         )::int AS drivers,
         avg(extract(epoch FROM (receipt_created_at - offer_created_at)) / 60.0)
           FILTER (WHERE receipt_id IS NOT NULL AND offer_created_at IS NOT NULL)
           AS offer_to_receipt_minutes,
         count(*)::int AS delivered_pickups,
         count(*) FILTER (
           WHERE receipt_id IS NOT NULL AND receipt_created_at <= expires_at
         )::int AS received_before_expiration,
         count(*) FILTER (WHERE condition = 'all_good')::int AS all_good,
         count(*) FILTER (WHERE condition = 'partial')::int AS partial,
         count(*) FILTER (WHERE condition = 'rejected')::int AS rejected,
         avg(straight_distance_km) FILTER (WHERE receipt_id IS NOT NULL)
           AS average_distance_km,
         coalesce(bool_or(simulated), false) AS simulated
       FROM delivered`,
      [actor.profileId, window.periodStart, window.periodEnd],
    );
    const capacityResult = await client.query<{
      capacity_kg: number;
      current_load_kg: number;
    }>(
      "SELECT capacity_kg, current_load_kg FROM ngos WHERE id = $1",
      [actor.profileId],
    );
    const rejectionResult = await client.query<{ reason: string; count: number }>(
      `SELECT reason, count(*)::int AS count
       FROM delivery_receipts AS receipt
       CROSS JOIN LATERAL unnest(receipt.rejection_reasons) AS reason
       WHERE receipt.ngo_id = $1
         AND receipt.created_at >= $2
         AND receipt.created_at < $3
       GROUP BY reason
       ORDER BY count(*) DESC, reason
       LIMIT 5`,
      [actor.profileId, window.periodStart, window.periodEnd],
    );
    const row = result.rows[0]!;
    const capacity = capacityResult.rows[0]!;
    const receipts = numeric(row.receipts);
    const receivedWeight = numeric(row.received_weight_kg);
    const rejectedWeight = numeric(row.rejected_weight_kg);
    const totalCheckedWeight = receivedWeight + rejectedWeight;
    const capacityKg = numeric(capacity.capacity_kg);
    const currentLoadKg = numeric(capacity.current_load_kg);
    const reasonDetail =
      rejectionResult.rows.length > 0
        ? rejectionResult.rows
            .map((entry) => `${entry.reason}: ${entry.count}`)
            .join("; ")
        : "Nenhum motivo de rejeição registrado no período.";
    const sections: DashboardSection[] = [
      {
        key: "receiving",
        title: "Métricas de recebimento",
        metrics: [
          availableMetric("receivedDonations", "Doações recebidas", receipts, "doações", "recorded"),
          availableMetric("receivedWeightKg", "Kg recebidos", receivedWeight, "kg", "recorded"),
          availableMetric("producers", "Produtores atendidos", numeric(row.producers), "produtores", "calculated"),
          availableMetric("drivers", "Transportadores utilizados", numeric(row.drivers), "transportadores", "calculated"),
          optionalMetric(
            "offerToReceiptTime",
            "Tempo médio entre oferta e recebimento",
            nullableNumeric(row.offer_to_receipt_minutes),
            "min",
            "calculated",
            "Não há recebimentos com oferta correlacionada no período.",
          ),
          availableMetric(
            "acceptedDeliveryRate",
            "Entregas com recebimento confirmado",
            percentage(receipts, numeric(row.delivered_pickups)),
            "%",
            "calculated",
          ),
          availableMetric(
            "rejectedFoodRate",
            "Alimentos rejeitados",
            percentage(rejectedWeight, totalCheckedWeight),
            "%",
            "calculated",
            reasonDetail,
          ),
          availableMetric("allGoodReceipts", "Recebimentos em bom estado", numeric(row.all_good), "recebimentos", "recorded"),
          availableMetric("partialReceipts", "Recebimentos parciais", numeric(row.partial), "recebimentos", "recorded"),
          availableMetric("rejectedReceipts", "Recebimentos recusados", numeric(row.rejected), "recebimentos", "recorded"),
          availableMetric(
            "receivedWithinValidityRate",
            "Recebido dentro da validade",
            percentage(numeric(row.received_before_expiration), receipts),
            "%",
            "calculated",
          ),
        ],
        monthlySeries: [],
      },
      {
        key: "logistics",
        title: "Métricas logísticas",
        metrics: [
          optionalMetric(
            "averageCollectionDistance",
            "Distância média das coletas",
            nullableNumeric(row.average_distance_km),
            "km",
            "estimated",
            "Não há recebimentos no período.",
            "Distância em linha reta entre produtor e ONG.",
          ),
          unavailableMetric("avoidedLogisticsCost", "Custo logístico evitado", "BRL", "Não existe custo de rota ou tarifa de referência."),
          availableMetric("completedRoutes", "Rotas concluídas", receipts, "rotas", "recorded"),
          availableMetric(
            "usedCapacityRate",
            "Capacidade utilizada",
            percentage(currentLoadKg, capacityKg),
            "%",
            "calculated",
            "Baseada na carga atual registrada no cadastro da ONG.",
          ),
          availableMetric(
            "idleCapacityRate",
            "Capacidade ociosa",
            percentage(Math.max(capacityKg - currentLoadKg, 0), capacityKg),
            "%",
            "calculated",
          ),
          unavailableMetric("storageTime", "Tempo de armazenamento", "h", "Não existem movimentos de entrada e saída de estoque."),
          unavailableMetric("postReceiptLosses", "Perdas após o recebimento", "kg", "Não existe baixa de estoque por perda."),
          unavailableMetric("distributedBeforeExpiration", "Distribuído antes do vencimento", "%", "A distribuição comunitária ainda não é persistida."),
        ],
        monthlySeries: [],
      },
      {
        key: "communityDistribution",
        title: "Distribuição à comunidade",
        detail: "Receber alimento não comprova que ele chegou à população.",
        metrics: [
          availableMetric("ngoReceivedWeight", "Kg recebidos pela ONG", receivedWeight, "kg", "recorded"),
          unavailableMetric("communityDistributedWeight", "Kg distribuídos à comunidade", "kg", "Não existe registro de distribuição."),
          unavailableMetric("distributionRate", "Taxa de distribuição", "%", "Depende do peso distribuído à comunidade."),
          unavailableMetric("familiesServed", "Famílias atendidas", "famílias", "Não existe registro de atendimento."),
          unavailableMetric("peopleServed", "Pessoas atendidas", "pessoas", "Não existe registro de atendimento."),
          unavailableMetric("mealsDelivered", "Refeições entregues", "refeições", "Não existe registro de refeições distribuídas."),
          unavailableMetric("receiptToDistributionTime", "Tempo entre recebimento e distribuição", "h", "Não existe evento de distribuição."),
          unavailableMetric("storageLosses", "Perdas durante armazenamento", "kg", "Não existe movimentação de estoque."),
          unavailableMetric("regionalDistribution", "Entregas por região", "entregas", "Não existem destinos comunitários persistidos."),
          unavailableMetric("distributionByFoodType", "Distribuição por tipo de alimento", "kg", "Não existe vínculo entre estoque e distribuição."),
          unavailableMetric("recurringAssistance", "Atendimentos recorrentes", "atendimentos", "Não existem beneficiários ou instituições de destino persistidos."),
        ],
        monthlySeries: [],
      },
      {
        key: "socialEffectiveness",
        title: "Eficácia social",
        metrics: [
          unavailableMetric("communityDemand", "Demanda total da comunidade", "kg", "Não existe cadastro agregado de demanda comunitária."),
          unavailableMetric("coveredDemand", "Demanda atendida", "kg", "Não existe registro de distribuição comunitária."),
          unavailableMetric("coverageRate", "Percentual de cobertura", "%", "Depende da demanda e da distribuição registradas."),
          unavailableMetric("averageRequestResponseTime", "Tempo médio para atender solicitação", "h", "Não existem solicitações comunitárias."),
          unavailableMetric("emergencyAssistance", "Atendimentos emergenciais", "atendimentos", "Não existe classificação de emergência."),
          unavailableMetric("needRecurrence", "Reincidência de necessidade", "%", "Não existem beneficiários identificados para análise longitudinal."),
          unavailableMetric("communityRating", "Avaliação da comunidade", "nota", "Não existe avaliação comunitária."),
          unavailableMetric("communityIncidents", "Incidentes ou reclamações", "incidentes", "Não existe entidade de incidentes comunitários."),
        ],
        monthlySeries: [],
      },
    ];
    const simulated = Boolean(row.simulated);
    return json(
      200,
      ngoDashboardSchema.parse({
        ngoId: actor.profileId,
        periodStart: window.periodStart,
        periodEnd: window.periodEnd,
        generatedAt: new Date().toISOString(),
        sections,
        simulated,
        simulationLabel: simulated ? "SIMULADO" : null,
      }),
    );
  } finally {
    client.release();
  }
};

export const getPlatformDashboard: ApiHandler = async (request) => {
  const window = parseDashboardWindow(request, platformDashboardRequestSchema);
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request, ["platform"]);
    const result = await client.query(
      `WITH scoped_donations AS (
         SELECT * FROM donations
         WHERE created_at >= $1 AND created_at < $2
       ),
       accepted_offers AS (
         SELECT offer.*
         FROM offers AS offer
         JOIN scoped_donations AS donation ON donation.id = offer.donation_id
         WHERE offer.status = 'accepted'
       ),
       scoped_pickups AS (
         SELECT
           pickup.*,
           donation.estimated_weight_kg,
           donation.unit_value_brl,
           donation.simulated,
           receipt.id AS receipt_id,
           receipt.received_weight_kg,
           receipt.condition
         FROM pickups AS pickup
         JOIN scoped_donations AS donation ON donation.id = pickup.donation_id
         LEFT JOIN delivery_receipts AS receipt ON receipt.pickup_id = pickup.id
       )
       SELECT
         (SELECT count(*)::int FROM scoped_donations) AS published,
         (SELECT count(*)::int FROM accepted_offers) AS accepted,
         (SELECT count(*)::int FROM scoped_donations WHERE status = 'expired') AS expired,
         (SELECT avg(extract(epoch FROM (accepted_at - created_at)) / 60.0)
          FROM accepted_offers WHERE accepted_at IS NOT NULL) AS matching_minutes,
         (SELECT count(*)::int FROM scoped_pickups WHERE collected_at IS NOT NULL) AS collected,
         (SELECT count(*)::int FROM scoped_pickups WHERE receipt_id IS NOT NULL) AS received,
         (SELECT count(*)::int FROM accepted_offers WHERE rank > 1) AS fallbacks,
         (SELECT coalesce(sum(estimated_weight_kg)
           FILTER (WHERE collected_at IS NOT NULL), 0)::float8 FROM scoped_pickups)
           AS moved_weight_kg,
         (SELECT count(*)::int FROM scoped_pickups WHERE receipt_id IS NOT NULL
           AND unit_value_brl IS NOT NULL) AS priced_receipts,
         (SELECT coalesce(sum(received_weight_kg * unit_value_brl)
           FILTER (WHERE receipt_id IS NOT NULL AND unit_value_brl IS NOT NULL), 0)::float8
          FROM scoped_pickups) AS rescued_value_brl,
         (SELECT count(*)::int FROM scoped_pickups
           WHERE condition IN ('partial', 'rejected')) AS quality_incidents,
         (SELECT coalesce(bool_or(simulated), false) FROM scoped_donations) AS simulated`,
      [window.periodStart, window.periodEnd],
    );
    const activeResult = await client.query(
      `SELECT
         (SELECT count(DISTINCT seller_id)::int FROM donations
          WHERE created_at >= $1 AND created_at < $2) AS sellers,
         (SELECT count(DISTINCT driver_id)::int FROM pickups
          WHERE driver_id IS NOT NULL
            AND coalesce(assigned_at, created_at) >= $1
            AND coalesce(assigned_at, created_at) < $2) AS drivers,
         (SELECT count(DISTINCT ngo_id)::int FROM offers
          WHERE created_at >= $1 AND created_at < $2) AS ngos,
         (SELECT count(DISTINCT partner_id)::int FROM partner_sponsorships
          WHERE created_at >= $1 AND created_at < $2) AS partners`,
      [window.periodStart, window.periodEnd],
    );
    const row = result.rows[0]!;
    const active = activeResult.rows[0]!;
    const published = numeric(row.published);
    const accepted = numeric(row.accepted);
    const pricedReceipts = numeric(row.priced_receipts);
    const received = numeric(row.received);
    const sections: DashboardSection[] = [
      {
        key: "operation",
        title: "Saúde da operação",
        metrics: [
          availableMetric("publishedOffers", "Ofertas publicadas", published, "ofertas", "calculated"),
          availableMetric("acceptedOffers", "Ofertas aceitas", accepted, "ofertas", "calculated"),
          availableMetric("expiredOffers", "Ofertas expiradas", numeric(row.expired), "ofertas", "calculated"),
          availableMetric("matchingRate", "Taxa de matching", percentage(accepted, published), "%", "calculated"),
          optionalMetric(
            "averageMatchingTime",
            "Tempo médio até o matching",
            nullableNumeric(row.matching_minutes),
            "min",
            "calculated",
            "Não há ofertas aceitas no período.",
          ),
          availableMetric("collectionCompletionRate", "Taxa de coleta concluída", percentage(numeric(row.collected), accepted), "%", "calculated"),
          availableMetric(
            "deliveryCompletionRate",
            "Taxa de entrega concluída",
            percentage(received, accepted),
            "%",
            "calculated",
            "Conclusão exige recebimento confirmado pela ONG.",
          ),
          availableMetric("ngoFallbackRate", "Fallback para outra ONG", percentage(numeric(row.fallbacks), accepted), "%", "calculated", "Aceites com rank maior que 1."),
          unavailableMetric("operationalCostPerDelivery", "Custo operacional por entrega", "BRL", "Não existem custos operacionais registrados."),
          unavailableMetric("incentiveCostPerMission", "Custo de incentivo por missão", "BRL", "Benefícios e recompensas não possuem valor monetário registrado."),
        ],
        monthlySeries: [],
      },
      {
        key: "volume",
        title: "Volume e valor",
        metrics: [
          availableMetric(
            "movedWeightKg",
            "Kg movimentados",
            numeric(row.moved_weight_kg),
            "kg",
            "calculated",
            "Peso estimado das doações coletadas.",
          ),
          pricedReceipts > 0 && pricedReceipts === received
            ? availableMetric(
                "rescuedEconomicValue",
                "Valor econômico resgatado",
                numeric(row.rescued_value_brl),
                "BRL",
                "calculated",
                "Peso recebido multiplicado pelo valor unitário informado.",
              )
            : unavailableMetric(
                "rescuedEconomicValue",
                "Valor econômico resgatado",
                "BRL",
                "Nem todos os recebimentos possuem valor unitário informado.",
              ),
        ],
        monthlySeries: [],
      },
      {
        key: "users",
        title: "Usuários e retenção",
        metrics: [
          availableMetric("activeSellers", "Doadores ativos", numeric(active.sellers), "usuários", "calculated"),
          availableMetric("activeDrivers", "Transportadores ativos", numeric(active.drivers), "usuários", "calculated"),
          availableMetric("activeNgos", "ONGs ativas", numeric(active.ngos), "usuários", "calculated"),
          availableMetric("activePartners", "Patrocinadores ativos", numeric(active.partners), "usuários", "calculated"),
          unavailableMetric("sellerRetention", "Retenção de doadores", "%", "Não existe definição de coorte e retorno versionada."),
          unavailableMetric("driverRetention", "Retenção de transportadores", "%", "Não existe definição de coorte e retorno versionada."),
          unavailableMetric("ngoRetention", "Retenção de ONGs", "%", "Não existe definição de coorte e retorno versionada."),
        ],
        monthlySeries: [],
      },
      {
        key: "trust",
        title: "Qualidade e confiança",
        metrics: [
          availableMetric("qualityIncidents", "Incidentes de qualidade", numeric(row.quality_incidents), "incidentes", "recorded", "Recebimentos parciais ou rejeitados."),
          unavailableMetric("fraudInconsistencies", "Fraudes ou inconsistências", "ocorrências", "Não existe entidade ou classificação de fraude."),
          unavailableMetric("completeEvidenceRate", "Eventos com comprovante completo", "%", "Não existe regra versionada para validar completude de comprovantes."),
        ],
        monthlySeries: [],
      },
    ];
    const simulated = Boolean(row.simulated);
    return json(
      200,
      platformDashboardSchema.parse({
        platformOperatorId: actor.profileId,
        periodStart: window.periodStart,
        periodEnd: window.periodEnd,
        generatedAt: new Date().toISOString(),
        sections,
        simulated,
        simulationLabel: simulated ? "SIMULADO" : null,
      }),
    );
  } finally {
    client.release();
  }
};
