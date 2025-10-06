/// <reference lib="webworker" />

// Lightweight spectrum processing in a Web Worker.
// Computes bounds, noise floor, and optionally screen-space coordinates.

export type SpectrumPoint = { frequency: number; amplitude: number };

type ProcessRequest = {
  type: "process";
  points: SpectrumPoint[];
  width?: number;
  height?: number;
  computeCoords?: boolean;
};

type ProcessResult = {
  type: "result";
  bounds: { freqMin: number; freqMax: number; ampMin: number; ampMax: number };
  noiseFloor: number | null;
  // Interleaved x,y coordinates for direct canvas rendering
  coords?: Float32Array;
  width?: number;
  height?: number;
};

function computeBounds(points: SpectrumPoint[]) {
  let freqMin = Infinity,
    freqMax = -Infinity,
    ampMin = Infinity,
    ampMax = -Infinity;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.frequency < freqMin) freqMin = p.frequency;
    if (p.frequency > freqMax) freqMax = p.frequency;
    if (p.amplitude < ampMin) ampMin = p.amplitude;
    if (p.amplitude > ampMax) ampMax = p.amplitude;
  }
  if (!isFinite(freqMin) || !isFinite(freqMax)) {
    freqMin = 0;
    freqMax = 1;
  }
  if (!isFinite(ampMin) || !isFinite(ampMax)) {
    ampMin = -200;
    ampMax = 0;
  }
  return { freqMin, freqMax, ampMin, ampMax };
}

function computeNoiseFloor(points: SpectrumPoint[]): number | null {
  if (!points || points.length === 0) return null;
  // Follow the same semantics as utils/spectrum.computeNoiseFloor
  const amps = points.map((p) => p.amplitude).sort((a, b) => a - b);
  const sampleSize = Math.max(5, Math.floor(amps.length * 0.2));
  let sum = 0;
  for (let i = 0; i < sampleSize; i++) sum += amps[i];
  const noise = sum / sampleSize;
  return Number(noise.toFixed(1));
}

function buildCoords(
  points: SpectrumPoint[],
  width: number,
  height: number,
  bounds: { freqMin: number; freqMax: number; ampMin: number; ampMax: number }
) {
  const { freqMin, freqMax, ampMin, ampMax } = bounds;
  const freqSpan = freqMax - freqMin || 1;
  const ampSpan = ampMax - ampMin || 1;
  const out = new Float32Array(points.length * 2);
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const x = ((p.frequency - freqMin) / freqSpan) * width;
    const y = height - ((p.amplitude - ampMin) / ampSpan) * height;
    out[i * 2] = x;
    out[i * 2 + 1] = y;
  }
  return out;
}

self.onmessage = (ev: MessageEvent<ProcessRequest>) => {
  const msg = ev.data;
  if (!msg || msg.type !== "process") return;
  const { points, width, height, computeCoords } = msg;
  const bounds = computeBounds(points);
  const noiseFloor = computeNoiseFloor(points);
  const result: ProcessResult = { type: "result", bounds, noiseFloor };
  if (
    computeCoords &&
    typeof width === "number" &&
    typeof height === "number"
  ) {
    const coords = buildCoords(points, width, height, bounds);
    // Transfer the underlying buffer for performance
    (self as unknown as Worker).postMessage(
      { ...result, coords, width, height },
      [coords.buffer]
    );
    return;
  }
  (self as unknown as Worker).postMessage(result);
};
