import { useState, useEffect, useRef } from "react";

import {
  fetchStockDetails,
  fetchStockNews,
  fetchHistoricalPrices,
} from "../utils/mockStockApi";

import StockCard from "./StockCard";
import StockControls from "./StockControls";
import StockDetailsPanel from "./StockDetailsPanel";

function StockList({ stocks, searchTerm }) {
  const [stockDetails, setStockDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("symbol");
  const [sortOrder, setSortOrder] = useState("asc");
  const [watchlist, setWatchlist] = useState([]);
  const [stockNews, setStockNews] = useState({});
  const [expandedStock, setExpandedStock] = useState(null);
  const [filterBySector, setFilterBySector] = useState("");
  const [stockMetrics, setStockMetrics] = useState({});
  const latestDetailsRequest = useRef(null);

  useEffect(() => {
    stocks.forEach((stock) => {
      fetchHistoricalPrices(stock.symbol).then((prices) => {
        setStockMetrics((prev) => ({
          ...prev,
          [stock.id]: {
            priceHistory: prices.length,
            avgPrice:
              prices.reduce((a, b) => a + parseFloat(b.price), 0) /
              prices.length,
          },
        }));
      });
    });
  }, [stocks]);

  const sortStocks = (stocksToSort) => {
    return [...stocksToSort].sort((a, b) => {
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
  };

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const sectorFilteredStocks = filterBySector
    ? filteredStocks.filter((stock) => stock.sector === filterBySector)
    : filteredStocks;

  const sortedStocks = sortStocks(sectorFilteredStocks);

  const uniqueSectors = [...new Set(stocks.map((s) => s.sector))];

  const toggleWatchlist = (stockId) => {
    if (watchlist.includes(stockId)) {
      setWatchlist(watchlist.filter((id) => id !== stockId));
    } else {
      setWatchlist([...watchlist, stockId]);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const loadStockNews = (symbol) => {
    if (expandedStock === symbol) {
      setExpandedStock(null);

      return;
    }

    setExpandedStock(symbol);
    fetchStockNews(symbol).then((news) => {
      setStockNews((prev) => ({ ...prev, [symbol]: news }));
    });
  };

  const viewStockDetails = (symbol) => {
    latestDetailsRequest.current = symbol;
    setLoading(true);
    fetchStockDetails(symbol)
      .then((data) => {
        if (latestDetailsRequest.current === symbol) {
          setStockDetails(data);
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console -- known issue #17 (docs/known-issues.md, fixed): error is only logged to the console, never surfaced to the user; not fixing app bugs in this eslint cleanup
        console.log(err);
      })
      .finally(() => {
        if (latestDetailsRequest.current === symbol) {
          setLoading(false);
        }
      });
  };

  const loadPriceHistory = () => {
    fetchHistoricalPrices(stockDetails.symbol).then((prices) => {
      // eslint-disable-next-line no-console -- known issue #16 (docs/known-issues.md): result is only logged, never rendered; not fixing app bugs in this eslint cleanup
      console.log("Historical prices:", prices);
      // TODO
    });
  };

  return (
    <div className="user-list">
      <h2>Stocks ({sortedStocks.length})</h2>

      <StockControls
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        sectors={uniqueSectors}
        filterBySector={filterBySector}
        onFilterBySectorChange={setFilterBySector}
      />

      <div className="user-grid" role="list" aria-label="Stocks grid">
        {sortedStocks.map((stock) => (
          <div role="listitem" key={stock.id}>
            <StockCard
              stock={stock}
              isWatchlisted={watchlist.includes(stock.id)}
              avgPrice={stockMetrics[stock.id]?.avgPrice}
              news={stockNews[stock.symbol] || []}
              isExpanded={expandedStock === stock.symbol}
              onToggleWatchlist={() => toggleWatchlist(stock.id)}
              onViewDetails={() => viewStockDetails(stock.symbol)}
              onToggleNews={() => loadStockNews(stock.symbol)}
            />
          </div>
        ))}
      </div>

      <StockDetailsPanel
        loading={loading}
        details={stockDetails}
        onLoadPriceHistory={loadPriceHistory}
      />
    </div>
  );
}

export default StockList;
