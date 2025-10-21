/**
 * Session Management Utility
 * Handles session IDs for multi-user support
 */

/**
 * Get or create a session ID
 * First checks URL params, then localStorage, then generates new
 */
export function getSessionId() {
  // Check URL params first (for workshop attendees with specific links)
  const urlParams = new URLSearchParams(window.location.search);
  const urlSession = urlParams.get("session");

  if (urlSession) {
    // Save URL session to localStorage for persistence
    localStorage.setItem("sessionId", urlSession);
    return urlSession;
  }

  // Check localStorage for existing session
  let sessionId = localStorage.getItem("sessionId");

  if (!sessionId) {
    // Generate new session ID
    sessionId = generateSessionId();
    localStorage.setItem("sessionId", sessionId);
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
  localStorage.removeItem("sessionId");
  // Optionally reload to get fresh state
  window.location.href = window.location.pathname;
}

/**
 * Get session headers for API calls
 */
export function getSessionHeaders() {
  const sessionId = getSessionId();
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
