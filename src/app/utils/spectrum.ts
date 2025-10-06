import {
  AnalyzerConfig,
  AnalyzerMarker,
  AnalyzerTraceMemory,
  SpectrumTracePoint,
} from "../types/analyzer";

export function computeNoiseFloor(
  points: { amplitude: number }[]
): number | null {
  if (!points || points.length === 0) return null;
  const sorted = [...points].sort((a, b) => a.amplitude - b.amplitude);
  const sampleSize = Math.max(5, Math.floor(sorted.length * 0.2));
  const floorSlice = sorted.slice(0, sampleSize);
  const noise =
    floorSlice.reduce((total, p) => total + p.amplitude, 0) / floorSlice.length;
  return Number(noise.toFixed(1));
}

export function generateSpectrumTrace(
  config: AnalyzerConfig,
  options?: { seed?: number }
): SpectrumTracePoint[] {
  const points = 256;
  const startFreq = config.centerFrequencyGHz - config.spanGHz / 2;
  const step = config.spanGHz / (points - 1);
  const baseline = -120;
  const random =
    options?.seed === undefined
      ? Math.random
      : (function createSeededRandom(seed: number) {
          let state = seed >>> 0;
          return () => {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            return state / 0x100000000;
          };
        })(options.seed);

  return Array.from({ length: points }, (_, idx) => {
    const frequency = (startFreq + step * idx) * 1e9;
    const noise = baseline + random() * 4 - 2;
    const signalPeak =
      -20 * Math.exp(-Math.pow((idx - points / 2) / (points / 10), 2)) + 5;
    const spur1 =
      -45 * Math.exp(-Math.pow((idx - points * 0.3) / (points / 25), 2));
    const spur2 =
      -52 * Math.exp(-Math.pow((idx - points * 0.7) / (points / 28), 2));
    const amplitude = noise + signalPeak + spur1 + spur2;
    return { frequency, amplitude };
  });
}

export function findMarkers(spectrum: SpectrumTracePoint[]): AnalyzerMarker[] {
  return [...spectrum]
    .sort((a, b) => b.amplitude - a.amplitude)
    .slice(0, 3)
    .map((point, index) => ({ ...point, label: `M${index + 1}` }));
}

export function nearestPoint(
  spectrum: SpectrumTracePoint[],
  frequencyHz: number
): SpectrumTracePoint | null {
  if (!spectrum || spectrum.length === 0) return null;
  let nearest = spectrum[0];
  let best = Math.abs(nearest.frequency - frequencyHz);
  for (let i = 1; i < spectrum.length; i++) {
    const d = Math.abs(spectrum[i].frequency - frequencyHz);
    if (d < best) {
      best = d;
      nearest = spectrum[i];
    }
  }
  return nearest;
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
