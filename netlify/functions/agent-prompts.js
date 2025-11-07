import { agentRegistry } from "./agents/registry.js";

/**
 * Assistant Prompts API Endpoint
 * Exposes assistant configurations and system prompts for debugging/inspection
 */
export async function handler(event, context) {
  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Extract assistant data with prompts
    const agents = Object.entries(agentRegistry).map(([id, agent]) => ({
      id,
      name: agent.visual?.name || agent.role || id,
      role: agent.role,
      icon: agent.visual?.icon || "🤖",
      color: agent.visual?.color || "#666",
      model: agent.model,
      active: agent.active !== false,
      // Include the full system prompt
      systemPrompt: agent.systemPrompt || "No system prompt defined",
      // Add prompt stats
      promptStats: {
        length: agent.systemPrompt?.length || 0,
        lines: agent.systemPrompt?.split("\n").length || 0,
        sections: (agent.systemPrompt?.match(/—/g) || []).length,
        criticalSections: (agent.systemPrompt?.match(/🚨/g) || []).length,
      },
    }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        agents,
        totalAgents: agents.length,
        activeAgents: agents.filter((a) => a.active).length,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("Error fetching assistant prompts:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Failed to fetch assistant prompts",
        message: error.message,
      }),
    };
  }
}

