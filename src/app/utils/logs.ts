import { AnalyzerEventLogEntry, AnalyzerLogLevel } from "../types/analyzer";
import { createId } from "./id";

export function createEventLogEntry(entry: {
  level: AnalyzerLogLevel;
  source: string;
  message: string;
  detail?: string;
  timestamp?: Date;
}): AnalyzerEventLogEntry {
  const { level, source, message, detail, timestamp } = entry;
  return {
    id: createId("log"),
    timestamp: timestamp ?? new Date(),
    level,
    source,
    message,
    detail,
  };
}
