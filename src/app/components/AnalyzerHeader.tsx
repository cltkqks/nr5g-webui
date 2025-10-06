import { AnalyzerController } from "../types/analyzer";
import { StatusPill } from "./StatusPill";

interface AnalyzerHeaderProps {
  controller: AnalyzerController;
}

export function AnalyzerHeader({ controller }: AnalyzerHeaderProps) {
  const { state, connect, disconnect, toggleAcquisition } = controller;
  const isConnected = state.connectionState === "connected";
  const isCapturing = state.acquisitionState === "capturing";
  const hasBridge = Boolean(process.env.NEXT_PUBLIC_ANALYZER_WS_URL);
  const connectionCopy: Record<typeof state.connectionState, string> = {
    connected: "Linked to instrument via LAN (SCPI).",
    connecting: "Attempting session hand-shake...",
    disconnected: hasBridge
      ? "No active session. Initiate connection to control the analyzer."
      : "Bridge URL not configured. Set NEXT_PUBLIC_ANALYZER_WS_URL to reach the analyzer.",
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-100">
              {state.model}
            </h1>
            <StatusPill status={state.connectionState} />
          </div>
          <p className="text-sm text-slate-400">
            Serial {state.serial} • FW {state.firmware}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {connectionCopy[state.connectionState]}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Acquisition:{" "}
            <span className="text-slate-200">{state.acquisitionState}</span>
            {state.lastSync && (
              <span className="ml-2 text-slate-500">
                Last sync {state.lastSync.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
              onClick={() => (isConnected ? disconnect() : connect())}
            >
              {isConnected
                ? "Disconnect"
                : state.connectionState === "connecting"
                ? "Connecting…"
                : "Connect"}
            </button>
            <button
              className="rounded-md bg-cyan-500/80 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              onClick={toggleAcquisition}
              disabled={!isConnected}
            >
              {isCapturing ? "Stop capture" : "Start capture"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
