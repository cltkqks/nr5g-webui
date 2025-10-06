import { describe, it, expect } from "vitest";
import { formatFrequencyHz } from "../src/app/utils/format";

describe("formatFrequencyHz", () => {
  it("formats GHz", () => {
    expect(formatFrequencyHz(28e9)).toBe("28.000 GHz");
  });
  it("formats MHz", () => {
    expect(formatFrequencyHz(12.345e6)).toBe("12.345 MHz");
  });
  it("formats kHz", () => {
    expect(formatFrequencyHz(1500)).toBe("1.5 kHz");
  });
});
