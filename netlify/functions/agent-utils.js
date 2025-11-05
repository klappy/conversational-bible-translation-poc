/**
 * Shared Agent Utilities
 * Common functions used by agent orchestration, individual agent calls, and conversation handling
 */

import { OpenAI } from "openai";
import { getAgent } from "./agents/registry.js";

// Simple ID generator for server-side (matches client-side pattern)
let idCounter = 0;
export const generateUniqueId = (prefix) => {
  idCounter++;
  return `${prefix}_${Date.now()}_${idCounter}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Call an individual agent with context
 */
export async function callAgent(agent, message, context, openaiClient) {
  console.log(`Calling agent: ${agent.id}`);
  try {
    const messages = [
      {
        role: "system",
        content: agent.systemPrompt,
      },
    ];

    // Add conversation history as natural messages (for primary agent only)
    if (agent.id === "primary" && context.conversationHistory) {
      context.conversationHistory.forEach((msg) => {
        // Skip Canvas Scribe acknowledgments
        if (msg.agent?.id === "state") return;

        // Skip inline suggestion messages (they're system UI elements, not conversation)
        if (msg.type === "suggestions" && msg.role === "system") return;

        // Skip messages with array content (would cause OpenAI errors)
        if (Array.isArray(msg.content)) return;

        // Parse assistant messages if they're JSON
        let content = msg.content;
        if (msg.role === "assistant" && msg.agent?.id === "primary") {
          try {
            const parsed = JSON.parse(content);
            content = parsed.message || content;
          } catch {
            // Not JSON, use as-is
          }
        }

        messages.push({
          role: msg.role,
          content: content,
        });
      });
    }

    // Add the current user message
    messages.push({
      role: "user",
      content: message,
    });

    // Provide canvas state context to all agents
    if (context.canvasState) {
      messages.push({
        role: "system",
        content: `Current canvas state: ${JSON.stringify(context.canvasState)}`,
      });
    }

    // For non-primary agents, provide context differently
    if (agent.id !== "primary") {
      messages.push({
        role: "system",
        content: `Context: ${JSON.stringify({
          canvasState: context.canvasState,
          primaryResponse: context.primaryResponse,
          previousResponses: context.previousResponses,
          orchestration: context.orchestration,
        })}`,
      });
    }

    // Add timeout wrapper for API call with generous timeout
    // 30 seconds allows for complex responses and occasional network delays
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout calling ${agent.id}`)), 30000);
    });

    let completion;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        const completionPromise = openaiClient.chat.completions.create({
          model: agent.model,
          messages: messages,
          temperature: agent.id === "state" ? 0.1 : 0.7,
          max_tokens: agent.id === "state" ? 500 : 2000,
        });

        completion = await Promise.race([completionPromise, timeoutPromise]);
        break;
      } catch (error) {
        retryCount++;
        if (retryCount <= maxRetries) {
          console.log(`⚠️ Agent ${agent.id} failed (attempt ${retryCount}), retrying... Error: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        } else {
          console.error(`❌ Agent ${agent.id} failed after ${maxRetries + 1} attempts`);
          throw error;
        }
      }
    }
    console.log(`Agent ${agent.id} responded successfully`);

    return {
      agentId: agent.id,
      agent: agent.visual,
      response: completion.choices[0].message.content,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error calling agent ${agent.id}:`, error.message);
    return {
      agentId: agent.id,
      agent: agent.visual,
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Get current canvas state from state management function
 */
export async function getCanvasState(sessionId = "default") {
  try {
    const { default: canvasStateHandler } = await import("./canvas-state.js");
    
    const mockRequest = {
      method: "GET",
      url: `http://localhost/.netlify/functions/canvas-state`,
      headers: {
        get: (name) => name.toLowerCase() === "x-session-id" ? sessionId : null,
        "x-session-id": sessionId,
      },
    };

    const response = await canvasStateHandler(mockRequest, {});
    
    if (response.status === 200) {
      return await response.json();
    }
  } catch (error) {
    console.error("Error fetching canvas state:", error);
  }

  return {
    styleGuide: {},
    glossary: { terms: {} },
    scriptureCanvas: { verses: {} },
    workflow: { currentPhase: "planning" },
  };
}

/**
 * Update canvas state
 */
export async function updateCanvasState(updates, agentId = "system", sessionId = "default") {
  try {
    const { default: canvasStateHandler } = await import("./canvas-state.js");
    
    console.log("🔵 updateCanvasState called with:", JSON.stringify(updates, null, 2));
    console.log("🔵 Session ID:", sessionId);

    const mockRequest = {
      method: "POST",
      url: `http://localhost/.netlify/functions/canvas-state/update`,
      headers: {
        get: (name) => name.toLowerCase() === "x-session-id" ? sessionId : null,
        "content-type": "application/json",
        "x-session-id": sessionId,
      },
      json: async () => ({ updates, agentId }),
    };

    const response = await canvasStateHandler(mockRequest, {});
    
    if (response.status === 200) {
      const result = await response.json();
      console.log("🔵 Update successful");
      return result;
    } else {
      console.error("🔴 Update failed with status:", response.status);
    }
  } catch (error) {
    console.error("🔴 Error updating canvas state:", error);
  }
  return null;
}

/**
 * Build context for agent calls including conversation history
 */
export async function buildAgentContext(userMessage, sessionId, previousResponses = null) {
  const canvasState = await getCanvasState(sessionId);
  const serverHistory = canvasState.conversationHistory || [];
  
  return {
    canvasState,
    conversationHistory: serverHistory.slice(-10),
    previousResponses,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Extract the last assistant question from conversation history
 */
export function getLastAssistantQuestion(conversationHistory) {
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    if (msg.role === "assistant" && msg.agent?.id === "primary") {
      try {
        const parsed = JSON.parse(msg.content);
        return parsed.message || msg.content;
      } catch {
        return msg.content;
      }
    }
  }
  return null;
}

/**
 * Parse state agent response and extract updates
 */
export function parseStateResponse(responseText) {
  const parsed = {
    message: null,
    updates: {},
  };

  if (!responseText || responseText.trim() === "") {
    return parsed;
  }

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const stateUpdates = JSON.parse(jsonMatch[0]);
      parsed.message = stateUpdates.message || responseText.substring(0, responseText.indexOf(jsonMatch[0])).trim();
      parsed.updates = stateUpdates.updates || {};
    } else {
      parsed.message = responseText;
    }
  } catch (e) {
    console.error("Error parsing state response:", e);
    parsed.message = responseText;
  }

  return parsed;
}

/**
 * Create CORS headers for Netlify functions
 */
export function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-ID",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  };
}

/**
 * Get session ID from request headers or body
 */
export function getSessionIdFromRequest(req, bodySessionId = null) {
  return (
    req.headers.get?.("x-session-id") || 
    req.headers["x-session-id"] || 
    bodySessionId || 
    "default"
  );
}

