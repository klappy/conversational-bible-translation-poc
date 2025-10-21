import { useState } from "react";
import "./InlineSuggestions.css";

const InlineSuggestions = ({ suggestions, onSelect, messageId }) => {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [hasSelected, setHasSelected] = useState(false);

  const handleSelect = (suggestion, index) => {
    if (hasSelected) return; // Prevent re-selection
    
    setSelectedIndex(index);
    setHasSelected(true);
    onSelect(suggestion);
  };

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="inline-suggestions">
      <div className="suggestions-label">Quick responses:</div>
      <div className="suggestions-list">
        {suggestions.map((suggestion, index) => (
          <button
            key={`${messageId}-${index}`}
            className={`suggestion-chip ${
              selectedIndex === index ? 'selected' : ''
            } ${hasSelected && selectedIndex !== index ? 'not-selected' : ''}`}
            onClick={() => handleSelect(suggestion, index)}
            disabled={hasSelected}
          >
            {suggestion}
          </button>
        ))}
      </div>
      {hasSelected && (
        <div className="selection-indicator">
          → You selected: "{suggestions[selectedIndex]}"
        </div>
      )}
    </div>
  );
};

export default InlineSuggestions;
