import assert from "node:assert/strict";
import test from "node:test";
import { WhatsAppCloudSender } from "../src/notifications/notification-sender.js";

test("WhatsApp sender posts a template message with the text as {{1}}", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    await new WhatsAppCloudSender({
      token: "test-token",
      phoneNumberId: "123",
      apiVersion: "v21.0",
      templateName: "resgata_aviso",
      templateLanguage: "pt_BR",
    }).send({
      idempotencyKey: "n1",
      recipients: ["+55 19 99999-0001"],
      message: "Nova oferta:\nPães",
    });
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(calls[0]?.url, "https://graph.facebook.com/v21.0/123/messages");
  const body = JSON.parse(String(calls[0]?.init.body));
  assert.equal(body.to, "5519999990001");
  assert.equal(body.template.name, "resgata_aviso");
  assert.equal(body.template.components[0].parameters[0].text, "Nova oferta: Pães");
});
