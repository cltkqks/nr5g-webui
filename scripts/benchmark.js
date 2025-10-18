/**
 * Benchmark script for comparing native C++ vs JavaScript performance
 * Run with: node scripts/benchmark.js
 */

import {
  isNativeAvailable,
  computeBounds as _computeBounds,
  computeNoiseFloor as _computeNoiseFloor,
  buildCoords as _buildCoords,
  processSpectrum,
} from "../native/index.js";

// Generate test data
function generateTestData(numPoints) {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    points.push({
      frequency: 2.4e9 + i * 1e6,
      amplitude: -100 + Math.random() * 80,
    });
  }
  return points;
}

// JavaScript fallback implementations for comparison
const jsFallback = {
  computeBounds(points) {
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
    return { freqMin, freqMax, ampMin, ampMax };
  },

  computeNoiseFloor(points) {
    const sorted = [...points].sort((a, b) => a.amplitude - b.amplitude);
    const sampleSize = Math.max(5, Math.floor(sorted.length * 0.2));
    const sum = sorted
      .slice(0, sampleSize)
      .reduce((acc, p) => acc + p.amplitude, 0);
    return Number((sum / sampleSize).toFixed(1));
  },

  buildCoords(points, width, height, bounds) {
    const { freqMin, freqMax, ampMin, ampMax } = bounds;
    const freqSpan = freqMax - freqMin || 1;
    const ampSpan = ampMax - ampMin || 1;
    const coords = new Float32Array(points.length * 2);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      coords[i * 2] = ((p.frequency - freqMin) / freqSpan) * width;
      coords[i * 2 + 1] = height - ((p.amplitude - ampMin) / ampSpan) * height;
    }
    return coords;
  },
};

function benchmark(name, fn, iterations = 1000) {
  // Warm up
  for (let i = 0; i < 100; i++) fn();

  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = process.hrtime.bigint();

  const totalMs = Number(end - start) / 1_000_000;
  const avgMs = totalMs / iterations;

  return { totalMs: totalMs.toFixed(2), avgMs: avgMs.toFixed(4) };
}

console.log("🏎️  Native C++ vs JavaScript Performance Benchmark");
console.log("================================================\n");

console.log(
  `Native addon available: ${isNativeAvailable() ? "✅ YES" : "❌ NO"}\n`
);

const testSizes = [256, 512, 1024, 2048];

for (const size of testSizes) {
  console.log(`\n📊 Test with ${size} spectrum points:`);
  console.log("─".repeat(50));

  const testData = generateTestData(size);

  // computeBounds
  const jsB = benchmark("JS Bounds", () => jsFallback.computeBounds(testData));
  const nativeB = benchmark("Native Bounds", () => _computeBounds(testData));
  const speedupB = (parseFloat(jsB.avgMs) / parseFloat(nativeB.avgMs)).toFixed(
    2
  );

  console.log(`computeBounds:`);
  console.log(`  JavaScript: ${jsB.avgMs}ms avg`);
  console.log(`  Native C++: ${nativeB.avgMs}ms avg`);
  console.log(`  Speedup: ${speedupB}x faster 🚀\n`);

  // computeNoiseFloor
  const jsN = benchmark("JS Noise", () =>
    jsFallback.computeNoiseFloor(testData)
  );
  const nativeN = benchmark("Native Noise", () => _computeNoiseFloor(testData));
  const speedupN = (parseFloat(jsN.avgMs) / parseFloat(nativeN.avgMs)).toFixed(
    2
  );

  console.log(`computeNoiseFloor:`);
  console.log(`  JavaScript: ${jsN.avgMs}ms avg`);
  console.log(`  Native C++: ${nativeN.avgMs}ms avg`);
  console.log(`  Speedup: ${speedupN}x faster 🚀\n`);

  // buildCoords
  const bounds = _computeBounds(testData);
  const jsC = benchmark("JS Coords", () =>
    jsFallback.buildCoords(testData, 800, 600, bounds)
  );
  const nativeC = benchmark("Native Coords", () =>
    _buildCoords(testData, 800, 600, bounds)
  );
  const speedupC = (parseFloat(jsC.avgMs) / parseFloat(nativeC.avgMs)).toFixed(
    2
  );

  console.log(`buildCoords (800x600):`);
  console.log(`  JavaScript: ${jsC.avgMs}ms avg`);
  console.log(`  Native C++: ${nativeC.avgMs}ms avg`);
  console.log(`  Speedup: ${speedupC}x faster 🚀\n`);

  // processSpectrum (combined)
  const jsP = benchmark("JS Process", () => {
    const b = jsFallback.computeBounds(testData);
    const n = jsFallback.computeNoiseFloor(testData);
    const c = jsFallback.buildCoords(testData, 800, 600, b);
    return { bounds: b, noiseFloor: n, coords: c };
  });
  const nativeP = benchmark("Native Process", () =>
    processSpectrum({
      points: testData,
      width: 800,
      height: 600,
      computeCoords: true,
    })
  );
  const speedupP = (parseFloat(jsP.avgMs) / parseFloat(nativeP.avgMs)).toFixed(
    2
  );

  console.log(`processSpectrum (full pipeline):`);
  console.log(`  JavaScript: ${jsP.avgMs}ms avg`);
  console.log(`  Native C++: ${nativeP.avgMs}ms avg`);
  console.log(`  Speedup: ${speedupP}x faster 🚀`);
}

console.log("\n\n✅ Benchmark complete!");
console.log("\nNote: Results may vary by system and load.");
console.log("Native C++ provides significant speedups for larger datasets.\n");
