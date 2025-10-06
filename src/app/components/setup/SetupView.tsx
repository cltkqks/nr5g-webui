import { AnalyzerController } from "../../types/analyzer";
import { ControlPanel } from "../overview/ControlPanel";

interface SetupViewProps {
  controller: AnalyzerController;
}

export function SetupView({ controller }: SetupViewProps) {
  const { state, connect, disconnect } = controller;

  const isConnected = state.connectionState === "connected";

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-50">
              Analyzer setup
            </h2>
            <p className="text-sm text-slate-400">
              Manage instrument connection and key configuration.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                isConnected
                  ? "bg-emerald-500/20 text-emerald-200"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {state.connectionState}
            </span>
            {isConnected ? (
              <button
                onClick={disconnect}
                className="rounded-md border border-slate-800 bg-slate-800/70 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={connect}
                className="rounded-md border border-cyan-600 bg-cyan-500/20 px-3 py-1.5 text-sm font-medium text-cyan-200 hover:bg-cyan-500/25"
              >
                Connect
              </button>
            )}
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Instrument
            </p>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Model</span>
                <span className="text-slate-100">{state.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Serial</span>
                <span className="text-slate-100">{state.serial}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Firmware</span>
                <span className="text-slate-100">{state.firmware}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last sync</span>
                <span className="text-slate-100">
                  {state.lastSync ? state.lastSync.toLocaleString() : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Acquisition
            </p>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">State</span>
                <span className="text-slate-100">{state.acquisitionState}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Path mode</span>
                <span className="text-slate-100">{state.config.pathMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Trigger</span>
                <span className="text-slate-100">
                  {state.config.triggerMode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Averaging</span>
                <span className="text-slate-100">
                  ×{state.config.averagingCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ControlPanel controller={controller} />
    </div>
  );
}
