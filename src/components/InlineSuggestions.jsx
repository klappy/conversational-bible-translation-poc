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
      <div className="suggestions-label">QUICK RESPONSES:</div>
      {/* Render as copyable text */}
      <div className="suggestions-copyable-text">
        {suggestions.map((s, i) => (
          <span key={i} className="suggestion-text-item">
            {i > 0 && " | "}
            {s}
          </span>
        ))}
      </div>
      {/* Interactive buttons */}
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
