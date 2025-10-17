/**
 * Canvas State Management
 * Manages the state of all canvas artifacts server-side
 * This is the single source of truth for the application state
 */

// In-memory state store (will be replaced with persistent storage later)
let globalState = {
  styleGuide: {
    languagePair: "English → English",
    readingLevel: "Grade 1",
    tone: "Narrator, engaging tone",
    philosophy: "Meaning-based"
  },
  glossary: {
    terms: {}
  },
  scriptureCanvas: {
    verses: {}
  },
  feedback: {
    comments: []
  },
  workflow: {
    currentPhase: "planning",
    currentVerse: "Ruth 1:1",
    currentPhrase: 0,
    phrasesCompleted: {},
    totalPhrases: 0
  },
  metadata: {
    lastUpdated: new Date().toISOString(),
    version: 1
  }
};

// State update history (for debugging and potential rollback)
let stateHistory = [];
const MAX_HISTORY = 50;

/**
 * Get the current state
 */
function getState() {
  return {
    ...globalState,
    metadata: {
      ...globalState.metadata,
      retrieved: new Date().toISOString()
    }
  };
}

/**
 * Update the state with validation
 */
function updateState(updates, agentId = 'user') {
  try {
    // Validate updates
    if (!updates || typeof updates !== 'object') {
      throw new Error('Invalid updates provided');
    }

    // Store previous state in history
    stateHistory.push({
      timestamp: new Date().toISOString(),
      agentId,
      previousState: JSON.parse(JSON.stringify(globalState)),
      updates
    });

    // Trim history if needed
    if (stateHistory.length > MAX_HISTORY) {
      stateHistory = stateHistory.slice(-MAX_HISTORY);
    }

    // Apply updates (deep merge)
    globalState = deepMerge(globalState, updates);
    
    // Update metadata
    globalState.metadata.lastUpdated = new Date().toISOString();
    globalState.metadata.version++;

    return {
      success: true,
      state: getState()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Reset state to initial values
 */
function resetState() {
  globalState = {
    styleGuide: {
      languagePair: "English → English",
      readingLevel: "Grade 1",
      tone: "Narrator, engaging tone",
      philosophy: "Meaning-based"
    },
    glossary: {
      terms: {}
    },
    scriptureCanvas: {
      verses: {}
    },
    feedback: {
      comments: []
    },
    workflow: {
      currentPhase: "planning",
      currentVerse: "Ruth 1:1",
      currentPhrase: 0,
      phrasesCompleted: {},
      totalPhrases: 0
    },
    metadata: {
      lastUpdated: new Date().toISOString(),
      version: 1
    }
  };
  stateHistory = [];
  return getState();
}

/**
 * Deep merge utility function
 */
function deepMerge(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
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
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Netlify Function Handler
 */
const handler = async (req, context) => {
  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json"
  };

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/.netlify/functions/canvas-state', '');

    // GET /state - Get current state
    if (req.method === "GET" && (path === "" || path === "/")) {
      return new Response(JSON.stringify(getState()), { 
        status: 200, 
        headers 
      });
    }

    // GET /history - Get state history
    if (req.method === "GET" && path === "/history") {
      return new Response(JSON.stringify({ 
        history: stateHistory,
        currentState: getState()
      }), { 
        status: 200, 
        headers 
      });
    }

    // POST /update - Update state
    if (req.method === "POST" && path === "/update") {
      const body = await req.json();
      const { updates, agentId } = body;
      
      const result = updateState(updates, agentId);
      
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers
      });
    }

    // POST /reset - Reset state
    if (req.method === "POST" && path === "/reset") {
      const state = resetState();
      
      return new Response(JSON.stringify({
        success: true,
        state
      }), {
        status: 200,
        headers
      });
    }

    // Method not allowed
    return new Response(JSON.stringify({ 
      error: `Method ${req.method} not allowed for path ${path}` 
    }), { 
      status: 405, 
      headers 
    });

  } catch (error) {
    console.error("Canvas state error:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to process canvas state request",
      details: error.message
    }), {
      status: 500,
      headers: {
        ...headers,
        "Content-Type": "application/json"
      }
    });
  }
};

export default handler;
