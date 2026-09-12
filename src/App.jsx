import { useState, useEffect } from "react";

import SearchBar from "./components/SearchBar";
import StockList from "./components/StockList";
import { generateStockData } from "./utils/mockStockApi";
import "./App.css";

function App() {
  const [stocks, setStocks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    generateStockData().then(setStocks);
  }, []);

  const config = { theme: "dark", lang: "en" };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const filteredStocks = stocks.filter(({ name, symbol }) => {
    return (
      name.includes(searchTerm) || symbol.includes(searchTerm.toUpperCase())
    );
  });

  return (
    <div className="App" style={config}>
      <h1>Stock Trading Dashboard</h1>

      <SearchBar onSearch={handleSearch} placeholder="Search stocks..." stocks={stocks} />

      <StockList
        stocks={stocks}
        filteredStocks={filteredStocks}
        searchTerm={searchTerm}
      />
    </div>
  );
}

export default App;
