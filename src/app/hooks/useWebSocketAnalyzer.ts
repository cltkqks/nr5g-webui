"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AnalyzerConfig,
  AnalyzerController,
  AnalyzerMarker,
  AnalyzerState,
} from "../types/analyzer";

import { createInitialAnalyzerState } from "../mock/state";
import { appendWithLimit } from "../utils/collections";
import { createEventLogEntry } from "../utils/logs";
import { summarizeConfigChanges } from "../utils/config";
import {
  findMarkers as findMarkersUtil,
  generateSpectrumTrace as genTraceUtil,
  nearestPoint,
  nextMarkerLabel,
} from "../utils/spectrum";
import { BridgeInboundSchema } from "../bridge/schema";

const EVENT_LOG_LIMIT = 60;

export interface UseWebSocketAnalyzerOptions {
  enabled?: boolean;
  url: string;
}

export function useWebSocketAnalyzer(
  options: UseWebSocketAnalyzerOptions
): AnalyzerController {
  const { enabled = false, url } = options;

  const [state, setState] = useState<AnalyzerState>(() =>
    createInitialAnalyzerState()
  );
  const wsRef = useRef<WebSocket | null>(null);

  // Helper to safely push an info/error log entry
  const pushLog = useCallback(
    (entry: Parameters<typeof createEventLogEntry>[0]) => {
      setState((prev) => ({
        ...prev,
        eventLog: appendWithLimit(
          prev.eventLog,
          createEventLogEntry(entry),
          EVENT_LOG_LIMIT
        ),
      }));
    },
    []
  );

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
    };
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !url) {
      return;
    }

    // Close any prior socket
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    setState((prev) => ({
      ...prev,
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
    }));

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setState((prev) => ({
          ...prev,
          connectionState: "connected",
          acquisitionState: "armed",
          lastSync: new Date(),
          eventLog: appendWithLimit(
            prev.eventLog,
            createEventLogEntry({
              level: "info",
              source: "connection",
              message: "Analyzer connected (bridge)",
            }),
            EVENT_LOG_LIMIT
          ),
        }));
        // Handshake
        ws.send(
          JSON.stringify({
            type: "handshake",
            client: "nr5g-webui",
            version: "0.1.0",
          })
        );
      };

      ws.onmessage = (ev) => {
        let raw: unknown = null;
        try {
          raw = JSON.parse(ev.data as string);
        } catch (err) {
          pushLog({
            level: "warning",
            source: "bridge",
            message: "Failed to parse bridge message",
            detail: String(err),
          });
          return;
        }

        const parsed = BridgeInboundSchema.safeParse(raw);
        if (!parsed.success) {
          pushLog({
            level: "warning",
            source: "bridge",
            message: "Bridge message failed schema validation",
            detail: parsed.error.issues.map((i) => i.message).join("; "),
          });
          return;
        }

        const msg = parsed.data;
        setState((prev) => {
          switch (msg.type) {
            case "heartbeat":
              return { ...prev, lastSync: new Date() };
            case "spectrum": {
              const spectrum = msg.payload;
              const markers = prev.markerAutoPeakSearch
                ? findMarkersUtil(spectrum)
                : prev.markers;
              return { ...prev, spectrum, markers, lastSync: new Date() };
            }
            case "measurements":
              return {
                ...prev,
                measurements: msg.payload,
                lastSync: new Date(),
              };
            case "config": {
              const next = {
                ...prev,
                config: { ...prev.config, ...msg.payload },
                lastSync: new Date(),
              };
              if (prev.connectionState === "connected") {
                next.spectrum = genTraceUtil(next.config);
                if (prev.markerAutoPeakSearch) {
                  next.markers = findMarkersUtil(next.spectrum);
                }
              }
              return next;
            }
            case "acquisition":
              return {
                ...prev,
                acquisitionState: msg.payload,
                lastSync: new Date(),
              };
            case "state": {
              const patch = msg.payload as Partial<AnalyzerState>;
              // If bridge ships config deltas inside state, merge config shallowly
              const nextConfig = patch.config
                ? { ...prev.config, ...patch.config }
                : prev.config;
              const next: AnalyzerState = {
                ...prev,
                ...patch,
                config: nextConfig,
                lastSync: new Date(),
              };
              return next;
            }
          }
        });
      };

      ws.onclose = () => {
        setState((prev) => ({
          ...prev,
          connectionState: "disconnected",
          acquisitionState: "idle",
          eventLog: appendWithLimit(
            prev.eventLog,
            createEventLogEntry({
              level: "info",
              source: "connection",
              message: "Analyzer link closed.",
            }),
            EVENT_LOG_LIMIT
          ),
        }));
        wsRef.current = null;
      };

      ws.onerror = (ev) => {
        pushLog({
          level: "error",
          source: "connection",
          message: "Bridge connection error",
          detail: String(
            (ev as unknown as ErrorEvent).message ?? "socket error"
          ),
        });
      };
    } catch (err) {
      pushLog({
        level: "error",
        source: "connection",
        message: "Failed to open WebSocket",
        detail: String(err),
      });
      setState((prev) => ({
        ...prev,
        connectionState: "disconnected",
        acquisitionState: "idle",
      }));
    }
  }, [enabled, url, pushLog]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    setState((prev) => ({
      ...prev,
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
    }));
  }, []);

  const toggleAcquisition = useCallback(() => {
    if (!enabled) return;
    setState((prev) => {
      if (prev.connectionState !== "connected") return prev;
      const next =
        prev.acquisitionState === "capturing" ? "armed" : "capturing";
      // Send command to bridge
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "command",
            command: next === "capturing" ? "startCapture" : "stopCapture",
          })
        );
      }
      return {
        ...prev,
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
      };
    });
  }, [enabled]);

  const updateConfig = useCallback(
    (partial: Partial<AnalyzerConfig>) => {
      // Optimistically update local state
      setState((prev) => {
        const newConfig = { ...prev.config, ...partial };
        const summary = Object.keys(partial).length
          ? summarizeConfigChanges(partial)
          : "";
        return {
          ...prev,
          config: newConfig,
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
        };
      });

      if (
        enabled &&
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN
      ) {
        wsRef.current.send(
          JSON.stringify({ type: "config.update", payload: partial })
        );
      }
    },
    [enabled]
  );

  const recallPreset = useCallback(
    (preset: "5g-fr2" | "satcom" | "radar") => {
      if (
        enabled &&
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN
      ) {
        wsRef.current.send(JSON.stringify({ type: "preset.recall", preset }));
      }
      // Local UX log
      setState((prev) => ({
        ...prev,
        eventLog: appendWithLimit(
          prev.eventLog,
          createEventLogEntry({
            level: "info",
            source: "preset",
            message: `Recalled preset ${preset}`,
          }),
          EVENT_LOG_LIMIT
        ),
      }));
    },
    [enabled]
  );

  const setMarkerAutoPeakSearch = useCallback((enabledFlag: boolean) => {
    setState((prev) => {
      const nextMarkers =
        enabledFlag && prev.spectrum.length
          ? findMarkersUtil(prev.spectrum)
          : prev.markers;
      return {
        ...prev,
        markerAutoPeakSearch: enabledFlag,
        markers: nextMarkers,
      };
    });
  }, []);

  const clearMarkers = useCallback(() => {
    setState((prev) => ({ ...prev, markers: [], markerAutoPeakSearch: false }));
  }, []);

  const addMarkerAtFrequency = useCallback((frequencyHz: number) => {
    setState((prev) => {
      if (!prev.spectrum || prev.spectrum.length === 0) return prev;
      const nearest = nearestPoint(prev.spectrum, frequencyHz);
      if (!nearest) return prev;
      const label = nextMarkerLabel(prev.markers);
      const newMarker: AnalyzerMarker = {
        label,
        frequency: nearest.frequency,
        amplitude: nearest.amplitude,
      };
      return {
        ...prev,
        markerAutoPeakSearch: false,
        markers: [...prev.markers, newMarker],
      };
    });
  }, []);

  const deleteMarker = useCallback((label: string) => {
    setState((prev) => ({
      ...prev,
      markers: prev.markers.filter((m) => m.label !== label),
      markerAutoPeakSearch: false,
    }));
  }, []);

  const moveMarkerToFrequency = useCallback(
    (label: string, frequencyHz: number) => {
      setState((prev) => {
        if (!prev.spectrum || prev.spectrum.length === 0) return prev;
        const nearest = nearestPoint(prev.spectrum, frequencyHz);
        if (!nearest) return prev;
        const markers = prev.markers.map((m) =>
          m.label === label
            ? {
                ...m,
                frequency: nearest.frequency,
                amplitude: nearest.amplitude,
              }
            : m
        );
        return { ...prev, markerAutoPeakSearch: false, markers };
      });
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
