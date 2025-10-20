import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useWebSocketAnalyzer } from "../src/app/hooks/useWebSocketAnalyzer";

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  readyState = 0; // CONNECTING
  onopen: null | (() => void) = null;
  onmessage: null | ((ev: { data: string }) => void) = null;
  onclose: null | (() => void) = null;
  onerror: null | (() => void) = null;
  sent: unknown[] = [];
  url: string;
  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.();
    }, 0);
  }
  send(payload: string) {
    this.sent.push(JSON.parse(payload));
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}

// @ts-expect-error Mocking WebSocket for tests
global.WebSocket = MockWebSocket as typeof WebSocket;

describe("useWebSocketAnalyzer", () => {
  it("connects and processes inbound messages", async () => {
    const { result } = renderHook(() =>
      useWebSocketAnalyzer({ enabled: true, url: "ws://test" })
    );

    act(() => {
      result.current.connect();
    });

    await waitFor(() => {
      expect(result.current.state.connectionState).toBe("connected");
      expect(result.current.state.acquisitionState).toBe("armed");
    });

    const ws = MockWebSocket.instances.at(-1)!;

    act(() => {
      ws.onmessage?.({
        data: JSON.stringify({
          type: "spectrum",
          payload: [
            { frequency: 1e9, amplitude: -60 },
            { frequency: 2e9, amplitude: -40 },
          ],
        }),
      });
    });

    await waitFor(() => {
      expect(result.current.state.spectrum.length).toBeGreaterThan(0);
      expect(result.current.state.markers.length).toBeGreaterThan(0);
    });

    act(() => {
      ws.onmessage?.({
        data: JSON.stringify({ type: "config", payload: { rbwKHz: 150 } }),
      });
    });

    await waitFor(() => {
      expect(result.current.state.config.rbwKHz).toBe(150);
    });
  });
});
