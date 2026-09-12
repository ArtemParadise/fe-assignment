import { describe, it, expect } from "vitest";

import { compareByAveragePrice } from "./sorting";

const a = { id: 1 };
const b = { id: 2 };

describe("compareByAveragePrice", () => {
  it("should sort ascending by average price when both metrics are loaded", () => {
    const stockMetrics = { 1: { avgPrice: 10 }, 2: { avgPrice: 20 } };

    expect(compareByAveragePrice({ a, b, stockMetrics, sortOrder: "asc" })).toBeLessThan(0);
    expect(compareByAveragePrice({ a: b, b: a, stockMetrics, sortOrder: "asc" })).toBeGreaterThan(
      0,
    );
  });

  it("should sort descending by average price when both metrics are loaded", () => {
    const stockMetrics = { 1: { avgPrice: 10 }, 2: { avgPrice: 20 } };

    expect(
      compareByAveragePrice({ a, b, stockMetrics, sortOrder: "desc" }),
    ).toBeGreaterThan(0);
    expect(compareByAveragePrice({ a: b, b: a, stockMetrics, sortOrder: "desc" })).toBeLessThan(
      0,
    );
  });

  it("should push a stock with missing metrics below one with loaded metrics, regardless of direction", () => {
    const stockMetrics = { 1: { avgPrice: 10 } };

    expect(compareByAveragePrice({ a, b, stockMetrics, sortOrder: "asc" })).toBeLessThan(0);
    expect(compareByAveragePrice({ a: b, b: a, stockMetrics, sortOrder: "asc" })).toBeGreaterThan(
      0,
    );
    expect(compareByAveragePrice({ a, b, stockMetrics, sortOrder: "desc" })).toBeLessThan(0);
    expect(compareByAveragePrice({ a: b, b: a, stockMetrics, sortOrder: "desc" })).toBeGreaterThan(
      0,
    );
  });

  it("should treat two stocks with missing metrics as equal", () => {
    expect(compareByAveragePrice({ a, b, stockMetrics: {}, sortOrder: "asc" })).toBe(0);
    expect(compareByAveragePrice({ a, b, stockMetrics: {}, sortOrder: "desc" })).toBe(0);
  });
});
