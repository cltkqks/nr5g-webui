import { describe, it, expect } from "vitest";
import { createEventLogEntry } from "../src/app/utils/logs";
import { createId } from "../src/app/utils/id";

describe("utils/logs & id", () => {
  it("creates log entries with defaults", () => {
    const entry = createEventLogEntry({
      level: "info",
      source: "test",
      message: "hello",
    });
    expect(entry.id).toMatch(/^log-/);
    expect(entry.timestamp).toBeInstanceOf(Date);
  });

  it("createId prefixes id and is non-empty", () => {
    const id = createId("x");
    expect(id.startsWith("x-")).toBe(true);
    expect(id.length).toBeGreaterThan(3);
  });
});
