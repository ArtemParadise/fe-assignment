import { useState } from "react";

import { SORT_FIELDS, SORT_COMPARATORS } from "../constants/sorting";
import { compareByAveragePrice } from "../utils/sorting";

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
    if (sortBy === SORT_FIELDS.METRICS) {
      return compareByAveragePrice({ a, b, stockMetrics, sortOrder });
    }

    const comparison = SORT_COMPARATORS[sortBy]?.(a, b) ?? 0;

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return { sortedStocks, sortBy, sortOrder, handleSort };
}
