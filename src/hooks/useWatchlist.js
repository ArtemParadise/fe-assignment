import { useEffect, useState } from "react";

const STORAGE_KEY = "watchlist";

function loadStoredWatchlist() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(loadStoredWatchlist);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  const toggleWatchlist = (stockId) => {
    if (watchlist.includes(stockId)) {
      setWatchlist(watchlist.filter((id) => id !== stockId));
    } else {
      setWatchlist([...watchlist, stockId]);
    }
  };

  return { watchlist, toggleWatchlist };
}
