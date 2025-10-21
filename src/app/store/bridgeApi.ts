import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { BridgeInboundSchema, AnalyzerConfigSchema } from "../bridge/schema";
import type { z } from "zod";
import type { RootState } from "./index";
import { analyzerActions } from "./analyzerSlice";
import { appendWithLimit } from "../utils/collections";
import { createEventLogEntry } from "../utils/logs";
import {
  findMarkers as findMarkersUtil,
  generateSpectrumTrace as genTraceUtil,
} from "../utils/spectrum";

// We keep sockets in a module-level map so mutations can access them
const wsMap = new Map<string, WebSocket>();

export const getSocket = (url: string) => wsMap.get(url) ?? null;
export const closeSocket = (url: string) => {
  const ws = wsMap.get(url);
  try {
    ws?.close();
  } catch {}
  wsMap.delete(url);
};

export const bridgeApi = createApi({
  reducerPath: "bridgeApi",
  baseQuery: fakeBaseQuery(),
  endpoints: (build) => ({
    connect: build.query<{ ok: true }, { url: string } | void>({
      // Nothing to fetch — we manage side-effects below
      queryFn: async () => ({ data: { ok: true as const } }),
      async onCacheEntryAdded(arg, api) {
        const { dispatch, cacheEntryRemoved } = api;
        if (!arg || !arg.url) {
          await cacheEntryRemoved;
          return;
        }
        const url = arg.url;

        // If an existing socket exists for the URL, close and replace
        const existing = wsMap.get(url);
        if (existing) {
          try {
            existing.close();
          } catch {}
          wsMap.delete(url);
        }

        const EVENT_LOG_LIMIT = 60; // mirrored from analyzerSlice constants
        try {
          const ws = new WebSocket(url);
          wsMap.set(url, ws);

          ws.onopen = () => {
            const prev = (api.getState() as RootState).analyzer;
            dispatch(
              analyzerActions.applyPatch({
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
              })
            );
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
            const prev = (api.getState() as RootState).analyzer;
            try {
              raw = JSON.parse(ev.data as string);
            } catch (err) {
              dispatch(
                analyzerActions.applyPatch({
                  eventLog: appendWithLimit(
                    prev.eventLog,
                    createEventLogEntry({
                      level: "warning",
                      source: "bridge",
                      message: "Failed to parse bridge message",
                      detail: String(err),
                    }),
                    EVENT_LOG_LIMIT
                  ),
                })
              );
              return;
            }

            const parsed = BridgeInboundSchema.safeParse(raw);
            if (!parsed.success) {
              dispatch(
                analyzerActions.applyPatch({
                  eventLog: appendWithLimit(
                    prev.eventLog,
                    createEventLogEntry({
                      level: "warning",
                      source: "bridge",
                      message: "Bridge message failed schema validation",
                      detail: parsed.error.issues
                        .map((i) => i.message)
                        .join("; "),
                    }),
                    EVENT_LOG_LIMIT
                  ),
                })
              );
              return;
            }

            const msg = parsed.data;
            const state = (api.getState() as RootState).analyzer;
            switch (msg.type) {
              case "heartbeat": {
                dispatch(analyzerActions.applyPatch({ lastSync: new Date() }));
                break;
              }
              case "spectrum": {
                const spectrum = msg.payload;
                const markers = state.markerAutoPeakSearch
                  ? findMarkersUtil(spectrum)
                  : state.markers;
                dispatch(
                  analyzerActions.applyPatch({
                    spectrum,
                    markers,
                    lastSync: new Date(),
                  })
                );
                break;
              }
              case "measurements": {
                dispatch(
                  analyzerActions.applyPatch({
                    measurements: msg.payload,
                    lastSync: new Date(),
                  })
                );
                break;
              }
              case "config": {
                const nextConfig = { ...state.config, ...msg.payload };
                const nextSpectrum =
                  state.connectionState === "connected"
                    ? genTraceUtil(nextConfig)
                    : state.spectrum;
                const nextMarkers = state.markerAutoPeakSearch
                  ? findMarkersUtil(nextSpectrum)
                  : state.markers;
                dispatch(
                  analyzerActions.applyPatch({
                    config: msg.payload,
                    spectrum: nextSpectrum,
                    markers: nextMarkers,
                    lastSync: new Date(),
                  })
                );
                break;
              }
              case "acquisition": {
                dispatch(
                  analyzerActions.applyPatch({
                    acquisitionState: msg.payload,
                    lastSync: new Date(),
                  })
                );
                break;
              }
              case "state": {
                type BridgeInbound = z.infer<typeof BridgeInboundSchema>;
                type StateMessage = Extract<BridgeInbound, { type: "state" }>;
                const patch: StateMessage["payload"] = msg.payload;
                const mergedConfig = patch.config
                  ? { ...state.config, ...patch.config }
                  : undefined;
                dispatch(
                  analyzerActions.applyPatch({
                    ...patch,
                    ...(mergedConfig ? { config: mergedConfig } : {}),
                    lastSync: new Date(),
                  })
                );
                break;
              }
            }
          };

          ws.onerror = (ev) => {
            const prevErr = (api.getState() as RootState).analyzer;
            dispatch(
              analyzerActions.applyPatch({
                eventLog: appendWithLimit(
                  prevErr.eventLog,
                  createEventLogEntry({
                    level: "error",
                    source: "connection",
                    message: "Bridge connection error",
                    detail: String(
                      (ev as unknown as ErrorEvent).message ?? "socket error"
                    ),
                  }),
                  EVENT_LOG_LIMIT
                ),
              })
            );
          };

          ws.onclose = () => {
            const prevClose = (api.getState() as RootState).analyzer;
            dispatch(
              analyzerActions.applyPatch({
                connectionState: "disconnected",
                acquisitionState: "idle",
                eventLog: appendWithLimit(
                  prevClose.eventLog,
                  createEventLogEntry({
                    level: "info",
                    source: "connection",
                    message: "Analyzer link closed.",
                  }),
                  EVENT_LOG_LIMIT
                ),
              })
            );
            wsMap.delete(url);
          };

          // Cleanup when cache subscription is removed
          await cacheEntryRemoved;
          try {
            ws.close();
          } catch {}
          wsMap.delete(url);
        } catch (err) {
          const prev = (api.getState() as RootState).analyzer;
          dispatch(
            analyzerActions.applyPatch({
              connectionState: "disconnected",
              acquisitionState: "idle",
              eventLog: appendWithLimit(
                prev.eventLog,
                createEventLogEntry({
                  level: "error",
                  source: "connection",
                  message: "Failed to open WebSocket",
                  detail: String(err),
                }),
                60
              ),
            })
          );
        }
      },
    }),

    sendCommand: build.mutation<{ ok: true }, { url: string; command: string }>(
      {
        async queryFn({
          url,
          command,
        }): Promise<
          { data: { ok: true } } | { error: { status: string; error: string } }
        > {
          const ws = wsMap.get(url);
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            return {
              error: { status: "WS_CLOSED", error: "WebSocket not open" },
            };
          }
          ws.send(
            JSON.stringify({ type: "command", command: String(command) })
          );
          return { data: { ok: true as const } };
        },
      }
    ),

    updateConfig: build.mutation<
      { ok: true },
      { url: string; patch: Partial<z.infer<typeof AnalyzerConfigSchema>> }
    >({
      async queryFn({
        url,
        patch,
      }): Promise<
        { data: { ok: true } } | { error: { status: string; error: string } }
      > {
        const ws = wsMap.get(url);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          return {
            error: { status: "WS_CLOSED", error: "WebSocket not open" },
          };
        }
        ws.send(JSON.stringify({ type: "config.update", payload: patch }));
        return { data: { ok: true as const } };
      },
    }),

    recallPreset: build.mutation<{ ok: true }, { url: string; preset: string }>(
      {
        async queryFn({
          url,
          preset,
        }): Promise<
          { data: { ok: true } } | { error: { status: string; error: string } }
        > {
          const ws = wsMap.get(url);
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            return {
              error: { status: "WS_CLOSED", error: "WebSocket not open" },
            };
          }
          ws.send(JSON.stringify({ type: "preset.recall", preset }));
          return { data: { ok: true as const } };
        },
      }
    ),
  }),
});

export const {
  useLazyConnectQuery: useLazyConnectBridgeQuery,
  useSendCommandMutation,
  useUpdateConfigMutation,
  useRecallPresetMutation,
} = bridgeApi;
