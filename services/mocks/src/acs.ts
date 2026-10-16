import { createHash } from "node:crypto";

import type { FastifyInstance } from "fastify";

import type { OutboxMessage } from "./types.js";

interface MessageBody {
  channel?: "whatsapp" | "sms";
  to?: string;
  body?: string;
}

const outbox: OutboxMessage[] = [];

function createMessage(input: Required<MessageBody>): OutboxMessage {
  const sequence = outbox.length + 1;
  const id = createHash("sha256")
    .update(`${sequence}:${input.channel}:${input.to}:${input.body}`)
    .digest("hex")
    .slice(0, 24);

  return {
    id: `acs-${id}`,
    ...input,
    status: "sent",
    provider: "acs-mock",
    simulated: true,
    label: "SIMULADO",
    createdAt: new Date().toISOString(),
  };
}

function isMessageBody(
  value: MessageBody,
): value is Required<MessageBody> {
  return (
    (value.channel === "whatsapp" || value.channel === "sms") &&
    typeof value.to === "string" &&
    value.to.length > 0 &&
    typeof value.body === "string" &&
    value.body.length > 0
  );
}

export async function registerAcsRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: MessageBody }>("/messages", async (request, reply) => {
    const body = request.body ?? {};
    if (!isMessageBody(body)) {
      return reply.code(400).send({
        error: {
          code: "INVALID_MESSAGE",
          message: "channel, to and body are required",
        },
      });
    }

    const message = createMessage(body);
    outbox.push(message);
    return reply.code(202).send(message);
  });

  for (const channel of ["whatsapp", "sms"] as const) {
    app.post<{ Body: Omit<MessageBody, "channel"> }>(
      `/${channel}`,
      async (request, reply) => {
        const body: MessageBody = { ...request.body, channel };
        if (!isMessageBody(body)) {
          return reply.code(400).send({
            error: {
              code: "INVALID_MESSAGE",
              message: "to and body are required",
            },
          });
        }

        const message = createMessage(body);
        outbox.push(message);
        return reply.code(202).send(message);
      },
    );
  }

  app.get("/outbox", async () => ({
    items: outbox,
    count: outbox.length,
    simulated: true,
    label: "SIMULADO",
  }));

  app.delete("/outbox", async () => {
    const removed = outbox.length;
    outbox.splice(0);
    return { removed };
  });
}
