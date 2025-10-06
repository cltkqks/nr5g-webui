import { describe, it, expect } from "vitest";
import {
  findMarkers,
  nearestPoint,
  createTraceMemory,
  generateSpectrumTrace,
} from "../src/app/utils/spectrum";

const baseConfig = {
  centerFrequencyGHz: 28,
  spanGHz: 2,
  analysisBandwidthGHz: 2,
  referenceLevelDbm: 10,
  rbwKHz: 100,
  vbwKHz: 30,
  attenuationDb: 20,
  averagingCount: 100,
  triggerMode: "free run" as const,
  pathMode: "correlation" as const,
};

describe("spectrum utils (more)", () => {
  it("findMarkers picks top N", () => {
    const trace = [
      { frequency: 1, amplitude: -80 },
      { frequency: 2, amplitude: -40 },
      { frequency: 3, amplitude: -60 },
    ];
    const markers = findMarkers(trace);
    expect(markers[0].amplitude).toBeCloseTo(-40);
  });

  it("nearestPoint returns closest by frequency", () => {
    const trace = [
      { frequency: 1000, amplitude: -80 },
      { frequency: 2000, amplitude: -50 },
      { frequency: 3000, amplitude: -60 },
    ];
    expect(nearestPoint(trace, 2100)?.frequency).toBe(2000);
  });

  it("createTraceMemory handles empty trace", () => {
    const mem = createTraceMemory({
      trace: [],
      config: baseConfig,
      label: "x",
      capturedAt: new Date(),
    });
    expect(mem.peakAmplitudeDbm).toBe(-200);
    expect(mem.spanGHz).toBe(baseConfig.spanGHz);
  });

  it("createTraceMemory extracts peak & floor from trace", () => {
    const trace = generateSpectrumTrace(baseConfig, { seed: 123 });
    const mem = createTraceMemory({
      trace,
      config: baseConfig,
      label: "x",
      capturedAt: new Date(),
    });
    expect(mem.peakAmplitudeDbm).toBeLessThan(10);
    expect(mem.noiseFloorDbm).toBeLessThan(-80);
  });
});
