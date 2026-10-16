import Fastify, { type FastifyInstance } from "fastify";

import { registerAcsRoutes } from "./acs.js";
import { registerMapsRoutes } from "./maps.js";
import { registerOpenAiRoutes } from "./openai.js";
import type { MockKind } from "./types.js";

export function isMockKind(value: string | undefined): value is MockKind {
  return value === "openai" || value === "maps" || value === "acs";
}

export async function buildApp(kind: MockKind): Promise<FastifyInstance> {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });

  app.get("/health", async () => ({
    status: "ok",
    service: `mock-${kind}`,
    simulated: true,
    label: "SIMULADO",
  }));

  if (kind === "openai") {
    await registerOpenAiRoutes(app);
  } else if (kind === "maps") {
    await registerMapsRoutes(app);
  } else {
    await registerAcsRoutes(app);
  }

  return app;
}
