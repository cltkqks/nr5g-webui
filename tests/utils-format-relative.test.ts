import { describe, it, expect, vi } from "vitest";
import { formatRelativeTime } from "../src/app/utils/format";

describe("formatRelativeTime", () => {
  it("renders buckets", () => {
    const now = new Date();
    expect(formatRelativeTime(new Date(now.getTime() - 3_000))).toBe(
      "just now"
    );
    const fifteenSec = new Date(now.getTime() - 15_000);
    expect(formatRelativeTime(fifteenSec)).toMatch(/s ago$/);
    const fiveMin = new Date(now.getTime() - 5 * 60_000);
    expect(formatRelativeTime(fiveMin)).toBe("5m ago");
  });
});
