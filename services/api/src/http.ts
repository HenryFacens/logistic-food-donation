import { randomUUID } from "node:crypto";
import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  correlationIdSchema,
  idempotencyKeySchema,
  uuidSchema,
} from "@resgata/shared";
import type { ZodType } from "zod";
import { ApiError, normalizeError } from "./errors.js";

export type ApiHandler = (
  request: HttpRequest,
  context: InvocationContext,
) => Promise<HttpResponseInit>;

export function correlationIdFrom(request: HttpRequest): string {
  const supplied = request.headers.get("x-correlation-id");
  return supplied ? correlationIdSchema.parse(supplied) : randomUUID();
}

export function idempotencyKeyFrom(request: HttpRequest): string {
  const value = request.headers.get("idempotency-key");
  if (!value) {
    throw new ApiError(
      422,
      "idempotency_key_required",
      "O cabeçalho Idempotency-Key é obrigatório.",
    );
  }
  return idempotencyKeySchema.parse(value);
}

export function pathUuid(request: HttpRequest, name: string): string {
  return uuidSchema.parse(request.params[name]);
}

export async function parseJson<T>(
  request: HttpRequest,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(422, "invalid_json", "O corpo JSON é inválido.");
  }
  return schema.parse(body);
}

export async function parseOptionalJson<T>(
  request: HttpRequest,
  schema: ZodType<T>,
  fallback: T,
): Promise<T> {
  const text = await request.text();
  if (!text.trim()) {
    return fallback;
  }
  try {
    return schema.parse(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ApiError(422, "invalid_json", "O corpo JSON é inválido.");
    }
    throw error;
  }
}

export function json(
  status: number,
  body: unknown,
  correlationId?: string,
  headers?: Record<string, string>,
): HttpResponseInit {
  return {
    status,
    jsonBody: body,
    headers: {
      ...(correlationId ? { "X-Correlation-Id": correlationId } : {}),
      ...headers,
    },
  };
}

export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (request, context) => {
    let correlationId: string;
    try {
      correlationId = correlationIdFrom(request);
      const response = await handler(request, context);
      return {
        ...response,
        headers: {
          "X-Correlation-Id": correlationId,
          ...(response.headers ?? {}),
        },
      };
    } catch (rawError) {
      const error = normalizeError(rawError);
      correlationId = request.headers.get("x-correlation-id") ?? randomUUID();
      context.error(error, { code: error.code, correlationId });
      return json(
        error.status,
        {
          error: {
            code: error.code,
            message: error.message,
            correlationId,
            ...(error.details ? { details: error.details } : {}),
          },
        },
        correlationId,
      );
    }
  };
}
