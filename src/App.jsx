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

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  return (
    <div className="App">
      <h1>Stock Trading Dashboard</h1>

      <SearchBar onSearch={handleSearch} placeholder="Search stocks..." stocks={stocks} />

      <StockList stocks={stocks} searchTerm={searchTerm} />
    </div>
  );
}

export default App;
