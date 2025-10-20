import { describe, it, expect } from "vitest";
import { computeNoiseFloor, nextMarkerLabel } from "../src/app/utils/spectrum";

describe("computeNoiseFloor", () => {
  it("returns null for empty", () => {
    expect(computeNoiseFloor([])).toBeNull();
  });
  it("computes approximate floor", () => {
    const noise = [-100, -102, -101, -99, -100, -101, -102, -99, -100].map(
      (a) => ({ amplitude: a })
    );
    const pts = [...noise, { amplitude: -50 }];
    const floor = computeNoiseFloor(pts);
    expect(floor).toBeLessThan(-95);
    expect(floor).toBeGreaterThan(-110);
  });
});

describe("nextMarkerLabel", () => {
  it("increments numeric suffix", () => {
    const label = nextMarkerLabel([
      { label: "M1", frequency: 1, amplitude: 1 },
      { label: "M3", frequency: 1, amplitude: 1 },
    ]);
    expect(label).toBe("M4");
  });
  it("starts at M1 for none", () => {
    expect(nextMarkerLabel([])).toBe("M1");
  });
});
