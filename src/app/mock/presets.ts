import {
  AnalyzerAppModule,
  AnalyzerSpecificationHighlight,
} from "../types/analyzer";

export const defaultSpecificationHighlights: AnalyzerSpecificationHighlight[] =
  [
    {
      title: "Analysis Bandwidth",
      value: "Up to 8 GHz",
      caption: "Dual 4 GHz paths, 8 GHz combined correlation",
    },
    {
      title: "Frequency Coverage",
      value: "26.5 / 44 GHz",
      caption: "SPAX3026 & SPAX3044 models",
    },
    {
      title: "Phase Noise",
      value: "<-136 dBc/Hz",
      caption: "At 10 kHz offset, 1 GHz carrier",
    },
  ];

export const defaultAppModules: AnalyzerAppModule[] = [
  {
    id: "phase-noise",
    name: "Phase Noise (KM129/130)",
    summary:
      "Cross-correlation enhanced phase noise analyzer integrated in-box.",
    enabled: true,
  },
  {
    id: "noise-figure",
    name: "Noise Figure (KM125/126)",
    summary:
      "Measure ultra-low NF without external noise source via dual-path correlation.",
    enabled: true,
  },
  {
    id: "dpd",
    name: "DPD & Amplifier Test (KM118-120)",
    summary:
      "Characterize PA linearity, AM/AM, AM/PM, and real-time DPD feedback.",
    enabled: false,
  },
  {
    id: "crossact",
    name: "CrossACT Automation",
    summary:
      "Coordinate multi-channel measurements and synchronized triggering.",
    enabled: true,
  },
];
