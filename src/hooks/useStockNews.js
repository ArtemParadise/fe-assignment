import { useState } from "react";

import { fetchStockNews } from "../utils/mockStockApi";

export function useStockNews() {
  const [stockNews, setStockNews] = useState({});
  const [expandedStock, setExpandedStock] = useState(null);

  const loadStockNews = (symbol) => {
    setExpandedStock(symbol);
    fetchStockNews(symbol).then((news) => {
      setStockNews((prev) => ({ ...prev, [symbol]: news }));
    });
  };

  return { stockNews, expandedStock, loadStockNews };
}
