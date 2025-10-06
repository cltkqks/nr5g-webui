export function formatFrequencyHz(valueHz: number): string {
  if (!Number.isFinite(valueHz)) {
    return "--";
  }
  if (valueHz >= 1e9) {
    return `${(valueHz / 1e9).toFixed(3)} GHz`;
  }
  if (valueHz >= 1e6) {
    return `${(valueHz / 1e6).toFixed(3)} MHz`;
  }
  return `${(valueHz / 1e3).toFixed(1)} kHz`;
}

export function formatRelativeTime(value: Date): string {
  const now = Date.now();
  const diffMs = now - value.getTime();
  const abs = Math.abs(diffMs);
  const minutes = Math.floor(abs / 60_000);
  const hours = Math.floor(abs / 3_600_000);
  const days = Math.floor(abs / 86_400_000);
  if (abs < 5_000) return "just now";
  if (abs < 60_000) return `${Math.floor(abs / 1_000)}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
