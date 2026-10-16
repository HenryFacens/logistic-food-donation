import type { QueryResultRow } from "pg";
import type { Database } from "../infrastructure/database.js";
import { errorMessage, retryAt } from "../messaging/retry.js";
import type { NotificationSender } from "./notification-sender.js";

interface NotificationRow extends QueryResultRow {
  id: string;
  recipient: string;
  payload: {
    message?: unknown;
    nextAttemptAt?: unknown;
  };
  attempts: number;
}

export class NotificationDispatcher {
  constructor(
    private readonly database: Database,
    private readonly sender: NotificationSender,
    private readonly maxAttempts: number,
  ) {}

  async run(limit: number): Promise<number> {
    const notifications = await this.database.transaction(
      async (transaction) => {
        const result = await transaction.query<NotificationRow>(
          `
            WITH claimable AS (
              SELECT id
              FROM notifications
              WHERE status IN ('pending', 'failed')
                AND (
                  payload ->> 'nextAttemptAt' IS NULL
                  OR (payload ->> 'nextAttemptAt')::timestamptz <= now()
                )
              ORDER BY created_at, id
              FOR UPDATE SKIP LOCKED
              LIMIT $1
            )
            UPDATE notifications AS notification
            SET status = 'processing',
                attempts = notification.attempts + 1
            FROM claimable
            WHERE notification.id = claimable.id
            RETURNING
              notification.id,
              notification.recipient,
              notification.payload,
              notification.attempts
          `,
          [limit],
        );
        return result.rows;
      },
    );

    let sent = 0;
    for (const notification of notifications) {
      const text = notification.payload.message;
      if (typeof text !== "string" || text.length === 0) {
        await this.fail(
          notification,
          "notification payload requires a message",
        );
        continue;
      }
      try {
        await this.sender.send({
          idempotencyKey: notification.id,
          recipients: [notification.recipient],
          message: text,
        });
        await this.database.query(
          `
            UPDATE notifications
            SET status = 'processed',
                sent_at = now(),
                last_error = NULL,
                payload = payload - 'nextAttemptAt'
            WHERE id = $1
              AND status = 'processing'
          `,
          [notification.id],
        );
        sent += 1;
      } catch (error) {
        await this.fail(notification, errorMessage(error));
      }
    }
    return sent;
  }

  private async fail(
    notification: NotificationRow,
    detail: string,
  ): Promise<void> {
    if (notification.attempts >= this.maxAttempts) {
      await this.database.query(
        `
          UPDATE notifications
          SET status = 'dead_letter',
              last_error = $2
          WHERE id = $1
            AND status = 'processing'
        `,
        [notification.id, detail],
      );
      return;
    }
    await this.database.query(
      `
        UPDATE notifications
        SET status = 'failed',
            last_error = $2,
            payload = jsonb_set(
              payload,
              '{nextAttemptAt}',
              to_jsonb($3::text),
              true
            )
        WHERE id = $1
          AND status = 'processing'
      `,
      [
        notification.id,
        detail,
        retryAt(notification.attempts).toISOString(),
      ],
    );
  }
}
