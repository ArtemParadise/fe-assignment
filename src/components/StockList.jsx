import { useState, useEffect } from "react";

import {
  fetchStockDetails,
  fetchStockNews,
  fetchHistoricalPrices,
} from "../utils/mockStockApi";

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
    setExpandedStock(symbol);
    fetchStockNews(symbol).then((news) => {
      stockNews[symbol] = news;
      setStockNews(stockNews);
    });
  };

  const viewStockDetails = (symbol) => {
    setLoading(true);
    fetchStockDetails(symbol)
      .then((data) => {
        setStockDetails(data);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console -- known issue #17 (docs/known-issues.md, fixed): error is only logged to the console, never surfaced to the user; not fixing app bugs in this eslint cleanup
        console.log(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="user-list">
      <h2>Stocks ({sortedStocks.length})</h2>

      <div className="controls">
        <div className="sort-controls">
          <span>Sort by: </span>
          <button onClick={() => handleSort("symbol")}>
            Symbol {sortBy === "symbol" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
          <button onClick={() => handleSort("price")}>
            Price {sortBy === "price" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
          <button onClick={() => handleSort("change")}>
            Change {sortBy === "change" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
          <button onClick={() => handleSort("volume")}>
            Volume {sortBy === "volume" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
          <button onClick={() => handleSort("sector")}>
            Sector {sortBy === "sector" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
          <button onClick={() => handleSort("metrics")}>
            Avg Price{" "}
            {sortBy === "metrics" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
        </div>

        <div className="filter-controls">
          <label htmlFor="sector-filter">Filter by sector: </label>
          <select
            id="sector-filter"
            value={filterBySector}
            onChange={(e) => setFilterBySector(e.target.value)}
          >
            <option value="">All Sectors</option>
            {uniqueSectors.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="user-grid">
        {sortedStocks.map((stock, index) => {
          const isWatchlisted = watchlist.includes(stock.id);
          const news = stockNews[stock.symbol] || [];
          const isExpanded = expandedStock === stock.symbol;
          const priceChange = stock.change;
          const isPositive = priceChange >= 0;

          return (
            <div
              key={index}
              className={`user-card ${isWatchlisted ? "favorite" : ""}`}
            >
              <div className="user-card-header">
                <h3>{stock.symbol}</h3>
                <button
                  className="fav-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWatchlist(stock.id);
                  }}
                >
                  {isWatchlisted ? "★" : "☆"}
                </button>
              </div>

              <p className="stock-name">{stock.name}</p>

              <div className="stock-price">
                <span style={{ fontSize: "24px", fontWeight: "bold" }}>
                  ${stock.price.toFixed(2)}
                </span>
                <span
                  style={{
                    color: isPositive ? "green" : "red",
                    fontWeight: isWatchlisted ? "bold" : "normal",
                    marginLeft: "10px",
                  }}
                >
                  {isPositive ? "+" : ""}
                  {priceChange.toFixed(2)}%
                </span>
              </div>

              <p className="stock-sector">{stock.sector}</p>

              <div className="user-stats">
                <small>Volume: {(stock.volume / 1000000).toFixed(1)}M</small>
                <small>
                  Avg:{" "}
                  {stockMetrics[stock.id]?.avgPrice?.toFixed(2) || "Loading..."}
                </small>
              </div>

              <div className="user-actions">
                <button onClick={() => viewStockDetails(stock.symbol)}>
                  View Details
                </button>
                <button onClick={() => loadStockNews(stock.symbol)}>
                  {isExpanded ? "Hide News" : "Show News"}
                </button>
              </div>

              {isExpanded && (
                <div className="user-posts">
                  {news.length === 0 ? (
                    <p>Loading news...</p>
                  ) : (
                    <ul>
                      {news.slice(0, 3).map((article) => (
                        <li key={article.id}>
                          <strong>{article.title}</strong>
                          <small>{article.date}</small>
                          <p>{article.summary.substring(0, 80)}...</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {loading && <div>Loading stock details...</div>}

      {stockDetails && (
        <div className="user-details">
          <h3>Stock Details - {stockDetails.symbol}</h3>
          <div className="details-grid">
            <p>Company: {stockDetails.name}</p>
            <p>Price: ${stockDetails.price}</p>
            <p>Change: {stockDetails.change}%</p>
            <p>Volume: {(stockDetails.volume / 1000000).toFixed(2)}M</p>
            <p>
              Market Cap: ${(stockDetails.marketCap / 1000000000).toFixed(2)}B
            </p>
            <p>P/E Ratio: {stockDetails.pe}</p>
            <p>EPS: ${stockDetails.eps}</p>
            <p>52W High: ${stockDetails.high52}</p>
            <p>52W Low: ${stockDetails.low52}</p>
            <p>Dividend: {stockDetails.dividend}%</p>
            <p>Beta: {stockDetails.beta}</p>
          </div>

          <button
            onClick={() => {
              fetchHistoricalPrices(stockDetails.symbol).then((prices) => {
                // eslint-disable-next-line no-console -- known issue #16 (docs/known-issues.md): result is only logged, never rendered; not fixing app bugs in this eslint cleanup
                console.log("Historical prices:", prices);
                // TODO
              });
            }}
          >
            Load Price History
          </button>
        </div>
      )}
    </div>
  );
}

export default StockList;
