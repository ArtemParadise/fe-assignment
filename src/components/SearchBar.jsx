import { useRef, useState } from "react";

import { useClickOutside } from "../hooks/useClickOutside";

function SearchBar({ onSearch, placeholder, stocks }) {
  const [value, setValue] = useState("");
  const [shouldShowSuggestions, setShouldShowSuggestions] = useState(false);
  const containerRef = useRef(null);

  const suggestions = shouldShowSuggestions
    ? stocks.filter(({ name }) => name.toLowerCase().includes(value.toLowerCase()))
    : [];

  useClickOutside(containerRef, () => setShouldShowSuggestions(false), shouldShowSuggestions);

  const handleChange = (e) => {
    const newValue = e.target.value;

    setValue(newValue);
    onSearch(newValue);
    setShouldShowSuggestions(newValue.length > 2);
  };

  return (
    <div className="search-bar" ref={containerRef}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
      />

      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  setValue(item.name);
                  onSearch(item.name);
                  setShouldShowSuggestions(false);
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
