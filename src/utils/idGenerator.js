// Global counter for truly unique IDs
let idCounter = 0;

/**
 * Generates a truly unique ID with a prefix
 * Combines timestamp, incrementing counter, and random string
 * This ensures no duplicates even when called multiple times in the same millisecond
 * 
 * @param {string} prefix - The prefix for the ID (e.g., 'user', 'msg', 'error')
 * @returns {string} A unique ID string
 */
export const generateUniqueId = (prefix) => {
  idCounter++;
  return `${prefix}_${Date.now()}_${idCounter}_${Math.random().toString(36).substr(2, 9)}`;
};
