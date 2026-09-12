import { describe, it, expect } from "vitest";

import { formatVolumeInMillions, formatVolumeLabel } from "./formatters";

describe("formatVolumeInMillions", () => {
  it("should convert a volume to millions", () => {
    expect(formatVolumeInMillions(52000000)).toBe(52);
  });

  it("should return a fallback for missing volume", () => {
    expect(formatVolumeInMillions(undefined)).toBe(null);
  });

  it("should return a fallback for null volume instead of treating it as zero", () => {
    expect(formatVolumeInMillions(null)).toBe(null);
  });

  it("should return a fallback for non-numeric volume", () => {
    expect(formatVolumeInMillions("not-a-number")).toBe(null);
  });

  it("should return a fallback for non-finite volume", () => {
    expect(formatVolumeInMillions(Infinity)).toBe(null);
    expect(formatVolumeInMillions(NaN)).toBe(null);
  });
});

describe("formatVolumeLabel", () => {
  it("should format with 1 decimal place by default and append the M suffix", () => {
    expect(formatVolumeLabel(52000000)).toBe("52.0M");
  });

  it("should respect the requested number of decimal places", () => {
    expect(formatVolumeLabel(3000000, 2)).toBe("3.00M");
  });

  it("should return a plain N/A, without an M suffix, for an invalid volume", () => {
    expect(formatVolumeLabel(null)).toBe("N/A");
    expect(formatVolumeLabel(undefined)).toBe("N/A");
  });
});
