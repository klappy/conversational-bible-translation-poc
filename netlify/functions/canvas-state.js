/**
 * Canvas State Management with Netlify Blobs
 * Manages the state of all canvas artifacts using Netlify Blobs for persistence
 * This is the single source of truth for the application state
 */

import { getStore } from "@netlify/blobs";

// Default state
const DEFAULT_STATE = {
  styleGuide: {
    userName: null, // User's name - collected first
    conversationLanguage: "English", // Default value
    sourceLanguage: "English", // Default value
    targetLanguage: "English", // Default value
    languagePair: "English → English", // Legacy, kept for compatibility
    readingLevel: "Grade 1", // Default value
    tone: "Straightforward and hopeful", // Default value
    philosophy: "Meaning-based", // Default value
    approach: "Dynamic", // Translation approach default
    targetCommunity: "Teens", // Default audience
  },
  settingsCustomized: false, // Track if user has customized settings
  glossary: {
    keyTerms: {}, // Biblical terms (judges, famine, Bethlehem, Moab)
    userPhrases: {}, // User's translations of each phrase (valuable training data)
  },
  scriptureCanvas: {
    verses: {},
  },
  feedback: {
    comments: [],
  },
  workflow: {
    currentPhase: "planning",
    currentVerse: "Ruth 1:1", // Default verse to work with
    currentPhrase: 0,
    phrasesCompleted: {},
    totalPhrases: 0,
  },
  conversationHistory: [], // Full conversation history - server is source of truth
  metadata: {
    lastUpdated: new Date().toISOString(),
    version: 1,
  },
};

/**
 * Get the Netlify Blobs store for the current site
 */
function getBlobStore(context) {
  // In production, getStore should work without explicit siteID/token
  // as Netlify provides these automatically in the runtime environment
  const storeConfig = {
    name: "canvas-state",
  };

  // Only add siteID and token if they exist (for local development)
  if (context.site?.id) {
    storeConfig.siteID = context.site.id;
  }

  if (context.token) {
    storeConfig.token = context.token;
  }

  return getStore(storeConfig);
}

/**
 * Get session-specific state key
 */
function getStateKey(req, body = null) {
  // Check for session ID in headers, query params, or body (in that order)
  const url = new URL(req.url);
  const sessionId =
    req.headers.get?.("x-session-id") ||
    req.headers["x-session-id"] ||
    url.searchParams.get("session") ||
    url.searchParams.get("sessionId") ||
    body?.sessionId;

  // Use session-specific key if provided, otherwise use default
  // Don't double-prefix if session ID already starts with "session_"
  if (!sessionId) return "default";
  return sessionId.startsWith("session_") ? sessionId : `session_${sessionId}`;
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
 * Update the state with validation and error recovery
 */
async function updateState(store, stateKey, updates, agentId = "system") {
  try {
    // Validate updates
    if (!updates || typeof updates !== "object") {
      console.warn(`⚠️ Invalid updates from ${agentId}:`, updates);
      throw new Error("Invalid updates provided");
    }

    console.log(`📝 State update from ${agentId}:`, JSON.stringify(updates, null, 2));

    // Load current state
    let globalState = await loadState(store, stateKey);

    // Apply updates (deep merge)
    globalState = deepMerge(globalState, updates);

    // Update metadata
    globalState.metadata.lastUpdated = new Date().toISOString();
    globalState.metadata.version = (globalState.metadata.version || 1) + 1;
    globalState.metadata.lastAgent = agentId;

    // Save to Blobs with retry on failure
    let saveSucceeded = false;
    let saveAttempts = 0;
    const maxSaveAttempts = 3;

    while (saveAttempts < maxSaveAttempts && !saveSucceeded) {
      try {
        await saveState(store, stateKey, globalState);
        saveSucceeded = true;
        console.log(`✅ State saved successfully (version ${globalState.metadata.version})`);
      } catch (saveError) {
        saveAttempts++;
        console.error(`🔴 Save attempt ${saveAttempts} failed:`, saveError.message);
        if (saveAttempts < maxSaveAttempts) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500 * saveAttempts));
        }
      }
    }

    if (!saveSucceeded) {
      console.error(`❌ Failed to save state after ${maxSaveAttempts} attempts`);
      throw new Error(`Failed to persist state after ${maxSaveAttempts} attempts`);
    }

    const savedState = await getState(store, stateKey);
    console.log(`✅ State update complete for ${agentId}`);

    return {
      success: true,
      state: savedState,
      message: `State updated successfully from ${agentId}`,
    };
  } catch (error) {
    console.error(`❌ State update failed from ${agentId}:`, error.message);
    return {
      success: false,
      error: error.message,
      agent: agentId,
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
    return blobs.map((blob) => ({
      key: blob.key,
      // Extract session ID from key
      sessionId: blob.key.startsWith("session_") ? blob.key.replace("session_", "") : blob.key,
      isDefault: blob.key === "default",
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

    // Parse body if it exists (for POST requests)
    let body = null;
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch (e) {
        // No body or invalid JSON, that's fine
      }
    }

    // Get the state key (session-specific or default)
    const stateKey = getStateKey(req, body);

    const url = new URL(req.url);
    const path = url.pathname.replace("/.netlify/functions/canvas-state", "");

    // Log for debugging
    console.log(`Canvas state request: ${req.method} ${path}, session: ${stateKey}`);

    // GET /state - Get current state (with optional reset)
    if (req.method === "GET" && (path === "" || path === "/")) {
      // Check for reset flag in query params
      const shouldReset = url.searchParams.get("reset") === "true";

      if (shouldReset) {
        console.log(`Resetting session via GET: ${stateKey}`);
        const state = await resetState(store, stateKey);
        return new Response(
          JSON.stringify({
            ...state,
            metadata: {
              ...state.metadata,
              reset: true,
              message: "Session reset successfully",
            },
          }),
          {
            status: 200,
            headers,
          }
        );
      }

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
      const { updates, agentId } = body || {};

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

    // POST /rewind - Remove last user message and responses
    if (req.method === "POST" && path === "/rewind") {
      const state = await getState(store, stateKey);
      const history = state.conversationHistory || [];
      
      // Find last user message index
      let lastUserIndex = -1;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].role === "user") {
          lastUserIndex = i;
          break;
        }
      }
      
      // Don't rewind past initial greeting
      if (lastUserIndex <= 0) {
        return new Response(JSON.stringify({
          success: false,
          message: "Cannot rewind further"
        }), { status: 400, headers });
      }
      
      // Keep everything before last user message
      const rewoundHistory = history.slice(0, lastUserIndex);
      
      const result = await updateState(store, stateKey, {
        conversationHistory: rewoundHistory
      }, "rewind");
      
      return new Response(JSON.stringify({
        success: result.success,
        rewoundCount: history.length - rewoundHistory.length,
        newLength: rewoundHistory.length
      }), { status: 200, headers });
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
