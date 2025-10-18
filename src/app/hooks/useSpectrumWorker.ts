"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SpectrumTracePoint } from "../types/analyzer";

export interface SpectrumWorkerResult {
  bounds: { freqMin: number; freqMax: number; ampMin: number; ampMax: number };
  noiseFloor: number | null;
  coords?: Float32Array;
  width?: number;
  height?: number;
}

export function useSpectrumWorker(
  points: SpectrumTracePoint[],
  options?: {
    width?: number;
    height?: number;
    computeCoords?: boolean;
    enabled?: boolean;
  }
) {
  const {
    width,
    height,
    computeCoords = false,
    enabled = true,
  } = options || {};
  const [result, setResult] = useState<SpectrumWorkerResult | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const supportsWorker =
    typeof window !== "undefined" && typeof Worker !== "undefined";

  useEffect(() => {
    if (!supportsWorker || !enabled) return;
    if (!workerRef.current) {
      // Use ESM worker to satisfy Turbopack's "static in ecmascript" expectation
      workerRef.current = new Worker(
        new URL("../workers/spectrum.worker.ts", import.meta.url),
        { type: "module", name: "spectrum-worker" }
      );
    }
    const worker = workerRef.current;
    const handleMessage = (ev: MessageEvent) => {
      const data = ev.data as SpectrumWorkerResult & { type?: string };
      if (!data || data.type !== "result") return;
      setResult({ ...data });
    };
    worker.addEventListener("message", handleMessage);
    return () => {
      worker.removeEventListener("message", handleMessage);
    };
  }, [supportsWorker, enabled]);

  useEffect(() => {
    if (!supportsWorker || !enabled) {
      setResult(null);
      return;
    }
    if (!workerRef.current) return;
    const worker = workerRef.current;
    try {
      worker.postMessage({
        type: "process",
        points,
        width,
        height,
        computeCoords,
      });
    } catch {}
  }, [points, width, height, computeCoords, supportsWorker, enabled]);

  return useMemo(() => ({ result, ready: !!result }), [result]);
}
