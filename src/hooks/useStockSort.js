import { useState } from "react";

export function useStockSort(stocks, stockMetrics) {
  const [sortBy, setSortBy] = useState("symbol");
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
    let comparison = 0;

    if (sortBy === "symbol") {
      comparison = a.symbol.localeCompare(b.symbol);
    } else if (sortBy === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === "price") {
      comparison = a.price - b.price;
    } else if (sortBy === "sector") {
      comparison = a.sector.localeCompare(b.sector);
    } else if (sortBy === "change") {
      comparison = a.change - b.change;
    } else if (sortBy === "volume") {
      comparison = a.volume - b.volume;
    } else if (sortBy === "metrics") {
      const aMetric = stockMetrics[a.id].avgPrice;
      const bMetric = stockMetrics[b.id].avgPrice;

      comparison = aMetric - bMetric;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return { sortedStocks, sortBy, sortOrder, handleSort };
}
