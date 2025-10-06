import { AnalyzerAcquisitionState, AnalyzerConfig } from "../../types/analyzer";

interface DualPathStatusProps {
  config: AnalyzerConfig;
  acquisitionState: AnalyzerAcquisitionState;
}

const pathDescriptions: Record<AnalyzerConfig["pathMode"], string> = {
  "1RF":
    "Single input path active. Ideal for traditional swept spectrum analysis.",
  "2RF":
    "Dual coherent receivers running independently. Enable dual-signal capture.",
  correlation:
    "Cross-correlation running. Internal noise cancelled for ultra-low DANL measurements.",
};

export function DualPathStatus({
  config,
  acquisitionState,
}: DualPathStatusProps) {
  const correlationDepth =
    config.pathMode === "correlation"
      ? config.averagingCount
      : Math.max(1, Math.floor(config.averagingCount / 4));

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Dual-path engine
          </h2>
          <p className="text-sm text-slate-400">
            Monitor cross-correlation health and bandwidth splits.
          </p>
        </div>
        <span className="text-xs uppercase tracking-wide text-slate-500">
          {acquisitionState}
        </span>
      </header>
      <div className="mb-5 grid gap-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Mode</p>
          <p className="text-base font-semibold text-cyan-200">
            {config.pathMode}
          </p>
          <p className="text-xs text-slate-400">
            {pathDescriptions[config.pathMode]}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Port A bandwidth
            </p>
            <p className="text-lg font-semibold text-slate-100">
              {config.pathMode === "correlation"
                ? `${(config.analysisBandwidthGHz / 2).toFixed(2)} GHz`
                : `${config.analysisBandwidthGHz.toFixed(2)} GHz`}
            </p>
            <p className="text-xs text-slate-500">RF1</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Port B bandwidth
            </p>
            <p className="text-lg font-semibold text-slate-100">
              {config.pathMode === "1RF"
                ? "Disabled"
                : `${(
                    config.analysisBandwidthGHz /
                    (config.pathMode === "correlation" ? 2 : 1)
                  ).toFixed(2)} GHz`}
            </p>
            <p className="text-xs text-slate-500">RF2</p>
          </div>
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs">
        <div>
          <p className="uppercase tracking-wide text-slate-500">
            Correlation depth
          </p>
          <p className="text-base font-semibold text-slate-200">
            ×{correlationDepth}
          </p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-slate-500">
            Residual DANL
          </p>
          <p className="text-base font-semibold text-slate-200">
            ≈ -174 dBm/Hz
          </p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-slate-500">
            YIG preselector
          </p>
          <p className="text-base font-semibold text-slate-200">
            {config.spanGHz < 0.5 ? "Available" : "Bypassed"}
          </p>
        </div>
      </footer>
    </section>
  );
}
