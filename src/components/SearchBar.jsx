import { useState } from "react";

import { generateStockData } from "../utils/mockStockApi";

function SearchBar({ onSearch, placeholder }) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const handleChange = (e) => {
    const newValue = e.target.value;

    setValue(newValue);
    onSearch(newValue);

    if (newValue.length > 2) {
      generateStockData().then((data) => {
        setSuggestions(
          data.filter(({ name }) => {
            return name.toLowerCase().includes(newValue.toLowerCase());
          }),
        );
      });
    }
  };

  const inputStyle = {
    padding: "10px",
    fontSize: "16px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    width: "100%",
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        style={inputStyle}
      />

      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((item, idx) => (
            <li key={idx}>
              <button
                type="button"
                onClick={() => {
                  setValue(item.name);
                  onSearch(item.name);
                }}
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SearchBar;
