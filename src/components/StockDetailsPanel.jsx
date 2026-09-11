import { formatVolumeInMillions } from "../utils/formatters";

function StockDetailsPanel({ loading, details, onLoadPriceHistory }) {
  return (
    <>
      {loading && <div>Loading stock details...</div>}

      {details && (
        <div className="user-details">
          <h3>Stock Details - {details.symbol}</h3>
          <div className="details-grid">
            <p>Company: {details.name}</p>
            <p>Price: ${details.price}</p>
            <p>Change: {details.change}%</p>
            <p>Volume: {formatVolumeInMillions(details.volume, 2)}M</p>
            <p>
              Market Cap: ${(details.marketCap / 1000000000).toFixed(2)}B
            </p>
            <p>P/E Ratio: {details.pe}</p>
            <p>EPS: ${details.eps}</p>
            <p>52W High: ${details.high52}</p>
            <p>52W Low: ${details.low52}</p>
            <p>Dividend: {details.dividend}%</p>
            <p>Beta: {details.beta}</p>
          </div>

          <button onClick={onLoadPriceHistory}>Load Price History</button>
        </div>
      )}
    </>
  );
}

export default StockDetailsPanel;
