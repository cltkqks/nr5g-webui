import { useMemo } from "react";
import {
  AnalyzerController,
  AnalyzerMeasurement,
  AnalyzerMeasurementLogEntry,
} from "../../types/analyzer";
import { formatRelativeTime as formatRelative } from "../../utils/format";

interface MeasurementsViewProps {
  controller: AnalyzerController;
}

const statusColor: Record<AnalyzerMeasurement["status"], string> = {
  good: "text-emerald-400",
  warning: "text-amber-300",
  critical: "text-rose-300",
};

function MeasurementSummaryPanel({
  acquisitionState,
  averagingCount,
  triggerMode,
  pathMode,
  lastSync,
}: {
  acquisitionState: string;
  averagingCount: number;
  triggerMode: string;
  pathMode: string;
  lastSync: Date | null;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Measurement suites
          </h2>
          <p className="text-sm text-slate-400">
            Continuous logging of EVM, ACLR, noise figure, and linearity
            metrics.
          </p>
        </div>
        <span className="text-xs uppercase tracking-wide text-slate-500">
          Last sync {lastSync ? formatRelative(lastSync) : "never"}
        </span>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Acquisition
          </p>
          <p className="text-lg font-semibold text-cyan-300">
            {acquisitionState}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Averaging depth
          </p>
          <p className="text-lg font-semibold text-slate-100">
            ×{averagingCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Trigger mode
          </p>
          <p className="text-lg font-semibold text-slate-100">{triggerMode}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Path mode
          </p>
          <p className="text-lg font-semibold text-slate-100">{pathMode}</p>
        </div>
      </div>
    </section>
  );
}

function MeasurementsTable({
  measurements,
}: {
  measurements: AnalyzerMeasurement[];
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-100">
          Live measurement results
        </h3>
        <span className="text-xs uppercase tracking-wide text-slate-500">
          {measurements.length} metrics
        </span>
      </header>
      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-wide text-slate-500">
            <tr className="border-b border-slate-800">
              <th className="px-4 py-3 text-left">Measurement</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3 text-right">Delta</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {measurements.map((measurement) => (
              <tr
                key={measurement.id}
                className="border-b border-slate-800/60 last:border-b-0"
              >
                <td className="px-4 py-3 text-slate-200">
                  <div className="font-semibold text-slate-100">
                    {measurement.label}
                  </div>
                  {measurement.description && (
                    <p className="text-xs text-slate-500">
                      {measurement.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-slate-100">
                  <span className="text-lg font-semibold">
                    {measurement.value}
                  </span>
                  {measurement.unit && (
                    <span className="ml-1 text-xs text-slate-400">
                      {measurement.unit}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-slate-300">
                  {measurement.delta ?? "--"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium uppercase tracking-wide ${
                      statusColor[measurement.status]
                    }`}
                  >
                    {measurement.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function calculateCaptureRate(
  entries: AnalyzerMeasurementLogEntry[]
): number | null {
  if (entries.length < 2) {
    return null;
  }
  const sorted = [...entries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  const durationMs =
    sorted[sorted.length - 1].timestamp.getTime() -
    sorted[0].timestamp.getTime();
  if (durationMs <= 0) {
    return null;
  }
  const minutes = durationMs / 60_000;
  if (minutes === 0) {
    return null;
  }
  return Number(((entries.length - 1) / minutes).toFixed(1));
}

const logStatusColor: Record<AnalyzerMeasurementLogEntry["status"], string> = {
  good: "bg-emerald-500/20 text-emerald-200",
  warning: "bg-amber-500/20 text-amber-300",
  critical: "bg-rose-500/20 text-rose-200",
};

function MeasurementLogPanel({
  entries,
}: {
  entries: AnalyzerMeasurementLogEntry[];
}) {
  if (entries.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
        <header className="mb-2">
          <h3 className="text-base font-semibold text-slate-100">
            Measurement log
          </h3>
        </header>
        <p className="text-sm text-slate-400">
          Measurement logging is idle. Start a capture or enable auto-logging to
          begin collecting entries.
        </p>
      </section>
    );
  }

  const captureRate = calculateCaptureRate(entries);
  const latestEntries = entries
    .slice()
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 16);

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Measurement log
          </h3>
          <p className="text-sm text-slate-400">
            Timestamped snapshots captured during acquisition cycles.
          </p>
        </div>
        <div className="flex flex-col items-end text-xs text-slate-500">
          <span>{entries.length} total entries</span>
          {captureRate !== null && <span>≈ {captureRate} logs/min</span>}
        </div>
      </header>
      <div className="grow overflow-hidden rounded-xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-wide text-slate-500">
            <tr className="border-b border-slate-800">
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Measurement</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3 text-right">Delta</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {latestEntries.map((entry) => (
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
                <td className="px-4 py-2 text-slate-200">{entry.label}</td>
                <td className="px-4 py-2 text-right text-slate-100">
                  {entry.value}
                  {entry.unit && (
                    <span className="ml-1 text-xs text-slate-400">
                      {entry.unit}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right text-slate-300">
                  {entry.delta ?? "--"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                      logStatusColor[entry.status]
                    }`}
                  >
                    {entry.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LoggingSettingsPanel({
  enabled,
  retention,
  autoBookmarks,
}: {
  enabled: boolean;
  retention: number;
  autoBookmarks: number;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-100">
          Logging configuration
        </h3>
        <span
          className={`text-xs font-medium uppercase tracking-wide ${
            enabled ? "text-emerald-300" : "text-slate-500"
          }`}
        >
          {enabled ? "enabled" : "disabled"}
        </span>
      </header>
      <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Retention
          </p>
          <p className="text-lg font-semibold text-slate-100">
            {retention} entries
          </p>
          <p className="text-xs text-slate-500">
            Rolling buffer preserved in memory.
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Auto bookmarks
          </p>
          <p className="text-lg font-semibold text-slate-100">
            {autoBookmarks}
          </p>
          <p className="text-xs text-slate-500">
            Threshold breaches saved to favorites.
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Export
          </p>
          <p className="text-lg font-semibold text-slate-100">CSV &amp; JSON</p>
          <p className="text-xs text-slate-500">
            Download log snapshots for offline review.
          </p>
        </div>
      </div>
    </section>
  );
}

export function MeasurementsView({ controller }: MeasurementsViewProps) {
  const { state } = controller;
  const { measurements, measurementLog, config, acquisitionState, lastSync } =
    state;

  const sortedMeasurements = useMemo(
    () => [...measurements].sort((a, b) => a.label.localeCompare(b.label)),
    [measurements]
  );

  const logEntries = useMemo(() => [...measurementLog], [measurementLog]);

  return (
    <div className="flex flex-col gap-6">
      <MeasurementSummaryPanel
        acquisitionState={acquisitionState}
        averagingCount={config.averagingCount}
        triggerMode={config.triggerMode}
        pathMode={config.pathMode}
        lastSync={lastSync}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <MeasurementsTable measurements={sortedMeasurements} />
        <MeasurementLogPanel entries={logEntries} />
      </div>
      <LoggingSettingsPanel
        enabled={logEntries.length > 0}
        retention={Math.max(logEntries.length, 120)}
        autoBookmarks={6}
      />
    </div>
  );
}
