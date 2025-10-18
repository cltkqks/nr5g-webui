"use client";

import { useEffect, useMemo, useRef } from "react";
import { SpectrumTracePoint } from "../../types/analyzer";

interface CanvasSpectrumProps {
  points: SpectrumTracePoint[];
  width: number;
  height: number;
  bounds: { freqMin: number; freqMax: number; ampMin: number; ampMax: number };
  noiseFloor: number | null;
  coords?: Float32Array; // optional precomputed screen-space coordinates
  markerColors: string[];
}

export function CanvasSpectrum(props: CanvasSpectrumProps) {
  const { points, width, height, bounds, noiseFloor, coords } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const pixelRatio =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const drawData = useMemo(
    () => ({ points, bounds, width, height, coords }),
    [points, bounds, width, height, coords]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = pixelRatio;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, width, height);

    const { freqMin, freqMax, ampMin, ampMax } = drawData.bounds;

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#22d3ee";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const freqSpan = freqMax - freqMin || 1;
    const ampSpan = ampMax - ampMin || 1;

    ctx.beginPath();
    const len = drawData.points.length;
    if (drawData.coords && drawData.coords.length >= len * 2) {
      const c = drawData.coords;
      ctx.moveTo(c[0], c[1]);
      for (let i = 1; i < len; i++) {
        const x = c[i * 2];
        const y = c[i * 2 + 1];
        ctx.lineTo(x, y);
      }
    } else {
      const first = drawData.points[0];
      let x = ((first.frequency - freqMin) / freqSpan) * width;
      let y = height - ((first.amplitude - ampMin) / ampSpan) * height;
      ctx.moveTo(x, y);
      for (let i = 1; i < len; i++) {
        const p = drawData.points[i];
        x = ((p.frequency - freqMin) / freqSpan) * width;
        y = height - ((p.amplitude - ampMin) / ampSpan) * height;
        ctx.lineTo(x, y);
      }
    }

    ctx.save();
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "rgba(34, 211, 238, 0.9)");
    grad.addColorStop(1, "rgba(15, 23, 42, 0.1)");
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    if (drawData.coords && drawData.coords.length >= len * 2) {
      const c = drawData.coords;
      ctx.moveTo(c[0], c[1]);
      for (let i = 1; i < len; i++) {
        const x = c[i * 2];
        const y = c[i * 2 + 1];
        ctx.lineTo(x, y);
      }
    } else {
      const first = drawData.points[0];
      let x = ((first.frequency - freqMin) / freqSpan) * width;
      let y = height - ((first.amplitude - ampMin) / ampSpan) * height;
      ctx.moveTo(x, y);
      for (let i = 1; i < len; i++) {
        const p = drawData.points[i];
        x = ((p.frequency - freqMin) / freqSpan) * width;
        y = height - ((p.amplitude - ampMin) / ampSpan) * height;
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    if (typeof noiseFloor === "number") {
      const y = height - ((noiseFloor - ampMin) / ampSpan) * height;
      ctx.strokeStyle = "#334155";
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [drawData, noiseFloor, pixelRatio, width, height]);

  return <canvas ref={canvasRef} />;
}
