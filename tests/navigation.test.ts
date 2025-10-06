import { describe, it, expect } from "vitest";
import { isValidTabId } from "../src/app/navigation";

describe("navigation", () => {
  it("validates known tabs", () => {
    expect(isValidTabId("overview")).toBe(true);
    expect(isValidTabId("spectrum")).toBe(true);
  });
  it("rejects invalid", () => {
    expect(isValidTabId("")).toBe(false);
    expect(isValidTabId("unknown")).toBe(false);
    expect(isValidTabId(null)).toBe(false);
  });
});
