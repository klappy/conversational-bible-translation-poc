/**
 * Multi-Agent Conversation Handler
 * Orchestrates multiple AI agents to handle Bible translation conversations
 */

import { OpenAI } from "openai";
import { getAgent } from "./agents/registry.js";

// OpenAI client will be initialized per request with context

/**
 * Call an individual agent with context
 */
async function callAgent(agent, message, context, openaiClient) {
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

        // Skip Canvas Scribe acknowledgments
        if (msg.agent?.id === "state") return;

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
          orchestration: context.orchestration,
        })}`,
      });
    }

    // Add timeout wrapper for API call
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout calling ${agent.id}`)), 10000); // 10 second timeout
    });

    const completionPromise = openaiClient.chat.completions.create({
      model: agent.model,
      messages: messages,
      temperature: agent.id === "state" ? 0.1 : 0.7, // Lower temp for state extraction
      max_tokens: agent.id === "state" ? 500 : 2000,
    });

    const completion = await Promise.race([completionPromise, timeoutPromise]);
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
async function getCanvasState(sessionId = "default") {
  try {
    // Use absolute URL for localhost (Netlify Functions requirement)
    const stateUrl = "http://localhost:8888/.netlify/functions/canvas-state";

    const response = await fetch(stateUrl, {
      headers: {
        "X-Session-ID": sessionId,
      },
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("Error fetching canvas state:", error);
  }

  // Return default state if fetch fails
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
async function updateCanvasState(updates, agentId = "system") {
  try {
    // Use absolute URL for localhost
    const stateUrl = "http://localhost:8888/.netlify/functions/canvas-state/update";

    const response = await fetch(stateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ updates, agentId }),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("Error updating canvas state:", error);
  }
  return null;
}

/**
 * Process conversation with multiple agents
 */
async function processConversation(userMessage, conversationHistory, sessionId, openaiClient) {
  console.log("Starting processConversation with message:", userMessage);
  console.log("Using session ID:", sessionId);
  const responses = {};
  const canvasState = await getCanvasState(sessionId);
  console.log("Got canvas state");

  // Build context for agents
  const context = {
    canvasState,
    conversationHistory: conversationHistory.slice(-10), // Last 10 messages
    timestamp: new Date().toISOString(),
  };

  // First, ask the orchestrator which agents should respond
  const orchestrator = getAgent("orchestrator");
  console.log("Asking orchestrator which agents to activate...");
  const orchestratorResponse = await callAgent(orchestrator, userMessage, context, openaiClient);

  let orchestration;
  try {
    orchestration = JSON.parse(orchestratorResponse.response);
    console.log("Orchestrator decided:", orchestration);
  } catch (error) {
    // If orchestrator fails, fall back to sensible defaults
    console.error("Orchestrator response was not valid JSON, using defaults:", error.message);
    orchestration = {
      agents: ["primary", "state"],
      notes: "Fallback to primary and state agents",
    };
  }

  // Only call the agents the orchestrator says we need
  const agentsToCall = orchestration.agents || ["primary", "state"];

  // Call Resource Librarian if orchestrator says so
  if (agentsToCall.includes("resource")) {
    const resource = getAgent("resource");
    console.log("Calling resource librarian...");
    responses.resource = await callAgent(
      resource,
      userMessage,
      {
        ...context,
        orchestration,
      },
      openaiClient
    );
    console.log("Resource librarian responded");
  }

  // Call primary translator if orchestrator says so
  if (agentsToCall.includes("primary")) {
    console.log("========== PRIMARY AGENT CALLED ==========");
    const primary = getAgent("primary");
    console.log("Calling primary translator...");

    responses.primary = await callAgent(
      primary,
      userMessage,
      {
        ...context,
        orchestration,
      },
      openaiClient
    );
  }

  // Call state manager if orchestrator says so
  if (agentsToCall.includes("state") && !responses.primary?.error) {
    const stateManager = getAgent("state");
    console.log("Calling state manager...");
    console.log("State manager agent info:", stateManager?.visual);

    // Pass the last question asked by the Translation Assistant
    let lastAssistantQuestion = null;
    for (let i = context.conversationHistory.length - 1; i >= 0; i--) {
      const msg = context.conversationHistory[i];
      if (msg.role === "assistant" && msg.agent?.id === "primary") {
        // Parse the message if it's JSON
        try {
          const parsed = JSON.parse(msg.content);
          lastAssistantQuestion = parsed.message || msg.content;
        } catch {
          lastAssistantQuestion = msg.content;
        }
        break;
      }
    }

    const stateResult = await callAgent(
      stateManager,
      userMessage,
      {
        ...context,
        primaryResponse: responses.primary?.response,
        resourceResponse: responses.resource?.response,
        lastAssistantQuestion,
        orchestration,
      },
      openaiClient
    );

    console.log("State result agent info:", stateResult?.agent);
    console.log("State response:", stateResult?.response);

    // Canvas Scribe should return JSON with:
    // { "message": "Noted!", "updates": {...}, "summary": "..." }
    // Or empty string to stay silent

    const responseText = stateResult.response.trim();

    // If empty response, scribe stays silent
    if (!responseText || responseText === "") {
      console.log("Canvas Scribe staying silent");
      // Don't add to responses
    }
    // Parse JSON response from Canvas Scribe
    else {
      try {
        const stateUpdates = JSON.parse(responseText);
        console.log("Canvas Scribe returned:", stateUpdates);

        // Apply state updates if present
        if (stateUpdates.updates && Object.keys(stateUpdates.updates).length > 0) {
          console.log("Applying state updates:", stateUpdates.updates);
          await updateCanvasState(stateUpdates.updates, "state");
        }

        // Show the message from JSON (e.g., "Noted!")
        if (stateUpdates.message) {
          responses.state = {
            ...stateResult,
            response: stateUpdates.message,
          };
        }
      } catch (e) {
        console.error("Error parsing Canvas Scribe JSON:", e);
        console.error("Raw response was:", responseText);
        // If JSON parsing fails, treat whole response as acknowledgment
        responses.state = {
          ...stateResult,
          response: responseText,
        };
      }
    }
  }

  // Temporarily disable validator and resource agents to simplify debugging
  // TODO: Re-enable these once basic flow is working

  /*
  // Call validator if in checking phase
  if (canvasState.workflow.currentPhase === 'checking' || 
      orchestration.agents?.includes('validator')) {
    const validator = getAgent('validator');
    if (validator) {
      responses.validator = await callAgent(validator, userMessage, {
        ...context,
        primaryResponse: responses.primary.response,
        stateUpdates: responses.state?.updates
      });

      // Parse validation results
      try {
        const validations = JSON.parse(responses.validator.response);
        responses.validator.validations = validations.validations;
        responses.validator.requiresResponse = validations.requiresResponse;
      } catch (e) {
        // Keep raw response if not JSON
      }
    }
  }

  // Call resource agent if needed
  if (orchestration.agents?.includes('resource')) {
    const resource = getAgent('resource');
    if (resource) {
      responses.resource = await callAgent(resource, userMessage, {
        ...context,
        primaryResponse: responses.primary.response
      });

      // Parse resource results
      try {
        const resources = JSON.parse(responses.resource.response);
        responses.resource.resources = resources.resources;
      } catch (e) {
        // Keep raw response if not JSON
      }
    }
  }
  */

  return responses;
}

/**
 * Merge agent responses into a coherent conversation response
 */
function mergeAgentResponses(responses) {
  const messages = [];
  let suggestions = []; // ALWAYS an array, never null

  // Include Canvas Scribe's conversational response FIRST if present
  // Canvas Scribe should return either just an acknowledgment or empty string
  if (
    responses.state &&
    !responses.state.error &&
    responses.state.response &&
    responses.state.response.trim() !== ""
  ) {
    // Canvas Scribe might return JSON with state update, extract just the acknowledgment
    let scribeMessage = responses.state.response;

    // Check if response contains JSON (state update)
    if (scribeMessage.includes("{") && scribeMessage.includes("}")) {
      // Extract just the acknowledgment part (before the JSON)
      const jsonStart = scribeMessage.indexOf("{");
      const acknowledgment = scribeMessage.substring(0, jsonStart).trim();
      if (acknowledgment && acknowledgment !== "") {
        scribeMessage = acknowledgment;
      } else {
        // No acknowledgment, just state update - stay silent
        console.log("Canvas Scribe updated state silently");
        scribeMessage = null;
      }
    }

    // Only add message if there's actual content to show
    if (scribeMessage && scribeMessage.trim() !== "") {
      console.log("Adding Canvas Scribe acknowledgment:", scribeMessage);
      messages.push({
        role: "assistant",
        content: scribeMessage,
        agent: responses.state.agent,
      });
    }
  } else if (responses.state && responses.state.response === "") {
    console.log("Canvas Scribe returned empty response (staying silent)");
  }

  // Include Resource Librarian SECOND (to present scripture before questions)
  // Orchestrator only calls them when needed, so if they responded, include it
  if (responses.resource && !responses.resource.error && responses.resource.response) {
    const resourceText = responses.resource.response.trim();
    // Skip truly empty responses including just quotes
    if (resourceText && resourceText !== '""' && resourceText !== "''") {
      console.log("Adding Resource Librarian message with agent:", responses.resource.agent);
      messages.push({
        role: "assistant",
        content: responses.resource.response,
        agent: responses.resource.agent,
      });
    } else {
      console.log("Resource Librarian returned empty response (staying silent)");
    }
  }

  // Handle Suggestion Helper response (extract suggestions, don't show as message)
  if (responses.suggestions && !responses.suggestions.error && responses.suggestions.response) {
    try {
      const suggestionsArray = JSON.parse(responses.suggestions.response);
      if (Array.isArray(suggestionsArray)) {
        suggestions = suggestionsArray;
        console.log("✅ Got suggestions from Suggestion Helper:", suggestions);
      }
    } catch (error) {
      console.log("⚠️ Suggestion Helper response wasn't valid JSON:", error.message);
    }
  }

  // Then include primary response (Translation Assistant)
  // Extract message and suggestions from JSON response
  if (responses.primary && !responses.primary.error && responses.primary.response) {
    console.log("\n=== PRIMARY AGENT RESPONSE ===");
    console.log("Raw:", responses.primary.response);

    let messageContent = responses.primary.response;

    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(responses.primary.response);
      console.log("Parsed as JSON:", parsed);

      // Extract message
      if (parsed.message) {
        messageContent = parsed.message;
        console.log("✅ Found message:", messageContent);
      }

      // Extract suggestions - MUST be an array (only if we don't already have suggestions)
      if (!suggestions || suggestions.length === 0) {
        if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
          suggestions = parsed.suggestions;
          console.log("✅ Found fallback suggestions from primary:", suggestions);
        } else if (parsed.suggestions) {
          // Suggestions exist but wrong format
          console.log("⚠️ Primary suggestions exist but not an array:", parsed.suggestions);
        } else {
          // No suggestions in response
          console.log("ℹ️ No suggestions from primary agent");
        }
      }
    } catch {
      console.log("⚠️ Not valid JSON, treating as plain text message");
      // Not JSON, use the raw response as the message
      // Keep existing suggestions if we have them from Suggestion Helper
    }

    messages.push({
      role: "assistant",
      content: messageContent,
      agent: responses.primary.agent,
    });
  }

  // Include validator warnings/errors if any
  if (responses.validator?.requiresResponse && responses.validator.validations) {
    const validationMessages = responses.validator.validations
      .filter((v) => v.type === "warning" || v.type === "error")
      .map((v) => `⚠️ **${v.category}**: ${v.message}`);

    if (validationMessages.length > 0) {
      messages.push({
        role: "system",
        content: validationMessages.join("\n"),
        agent: responses.validator.agent,
      });
    }
  }

  console.log("\n=== FINAL MERGE RESULTS ===");
  console.log("Total messages:", messages.length);
  console.log("Suggestions to send:", suggestions);
  console.log("================================\n");

  return { messages, suggestions };
}

