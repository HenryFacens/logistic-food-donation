import type { MessageEnvelope } from "@resgata/shared";
import type { QueryResultRow } from "pg";
import type { SqlExecutor } from "../infrastructure/database.js";
interface OfferNotificationRow extends QueryResultRow {
  user_id: string;
  phone: string;
  ngo_name: string;
  description: string;
  expires_at: Date;
  simulated: boolean;
}

export function createOfferMessage(row: OfferNotificationRow): string {
  // Demo data is presented as real, so messages carry no simulation prefix.
  const prefix = "";
  return (
    `${prefix}Nova oferta para ${row.ngo_name}: ${row.description}. ` +
    `Responda no Resgata antes de ${row.expires_at.toISOString()}.`
  );
}

export async function handleOfferNotification(
  message: MessageEnvelope,
  transaction: SqlExecutor,
): Promise<void> {
  const offerId = message.payload.offerId;
  if (typeof offerId !== "string") {
    throw new Error("offer.sent payload requires offerId");
  }
  const result = await transaction.query<OfferNotificationRow>(
    `
      SELECT
        app_user.id AS user_id,
        app_user.phone,
        ngo.name AS ngo_name,
        donation.description,
        offer.expires_at,
        donation.simulated
      FROM offers AS offer
      JOIN ngos AS ngo ON ngo.id = offer.ngo_id
      JOIN users AS app_user ON app_user.id = ngo.user_id
      JOIN donations AS donation ON donation.id = offer.donation_id
      WHERE offer.id = $1
    `,
    [offerId],
  );
  const row = result.rows[0];
  if (!row) {
    return;
  }
  await transaction.query(
    `
      INSERT INTO notifications (
        user_id,
        channel,
        recipient,
        template,
        payload,
        correlation_id
      ) VALUES ($1, 'sms', $2, 'offer.sent', $3::jsonb, $4)
    `,
    [
      row.user_id,
      row.phone,
      JSON.stringify({ message: createOfferMessage(row), offerId }),
      message.correlationId,
    ],
  );
}
