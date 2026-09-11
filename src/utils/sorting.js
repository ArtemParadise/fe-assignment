// Returns a fully-oriented comparison (the caller should not flip it again
// for descending order). Stocks whose metrics haven't loaded yet always
// sort to the bottom, regardless of the current sort direction.
export function compareByAveragePrice({ a, b, stockMetrics, sortOrder }) {
  const aMetric = stockMetrics[a.id]?.avgPrice;
  const bMetric = stockMetrics[b.id]?.avgPrice;
  const aMissing = aMetric === undefined;
  const bMissing = bMetric === undefined;

  if (!aMissing && !bMissing) {
    return sortOrder === "asc" ? aMetric - bMetric : bMetric - aMetric;
  }

  if (aMissing && bMissing) {
    return 0;
  }

  return aMissing ? 1 : -1;
}
