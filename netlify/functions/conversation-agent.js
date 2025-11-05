/**
 * Individual Agent Call Endpoint
 * Calls ONE agent at a time with context from previous agents
 * Returns immediately with that agent's response
 */

import { OpenAI } from "openai";
import { getAgent } from "./agents/registry.js";
import {
  callAgent,
  buildAgentContext,
  updateCanvasState,
  getCorsHeaders,
  getSessionIdFromRequest,
  generateUniqueId,
  parseStateResponse,
  getLastAssistantQuestion,
} from "./agent-utils.js";

const handler = async (req, context) => {
  const headers = getCorsHeaders();

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers });
  }

  try {
    console.log("Agent endpoint called");
    const body = await req.json();
    const {
      message,
      agentId,
      sessionId: bodySessionId,
      previousResponses = [],
    } = body;

    if (!agentId) {
      return new Response(
        JSON.stringify({ error: "agentId is required" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const sessionId = getSessionIdFromRequest(req, bodySessionId);
    console.log("Session ID:", sessionId);
    console.log("Calling agent:", agentId);

    // Build context including previous responses
    const agentContext = await buildAgentContext(message, sessionId, previousResponses);

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: context.env?.OPENAI_API_KEY,
    });

    // Get the agent
    const agent = getAgent(agentId);
    if (!agent) {
      return new Response(
        JSON.stringify({ error: `Unknown agent: ${agentId}` }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Enrich context with what previous agents said
    if (previousResponses && previousResponses.length > 0) {
      agentContext.previousResponses = previousResponses;

      // If this is a non-primary agent, add previous agent responses to context
      if (agentId !== "primary") {
        const primaryResponse = previousResponses.find((r) => r.agentId === "primary");
        if (primaryResponse) {
          agentContext.primaryResponse = primaryResponse.response;
        }
      }
    }

    // Call the agent
    console.log(`========== CALLING ${agentId.toUpperCase()} ==========`);
    let agentResponse = await callAgent(agent, message, agentContext, openai);

    // Handle state agent response specially
    if (agentId === "state" && !agentResponse.error) {
      const parsed = parseStateResponse(agentResponse.response);
      
      // If there are updates to save, save them now
      if (parsed.updates && Object.keys(parsed.updates).length > 0) {
        console.log("State agent provided updates, saving to canvas state");
        await updateCanvasState(parsed.updates, "state", sessionId);
        console.log("✅ State updates saved");
      }

      // Update response to only contain the acknowledgment message (if any)
      agentResponse.response = parsed.message || "";
    }

    // Handle suggestions agent response - extract JSON
    if (agentId === "suggestions" && !agentResponse.error) {
      try {
        const suggestions = JSON.parse(agentResponse.response);
        agentResponse.suggestions = Array.isArray(suggestions) ? suggestions : [];
      } catch (e) {
        console.log("Suggestions response wasn't valid JSON");
        agentResponse.suggestions = [];
      }
    }

    console.log(`Agent ${agentId} response ready for return`);

    return new Response(
      JSON.stringify({
        agentId,
        agent: agentResponse.agent,
        response: agentResponse.response,
        suggestions: agentResponse.suggestions || [],
        error: agentResponse.error || null,
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
    console.error("Agent call error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to call agent",
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

