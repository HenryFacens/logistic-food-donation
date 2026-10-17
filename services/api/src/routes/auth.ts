import {
  requestLoginCodeRequestSchema,
  verifyLoginCodeRequestSchema,
} from "@resgata/shared";
import { randomBytes, randomInt } from "node:crypto";
import { hashSecret, loadActorByUserId } from "../auth.js";
import { getConfig } from "../config.js";
import { getPool } from "../db.js";
import { ApiError } from "../errors.js";
import { json, parseJson, type ApiHandler } from "../http.js";

const CODE_TTL_MINUTES = 10;
const MAX_CODES_PER_WINDOW = 3;
const CODE_WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 5;

const codeHash = (userId: string, code: string) =>
  hashSecret(`login:${userId}:${code}`);

export const requestLoginCode: ApiHandler = async (request) => {
  const body = await parseJson(request, requestLoginCodeRequestSchema);
  const config = getConfig();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const user = await client.query<{ id: string }>(
      "SELECT id FROM users WHERE phone = $1 FOR UPDATE",
      [body.phone],
    );
    const userId = user.rows[0]?.id;
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);
    // Unknown numbers get the same response so phone numbers cannot be probed.
    if (!userId) {
      await client.query("COMMIT");
      return json(200, { sent: true, expiresAt: expiresAt.toISOString() });
    }

    const recent = await client.query<{ count: string }>(
      `SELECT count(*) FROM login_codes
       WHERE user_id = $1
         AND created_at > now() - ($2 * interval '1 minute')`,
      [userId, CODE_WINDOW_MINUTES],
    );
    if (Number(recent.rows[0]?.count ?? 0) >= MAX_CODES_PER_WINDOW) {
      throw new ApiError(
        429,
        "too_many_codes",
        "Muitos códigos solicitados. Aguarde alguns minutos.",
      );
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await client.query(
      `INSERT INTO login_codes (user_id, code_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, codeHash(userId, code), expiresAt],
    );
    await client.query(
      `INSERT INTO notifications (
         user_id, channel, recipient, template, payload, correlation_id
       ) VALUES ($1, 'whatsapp', $2, 'login.code', $3::jsonb, $4)`,
      [
        userId,
        body.phone,
        JSON.stringify({
          message: `Seu código de acesso ao Resgata é ${code}. Ele vale por ${CODE_TTL_MINUTES} minutos. Não compartilhe.`,
          code,
        }),
        request.headers.get("x-correlation-id") ?? crypto.randomUUID(),
      ],
    );
    await client.query("COMMIT");
    return json(200, {
      sent: true,
      expiresAt: expiresAt.toISOString(),
      ...(config.ENABLE_DEV_LOGIN_CODES ? { devCode: code } : {}),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const verifyLoginCode: ApiHandler = async (request) => {
  const body = await parseJson(request, verifyLoginCodeRequestSchema);
  const config = getConfig();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const pending = await client.query<{
      id: string;
      user_id: string;
      code_hash: string;
      attempts: number;
    }>(
      `SELECT code.id, code.user_id, code.code_hash, code.attempts
       FROM login_codes AS code
       JOIN users AS app_user ON app_user.id = code.user_id
       WHERE app_user.phone = $1
         AND code.consumed_at IS NULL
         AND code.expires_at > now()
       ORDER BY code.created_at DESC
       LIMIT 1
       FOR UPDATE OF code`,
      [body.phone],
    );
    const row = pending.rows[0];
    const invalid = new ApiError(
      401,
      "invalid_code",
      "Código inválido ou expirado. Peça um novo código.",
    );
    if (!row || row.attempts >= MAX_ATTEMPTS) {
      await client.query("COMMIT");
      throw invalid;
    }
    if (row.code_hash !== codeHash(row.user_id, body.code)) {
      await client.query(
        "UPDATE login_codes SET attempts = attempts + 1 WHERE id = $1",
        [row.id],
      );
      await client.query("COMMIT");
      throw invalid;
    }

    await client.query(
      "UPDATE login_codes SET consumed_at = now() WHERE id = $1",
      [row.id],
    );
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(
      Date.now() + config.SESSION_TTL_DAYS * 24 * 60 * 60_000,
    );
    await client.query(
      `INSERT INTO sessions (token_hash, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [hashSecret(token), row.user_id, expiresAt],
    );
    const actor = await loadActorByUserId(client, row.user_id);
    await client.query("COMMIT");
    return json(200, {
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: actor.id,
        demoKey: actor.demoKey,
        role: actor.role,
        displayName: actor.displayName,
        phone: actor.phone,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};

export const logout: ApiHandler = async (request) => {
  const match = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(\S+)$/i);
  if (match?.[1]) {
    await getPool().query("DELETE FROM sessions WHERE token_hash = $1", [
      hashSecret(match[1]),
    ]);
  }
  return json(200, { loggedOut: true });
};
