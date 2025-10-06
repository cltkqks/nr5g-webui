import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSpectrumWorker } from "../../hooks/useSpectrumWorker";
import {
  AnalyzerController,
  AnalyzerEventLogEntry,
  AnalyzerMarker,
  AnalyzerTraceMemory,
} from "../../types/analyzer";
import { formatFrequencyHz, formatRelativeTime } from "../../utils/format";
import { computeNoiseFloor } from "../../utils/spectrum";
import { CanvasSpectrum } from "./CanvasSpectrum";

interface SpectrumViewProps {
  controller: AnalyzerController;
}

interface ChartGeometry {
  path: string;
  fillPath: string;
  width: number;
  height: number;
  freqMin: number;
  freqMax: number;
  ampMin: number;
  ampMax: number;
}

const CHART_WIDTH = 880;
const CHART_HEIGHT = 320;
// Switch to Canvas/WebGL rendering when the trace is large
const CANVAS_THRESHOLD = 3000; // tune between 2000–4000 based on device

const markerColors = ["#22d3ee", "#f472b6", "#fbbf24", "#a855f7"];

function buildChartGeometry(
  points: { frequency: number; amplitude: number }[]
): ChartGeometry | null {
  if (!points || points.length === 0) {
    return null;
  }

  const freqValues = points.map((point) => point.frequency);
  const ampValues = points.map((point) => point.amplitude);
  const freqMin = Math.min(...freqValues);
  const freqMax = Math.max(...freqValues);
  const ampMin = Math.min(...ampValues);
  const ampMax = Math.max(...ampValues);
  const freqSpan = freqMax - freqMin || 1;
  const ampSpan = ampMax - ampMin || 1;

  const path = points
    .map((point, index) => {
      const x = ((point.frequency - freqMin) / freqSpan) * CHART_WIDTH;
      const y =
        CHART_HEIGHT - ((point.amplitude - ampMin) / ampSpan) * CHART_HEIGHT;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const fillPath = `${path} L ${CHART_WIDTH},${CHART_HEIGHT} L 0,${CHART_HEIGHT} Z`;

  return {
    path,
    fillPath,
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    freqMin,
    freqMax,
    ampMin,
    ampMax,
  };
}

function MarkersTable({
  markers,
  noiseFloor,
  onDelete,
}: {
  markers: AnalyzerMarker[];
  noiseFloor: number | null;
  onDelete: (label: string) => void;
}) {
  if (markers.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
        No active markers assigned. Enable peak search to populate this table.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-x-auto">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-200">Marker table</h3>
        {noiseFloor !== null && (
          <span className="text-xs text-slate-500">
            Noise floor ≈ {noiseFloor.toFixed(1)} dBm
          </span>
        )}
      </header>
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-24" />
          <col className="w-28" />
          <col className="w-24" />
          <col className="w-20" />
          <col className="w-24" />
        </colgroup>
        <thead className="text-xs uppercase tracking-wide text-slate-500 whitespace-nowrap">
          <tr className="border-b border-slate-800">
            <th className="px-4 py-2 text-left">Marker</th>
            <th className="px-4 py-2 text-right">Frequency</th>
            <th className="px-4 py-2 text-right">Level</th>
            <th className="px-4 py-2 text-right">Δ floor</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {markers.map((marker, index) => {
            const snr =
              noiseFloor !== null
                ? Number((marker.amplitude - noiseFloor).toFixed(1))
                : null;
            return (
              <tr
                key={marker.label}
                className="border-b border-slate-800/60 last:border-b-0"
              >
                <td className="px-4 py-2 text-slate-200">
                  <span
                    className="mr-2 inline-flex h-2.5 w-2.5 items-center justify-center rounded-full"
                    style={{
                      backgroundColor:
                        markerColors[index % markerColors.length],
                    }}
                  />
                  {marker.label}
                </td>
                <td className="px-4 py-2 text-right text-slate-300 whitespace-nowrap">
                  {formatFrequencyHz(marker.frequency)}
                </td>
                <td className="px-4 py-2 text-right text-slate-100 whitespace-nowrap">
                  {marker.amplitude.toFixed(2)} dBm
                </td>
                <td className="px-4 py-2 text-right text-slate-300 whitespace-nowrap">
                  {snr !== null
                    ? `${snr >= 0 ? "+" : ""}${snr.toFixed(1)} dB`
                    : "--"}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    className="rounded-md border border-slate-700/60 bg-slate-800/60 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
                    onClick={() => onDelete(marker.label)}
                    title={`Remove ${marker.label}`}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TraceMemoriesPanel({ memories }: { memories: AnalyzerTraceMemory[] }) {
  if (memories.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
        <header className="mb-2">
          <h3 className="text-base font-semibold text-slate-100">
            Trace memories
          </h3>
        </header>
        <p className="text-sm text-slate-400">
          No stored traces yet. Capture holds during acquisition to populate
          this list.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Trace memories
          </h3>
          <p className="text-sm text-slate-400">
            Maintain reference captures for delta traces and offline comparison.
          </p>
        </div>
        <span className="text-xs uppercase tracking-wide text-slate-500">
          {memories.length} stored
        </span>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {memories.map((memory) => (
          <article
            key={memory.id}
            className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
          >
            <header className="mb-3 flex items-start justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-100">
                  {memory.label}
                </h4>
                <p className="text-xs text-slate-500">
                  {formatRelativeTime(memory.capturedAt)}
                </p>
              </div>
              <span className="rounded-full bg-slate-800/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                {memory.pathMode}
              </span>
            </header>
            <dl className="grid gap-2 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <dt>Peak</dt>
                <dd className="text-sm font-semibold text-slate-100">
                  {memory.peakAmplitudeDbm.toFixed(1)} dBm @{" "}
                  {formatFrequencyHz(memory.peakFrequencyHz)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Noise floor</dt>
                <dd>{memory.noiseFloorDbm.toFixed(1)} dBm</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Reference level</dt>
                <dd>{memory.referenceLevelDbm.toFixed(1)} dBm</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Span</dt>
                <dd>{memory.spanGHz.toFixed(2)} GHz</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

const levelColor: Record<AnalyzerEventLogEntry["level"], string> = {
  info: "text-cyan-300",
  warning: "text-amber-300",
  error: "text-rose-300",
};

function EventLogPanel({ entries }: { entries: AnalyzerEventLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
        <header className="mb-2">
          <h3 className="text-base font-semibold text-slate-100">
            Activity log
          </h3>
        </header>
        <p className="text-sm text-slate-400">
          No instrument events captured yet. Start an acquisition to populate
          the log.
        </p>
      </section>
    );
  }

  const counts = entries.reduce(
    (acc, entry) => {
      acc[entry.level] += 1;
      return acc;
    },
    { info: 0, warning: 0, error: 0 }
  );

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Activity log
          </h3>
          <p className="text-sm text-slate-400">
            Chronicle of connection, acquisition, and configuration events.
          </p>
        </div>
        <div className="flex gap-2 text-xs uppercase tracking-wide text-slate-500">
          <span>info {counts.info}</span>
          <span>warning {counts.warning}</span>
          <span>error {counts.error}</span>
        </div>
      </header>
      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-wide text-slate-500">
            <tr className="border-b border-slate-800">
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Event</th>
              <th className="px-4 py-3 text-left">Detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-slate-800/60 last:border-b-0"
              >
                <td className="px-4 py-2 text-xs text-slate-400">
                  {entry.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </td>
                <td className="px-4 py-2 text-xs text-slate-500">
                  {entry.source}
                </td>
                <td
                  className={`px-4 py-2 text-sm font-medium ${
                    levelColor[entry.level]
                  }`}
                >
                  {entry.message}
                </td>
                <td className="px-4 py-2 text-sm text-slate-300">
                  {entry.detail ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SpectrumView({ controller }: SpectrumViewProps) {
  const { state } = controller;
  const {
    addMarkerAtFrequency,
    moveMarkerToFrequency,
    deleteMarker,
    setMarkerAutoPeakSearch,
    clearMarkers,
  } = controller;
  const {
    config,
    spectrum,
    markers,
    traceMemories,
    eventLog,
    acquisitionState,
  } = state;

  // Drag handling for markers
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingLabel, setDraggingLabel] = useState<string | null>(null);

  const useCanvas = spectrum.length >= CANVAS_THRESHOLD;
  const worker = useSpectrumWorker(spectrum, {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    computeCoords: useCanvas,
    enabled: spectrum.length >= 1000, // offload heavier traces
  });

  const chart = useMemo(
    () => (useCanvas ? null : buildChartGeometry(spectrum)),
    [spectrum, useCanvas]
  );
  const noiseFloor = useMemo(() => {
    // Prefer worker value if available
    if (worker.ready && typeof worker.result?.noiseFloor === "number") {
      return worker.result.noiseFloor;
    }
    return computeNoiseFloor(spectrum);
  }, [worker.ready, worker.result, spectrum]);

  const bounds = useMemo(() => {
    if (worker.ready && worker.result?.bounds) return worker.result.bounds;
    if (!spectrum || spectrum.length === 0)
      return { freqMin: 0, freqMax: 1, ampMin: -200, ampMax: 0 };
    const freqValues = spectrum.map((p) => p.frequency);
    const ampValues = spectrum.map((p) => p.amplitude);
    return {
      freqMin: Math.min(...freqValues),
      freqMax: Math.max(...freqValues),
      ampMin: Math.min(...ampValues),
      ampMax: Math.max(...ampValues),
    };
  }, [worker.ready, worker.result, spectrum]);
  const recentMemories = useMemo(
    () =>
      [...traceMemories]
        .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime())
        .slice(0, 4),
    [traceMemories]
  );
  const recentLog = useMemo(
    () =>
      [...eventLog]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 12),
    [eventLog]
  );

  const suppressClickRef = useRef(false);
  const didDragRef = useRef(false);

  const handleChartClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
      if (suppressClickRef.current) {
        // Swallow the click generated after a drag
        suppressClickRef.current = false;
        return;
      }
      // Use geometry bounds from chart or worker
      const g = chart
        ? { freqMin: chart.freqMin, freqMax: chart.freqMax }
        : bounds;
      if (!g) return;
      const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.min(Math.max(x / rect.width, 0), 1);
      const freq = g.freqMin + ratio * (g.freqMax - g.freqMin);
      addMarkerAtFrequency(freq);
    },
    [chart, bounds, addMarkerAtFrequency]
  );

  const handleMarkerMouseDown = useCallback(
    (e: React.MouseEvent, label: string) => {
      e.preventDefault();
      didDragRef.current = false;
      setDraggingLabel(label);
    },
    []
  );

  const handleMarkerClick = useCallback(
    (e: React.MouseEvent, label: string) => {
      // Prevent the chart click handler from adding a new marker
      e.stopPropagation();
      // If we didn't drag, interpret as remove action
      if (!didDragRef.current) {
        deleteMarker(label);
      }
    },
    [deleteMarker]
  );

  useEffect(() => {
    if (!draggingLabel) return;
    let raf = 0;
    const handleMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      // Throttle with rAF to avoid excessive updates
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = Math.min(Math.max(x / rect.width, 0), 1);
        const g = chart
          ? { freqMin: chart.freqMin, freqMax: chart.freqMax }
          : bounds;
        const freq = g.freqMin + ratio * (g.freqMax - g.freqMin);
        moveMarkerToFrequency(draggingLabel, freq);
        didDragRef.current = true;
      });
    };
    const handleUp = () => {
      if (didDragRef.current) {
        suppressClickRef.current = true;
      }
      setDraggingLabel(null);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp, { once: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [draggingLabel, chart, moveMarkerToFrequency, bounds]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Spectrum workspace
            </h2>
            <p className="text-sm text-slate-400">
              Center {config.centerFrequencyGHz.toFixed(2)} GHz • Span{" "}
              {config.spanGHz.toFixed(2)} GHz • BW{" "}
              {config.analysisBandwidthGHz.toFixed(1)} GHz
            </p>
          </div>
          <div className="text-right text-xs uppercase tracking-wide text-slate-500">
            <p>acquisition</p>
            <p className="text-sm font-semibold text-cyan-300">
              {acquisitionState}
            </p>
          </div>
        </header>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
            {useCanvas ? (
              <div className="relative h-[320px] w-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
                <CanvasSpectrum
                  points={spectrum}
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT}
                  bounds={bounds}
                  noiseFloor={
                    typeof noiseFloor === "number" ? noiseFloor : null
                  }
                  coords={worker.result?.coords}
                  markerColors={markerColors}
                />
                <svg
                  viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                  className="absolute inset-0 h-full w-full"
                  onClick={handleChartClick}
                  ref={svgRef}
                >
                  {markers.map((marker, index) => {
                    const x =
                      ((marker.frequency - bounds.freqMin) /
                        (bounds.freqMax - bounds.freqMin || 1)) *
                      CHART_WIDTH;
                    const y =
                      CHART_HEIGHT -
                      ((marker.amplitude - bounds.ampMin) /
                        (bounds.ampMax - bounds.ampMin || 1)) *
                        CHART_HEIGHT;
                    const color = markerColors[index % markerColors.length];
                    return (
                      <g
                        key={marker.label}
                        onMouseDown={(e) =>
                          handleMarkerMouseDown(e, marker.label)
                        }
                        onClick={(e) => handleMarkerClick(e, marker.label)}
                        style={{ cursor: "ew-resize" }}
                      >
                        <line
                          x1={x}
                          y1={CHART_HEIGHT}
                          x2={x}
                          y2={y - 10}
                          stroke={color}
                          strokeDasharray="4 4"
                          strokeOpacity={0.4}
                        />
                        <circle
                          cx={x}
                          cy={y}
                          r={6}
                          fill={color}
                          stroke="#0f172a"
                          strokeWidth={2}
                        />
                        <text
                          x={x + 10}
                          y={Math.max(16, y - 10)}
                          className="text-[11px] font-semibold"
                          fill={color}
                        >
                          {marker.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : chart ? (
              <svg
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                className="h-[320px] w-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950"
                onClick={handleChartClick}
                ref={svgRef}
              >
                <defs>
                  <linearGradient id="spectrumFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <path
                  d={chart.fillPath}
                  fill="url(#spectrumFill)"
                  opacity={0.35}
                />
                <path
                  d={chart.path}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {typeof noiseFloor === "number" && (
                  <line
                    x1={0}
                    y1={
                      chart.height -
                      ((noiseFloor - chart.ampMin) /
                        (chart.ampMax - chart.ampMin || 1)) *
                        chart.height
                    }
                    x2={chart.width}
                    y2={
                      chart.height -
                      ((noiseFloor - chart.ampMin) /
                        (chart.ampMax - chart.ampMin || 1)) *
                        chart.height
                    }
                    stroke="#334155"
                    strokeDasharray="6 6"
                    strokeWidth={1}
                  />
                )}
                {markers.map((marker, index) => {
                  const x =
                    ((marker.frequency - chart.freqMin) /
                      (chart.freqMax - chart.freqMin || 1)) *
                    chart.width;
                  const y =
                    chart.height -
                    ((marker.amplitude - chart.ampMin) /
                      (chart.ampMax - chart.ampMin || 1)) *
                      chart.height;
                  const color = markerColors[index % markerColors.length];
                  return (
                    <g
                      key={marker.label}
                      onMouseDown={(e) =>
                        handleMarkerMouseDown(e, marker.label)
                      }
                      onClick={(e) => handleMarkerClick(e, marker.label)}
                      style={{ cursor: "ew-resize" }}
                    >
                      <line
                        x1={x}
                        y1={chart.height}
                        x2={x}
                        y2={y - 10}
                        stroke={color}
                        strokeDasharray="4 4"
                        strokeOpacity={0.4}
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={6}
                        fill={color}
                        stroke="#0f172a"
                        strokeWidth={2}
                      />
                      <text
                        x={x + 10}
                        y={Math.max(16, y - 10)}
                        className="text-[11px] font-semibold"
                        fill={color}
                      >
                        {marker.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="flex h-[320px] items-center justify-center text-sm text-slate-400">
                Waiting for live spectrum trace…
              </div>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm">
              <button
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  state.markerAutoPeakSearch
                    ? "bg-cyan-600/20 text-cyan-300 border border-cyan-700/40"
                    : "bg-slate-800/60 text-slate-300 border border-slate-700/60"
                }`}
                onClick={() =>
                  setMarkerAutoPeakSearch(!state.markerAutoPeakSearch)
                }
                title="Toggle automatic peak search markers"
              >
                Peak Search {state.markerAutoPeakSearch ? "On" : "Off"}
              </button>
              <button
                className="rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                onClick={() => clearMarkers()}
                disabled={markers.length === 0}
                title="Clear all markers"
              >
                Clear Markers
              </button>
            </div>
            <MarkersTable
              markers={markers}
              noiseFloor={noiseFloor}
              onDelete={deleteMarker}
            />
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  Reference level
                </span>
                <span className="text-base font-semibold text-slate-100">
                  {config.referenceLevelDbm.toFixed(1)} dBm
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  RBW / VBW
                </span>
                <span>
                  {config.rbwKHz.toFixed(0)} kHz / {config.vbwKHz.toFixed(0)}{" "}
                  kHz
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TraceMemoriesPanel memories={recentMemories} />
      <EventLogPanel entries={recentLog} />
    </div>
  );
}
