import { useState } from "react";

export function useStockFilters(stocks, searchTerm) {
  const [filterBySector, setFilterBySector] = useState("");

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const sectorFilteredStocks = filterBySector
    ? filteredStocks.filter((stock) => stock.sector === filterBySector)
    : filteredStocks;

  const uniqueSectors = [...new Set(stocks.map((s) => s.sector))];

  return {
    visibleStocks: sectorFilteredStocks,
    filterBySector,
    setFilterBySector,
    uniqueSectors,
  };
}
