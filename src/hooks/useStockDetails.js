import { useState, useRef } from "react";

import { fetchStockDetails, fetchHistoricalPrices } from "../utils/mockStockApi";

export function useStockDetails() {
  const [stockDetails, setStockDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [priceHistory, setPriceHistory] = useState(null);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);
  const latestDetailsRequestId = useRef(0);
  const latestHistoryRequestId = useRef(0);
  const selectedSymbol = useRef(null);

  const viewStockDetails = (symbol) => {
    const requestId = ++latestDetailsRequestId.current;

    selectedSymbol.current = symbol;
    // Invalidate any in-flight price-history request from the previous selection.
    latestHistoryRequestId.current += 1;

    setLoading(true);
    setPriceHistory(null);
    setPriceHistoryLoading(false);
    fetchStockDetails(symbol)
      .then((data) => {
        if (latestDetailsRequestId.current === requestId) {
          setStockDetails(data);
        }
      })
      .catch((err) => {
        // Logged only, never surfaced: showing it needs an error state in the
        // panel, which the "don't redesign" boundary rules out (issue #17).
        console.error(err);
      })
      .finally(() => {
        if (latestDetailsRequestId.current === requestId) {
          setLoading(false);
        }
      });
  };

  const loadPriceHistory = () => {
    const symbol = selectedSymbol.current;
    const requestId = ++latestHistoryRequestId.current;

    setPriceHistoryLoading(true);
    fetchHistoricalPrices(symbol)
      .then((prices) => {
        if (latestHistoryRequestId.current === requestId && selectedSymbol.current === symbol) {
          setPriceHistory(prices);
        }
      })
      .catch((err) => {
        console.error(`Failed to load price history for ${symbol}`, err);
      })
      .finally(() => {
        if (latestHistoryRequestId.current === requestId && selectedSymbol.current === symbol) {
          setPriceHistoryLoading(false);
        }
      });
  };

  return {
    stockDetails,
    loading,
    priceHistory,
    priceHistoryLoading,
    viewStockDetails,
    loadPriceHistory,
  };
}
