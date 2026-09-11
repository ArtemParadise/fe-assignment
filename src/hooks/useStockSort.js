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
    const comparison =
      sortBy === SORT_FIELDS.METRICS
        ? stockMetrics[a.id].avgPrice - stockMetrics[b.id].avgPrice
        : (SORT_COMPARATORS[sortBy]?.(a, b) ?? 0);

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return { sortedStocks, sortBy, sortOrder, handleSort };
}
