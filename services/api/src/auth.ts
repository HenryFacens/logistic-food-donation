import type { HttpRequest } from "@azure/functions";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import type { Role } from "@resgata/shared";
import { demoUserSchema } from "@resgata/shared";
import { getConfig } from "./config.js";
import { ApiError } from "./errors.js";

export type Actor = {
  id: string;
  demoKey: string;
  role: Role;
  displayName: string;
  phone: string;
  profileId: string;
};

type ActorRow = {
  id: string;
  demo_key: string;
  role: Role;
  display_name: string;
  phone: string;
  profile_id: string | null;
};

const actorSelect = `SELECT
       user_account.id,
       user_account.demo_key,
       user_account.role,
       user_account.display_name,
       user_account.phone,
       CASE user_account.role
         WHEN 'seller' THEN seller.id
         WHEN 'ngo' THEN ngo.id
         WHEN 'driver' THEN driver.id
         WHEN 'partner' THEN partner.id
         WHEN 'platform' THEN platform_operator.id
       END AS profile_id
     FROM users AS user_account
     LEFT JOIN sellers AS seller ON seller.user_id = user_account.id
     LEFT JOIN ngos AS ngo ON ngo.user_id = user_account.id
     LEFT JOIN drivers AS driver ON driver.user_id = user_account.id
     LEFT JOIN partners AS partner ON partner.user_id = user_account.id
     LEFT JOIN platform_operators AS platform_operator
       ON platform_operator.user_id = user_account.id
      AND platform_operator.active`;

export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function bearerToken(request: HttpRequest): string | null {
  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

async function findActorRow(
  client: PoolClient,
  request: HttpRequest,
): Promise<ActorRow | undefined> {
  const token = bearerToken(request);
  if (token) {
    const result = await client.query<ActorRow>(
      `${actorSelect}
       JOIN sessions AS session ON session.user_id = user_account.id
       WHERE session.token_hash = $1 AND session.expires_at > now()`,
      [hashSecret(token)],
    );
    if (!result.rows[0]) {
      throw new ApiError(401, "session_expired", "Sua sessão expirou. Entre novamente.");
    }
    return result.rows[0];
  }

  const demoKey = request.headers.get("x-demo-user");
  if (!demoKey || !getConfig().ENABLE_DEMO_LOGIN) {
    throw new ApiError(401, "unauthorized", "Entre para continuar.");
  }
  const result = await client.query<ActorRow>(
    `${actorSelect}
     WHERE user_account.demo_key = $1`,
    [demoKey],
  );
  return result.rows[0];
}

export async function loadActorByUserId(
  client: PoolClient,
  userId: string,
): Promise<Actor> {
  const result = await client.query<ActorRow>(
    `${actorSelect}
     WHERE user_account.id = $1`,
    [userId],
  );
  return toActor(result.rows[0]);
}

function toActor(row: ActorRow | undefined): Actor {
  if (!row?.profile_id) {
    throw new ApiError(401, "unauthorized", "Usuário inválido.");
  }
  const user = demoUserSchema.parse({
    id: row.id,
    demoKey: row.demo_key,
    role: row.role,
    displayName: row.display_name,
    phone: row.phone,
  });
  return { ...user, profileId: row.profile_id };
}

export async function requireActor(
  client: PoolClient,
  request: HttpRequest,
  allowedRoles?: readonly Role[],
): Promise<Actor> {
  const actor = toActor(await findActorRow(client, request));
  if (allowedRoles && !allowedRoles.includes(actor.role)) {
    throw new ApiError(
      401,
      "role_not_allowed",
      "Este perfil não pode executar a operação.",
    );
  }
  return actor;
}
