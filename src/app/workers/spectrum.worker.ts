/// <reference lib="webworker" />

import * as nativeSpectrum from "../utils/spectrum-native";

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
  coords?: Float32Array;
  width?: number;
  height?: number;
  usedNative?: boolean;
};

self.onmessage = (ev: MessageEvent<ProcessRequest>) => {
  const msg = ev.data;
  if (!msg || msg.type !== "process") return;
  const { points, width, height, computeCoords } = msg;

  const bounds = nativeSpectrum.computeBounds(points);
  const noiseFloor = nativeSpectrum.computeNoiseFloor(points);

  const result: ProcessResult = {
    type: "result",
    bounds,
    noiseFloor,
    usedNative: nativeSpectrum.isNativeAvailable(),
  };

  if (
    computeCoords &&
    typeof width === "number" &&
    typeof height === "number"
  ) {
    const coords = nativeSpectrum.buildCoords(points, width, height, bounds);
    (self as unknown as Worker).postMessage(
      { ...result, coords, width, height },
      [coords.buffer]
    );
    return;
  }
  (self as unknown as Worker).postMessage(result);
};
