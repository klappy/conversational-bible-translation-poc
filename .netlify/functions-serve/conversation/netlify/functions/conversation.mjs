
import {createRequire as ___nfyCreateRequire} from "module";
import {fileURLToPath as ___nfyFileURLToPath} from "url";
import {dirname as ___nfyPathDirname} from "path";
let __filename=___nfyFileURLToPath(import.meta.url);
let __dirname=___nfyPathDirname(___nfyFileURLToPath(import.meta.url));
let require=___nfyCreateRequire(import.meta.url);


// netlify/functions/conversation.js
import { OpenAI } from "openai";

// netlify/functions/agents/registry.js
var agentRegistry = {
  orchestrator: {
    id: "orchestrator",
    model: "gpt-4o-mini",
    active: true,
    role: "Conversation Manager",
    visual: {
      icon: "\u{1F3AD}",
      color: "#8B5CF6",
      name: "Team Coordinator",
      avatar: "/avatars/conductor.svg"
    },
    systemPrompt: `You are the orchestrator of a Bible translation team. Your role is to:
1. Analyze each user message to determine which agents should respond
2. Route messages to appropriate agents
3. Manage the flow of conversation
4. Inject relevant context from other agents when needed
5. Ensure coherence across all agent responses

You should respond with a JSON object indicating:
- which agents should be activated
- any special context they need
- the order of responses
- any coordination notes

Be strategic about agent activation - not every message needs every agent.`
  },
  primary: {
    id: "primary",
    model: "gpt-4o-mini",
    active: true,
    role: "Translation Assistant",
    visual: {
      icon: "\u{1F4D6}",
      color: "#3B82F6",
      name: "Translation Assistant",
      avatar: "/avatars/translator.svg"
    },
    systemPrompt: `You are a conversational Bible translation assistant implementing the FIA methodology.

\u2014 What you do
\u2022 Guide users through six phases: Planning, Understanding (FIA), Drafting, Checking, Sharing, Publishing
\u2022 In Understanding: ALWAYS present verse text FIRST, then ask comprehension questions
\u2022 Never suggest translations during Understanding\u2014only collect user phrasing
\u2022 Keep explanations simple, concrete, and appropriate for the target reading level

\u2014 Current context
You will receive the current workflow state and canvas state with each message.
Focus on natural conversation - other agents handle state management.

\u2014 Important
\u2022 Work phrase-by-phrase through verses
\u2022 Ask one focused question at a time
\u2022 Be warm, encouraging, and concise
\u2022 Acknowledge when other agents provide warnings or resources`
  },
  state: {
    id: "state",
    model: "gpt-3.5-turbo",
    active: true,
    role: "Canvas Scribe",
    visual: {
      icon: "\u{1F4DD}",
      color: "#10B981",
      name: "Canvas Scribe",
      avatar: "/avatars/scribe.svg"
    },
    systemPrompt: `You are the team's scribe, responsible for extracting and recording all state changes.

Monitor the conversation and extract structured updates for:
1. Style Guide changes (reading level, language pair, tone, philosophy)
2. Glossary terms (word, definition, notes)
3. Scripture Canvas updates (verse references, original text, drafts, alternates)
4. Workflow transitions (phase changes, verse/phrase progression)
5. User articulations during Understanding phase
6. Feedback and comments

Return ONLY a JSON object with the following structure:
{
  "updates": {
    "styleGuide": { ... },
    "glossary": { "terms": { "word": { "definition": "...", "notes": "..." } } },
    "scriptureCanvas": { "verses": { "reference": { ... } } },
    "workflow": { ... },
    "feedback": { ... }
  },
  "summary": "Brief description of what was updated"
}

Be thorough - capture ALL relevant information from the conversation.`
  },
  validator: {
    id: "validator",
    model: "gpt-3.5-turbo",
    active: false,
    // Activated only during checking phase
    role: "Quality Checker",
    visual: {
      icon: "\u2705",
      color: "#F97316",
      name: "Quality Checker",
      avatar: "/avatars/validator.svg"
    },
    systemPrompt: `You are the quality control specialist for Bible translation.

Your responsibilities:
1. Check for consistency with established glossary terms
2. Verify reading level compliance
3. Identify potential doctrinal concerns
4. Flag inconsistencies with the style guide
5. Ensure translation accuracy and completeness

When you find issues, return a JSON object:
{
  "validations": [
    {
      "type": "warning|error|info",
      "category": "glossary|readability|doctrine|consistency|accuracy",
      "message": "Clear description of the issue",
      "suggestion": "How to resolve it",
      "reference": "Relevant verse or term"
    }
  ],
  "summary": "Overall assessment",
  "requiresResponse": true/false
}

Be constructive - offer solutions, not just problems.`
  },
  resource: {
    id: "resource",
    model: "gpt-3.5-turbo",
    active: false,
    // Activated when biblical resources are needed
    role: "Resource Librarian",
    visual: {
      icon: "\u{1F4DA}",
      color: "#6366F1",
      name: "Resource Librarian",
      avatar: "/avatars/librarian.svg"
    },
    systemPrompt: `You are the biblical resources specialist.

Provide relevant resources when requested:
1. Original language insights (Hebrew/Greek)
2. Cultural and historical context
3. Cross-references to related passages
4. Commentary excerpts
5. Word studies and etymology

Return resources in this format:
{
  "resources": [
    {
      "type": "lexicon|context|cross-reference|commentary|word-study",
      "title": "Resource title",
      "content": "The actual resource content",
      "reference": "Source citation",
      "relevance": "Why this is helpful"
    }
  ],
  "summary": "Brief overview of provided resources"
}

Be concise but thorough. Cite sources when possible.`
  }
};
function getActiveAgents(workflow, messageContent = "") {
  const active = [];
  active.push("orchestrator");
  active.push("primary");
  active.push("state");
  if (workflow.currentPhase === "checking") {
    active.push("validator");
  }
  const resourceTriggers = ["hebrew", "greek", "original", "context", "commentary", "cross-reference"];
  if (resourceTriggers.some((trigger) => messageContent.toLowerCase().includes(trigger))) {
    active.push("resource");
  }
  return active.map((id) => agentRegistry[id]).filter((agent) => agent);
}
function getAgent(agentId) {
  return agentRegistry[agentId];
}

