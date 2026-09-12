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
        // eslint-disable-next-line no-console -- known issue #17 (docs/known-issues.md, fixed): error is only logged to the console, never surfaced to the user; not fixing app bugs in this eslint cleanup
        console.log(err);
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
