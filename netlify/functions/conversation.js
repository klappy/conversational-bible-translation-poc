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
      // Force JSON mode for agents that must return JSON objects
      // Note: suggestions agent returns an array, so it can't use JSON mode (which requires objects)
      ...((agent.id === "state" || agent.id === "primary" || agent.id === "orchestrator") && {
        response_format: { type: "json_object" },
      }),
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
    // In Netlify Functions, we need full localhost URL for internal calls
    const baseUrl = "http://localhost:8888";
    const stateUrl = `${baseUrl}/.netlify/functions/canvas-state`;

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
async function updateCanvasState(updates, agentId = "system", sessionId = "default") {
  try {
    // In Netlify Functions, we need full localhost URL for internal calls
    const baseUrl = "http://localhost:8888";
    const stateUrl = `${baseUrl}/.netlify/functions/canvas-state/update`;

    console.log("🔵 updateCanvasState called with:", JSON.stringify(updates, null, 2));
    console.log("🔵 Session ID:", sessionId);
    console.log("🔵 Sending to:", stateUrl);

    const payload = { updates, agentId };
    console.log("🔵 Payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(stateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-ID": sessionId, // ADD SESSION HEADER!
      },
      body: JSON.stringify(payload),
    });

    console.log("🔵 Update response status:", response.status);

    if (response.ok) {
      const result = await response.json();
      console.log("🔵 Update result:", JSON.stringify(result, null, 2));
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

    // Handle errors from state agent (timeouts, API failures, etc.)
    if (stateResult.error) {
      console.error("🔴 Canvas Scribe error:", stateResult.error);
      // Continue without state updates - don't crash the whole conversation
      // The state will stay as-is, which is better than crashing
    } else if (!stateResult.response) {
      console.warn("⚠️ Canvas Scribe returned no response");
      // Continue without state updates
    } else {
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
        // Canvas Scribe returns: "Noted!\n{JSON}" - extract the JSON part
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const stateUpdates = JSON.parse(jsonMatch[0]);
          console.log("Canvas Scribe returned:", stateUpdates);

          // Apply state updates if present
          if (stateUpdates.updates && Object.keys(stateUpdates.updates).length > 0) {
            console.log("Applying state updates:", stateUpdates.updates);
            await updateCanvasState(stateUpdates.updates, "state", sessionId);
            console.log("✅ State update completed");
          }

          // Show the message from JSON or extract from beginning of response
          const acknowledgment =
            stateUpdates.message ||
            responseText.substring(0, responseText.indexOf(jsonMatch[0])).trim();
          if (acknowledgment) {
            responses.state = {
              ...stateResult,
              response: acknowledgment,
            };
          }
        } else {
          // No JSON found - Canvas Scribe violated format!
          console.warn("⚠️ Canvas Scribe returned plain text instead of JSON!");
          console.warn("Raw response:", responseText);
          console.warn("This means state updates were NOT saved!");
          // Show the response but log the violation
          responses.state = {
            ...stateResult,
            response: responseText,
          };
        }
      } catch (e) {
        console.error("🔴 Error parsing Canvas Scribe JSON:", e);
        console.error("Raw response was:", responseText);
        // If JSON parsing fails, treat whole response as acknowledgment
        responses.state = {
          ...stateResult,
          response: responseText,
        };
      }
    }
    } // Close the else block from error handling
  }

  // NOW call Suggestion Helper AFTER we have the Primary Agent's response
  // Pass PRIMARY'S NEW QUESTION (not user's old answer) for contextual suggestions
  const suggestionAgent = getAgent("suggestions");
  if (suggestionAgent && responses.primary) {
    console.log("Calling Suggestion Helper for PRIMARY'S new question...");

    // Extract the question Primary just asked
    let primaryQuestion = responses.primary.response;
    try {
      const parsed = JSON.parse(responses.primary.response);
      primaryQuestion = parsed.message || responses.primary.response;
    } catch {
      // Not JSON, use raw response
    }

    // Pass PRIMARY'S question so suggestions match the CURRENT question
    responses.suggestions = await callAgent(
      suggestionAgent,
      primaryQuestion, // Changed from userMessage to primaryQuestion!
      {
        ...context,
        primaryResponse: responses.primary.response,
        orchestration,
      },
      openaiClient
    );
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
    } catch (error) {
      console.warn("⚠️ PRIMARY AGENT FORMAT VIOLATION: Not valid JSON!");
      console.warn("Raw response:", responses.primary.response.substring(0, 200));
      console.warn("Primary agent should ALWAYS return {\"message\": \"...\", \"suggestions\": [...]}");
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

    // Get session ID from headers (try both .get() and direct access)
    const sessionId = req.headers.get?.("x-session-id") || req.headers["x-session-id"] || "default";
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
