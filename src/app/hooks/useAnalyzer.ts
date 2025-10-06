"use client";

import { AnalyzerController } from "../types/analyzer";
import { useMockAnalyzer } from "./useMockAnalyzer";
import { useWebSocketAnalyzer } from "./useWebSocketAnalyzer";

export function useAnalyzer(): AnalyzerController {
  const bridgeUrl = process.env.NEXT_PUBLIC_ANALYZER_WS_URL;
  const hasBridge = Boolean(bridgeUrl);

  const wsController = useWebSocketAnalyzer({
    enabled: hasBridge,
    url: bridgeUrl || "",
  });
  const mockController = useMockAnalyzer({
    enabled: !hasBridge,
  });

  return hasBridge ? wsController : mockController;
}
