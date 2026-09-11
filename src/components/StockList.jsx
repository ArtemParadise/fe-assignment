import React, { useState, useEffect } from "react";
import {
  fetchStockDetails,
  fetchStockNews,
  fetchHistoricalPrices,
} from "../utils/mockStockApi";

function StockList({ stocks, searchTerm }) {
  const [selectedStock, setSelectedStock] = useState(null);
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
    if (selectedStock) {
      setLoading(true);
      fetchStockDetails(selectedStock)
        .then((data) => {
          setStockDetails(data);
          setLoading(false);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }, [selectedStock]);

  useEffect(() => {
    if (expandedStock) {
      fetchStockNews(expandedStock).then((news) => {
        stockNews[expandedStock] = news;
        setStockNews(stockNews);
      });
    }
  }, [expandedStock]);

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
  };

  return (
    <div className="user-list">
      <h2>Stocks ({sortedStocks.length})</h2>

      <div className="controls">
        <div className="sort-controls">
          <label>Sort by: </label>
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
          <label>Filter by sector: </label>
          <select
            value={filterBySector}
            onChange={(e) => setFilterBySector(e.target.value)}
          >
            <option value="">All Sectors</option>
            {uniqueSectors.map((sector) => (
              <option value={sector}>{sector}</option>
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
                <button onClick={() => setSelectedStock(stock.symbol)}>
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
