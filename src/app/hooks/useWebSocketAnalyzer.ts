"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  AnalyzerConfig,
  AnalyzerController,
  AnalyzerMarker,
} from "../types/analyzer";

import { appendWithLimit } from "../utils/collections";
import { createEventLogEntry } from "../utils/logs";
import { summarizeConfigChanges } from "../utils/config";
import {
  findMarkers as findMarkersUtil,
  generateSpectrumTrace as genTraceUtil,
  nearestPoint,
  nextMarkerLabel,
} from "../utils/spectrum";
import { store } from "../store";
import { analyzerActions, EVENT_LOG_LIMIT } from "../store/analyzerSlice";
import { bridgeApi, closeSocket, getSocket } from "../store/bridgeApi";

export interface UseWebSocketAnalyzerOptions {
  enabled?: boolean;
  url: string;
}

export function useWebSocketAnalyzer(
  options: UseWebSocketAnalyzerOptions
): AnalyzerController {
  const { enabled = false, url } = options;

  const state = useSyncExternalStore(
    store.subscribe,
    () => store.getState().analyzer,
    () => store.getState().analyzer
  );
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!enabled || !url) return;

    const prev = store.getState().analyzer;
    store.dispatch(
      analyzerActions.applyPatch({
        connectionState: "connecting",
        eventLog: appendWithLimit(
          prev.eventLog,
          createEventLogEntry({
            level: "info",
            source: "connection",
            message: `Opening analyzer session via bridge…`,
            detail: url,
          }),
          EVENT_LOG_LIMIT
        ),
      })
    );

    // Start RTK Query-managed bridge connection
    store.dispatch(bridgeApi.endpoints.connect.initiate({ url }));
    wsRef.current = getSocket(url);
  }, [enabled, url]);

  const disconnect = useCallback(() => {
    if (url) closeSocket(url);
    wsRef.current = null;
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
            message: "Analyzer link closed by user.",
          }),
          EVENT_LOG_LIMIT
        ),
      })
    );
  }, [url]);

  const toggleAcquisition = useCallback(() => {
    if (!enabled) return;
    const prev = store.getState().analyzer;
    if (prev.connectionState !== "connected") return;
    const next = prev.acquisitionState === "capturing" ? "armed" : "capturing";
    if (url) {
      store.dispatch(
        bridgeApi.endpoints.sendCommand.initiate({
          url,
          command: next === "capturing" ? "startCapture" : "stopCapture",
        })
      );
    }
    store.dispatch(
      analyzerActions.applyPatch({
        acquisitionState: next,
        lastSync: next === "capturing" ? new Date() : prev.lastSync,
        eventLog: appendWithLimit(
          prev.eventLog,
          createEventLogEntry({
            level: "info",
            source: "acquisition",
            message:
              next === "capturing"
                ? "Started wideband acquisition"
                : "Return to armed state",
          }),
          EVENT_LOG_LIMIT
        ),
      })
    );
  }, [enabled, url]);

  const updateConfig = useCallback(
    (partial: Partial<AnalyzerConfig>) => {
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

      if (enabled && url) {
        store.dispatch(
          bridgeApi.endpoints.updateConfig.initiate({ url, patch: partial })
        );
      }
    },
    [enabled, url]
  );

  const recallPreset = useCallback(
    (preset: "5g-fr2" | "satcom" | "radar") => {
      if (enabled && url) {
        store.dispatch(
          bridgeApi.endpoints.recallPreset.initiate({ url, preset })
        );
      }
      const prev = store.getState().analyzer;
      store.dispatch(
        analyzerActions.applyPatch({
          eventLog: appendWithLimit(
            prev.eventLog,
            createEventLogEntry({
              level: "info",
              source: "preset",
              message: `Recalled preset ${preset}`,
            }),
            EVENT_LOG_LIMIT
          ),
        })
      );
    },
    [enabled, url]
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
      const markers = prev.markers.map((m) =>
        m.label === label
          ? {
              ...m,
              frequency: nearest.frequency,
              amplitude: nearest.amplitude,
            }
          : m
      );
      store.dispatch(
        analyzerActions.applyPatch({ markerAutoPeakSearch: false, markers })
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
