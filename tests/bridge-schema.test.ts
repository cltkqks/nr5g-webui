import { describe, it, expect } from "vitest";
import { BridgeInboundSchema } from "../src/app/bridge/schema";

describe("BridgeInboundSchema", () => {
  it("validates spectrum payload", () => {
    const input = {
      type: "spectrum",
      payload: [
        { frequency: 27e9, amplitude: -60.1 },
        { frequency: 29e9, amplitude: -58.4 },
      ],
    };
    const parsed = BridgeInboundSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it("rejects malformed measurements", () => {
    const bad = {
      type: "measurements",
      payload: [
        { id: "x", label: "Bad", value: 123, status: "good" }, // value must be string
      ],
    };
    const parsed = BridgeInboundSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });
});
