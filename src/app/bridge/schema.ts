import { z } from "zod";

// Shared enums
export const AcquisitionStateSchema = z.enum(["idle", "armed", "capturing"]);
export const PathModeSchema = z.enum(["1RF", "2RF", "correlation"]);

// AnalyzerConfig (full), used as partials for inbound updates
export const AnalyzerConfigSchema = z.object({
  centerFrequencyGHz: z.number(),
  spanGHz: z.number(),
  analysisBandwidthGHz: z.number(),
  referenceLevelDbm: z.number(),
  rbwKHz: z.number(),
  vbwKHz: z.number(),
  attenuationDb: z.number(),
  averagingCount: z.number(),
  triggerMode: z.enum(["free run", "video", "external"]),
  pathMode: PathModeSchema,
});

export const SpectrumPointSchema = z.object({
  frequency: z.number(),
  amplitude: z.number(),
});

export const AnalyzerMeasurementSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  unit: z.string().optional(),
  delta: z.string().optional(),
  status: z.enum(["good", "warning", "critical"]),
  description: z.string().optional(),
});

// A very loose partial of AnalyzerState for inbound state patches
export const AnalyzerStatePatchSchema = z
  .object({
    model: z.string().optional(),
    serial: z.string().optional(),
    firmware: z.string().optional(),
    connectionState: z
      .enum(["connected", "disconnected", "connecting"])
      .optional(),
    acquisitionState: AcquisitionStateSchema.optional(),
    lastSync: z.any().optional(), // will be normalized by the client
    config: AnalyzerConfigSchema.partial().optional(),
    measurements: z.array(AnalyzerMeasurementSchema).optional(),
    spectrum: z.array(SpectrumPointSchema).optional(),
    markers: z
      .array(SpectrumPointSchema.extend({ label: z.string() }))
      .optional(),
    markerAutoPeakSearch: z.boolean().optional(),
    // traceMemories/eventLog/measurementLog and others intentionally omitted
  })
  .passthrough();

// Discriminated inbound union from the bridge
export const BridgeInboundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heartbeat"), payload: z.any().optional() }),
  z.object({
    type: z.literal("spectrum"),
    payload: z.array(SpectrumPointSchema),
  }),
  z.object({
    type: z.literal("measurements"),
    payload: z.array(AnalyzerMeasurementSchema),
  }),
  z.object({
    type: z.literal("config"),
    payload: AnalyzerConfigSchema.partial(),
  }),
  z.object({
    type: z.literal("acquisition"),
    payload: AcquisitionStateSchema,
  }),
  z.object({
    type: z.literal("state"),
    payload: AnalyzerStatePatchSchema,
  }),
]);
