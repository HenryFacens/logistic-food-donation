import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import type { FastifyInstance } from "fastify";

import { buildApp } from "../src/app.js";

process.env.NODE_ENV = "test";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

test("OpenAI mock returns a canonical deterministic classification", async () => {
  app = await buildApp("openai");
  const response = await app.inject({
    method: "POST",
    url: "/classify",
    payload: {
      manualDescription: "Pães do fim do dia",
      source: "manual",
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    category: "bakery",
    description: "Itens de padaria identificados — SIMULADO",
    confidence: 0.94,
    perishabilityMinutes: 240,
    source: "manual",
    simulated: true,
  });
});

test("maps mock calculates a deterministic Haversine route", async () => {
  app = await buildApp("maps");
  const response = await app.inject({
    method: "POST",
    url: "/route",
    payload: {
      origin: { latitude: -22.8974, longitude: -47.051 },
      destination: { latitude: -22.9071, longitude: -47.0612 },
    },
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.distanceKm, 1.502);
  assert.equal(body.durationMinutes, 4);
  assert.equal(body.label, "SIMULADO");
});

test("ACS mock stores an inspectable message outbox", async () => {
  app = await buildApp("acs");
  await app.inject({ method: "DELETE", url: "/outbox" });

  const sent = await app.inject({
    method: "POST",
    url: "/messages",
    payload: {
      channel: "whatsapp",
      to: "+5519999991002",
      body: "Nova oferta disponível — SIMULADO",
    },
  });
  const listed = await app.inject({ method: "GET", url: "/outbox" });

  assert.equal(sent.statusCode, 202);
  assert.equal(listed.statusCode, 200);
  assert.equal(listed.json().count, 1);
  assert.equal(listed.json().items[0].channel, "whatsapp");
  assert.equal(listed.json().items[0].simulated, true);
});
