function StockControls({
  sortBy,
  sortOrder,
  onSort,
  sectors,
  filterBySector,
  onFilterBySectorChange,
}) {
  return (
    <div className="controls">
      <div className="sort-controls">
        <span>Sort by: </span>
        <button onClick={() => onSort("symbol")}>
          Symbol {sortBy === "symbol" && (sortOrder === "asc" ? "↑" : "↓")}
        </button>
        <button onClick={() => onSort("price")}>
          Price {sortBy === "price" && (sortOrder === "asc" ? "↑" : "↓")}
        </button>
        <button onClick={() => onSort("change")}>
          Change {sortBy === "change" && (sortOrder === "asc" ? "↑" : "↓")}
        </button>
        <button onClick={() => onSort("volume")}>
          Volume {sortBy === "volume" && (sortOrder === "asc" ? "↑" : "↓")}
        </button>
        <button onClick={() => onSort("sector")}>
          Sector {sortBy === "sector" && (sortOrder === "asc" ? "↑" : "↓")}
        </button>
        <button onClick={() => onSort("metrics")}>
          Avg Price{" "}
          {sortBy === "metrics" && (sortOrder === "asc" ? "↑" : "↓")}
        </button>
      </div>

      <div className="filter-controls">
        <label htmlFor="sector-filter">Filter by sector: </label>
        <select
          id="sector-filter"
          value={filterBySector}
          onChange={(e) => onFilterBySectorChange(e.target.value)}
        >
          <option value="">All Sectors</option>
          {sectors.map((sector) => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default StockControls;
