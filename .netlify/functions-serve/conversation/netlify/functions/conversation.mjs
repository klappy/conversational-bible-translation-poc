
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
var handler = async (req, context) => {
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
};
var conversation_default = handler;
export {
  conversation_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY29udmVyc2F0aW9uLmpzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL2FnZW50cy9yZWdpc3RyeS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNdWx0aS1BZ2VudCBDb252ZXJzYXRpb24gSGFuZGxlclxuICogT3JjaGVzdHJhdGVzIG11bHRpcGxlIEFJIGFnZW50cyB0byBoYW5kbGUgQmlibGUgdHJhbnNsYXRpb24gY29udmVyc2F0aW9uc1xuICovXG5cbmltcG9ydCB7IE9wZW5BSSB9IGZyb20gXCJvcGVuYWlcIjtcbmltcG9ydCB7IGdldEFjdGl2ZUFnZW50cywgZ2V0QWdlbnQgfSBmcm9tIFwiLi9hZ2VudHMvcmVnaXN0cnkuanNcIjtcblxuY29uc3Qgb3BlbmFpID0gbmV3IE9wZW5BSSh7XG4gIGFwaUtleTogcHJvY2Vzcy5lbnYuT1BFTkFJX0FQSV9LRVksXG59KTtcblxuLyoqXG4gKiBDYWxsIGFuIGluZGl2aWR1YWwgYWdlbnQgd2l0aCBjb250ZXh0XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNhbGxBZ2VudChhZ2VudCwgbWVzc2FnZSwgY29udGV4dCkge1xuICB0cnkge1xuICAgIGNvbnN0IG1lc3NhZ2VzID0gW1xuICAgICAge1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiBhZ2VudC5zeXN0ZW1Qcm9tcHRcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICBjb250ZW50OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgdXNlck1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgICAgY29udGV4dDogY29udGV4dCxcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIF07XG5cbiAgICBjb25zdCBjb21wbGV0aW9uID0gYXdhaXQgb3BlbmFpLmNoYXQuY29tcGxldGlvbnMuY3JlYXRlKHtcbiAgICAgIG1vZGVsOiBhZ2VudC5tb2RlbCxcbiAgICAgIG1lc3NhZ2VzOiBtZXNzYWdlcyxcbiAgICAgIHRlbXBlcmF0dXJlOiBhZ2VudC5pZCA9PT0gJ3N0YXRlJyA/IDAuMSA6IDAuNywgLy8gTG93ZXIgdGVtcCBmb3Igc3RhdGUgZXh0cmFjdGlvblxuICAgICAgbWF4X3Rva2VuczogYWdlbnQuaWQgPT09ICdzdGF0ZScgPyA1MDAgOiAyMDAwXG4gICAgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgYWdlbnRJZDogYWdlbnQuaWQsXG4gICAgICBhZ2VudDogYWdlbnQudmlzdWFsLFxuICAgICAgcmVzcG9uc2U6IGNvbXBsZXRpb24uY2hvaWNlc1swXS5tZXNzYWdlLmNvbnRlbnQsXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgY2FsbGluZyBhZ2VudCAke2FnZW50LmlkfTpgLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFnZW50SWQ6IGFnZW50LmlkLFxuICAgICAgYWdlbnQ6IGFnZW50LnZpc3VhbCxcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCBjdXJyZW50IGNhbnZhcyBzdGF0ZSBmcm9tIHN0YXRlIG1hbmFnZW1lbnQgZnVuY3Rpb25cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0Q2FudmFzU3RhdGUoKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdGVVcmwgPSBwcm9jZXNzLmVudi5DT05URVhUPy51cmwgXG4gICAgICA/IG5ldyBVUkwoJy8ubmV0bGlmeS9mdW5jdGlvbnMvY2FudmFzLXN0YXRlJywgcHJvY2Vzcy5lbnYuQ09OVEVYVC51cmwpLmhyZWZcbiAgICAgIDogJ2h0dHA6Ly9sb2NhbGhvc3Q6OTk5OS8ubmV0bGlmeS9mdW5jdGlvbnMvY2FudmFzLXN0YXRlJztcbiAgICBcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHN0YXRlVXJsKTtcbiAgICBpZiAocmVzcG9uc2Uub2spIHtcbiAgICAgIHJldHVybiBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIGNhbnZhcyBzdGF0ZTonLCBlcnJvcik7XG4gIH1cbiAgXG4gIC8vIFJldHVybiBkZWZhdWx0IHN0YXRlIGlmIGZldGNoIGZhaWxzXG4gIHJldHVybiB7XG4gICAgc3R5bGVHdWlkZToge30sXG4gICAgZ2xvc3Nhcnk6IHsgdGVybXM6IHt9IH0sXG4gICAgc2NyaXB0dXJlQ2FudmFzOiB7IHZlcnNlczoge30gfSxcbiAgICB3b3JrZmxvdzogeyBjdXJyZW50UGhhc2U6ICdwbGFubmluZycgfVxuICB9O1xufVxuXG4vKipcbiAqIFVwZGF0ZSBjYW52YXMgc3RhdGVcbiAqL1xuYXN5bmMgZnVuY3Rpb24gdXBkYXRlQ2FudmFzU3RhdGUodXBkYXRlcywgYWdlbnRJZCA9ICdzeXN0ZW0nKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdGVVcmwgPSBwcm9jZXNzLmVudi5DT05URVhUPy51cmwgXG4gICAgICA/IG5ldyBVUkwoJy8ubmV0bGlmeS9mdW5jdGlvbnMvY2FudmFzLXN0YXRlL3VwZGF0ZScsIHByb2Nlc3MuZW52LkNPTlRFWFQudXJsKS5ocmVmXG4gICAgICA6ICdodHRwOi8vbG9jYWxob3N0Ojk5OTkvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGUnO1xuICAgIFxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwsIHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyB1cGRhdGVzLCBhZ2VudElkIH0pXG4gICAgfSk7XG4gICAgXG4gICAgaWYgKHJlc3BvbnNlLm9rKSB7XG4gICAgICByZXR1cm4gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyBjYW52YXMgc3RhdGU6JywgZXJyb3IpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgY29udmVyc2F0aW9uIHdpdGggbXVsdGlwbGUgYWdlbnRzXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NDb252ZXJzYXRpb24odXNlck1lc3NhZ2UsIGNvbnZlcnNhdGlvbkhpc3RvcnkpIHtcbiAgY29uc3QgcmVzcG9uc2VzID0ge307XG4gIGNvbnN0IGNhbnZhc1N0YXRlID0gYXdhaXQgZ2V0Q2FudmFzU3RhdGUoKTtcbiAgXG4gIC8vIEJ1aWxkIGNvbnRleHQgZm9yIGFnZW50c1xuICBjb25zdCBjb250ZXh0ID0ge1xuICAgIGNhbnZhc1N0YXRlLFxuICAgIGNvbnZlcnNhdGlvbkhpc3Rvcnk6IGNvbnZlcnNhdGlvbkhpc3Rvcnkuc2xpY2UoLTEwKSwgLy8gTGFzdCAxMCBtZXNzYWdlc1xuICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoaWNoIGFnZW50cyBzaG91bGQgYmUgYWN0aXZlXG4gIGNvbnN0IGFjdGl2ZUFnZW50cyA9IGdldEFjdGl2ZUFnZW50cyhjYW52YXNTdGF0ZS53b3JrZmxvdywgdXNlck1lc3NhZ2UpO1xuICBcbiAgLy8gRmlyc3QsIGNhbGwgdGhlIG9yY2hlc3RyYXRvciB0byBkZXRlcm1pbmUgYWdlbnQgY29vcmRpbmF0aW9uXG4gIGNvbnN0IG9yY2hlc3RyYXRvciA9IGdldEFnZW50KCdvcmNoZXN0cmF0b3InKTtcbiAgY29uc3Qgb3JjaGVzdHJhdGlvblJlc3VsdCA9IGF3YWl0IGNhbGxBZ2VudChvcmNoZXN0cmF0b3IsIHVzZXJNZXNzYWdlLCBjb250ZXh0KTtcbiAgXG4gIGxldCBvcmNoZXN0cmF0aW9uID0ge307XG4gIHRyeSB7XG4gICAgb3JjaGVzdHJhdGlvbiA9IEpTT04ucGFyc2Uob3JjaGVzdHJhdGlvblJlc3VsdC5yZXNwb25zZSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBEZWZhdWx0IG9yY2hlc3RyYXRpb24gaWYgcGFyc2luZyBmYWlsc1xuICAgIG9yY2hlc3RyYXRpb24gPSB7XG4gICAgICBhZ2VudHM6IFsncHJpbWFyeScsICdzdGF0ZSddLFxuICAgICAgc2VxdWVudGlhbDogZmFsc2VcbiAgICB9O1xuICB9XG5cbiAgLy8gQ2FsbCBwcmltYXJ5IHRyYW5zbGF0b3JcbiAgY29uc3QgcHJpbWFyeSA9IGdldEFnZW50KCdwcmltYXJ5Jyk7XG4gIHJlc3BvbnNlcy5wcmltYXJ5ID0gYXdhaXQgY2FsbEFnZW50KHByaW1hcnksIHVzZXJNZXNzYWdlLCB7XG4gICAgLi4uY29udGV4dCxcbiAgICBvcmNoZXN0cmF0aW9uXG4gIH0pO1xuXG4gIC8vIFN0YXRlIG1hbmFnZXIgd2F0Y2hlcyB0aGUgY29udmVyc2F0aW9uXG4gIGNvbnN0IHN0YXRlTWFuYWdlciA9IGdldEFnZW50KCdzdGF0ZScpO1xuICBjb25zdCBzdGF0ZVJlc3VsdCA9IGF3YWl0IGNhbGxBZ2VudChzdGF0ZU1hbmFnZXIsIHVzZXJNZXNzYWdlLCB7XG4gICAgLi4uY29udGV4dCxcbiAgICBwcmltYXJ5UmVzcG9uc2U6IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlLFxuICAgIG9yY2hlc3RyYXRpb25cbiAgfSk7XG5cbiAgLy8gUGFyc2UgYW5kIGFwcGx5IHN0YXRlIHVwZGF0ZXNcbiAgdHJ5IHtcbiAgICBjb25zdCBzdGF0ZVVwZGF0ZXMgPSBKU09OLnBhcnNlKHN0YXRlUmVzdWx0LnJlc3BvbnNlKTtcbiAgICBpZiAoc3RhdGVVcGRhdGVzLnVwZGF0ZXMgJiYgT2JqZWN0LmtleXMoc3RhdGVVcGRhdGVzLnVwZGF0ZXMpLmxlbmd0aCA+IDApIHtcbiAgICAgIGF3YWl0IHVwZGF0ZUNhbnZhc1N0YXRlKHN0YXRlVXBkYXRlcy51cGRhdGVzLCAnc3RhdGUnKTtcbiAgICAgIHJlc3BvbnNlcy5zdGF0ZSA9IHtcbiAgICAgICAgLi4uc3RhdGVSZXN1bHQsXG4gICAgICAgIHVwZGF0ZXM6IHN0YXRlVXBkYXRlcy51cGRhdGVzLFxuICAgICAgICBzdW1tYXJ5OiBzdGF0ZVVwZGF0ZXMuc3VtbWFyeVxuICAgICAgfTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBwYXJzaW5nIHN0YXRlIHVwZGF0ZXM6JywgZSk7XG4gIH1cblxuICAvLyBDYWxsIHZhbGlkYXRvciBpZiBpbiBjaGVja2luZyBwaGFzZVxuICBpZiAoY2FudmFzU3RhdGUud29ya2Zsb3cuY3VycmVudFBoYXNlID09PSAnY2hlY2tpbmcnIHx8IFxuICAgICAgb3JjaGVzdHJhdGlvbi5hZ2VudHM/LmluY2x1ZGVzKCd2YWxpZGF0b3InKSkge1xuICAgIGNvbnN0IHZhbGlkYXRvciA9IGdldEFnZW50KCd2YWxpZGF0b3InKTtcbiAgICBpZiAodmFsaWRhdG9yKSB7XG4gICAgICByZXNwb25zZXMudmFsaWRhdG9yID0gYXdhaXQgY2FsbEFnZW50KHZhbGlkYXRvciwgdXNlck1lc3NhZ2UsIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSxcbiAgICAgICAgc3RhdGVVcGRhdGVzOiByZXNwb25zZXMuc3RhdGU/LnVwZGF0ZXNcbiAgICAgIH0pO1xuXG4gICAgICAvLyBQYXJzZSB2YWxpZGF0aW9uIHJlc3VsdHNcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHZhbGlkYXRpb25zID0gSlNPTi5wYXJzZShyZXNwb25zZXMudmFsaWRhdG9yLnJlc3BvbnNlKTtcbiAgICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9ucyA9IHZhbGlkYXRpb25zLnZhbGlkYXRpb25zO1xuICAgICAgICByZXNwb25zZXMudmFsaWRhdG9yLnJlcXVpcmVzUmVzcG9uc2UgPSB2YWxpZGF0aW9ucy5yZXF1aXJlc1Jlc3BvbnNlO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBLZWVwIHJhdyByZXNwb25zZSBpZiBub3QgSlNPTlxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIENhbGwgcmVzb3VyY2UgYWdlbnQgaWYgbmVlZGVkXG4gIGlmIChvcmNoZXN0cmF0aW9uLmFnZW50cz8uaW5jbHVkZXMoJ3Jlc291cmNlJykpIHtcbiAgICBjb25zdCByZXNvdXJjZSA9IGdldEFnZW50KCdyZXNvdXJjZScpO1xuICAgIGlmIChyZXNvdXJjZSkge1xuICAgICAgcmVzcG9uc2VzLnJlc291cmNlID0gYXdhaXQgY2FsbEFnZW50KHJlc291cmNlLCB1c2VyTWVzc2FnZSwge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBwcmltYXJ5UmVzcG9uc2U6IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlXG4gICAgICB9KTtcblxuICAgICAgLy8gUGFyc2UgcmVzb3VyY2UgcmVzdWx0c1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VzID0gSlNPTi5wYXJzZShyZXNwb25zZXMucmVzb3VyY2UucmVzcG9uc2UpO1xuICAgICAgICByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzID0gcmVzb3VyY2VzLnJlc291cmNlcztcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gS2VlcCByYXcgcmVzcG9uc2UgaWYgbm90IEpTT05cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzcG9uc2VzO1xufVxuXG4vKipcbiAqIE1lcmdlIGFnZW50IHJlc3BvbnNlcyBpbnRvIGEgY29oZXJlbnQgY29udmVyc2F0aW9uIHJlc3BvbnNlXG4gKi9cbmZ1bmN0aW9uIG1lcmdlQWdlbnRSZXNwb25zZXMocmVzcG9uc2VzKSB7XG4gIGNvbnN0IG1lc3NhZ2VzID0gW107XG4gIFxuICAvLyBBbHdheXMgaW5jbHVkZSBwcmltYXJ5IHJlc3BvbnNlXG4gIGlmIChyZXNwb25zZXMucHJpbWFyeSAmJiAhcmVzcG9uc2VzLnByaW1hcnkuZXJyb3IpIHtcbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6ICdhc3Npc3RhbnQnLFxuICAgICAgY29udGVudDogcmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2UsXG4gICAgICBhZ2VudDogcmVzcG9uc2VzLnByaW1hcnkuYWdlbnRcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEluY2x1ZGUgdmFsaWRhdG9yIHdhcm5pbmdzL2Vycm9ycyBpZiBhbnlcbiAgaWYgKHJlc3BvbnNlcy52YWxpZGF0b3I/LnJlcXVpcmVzUmVzcG9uc2UgJiYgcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9ucykge1xuICAgIGNvbnN0IHZhbGlkYXRpb25NZXNzYWdlcyA9IHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnNcbiAgICAgIC5maWx0ZXIodiA9PiB2LnR5cGUgPT09ICd3YXJuaW5nJyB8fCB2LnR5cGUgPT09ICdlcnJvcicpXG4gICAgICAubWFwKHYgPT4gYFx1MjZBMFx1RkUwRiAqKiR7di5jYXRlZ29yeX0qKjogJHt2Lm1lc3NhZ2V9YCk7XG4gICAgXG4gICAgaWYgKHZhbGlkYXRpb25NZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgICAgcm9sZTogJ3N5c3RlbScsXG4gICAgICAgIGNvbnRlbnQ6IHZhbGlkYXRpb25NZXNzYWdlcy5qb2luKCdcXG4nKSxcbiAgICAgICAgYWdlbnQ6IHJlc3BvbnNlcy52YWxpZGF0b3IuYWdlbnRcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIEluY2x1ZGUgcmVzb3VyY2VzIGlmIHByb3ZpZGVkXG4gIGlmIChyZXNwb25zZXMucmVzb3VyY2U/LnJlc291cmNlcyAmJiByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCByZXNvdXJjZUNvbnRlbnQgPSByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzXG4gICAgICAubWFwKHIgPT4gYCoqJHtyLnRpdGxlfSoqXFxuJHtyLmNvbnRlbnR9YClcbiAgICAgIC5qb2luKCdcXG5cXG4nKTtcbiAgICBcbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6ICdhc3Npc3RhbnQnLFxuICAgICAgY29udGVudDogYFx1RDgzRFx1RENEQSAqKkJpYmxpY2FsIFJlc291cmNlcyoqXFxuXFxuJHtyZXNvdXJjZUNvbnRlbnR9YCxcbiAgICAgIGFnZW50OiByZXNwb25zZXMucmVzb3VyY2UuYWdlbnRcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBtZXNzYWdlcztcbn1cblxuLyoqXG4gKiBOZXRsaWZ5IEZ1bmN0aW9uIEhhbmRsZXJcbiAqL1xuY29uc3QgaGFuZGxlciA9IGFzeW5jIChyZXEsIGNvbnRleHQpID0+IHtcbiAgLy8gU3RvcmUgY29udGV4dCBmb3IgaW50ZXJuYWwgdXNlXG4gIHByb2Nlc3MuZW52LkNPTlRFWFQgPSBjb250ZXh0O1xuICBcbiAgLy8gRW5hYmxlIENPUlNcbiAgY29uc3QgaGVhZGVycyA9IHtcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiOiBcIipcIixcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnNcIjogXCJDb250ZW50LVR5cGVcIixcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHNcIjogXCJQT1NULCBPUFRJT05TXCJcbiAgfTtcblxuICAvLyBIYW5kbGUgcHJlZmxpZ2h0XG4gIGlmIChyZXEubWV0aG9kID09PSBcIk9QVElPTlNcIikge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJPS1wiLCB7IGhlYWRlcnMgfSk7XG4gIH1cblxuICBpZiAocmVxLm1ldGhvZCAhPT0gXCJQT1NUXCIpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFwiTWV0aG9kIG5vdCBhbGxvd2VkXCIsIHsgc3RhdHVzOiA0MDUsIGhlYWRlcnMgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHsgbWVzc2FnZSwgaGlzdG9yeSA9IFtdIH0gPSBhd2FpdCByZXEuanNvbigpO1xuICAgIFxuICAgIC8vIFByb2Nlc3MgY29udmVyc2F0aW9uIHdpdGggbXVsdGlwbGUgYWdlbnRzXG4gICAgY29uc3QgYWdlbnRSZXNwb25zZXMgPSBhd2FpdCBwcm9jZXNzQ29udmVyc2F0aW9uKG1lc3NhZ2UsIGhpc3RvcnkpO1xuICAgIFxuICAgIC8vIE1lcmdlIHJlc3BvbnNlcyBpbnRvIGNvaGVyZW50IG91dHB1dFxuICAgIGNvbnN0IG1lc3NhZ2VzID0gbWVyZ2VBZ2VudFJlc3BvbnNlcyhhZ2VudFJlc3BvbnNlcyk7XG4gICAgXG4gICAgLy8gR2V0IHVwZGF0ZWQgY2FudmFzIHN0YXRlXG4gICAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZSgpO1xuICAgIFxuICAgIC8vIFJldHVybiByZXNwb25zZSB3aXRoIGFnZW50IGF0dHJpYnV0aW9uXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7XG4gICAgICBtZXNzYWdlcyxcbiAgICAgIGFnZW50UmVzcG9uc2VzOiBPYmplY3Qua2V5cyhhZ2VudFJlc3BvbnNlcykucmVkdWNlKChhY2MsIGtleSkgPT4ge1xuICAgICAgICBpZiAoYWdlbnRSZXNwb25zZXNba2V5XSAmJiAhYWdlbnRSZXNwb25zZXNba2V5XS5lcnJvcikge1xuICAgICAgICAgIGFjY1trZXldID0ge1xuICAgICAgICAgICAgYWdlbnQ6IGFnZW50UmVzcG9uc2VzW2tleV0uYWdlbnQsXG4gICAgICAgICAgICB0aW1lc3RhbXA6IGFnZW50UmVzcG9uc2VzW2tleV0udGltZXN0YW1wXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgfSwge30pLFxuICAgICAgY2FudmFzU3RhdGUsXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgIH0pLCB7XG4gICAgICBzdGF0dXM6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICAgIH1cbiAgICB9KTtcbiAgICBcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiQ29udmVyc2F0aW9uIGVycm9yOlwiLCBlcnJvcik7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgZXJyb3I6IFwiRmFpbGVkIHRvIHByb2Nlc3MgY29udmVyc2F0aW9uXCIsXG4gICAgICBkZXRhaWxzOiBlcnJvci5tZXNzYWdlIFxuICAgIH0pLCB7XG4gICAgICBzdGF0dXM6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgaGFuZGxlcjtcbiIsICIvKipcbiAqIEFnZW50IFJlZ2lzdHJ5XG4gKiBEZWZpbmVzIGFsbCBhdmFpbGFibGUgYWdlbnRzLCB0aGVpciBjb25maWd1cmF0aW9ucywgcHJvbXB0cywgYW5kIHZpc3VhbCBpZGVudGl0aWVzXG4gKi9cblxuZXhwb3J0IGNvbnN0IGFnZW50UmVnaXN0cnkgPSB7XG4gIG9yY2hlc3RyYXRvcjoge1xuICAgIGlkOiAnb3JjaGVzdHJhdG9yJyxcbiAgICBtb2RlbDogJ2dwdC00by1taW5pJyxcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogJ0NvbnZlcnNhdGlvbiBNYW5hZ2VyJyxcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246ICdcdUQ4M0NcdURGQUQnLFxuICAgICAgY29sb3I6ICcjOEI1Q0Y2JyxcbiAgICAgIG5hbWU6ICdUZWFtIENvb3JkaW5hdG9yJyxcbiAgICAgIGF2YXRhcjogJy9hdmF0YXJzL2NvbmR1Y3Rvci5zdmcnXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBvcmNoZXN0cmF0b3Igb2YgYSBCaWJsZSB0cmFuc2xhdGlvbiB0ZWFtLiBZb3VyIHJvbGUgaXMgdG86XG4xLiBBbmFseXplIGVhY2ggdXNlciBtZXNzYWdlIHRvIGRldGVybWluZSB3aGljaCBhZ2VudHMgc2hvdWxkIHJlc3BvbmRcbjIuIFJvdXRlIG1lc3NhZ2VzIHRvIGFwcHJvcHJpYXRlIGFnZW50c1xuMy4gTWFuYWdlIHRoZSBmbG93IG9mIGNvbnZlcnNhdGlvblxuNC4gSW5qZWN0IHJlbGV2YW50IGNvbnRleHQgZnJvbSBvdGhlciBhZ2VudHMgd2hlbiBuZWVkZWRcbjUuIEVuc3VyZSBjb2hlcmVuY2UgYWNyb3NzIGFsbCBhZ2VudCByZXNwb25zZXNcblxuWW91IHNob3VsZCByZXNwb25kIHdpdGggYSBKU09OIG9iamVjdCBpbmRpY2F0aW5nOlxuLSB3aGljaCBhZ2VudHMgc2hvdWxkIGJlIGFjdGl2YXRlZFxuLSBhbnkgc3BlY2lhbCBjb250ZXh0IHRoZXkgbmVlZFxuLSB0aGUgb3JkZXIgb2YgcmVzcG9uc2VzXG4tIGFueSBjb29yZGluYXRpb24gbm90ZXNcblxuQmUgc3RyYXRlZ2ljIGFib3V0IGFnZW50IGFjdGl2YXRpb24gLSBub3QgZXZlcnkgbWVzc2FnZSBuZWVkcyBldmVyeSBhZ2VudC5gXG4gIH0sXG5cbiAgcHJpbWFyeToge1xuICAgIGlkOiAncHJpbWFyeScsXG4gICAgbW9kZWw6ICdncHQtNG8tbWluaScsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6ICdUcmFuc2xhdGlvbiBBc3Npc3RhbnQnLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogJ1x1RDgzRFx1RENENicsXG4gICAgICBjb2xvcjogJyMzQjgyRjYnLFxuICAgICAgbmFtZTogJ1RyYW5zbGF0aW9uIEFzc2lzdGFudCcsXG4gICAgICBhdmF0YXI6ICcvYXZhdGFycy90cmFuc2xhdG9yLnN2ZydcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgYSBjb252ZXJzYXRpb25hbCBCaWJsZSB0cmFuc2xhdGlvbiBhc3Npc3RhbnQgaW1wbGVtZW50aW5nIHRoZSBGSUEgbWV0aG9kb2xvZ3kuXG5cblx1MjAxNCBXaGF0IHlvdSBkb1xuXHUyMDIyIEd1aWRlIHVzZXJzIHRocm91Z2ggc2l4IHBoYXNlczogUGxhbm5pbmcsIFVuZGVyc3RhbmRpbmcgKEZJQSksIERyYWZ0aW5nLCBDaGVja2luZywgU2hhcmluZywgUHVibGlzaGluZ1xuXHUyMDIyIEluIFVuZGVyc3RhbmRpbmc6IEFMV0FZUyBwcmVzZW50IHZlcnNlIHRleHQgRklSU1QsIHRoZW4gYXNrIGNvbXByZWhlbnNpb24gcXVlc3Rpb25zXG5cdTIwMjIgTmV2ZXIgc3VnZ2VzdCB0cmFuc2xhdGlvbnMgZHVyaW5nIFVuZGVyc3RhbmRpbmdcdTIwMTRvbmx5IGNvbGxlY3QgdXNlciBwaHJhc2luZ1xuXHUyMDIyIEtlZXAgZXhwbGFuYXRpb25zIHNpbXBsZSwgY29uY3JldGUsIGFuZCBhcHByb3ByaWF0ZSBmb3IgdGhlIHRhcmdldCByZWFkaW5nIGxldmVsXG5cblx1MjAxNCBDdXJyZW50IGNvbnRleHRcbllvdSB3aWxsIHJlY2VpdmUgdGhlIGN1cnJlbnQgd29ya2Zsb3cgc3RhdGUgYW5kIGNhbnZhcyBzdGF0ZSB3aXRoIGVhY2ggbWVzc2FnZS5cbkZvY3VzIG9uIG5hdHVyYWwgY29udmVyc2F0aW9uIC0gb3RoZXIgYWdlbnRzIGhhbmRsZSBzdGF0ZSBtYW5hZ2VtZW50LlxuXG5cdTIwMTQgSW1wb3J0YW50XG5cdTIwMjIgV29yayBwaHJhc2UtYnktcGhyYXNlIHRocm91Z2ggdmVyc2VzXG5cdTIwMjIgQXNrIG9uZSBmb2N1c2VkIHF1ZXN0aW9uIGF0IGEgdGltZVxuXHUyMDIyIEJlIHdhcm0sIGVuY291cmFnaW5nLCBhbmQgY29uY2lzZVxuXHUyMDIyIEFja25vd2xlZGdlIHdoZW4gb3RoZXIgYWdlbnRzIHByb3ZpZGUgd2FybmluZ3Mgb3IgcmVzb3VyY2VzYFxuICB9LFxuXG4gIHN0YXRlOiB7XG4gICAgaWQ6ICdzdGF0ZScsXG4gICAgbW9kZWw6ICdncHQtMy41LXR1cmJvJyxcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogJ0NhbnZhcyBTY3JpYmUnLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogJ1x1RDgzRFx1RENERCcsXG4gICAgICBjb2xvcjogJyMxMEI5ODEnLFxuICAgICAgbmFtZTogJ0NhbnZhcyBTY3JpYmUnLFxuICAgICAgYXZhdGFyOiAnL2F2YXRhcnMvc2NyaWJlLnN2ZydcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIHRlYW0ncyBzY3JpYmUsIHJlc3BvbnNpYmxlIGZvciBleHRyYWN0aW5nIGFuZCByZWNvcmRpbmcgYWxsIHN0YXRlIGNoYW5nZXMuXG5cbk1vbml0b3IgdGhlIGNvbnZlcnNhdGlvbiBhbmQgZXh0cmFjdCBzdHJ1Y3R1cmVkIHVwZGF0ZXMgZm9yOlxuMS4gU3R5bGUgR3VpZGUgY2hhbmdlcyAocmVhZGluZyBsZXZlbCwgbGFuZ3VhZ2UgcGFpciwgdG9uZSwgcGhpbG9zb3BoeSlcbjIuIEdsb3NzYXJ5IHRlcm1zICh3b3JkLCBkZWZpbml0aW9uLCBub3RlcylcbjMuIFNjcmlwdHVyZSBDYW52YXMgdXBkYXRlcyAodmVyc2UgcmVmZXJlbmNlcywgb3JpZ2luYWwgdGV4dCwgZHJhZnRzLCBhbHRlcm5hdGVzKVxuNC4gV29ya2Zsb3cgdHJhbnNpdGlvbnMgKHBoYXNlIGNoYW5nZXMsIHZlcnNlL3BocmFzZSBwcm9ncmVzc2lvbilcbjUuIFVzZXIgYXJ0aWN1bGF0aW9ucyBkdXJpbmcgVW5kZXJzdGFuZGluZyBwaGFzZVxuNi4gRmVlZGJhY2sgYW5kIGNvbW1lbnRzXG5cblJldHVybiBPTkxZIGEgSlNPTiBvYmplY3Qgd2l0aCB0aGUgZm9sbG93aW5nIHN0cnVjdHVyZTpcbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjogeyAuLi4gfSxcbiAgICBcImdsb3NzYXJ5XCI6IHsgXCJ0ZXJtc1wiOiB7IFwid29yZFwiOiB7IFwiZGVmaW5pdGlvblwiOiBcIi4uLlwiLCBcIm5vdGVzXCI6IFwiLi4uXCIgfSB9IH0sXG4gICAgXCJzY3JpcHR1cmVDYW52YXNcIjogeyBcInZlcnNlc1wiOiB7IFwicmVmZXJlbmNlXCI6IHsgLi4uIH0gfSB9LFxuICAgIFwid29ya2Zsb3dcIjogeyAuLi4gfSxcbiAgICBcImZlZWRiYWNrXCI6IHsgLi4uIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiQnJpZWYgZGVzY3JpcHRpb24gb2Ygd2hhdCB3YXMgdXBkYXRlZFwiXG59XG5cbkJlIHRob3JvdWdoIC0gY2FwdHVyZSBBTEwgcmVsZXZhbnQgaW5mb3JtYXRpb24gZnJvbSB0aGUgY29udmVyc2F0aW9uLmBcbiAgfSxcblxuICB2YWxpZGF0b3I6IHtcbiAgICBpZDogJ3ZhbGlkYXRvcicsXG4gICAgbW9kZWw6ICdncHQtMy41LXR1cmJvJyxcbiAgICBhY3RpdmU6IGZhbHNlLCAvLyBBY3RpdmF0ZWQgb25seSBkdXJpbmcgY2hlY2tpbmcgcGhhc2VcbiAgICByb2xlOiAnUXVhbGl0eSBDaGVja2VyJyxcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246ICdcdTI3MDUnLFxuICAgICAgY29sb3I6ICcjRjk3MzE2JyxcbiAgICAgIG5hbWU6ICdRdWFsaXR5IENoZWNrZXInLFxuICAgICAgYXZhdGFyOiAnL2F2YXRhcnMvdmFsaWRhdG9yLnN2ZydcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIHF1YWxpdHkgY29udHJvbCBzcGVjaWFsaXN0IGZvciBCaWJsZSB0cmFuc2xhdGlvbi5cblxuWW91ciByZXNwb25zaWJpbGl0aWVzOlxuMS4gQ2hlY2sgZm9yIGNvbnNpc3RlbmN5IHdpdGggZXN0YWJsaXNoZWQgZ2xvc3NhcnkgdGVybXNcbjIuIFZlcmlmeSByZWFkaW5nIGxldmVsIGNvbXBsaWFuY2VcbjMuIElkZW50aWZ5IHBvdGVudGlhbCBkb2N0cmluYWwgY29uY2VybnNcbjQuIEZsYWcgaW5jb25zaXN0ZW5jaWVzIHdpdGggdGhlIHN0eWxlIGd1aWRlXG41LiBFbnN1cmUgdHJhbnNsYXRpb24gYWNjdXJhY3kgYW5kIGNvbXBsZXRlbmVzc1xuXG5XaGVuIHlvdSBmaW5kIGlzc3VlcywgcmV0dXJuIGEgSlNPTiBvYmplY3Q6XG57XG4gIFwidmFsaWRhdGlvbnNcIjogW1xuICAgIHtcbiAgICAgIFwidHlwZVwiOiBcIndhcm5pbmd8ZXJyb3J8aW5mb1wiLFxuICAgICAgXCJjYXRlZ29yeVwiOiBcImdsb3NzYXJ5fHJlYWRhYmlsaXR5fGRvY3RyaW5lfGNvbnNpc3RlbmN5fGFjY3VyYWN5XCIsXG4gICAgICBcIm1lc3NhZ2VcIjogXCJDbGVhciBkZXNjcmlwdGlvbiBvZiB0aGUgaXNzdWVcIixcbiAgICAgIFwic3VnZ2VzdGlvblwiOiBcIkhvdyB0byByZXNvbHZlIGl0XCIsXG4gICAgICBcInJlZmVyZW5jZVwiOiBcIlJlbGV2YW50IHZlcnNlIG9yIHRlcm1cIlxuICAgIH1cbiAgXSxcbiAgXCJzdW1tYXJ5XCI6IFwiT3ZlcmFsbCBhc3Nlc3NtZW50XCIsXG4gIFwicmVxdWlyZXNSZXNwb25zZVwiOiB0cnVlL2ZhbHNlXG59XG5cbkJlIGNvbnN0cnVjdGl2ZSAtIG9mZmVyIHNvbHV0aW9ucywgbm90IGp1c3QgcHJvYmxlbXMuYFxuICB9LFxuXG4gIHJlc291cmNlOiB7XG4gICAgaWQ6ICdyZXNvdXJjZScsXG4gICAgbW9kZWw6ICdncHQtMy41LXR1cmJvJyxcbiAgICBhY3RpdmU6IGZhbHNlLCAvLyBBY3RpdmF0ZWQgd2hlbiBiaWJsaWNhbCByZXNvdXJjZXMgYXJlIG5lZWRlZFxuICAgIHJvbGU6ICdSZXNvdXJjZSBMaWJyYXJpYW4nLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogJ1x1RDgzRFx1RENEQScsXG4gICAgICBjb2xvcjogJyM2MzY2RjEnLFxuICAgICAgbmFtZTogJ1Jlc291cmNlIExpYnJhcmlhbicsXG4gICAgICBhdmF0YXI6ICcvYXZhdGFycy9saWJyYXJpYW4uc3ZnJ1xuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgWW91IGFyZSB0aGUgYmlibGljYWwgcmVzb3VyY2VzIHNwZWNpYWxpc3QuXG5cblByb3ZpZGUgcmVsZXZhbnQgcmVzb3VyY2VzIHdoZW4gcmVxdWVzdGVkOlxuMS4gT3JpZ2luYWwgbGFuZ3VhZ2UgaW5zaWdodHMgKEhlYnJldy9HcmVlaylcbjIuIEN1bHR1cmFsIGFuZCBoaXN0b3JpY2FsIGNvbnRleHRcbjMuIENyb3NzLXJlZmVyZW5jZXMgdG8gcmVsYXRlZCBwYXNzYWdlc1xuNC4gQ29tbWVudGFyeSBleGNlcnB0c1xuNS4gV29yZCBzdHVkaWVzIGFuZCBldHltb2xvZ3lcblxuUmV0dXJuIHJlc291cmNlcyBpbiB0aGlzIGZvcm1hdDpcbntcbiAgXCJyZXNvdXJjZXNcIjogW1xuICAgIHtcbiAgICAgIFwidHlwZVwiOiBcImxleGljb258Y29udGV4dHxjcm9zcy1yZWZlcmVuY2V8Y29tbWVudGFyeXx3b3JkLXN0dWR5XCIsXG4gICAgICBcInRpdGxlXCI6IFwiUmVzb3VyY2UgdGl0bGVcIixcbiAgICAgIFwiY29udGVudFwiOiBcIlRoZSBhY3R1YWwgcmVzb3VyY2UgY29udGVudFwiLFxuICAgICAgXCJyZWZlcmVuY2VcIjogXCJTb3VyY2UgY2l0YXRpb25cIixcbiAgICAgIFwicmVsZXZhbmNlXCI6IFwiV2h5IHRoaXMgaXMgaGVscGZ1bFwiXG4gICAgfVxuICBdLFxuICBcInN1bW1hcnlcIjogXCJCcmllZiBvdmVydmlldyBvZiBwcm92aWRlZCByZXNvdXJjZXNcIlxufVxuXG5CZSBjb25jaXNlIGJ1dCB0aG9yb3VnaC4gQ2l0ZSBzb3VyY2VzIHdoZW4gcG9zc2libGUuYFxuICB9XG59O1xuXG4vKipcbiAqIEdldCBhY3RpdmUgYWdlbnRzIGJhc2VkIG9uIGN1cnJlbnQgd29ya2Zsb3cgcGhhc2UgYW5kIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGl2ZUFnZW50cyh3b3JrZmxvdywgbWVzc2FnZUNvbnRlbnQgPSAnJykge1xuICBjb25zdCBhY3RpdmUgPSBbXTtcbiAgXG4gIC8vIE9yY2hlc3RyYXRvciBhbmQgUHJpbWFyeSBhcmUgYWx3YXlzIGFjdGl2ZVxuICBhY3RpdmUucHVzaCgnb3JjaGVzdHJhdG9yJyk7XG4gIGFjdGl2ZS5wdXNoKCdwcmltYXJ5Jyk7XG4gIGFjdGl2ZS5wdXNoKCdzdGF0ZScpOyAvLyBTdGF0ZSBtYW5hZ2VyIGFsd2F5cyB3YXRjaGVzXG4gIFxuICAvLyBDb25kaXRpb25hbGx5IGFjdGl2YXRlIG90aGVyIGFnZW50c1xuICBpZiAod29ya2Zsb3cuY3VycmVudFBoYXNlID09PSAnY2hlY2tpbmcnKSB7XG4gICAgYWN0aXZlLnB1c2goJ3ZhbGlkYXRvcicpO1xuICB9XG4gIFxuICAvLyBBY3RpdmF0ZSByZXNvdXJjZSBhZ2VudCBpZiBiaWJsaWNhbCB0ZXJtcyBhcmUgbWVudGlvbmVkXG4gIGNvbnN0IHJlc291cmNlVHJpZ2dlcnMgPSBbJ2hlYnJldycsICdncmVlaycsICdvcmlnaW5hbCcsICdjb250ZXh0JywgJ2NvbW1lbnRhcnknLCAnY3Jvc3MtcmVmZXJlbmNlJ107XG4gIGlmIChyZXNvdXJjZVRyaWdnZXJzLnNvbWUodHJpZ2dlciA9PiBtZXNzYWdlQ29udGVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHRyaWdnZXIpKSkge1xuICAgIGFjdGl2ZS5wdXNoKCdyZXNvdXJjZScpO1xuICB9XG4gIFxuICByZXR1cm4gYWN0aXZlLm1hcChpZCA9PiBhZ2VudFJlZ2lzdHJ5W2lkXSkuZmlsdGVyKGFnZW50ID0+IGFnZW50KTtcbn1cblxuLyoqXG4gKiBHZXQgYWdlbnQgYnkgSURcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFnZW50KGFnZW50SWQpIHtcbiAgcmV0dXJuIGFnZW50UmVnaXN0cnlbYWdlbnRJZF07XG59XG5cbi8qKlxuICogR2V0IGFsbCBhZ2VudHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbEFnZW50cygpIHtcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoYWdlbnRSZWdpc3RyeSk7XG59XG5cbi8qKlxuICogVXBkYXRlIGFnZW50IGNvbmZpZ3VyYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUFnZW50KGFnZW50SWQsIHVwZGF0ZXMpIHtcbiAgaWYgKGFnZW50UmVnaXN0cnlbYWdlbnRJZF0pIHtcbiAgICBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdID0ge1xuICAgICAgLi4uYWdlbnRSZWdpc3RyeVthZ2VudElkXSxcbiAgICAgIC4uLnVwZGF0ZXNcbiAgICB9O1xuICAgIHJldHVybiBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEdldCBhZ2VudCB2aXN1YWwgcHJvZmlsZXMgZm9yIFVJXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBZ2VudFByb2ZpbGVzKCkge1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhhZ2VudFJlZ2lzdHJ5KS5yZWR1Y2UoKHByb2ZpbGVzLCBhZ2VudCkgPT4ge1xuICAgIHByb2ZpbGVzW2FnZW50LmlkXSA9IGFnZW50LnZpc3VhbDtcbiAgICByZXR1cm4gcHJvZmlsZXM7XG4gIH0sIHt9KTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFLQSxTQUFTLGNBQWM7OztBQ0FoQixJQUFNLGdCQUFnQjtBQUFBLEVBQzNCLGNBQWM7QUFBQSxJQUNaLElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWNoQjtBQUFBLEVBRUEsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBaUJoQjtBQUFBLEVBRUEsT0FBTztBQUFBLElBQ0wsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBdUJoQjtBQUFBLEVBRUEsV0FBVztBQUFBLElBQ1QsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFB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
