import { formatVolumeLabel } from "../utils/formatters";

import StockNews from "./StockNews";

const getWatchlistLabel = (symbol, isWatchlisted) => isWatchlisted
  ? `Remove ${symbol} from watchlist`
  : `Add ${symbol} to watchlist`;

function StockCard({
  stock,
  isWatchlisted,
  avgPrice,
  news,
  isExpanded,
  onToggleWatchlist,
  onViewDetails,
  onToggleNews,
}) {
  const priceChange = stock.change;
  const isPositive = priceChange >= 0;

  return (
    <div className={`user-card ${isWatchlisted ? "favorite" : ""}`}>
      <div className="user-card-header">
        <h3>{stock.symbol}</h3>
        <button
          className="fav-btn"
          aria-label={getWatchlistLabel(stock.symbol, isWatchlisted)}
          aria-pressed={isWatchlisted}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatchlist();
          }}
        >
          {isWatchlisted ? "★" : "☆"}
        </button>
      </div>

      <p className="stock-name">{stock.name}</p>

      <div className="stock-price">
        <span className="stock-price-value">
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
        <small>Volume: {formatVolumeLabel(stock.volume)}</small>
        <small>Avg: {avgPrice?.toFixed(2) || "Loading..."}</small>
      </div>

      <div className="user-actions">
        <button onClick={onViewDetails}>View Details</button>
        <button onClick={onToggleNews}>
          {isExpanded ? "Hide News" : "Show News"}
        </button>
      </div>

      {isExpanded && (
        <div className="user-posts">
          <StockNews news={news} />
        </div>
      )}
    </div>
  );
}

export default StockCard;
