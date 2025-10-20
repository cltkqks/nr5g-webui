export type AnalyzerConnectionState =
  | "connected"
  | "disconnected"
  | "connecting";

export type AnalyzerAcquisitionState = "idle" | "armed" | "capturing";

export type AnalyzerPathMode = "1RF" | "2RF" | "correlation";

export interface SpectrumTracePoint {
  frequency: number; // Hz
  amplitude: number; // dBm
}

export interface AnalyzerMarker extends SpectrumTracePoint {
  label: string;
}

export type AnalyzerLogLevel = "info" | "warning" | "error";

export interface AnalyzerTraceMemory {
  id: string;
  label: string;
  capturedAt: Date;
  peakFrequencyHz: number;
  peakAmplitudeDbm: number;
  noiseFloorDbm: number;
  referenceLevelDbm: number;
  spanGHz: number;
  pathMode: AnalyzerPathMode;
}

export interface AnalyzerEventLogEntry {
  id: string;
  timestamp: Date;
  level: AnalyzerLogLevel;
  source: string;
  message: string;
  detail?: string;
}

export interface AnalyzerMeasurementLogEntry {
  id: string;
  timestamp: Date;
  measurementId: string;
  label: string;
  value: string;
  unit?: string;
  status: AnalyzerMeasurement["status"];
  delta?: string;
}

export interface AnalyzerMeasurement {
  id: string;
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  status: "good" | "warning" | "critical";
  description?: string;
}

export interface AnalyzerConfig {
  centerFrequencyGHz: number;
  spanGHz: number;
  analysisBandwidthGHz: number;
  referenceLevelDbm: number;
  rbwKHz: number;
  vbwKHz: number;
  attenuationDb: number;
  averagingCount: number;
  triggerMode: "free run" | "video" | "external";
  pathMode: AnalyzerPathMode;
}

export interface AnalyzerSpecificationHighlight {
  title: string;
  value: string;
  caption: string;
}

export interface AnalyzerAppModule {
  id: string;
  name: string;
  summary: string;
  enabled: boolean;
}

export interface AnalyzerState {
  model: string;
  serial: string;
  firmware: string;
  connectionState: AnalyzerConnectionState;
  acquisitionState: AnalyzerAcquisitionState;
  lastSync: Date | null;
  config: AnalyzerConfig;
  measurements: AnalyzerMeasurement[];
  spectrum: SpectrumTracePoint[];
  markers: AnalyzerMarker[];
  markerAutoPeakSearch: boolean;
  traceMemories: AnalyzerTraceMemory[];
  eventLog: AnalyzerEventLogEntry[];
  measurementLog: AnalyzerMeasurementLogEntry[];
  specificationHighlights: AnalyzerSpecificationHighlight[];
  appModules: AnalyzerAppModule[];
}

export interface AnalyzerController {
  state: AnalyzerState;
  connect: () => void;
  disconnect: () => void;
  toggleAcquisition: () => void;
  updateConfig: (partial: Partial<AnalyzerConfig>) => void;
  recallPreset: (preset: "5g-fr2" | "satcom" | "radar") => void;
  setMarkerAutoPeakSearch: (enabled: boolean) => void;
  clearMarkers: () => void;
  addMarkerAtFrequency: (frequencyHz: number) => void;
  deleteMarker: (label: string) => void;
  moveMarkerToFrequency: (label: string, frequencyHz: number) => void;
}
