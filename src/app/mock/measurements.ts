import { AnalyzerMeasurement } from "../types/analyzer";

export interface MeasurementSpec {
  id: string;
  label: string;
  unit: string;
  base: number;
  variance: number;
  decimals: number;
  status: "good" | "warning" | "critical";
  description?: string;
}

export const measurementSpecs: MeasurementSpec[] = [
  {
    id: "evm",
    label: "Residual EVM",
    unit: "%",
    base: 0.58,
    variance: 0.08,
    decimals: 2,
    status: "good",
    description: "Analyzer residual EVM for FR2 wideband waveforms.",
  },
  {
    id: "danl",
    label: "Displayed Avg Noise Level",
    unit: "dBm/Hz",
    base: -174,
    variance: 1.2,
    decimals: 1,
    status: "good",
    description: "Noise floor after cross-correlation averaging.",
  },
  {
    id: "toi",
    label: "Third Order Intercept",
    unit: "dBm",
    base: 28,
    variance: 1.5,
    decimals: 1,
    status: "good",
    description: "Linearity reference measured with two-tone stimulus.",
  },
  {
    id: "aclr",
    label: "ACLR",
    unit: "dB",
    base: 69,
    variance: 1.8,
    decimals: 1,
    status: "good",
    description: "Adjacent channel leakage ratio for wideband 5G NR signal.",
  },
  {
    id: "noiseFigure",
    label: "Noise Figure",
    unit: "dB",
    base: 0.45,
    variance: 0.05,
    decimals: 2,
    status: "good",
    description: "Two-path cross-correlation noise figure measurement.",
  },
];

export const measurementSpecIndex = measurementSpecs.reduce<
  Record<string, MeasurementSpec>
>((acc, spec) => {
  acc[spec.id] = spec;
  return acc;
}, {});

export function createMeasurementSnapshot(
  spec: MeasurementSpec
): AnalyzerMeasurement {
  return {
    id: spec.id,
    label: spec.label,
    value: spec.base.toFixed(spec.decimals),
    unit: spec.unit,
    delta: `+0.00 ${spec.unit}`,
    status: spec.status,
    description: spec.description,
  };
}
