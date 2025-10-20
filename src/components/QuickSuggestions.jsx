import React from "react";

// This component has ONE JOB: Display suggestions
const QuickSuggestions = ({ suggestions = [], onSelect, isLoading = false }) => {
  console.log("🎯 QuickSuggestions Component:", { suggestions, count: suggestions.length });

  // Don't show anything if no suggestions
  if (!suggestions || suggestions.length === 0) {
    console.log("📭 No suggestions to display");
    return null;
  }

  return (
    <div className='response-suggestions'>
      <div className='options-label'>Quick responses:</div>
      <div className='suggestion-cards'>
        {suggestions.map((text, index) => (
          <button
            key={index}
            type='button'
            className='suggestion-card'
            onClick={() => onSelect(text)}
            disabled={isLoading}
          >
            <div className='suggestion-text'>{text}</div>
            <div className='suggestion-hint'>Click to use this response</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickSuggestions;
