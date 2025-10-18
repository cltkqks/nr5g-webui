// TypeScript definitions for the native C++ addon

export interface SpectrumPoint {
  frequency: number;
  amplitude: number;
}

export interface Bounds {
  freqMin: number;
  freqMax: number;
  ampMin: number;
  ampMax: number;
}

export interface ProcessSpectrumOptions {
  points: SpectrumPoint[];
  width?: number;
  height?: number;
  computeCoords?: boolean;
}

export interface ProcessSpectrumResult {
  bounds: Bounds;
  noiseFloor: number;
  coords?: Float32Array;
  width?: number;
  height?: number;
}

/**
 * Compute frequency and amplitude bounds from spectrum points
 */
export function computeBounds(points: SpectrumPoint[]): Bounds;

/**
 * Compute noise floor using statistical analysis
 * Returns the average of the lowest 20% of amplitudes
 */
export function computeNoiseFloor(points: SpectrumPoint[]): number;

/**
 * Build screen-space coordinates for rendering
 * Returns interleaved x,y coordinates as Float32Array
 */
export function buildCoords(
  points: SpectrumPoint[],
  width: number,
  height: number,
  bounds: Bounds
): Float32Array;

/**
 * Generate synthetic spectrum trace with signal peaks and noise
 */
export function generateSpectrumTrace(
  centerFreqGHz: number,
  spanGHz: number,
  numPoints: number,
  seed: number
): SpectrumPoint[];

/**
 * Find top N peaks in spectrum data
 */
export function findPeaks(
  points: SpectrumPoint[],
  maxPeaks: number
): SpectrumPoint[];

/**
 * Find nearest point to a given frequency
 */
export function nearestPoint(
  points: SpectrumPoint[],
  frequencyHz: number
): SpectrumPoint;

/**
 * Process spectrum data in one call (optimized)
 * Computes bounds, noise floor, and optionally screen coordinates
 */
export function processSpectrum(
  options: ProcessSpectrumOptions
): ProcessSpectrumResult;
