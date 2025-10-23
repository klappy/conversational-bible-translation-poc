/**
 * Session Management Utility
 * Handles session IDs for multi-user support
 */

/**
 * Get or create a session ID
 * First checks URL params, then localStorage, then generates new
 * Falls back to memory-only storage if localStorage is unavailable (Safari private mode, etc.)
 */
let memorySessionId = null; // Fallback for when localStorage is unavailable

export function getSessionId() {
  // Check URL params first (for workshop attendees with specific links)
  const urlParams = new URLSearchParams(window.location.search);
  const urlSession = urlParams.get("session");

  if (urlSession) {
    // Try to save URL session to localStorage for persistence
    try {
      localStorage.setItem("sessionId", urlSession);
    } catch (e) {
      console.warn("localStorage unavailable (private browsing?), using memory storage:", e.message);
      memorySessionId = urlSession;
    }
    return urlSession;
  }

  // Try to check localStorage for existing session
  let sessionId = null;
  try {
    sessionId = localStorage.getItem("sessionId");
  } catch (e) {
    console.warn("localStorage unavailable (private browsing?), using memory storage:", e.message);
    // Fall back to memory storage
    if (memorySessionId) {
      return memorySessionId;
    }
  }

  if (!sessionId) {
    // Generate new session ID
    sessionId = generateSessionId();
    
    // Try to save to localStorage
    try {
      localStorage.setItem("sessionId", sessionId);
    } catch (e) {
      console.warn("localStorage unavailable (private browsing?), using memory storage:", e.message);
      memorySessionId = sessionId;
    }
  }

  return sessionId;
}

/**
 * Generate a new session ID
 */
export function generateSessionId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `session_${timestamp}_${random}`;
}

/**
 * Clear the current session
 */
export function clearSession() {
  try {
    localStorage.removeItem("sessionId");
  } catch (e) {
    console.warn("localStorage unavailable, clearing memory storage instead");
  }
  memorySessionId = null;
  // Optionally reload to get fresh state
  window.location.href = window.location.pathname;
}

/**
 * Get session headers for API calls
 */
export function getSessionHeaders() {
  const sessionId = getSessionId();
  console.log("📤 Sending API request with session ID:", sessionId);
  return {
    "X-Session-ID": sessionId,
  };
}

/**
 * Check if using a workshop session (from URL)
 */
export function isWorkshopSession() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlSession = urlParams.get("session");
  return urlSession && urlSession.includes("workshop");
}

/**
 * Get a shareable URL for the current session
 */
export function getShareableUrl() {
  const sessionId = getSessionId();
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?session=${sessionId}`;
}

/**
 * Display session info (for debugging/admin)
 */
export function getSessionInfo() {
  const sessionId = getSessionId();
  const isWorkshop = isWorkshopSession();
  const shareUrl = getShareableUrl();

  return {
    sessionId,
    isWorkshop,
    shareUrl,
    createdAt: sessionId.includes("_") ? new Date(parseInt(sessionId.split("_")[1])) : null,
  };
}
