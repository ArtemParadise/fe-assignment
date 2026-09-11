import { useState } from "react";

import { SORT_FIELDS, SORT_COMPARATORS } from "../constants/sorting";

export function useStockSort(stocks, stockMetrics) {
  const [sortBy, setSortBy] = useState(SORT_FIELDS.SYMBOL);
  const [sortOrder, setSortOrder] = useState("asc");

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const sortedStocks = [...stocks].sort((a, b) => {
    let comparison;

    if (sortBy === SORT_FIELDS.METRICS) {
      const aMetric = stockMetrics[a.id]?.avgPrice;
      const bMetric = stockMetrics[b.id]?.avgPrice;
      const aMissing = aMetric === undefined;
      const bMissing = bMetric === undefined;

      if (aMissing || bMissing) {
        // Stocks whose metrics haven't loaded yet always sort to the
        // bottom, regardless of the current sort direction (pre-negate
        // so the asc/desc flip below cancels out).
        const missingComparison = aMissing && bMissing ? 0 : aMissing ? 1 : -1;

        comparison = sortOrder === "asc" ? missingComparison : -missingComparison;
      } else {
        comparison = aMetric - bMetric;
      }
    } else {
      comparison = SORT_COMPARATORS[sortBy]?.(a, b) ?? 0;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return { sortedStocks, sortBy, sortOrder, handleSort };
}
