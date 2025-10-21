import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  AnalyzerConfig,
  AnalyzerState,
  AnalyzerMarker,
  AnalyzerMeasurementLogEntry,
  AnalyzerTraceMemory,
} from "../types/analyzer";
import { createInitialAnalyzerState } from "../mock/state";

export const TRACE_MEMORY_LIMIT = 6;
export const EVENT_LOG_LIMIT = 60;
export const MEASUREMENT_LOG_LIMIT = 120;

export interface AnalyzerPatch extends Omit<Partial<AnalyzerState>, "config"> {
  config?: Partial<AnalyzerConfig>;
}

const initialState: AnalyzerState = createInitialAnalyzerState();

export const analyzerSlice = createSlice({
  name: "analyzer",
  initialState,
  reducers: {
    reset: () => createInitialAnalyzerState(),
    applyPatch: (state, action: PayloadAction<AnalyzerPatch>) => {
      const patch = action.payload;
      if (patch.model !== undefined) state.model = patch.model;
      if (patch.serial !== undefined) state.serial = patch.serial;
      if (patch.firmware !== undefined) state.firmware = patch.firmware;
      if (patch.connectionState !== undefined)
        state.connectionState = patch.connectionState;
      if (patch.acquisitionState !== undefined)
        state.acquisitionState = patch.acquisitionState;
      if (patch.lastSync !== undefined) state.lastSync = patch.lastSync;
      if (patch.config !== undefined)
        state.config = { ...state.config, ...patch.config } as AnalyzerConfig;
      if (patch.measurements !== undefined)
        state.measurements = patch.measurements!;
      if (patch.spectrum !== undefined) state.spectrum = patch.spectrum!;
      if (patch.markers !== undefined) state.markers = patch.markers!;
      if (patch.markerAutoPeakSearch !== undefined)
        state.markerAutoPeakSearch = patch.markerAutoPeakSearch!;
      if (patch.traceMemories !== undefined)
        state.traceMemories = patch.traceMemories!;
      if (patch.eventLog !== undefined) state.eventLog = patch.eventLog!;
      if (patch.measurementLog !== undefined)
        state.measurementLog = patch.measurementLog!;
      if (patch.specificationHighlights !== undefined)
        state.specificationHighlights = patch.specificationHighlights!;
      if (patch.appModules !== undefined) state.appModules = patch.appModules!;
    },
    setMarkers: (
      state,
      action: PayloadAction<{ markers: AnalyzerMarker[]; auto?: boolean }>
    ) => {
      state.markers = action.payload.markers;
      if (action.payload.auto !== undefined)
        state.markerAutoPeakSearch = action.payload.auto;
    },
    setTraceMemories: (state, action: PayloadAction<AnalyzerTraceMemory[]>) => {
      state.traceMemories = action.payload.slice(-TRACE_MEMORY_LIMIT);
    },
    setMeasurementLog: (
      state,
      action: PayloadAction<AnalyzerMeasurementLogEntry[]>
    ) => {
      state.measurementLog = action.payload.slice(-MEASUREMENT_LOG_LIMIT);
    },
  },
});

export const analyzerActions = analyzerSlice.actions;
export default analyzerSlice.reducer;
