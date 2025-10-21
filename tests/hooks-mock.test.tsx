import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useMockAnalyzer } from "../src/app/hooks/useMockAnalyzer";
import { store } from "../src/app/store";
import { analyzerActions } from "../src/app/store/analyzerSlice";

// Ensure a clean analyzer state for each test
beforeEach(() => {
  store.dispatch(analyzerActions.reset());
});

describe("useMockAnalyzer", () => {
  it("recalls preset and updates config", () => {
    const { result } = renderHook(() => useMockAnalyzer({ enabled: true }));
    act(() => {
      result.current.recallPreset("5g-fr2");
    });
    expect(result.current.state.config.triggerMode).toBe("video");
    expect(result.current.state.config.pathMode).toBe("correlation");
  });

  it("adds marker at nearest frequency", () => {
    const { result } = renderHook(() => useMockAnalyzer({ enabled: true }));
    const centerHz = result.current.state.config.centerFrequencyGHz * 1e9;
    act(() => {
      result.current.addMarkerAtFrequency(centerHz);
    });
    expect(result.current.state.markers.length).toBe(1);
  });
});
