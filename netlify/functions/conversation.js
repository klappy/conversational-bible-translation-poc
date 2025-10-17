/**
 * Multi-Agent Conversation Handler
 * Orchestrates multiple AI agents to handle Bible translation conversations
 */

import { OpenAI } from "openai";
import { getActiveAgents, getAgent } from "./agents/registry.js";

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
      {
        role: "user",
        content: JSON.stringify({
          userMessage: message,
          context: context,
          timestamp: new Date().toISOString(),
        }),
      },
    ];

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

  // Determine which agents should be active
  const activeAgents = getActiveAgents(canvasState.workflow, userMessage);
  console.log(
    "Active agents:",
    activeAgents.map((a) => a.id)
  );

  // Skip orchestrator for now - just use primary and state agents
  // This simplifies things and reduces API calls
  const orchestration = {
    agents: ["primary", "state"],
    sequential: false,
  };

  // Call primary translator
  const primary = getAgent("primary");
  console.log("Calling primary translator...");
  responses.primary = await callAgent(primary, userMessage, {
    ...context,
    orchestration,
  });

  // State manager watches the conversation (only if primary succeeded)
  if (!responses.primary.error) {
    const stateManager = getAgent("state");
    console.log("Calling state manager...");
    const stateResult = await callAgent(stateManager, userMessage, {
      ...context,
      primaryResponse: responses.primary.response,
      orchestration,
    });

    // Parse and apply state updates
    try {
      const stateUpdates = JSON.parse(stateResult.response);
      if (stateUpdates.updates && Object.keys(stateUpdates.updates).length > 0) {
        await updateCanvasState(stateUpdates.updates, "state");
        responses.state = {
          ...stateResult,
          updates: stateUpdates.updates,
          summary: stateUpdates.summary,
        };
      }
    } catch (e) {
      console.error("Error parsing state updates:", e);
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

  // Always include primary response
  if (responses.primary && !responses.primary.error) {
    messages.push({
      role: "assistant",
      content: responses.primary.response,
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

  // Include resources if provided
  if (responses.resource?.resources && responses.resource.resources.length > 0) {
    const resourceContent = responses.resource.resources
      .map((r) => `**${r.title}**\n${r.content}`)
      .join("\n\n");

    messages.push({
      role: "assistant",
      content: `📚 **Biblical Resources**\n\n${resourceContent}`,
      agent: responses.resource.agent,
    });
  }

  return messages;
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

    // Merge responses into coherent output
    const messages = mergeAgentResponses(agentResponses);
    console.log("Merged messages");

    // Get updated canvas state
    const canvasState = await getCanvasState();

    // Return response with agent attribution
    return new Response(
      JSON.stringify({
        messages,
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
