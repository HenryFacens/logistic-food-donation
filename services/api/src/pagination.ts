import { z } from "zod";
import { ApiError } from "./errors.js";

const cursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});

export type Cursor = z.infer<typeof cursorSchema>;

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeCursor(value?: string): Cursor | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return cursorSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
  } catch {
    throw new ApiError(422, "invalid_cursor", "Cursor de paginação inválido.");
  }
}

export function pageFrom<T extends { id: string; createdAt: string }>(
  rows: T[],
  limit: number,
): { items: T[]; page: { nextCursor: string | null; hasMore: boolean } } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items.at(-1);
  return {
    items,
    page: {
      hasMore,
      nextCursor:
        hasMore && last
          ? encodeCursor({ id: last.id, createdAt: last.createdAt })
          : null,
    },
  };
}
