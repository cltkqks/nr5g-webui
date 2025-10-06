import { AnalyzerConfig } from "../types/analyzer";

export function formatConfigFragment(
  key: keyof AnalyzerConfig,
  value: AnalyzerConfig[keyof AnalyzerConfig]
): string {
  switch (key) {
    case "centerFrequencyGHz":
      return `center ${Number(value).toFixed(2)} GHz`;
    case "spanGHz":
      return `span ${Number(value).toFixed(2)} GHz`;
    case "analysisBandwidthGHz":
      return `BW ${Number(value).toFixed(2)} GHz`;
    case "referenceLevelDbm":
      return `ref ${Number(value).toFixed(1)} dBm`;
    case "rbwKHz":
      return `RBW ${Number(value).toFixed(0)} kHz`;
    case "vbwKHz":
      return `VBW ${Number(value).toFixed(0)} kHz`;
    case "attenuationDb":
      return `atten ${Number(value).toFixed(0)} dB`;
    case "averagingCount":
      return `avg ×${value}`;
    case "triggerMode":
      return `trigger ${value}`;
    case "pathMode":
      return `path ${value}`;
    default:
      return `${key} ${String(value)}`;
  }
}

export function summarizeConfigChanges(
  partial: Partial<AnalyzerConfig>
): string {
  return Object.entries(partial)
    .map(([key, value]) =>
      formatConfigFragment(
        key as keyof AnalyzerConfig,
        value as AnalyzerConfig[keyof AnalyzerConfig]
      )
    )
    .join(" • ");
}
