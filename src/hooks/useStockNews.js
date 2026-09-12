import { useState } from "react";

import { fetchStockNews } from "../utils/mockStockApi";

export function useStockNews() {
  const [stockNews, setStockNews] = useState({});
  const [expandedStock, setExpandedStock] = useState(null);

  const loadStockNews = (symbol) => {
    if (expandedStock === symbol) {
      setExpandedStock(null);

      return;
    }

    setExpandedStock(symbol);
    fetchStockNews(symbol)
      .then((news) => {
        setStockNews((prev) => ({ ...prev, [symbol]: news }));
      })
      .catch((err) => {
        // The empty list is what ends the loading state — see StockNews.
        console.error(`Failed to load news for ${symbol}`, err);
        setStockNews((prev) => ({ ...prev, [symbol]: [] }));
      });
  };

  return { stockNews, expandedStock, loadStockNews };
}
