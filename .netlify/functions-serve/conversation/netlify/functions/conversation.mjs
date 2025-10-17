
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
  console.log(`Calling agent: ${agent.id}`);
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
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout calling ${agent.id}`)), 1e4);
    });
    const completionPromise = openai.chat.completions.create({
      model: agent.model,
      messages,
      temperature: agent.id === "state" ? 0.1 : 0.7,
      // Lower temp for state extraction
      max_tokens: agent.id === "state" ? 500 : 2e3
    });
    const completion = await Promise.race([completionPromise, timeoutPromise]);
    console.log(`Agent ${agent.id} responded successfully`);
    return {
      agentId: agent.id,
      agent: agent.visual,
      response: completion.choices[0].message.content,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    console.error(`Error calling agent ${agent.id}:`, error.message);
    return {
      agentId: agent.id,
      agent: agent.visual,
      error: error.message || "Unknown error"
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
  console.log("Starting processConversation with message:", userMessage);
  const responses = {};
  const canvasState = await getCanvasState();
  console.log("Got canvas state");
  const context = {
    canvasState,
    conversationHistory: conversationHistory.slice(-10),
    // Last 10 messages
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  const activeAgents = getActiveAgents(canvasState.workflow, userMessage);
  console.log(
    "Active agents:",
    activeAgents.map((a) => a.id)
  );
  const orchestration = {
    agents: ["primary", "state"],
    sequential: false
  };
  const primary = getAgent("primary");
  console.log("Calling primary translator...");
  responses.primary = await callAgent(primary, userMessage, {
    ...context,
    orchestration
  });
  if (!responses.primary.error) {
    const stateManager = getAgent("state");
    console.log("Calling state manager...");
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
    console.log("Conversation endpoint called");
    const { message, history = [] } = await req.json();
    console.log("Received message:", message);
    const agentResponses = await processConversation(message, history);
    console.log("Got agent responses");
    const messages = mergeAgentResponses(agentResponses);
    console.log("Merged messages");
    const canvasState = await getCanvasState();
    return new Response(
      JSON.stringify({
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
      }),
      {
        status: 200,
        headers: {
          ...headers,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Conversation error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process conversation",
        details: error.message
      }),
      {
        status: 500,
        headers: {
          ...headers,
          "Content-Type": "application/json"
        }
      }
    );
  }
};
var conversation_default = handler;
export {
  conversation_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY29udmVyc2F0aW9uLmpzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL2FnZW50cy9yZWdpc3RyeS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNdWx0aS1BZ2VudCBDb252ZXJzYXRpb24gSGFuZGxlclxuICogT3JjaGVzdHJhdGVzIG11bHRpcGxlIEFJIGFnZW50cyB0byBoYW5kbGUgQmlibGUgdHJhbnNsYXRpb24gY29udmVyc2F0aW9uc1xuICovXG5cbmltcG9ydCB7IE9wZW5BSSB9IGZyb20gXCJvcGVuYWlcIjtcbmltcG9ydCB7IGdldEFjdGl2ZUFnZW50cywgZ2V0QWdlbnQgfSBmcm9tIFwiLi9hZ2VudHMvcmVnaXN0cnkuanNcIjtcblxuY29uc3Qgb3BlbmFpID0gbmV3IE9wZW5BSSh7XG4gIGFwaUtleTogcHJvY2Vzcy5lbnYuT1BFTkFJX0FQSV9LRVksXG59KTtcblxuLyoqXG4gKiBDYWxsIGFuIGluZGl2aWR1YWwgYWdlbnQgd2l0aCBjb250ZXh0XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNhbGxBZ2VudChhZ2VudCwgbWVzc2FnZSwgY29udGV4dCkge1xuICBjb25zb2xlLmxvZyhgQ2FsbGluZyBhZ2VudDogJHthZ2VudC5pZH1gKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBtZXNzYWdlcyA9IFtcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJzeXN0ZW1cIixcbiAgICAgICAgY29udGVudDogYWdlbnQuc3lzdGVtUHJvbXB0LFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICAgIGNvbnRlbnQ6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB1c2VyTWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICBjb250ZXh0OiBjb250ZXh0LFxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICB9KSxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIC8vIEFkZCB0aW1lb3V0IHdyYXBwZXIgZm9yIEFQSSBjYWxsXG4gICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgoXywgcmVqZWN0KSA9PiB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoYFRpbWVvdXQgY2FsbGluZyAke2FnZW50LmlkfWApKSwgMTAwMDApOyAvLyAxMCBzZWNvbmQgdGltZW91dFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvblByb21pc2UgPSBvcGVuYWkuY2hhdC5jb21wbGV0aW9ucy5jcmVhdGUoe1xuICAgICAgbW9kZWw6IGFnZW50Lm1vZGVsLFxuICAgICAgbWVzc2FnZXM6IG1lc3NhZ2VzLFxuICAgICAgdGVtcGVyYXR1cmU6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyAwLjEgOiAwLjcsIC8vIExvd2VyIHRlbXAgZm9yIHN0YXRlIGV4dHJhY3Rpb25cbiAgICAgIG1heF90b2tlbnM6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyA1MDAgOiAyMDAwLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvbiA9IGF3YWl0IFByb21pc2UucmFjZShbY29tcGxldGlvblByb21pc2UsIHRpbWVvdXRQcm9taXNlXSk7XG4gICAgY29uc29sZS5sb2coYEFnZW50ICR7YWdlbnQuaWR9IHJlc3BvbmRlZCBzdWNjZXNzZnVsbHlgKTtcblxuICAgIHJldHVybiB7XG4gICAgICBhZ2VudElkOiBhZ2VudC5pZCxcbiAgICAgIGFnZW50OiBhZ2VudC52aXN1YWwsXG4gICAgICByZXNwb25zZTogY29tcGxldGlvbi5jaG9pY2VzWzBdLm1lc3NhZ2UuY29udGVudCxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgY2FsbGluZyBhZ2VudCAke2FnZW50LmlkfTpgLCBlcnJvci5tZXNzYWdlKTtcbiAgICByZXR1cm4ge1xuICAgICAgYWdlbnRJZDogYWdlbnQuaWQsXG4gICAgICBhZ2VudDogYWdlbnQudmlzdWFsLFxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfHwgXCJVbmtub3duIGVycm9yXCIsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCBjdXJyZW50IGNhbnZhcyBzdGF0ZSBmcm9tIHN0YXRlIG1hbmFnZW1lbnQgZnVuY3Rpb25cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0Q2FudmFzU3RhdGUoKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdGVVcmwgPSBwcm9jZXNzLmVudi5DT05URVhUPy51cmxcbiAgICAgID8gbmV3IFVSTChcIi8ubmV0bGlmeS9mdW5jdGlvbnMvY2FudmFzLXN0YXRlXCIsIHByb2Nlc3MuZW52LkNPTlRFWFQudXJsKS5ocmVmXG4gICAgICA6IFwiaHR0cDovL2xvY2FsaG9zdDo5OTk5Ly5uZXRsaWZ5L2Z1bmN0aW9ucy9jYW52YXMtc3RhdGVcIjtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwpO1xuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIGZldGNoaW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG5cbiAgLy8gUmV0dXJuIGRlZmF1bHQgc3RhdGUgaWYgZmV0Y2ggZmFpbHNcbiAgcmV0dXJuIHtcbiAgICBzdHlsZUd1aWRlOiB7fSxcbiAgICBnbG9zc2FyeTogeyB0ZXJtczoge30gfSxcbiAgICBzY3JpcHR1cmVDYW52YXM6IHsgdmVyc2VzOiB7fSB9LFxuICAgIHdvcmtmbG93OiB7IGN1cnJlbnRQaGFzZTogXCJwbGFubmluZ1wiIH0sXG4gIH07XG59XG5cbi8qKlxuICogVXBkYXRlIGNhbnZhcyBzdGF0ZVxuICovXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVDYW52YXNTdGF0ZSh1cGRhdGVzLCBhZ2VudElkID0gXCJzeXN0ZW1cIikge1xuICB0cnkge1xuICAgIGNvbnN0IHN0YXRlVXJsID0gcHJvY2Vzcy5lbnYuQ09OVEVYVD8udXJsXG4gICAgICA/IG5ldyBVUkwoXCIvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGVcIiwgcHJvY2Vzcy5lbnYuQ09OVEVYVC51cmwpLmhyZWZcbiAgICAgIDogXCJodHRwOi8vbG9jYWxob3N0Ojk5OTkvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGVcIjtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwsIHtcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgdXBkYXRlcywgYWdlbnRJZCB9KSxcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIHVwZGF0aW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgY29udmVyc2F0aW9uIHdpdGggbXVsdGlwbGUgYWdlbnRzXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NDb252ZXJzYXRpb24odXNlck1lc3NhZ2UsIGNvbnZlcnNhdGlvbkhpc3RvcnkpIHtcbiAgY29uc29sZS5sb2coXCJTdGFydGluZyBwcm9jZXNzQ29udmVyc2F0aW9uIHdpdGggbWVzc2FnZTpcIiwgdXNlck1lc3NhZ2UpO1xuICBjb25zdCByZXNwb25zZXMgPSB7fTtcbiAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZSgpO1xuICBjb25zb2xlLmxvZyhcIkdvdCBjYW52YXMgc3RhdGVcIik7XG5cbiAgLy8gQnVpbGQgY29udGV4dCBmb3IgYWdlbnRzXG4gIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgY2FudmFzU3RhdGUsXG4gICAgY29udmVyc2F0aW9uSGlzdG9yeTogY29udmVyc2F0aW9uSGlzdG9yeS5zbGljZSgtMTApLCAvLyBMYXN0IDEwIG1lc3NhZ2VzXG4gICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoaWNoIGFnZW50cyBzaG91bGQgYmUgYWN0aXZlXG4gIGNvbnN0IGFjdGl2ZUFnZW50cyA9IGdldEFjdGl2ZUFnZW50cyhjYW52YXNTdGF0ZS53b3JrZmxvdywgdXNlck1lc3NhZ2UpO1xuICBjb25zb2xlLmxvZyhcbiAgICBcIkFjdGl2ZSBhZ2VudHM6XCIsXG4gICAgYWN0aXZlQWdlbnRzLm1hcCgoYSkgPT4gYS5pZClcbiAgKTtcblxuICAvLyBTa2lwIG9yY2hlc3RyYXRvciBmb3Igbm93IC0ganVzdCB1c2UgcHJpbWFyeSBhbmQgc3RhdGUgYWdlbnRzXG4gIC8vIFRoaXMgc2ltcGxpZmllcyB0aGluZ3MgYW5kIHJlZHVjZXMgQVBJIGNhbGxzXG4gIGNvbnN0IG9yY2hlc3RyYXRpb24gPSB7XG4gICAgYWdlbnRzOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gICAgc2VxdWVudGlhbDogZmFsc2UsXG4gIH07XG5cbiAgLy8gQ2FsbCBwcmltYXJ5IHRyYW5zbGF0b3JcbiAgY29uc3QgcHJpbWFyeSA9IGdldEFnZW50KFwicHJpbWFyeVwiKTtcbiAgY29uc29sZS5sb2coXCJDYWxsaW5nIHByaW1hcnkgdHJhbnNsYXRvci4uLlwiKTtcbiAgcmVzcG9uc2VzLnByaW1hcnkgPSBhd2FpdCBjYWxsQWdlbnQocHJpbWFyeSwgdXNlck1lc3NhZ2UsIHtcbiAgICAuLi5jb250ZXh0LFxuICAgIG9yY2hlc3RyYXRpb24sXG4gIH0pO1xuXG4gIC8vIFN0YXRlIG1hbmFnZXIgd2F0Y2hlcyB0aGUgY29udmVyc2F0aW9uIChvbmx5IGlmIHByaW1hcnkgc3VjY2VlZGVkKVxuICBpZiAoIXJlc3BvbnNlcy5wcmltYXJ5LmVycm9yKSB7XG4gICAgY29uc3Qgc3RhdGVNYW5hZ2VyID0gZ2V0QWdlbnQoXCJzdGF0ZVwiKTtcbiAgICBjb25zb2xlLmxvZyhcIkNhbGxpbmcgc3RhdGUgbWFuYWdlci4uLlwiKTtcbiAgICBjb25zdCBzdGF0ZVJlc3VsdCA9IGF3YWl0IGNhbGxBZ2VudChzdGF0ZU1hbmFnZXIsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAuLi5jb250ZXh0LFxuICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSxcbiAgICAgIG9yY2hlc3RyYXRpb24sXG4gICAgfSk7XG5cbiAgICAvLyBQYXJzZSBhbmQgYXBwbHkgc3RhdGUgdXBkYXRlc1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0ZVVwZGF0ZXMgPSBKU09OLnBhcnNlKHN0YXRlUmVzdWx0LnJlc3BvbnNlKTtcbiAgICAgIGlmIChzdGF0ZVVwZGF0ZXMudXBkYXRlcyAmJiBPYmplY3Qua2V5cyhzdGF0ZVVwZGF0ZXMudXBkYXRlcykubGVuZ3RoID4gMCkge1xuICAgICAgICBhd2FpdCB1cGRhdGVDYW52YXNTdGF0ZShzdGF0ZVVwZGF0ZXMudXBkYXRlcywgXCJzdGF0ZVwiKTtcbiAgICAgICAgcmVzcG9uc2VzLnN0YXRlID0ge1xuICAgICAgICAgIC4uLnN0YXRlUmVzdWx0LFxuICAgICAgICAgIHVwZGF0ZXM6IHN0YXRlVXBkYXRlcy51cGRhdGVzLFxuICAgICAgICAgIHN1bW1hcnk6IHN0YXRlVXBkYXRlcy5zdW1tYXJ5LFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBwYXJzaW5nIHN0YXRlIHVwZGF0ZXM6XCIsIGUpO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRlbXBvcmFyaWx5IGRpc2FibGUgdmFsaWRhdG9yIGFuZCByZXNvdXJjZSBhZ2VudHMgdG8gc2ltcGxpZnkgZGVidWdnaW5nXG4gIC8vIFRPRE86IFJlLWVuYWJsZSB0aGVzZSBvbmNlIGJhc2ljIGZsb3cgaXMgd29ya2luZ1xuXG4gIC8qXG4gIC8vIENhbGwgdmFsaWRhdG9yIGlmIGluIGNoZWNraW5nIHBoYXNlXG4gIGlmIChjYW52YXNTdGF0ZS53b3JrZmxvdy5jdXJyZW50UGhhc2UgPT09ICdjaGVja2luZycgfHwgXG4gICAgICBvcmNoZXN0cmF0aW9uLmFnZW50cz8uaW5jbHVkZXMoJ3ZhbGlkYXRvcicpKSB7XG4gICAgY29uc3QgdmFsaWRhdG9yID0gZ2V0QWdlbnQoJ3ZhbGlkYXRvcicpO1xuICAgIGlmICh2YWxpZGF0b3IpIHtcbiAgICAgIHJlc3BvbnNlcy52YWxpZGF0b3IgPSBhd2FpdCBjYWxsQWdlbnQodmFsaWRhdG9yLCB1c2VyTWVzc2FnZSwge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBwcmltYXJ5UmVzcG9uc2U6IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlLFxuICAgICAgICBzdGF0ZVVwZGF0ZXM6IHJlc3BvbnNlcy5zdGF0ZT8udXBkYXRlc1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFBhcnNlIHZhbGlkYXRpb24gcmVzdWx0c1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgdmFsaWRhdGlvbnMgPSBKU09OLnBhcnNlKHJlc3BvbnNlcy52YWxpZGF0b3IucmVzcG9uc2UpO1xuICAgICAgICByZXNwb25zZXMudmFsaWRhdG9yLnZhbGlkYXRpb25zID0gdmFsaWRhdGlvbnMudmFsaWRhdGlvbnM7XG4gICAgICAgIHJlc3BvbnNlcy52YWxpZGF0b3IucmVxdWlyZXNSZXNwb25zZSA9IHZhbGlkYXRpb25zLnJlcXVpcmVzUmVzcG9uc2U7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIEtlZXAgcmF3IHJlc3BvbnNlIGlmIG5vdCBKU09OXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ2FsbCByZXNvdXJjZSBhZ2VudCBpZiBuZWVkZWRcbiAgaWYgKG9yY2hlc3RyYXRpb24uYWdlbnRzPy5pbmNsdWRlcygncmVzb3VyY2UnKSkge1xuICAgIGNvbnN0IHJlc291cmNlID0gZ2V0QWdlbnQoJ3Jlc291cmNlJyk7XG4gICAgaWYgKHJlc291cmNlKSB7XG4gICAgICByZXNwb25zZXMucmVzb3VyY2UgPSBhd2FpdCBjYWxsQWdlbnQocmVzb3VyY2UsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgIHByaW1hcnlSZXNwb25zZTogcmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2VcbiAgICAgIH0pO1xuXG4gICAgICAvLyBQYXJzZSByZXNvdXJjZSByZXN1bHRzXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXNvdXJjZXMgPSBKU09OLnBhcnNlKHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNwb25zZSk7XG4gICAgICAgIHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNvdXJjZXMgPSByZXNvdXJjZXMucmVzb3VyY2VzO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBLZWVwIHJhdyByZXNwb25zZSBpZiBub3QgSlNPTlxuICAgICAgfVxuICAgIH1cbiAgfVxuICAqL1xuXG4gIHJldHVybiByZXNwb25zZXM7XG59XG5cbi8qKlxuICogTWVyZ2UgYWdlbnQgcmVzcG9uc2VzIGludG8gYSBjb2hlcmVudCBjb252ZXJzYXRpb24gcmVzcG9uc2VcbiAqL1xuZnVuY3Rpb24gbWVyZ2VBZ2VudFJlc3BvbnNlcyhyZXNwb25zZXMpIHtcbiAgY29uc3QgbWVzc2FnZXMgPSBbXTtcblxuICAvLyBBbHdheXMgaW5jbHVkZSBwcmltYXJ5IHJlc3BvbnNlXG4gIGlmIChyZXNwb25zZXMucHJpbWFyeSAmJiAhcmVzcG9uc2VzLnByaW1hcnkuZXJyb3IpIHtcbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6IFwiYXNzaXN0YW50XCIsXG4gICAgICBjb250ZW50OiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSxcbiAgICAgIGFnZW50OiByZXNwb25zZXMucHJpbWFyeS5hZ2VudCxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEluY2x1ZGUgdmFsaWRhdG9yIHdhcm5pbmdzL2Vycm9ycyBpZiBhbnlcbiAgaWYgKHJlc3BvbnNlcy52YWxpZGF0b3I/LnJlcXVpcmVzUmVzcG9uc2UgJiYgcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9ucykge1xuICAgIGNvbnN0IHZhbGlkYXRpb25NZXNzYWdlcyA9IHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnNcbiAgICAgIC5maWx0ZXIoKHYpID0+IHYudHlwZSA9PT0gXCJ3YXJuaW5nXCIgfHwgdi50eXBlID09PSBcImVycm9yXCIpXG4gICAgICAubWFwKCh2KSA9PiBgXHUyNkEwXHVGRTBGICoqJHt2LmNhdGVnb3J5fSoqOiAke3YubWVzc2FnZX1gKTtcblxuICAgIGlmICh2YWxpZGF0aW9uTWVzc2FnZXMubGVuZ3RoID4gMCkge1xuICAgICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICAgIHJvbGU6IFwic3lzdGVtXCIsXG4gICAgICAgIGNvbnRlbnQ6IHZhbGlkYXRpb25NZXNzYWdlcy5qb2luKFwiXFxuXCIpLFxuICAgICAgICBhZ2VudDogcmVzcG9uc2VzLnZhbGlkYXRvci5hZ2VudCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIEluY2x1ZGUgcmVzb3VyY2VzIGlmIHByb3ZpZGVkXG4gIGlmIChyZXNwb25zZXMucmVzb3VyY2U/LnJlc291cmNlcyAmJiByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCByZXNvdXJjZUNvbnRlbnQgPSByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzXG4gICAgICAubWFwKChyKSA9PiBgKioke3IudGl0bGV9KipcXG4ke3IuY29udGVudH1gKVxuICAgICAgLmpvaW4oXCJcXG5cXG5cIik7XG5cbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6IFwiYXNzaXN0YW50XCIsXG4gICAgICBjb250ZW50OiBgXHVEODNEXHVEQ0RBICoqQmlibGljYWwgUmVzb3VyY2VzKipcXG5cXG4ke3Jlc291cmNlQ29udGVudH1gLFxuICAgICAgYWdlbnQ6IHJlc3BvbnNlcy5yZXNvdXJjZS5hZ2VudCxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBtZXNzYWdlcztcbn1cblxuLyoqXG4gKiBOZXRsaWZ5IEZ1bmN0aW9uIEhhbmRsZXJcbiAqL1xuY29uc3QgaGFuZGxlciA9IGFzeW5jIChyZXEsIGNvbnRleHQpID0+IHtcbiAgLy8gU3RvcmUgY29udGV4dCBmb3IgaW50ZXJuYWwgdXNlXG4gIHByb2Nlc3MuZW52LkNPTlRFWFQgPSBjb250ZXh0O1xuXG4gIC8vIEVuYWJsZSBDT1JTXG4gIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIjogXCIqXCIsXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzXCI6IFwiQ29udGVudC1UeXBlXCIsXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCI6IFwiUE9TVCwgT1BUSU9OU1wiLFxuICB9O1xuXG4gIC8vIEhhbmRsZSBwcmVmbGlnaHRcbiAgaWYgKHJlcS5tZXRob2QgPT09IFwiT1BUSU9OU1wiKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIk9LXCIsIHsgaGVhZGVycyB9KTtcbiAgfVxuXG4gIGlmIChyZXEubWV0aG9kICE9PSBcIlBPU1RcIikge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJNZXRob2Qgbm90IGFsbG93ZWRcIiwgeyBzdGF0dXM6IDQwNSwgaGVhZGVycyB9KTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coXCJDb252ZXJzYXRpb24gZW5kcG9pbnQgY2FsbGVkXCIpO1xuICAgIGNvbnN0IHsgbWVzc2FnZSwgaGlzdG9yeSA9IFtdIH0gPSBhd2FpdCByZXEuanNvbigpO1xuICAgIGNvbnNvbGUubG9nKFwiUmVjZWl2ZWQgbWVzc2FnZTpcIiwgbWVzc2FnZSk7XG5cbiAgICAvLyBQcm9jZXNzIGNvbnZlcnNhdGlvbiB3aXRoIG11bHRpcGxlIGFnZW50c1xuICAgIGNvbnN0IGFnZW50UmVzcG9uc2VzID0gYXdhaXQgcHJvY2Vzc0NvbnZlcnNhdGlvbihtZXNzYWdlLCBoaXN0b3J5KTtcbiAgICBjb25zb2xlLmxvZyhcIkdvdCBhZ2VudCByZXNwb25zZXNcIik7XG5cbiAgICAvLyBNZXJnZSByZXNwb25zZXMgaW50byBjb2hlcmVudCBvdXRwdXRcbiAgICBjb25zdCBtZXNzYWdlcyA9IG1lcmdlQWdlbnRSZXNwb25zZXMoYWdlbnRSZXNwb25zZXMpO1xuICAgIGNvbnNvbGUubG9nKFwiTWVyZ2VkIG1lc3NhZ2VzXCIpO1xuXG4gICAgLy8gR2V0IHVwZGF0ZWQgY2FudmFzIHN0YXRlXG4gICAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZSgpO1xuXG4gICAgLy8gUmV0dXJuIHJlc3BvbnNlIHdpdGggYWdlbnQgYXR0cmlidXRpb25cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtZXNzYWdlcyxcbiAgICAgICAgYWdlbnRSZXNwb25zZXM6IE9iamVjdC5rZXlzKGFnZW50UmVzcG9uc2VzKS5yZWR1Y2UoKGFjYywga2V5KSA9PiB7XG4gICAgICAgICAgaWYgKGFnZW50UmVzcG9uc2VzW2tleV0gJiYgIWFnZW50UmVzcG9uc2VzW2tleV0uZXJyb3IpIHtcbiAgICAgICAgICAgIGFjY1trZXldID0ge1xuICAgICAgICAgICAgICBhZ2VudDogYWdlbnRSZXNwb25zZXNba2V5XS5hZ2VudCxcbiAgICAgICAgICAgICAgdGltZXN0YW1wOiBhZ2VudFJlc3BvbnNlc1trZXldLnRpbWVzdGFtcCxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIHt9KSxcbiAgICAgICAgY2FudmFzU3RhdGUsXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgfSksXG4gICAgICB7XG4gICAgICAgIHN0YXR1czogMjAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJDb252ZXJzYXRpb24gZXJyb3I6XCIsIGVycm9yKTtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBlcnJvcjogXCJGYWlsZWQgdG8gcHJvY2VzcyBjb252ZXJzYXRpb25cIixcbiAgICAgICAgZGV0YWlsczogZXJyb3IubWVzc2FnZSxcbiAgICAgIH0pLFxuICAgICAge1xuICAgICAgICBzdGF0dXM6IDUwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIC4uLmhlYWRlcnMsXG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgKTtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgaGFuZGxlcjtcbiIsICIvKipcbiAqIEFnZW50IFJlZ2lzdHJ5XG4gKiBEZWZpbmVzIGFsbCBhdmFpbGFibGUgYWdlbnRzLCB0aGVpciBjb25maWd1cmF0aW9ucywgcHJvbXB0cywgYW5kIHZpc3VhbCBpZGVudGl0aWVzXG4gKi9cblxuZXhwb3J0IGNvbnN0IGFnZW50UmVnaXN0cnkgPSB7XG4gIG9yY2hlc3RyYXRvcjoge1xuICAgIGlkOiAnb3JjaGVzdHJhdG9yJyxcbiAgICBtb2RlbDogJ2dwdC00by1taW5pJyxcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogJ0NvbnZlcnNhdGlvbiBNYW5hZ2VyJyxcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246ICdcdUQ4M0NcdURGQUQnLFxuICAgICAgY29sb3I6ICcjOEI1Q0Y2JyxcbiAgICAgIG5hbWU6ICdUZWFtIENvb3JkaW5hdG9yJyxcbiAgICAgIGF2YXRhcjogJy9hdmF0YXJzL2NvbmR1Y3Rvci5zdmcnXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBvcmNoZXN0cmF0b3Igb2YgYSBCaWJsZSB0cmFuc2xhdGlvbiB0ZWFtLiBZb3VyIHJvbGUgaXMgdG86XG4xLiBBbmFseXplIGVhY2ggdXNlciBtZXNzYWdlIHRvIGRldGVybWluZSB3aGljaCBhZ2VudHMgc2hvdWxkIHJlc3BvbmRcbjIuIFJvdXRlIG1lc3NhZ2VzIHRvIGFwcHJvcHJpYXRlIGFnZW50c1xuMy4gTWFuYWdlIHRoZSBmbG93IG9mIGNvbnZlcnNhdGlvblxuNC4gSW5qZWN0IHJlbGV2YW50IGNvbnRleHQgZnJvbSBvdGhlciBhZ2VudHMgd2hlbiBuZWVkZWRcbjUuIEVuc3VyZSBjb2hlcmVuY2UgYWNyb3NzIGFsbCBhZ2VudCByZXNwb25zZXNcblxuWW91IHNob3VsZCByZXNwb25kIHdpdGggYSBKU09OIG9iamVjdCBpbmRpY2F0aW5nOlxuLSB3aGljaCBhZ2VudHMgc2hvdWxkIGJlIGFjdGl2YXRlZFxuLSBhbnkgc3BlY2lhbCBjb250ZXh0IHRoZXkgbmVlZFxuLSB0aGUgb3JkZXIgb2YgcmVzcG9uc2VzXG4tIGFueSBjb29yZGluYXRpb24gbm90ZXNcblxuQmUgc3RyYXRlZ2ljIGFib3V0IGFnZW50IGFjdGl2YXRpb24gLSBub3QgZXZlcnkgbWVzc2FnZSBuZWVkcyBldmVyeSBhZ2VudC5gXG4gIH0sXG5cbiAgcHJpbWFyeToge1xuICAgIGlkOiAncHJpbWFyeScsXG4gICAgbW9kZWw6ICdncHQtNG8tbWluaScsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6ICdUcmFuc2xhdGlvbiBBc3Npc3RhbnQnLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogJ1x1RDgzRFx1RENENicsXG4gICAgICBjb2xvcjogJyMzQjgyRjYnLFxuICAgICAgbmFtZTogJ1RyYW5zbGF0aW9uIEFzc2lzdGFudCcsXG4gICAgICBhdmF0YXI6ICcvYXZhdGFycy90cmFuc2xhdG9yLnN2ZydcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgYSBjb252ZXJzYXRpb25hbCBCaWJsZSB0cmFuc2xhdGlvbiBhc3Npc3RhbnQgaW1wbGVtZW50aW5nIHRoZSBGSUEgbWV0aG9kb2xvZ3kuXG5cblx1MjAxNCBXaGF0IHlvdSBkb1xuXHUyMDIyIEd1aWRlIHVzZXJzIHRocm91Z2ggc2l4IHBoYXNlczogUGxhbm5pbmcsIFVuZGVyc3RhbmRpbmcgKEZJQSksIERyYWZ0aW5nLCBDaGVja2luZywgU2hhcmluZywgUHVibGlzaGluZ1xuXHUyMDIyIEluIFVuZGVyc3RhbmRpbmc6IEFMV0FZUyBwcmVzZW50IHZlcnNlIHRleHQgRklSU1QsIHRoZW4gYXNrIGNvbXByZWhlbnNpb24gcXVlc3Rpb25zXG5cdTIwMjIgTmV2ZXIgc3VnZ2VzdCB0cmFuc2xhdGlvbnMgZHVyaW5nIFVuZGVyc3RhbmRpbmdcdTIwMTRvbmx5IGNvbGxlY3QgdXNlciBwaHJhc2luZ1xuXHUyMDIyIEtlZXAgZXhwbGFuYXRpb25zIHNpbXBsZSwgY29uY3JldGUsIGFuZCBhcHByb3ByaWF0ZSBmb3IgdGhlIHRhcmdldCByZWFkaW5nIGxldmVsXG5cblx1MjAxNCBDdXJyZW50IGNvbnRleHRcbllvdSB3aWxsIHJlY2VpdmUgdGhlIGN1cnJlbnQgd29ya2Zsb3cgc3RhdGUgYW5kIGNhbnZhcyBzdGF0ZSB3aXRoIGVhY2ggbWVzc2FnZS5cbkZvY3VzIG9uIG5hdHVyYWwgY29udmVyc2F0aW9uIC0gb3RoZXIgYWdlbnRzIGhhbmRsZSBzdGF0ZSBtYW5hZ2VtZW50LlxuXG5cdTIwMTQgSW1wb3J0YW50XG5cdTIwMjIgV29yayBwaHJhc2UtYnktcGhyYXNlIHRocm91Z2ggdmVyc2VzXG5cdTIwMjIgQXNrIG9uZSBmb2N1c2VkIHF1ZXN0aW9uIGF0IGEgdGltZVxuXHUyMDIyIEJlIHdhcm0sIGVuY291cmFnaW5nLCBhbmQgY29uY2lzZVxuXHUyMDIyIEFja25vd2xlZGdlIHdoZW4gb3RoZXIgYWdlbnRzIHByb3ZpZGUgd2FybmluZ3Mgb3IgcmVzb3VyY2VzYFxuICB9LFxuXG4gIHN0YXRlOiB7XG4gICAgaWQ6ICdzdGF0ZScsXG4gICAgbW9kZWw6ICdncHQtMy41LXR1cmJvJyxcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogJ0NhbnZhcyBTY3JpYmUnLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogJ1x1RDgzRFx1RENERCcsXG4gICAgICBjb2xvcjogJyMxMEI5ODEnLFxuICAgICAgbmFtZTogJ0NhbnZhcyBTY3JpYmUnLFxuICAgICAgYXZhdGFyOiAnL2F2YXRhcnMvc2NyaWJlLnN2ZydcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIHRlYW0ncyBzY3JpYmUsIHJlc3BvbnNpYmxlIGZvciBleHRyYWN0aW5nIGFuZCByZWNvcmRpbmcgYWxsIHN0YXRlIGNoYW5nZXMuXG5cbk1vbml0b3IgdGhlIGNvbnZlcnNhdGlvbiBhbmQgZXh0cmFjdCBzdHJ1Y3R1cmVkIHVwZGF0ZXMgZm9yOlxuMS4gU3R5bGUgR3VpZGUgY2hhbmdlcyAocmVhZGluZyBsZXZlbCwgbGFuZ3VhZ2UgcGFpciwgdG9uZSwgcGhpbG9zb3BoeSlcbjIuIEdsb3NzYXJ5IHRlcm1zICh3b3JkLCBkZWZpbml0aW9uLCBub3RlcylcbjMuIFNjcmlwdHVyZSBDYW52YXMgdXBkYXRlcyAodmVyc2UgcmVmZXJlbmNlcywgb3JpZ2luYWwgdGV4dCwgZHJhZnRzLCBhbHRlcm5hdGVzKVxuNC4gV29ya2Zsb3cgdHJhbnNpdGlvbnMgKHBoYXNlIGNoYW5nZXMsIHZlcnNlL3BocmFzZSBwcm9ncmVzc2lvbilcbjUuIFVzZXIgYXJ0aWN1bGF0aW9ucyBkdXJpbmcgVW5kZXJzdGFuZGluZyBwaGFzZVxuNi4gRmVlZGJhY2sgYW5kIGNvbW1lbnRzXG5cblJldHVybiBPTkxZIGEgSlNPTiBvYmplY3Qgd2l0aCB0aGUgZm9sbG93aW5nIHN0cnVjdHVyZTpcbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjogeyAuLi4gfSxcbiAgICBcImdsb3NzYXJ5XCI6IHsgXCJ0ZXJtc1wiOiB7IFwid29yZFwiOiB7IFwiZGVmaW5pdGlvblwiOiBcIi4uLlwiLCBcIm5vdGVzXCI6IFwiLi4uXCIgfSB9IH0sXG4gICAgXCJzY3JpcHR1cmVDYW52YXNcIjogeyBcInZlcnNlc1wiOiB7IFwicmVmZXJlbmNlXCI6IHsgLi4uIH0gfSB9LFxuICAgIFwid29ya2Zsb3dcIjogeyAuLi4gfSxcbiAgICBcImZlZWRiYWNrXCI6IHsgLi4uIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiQnJpZWYgZGVzY3JpcHRpb24gb2Ygd2hhdCB3YXMgdXBkYXRlZFwiXG59XG5cbkJlIHRob3JvdWdoIC0gY2FwdHVyZSBBTEwgcmVsZXZhbnQgaW5mb3JtYXRpb24gZnJvbSB0aGUgY29udmVyc2F0aW9uLmBcbiAgfSxcblxuICB2YWxpZGF0b3I6IHtcbiAgICBpZDogJ3ZhbGlkYXRvcicsXG4gICAgbW9kZWw6ICdncHQtMy41LXR1cmJvJyxcbiAgICBhY3RpdmU6IGZhbHNlLCAvLyBBY3RpdmF0ZWQgb25seSBkdXJpbmcgY2hlY2tpbmcgcGhhc2VcbiAgICByb2xlOiAnUXVhbGl0eSBDaGVja2VyJyxcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246ICdcdTI3MDUnLFxuICAgICAgY29sb3I6ICcjRjk3MzE2JyxcbiAgICAgIG5hbWU6ICdRdWFsaXR5IENoZWNrZXInLFxuICAgICAgYXZhdGFyOiAnL2F2YXRhcnMvdmFsaWRhdG9yLnN2ZydcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIHF1YWxpdHkgY29udHJvbCBzcGVjaWFsaXN0IGZvciBCaWJsZSB0cmFuc2xhdGlvbi5cblxuWW91ciByZXNwb25zaWJpbGl0aWVzOlxuMS4gQ2hlY2sgZm9yIGNvbnNpc3RlbmN5IHdpdGggZXN0YWJsaXNoZWQgZ2xvc3NhcnkgdGVybXNcbjIuIFZlcmlmeSByZWFkaW5nIGxldmVsIGNvbXBsaWFuY2VcbjMuIElkZW50aWZ5IHBvdGVudGlhbCBkb2N0cmluYWwgY29uY2VybnNcbjQuIEZsYWcgaW5jb25zaXN0ZW5jaWVzIHdpdGggdGhlIHN0eWxlIGd1aWRlXG41LiBFbnN1cmUgdHJhbnNsYXRpb24gYWNjdXJhY3kgYW5kIGNvbXBsZXRlbmVzc1xuXG5XaGVuIHlvdSBmaW5kIGlzc3VlcywgcmV0dXJuIGEgSlNPTiBvYmplY3Q6XG57XG4gIFwidmFsaWRhdGlvbnNcIjogW1xuICAgIHtcbiAgICAgIFwidHlwZVwiOiBcIndhcm5pbmd8ZXJyb3J8aW5mb1wiLFxuICAgICAgXCJjYXRlZ29yeVwiOiBcImdsb3NzYXJ5fHJlYWRhYmlsaXR5fGRvY3RyaW5lfGNvbnNpc3RlbmN5fGFjY3VyYWN5XCIsXG4gICAgICBcIm1lc3NhZ2VcIjogXCJDbGVhciBkZXNjcmlwdGlvbiBvZiB0aGUgaXNzdWVcIixcbiAgICAgIFwic3VnZ2VzdGlvblwiOiBcIkhvdyB0byByZXNvbHZlIGl0XCIsXG4gICAgICBcInJlZmVyZW5jZVwiOiBcIlJlbGV2YW50IHZlcnNlIG9yIHRlcm1cIlxuICAgIH1cbiAgXSxcbiAgXCJzdW1tYXJ5XCI6IFwiT3ZlcmFsbCBhc3Nlc3NtZW50XCIsXG4gIFwicmVxdWlyZXNSZXNwb25zZVwiOiB0cnVlL2ZhbHNlXG59XG5cbkJlIGNvbnN0cnVjdGl2ZSAtIG9mZmVyIHNvbHV0aW9ucywgbm90IGp1c3QgcHJvYmxlbXMuYFxuICB9LFxuXG4gIHJlc291cmNlOiB7XG4gICAgaWQ6ICdyZXNvdXJjZScsXG4gICAgbW9kZWw6ICdncHQtMy41LXR1cmJvJyxcbiAgICBhY3RpdmU6IGZhbHNlLCAvLyBBY3RpdmF0ZWQgd2hlbiBiaWJsaWNhbCByZXNvdXJjZXMgYXJlIG5lZWRlZFxuICAgIHJvbGU6ICdSZXNvdXJjZSBMaWJyYXJpYW4nLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogJ1x1RDgzRFx1RENEQScsXG4gICAgICBjb2xvcjogJyM2MzY2RjEnLFxuICAgICAgbmFtZTogJ1Jlc291cmNlIExpYnJhcmlhbicsXG4gICAgICBhdmF0YXI6ICcvYXZhdGFycy9saWJyYXJpYW4uc3ZnJ1xuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgWW91IGFyZSB0aGUgYmlibGljYWwgcmVzb3VyY2VzIHNwZWNpYWxpc3QuXG5cblByb3ZpZGUgcmVsZXZhbnQgcmVzb3VyY2VzIHdoZW4gcmVxdWVzdGVkOlxuMS4gT3JpZ2luYWwgbGFuZ3VhZ2UgaW5zaWdodHMgKEhlYnJldy9HcmVlaylcbjIuIEN1bHR1cmFsIGFuZCBoaXN0b3JpY2FsIGNvbnRleHRcbjMuIENyb3NzLXJlZmVyZW5jZXMgdG8gcmVsYXRlZCBwYXNzYWdlc1xuNC4gQ29tbWVudGFyeSBleGNlcnB0c1xuNS4gV29yZCBzdHVkaWVzIGFuZCBldHltb2xvZ3lcblxuUmV0dXJuIHJlc291cmNlcyBpbiB0aGlzIGZvcm1hdDpcbntcbiAgXCJyZXNvdXJjZXNcIjogW1xuICAgIHtcbiAgICAgIFwidHlwZVwiOiBcImxleGljb258Y29udGV4dHxjcm9zcy1yZWZlcmVuY2V8Y29tbWVudGFyeXx3b3JkLXN0dWR5XCIsXG4gICAgICBcInRpdGxlXCI6IFwiUmVzb3VyY2UgdGl0bGVcIixcbiAgICAgIFwiY29udGVudFwiOiBcIlRoZSBhY3R1YWwgcmVzb3VyY2UgY29udGVudFwiLFxuICAgICAgXCJyZWZlcmVuY2VcIjogXCJTb3VyY2UgY2l0YXRpb25cIixcbiAgICAgIFwicmVsZXZhbmNlXCI6IFwiV2h5IHRoaXMgaXMgaGVscGZ1bFwiXG4gICAgfVxuICBdLFxuICBcInN1bW1hcnlcIjogXCJCcmllZiBvdmVydmlldyBvZiBwcm92aWRlZCByZXNvdXJjZXNcIlxufVxuXG5CZSBjb25jaXNlIGJ1dCB0aG9yb3VnaC4gQ2l0ZSBzb3VyY2VzIHdoZW4gcG9zc2libGUuYFxuICB9XG59O1xuXG4vKipcbiAqIEdldCBhY3RpdmUgYWdlbnRzIGJhc2VkIG9uIGN1cnJlbnQgd29ya2Zsb3cgcGhhc2UgYW5kIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGl2ZUFnZW50cyh3b3JrZmxvdywgbWVzc2FnZUNvbnRlbnQgPSAnJykge1xuICBjb25zdCBhY3RpdmUgPSBbXTtcbiAgXG4gIC8vIE9yY2hlc3RyYXRvciBhbmQgUHJpbWFyeSBhcmUgYWx3YXlzIGFjdGl2ZVxuICBhY3RpdmUucHVzaCgnb3JjaGVzdHJhdG9yJyk7XG4gIGFjdGl2ZS5wdXNoKCdwcmltYXJ5Jyk7XG4gIGFjdGl2ZS5wdXNoKCdzdGF0ZScpOyAvLyBTdGF0ZSBtYW5hZ2VyIGFsd2F5cyB3YXRjaGVzXG4gIFxuICAvLyBDb25kaXRpb25hbGx5IGFjdGl2YXRlIG90aGVyIGFnZW50c1xuICBpZiAod29ya2Zsb3cuY3VycmVudFBoYXNlID09PSAnY2hlY2tpbmcnKSB7XG4gICAgYWN0aXZlLnB1c2goJ3ZhbGlkYXRvcicpO1xuICB9XG4gIFxuICAvLyBBY3RpdmF0ZSByZXNvdXJjZSBhZ2VudCBpZiBiaWJsaWNhbCB0ZXJtcyBhcmUgbWVudGlvbmVkXG4gIGNvbnN0IHJlc291cmNlVHJpZ2dlcnMgPSBbJ2hlYnJldycsICdncmVlaycsICdvcmlnaW5hbCcsICdjb250ZXh0JywgJ2NvbW1lbnRhcnknLCAnY3Jvc3MtcmVmZXJlbmNlJ107XG4gIGlmIChyZXNvdXJjZVRyaWdnZXJzLnNvbWUodHJpZ2dlciA9PiBtZXNzYWdlQ29udGVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHRyaWdnZXIpKSkge1xuICAgIGFjdGl2ZS5wdXNoKCdyZXNvdXJjZScpO1xuICB9XG4gIFxuICByZXR1cm4gYWN0aXZlLm1hcChpZCA9PiBhZ2VudFJlZ2lzdHJ5W2lkXSkuZmlsdGVyKGFnZW50ID0+IGFnZW50KTtcbn1cblxuLyoqXG4gKiBHZXQgYWdlbnQgYnkgSURcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFnZW50KGFnZW50SWQpIHtcbiAgcmV0dXJuIGFnZW50UmVnaXN0cnlbYWdlbnRJZF07XG59XG5cbi8qKlxuICogR2V0IGFsbCBhZ2VudHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbEFnZW50cygpIHtcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoYWdlbnRSZWdpc3RyeSk7XG59XG5cbi8qKlxuICogVXBkYXRlIGFnZW50IGNvbmZpZ3VyYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUFnZW50KGFnZW50SWQsIHVwZGF0ZXMpIHtcbiAgaWYgKGFnZW50UmVnaXN0cnlbYWdlbnRJZF0pIHtcbiAgICBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdID0ge1xuICAgICAgLi4uYWdlbnRSZWdpc3RyeVthZ2VudElkXSxcbiAgICAgIC4uLnVwZGF0ZXNcbiAgICB9O1xuICAgIHJldHVybiBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEdldCBhZ2VudCB2aXN1YWwgcHJvZmlsZXMgZm9yIFVJXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBZ2VudFByb2ZpbGVzKCkge1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhhZ2VudFJlZ2lzdHJ5KS5yZWR1Y2UoKHByb2ZpbGVzLCBhZ2VudCkgPT4ge1xuICAgIHByb2ZpbGVzW2FnZW50LmlkXSA9IGFnZW50LnZpc3VhbDtcbiAgICByZXR1cm4gcHJvZmlsZXM7XG4gIH0sIHt9KTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFLQSxTQUFTLGNBQWM7OztBQ0FoQixJQUFNLGdCQUFnQjtBQUFBLEVBQzNCLGNBQWM7QUFBQSxJQUNaLElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWNoQjtBQUFBLEVBRUEsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBaUJoQjtBQUFBLEVBRUEsT0FBTztBQUFBLElBQ0wsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBdUJoQjtBQUFBLEVBRUEsV0FBVztBQUFBLElBQ1QsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEs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
