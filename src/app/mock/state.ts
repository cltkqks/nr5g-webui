import { AnalyzerConfig, AnalyzerState } from "../types/analyzer";
import { defaultAppModules, defaultSpecificationHighlights } from "./presets";
import { generateSpectrumTrace, createTraceMemory } from "../utils/spectrum";
import { measurementSpecs, createMeasurementSnapshot } from "./measurements";

export function createInitialAnalyzerState(): AnalyzerState {
  const config: AnalyzerConfig = {
    centerFrequencyGHz: 28,
    spanGHz: 6,
    analysisBandwidthGHz: 8,
    referenceLevelDbm: 10,
    rbwKHz: 100,
    vbwKHz: 30,
    attenuationDb: 20,
    averagingCount: 100,
    triggerMode: "free run",
    pathMode: "correlation",
  };

  const spectrum = generateSpectrumTrace(config, { seed: 0x9e3779b9 });

  const now = new Date();
  const correlationMemoryConfig: AnalyzerConfig = {
    ...config,
    spanGHz: 2,
    analysisBandwidthGHz: 2,
    triggerMode: "video",
    pathMode: "correlation",
  };
  const dualPathMemoryConfig: AnalyzerConfig = {
    ...config,
    centerFrequencyGHz: 24,
    spanGHz: 4,
    analysisBandwidthGHz: 4,
    pathMode: "2RF",
  };
  const singlePathMemoryConfig: AnalyzerConfig = {
    ...config,
    centerFrequencyGHz: 18,
    spanGHz: 3,
    analysisBandwidthGHz: 3,
    pathMode: "1RF",
  };

  const traceMemories = [
    createTraceMemory({
      trace: generateSpectrumTrace(correlationMemoryConfig, { seed: 111 }),
      config: correlationMemoryConfig,
      label: "Correlation capture • 12:05:16",
      capturedAt: new Date(now.getTime() - 1000 * 60 * 7),
    }),
    createTraceMemory({
      trace: generateSpectrumTrace(dualPathMemoryConfig, { seed: 222 }),
      config: dualPathMemoryConfig,
      label: "Dual-path capture • 12:02:44",
      capturedAt: new Date(now.getTime() - 1000 * 60 * 9),
    }),
    createTraceMemory({
      trace: generateSpectrumTrace(singlePathMemoryConfig, { seed: 333 }),
      config: singlePathMemoryConfig,
      label: "Single-path capture • 11:59:02",
      capturedAt: new Date(now.getTime() - 1000 * 60 * 12),
    }),
  ];

  return {
    model: "T&M SPAX3044",
    serial: "1023.0012K03/203",
    firmware: "1.08.3",
    connectionState: "disconnected",
    acquisitionState: "idle",
    lastSync: null,
    config,
    measurements: measurementSpecs.map(createMeasurementSnapshot),
    spectrum,
    markers: [],
    markerAutoPeakSearch: true,
    traceMemories,
    eventLog: [],
    measurementLog: [],
    specificationHighlights: defaultSpecificationHighlights,
    appModules: defaultAppModules,
  };
}
