import { useState } from "react";

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState([]);

  const toggleWatchlist = (stockId) => {
    if (watchlist.includes(stockId)) {
      setWatchlist(watchlist.filter((id) => id !== stockId));
    } else {
      setWatchlist([...watchlist, stockId]);
    }
  };

  return { watchlist, toggleWatchlist };
}
