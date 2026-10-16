import { uuidSchema } from "@resgata/shared";
import { requireActor } from "../auth.js";
import { getPool } from "../db.js";
import { ApiError } from "../errors.js";
import { type ApiHandler } from "../http.js";
import { mapDonationEvent } from "../mappers.js";
import { donationVisibility } from "../visibility.js";

export const streamEvents: ApiHandler = async (request) => {
  const donationIdValue = request.query.get("donationId");
  const donationId = donationIdValue
    ? uuidSchema.parse(donationIdValue)
    : undefined;
  const lastEventIdValue = request.headers.get("last-event-id");
  const lastEventId = lastEventIdValue
    ? uuidSchema.parse(lastEventIdValue)
    : undefined;
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request);
    const visibility = donationVisibility(actor);
    const values: unknown[] = [...visibility.params];
    const filters = [visibility.sql];
    if (donationId) {
      values.push(donationId);
      filters.push(`event.donation_id = $${values.length}`);
    }
    if (lastEventId) {
      values.push(lastEventId);
      const lastIndex = values.length;
      filters.push(
        `(event.occurred_at, event.id) > (
          SELECT previous.occurred_at, previous.id
          FROM events AS previous
          WHERE previous.id = $${lastIndex}
        )`,
      );
    }
    const result = await client.query(
      `SELECT event.*
       FROM events AS event
       JOIN donations AS donation ON donation.id = event.donation_id
       WHERE ${filters.join(" AND ")}
       ORDER BY event.occurred_at, event.id
       LIMIT 100`,
      values,
    );
    if (lastEventId && result.rowCount === 0) {
      const exists = await client.query(
        "SELECT 1 FROM events WHERE id = $1",
        [lastEventId],
      );
      if (!exists.rowCount) {
        throw new ApiError(
          422,
          "invalid_last_event_id",
          "O identificador do último evento não existe.",
        );
      }
    }
    const payload = result.rows
      .map(mapDonationEvent)
      .map(
        (event) =>
          `id: ${event.id}\nevent: ${event.eventType}\ndata: ${JSON.stringify(event)}\n`,
      )
      .join("\n");
    return {
      status: 200,
      body: `retry: 3000\n\n${payload}: keep-alive\n\n`,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    };
  } finally {
    client.release();
  }
};
