import { useState, useEffect } from "react";

import { fetchHistoricalPrices } from "../utils/mockStockApi";

export function useStockMetrics(stocks) {
  const [stockMetrics, setStockMetrics] = useState({});

  useEffect(() => {
    stocks.forEach((stock) => {
      fetchHistoricalPrices(stock.symbol)
        .then((prices) => {
          setStockMetrics((prev) => ({
            ...prev,
            [stock.id]: {
              priceHistory: prices.length,
              avgPrice:
                prices.reduce((a, b) => a + parseFloat(b.price), 0) /
                prices.length,
            },
          }));
        })
        .catch((err) => {
          // The entry stays absent, which the card already renders as "Avg: Loading...".
          console.error(`Failed to load metrics for ${stock.symbol}`, err);
        });
    });
  }, [stocks]);

  return stockMetrics;
}
