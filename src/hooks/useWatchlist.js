import { useState } from "react";

const STORAGE_KEY = "watchlist";

function loadStoredWatchlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistWatchlist(watchlist) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  } catch {
    // Storage may be disabled or full; keep the in-memory watchlist regardless.
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(loadStoredWatchlist);

  const toggleWatchlist = (stockId) => {
    const next = watchlist.includes(stockId)
      ? watchlist.filter((id) => id !== stockId)
      : [...watchlist, stockId];

    persistWatchlist(next);
    setWatchlist(next);
  };

  return { watchlist, toggleWatchlist };
}
