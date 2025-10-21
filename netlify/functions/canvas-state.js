/**
 * Canvas State Management with Netlify Blobs
 * Manages the state of all canvas artifacts using Netlify Blobs for persistence
 * This is the single source of truth for the application state
 */

import { getStore } from "@netlify/blobs";

// Default state
const DEFAULT_STATE = {
  styleGuide: {
    conversationLanguage: "English", // Language of Wider Communication
    sourceLanguage: "English", // Translating from
    targetLanguage: "English", // Translating into
    languagePair: "English → English", // Legacy, kept for compatibility
    readingLevel: "Grade 1",
    tone: "Narrator, engaging tone",
    philosophy: "Meaning-based",
  },
  glossary: {
    terms: {},
  },
  scriptureCanvas: {
    verses: {},
  },
  feedback: {
    comments: [],
  },
  workflow: {
    currentPhase: "planning",
    currentVerse: "Ruth 1:1",
    currentPhrase: 0,
    phrasesCompleted: {},
    totalPhrases: 0,
  },
  metadata: {
    lastUpdated: new Date().toISOString(),
    version: 1,
  },
};

/**
 * Get the Netlify Blobs store for the current site
 */
function getBlobStore(context) {
  return getStore({
    name: "canvas-state",
    siteID: context.site?.id || process.env.SITE_ID,
    token: context.token || process.env.NETLIFY_AUTH_TOKEN,
  });
}

/**
 * Get session-specific state key
 */
function getStateKey(req) {
  // Check for session ID in headers or query params
  const url = new URL(req.url);
  const sessionId = 
    req.headers.get?.("x-session-id") || 
    req.headers["x-session-id"] ||
    url.searchParams.get("session");
  
  // Use session-specific key if provided, otherwise use default
  return sessionId ? `session_${sessionId}` : "default";
}

/**
 * Load state from Blobs or return default
 */
async function loadState(store, stateKey) {
  try {
    const data = await store.get(stateKey);
    if (data) {
      return JSON.parse(data);
    }
    // No existing state, return default
    return { ...DEFAULT_STATE };
  } catch (error) {
    console.error("Error loading state from Blobs:", error);
    // Return default state on error
    return { ...DEFAULT_STATE };
  }
}

/**
 * Save state to Blobs
 */
async function saveState(store, stateKey, state) {
  try {
    await store.set(stateKey, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Error saving state to Blobs:", error);
    return false;
  }
}

/**
 * Get the current state
 */
async function getState(store, stateKey) {
  const globalState = await loadState(store, stateKey);
  return {
    ...globalState,
    metadata: {
      ...globalState.metadata,
      retrieved: new Date().toISOString(),
      sessionId: stateKey,
    },
  };
}

/**
 * Update the state with validation
 */
async function updateState(store, stateKey, updates, agentId = "user") {
  try {
    // Validate updates
    if (!updates || typeof updates !== "object") {
      throw new Error("Invalid updates provided");
    }

    // Load current state
    let globalState = await loadState(store, stateKey);

    // Apply updates (deep merge)
    globalState = deepMerge(globalState, updates);

    // Update metadata
    globalState.metadata.lastUpdated = new Date().toISOString();
    globalState.metadata.version = (globalState.metadata.version || 1) + 1;

    // Save to Blobs
    await saveState(store, stateKey, globalState);

    return {
      success: true,
      state: await getState(store, stateKey),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Reset state to initial values
 */
async function resetState(store, stateKey) {
  const globalState = {
    ...DEFAULT_STATE,
    metadata: {
      lastUpdated: new Date().toISOString(),
      version: 1,
      sessionId: stateKey,
    },
  };
  await saveState(store, stateKey, globalState);
  return getState(store, stateKey);
}

/**
 * List all sessions (for admin/debug purposes)
 */
async function listSessions(store) {
  try {
    const { blobs } = await store.list();
    return blobs.map(blob => ({
      key: blob.key,
      // Extract session ID from key
      sessionId: blob.key.startsWith('session_') 
        ? blob.key.replace('session_', '') 
        : blob.key,
      isDefault: blob.key === 'default'
    }));
  } catch (error) {
    console.error("Error listing sessions:", error);
    return [];
  }
}

/**
 * Deep merge utility function
 */
function deepMerge(target, source) {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }

  return output;
}

function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * Netlify Function Handler
 */
const handler = async (req, context) => {
  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-ID",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers });
  }

  try {
    // Get the Blobs store
    const store = getBlobStore(context);
    
    // Get the state key (session-specific or default)
    const stateKey = getStateKey(req);
    
    const url = new URL(req.url);
    const path = url.pathname.replace("/.netlify/functions/canvas-state", "");

    // Log for debugging
    console.log(`Canvas state request: ${req.method} ${path}, session: ${stateKey}`);

    // GET /state - Get current state
    if (req.method === "GET" && (path === "" || path === "/")) {
      const state = await getState(store, stateKey);
      return new Response(JSON.stringify(state), {
        status: 200,
        headers,
      });
    }

    // GET /sessions - List all sessions (admin/debug)
    if (req.method === "GET" && path === "/sessions") {
      const sessions = await listSessions(store);
      return new Response(
        JSON.stringify({
          sessions,
          currentSession: stateKey,
        }),
        {
          status: 200,
          headers,
        }
      );
    }

    // GET /history - Get state history (deprecated but kept for compatibility)
    if (req.method === "GET" && path === "/history") {
      const state = await getState(store, stateKey);
      return new Response(
        JSON.stringify({
          history: [], // No longer storing history with Blobs approach
          currentState: state,
        }),
        {
          status: 200,
          headers,
        }
      );
    }

    // POST /update - Update state
    if (req.method === "POST" && path === "/update") {
      const body = await req.json();
      const { updates, agentId } = body;

      const result = await updateState(store, stateKey, updates, agentId);

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers,
      });
    }

    // POST /reset - Reset state
    if (req.method === "POST" && path === "/reset") {
      const state = await resetState(store, stateKey);

      return new Response(
        JSON.stringify({
          success: true,
          state,
        }),
        {
          status: 200,
          headers,
        }
      );
    }

    // DELETE /session - Delete a specific session
    if (req.method === "DELETE" && path === "/session") {
      try {
        await store.delete(stateKey);
        return new Response(
          JSON.stringify({
            success: true,
            message: `Session ${stateKey} deleted`,
          }),
          {
            status: 200,
            headers,
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message,
          }),
          {
            status: 500,
            headers,
          }
        );
      }
    }

    // Method not allowed
    return new Response(
      JSON.stringify({
        error: `Method ${req.method} not allowed for path ${path}`,
      }),
      {
        status: 405,
        headers,
      }
    );
  } catch (error) {
    console.error("Canvas state error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process canvas state request",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      }
    );
  }
};

export default handler;