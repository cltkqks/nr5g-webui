import { AnalyzerMeasurement } from "../../types/analyzer";

interface MeasurementGridProps {
  measurements: AnalyzerMeasurement[];
}

const statusColor: Record<AnalyzerMeasurement["status"], string> = {
  good: "text-emerald-400",
  warning: "text-amber-300",
  critical: "text-rose-300",
};

export function MeasurementGrid({ measurements }: MeasurementGridProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">
          Key measurements
        </h2>
        <span className="text-xs uppercase tracking-wide text-slate-500">
          Using correlation averaging depth 100
        </span>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {measurements.map((measurement) => (
          <article
            key={measurement.id}
            className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  {measurement.label}
                </h3>
                {measurement.description && (
                  <p className="text-xs text-slate-500">
                    {measurement.description}
                  </p>
                )}
              </div>
              <span
                className={`text-xs font-medium uppercase tracking-wide ${
                  statusColor[measurement.status]
                }`}
              >
                {measurement.status}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-50">
                {measurement.value}
              </span>
              {measurement.unit && (
                <span className="text-sm text-slate-400">
                  {measurement.unit}
                </span>
              )}
            </div>
            {measurement.delta && (
              <span className="text-xs text-slate-400">
                Δ {measurement.delta}
              </span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
