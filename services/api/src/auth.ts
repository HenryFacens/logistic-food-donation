import type { HttpRequest } from "@azure/functions";
import type { PoolClient } from "pg";
import type { Role } from "@resgata/shared";
import { demoUserSchema } from "@resgata/shared";
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

export async function requireActor(
  client: PoolClient,
  request: HttpRequest,
  allowedRoles?: readonly Role[],
): Promise<Actor> {
  const demoKey = request.headers.get("x-demo-user");
  if (!demoKey) {
    throw new ApiError(
      401,
      "unauthorized",
      "Selecione um usuário de demonstração.",
    );
  }

  const result = await client.query<ActorRow>(
    `SELECT
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
      AND platform_operator.active
     WHERE user_account.demo_key = $1`,
    [demoKey],
  );
  const row = result.rows[0];
  if (!row?.profile_id) {
    throw new ApiError(401, "unauthorized", "Usuário de demonstração inválido.");
  }
  if (allowedRoles && !allowedRoles.includes(row.role)) {
    throw new ApiError(
      401,
      "role_not_allowed",
      "Este perfil não pode executar a operação.",
    );
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
