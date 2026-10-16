export function retryDelayMs(attempt: number): number {
  if (!Number.isInteger(attempt) || attempt <= 0) {
    throw new RangeError("attempt must be a positive integer");
  }
  const exponential = 1_000 * 2 ** (attempt - 1);
  return Math.min(exponential, 5 * 60_000);
}

export function retryAt(attempt: number, now = new Date()): Date {
  return new Date(now.getTime() + retryDelayMs(attempt));
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 4_000);
  }
  return String(error).slice(0, 4_000);
}
