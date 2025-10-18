/**
 * Canvas State Management
 * Manages the state of all canvas artifacts server-side
 * This is the single source of truth for the application state
 */

import { promises as fs } from 'fs';
import { join } from 'path';

// State file path (in temp directory for local dev)
const STATE_FILE = join('/tmp', 'canvas-state.json');

// Default state
const DEFAULT_STATE = {
  styleGuide: {
    conversationLanguage: "English",  // Language of Wider Communication
    sourceLanguage: "English",        // Translating from
    targetLanguage: "English",        // Translating into
    languagePair: "English → English", // Legacy, kept for compatibility
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

/**
 * Load state from file or return default
 */
async function loadState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, return default
    return { ...DEFAULT_STATE };
  }
}

/**
 * Save state to file
 */
async function saveState(state) {
  try {
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving state:', error);
    return false;
  }
}

/**
 * Get the current state
 */
async function getState() {
  const globalState = await loadState();
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
async function updateState(updates, agentId = 'user') {
  try {
    // Validate updates
    if (!updates || typeof updates !== 'object') {
      throw new Error('Invalid updates provided');
    }

    // Load current state
    let globalState = await loadState();

    // Apply updates (deep merge)
    globalState = deepMerge(globalState, updates);
    
    // Update metadata
    globalState.metadata.lastUpdated = new Date().toISOString();
    globalState.metadata.version = (globalState.metadata.version || 1) + 1;

    // Save to file
    await saveState(globalState);

    return {
      success: true,
      state: await getState()
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
async function resetState() {
  const globalState = {
    styleGuide: {
      conversationLanguage: "English",  // Language of Wider Communication
      sourceLanguage: "English",        // Translating from
      targetLanguage: "English",        // Translating into
      languagePair: "English → English", // Legacy, kept for compatibility
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
  await saveState(globalState);
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
    const state = await getState();
    return new Response(JSON.stringify(state), { 
      status: 200, 
      headers 
    });
  }

  // GET /history - Get state history (deprecated for file-based storage)
  if (req.method === "GET" && path === "/history") {
    const state = await getState();
    return new Response(JSON.stringify({ 
      history: [],  // No longer storing history with file-based approach
      currentState: state
    }), { 
      status: 200, 
      headers 
    });
  }

    // POST /update - Update state
    if (req.method === "POST" && path === "/update") {
      const body = await req.json();
      const { updates, agentId } = body;
      
      const result = await updateState(updates, agentId);
      
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers
      });
    }

    // POST /reset - Reset state
    if (req.method === "POST" && path === "/reset") {
      const state = await resetState();
      
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
