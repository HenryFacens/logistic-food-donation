import { describe, expect, it } from "vitest";
import {
  decodeCursor,
  encodeCursor,
  pageFrom,
} from "../src/pagination.js";

describe("cursor pagination", () => {
  it("round-trips an opaque cursor", () => {
    const value = {
      id: "30000000-0000-4000-8000-000000000001",
      createdAt: "2026-10-01T12:00:00.000Z",
    };
    expect(decodeCursor(encodeCursor(value))).toEqual(value);
  });

  it("returns the extra row only as a continuation signal", () => {
    const rows = [1, 2, 3].map((index) => ({
      id: `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      createdAt: `2026-10-0${index}T12:00:00.000Z`,
    }));
    const page = pageFrom(rows, 2);
    expect(page.items).toHaveLength(2);
    expect(page.page.hasMore).toBe(true);
    expect(page.page.nextCursor).not.toBeNull();
  });
});
