/**
 * Multi-Agent Conversation Handler
 * Orchestrates multiple AI agents to handle Bible translation conversations
 */

import { OpenAI } from "openai";
import { getAgent } from "./agents/registry.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Call an individual agent with context
 */
async function callAgent(agent, message, context) {
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

    // Add canvas state for primary agent to see what's been saved
    if (agent.id === "primary" && context.canvasState) {
      const saved = context.canvasState.styleGuide || {};
      const workflow = context.canvasState.workflow || {};
      const savedItems = [];
      if (saved.conversationLanguage)
        savedItems.push(`Conversation language: ${saved.conversationLanguage}`);
      if (saved.sourceLanguage) savedItems.push(`Source language: ${saved.sourceLanguage}`);
      if (saved.targetLanguage) savedItems.push(`Target language: ${saved.targetLanguage}`);
      if (saved.targetCommunity) savedItems.push(`Target community: ${saved.targetCommunity}`);
      if (saved.readingLevel) savedItems.push(`Reading level: ${saved.readingLevel}`);
      if (saved.tone) savedItems.push(`Tone: ${saved.tone}`);
      if (saved.approach) savedItems.push(`Approach: ${saved.approach}`);

      // Add current phase info
      const phaseInfo = `CURRENT PHASE: ${workflow.currentPhase || "planning"}
${
  workflow.currentPhase === "understanding"
    ? "⚠️ YOU ARE IN UNDERSTANDING PHASE - YOU MUST RETURN JSON!"
    : ""
}`;

      if (savedItems.length > 0) {
        messages.push({
          role: "system",
          content: `${phaseInfo}\n\nAlready collected information:\n${savedItems.join("\n")}`,
        });
      } else {
        messages.push({
          role: "system",
          content: phaseInfo,
        });
      }
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

    const completionPromise = openai.chat.completions.create({
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
async function getCanvasState() {
  try {
    const stateUrl = process.env.CONTEXT?.url
      ? new URL("/.netlify/functions/canvas-state", process.env.CONTEXT.url).href
      : "http://localhost:9999/.netlify/functions/canvas-state";

    const response = await fetch(stateUrl);
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
    const stateUrl = process.env.CONTEXT?.url
      ? new URL("/.netlify/functions/canvas-state/update", process.env.CONTEXT.url).href
      : "http://localhost:9999/.netlify/functions/canvas-state/update";

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
async function processConversation(userMessage, conversationHistory) {
  console.log("Starting processConversation with message:", userMessage);
  const responses = {};
  const canvasState = await getCanvasState();
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
  const orchestratorResponse = await callAgent(orchestrator, userMessage, context);

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
    responses.resource = await callAgent(resource, userMessage, {
      ...context,
      orchestration,
    });
    console.log("Resource librarian responded");
  }

  // Call primary translator if orchestrator says so
  if (agentsToCall.includes("primary")) {
    const primary = getAgent("primary");
    console.log("Calling primary translator...");
    responses.primary = await callAgent(primary, userMessage, {
      ...context,
      orchestration,
    });
  }

  // Call state manager if orchestrator says so
  if (agentsToCall.includes("state") && !responses.primary?.error) {
    const stateManager = getAgent("state");
    console.log("Calling state manager...");
    console.log("State manager agent info:", stateManager?.visual);
    const stateResult = await callAgent(stateManager, userMessage, {
      ...context,
      primaryResponse: responses.primary?.response,
      resourceResponse: responses.resource?.response,
      orchestration,
    });

    console.log("State result agent info:", stateResult?.agent);
    console.log("State response:", stateResult?.response);

    // Canvas Scribe should return either:
    // 1. Empty string (stay silent)
    // 2. Brief acknowledgment like "Noted!" or "Got it!"
    // 3. Acknowledgment + JSON state update (rare)

    const responseText = stateResult.response.trim();

    // If empty response, scribe stays silent
    if (!responseText || responseText === "") {
      console.log("Canvas Scribe staying silent");
      // Don't add to responses
    }
    // Check if response contains JSON (for state updates)
    else if (responseText.includes("{") && responseText.includes("}")) {
      try {
        // Extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}$/);
        if (jsonMatch) {
          const stateUpdates = JSON.parse(jsonMatch[0]);

          // Apply state updates if present
          if (stateUpdates.updates && Object.keys(stateUpdates.updates).length > 0) {
            await updateCanvasState(stateUpdates.updates, "state");
          }

          // Get the acknowledgment part (before JSON)
          const acknowledgment = responseText
            .substring(0, responseText.indexOf(jsonMatch[0]))
            .trim();

          // Only show acknowledgment if present
          if (acknowledgment) {
            responses.state = {
              ...stateResult,
              response: acknowledgment,
            };
          }
        }
      } catch (e) {
        console.error("Error parsing state JSON:", e);
        // If JSON parsing fails, treat whole response as acknowledgment
        responses.state = {
          ...stateResult,
          response: responseText,
        };
      }
    }
    // Simple acknowledgment (no JSON)
    else {
      console.log("Canvas Scribe simple acknowledgment:", responseText);
      responses.state = {
        ...stateResult,
        response: responseText,
      };
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

      // Extract suggestions - MUST be an array
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions;
        console.log("✅ Found suggestions array:", suggestions);
      } else if (parsed.suggestions) {
        // Suggestions exist but wrong format
        console.log("⚠️ Suggestions exist but not an array:", parsed.suggestions);
        suggestions = []; // Keep it as empty array
      } else {
        // No suggestions in response
        console.log("ℹ️ No suggestions in response");
        suggestions = []; // Keep it as empty array
      }
    } catch (error) {
      console.log("⚠️ Not valid JSON, treating as plain text message");
      // Not JSON, use the raw response as the message, no suggestions
      suggestions = [];
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
  // Store context for internal use
  process.env.CONTEXT = context;

  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
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

    // Process conversation with multiple agents
    const agentResponses = await processConversation(message, history);
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
    const canvasState = await getCanvasState();

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
