import React, { useState, useEffect } from "react";
import StockList from "./components/StockList";
import SearchBar from "./components/SearchBar";
import { generateStockData } from "./utils/mockStockApi";
import "./App.css";

function App() {
  const [showTimer, setShowTimer] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStock, setActiveSelectedStockFromMarketDataRequested] =
    useState();

  useEffect(() => {
    generateStockData().then(setStocks);
  }, []);

  const config = { theme: "dark", lang: "en" };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  useEffect(() => {
    if (searchTerm) {
      const filtered = stocks.filter(
        (s) =>
          s.symbol.includes(searchTerm.toUpperCase()) ||
          s.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setActiveSelectedStockFromMarketDataRequested(filtered[0]);
    }
  }, [searchTerm]);

  const filteredStocks = stocks.filter(({ name, symbol }) => {
    return (
      name.includes(searchTerm) || symbol.includes(searchTerm.toUpperCase())
    );
  });

  return (
    <div className="App" style={config}>
      <h1>Stock Trading Dashboard</h1>

      <SearchBar onSearch={handleSearch} placeholder="Search stocks..." />

      <StockList
        stocks={stocks}
        filteredStocks={filteredStocks}
        searchTerm={searchTerm}
      />
    </div>
  );
}

export default App;
