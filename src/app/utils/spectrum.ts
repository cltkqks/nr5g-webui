import {
  AnalyzerConfig,
  AnalyzerMarker,
  AnalyzerTraceMemory,
  SpectrumTracePoint,
} from "../types/analyzer";
import * as nativeSpectrum from "./spectrum-native";

export function computeNoiseFloor(
  points: { amplitude: number }[]
): number | null {
  const spectrumPoints = points.map((p) => ({
    frequency: 0,
    amplitude: p.amplitude,
  }));
  return nativeSpectrum.computeNoiseFloor(spectrumPoints);
}

export function generateSpectrumTrace(
  config: AnalyzerConfig,
  options?: { seed?: number }
): SpectrumTracePoint[] {
  const points = 256;
  const seed = options?.seed ?? Math.floor(Math.random() * 0xffffffff);

  return nativeSpectrum.generateSpectrumTrace(
    config.centerFrequencyGHz,
    config.spanGHz,
    points,
    seed
  );
}

export function findMarkers(spectrum: SpectrumTracePoint[]): AnalyzerMarker[] {
  const peaks = nativeSpectrum.findPeaks(spectrum, 3);
  return peaks.map((point, index) => ({ ...point, label: `M${index + 1}` }));
}

export function nearestPoint(
  spectrum: SpectrumTracePoint[],
  frequencyHz: number
): SpectrumTracePoint | null {
  return nativeSpectrum.nearestPoint(spectrum, frequencyHz);
}

export function nextMarkerLabel(markers: AnalyzerMarker[]): string {
  const nextIndex =
    markers.reduce((max, m) => {
      const match = /^M(\d+)$/.exec(m.label);
      const n = match ? Number(match[1]) : 0;
      return Math.max(max, n);
    }, 0) + 1;
  return `M${nextIndex}`;
}

export function createTraceMemory(options: {
  trace: SpectrumTracePoint[];
  config: AnalyzerConfig;
  label: string;
  capturedAt: Date;
}): AnalyzerTraceMemory {
  const { trace, config, label, capturedAt } = options;
  if (trace.length === 0) {
    return {
      id: `trace-${Math.random().toString(36).slice(2, 10)}`,
      label,
      capturedAt,
      peakFrequencyHz: config.centerFrequencyGHz * 1e9,
      peakAmplitudeDbm: -200,
      noiseFloorDbm: -200,
      referenceLevelDbm: config.referenceLevelDbm,
      spanGHz: config.spanGHz,
      pathMode: config.pathMode,
    };
  }

  const peak = trace.reduce((max, p) =>
    p.amplitude > max.amplitude ? p : max
  );
  const floor = computeNoiseFloor(trace) ?? -200;

  return {
    id: `trace-${Math.random().toString(36).slice(2, 10)}`,
    label,
    capturedAt,
    peakFrequencyHz: peak.frequency,
    peakAmplitudeDbm: Number(peak.amplitude.toFixed(1)),
    noiseFloorDbm: Number(floor.toFixed(1)),
    referenceLevelDbm: config.referenceLevelDbm,
    spanGHz: config.spanGHz,
    pathMode: config.pathMode,
  };
}
