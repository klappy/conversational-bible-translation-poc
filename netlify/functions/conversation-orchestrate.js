/**
 * Agent Orchestration Endpoint
 * Determines which agents should respond and in what order
 * Returns immediately with sequence information
 */

import { OpenAI } from "openai";
import { getAgent } from "./agents/registry.js";
import { callAgent, buildAgentContext, getCorsHeaders, getSessionIdFromRequest } from "./agent-utils.js";

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
    console.log("Orchestrate endpoint called");
    const body = await req.json();
    const { message, sessionId: bodySessionId } = body;
    
    const sessionId = getSessionIdFromRequest(req, bodySessionId);
    console.log("Session ID:", sessionId);

    // Build context for orchestrator
    const agentContext = await buildAgentContext(message, sessionId);

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: context.env?.OPENAI_API_KEY,
    });

    // Call orchestrator to determine sequence
    const orchestrator = getAgent("orchestrator");
    console.log("Asking orchestrator which agents to activate...");
    
    const orchestratorResponse = await callAgent(orchestrator, message, agentContext, openai);

    let orchestration;
    try {
      orchestration = JSON.parse(orchestratorResponse.response);
      console.log("Orchestrator decided:", orchestration);
    } catch (error) {
      console.error("Orchestrator response was not valid JSON, using defaults:", error.message);
      orchestration = {
        agents: ["primary", "state"],
        notes: "Fallback to primary and state agents",
      };
    }

    // Build the sequence - order matters for user experience
    const sequence = [];
    
    // Resource Librarian first if needed (to present scripture)
    if (orchestration.agents?.includes("resource") || orchestration.agents?.includes("librarian")) {
      sequence.push("resource");
    }

    // State manager BEFORE primary (acknowledge user input first)
    if (orchestration.agents?.includes("state")) {
      sequence.push("state");
    }

    // Settings collector during planning
    if (orchestration.agents?.includes("settings_collector")) {
      sequence.push("settings_collector");
    }

    // Context guide during understanding
    if (orchestration.agents?.includes("context_guide")) {
      sequence.push("context_guide");
    }

    // Understanding guide for phrase exploration
    if (orchestration.agents?.includes("understanding_guide")) {
      sequence.push("understanding_guide");
    }

    // Draft builder during drafting
    if (orchestration.agents?.includes("draft_builder")) {
      sequence.push("draft_builder");
    }

    // Primary translator AFTER specialists
    if (orchestration.agents?.includes("primary")) {
      sequence.push("primary");
    }

    // Suggestions last (based on primary's latest question)
    if (orchestration.agents?.includes("suggestions")) {
      sequence.push("suggestions");
    }

    // Validator during checking phase
    if (orchestration.agents?.includes("validator")) {
      sequence.push("validator");
    }

    return new Response(
      JSON.stringify({
        sequence,
        orchestration,
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
    console.error("Orchestration error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to orchestrate",
        details: error.message,
        sequence: ["primary", "state"],
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