/**
 * Netlify Function Handler
 */
const handler = async (req, context) => {
  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-ID",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers });
  }

  try {
    console.log("Conversation endpoint called");
    const { message, history = [] } = await req.json();
    console.log("Received message:", message);

    // Get session ID from headers
    const sessionId = req.headers["x-session-id"] || "default";
    console.log("Session ID from header:", sessionId);

    // Initialize OpenAI client with API key from Netlify environment
    const openai = new OpenAI({
      apiKey: context.env?.OPENAI_API_KEY,
    });

    // Process conversation with multiple agents
    const agentResponses = await processConversation(message, history, sessionId, openai);
    console.log("Got agent responses");
    console.log("Agent responses state info:", agentResponses.state?.agent); // Debug

    // Merge responses into coherent output
    const { messages, suggestions } = mergeAgentResponses(agentResponses);
    console.log("Merged messages");
    // Debug: Check if state message has correct agent info
    const stateMsg = messages.find((m) => m.content && m.content.includes("Got it"));
    console.log("State message agent info:", stateMsg?.agent);
    console.log("Quick suggestions:", suggestions);

    // Get updated canvas state
    const canvasState = await getCanvasState(sessionId);

    // Return response with agent attribution
    return new Response(
      JSON.stringify({
        messages,
        suggestions, // Include dynamic suggestions from agents
        agentResponses: Object.keys(agentResponses).reduce((acc, key) => {
          if (agentResponses[key] && !agentResponses[key].error) {
            acc[key] = {
              agent: agentResponses[key].agent,
              timestamp: agentResponses[key].timestamp,
            };
          }
          return acc;
        }, {}),
        canvasState,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Conversation error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process conversation",
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
