import type { MessageEnvelope } from "@resgata/shared";
import type { QueryResultRow } from "pg";
import type { SqlExecutor } from "../infrastructure/database.js";
interface PickupNotificationRow extends QueryResultRow {
  pickup_status: string;
  donation_description: string;
  simulated: boolean;
  seller_phone: string;
  ngo_phone: string;
  driver_phone: string | null;
  seller_user_id: string;
  ngo_user_id: string;
  driver_user_id: string | null;
}

export function createPickupMessage(
  row: Pick<PickupNotificationRow, "donation_description" | "simulated">,
  pickupStatus: string,
): string {
  const prefix = row.simulated ? "SIMULADO - " : "";
  const action =
    pickupStatus === "delivered"
      ? "Entrega confirmada"
      : pickupStatus === "collected"
        ? "Coleta confirmada"
        : "Atualização da coleta";
  return `${prefix}${action}: ${row.donation_description}.`;
}

export async function handlePickupNotification(
  message: MessageEnvelope,
  transaction: SqlExecutor,
): Promise<void> {
  const pickupId = message.payload.pickupId;
  if (typeof pickupId !== "string") {
    throw new Error("pickup.confirmed payload requires pickupId");
  }
  const result = await transaction.query<PickupNotificationRow>(
    `
      SELECT
        pickup.status AS pickup_status,
        donation.description AS donation_description,
        donation.simulated,
        seller_user.id AS seller_user_id,
        seller_user.phone AS seller_phone,
        ngo_user.id AS ngo_user_id,
        ngo_user.phone AS ngo_phone,
        driver_user.id AS driver_user_id,
        driver_user.phone AS driver_phone
      FROM pickups AS pickup
      JOIN donations AS donation ON donation.id = pickup.donation_id
      JOIN sellers AS seller ON seller.id = donation.seller_id
      JOIN users AS seller_user ON seller_user.id = seller.user_id
      JOIN ngos AS ngo ON ngo.id = pickup.ngo_id
      JOIN users AS ngo_user ON ngo_user.id = ngo.user_id
      LEFT JOIN drivers AS driver ON driver.id = pickup.driver_id
      LEFT JOIN users AS driver_user ON driver_user.id = driver.user_id
      WHERE pickup.id = $1
    `,
    [pickupId],
  );
  const row = result.rows[0];
  if (!row) {
    return;
  }
  const eventPickupStatus =
    message.payload.pickupStatus === "collected" ||
    message.payload.pickupStatus === "delivered"
      ? message.payload.pickupStatus
      : row.pickup_status;
  const recipients = [
    { userId: row.seller_user_id, phone: row.seller_phone },
    { userId: row.ngo_user_id, phone: row.ngo_phone },
    ...(row.driver_user_id && row.driver_phone
      ? [{ userId: row.driver_user_id, phone: row.driver_phone }]
      : []),
  ];
  const notificationMessage = createPickupMessage(row, eventPickupStatus);
  for (const recipient of recipients) {
    await transaction.query(
      `
        INSERT INTO notifications (
          user_id,
          channel,
          recipient,
          template,
          payload,
          correlation_id
        ) VALUES ($1, 'sms', $2, 'pickup.confirmed', $3::jsonb, $4)
      `,
      [
        recipient.userId,
        recipient.phone,
        JSON.stringify({
          message: notificationMessage,
          pickupId,
          pickupStatus: eventPickupStatus,
        }),
        message.correlationId,
      ],
    );
  }
}
