"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  AnalyzerConfig,
  AnalyzerController,
  AnalyzerMarker,
  AnalyzerMeasurementLogEntry,
  AnalyzerState,
} from "../types/analyzer";

import { measurementSpecIndex as measurementSpecIndexShared } from "../mock/measurements";
import { store } from "../store";
import {
  analyzerActions,
  EVENT_LOG_LIMIT,
  MEASUREMENT_LOG_LIMIT,
  TRACE_MEMORY_LIMIT,
} from "../store/analyzerSlice";
import { appendManyWithLimit, appendWithLimit } from "../utils/collections";
import { createId } from "../utils/id";
import { createEventLogEntry } from "../utils/logs";
import { summarizeConfigChanges } from "../utils/config";
import {
  createTraceMemory as createTraceMemoryUtil,
  findMarkers as findMarkersUtil,
  generateSpectrumTrace as genTraceUtil,
  nearestPoint,
  nextMarkerLabel,
} from "../utils/spectrum";

export interface UseMockAnalyzerOptions {
  enabled?: boolean;
}

export function useMockAnalyzer(
  options?: UseMockAnalyzerOptions
): AnalyzerController {
  const { enabled = true } = options ?? {};
  const state = useSyncExternalStore(
    store.subscribe,
    () => store.getState().analyzer,
    () => store.getState().analyzer
  );
  const connectionTimeout = useRef<number | null>(null);

  const updateMeasurements = useCallback(
    (prev: AnalyzerState) => {
      if (!enabled) {
        return { nextMeasurements: prev.measurements, logEntries: [] };
      }

      const logEntries: AnalyzerMeasurementLogEntry[] = [];
      const nextMeasurements = prev.measurements.map((measurement) => {
        const spec = measurementSpecIndexShared[measurement.id];
        if (!spec) {
          return measurement;
        }

        const prevValue = Number(measurement.value);
        const nextValue = spec.base + (Math.random() - 0.5) * spec.variance * 2;
        const clamped = Number(nextValue.toFixed(spec.decimals));
        const deltaValue = clamped - prevValue;
        const unit = spec.unit;
        const unitSuffix = unit ? ` ${unit}` : "";
        const delta =
          (deltaValue >= 0 ? "+" : "") +
          deltaValue.toFixed(spec.decimals) +
          unitSuffix;

        if (Math.abs(deltaValue) >= spec.variance * 0.35) {
          logEntries.push({
            id: createId("measure"),
            timestamp: new Date(),
            measurementId: measurement.id,
            label: measurement.label,
            value: clamped.toFixed(spec.decimals),
            unit,
            status: measurement.status,
            delta,
          });
        }

        return {
          ...measurement,
          value: clamped.toFixed(spec.decimals),
          delta,
        };
      });

      return { nextMeasurements, logEntries };
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    let spectrumTimer: number | undefined;
    let syncTimer: number | undefined;

    if (
      state.connectionState === "connected" &&
      state.acquisitionState === "capturing"
    ) {
      spectrumTimer = window.setInterval(() => {
        const prev = store.getState().analyzer;
        const spectrum = genTraceUtil(prev.config);
        const markers = prev.markerAutoPeakSearch
          ? findMarkersUtil(spectrum)
          : prev.markers;
        const { nextMeasurements, logEntries } = updateMeasurements(prev);
        const captureTime = new Date();
        const traceLabel = `Live capture • ${captureTime.toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }
        )}`;
        const nextTraceMemory = createTraceMemoryUtil({
          trace: spectrum,
          config: prev.config,
          label: traceLabel,
          capturedAt: captureTime,
        });

        let nextTraceMemories = prev.traceMemories;
        let nextEventLog = prev.eventLog;

        if (prev.acquisitionState === "capturing") {
          nextTraceMemories = appendWithLimit(
            prev.traceMemories,
            nextTraceMemory,
            TRACE_MEMORY_LIMIT
          );

          const lastCapture = prev.traceMemories[prev.traceMemories.length - 1];
          const shouldLogCapture =
            !lastCapture ||
            captureTime.getTime() - lastCapture.capturedAt.getTime() > 4000;

          if (shouldLogCapture) {
            nextEventLog = appendWithLimit(
              prev.eventLog,
              createEventLogEntry({
                level: "info",
                source: "acquisition",
                message: `Captured trace (${prev.config.spanGHz.toFixed(
                  1
                )} GHz span)`,
                detail: `Peak ${nextTraceMemory.peakAmplitudeDbm.toFixed(
                  1
                )} dBm @ ${(nextTraceMemory.peakFrequencyHz / 1e9).toFixed(
                  3
                )} GHz`,
                timestamp: captureTime,
              }),
              EVENT_LOG_LIMIT
            );
          }
        }

        const nextMeasurementLog = appendManyWithLimit(
          prev.measurementLog,
          logEntries,
          MEASUREMENT_LOG_LIMIT
        );

        store.dispatch(
          analyzerActions.applyPatch({
            spectrum,
            markers,
            measurements: nextMeasurements,
            traceMemories: nextTraceMemories,
            eventLog: nextEventLog,
            measurementLog: nextMeasurementLog,
            lastSync: new Date(),
          })
        );
      }, 1500);

      syncTimer = window.setInterval(() => {
        store.dispatch(
          analyzerActions.applyPatch({
            lastSync: new Date(),
          })
        );
      }, 3000);
    }

    return () => {
      if (spectrumTimer) clearInterval(spectrumTimer);
      if (syncTimer) clearInterval(syncTimer);
    };
  }, [
    enabled,
    state.connectionState,
    state.acquisitionState,
    updateMeasurements,
  ]);

  useEffect(() => {
    return () => {
      if (connectionTimeout.current !== null) {
        clearTimeout(connectionTimeout.current);
      }
    };
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;

    const prev = store.getState().analyzer;
    store.dispatch(
      analyzerActions.applyPatch({
        connectionState: "connecting",
        eventLog: appendWithLimit(
          prev.eventLog,
          createEventLogEntry({
            level: "info",
            source: "connection",
            message: "Opening analyzer session...",
          }),
          EVENT_LOG_LIMIT
        ),
      })
    );

    if (connectionTimeout.current) {
      clearTimeout(connectionTimeout.current);
    }

    connectionTimeout.current = window.setTimeout(() => {
      const curr = store.getState().analyzer;
      store.dispatch(
        analyzerActions.applyPatch({
          connectionState: "connected",
          acquisitionState: "armed",
          lastSync: new Date(),
          eventLog: appendWithLimit(
            curr.eventLog,
            createEventLogEntry({
              level: "info",
              source: "connection",
              message: "Analyzer connected",
              detail: "Acquisition armed; ready for capture.",
            }),
            EVENT_LOG_LIMIT
          ),
        })
      );
      connectionTimeout.current = null;
    }, 800);
  }, [enabled]);

  const disconnect = useCallback(() => {
    if (connectionTimeout.current) {
      clearTimeout(connectionTimeout.current);
      connectionTimeout.current = null;
    }

    const prev = store.getState().analyzer;
    store.dispatch(
      analyzerActions.applyPatch({
        connectionState: "disconnected",
        acquisitionState: "idle",
        eventLog: appendWithLimit(
          prev.eventLog,
          createEventLogEntry({
            level: "info",
            source: "connection",
            message: enabled
              ? "Analyzer link closed by user."
              : "Disconnected from analyzer (mock).",
          }),
          EVENT_LOG_LIMIT
        ),
      })
    );
  }, [enabled]);

  const toggleAcquisition = useCallback(() => {
    if (!enabled) return;
    const prev = store.getState().analyzer;
    if (prev.connectionState !== "connected") return;
    const nextState =
      prev.acquisitionState === "capturing" ? "armed" : "capturing";
    const captureStarted = nextState === "capturing";
    store.dispatch(
      analyzerActions.applyPatch({
        acquisitionState: nextState,
        lastSync: nextState === "capturing" ? new Date() : prev.lastSync,
        eventLog: appendWithLimit(
          prev.eventLog,
          createEventLogEntry({
            level: "info",
            source: "acquisition",
            message: captureStarted
              ? "Started wideband acquisition"
              : "Return to armed state",
            detail: captureStarted
              ? `Span ${prev.config.spanGHz.toFixed(2)} GHz • Path ${
                  prev.config.pathMode
                }`
              : undefined,
          }),
          EVENT_LOG_LIMIT
        ),
      })
    );
  }, [enabled]);

  const updateConfig = useCallback((partial: Partial<AnalyzerConfig>) => {
    const prev = store.getState().analyzer;
    const newConfig = { ...prev.config, ...partial };
    const summary = Object.keys(partial).length
      ? summarizeConfigChanges(partial)
      : "";
    store.dispatch(
      analyzerActions.applyPatch({
        config: partial,
        spectrum:
          prev.connectionState === "connected"
            ? genTraceUtil(newConfig)
            : prev.spectrum,
        eventLog: summary
          ? appendWithLimit(
              prev.eventLog,
              createEventLogEntry({
                level: "info",
                source: "config",
                message: "Updated analyzer settings",
                detail: summary,
              }),
              EVENT_LOG_LIMIT
            )
          : prev.eventLog,
      })
    );
  }, []);

  const recallPreset = useCallback(
    (preset: "5g-fr2" | "satcom" | "radar") => {
      if (!enabled) return;

      const presetConfig: Record<typeof preset, Partial<AnalyzerConfig>> = {
        "5g-fr2": {
          centerFrequencyGHz: 28,
          spanGHz: 2,
          analysisBandwidthGHz: 2,
          rbwKHz: 100,
          vbwKHz: 30,
          triggerMode: "video",
          pathMode: "correlation",
        },
        satcom: {
          centerFrequencyGHz: 20,
          spanGHz: 1,
          analysisBandwidthGHz: 1.2,
          rbwKHz: 10,
          vbwKHz: 10,
          triggerMode: "free run",
          pathMode: "1RF",
        },
        radar: {
          centerFrequencyGHz: 77,
          spanGHz: 6,
          analysisBandwidthGHz: 4,
          rbwKHz: 50,
          vbwKHz: 20,
          triggerMode: "external",
          pathMode: "2RF",
        },
      };

      const prev = store.getState().analyzer;
      store.dispatch(
        analyzerActions.applyPatch({
          eventLog: appendWithLimit(
            prev.eventLog,
            createEventLogEntry({
              level: "info",
              source: "preset",
              message: `Recalled preset ${preset}`,
              detail: summarizeConfigChanges(presetConfig[preset]),
            }),
            EVENT_LOG_LIMIT
          ),
        })
      );

      updateConfig(presetConfig[preset]);
    },
    [enabled, updateConfig]
  );

  const setMarkerAutoPeakSearch = useCallback((enabledFlag: boolean) => {
    const prev = store.getState().analyzer;
    const nextMarkers =
      enabledFlag && prev.spectrum.length
        ? findMarkersUtil(prev.spectrum)
        : prev.markers;
    store.dispatch(
      analyzerActions.applyPatch({
        markerAutoPeakSearch: enabledFlag,
        markers: nextMarkers,
      })
    );
  }, []);

  const clearMarkers = useCallback(() => {
    store.dispatch(
      analyzerActions.applyPatch({ markers: [], markerAutoPeakSearch: false })
    );
  }, []);

  const addMarkerAtFrequency = useCallback((frequencyHz: number) => {
    const prev = store.getState().analyzer;
    if (!prev.spectrum || prev.spectrum.length === 0) return;
    const nearest = nearestPoint(prev.spectrum, frequencyHz);
    if (!nearest) return;
    const label = nextMarkerLabel(prev.markers);
    const newMarker: AnalyzerMarker = {
      label,
      frequency: nearest.frequency,
      amplitude: nearest.amplitude,
    };
    store.dispatch(
      analyzerActions.applyPatch({
        markerAutoPeakSearch: false,
        markers: [...prev.markers, newMarker],
      })
    );
  }, []);

  const deleteMarker = useCallback((label: string) => {
    const prev = store.getState().analyzer;
    store.dispatch(
      analyzerActions.applyPatch({
        markers: prev.markers.filter((m) => m.label !== label),
        markerAutoPeakSearch: false,
      })
    );
  }, []);

  const moveMarkerToFrequency = useCallback(
    (label: string, frequencyHz: number) => {
      const prev = store.getState().analyzer;
      if (!prev.spectrum || prev.spectrum.length === 0) return;
      const nearest = nearestPoint(prev.spectrum, frequencyHz);
      if (!nearest) return;
      const markers = prev.markers.map((m) => {
        if (m.label !== label) return m;
        if (
          m.frequency === nearest.frequency &&
          m.amplitude === nearest.amplitude
        ) {
          return m;
        }
        return {
          ...m,
          frequency: nearest.frequency,
          amplitude: nearest.amplitude,
        };
      });
      const unchanged = markers.every((m, i) => m === prev.markers[i]);
      if (unchanged) return;
      store.dispatch(
        analyzerActions.applyPatch({
          markerAutoPeakSearch: false,
          markers,
        })
      );
    },
    []
  );

  return useMemo(
    () => ({
      state,
      connect,
      disconnect,
      toggleAcquisition,
      updateConfig,
      recallPreset,
      setMarkerAutoPeakSearch,
      clearMarkers,
      addMarkerAtFrequency,
      deleteMarker,
      moveMarkerToFrequency,
    }),
    [
      state,
      connect,
      disconnect,
      toggleAcquisition,
      updateConfig,
      recallPreset,
      setMarkerAutoPeakSearch,
      clearMarkers,
      addMarkerAtFrequency,
      deleteMarker,
      moveMarkerToFrequency,
    ]
  );
}
