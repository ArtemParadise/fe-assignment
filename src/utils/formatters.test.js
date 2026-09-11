import { describe, it, expect } from "vitest";

import { formatVolumeInMillions } from "./formatters";

describe("formatVolumeInMillions", () => {
  it("should format with 1 decimal place by default", () => {
    expect(formatVolumeInMillions(52000000)).toBe("52.0");
  });

  it("should format with the requested number of decimal places", () => {
    expect(formatVolumeInMillions(3000000, 2)).toBe("3.00");
  });
});
