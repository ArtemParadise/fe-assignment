import { useStockDetails } from "../hooks/useStockDetails";
import { useStockFilters } from "../hooks/useStockFilters";
import { useStockMetrics } from "../hooks/useStockMetrics";
import { useStockNews } from "../hooks/useStockNews";
import { useStockSort } from "../hooks/useStockSort";
import { useWatchlist } from "../hooks/useWatchlist";

import StockCard from "./StockCard";
import StockControls from "./StockControls";
import StockDetailsPanel from "./StockDetailsPanel";

function StockList({ stocks, searchTerm }) {
  const { watchlist, toggleWatchlist } = useWatchlist();
  const stockMetrics = useStockMetrics(stocks);
  const { stockNews, expandedStock, loadStockNews } = useStockNews();

  const {
    stockDetails,
    loading,
    priceHistory,
    priceHistoryLoading,
    viewStockDetails,
    loadPriceHistory,
  } = useStockDetails();

  const { visibleStocks, filterBySector, setFilterBySector, uniqueSectors } =
    useStockFilters(stocks, searchTerm);

  const { sortedStocks, sortBy, sortOrder, handleSort } = useStockSort(
    visibleStocks,
    stockMetrics,
  );

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
              news={stockNews[stock.symbol]}
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
        priceHistory={priceHistory}
        priceHistoryLoading={priceHistoryLoading}
        onLoadPriceHistory={loadPriceHistory}
      />
    </div>
  );
}

export default StockList;
