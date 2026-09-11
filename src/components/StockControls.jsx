import { SORT_FIELDS } from "../constants/sorting";

const SORT_BUTTONS = [
  { field: SORT_FIELDS.SYMBOL, label: "Symbol" },
  { field: SORT_FIELDS.PRICE, label: "Price" },
  { field: SORT_FIELDS.CHANGE, label: "Change" },
  { field: SORT_FIELDS.VOLUME, label: "Volume" },
  { field: SORT_FIELDS.SECTOR, label: "Sector" },
  { field: SORT_FIELDS.METRICS, label: "Avg Price" },
];

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
        {SORT_BUTTONS.map(({ field, label }) => (
          <button key={field} onClick={() => onSort(field)}>
            {label} {sortBy === field && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
        ))}
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
