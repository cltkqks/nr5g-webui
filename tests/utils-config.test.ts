import { describe, it, expect } from "vitest";
import {
  formatConfigFragment,
  summarizeConfigChanges,
} from "../src/app/utils/config";

describe("utils/config", () => {
  it("formats individual fragments", () => {
    expect(formatConfigFragment("centerFrequencyGHz", 28)).toBe(
      "center 28.00 GHz"
    );
    expect(formatConfigFragment("rbwKHz", 100)).toBe("RBW 100 kHz");
    expect(formatConfigFragment("pathMode", "2RF")).toBe("path 2RF");
  });

  it("summarizes partial config", () => {
    const summary = summarizeConfigChanges({
      spanGHz: 2,
      triggerMode: "video",
    });
    expect(summary).toContain("span 2.00 GHz");
    expect(summary).toContain("trigger video");
  });
});
