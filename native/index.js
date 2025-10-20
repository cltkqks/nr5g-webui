// JavaScript wrapper for the native addon with fallback support

let native = null;
let useNative = false;

try {
  // Try to load the native addon
  native = await import("../build/Release/nr5g_native.node");
  useNative = true;
  console.log("[nr5g-native] Using C++ native addon for performance");
} catch {
  console.warn(
    "[nr5g-native] Native addon not available, using JavaScript fallback"
  );
  console.warn(
    '[nr5g-native] Run "npm run build:native" to compile the C++ addon'
  );
}

// JavaScript fallback implementations
const fallback = {
  computeBounds(points) {
    if (!points || points.length === 0) {
      return { freqMin: 0, freqMax: 1, ampMin: -200, ampMax: 0 };
    }

    let freqMin = Infinity,
      freqMax = -Infinity;
    let ampMin = Infinity,
      ampMax = -Infinity;

    for (const p of points) {
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
  },

  computeNoiseFloor(points) {
    if (!points || points.length === 0) return -200;

    const sorted = [...points].sort((a, b) => a.amplitude - b.amplitude);
    const sampleSize = Math.max(5, Math.floor(sorted.length * 0.2));
    const sum = sorted
      .slice(0, sampleSize)
      .reduce((acc, p) => acc + p.amplitude, 0);
    const noise = sum / sampleSize;

    return Number(noise.toFixed(1));
  },

  buildCoords(points, width, height, bounds) {
    const { freqMin, freqMax, ampMin, ampMax } = bounds;
    const freqSpan = freqMax - freqMin || 1;
    const ampSpan = ampMax - ampMin || 1;

    const coords = new Float32Array(points.length * 2);

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const x = ((p.frequency - freqMin) / freqSpan) * width;
      const y = height - ((p.amplitude - ampMin) / ampSpan) * height;
      coords[i * 2] = x;
      coords[i * 2 + 1] = y;
    }

    return coords;
  },

  generateSpectrumTrace(centerFreqGHz, spanGHz, numPoints, seed) {
    const startFreq = centerFreqGHz - spanGHz / 2;
    const step = spanGHz / (numPoints - 1);
    const baseline = -120;

    // Seeded random function
    let state = seed >>> 0;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x100000000;
    };

    const trace = [];
    for (let i = 0; i < numPoints; i++) {
      const frequency = (startFreq + step * i) * 1e9;
      const noise = baseline + random() * 4 - 2;
      const signalPeak =
        -20 * Math.exp(-Math.pow((i - numPoints / 2) / (numPoints / 10), 2)) +
        5;
      const spur1 =
        -45 * Math.exp(-Math.pow((i - numPoints * 0.3) / (numPoints / 25), 2));
      const spur2 =
        -52 * Math.exp(-Math.pow((i - numPoints * 0.7) / (numPoints / 28), 2));
      const amplitude = noise + signalPeak + spur1 + spur2;

      trace.push({ frequency, amplitude });
    }

    return trace;
  },

  findPeaks(points, maxPeaks) {
    if (!points || points.length === 0) return [];

    const sorted = [...points].sort((a, b) => b.amplitude - a.amplitude);
    return sorted.slice(0, maxPeaks);
  },

  nearestPoint(points, frequencyHz) {
    if (!points || points.length === 0) {
      return { frequency: 0, amplitude: -200 };
    }

    let nearest = points[0];
    let bestDistance = Math.abs(nearest.frequency - frequencyHz);

    for (let i = 1; i < points.length; i++) {
      const distance = Math.abs(points[i].frequency - frequencyHz);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = points[i];
      }
    }

    return nearest;
  },

  processSpectrum(options) {
    const { points, width, height, computeCoords } = options;

    const bounds = fallback.computeBounds(points);
    const noiseFloor = fallback.computeNoiseFloor(points);

    const result = { bounds, noiseFloor };

    if (computeCoords && width && height) {
      result.coords = fallback.buildCoords(points, width, height, bounds);
      result.width = width;
      result.height = height;
    }

    return result;
  },
};

// Export unified API
export function computeBounds(points) {
  return useNative
    ? native.computeBounds(points)
    : fallback.computeBounds(points);
}
export function computeNoiseFloor(points) {
  return useNative
    ? native.computeNoiseFloor(points)
    : fallback.computeNoiseFloor(points);
}
export function buildCoords(points, width, height, bounds) {
  return useNative
    ? native.buildCoords(points, width, height, bounds)
    : fallback.buildCoords(points, width, height, bounds);
}
export function generateSpectrumTrace(centerFreqGHz, spanGHz, numPoints, seed) {
  return useNative
    ? native.generateSpectrumTrace(centerFreqGHz, spanGHz, numPoints, seed)
    : fallback.generateSpectrumTrace(centerFreqGHz, spanGHz, numPoints, seed);
}
export function findPeaks(points, maxPeaks) {
  return useNative
    ? native.findPeaks(points, maxPeaks)
    : fallback.findPeaks(points, maxPeaks);
}
export function nearestPoint(points, frequencyHz) {
  return useNative
    ? native.nearestPoint(points, frequencyHz)
    : fallback.nearestPoint(points, frequencyHz);
}
export function processSpectrum(options) {
  return useNative
    ? native.processSpectrum(options)
    : fallback.processSpectrum(options);
}
export function isNativeAvailable() {
  return useNative;
}
