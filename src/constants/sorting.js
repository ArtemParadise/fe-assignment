export const SORT_FIELDS = {
  SYMBOL: "symbol",
  NAME: "name",
  PRICE: "price",
  SECTOR: "sector",
  CHANGE: "change",
  VOLUME: "volume",
  METRICS: "metrics",
};

// Comparators for every sortable field except METRICS, which needs the
// separately-loaded stockMetrics and is handled by its caller instead.
export const SORT_COMPARATORS = {
  [SORT_FIELDS.SYMBOL]: (a, b) => a.symbol.localeCompare(b.symbol),
  [SORT_FIELDS.NAME]: (a, b) => a.name.localeCompare(b.name),
  [SORT_FIELDS.PRICE]: (a, b) => a.price - b.price,
  [SORT_FIELDS.SECTOR]: (a, b) => a.sector.localeCompare(b.sector),
  [SORT_FIELDS.CHANGE]: (a, b) => a.change - b.change,
  [SORT_FIELDS.VOLUME]: (a, b) => a.volume - b.volume,
};
