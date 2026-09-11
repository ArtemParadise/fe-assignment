import { useState, useRef } from "react";

import { fetchStockDetails, fetchHistoricalPrices } from "../utils/mockStockApi";

export function useStockDetails() {
  const [stockDetails, setStockDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const latestDetailsRequest = useRef(null);

  const viewStockDetails = (symbol) => {
    latestDetailsRequest.current = symbol;
    setLoading(true);
    fetchStockDetails(symbol)
      .then((data) => {
        if (latestDetailsRequest.current === symbol) {
          setStockDetails(data);
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console -- known issue #17 (docs/known-issues.md, fixed): error is only logged to the console, never surfaced to the user; not fixing app bugs in this eslint cleanup
        console.log(err);
      })
      .finally(() => {
        if (latestDetailsRequest.current === symbol) {
          setLoading(false);
        }
      });
  };

  const loadPriceHistory = () => {
    fetchHistoricalPrices(stockDetails.symbol).then((prices) => {
      // eslint-disable-next-line no-console -- known issue #16 (docs/known-issues.md): result is only logged, never rendered; not fixing app bugs in this eslint cleanup
      console.log("Historical prices:", prices);
      // TODO
    });
  };

  return { stockDetails, loading, viewStockDetails, loadPriceHistory };
}
