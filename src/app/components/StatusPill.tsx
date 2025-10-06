import { AnalyzerConnectionState } from "../types/analyzer";

const palette: Record<AnalyzerConnectionState, string> = {
  connected: "bg-emerald-500/90 text-emerald-950",
  connecting: "bg-amber-400/90 text-amber-950",
  disconnected: "bg-slate-700 text-slate-200",
};

export function StatusPill({ status }: { status: AnalyzerConnectionState }) {
  const label =
    status === "connected"
      ? "Connected"
      : status === "connecting"
      ? "Connecting"
      : "Offline";
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${palette[status]}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}
