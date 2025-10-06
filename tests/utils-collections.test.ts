import { describe, it, expect } from "vitest";
import {
  appendWithLimit,
  appendManyWithLimit,
} from "../src/app/utils/collections";

describe("utils/collections", () => {
  it("appendWithLimit trims from start", () => {
    const result = appendWithLimit([1, 2, 3], 4, 3);
    expect(result).toEqual([2, 3, 4]);
  });

  it("appendManyWithLimit concatenates and trims", () => {
    const result = appendManyWithLimit([1, 2], [3, 4, 5], 4);
    expect(result).toEqual([2, 3, 4, 5]);
  });
});
