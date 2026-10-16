import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof ZodError) {
    return new ApiError(422, "validation_error", "Requisição inválida.", {
      issues: error.issues,
    });
  }

  const databaseError = error as { code?: string; message?: string };
  if (databaseError.code === "40001" || databaseError.code === "23505") {
    return new ApiError(
      409,
      "state_conflict",
      "O recurso foi alterado ou já processado.",
    );
  }
  if (databaseError.code === "23514" || databaseError.code === "22P02") {
    return new ApiError(
      422,
      "business_validation",
      "A operação viola uma regra de negócio.",
    );
  }

  return new ApiError(500, "internal_error", "Erro interno da API.");
}
