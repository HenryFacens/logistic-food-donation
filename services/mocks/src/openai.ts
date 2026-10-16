import type { FastifyInstance } from "fastify";

import { classify, readSource } from "./classification.js";

export async function registerOpenAiRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post("/classify", async (request) => {
    return classify(request.body, readSource(request.body));
  });

  app.post("/v1/chat/completions", async (request) => {
    const classification = classify(request.body, readSource(request.body));

    return {
      id: "chatcmpl-resgata-simulado",
      object: "chat.completion",
      created: 0,
      model: "resgata-vision-mock",
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: JSON.stringify(classification),
          },
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
      simulated: true,
      label: "SIMULADO",
    };
  });

  app.post("/v1/responses", async (request) => {
    const content = JSON.stringify(
      classify(request.body, readSource(request.body)),
    );

    return {
      id: "resp-resgata-simulado",
      object: "response",
      status: "completed",
      model: "resgata-vision-mock",
      output_text: content,
      output: [
        {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: content }],
        },
      ],
      simulated: true,
      label: "SIMULADO",
    };
  });
}