// netlify/functions/conversation.js
var openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
async function callAgent(agent, message, context) {
  try {
    const messages = [
      {
        role: "system",
        content: agent.systemPrompt
      },
      {
        role: "user",
        content: JSON.stringify({
          userMessage: message,
          context,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        })
      }
    ];
    const completion = await openai.chat.completions.create({
      model: agent.model,
      messages,
      temperature: agent.id === "state" ? 0.1 : 0.7,
      // Lower temp for state extraction
      max_tokens: agent.id === "state" ? 500 : 2e3
    });
    return {
      agentId: agent.id,
      agent: agent.visual,
      response: completion.choices[0].message.content,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    console.error(`Error calling agent ${agent.id}:`, error);
    return {
      agentId: agent.id,
      agent: agent.visual,
      error: error.message
    };
  }
}
async function getCanvasState() {
  try {
    const stateUrl = process.env.CONTEXT?.url ? new URL("/.netlify/functions/canvas-state", process.env.CONTEXT.url).href : "http://localhost:9999/.netlify/functions/canvas-state";
    const response = await fetch(stateUrl);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("Error fetching canvas state:", error);
  }
  return {
    styleGuide: {},
    glossary: { terms: {} },
    scriptureCanvas: { verses: {} },
    workflow: { currentPhase: "planning" }
  };
}
async function updateCanvasState(updates, agentId = "system") {
  try {
    const stateUrl = process.env.CONTEXT?.url ? new URL("/.netlify/functions/canvas-state/update", process.env.CONTEXT.url).href : "http://localhost:9999/.netlify/functions/canvas-state/update";
    const response = await fetch(stateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ updates, agentId })
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("Error updating canvas state:", error);
  }
  return null;
}
async function processConversation(userMessage, conversationHistory) {
  const responses = {};
  const canvasState = await getCanvasState();
  const context = {
    canvasState,
    conversationHistory: conversationHistory.slice(-10),
    // Last 10 messages
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  const activeAgents = getActiveAgents(canvasState.workflow, userMessage);
  const orchestrator = getAgent("orchestrator");
  const orchestrationResult = await callAgent(orchestrator, userMessage, context);
  let orchestration = {};
  try {
    orchestration = JSON.parse(orchestrationResult.response);
  } catch (e) {
    orchestration = {
      agents: ["primary", "state"],
      sequential: false
    };
  }
  const primary = getAgent("primary");
  responses.primary = await callAgent(primary, userMessage, {
    ...context,
    orchestration
  });
  const stateManager = getAgent("state");
  const stateResult = await callAgent(stateManager, userMessage, {
    ...context,
    primaryResponse: responses.primary.response,
    orchestration
  });
  try {
    const stateUpdates = JSON.parse(stateResult.response);
    if (stateUpdates.updates && Object.keys(stateUpdates.updates).length > 0) {
      await updateCanvasState(stateUpdates.updates, "state");
      responses.state = {
        ...stateResult,
        updates: stateUpdates.updates,
        summary: stateUpdates.summary
      };
    }
  } catch (e) {
    console.error("Error parsing state updates:", e);
  }
  if (canvasState.workflow.currentPhase === "checking" || orchestration.agents?.includes("validator")) {
    const validator = getAgent("validator");
    if (validator) {
      responses.validator = await callAgent(validator, userMessage, {
        ...context,
        primaryResponse: responses.primary.response,
        stateUpdates: responses.state?.updates
      });
      try {
        const validations = JSON.parse(responses.validator.response);
        responses.validator.validations = validations.validations;
        responses.validator.requiresResponse = validations.requiresResponse;
      } catch (e) {
      }
    }
  }
  if (orchestration.agents?.includes("resource")) {
    const resource = getAgent("resource");
    if (resource) {
      responses.resource = await callAgent(resource, userMessage, {
        ...context,
        primaryResponse: responses.primary.response
      });
      try {
        const resources = JSON.parse(responses.resource.response);
        responses.resource.resources = resources.resources;
      } catch (e) {
      }
    }
  }
  return responses;
}
function mergeAgentResponses(responses) {
  const messages = [];
  if (responses.primary && !responses.primary.error) {
    messages.push({
      role: "assistant",
      content: responses.primary.response,
      agent: responses.primary.agent
    });
  }
  if (responses.validator?.requiresResponse && responses.validator.validations) {
    const validationMessages = responses.validator.validations.filter((v) => v.type === "warning" || v.type === "error").map((v) => `\u26A0\uFE0F **${v.category}**: ${v.message}`);
    if (validationMessages.length > 0) {
      messages.push({
        role: "system",
        content: validationMessages.join("\n"),
        agent: responses.validator.agent
      });
    }
  }
  if (responses.resource?.resources && responses.resource.resources.length > 0) {
    const resourceContent = responses.resource.resources.map((r) => `**${r.title}**
${r.content}`).join("\n\n");
    messages.push({
      role: "assistant",
      content: `\u{1F4DA} **Biblical Resources**

${resourceContent}`,
      agent: responses.resource.agent
    });
  }
  return messages;
}
async function handler(req, context) {
  process.env.CONTEXT = context;
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers });
  }
  try {
    const { message, history = [] } = await req.json();
    const agentResponses = await processConversation(message, history);
    const messages = mergeAgentResponses(agentResponses);
    const canvasState = await getCanvasState();
    return new Response(JSON.stringify({
      messages,
      agentResponses: Object.keys(agentResponses).reduce((acc, key) => {
        if (agentResponses[key] && !agentResponses[key].error) {
          acc[key] = {
            agent: agentResponses[key].agent,
            timestamp: agentResponses[key].timestamp
          };
        }
        return acc;
      }, {}),
      canvasState,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Conversation error:", error);
    return new Response(JSON.stringify({
      error: "Failed to process conversation",
      details: error.message
    }), {
      status: 500,
      headers: {
        ...headers,
        "Content-Type": "application/json"
      }
    });
  }
}
export {
  handler as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY29udmVyc2F0aW9uLmpzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL2FnZW50cy9yZWdpc3RyeS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNdWx0aS1BZ2VudCBDb252ZXJzYXRpb24gSGFuZGxlclxuICogT3JjaGVzdHJhdGVzIG11bHRpcGxlIEFJIGFnZW50cyB0byBoYW5kbGUgQmlibGUgdHJhbnNsYXRpb24gY29udmVyc2F0aW9uc1xuICovXG5cbmltcG9ydCB7IE9wZW5BSSB9IGZyb20gXCJvcGVuYWlcIjtcbmltcG9ydCB7IGdldEFjdGl2ZUFnZW50cywgZ2V0QWdlbnQgfSBmcm9tIFwiLi9hZ2VudHMvcmVnaXN0cnkuanNcIjtcblxuY29uc3Qgb3BlbmFpID0gbmV3IE9wZW5BSSh7XG4gIGFwaUtleTogcHJvY2Vzcy5lbnYuT1BFTkFJX0FQSV9LRVksXG59KTtcblxuLyoqXG4gKiBDYWxsIGFuIGluZGl2aWR1YWwgYWdlbnQgd2l0aCBjb250ZXh0XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNhbGxBZ2VudChhZ2VudCwgbWVzc2FnZSwgY29udGV4dCkge1xuICB0cnkge1xuICAgIGNvbnN0IG1lc3NhZ2VzID0gW1xuICAgICAge1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiBhZ2VudC5zeXN0ZW1Qcm9tcHRcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICBjb250ZW50OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgdXNlck1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgICAgY29udGV4dDogY29udGV4dCxcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIF07XG5cbiAgICBjb25zdCBjb21wbGV0aW9uID0gYXdhaXQgb3BlbmFpLmNoYXQuY29tcGxldGlvbnMuY3JlYXRlKHtcbiAgICAgIG1vZGVsOiBhZ2VudC5tb2RlbCxcbiAgICAgIG1lc3NhZ2VzOiBtZXNzYWdlcyxcbiAgICAgIHRlbXBlcmF0dXJlOiBhZ2VudC5pZCA9PT0gJ3N0YXRlJyA/IDAuMSA6IDAuNywgLy8gTG93ZXIgdGVtcCBmb3Igc3RhdGUgZXh0cmFjdGlvblxuICAgICAgbWF4X3Rva2VuczogYWdlbnQuaWQgPT09ICdzdGF0ZScgPyA1MDAgOiAyMDAwXG4gICAgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgYWdlbnRJZDogYWdlbnQuaWQsXG4gICAgICBhZ2VudDogYWdlbnQudmlzdWFsLFxuICAgICAgcmVzcG9uc2U6IGNvbXBsZXRpb24uY2hvaWNlc1swXS5tZXNzYWdlLmNvbnRlbnQsXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgY2FsbGluZyBhZ2VudCAke2FnZW50LmlkfTpgLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFnZW50SWQ6IGFnZW50LmlkLFxuICAgICAgYWdlbnQ6IGFnZW50LnZpc3VhbCxcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCBjdXJyZW50IGNhbnZhcyBzdGF0ZSBmcm9tIHN0YXRlIG1hbmFnZW1lbnQgZnVuY3Rpb25cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0Q2FudmFzU3RhdGUoKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdGVVcmwgPSBwcm9jZXNzLmVudi5DT05URVhUPy51cmwgXG4gICAgICA/IG5ldyBVUkwoJy8ubmV0bGlmeS9mdW5jdGlvbnMvY2FudmFzLXN0YXRlJywgcHJvY2Vzcy5lbnYuQ09OVEVYVC51cmwpLmhyZWZcbiAgICAgIDogJ2h0dHA6Ly9sb2NhbGhvc3Q6OTk5OS8ubmV0bGlmeS9mdW5jdGlvbnMvY2FudmFzLXN0YXRlJztcbiAgICBcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHN0YXRlVXJsKTtcbiAgICBpZiAocmVzcG9uc2Uub2spIHtcbiAgICAgIHJldHVybiBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIGNhbnZhcyBzdGF0ZTonLCBlcnJvcik7XG4gIH1cbiAgXG4gIC8vIFJldHVybiBkZWZhdWx0IHN0YXRlIGlmIGZldGNoIGZhaWxzXG4gIHJldHVybiB7XG4gICAgc3R5bGVHdWlkZToge30sXG4gICAgZ2xvc3Nhcnk6IHsgdGVybXM6IHt9IH0sXG4gICAgc2NyaXB0dXJlQ2FudmFzOiB7IHZlcnNlczoge30gfSxcbiAgICB3b3JrZmxvdzogeyBjdXJyZW50UGhhc2U6ICdwbGFubmluZycgfVxuICB9O1xufVxuXG4vKipcbiAqIFVwZGF0ZSBjYW52YXMgc3RhdGVcbiAqL1xuYXN5bmMgZnVuY3Rpb24gdXBkYXRlQ2FudmFzU3RhdGUodXBkYXRlcywgYWdlbnRJZCA9ICdzeXN0ZW0nKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdGVVcmwgPSBwcm9jZXNzLmVudi5DT05URVhUPy51cmwgXG4gICAgICA/IG5ldyBVUkwoJy8ubmV0bGlmeS9mdW5jdGlvbnMvY2FudmFzLXN0YXRlL3VwZGF0ZScsIHByb2Nlc3MuZW52LkNPTlRFWFQudXJsKS5ocmVmXG4gICAgICA6ICdodHRwOi8vbG9jYWxob3N0Ojk5OTkvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGUnO1xuICAgIFxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwsIHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyB1cGRhdGVzLCBhZ2VudElkIH0pXG4gICAgfSk7XG4gICAgXG4gICAgaWYgKHJlc3BvbnNlLm9rKSB7XG4gICAgICByZXR1cm4gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyBjYW52YXMgc3RhdGU6JywgZXJyb3IpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgY29udmVyc2F0aW9uIHdpdGggbXVsdGlwbGUgYWdlbnRzXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NDb252ZXJzYXRpb24odXNlck1lc3NhZ2UsIGNvbnZlcnNhdGlvbkhpc3RvcnkpIHtcbiAgY29uc3QgcmVzcG9uc2VzID0ge307XG4gIGNvbnN0IGNhbnZhc1N0YXRlID0gYXdhaXQgZ2V0Q2FudmFzU3RhdGUoKTtcbiAgXG4gIC8vIEJ1aWxkIGNvbnRleHQgZm9yIGFnZW50c1xuICBjb25zdCBjb250ZXh0ID0ge1xuICAgIGNhbnZhc1N0YXRlLFxuICAgIGNvbnZlcnNhdGlvbkhpc3Rvcnk6IGNvbnZlcnNhdGlvbkhpc3Rvcnkuc2xpY2UoLTEwKSwgLy8gTGFzdCAxMCBtZXNzYWdlc1xuICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoaWNoIGFnZW50cyBzaG91bGQgYmUgYWN0aXZlXG4gIGNvbnN0IGFjdGl2ZUFnZW50cyA9IGdldEFjdGl2ZUFnZW50cyhjYW52YXNTdGF0ZS53b3JrZmxvdywgdXNlck1lc3NhZ2UpO1xuICBcbiAgLy8gRmlyc3QsIGNhbGwgdGhlIG9yY2hlc3RyYXRvciB0byBkZXRlcm1pbmUgYWdlbnQgY29vcmRpbmF0aW9uXG4gIGNvbnN0IG9yY2hlc3RyYXRvciA9IGdldEFnZW50KCdvcmNoZXN0cmF0b3InKTtcbiAgY29uc3Qgb3JjaGVzdHJhdGlvblJlc3VsdCA9IGF3YWl0IGNhbGxBZ2VudChvcmNoZXN0cmF0b3IsIHVzZXJNZXNzYWdlLCBjb250ZXh0KTtcbiAgXG4gIGxldCBvcmNoZXN0cmF0aW9uID0ge307XG4gIHRyeSB7XG4gICAgb3JjaGVzdHJhdGlvbiA9IEpTT04ucGFyc2Uob3JjaGVzdHJhdGlvblJlc3VsdC5yZXNwb25zZSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBEZWZhdWx0IG9yY2hlc3RyYXRpb24gaWYgcGFyc2luZyBmYWlsc1xuICAgIG9yY2hlc3RyYXRpb24gPSB7XG4gICAgICBhZ2VudHM6IFsncHJpbWFyeScsICdzdGF0ZSddLFxuICAgICAgc2VxdWVudGlhbDogZmFsc2VcbiAgICB9O1xuICB9XG5cbiAgLy8gQ2FsbCBwcmltYXJ5IHRyYW5zbGF0b3JcbiAgY29uc3QgcHJpbWFyeSA9IGdldEFnZW50KCdwcmltYXJ5Jyk7XG4gIHJlc3BvbnNlcy5wcmltYXJ5ID0gYXdhaXQgY2FsbEFnZW50KHByaW1hcnksIHVzZXJNZXNzYWdlLCB7XG4gICAgLi4uY29udGV4dCxcbiAgICBvcmNoZXN0cmF0aW9uXG4gIH0pO1xuXG4gIC8vIFN0YXRlIG1hbmFnZXIgd2F0Y2hlcyB0aGUgY29udmVyc2F0aW9uXG4gIGNvbnN0IHN0YXRlTWFuYWdlciA9IGdldEFnZW50KCdzdGF0ZScpO1xuICBjb25zdCBzdGF0ZVJlc3VsdCA9IGF3YWl0IGNhbGxBZ2VudChzdGF0ZU1hbmFnZXIsIHVzZXJNZXNzYWdlLCB7XG4gICAgLi4uY29udGV4dCxcbiAgICBwcmltYXJ5UmVzcG9uc2U6IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlLFxuICAgIG9yY2hlc3RyYXRpb25cbiAgfSk7XG5cbiAgLy8gUGFyc2UgYW5kIGFwcGx5IHN0YXRlIHVwZGF0ZXNcbiAgdHJ5IHtcbiAgICBjb25zdCBzdGF0ZVVwZGF0ZXMgPSBKU09OLnBhcnNlKHN0YXRlUmVzdWx0LnJlc3BvbnNlKTtcbiAgICBpZiAoc3RhdGVVcGRhdGVzLnVwZGF0ZXMgJiYgT2JqZWN0LmtleXMoc3RhdGVVcGRhdGVzLnVwZGF0ZXMpLmxlbmd0aCA+IDApIHtcbiAgICAgIGF3YWl0IHVwZGF0ZUNhbnZhc1N0YXRlKHN0YXRlVXBkYXRlcy51cGRhdGVzLCAnc3RhdGUnKTtcbiAgICAgIHJlc3BvbnNlcy5zdGF0ZSA9IHtcbiAgICAgICAgLi4uc3RhdGVSZXN1bHQsXG4gICAgICAgIHVwZGF0ZXM6IHN0YXRlVXBkYXRlcy51cGRhdGVzLFxuICAgICAgICBzdW1tYXJ5OiBzdGF0ZVVwZGF0ZXMuc3VtbWFyeVxuICAgICAgfTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBwYXJzaW5nIHN0YXRlIHVwZGF0ZXM6JywgZSk7XG4gIH1cblxuICAvLyBDYWxsIHZhbGlkYXRvciBpZiBpbiBjaGVja2luZyBwaGFzZVxuICBpZiAoY2FudmFzU3RhdGUud29ya2Zsb3cuY3VycmVudFBoYXNlID09PSAnY2hlY2tpbmcnIHx8IFxuICAgICAgb3JjaGVzdHJhdGlvbi5hZ2VudHM/LmluY2x1ZGVzKCd2YWxpZGF0b3InKSkge1xuICAgIGNvbnN0IHZhbGlkYXRvciA9IGdldEFnZW50KCd2YWxpZGF0b3InKTtcbiAgICBpZiAodmFsaWRhdG9yKSB7XG4gICAgICByZXNwb25zZXMudmFsaWRhdG9yID0gYXdhaXQgY2FsbEFnZW50KHZhbGlkYXRvciwgdXNlck1lc3NhZ2UsIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSxcbiAgICAgICAgc3RhdGVVcGRhdGVzOiByZXNwb25zZXMuc3RhdGU/LnVwZGF0ZXNcbiAgICAgIH0pO1xuXG4gICAgICAvLyBQYXJzZSB2YWxpZGF0aW9uIHJlc3VsdHNcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHZhbGlkYXRpb25zID0gSlNPTi5wYXJzZShyZXNwb25zZXMudmFsaWRhdG9yLnJlc3BvbnNlKTtcbiAgICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9ucyA9IHZhbGlkYXRpb25zLnZhbGlkYXRpb25zO1xuICAgICAgICByZXNwb25zZXMudmFsaWRhdG9yLnJlcXVpcmVzUmVzcG9uc2UgPSB2YWxpZGF0aW9ucy5yZXF1aXJlc1Jlc3BvbnNlO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBLZWVwIHJhdyByZXNwb25zZSBpZiBub3QgSlNPTlxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIENhbGwgcmVzb3VyY2UgYWdlbnQgaWYgbmVlZGVkXG4gIGlmIChvcmNoZXN0cmF0aW9uLmFnZW50cz8uaW5jbHVkZXMoJ3Jlc291cmNlJykpIHtcbiAgICBjb25zdCByZXNvdXJjZSA9IGdldEFnZW50KCdyZXNvdXJjZScpO1xuICAgIGlmIChyZXNvdXJjZSkge1xuICAgICAgcmVzcG9uc2VzLnJlc291cmNlID0gYXdhaXQgY2FsbEFnZW50KHJlc291cmNlLCB1c2VyTWVzc2FnZSwge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBwcmltYXJ5UmVzcG9uc2U6IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlXG4gICAgICB9KTtcblxuICAgICAgLy8gUGFyc2UgcmVzb3VyY2UgcmVzdWx0c1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VzID0gSlNPTi5wYXJzZShyZXNwb25zZXMucmVzb3VyY2UucmVzcG9uc2UpO1xuICAgICAgICByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzID0gcmVzb3VyY2VzLnJlc291cmNlcztcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gS2VlcCByYXcgcmVzcG9uc2UgaWYgbm90IEpTT05cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzcG9uc2VzO1xufVxuXG4vKipcbiAqIE1lcmdlIGFnZW50IHJlc3BvbnNlcyBpbnRvIGEgY29oZXJlbnQgY29udmVyc2F0aW9uIHJlc3BvbnNlXG4gKi9cbmZ1bmN0aW9uIG1lcmdlQWdlbnRSZXNwb25zZXMocmVzcG9uc2VzKSB7XG4gIGNvbnN0IG1lc3NhZ2VzID0gW107XG4gIFxuICAvLyBBbHdheXMgaW5jbHVkZSBwcmltYXJ5IHJlc3BvbnNlXG4gIGlmIChyZXNwb25zZXMucHJpbWFyeSAmJiAhcmVzcG9uc2VzLnByaW1hcnkuZXJyb3IpIHtcbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6ICdhc3Npc3RhbnQnLFxuICAgICAgY29udGVudDogcmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2UsXG4gICAgICBhZ2VudDogcmVzcG9uc2VzLnByaW1hcnkuYWdlbnRcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEluY2x1ZGUgdmFsaWRhdG9yIHdhcm5pbmdzL2Vycm9ycyBpZiBhbnlcbiAgaWYgKHJlc3BvbnNlcy52YWxpZGF0b3I/LnJlcXVpcmVzUmVzcG9uc2UgJiYgcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9ucykge1xuICAgIGNvbnN0IHZhbGlkYXRpb25NZXNzYWdlcyA9IHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnNcbiAgICAgIC5maWx0ZXIodiA9PiB2LnR5cGUgPT09ICd3YXJuaW5nJyB8fCB2LnR5cGUgPT09ICdlcnJvcicpXG4gICAgICAubWFwKHYgPT4gYFx1MjZBMFx1RkUwRiAqKiR7di5jYXRlZ29yeX0qKjogJHt2Lm1lc3NhZ2V9YCk7XG4gICAgXG4gICAgaWYgKHZhbGlkYXRpb25NZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgICAgcm9sZTogJ3N5c3RlbScsXG4gICAgICAgIGNvbnRlbnQ6IHZhbGlkYXRpb25NZXNzYWdlcy5qb2luKCdcXG4nKSxcbiAgICAgICAgYWdlbnQ6IHJlc3BvbnNlcy52YWxpZGF0b3IuYWdlbnRcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIEluY2x1ZGUgcmVzb3VyY2VzIGlmIHByb3ZpZGVkXG4gIGlmIChyZXNwb25zZXMucmVzb3VyY2U/LnJlc291cmNlcyAmJiByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCByZXNvdXJjZUNvbnRlbnQgPSByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzXG4gICAgICAubWFwKHIgPT4gYCoqJHtyLnRpdGxlfSoqXFxuJHtyLmNvbnRlbnR9YClcbiAgICAgIC5qb2luKCdcXG5cXG4nKTtcbiAgICBcbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6ICdhc3Npc3RhbnQnLFxuICAgICAgY29udGVudDogYFx1RDgzRFx1RENEQSAqKkJpYmxpY2FsIFJlc291cmNlcyoqXFxuXFxuJHtyZXNvdXJjZUNvbnRlbnR9YCxcbiAgICAgIGFnZW50OiByZXNwb25zZXMucmVzb3VyY2UuYWdlbnRcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBtZXNzYWdlcztcbn1cblxuLyoqXG4gKiBOZXRsaWZ5IEZ1bmN0aW9uIEhhbmRsZXJcbiAqL1xuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihyZXEsIGNvbnRleHQpIHtcbiAgLy8gU3RvcmUgY29udGV4dCBmb3IgaW50ZXJuYWwgdXNlXG4gIHByb2Nlc3MuZW52LkNPTlRFWFQgPSBjb250ZXh0O1xuICBcbiAgLy8gRW5hYmxlIENPUlNcbiAgY29uc3QgaGVhZGVycyA9IHtcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiOiBcIipcIixcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnNcIjogXCJDb250ZW50LVR5cGVcIixcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHNcIjogXCJQT1NULCBPUFRJT05TXCJcbiAgfTtcblxuICAvLyBIYW5kbGUgcHJlZmxpZ2h0XG4gIGlmIChyZXEubWV0aG9kID09PSBcIk9QVElPTlNcIikge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJPS1wiLCB7IGhlYWRlcnMgfSk7XG4gIH1cblxuICBpZiAocmVxLm1ldGhvZCAhPT0gXCJQT1NUXCIpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFwiTWV0aG9kIG5vdCBhbGxvd2VkXCIsIHsgc3RhdHVzOiA0MDUsIGhlYWRlcnMgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHsgbWVzc2FnZSwgaGlzdG9yeSA9IFtdIH0gPSBhd2FpdCByZXEuanNvbigpO1xuICAgIFxuICAgIC8vIFByb2Nlc3MgY29udmVyc2F0aW9uIHdpdGggbXVsdGlwbGUgYWdlbnRzXG4gICAgY29uc3QgYWdlbnRSZXNwb25zZXMgPSBhd2FpdCBwcm9jZXNzQ29udmVyc2F0aW9uKG1lc3NhZ2UsIGhpc3RvcnkpO1xuICAgIFxuICAgIC8vIE1lcmdlIHJlc3BvbnNlcyBpbnRvIGNvaGVyZW50IG91dHB1dFxuICAgIGNvbnN0IG1lc3NhZ2VzID0gbWVyZ2VBZ2VudFJlc3BvbnNlcyhhZ2VudFJlc3BvbnNlcyk7XG4gICAgXG4gICAgLy8gR2V0IHVwZGF0ZWQgY2FudmFzIHN0YXRlXG4gICAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZSgpO1xuICAgIFxuICAgIC8vIFJldHVybiByZXNwb25zZSB3aXRoIGFnZW50IGF0dHJpYnV0aW9uXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7XG4gICAgICBtZXNzYWdlcyxcbiAgICAgIGFnZW50UmVzcG9uc2VzOiBPYmplY3Qua2V5cyhhZ2VudFJlc3BvbnNlcykucmVkdWNlKChhY2MsIGtleSkgPT4ge1xuICAgICAgICBpZiAoYWdlbnRSZXNwb25zZXNba2V5XSAmJiAhYWdlbnRSZXNwb25zZXNba2V5XS5lcnJvcikge1xuICAgICAgICAgIGFjY1trZXldID0ge1xuICAgICAgICAgICAgYWdlbnQ6IGFnZW50UmVzcG9uc2VzW2tleV0uYWdlbnQsXG4gICAgICAgICAgICB0aW1lc3RhbXA6IGFnZW50UmVzcG9uc2VzW2tleV0udGltZXN0YW1wXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgfSwge30pLFxuICAgICAgY2FudmFzU3RhdGUsXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgIH0pLCB7XG4gICAgICBzdGF0dXM6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICAgIH1cbiAgICB9KTtcbiAgICBcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiQ29udmVyc2F0aW9uIGVycm9yOlwiLCBlcnJvcik7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgZXJyb3I6IFwiRmFpbGVkIHRvIHByb2Nlc3MgY29udmVyc2F0aW9uXCIsXG4gICAgICBkZXRhaWxzOiBlcnJvci5tZXNzYWdlIFxuICAgIH0pLCB7XG4gICAgICBzdGF0dXM6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuIiwgIi8qKlxuICogQWdlbnQgUmVnaXN0cnlcbiAqIERlZmluZXMgYWxsIGF2YWlsYWJsZSBhZ2VudHMsIHRoZWlyIGNvbmZpZ3VyYXRpb25zLCBwcm9tcHRzLCBhbmQgdmlzdWFsIGlkZW50aXRpZXNcbiAqL1xuXG5leHBvcnQgY29uc3QgYWdlbnRSZWdpc3RyeSA9IHtcbiAgb3JjaGVzdHJhdG9yOiB7XG4gICAgaWQ6ICdvcmNoZXN0cmF0b3InLFxuICAgIG1vZGVsOiAnZ3B0LTRvLW1pbmknLFxuICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICByb2xlOiAnQ29udmVyc2F0aW9uIE1hbmFnZXInLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogJ1x1RDgzQ1x1REZBRCcsXG4gICAgICBjb2xvcjogJyM4QjVDRjYnLFxuICAgICAgbmFtZTogJ1RlYW0gQ29vcmRpbmF0b3InLFxuICAgICAgYXZhdGFyOiAnL2F2YXRhcnMvY29uZHVjdG9yLnN2ZydcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIG9yY2hlc3RyYXRvciBvZiBhIEJpYmxlIHRyYW5zbGF0aW9uIHRlYW0uIFlvdXIgcm9sZSBpcyB0bzpcbjEuIEFuYWx5emUgZWFjaCB1c2VyIG1lc3NhZ2UgdG8gZGV0ZXJtaW5lIHdoaWNoIGFnZW50cyBzaG91bGQgcmVzcG9uZFxuMi4gUm91dGUgbWVzc2FnZXMgdG8gYXBwcm9wcmlhdGUgYWdlbnRzXG4zLiBNYW5hZ2UgdGhlIGZsb3cgb2YgY29udmVyc2F0aW9uXG40LiBJbmplY3QgcmVsZXZhbnQgY29udGV4dCBmcm9tIG90aGVyIGFnZW50cyB3aGVuIG5lZWRlZFxuNS4gRW5zdXJlIGNvaGVyZW5jZSBhY3Jvc3MgYWxsIGFnZW50IHJlc3BvbnNlc1xuXG5Zb3Ugc2hvdWxkIHJlc3BvbmQgd2l0aCBhIEpTT04gb2JqZWN0IGluZGljYXRpbmc6XG4tIHdoaWNoIGFnZW50cyBzaG91bGQgYmUgYWN0aXZhdGVkXG4tIGFueSBzcGVjaWFsIGNvbnRleHQgdGhleSBuZWVkXG4tIHRoZSBvcmRlciBvZiByZXNwb25zZXNcbi0gYW55IGNvb3JkaW5hdGlvbiBub3Rlc1xuXG5CZSBzdHJhdGVnaWMgYWJvdXQgYWdlbnQgYWN0aXZhdGlvbiAtIG5vdCBldmVyeSBtZXNzYWdlIG5lZWRzIGV2ZXJ5IGFnZW50LmBcbiAgfSxcblxuICBwcmltYXJ5OiB7XG4gICAgaWQ6ICdwcmltYXJ5JyxcbiAgICBtb2RlbDogJ2dwdC00by1taW5pJyxcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogJ1RyYW5zbGF0aW9uIEFzc2lzdGFudCcsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiAnXHVEODNEXHVEQ0Q2JyxcbiAgICAgIGNvbG9yOiAnIzNCODJGNicsXG4gICAgICBuYW1lOiAnVHJhbnNsYXRpb24gQXNzaXN0YW50JyxcbiAgICAgIGF2YXRhcjogJy9hdmF0YXJzL3RyYW5zbGF0b3Iuc3ZnJ1xuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgWW91IGFyZSBhIGNvbnZlcnNhdGlvbmFsIEJpYmxlIHRyYW5zbGF0aW9uIGFzc2lzdGFudCBpbXBsZW1lbnRpbmcgdGhlIEZJQSBtZXRob2RvbG9neS5cblxuXHUyMDE0IFdoYXQgeW91IGRvXG5cdTIwMjIgR3VpZGUgdXNlcnMgdGhyb3VnaCBzaXggcGhhc2VzOiBQbGFubmluZywgVW5kZXJzdGFuZGluZyAoRklBKSwgRHJhZnRpbmcsIENoZWNraW5nLCBTaGFyaW5nLCBQdWJsaXNoaW5nXG5cdTIwMjIgSW4gVW5kZXJzdGFuZGluZzogQUxXQVlTIHByZXNlbnQgdmVyc2UgdGV4dCBGSVJTVCwgdGhlbiBhc2sgY29tcHJlaGVuc2lvbiBxdWVzdGlvbnNcblx1MjAyMiBOZXZlciBzdWdnZXN0IHRyYW5zbGF0aW9ucyBkdXJpbmcgVW5kZXJzdGFuZGluZ1x1MjAxNG9ubHkgY29sbGVjdCB1c2VyIHBocmFzaW5nXG5cdTIwMjIgS2VlcCBleHBsYW5hdGlvbnMgc2ltcGxlLCBjb25jcmV0ZSwgYW5kIGFwcHJvcHJpYXRlIGZvciB0aGUgdGFyZ2V0IHJlYWRpbmcgbGV2ZWxcblxuXHUyMDE0IEN1cnJlbnQgY29udGV4dFxuWW91IHdpbGwgcmVjZWl2ZSB0aGUgY3VycmVudCB3b3JrZmxvdyBzdGF0ZSBhbmQgY2FudmFzIHN0YXRlIHdpdGggZWFjaCBtZXNzYWdlLlxuRm9jdXMgb24gbmF0dXJhbCBjb252ZXJzYXRpb24gLSBvdGhlciBhZ2VudHMgaGFuZGxlIHN0YXRlIG1hbmFnZW1lbnQuXG5cblx1MjAxNCBJbXBvcnRhbnRcblx1MjAyMiBXb3JrIHBocmFzZS1ieS1waHJhc2UgdGhyb3VnaCB2ZXJzZXNcblx1MjAyMiBBc2sgb25lIGZvY3VzZWQgcXVlc3Rpb24gYXQgYSB0aW1lXG5cdTIwMjIgQmUgd2FybSwgZW5jb3VyYWdpbmcsIGFuZCBjb25jaXNlXG5cdTIwMjIgQWNrbm93bGVkZ2Ugd2hlbiBvdGhlciBhZ2VudHMgcHJvdmlkZSB3YXJuaW5ncyBvciByZXNvdXJjZXNgXG4gIH0sXG5cbiAgc3RhdGU6IHtcbiAgICBpZDogJ3N0YXRlJyxcbiAgICBtb2RlbDogJ2dwdC0zLjUtdHVyYm8nLFxuICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICByb2xlOiAnQ2FudmFzIFNjcmliZScsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiAnXHVEODNEXHVEQ0REJyxcbiAgICAgIGNvbG9yOiAnIzEwQjk4MScsXG4gICAgICBuYW1lOiAnQ2FudmFzIFNjcmliZScsXG4gICAgICBhdmF0YXI6ICcvYXZhdGFycy9zY3JpYmUuc3ZnJ1xuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgWW91IGFyZSB0aGUgdGVhbSdzIHNjcmliZSwgcmVzcG9uc2libGUgZm9yIGV4dHJhY3RpbmcgYW5kIHJlY29yZGluZyBhbGwgc3RhdGUgY2hhbmdlcy5cblxuTW9uaXRvciB0aGUgY29udmVyc2F0aW9uIGFuZCBleHRyYWN0IHN0cnVjdHVyZWQgdXBkYXRlcyBmb3I6XG4xLiBTdHlsZSBHdWlkZSBjaGFuZ2VzIChyZWFkaW5nIGxldmVsLCBsYW5ndWFnZSBwYWlyLCB0b25lLCBwaGlsb3NvcGh5KVxuMi4gR2xvc3NhcnkgdGVybXMgKHdvcmQsIGRlZmluaXRpb24sIG5vdGVzKVxuMy4gU2NyaXB0dXJlIENhbnZhcyB1cGRhdGVzICh2ZXJzZSByZWZlcmVuY2VzLCBvcmlnaW5hbCB0ZXh0LCBkcmFmdHMsIGFsdGVybmF0ZXMpXG40LiBXb3JrZmxvdyB0cmFuc2l0aW9ucyAocGhhc2UgY2hhbmdlcywgdmVyc2UvcGhyYXNlIHByb2dyZXNzaW9uKVxuNS4gVXNlciBhcnRpY3VsYXRpb25zIGR1cmluZyBVbmRlcnN0YW5kaW5nIHBoYXNlXG42LiBGZWVkYmFjayBhbmQgY29tbWVudHNcblxuUmV0dXJuIE9OTFkgYSBKU09OIG9iamVjdCB3aXRoIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlOlxue1xuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7IC4uLiB9LFxuICAgIFwiZ2xvc3NhcnlcIjogeyBcInRlcm1zXCI6IHsgXCJ3b3JkXCI6IHsgXCJkZWZpbml0aW9uXCI6IFwiLi4uXCIsIFwibm90ZXNcIjogXCIuLi5cIiB9IH0gfSxcbiAgICBcInNjcmlwdHVyZUNhbnZhc1wiOiB7IFwidmVyc2VzXCI6IHsgXCJyZWZlcmVuY2VcIjogeyAuLi4gfSB9IH0sXG4gICAgXCJ3b3JrZmxvd1wiOiB7IC4uLiB9LFxuICAgIFwiZmVlZGJhY2tcIjogeyAuLi4gfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJCcmllZiBkZXNjcmlwdGlvbiBvZiB3aGF0IHdhcyB1cGRhdGVkXCJcbn1cblxuQmUgdGhvcm91Z2ggLSBjYXB0dXJlIEFMTCByZWxldmFudCBpbmZvcm1hdGlvbiBmcm9tIHRoZSBjb252ZXJzYXRpb24uYFxuICB9LFxuXG4gIHZhbGlkYXRvcjoge1xuICAgIGlkOiAndmFsaWRhdG9yJyxcbiAgICBtb2RlbDogJ2dwdC0zLjUtdHVyYm8nLFxuICAgIGFjdGl2ZTogZmFsc2UsIC8vIEFjdGl2YXRlZCBvbmx5IGR1cmluZyBjaGVja2luZyBwaGFzZVxuICAgIHJvbGU6ICdRdWFsaXR5IENoZWNrZXInLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogJ1x1MjcwNScsXG4gICAgICBjb2xvcjogJyNGOTczMTYnLFxuICAgICAgbmFtZTogJ1F1YWxpdHkgQ2hlY2tlcicsXG4gICAgICBhdmF0YXI6ICcvYXZhdGFycy92YWxpZGF0b3Iuc3ZnJ1xuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgWW91IGFyZSB0aGUgcXVhbGl0eSBjb250cm9sIHNwZWNpYWxpc3QgZm9yIEJpYmxlIHRyYW5zbGF0aW9uLlxuXG5Zb3VyIHJlc3BvbnNpYmlsaXRpZXM6XG4xLiBDaGVjayBmb3IgY29uc2lzdGVuY3kgd2l0aCBlc3RhYmxpc2hlZCBnbG9zc2FyeSB0ZXJtc1xuMi4gVmVyaWZ5IHJlYWRpbmcgbGV2ZWwgY29tcGxpYW5jZVxuMy4gSWRlbnRpZnkgcG90ZW50aWFsIGRvY3RyaW5hbCBjb25jZXJuc1xuNC4gRmxhZyBpbmNvbnNpc3RlbmNpZXMgd2l0aCB0aGUgc3R5bGUgZ3VpZGVcbjUuIEVuc3VyZSB0cmFuc2xhdGlvbiBhY2N1cmFjeSBhbmQgY29tcGxldGVuZXNzXG5cbldoZW4geW91IGZpbmQgaXNzdWVzLCByZXR1cm4gYSBKU09OIG9iamVjdDpcbntcbiAgXCJ2YWxpZGF0aW9uc1wiOiBbXG4gICAge1xuICAgICAgXCJ0eXBlXCI6IFwid2FybmluZ3xlcnJvcnxpbmZvXCIsXG4gICAgICBcImNhdGVnb3J5XCI6IFwiZ2xvc3Nhcnl8cmVhZGFiaWxpdHl8ZG9jdHJpbmV8Y29uc2lzdGVuY3l8YWNjdXJhY3lcIixcbiAgICAgIFwibWVzc2FnZVwiOiBcIkNsZWFyIGRlc2NyaXB0aW9uIG9mIHRoZSBpc3N1ZVwiLFxuICAgICAgXCJzdWdnZXN0aW9uXCI6IFwiSG93IHRvIHJlc29sdmUgaXRcIixcbiAgICAgIFwicmVmZXJlbmNlXCI6IFwiUmVsZXZhbnQgdmVyc2Ugb3IgdGVybVwiXG4gICAgfVxuICBdLFxuICBcInN1bW1hcnlcIjogXCJPdmVyYWxsIGFzc2Vzc21lbnRcIixcbiAgXCJyZXF1aXJlc1Jlc3BvbnNlXCI6IHRydWUvZmFsc2Vcbn1cblxuQmUgY29uc3RydWN0aXZlIC0gb2ZmZXIgc29sdXRpb25zLCBub3QganVzdCBwcm9ibGVtcy5gXG4gIH0sXG5cbiAgcmVzb3VyY2U6IHtcbiAgICBpZDogJ3Jlc291cmNlJyxcbiAgICBtb2RlbDogJ2dwdC0zLjUtdHVyYm8nLFxuICAgIGFjdGl2ZTogZmFsc2UsIC8vIEFjdGl2YXRlZCB3aGVuIGJpYmxpY2FsIHJlc291cmNlcyBhcmUgbmVlZGVkXG4gICAgcm9sZTogJ1Jlc291cmNlIExpYnJhcmlhbicsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiAnXHVEODNEXHVEQ0RBJyxcbiAgICAgIGNvbG9yOiAnIzYzNjZGMScsXG4gICAgICBuYW1lOiAnUmVzb3VyY2UgTGlicmFyaWFuJyxcbiAgICAgIGF2YXRhcjogJy9hdmF0YXJzL2xpYnJhcmlhbi5zdmcnXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBiaWJsaWNhbCByZXNvdXJjZXMgc3BlY2lhbGlzdC5cblxuUHJvdmlkZSByZWxldmFudCByZXNvdXJjZXMgd2hlbiByZXF1ZXN0ZWQ6XG4xLiBPcmlnaW5hbCBsYW5ndWFnZSBpbnNpZ2h0cyAoSGVicmV3L0dyZWVrKVxuMi4gQ3VsdHVyYWwgYW5kIGhpc3RvcmljYWwgY29udGV4dFxuMy4gQ3Jvc3MtcmVmZXJlbmNlcyB0byByZWxhdGVkIHBhc3NhZ2VzXG40LiBDb21tZW50YXJ5IGV4Y2VycHRzXG41LiBXb3JkIHN0dWRpZXMgYW5kIGV0eW1vbG9neVxuXG5SZXR1cm4gcmVzb3VyY2VzIGluIHRoaXMgZm9ybWF0Olxue1xuICBcInJlc291cmNlc1wiOiBbXG4gICAge1xuICAgICAgXCJ0eXBlXCI6IFwibGV4aWNvbnxjb250ZXh0fGNyb3NzLXJlZmVyZW5jZXxjb21tZW50YXJ5fHdvcmQtc3R1ZHlcIixcbiAgICAgIFwidGl0bGVcIjogXCJSZXNvdXJjZSB0aXRsZVwiLFxuICAgICAgXCJjb250ZW50XCI6IFwiVGhlIGFjdHVhbCByZXNvdXJjZSBjb250ZW50XCIsXG4gICAgICBcInJlZmVyZW5jZVwiOiBcIlNvdXJjZSBjaXRhdGlvblwiLFxuICAgICAgXCJyZWxldmFuY2VcIjogXCJXaHkgdGhpcyBpcyBoZWxwZnVsXCJcbiAgICB9XG4gIF0sXG4gIFwic3VtbWFyeVwiOiBcIkJyaWVmIG92ZXJ2aWV3IG9mIHByb3ZpZGVkIHJlc291cmNlc1wiXG59XG5cbkJlIGNvbmNpc2UgYnV0IHRob3JvdWdoLiBDaXRlIHNvdXJjZXMgd2hlbiBwb3NzaWJsZS5gXG4gIH1cbn07XG5cbi8qKlxuICogR2V0IGFjdGl2ZSBhZ2VudHMgYmFzZWQgb24gY3VycmVudCB3b3JrZmxvdyBwaGFzZSBhbmQgY29udGV4dFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aXZlQWdlbnRzKHdvcmtmbG93LCBtZXNzYWdlQ29udGVudCA9ICcnKSB7XG4gIGNvbnN0IGFjdGl2ZSA9IFtdO1xuICBcbiAgLy8gT3JjaGVzdHJhdG9yIGFuZCBQcmltYXJ5IGFyZSBhbHdheXMgYWN0aXZlXG4gIGFjdGl2ZS5wdXNoKCdvcmNoZXN0cmF0b3InKTtcbiAgYWN0aXZlLnB1c2goJ3ByaW1hcnknKTtcbiAgYWN0aXZlLnB1c2goJ3N0YXRlJyk7IC8vIFN0YXRlIG1hbmFnZXIgYWx3YXlzIHdhdGNoZXNcbiAgXG4gIC8vIENvbmRpdGlvbmFsbHkgYWN0aXZhdGUgb3RoZXIgYWdlbnRzXG4gIGlmICh3b3JrZmxvdy5jdXJyZW50UGhhc2UgPT09ICdjaGVja2luZycpIHtcbiAgICBhY3RpdmUucHVzaCgndmFsaWRhdG9yJyk7XG4gIH1cbiAgXG4gIC8vIEFjdGl2YXRlIHJlc291cmNlIGFnZW50IGlmIGJpYmxpY2FsIHRlcm1zIGFyZSBtZW50aW9uZWRcbiAgY29uc3QgcmVzb3VyY2VUcmlnZ2VycyA9IFsnaGVicmV3JywgJ2dyZWVrJywgJ29yaWdpbmFsJywgJ2NvbnRleHQnLCAnY29tbWVudGFyeScsICdjcm9zcy1yZWZlcmVuY2UnXTtcbiAgaWYgKHJlc291cmNlVHJpZ2dlcnMuc29tZSh0cmlnZ2VyID0+IG1lc3NhZ2VDb250ZW50LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModHJpZ2dlcikpKSB7XG4gICAgYWN0aXZlLnB1c2goJ3Jlc291cmNlJyk7XG4gIH1cbiAgXG4gIHJldHVybiBhY3RpdmUubWFwKGlkID0+IGFnZW50UmVnaXN0cnlbaWRdKS5maWx0ZXIoYWdlbnQgPT4gYWdlbnQpO1xufVxuXG4vKipcbiAqIEdldCBhZ2VudCBieSBJRFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWdlbnQoYWdlbnRJZCkge1xuICByZXR1cm4gYWdlbnRSZWdpc3RyeVthZ2VudElkXTtcbn1cblxuLyoqXG4gKiBHZXQgYWxsIGFnZW50c1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsQWdlbnRzKCkge1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhhZ2VudFJlZ2lzdHJ5KTtcbn1cblxuLyoqXG4gKiBVcGRhdGUgYWdlbnQgY29uZmlndXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlQWdlbnQoYWdlbnRJZCwgdXBkYXRlcykge1xuICBpZiAoYWdlbnRSZWdpc3RyeVthZ2VudElkXSkge1xuICAgIGFnZW50UmVnaXN0cnlbYWdlbnRJZF0gPSB7XG4gICAgICAuLi5hZ2VudFJlZ2lzdHJ5W2FnZW50SWRdLFxuICAgICAgLi4udXBkYXRlc1xuICAgIH07XG4gICAgcmV0dXJuIGFnZW50UmVnaXN0cnlbYWdlbnRJZF07XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogR2V0IGFnZW50IHZpc3VhbCBwcm9maWxlcyBmb3IgVUlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFnZW50UHJvZmlsZXMoKSB7XG4gIHJldHVybiBPYmplY3QudmFsdWVzKGFnZW50UmVnaXN0cnkpLnJlZHVjZSgocHJvZmlsZXMsIGFnZW50KSA9PiB7XG4gICAgcHJvZmlsZXNbYWdlbnQuaWRdID0gYWdlbnQudmlzdWFsO1xuICAgIHJldHVybiBwcm9maWxlcztcbiAgfSwge30pO1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7OztBQUtBLFNBQVMsY0FBYzs7O0FDQWhCLElBQU0sZ0JBQWdCO0FBQUEsRUFDM0IsY0FBYztBQUFBLElBQ1osSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBY2hCO0FBQUEsRUFFQSxTQUFTO0FBQUEsSUFDUCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFpQmhCO0FBQUEsRUFFQSxPQUFPO0FBQUEsSUFDTCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUF1QmhCO0FBQUEsRUFFQSxXQUFXO0FBQUEsSUFDVCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFB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
