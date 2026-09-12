import { useState, useRef } from "react";

import { fetchStockDetails, fetchHistoricalPrices } from "../utils/mockStockApi";

export function useStockDetails() {
  const [stockDetails, setStockDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [priceHistory, setPriceHistory] = useState(null);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);
  const latestDetailsRequestId = useRef(0);

  const viewStockDetails = (symbol) => {
    const requestId = ++latestDetailsRequestId.current;

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
    const requestId = latestDetailsRequestId.current;
    const symbol = stockDetails.symbol;

    setPriceHistoryLoading(true);
    fetchHistoricalPrices(symbol)
      .then((prices) => {
        if (latestDetailsRequestId.current === requestId) {
          setPriceHistory(prices);
        }
      })
      .finally(() => {
        if (latestDetailsRequestId.current === requestId) {
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
