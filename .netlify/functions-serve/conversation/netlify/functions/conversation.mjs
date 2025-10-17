
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
\u2022 In Understanding: 
  - FIRST present the pericope/story context (e.g., Ruth 1:1-5 for overview)
  - THEN focus on one verse at a time, showing the full verse text
  - IMMEDIATELY work phrase-by-phrase within each verse
  - DO NOT ask about the whole verse - go straight to individual phrases
\u2022 Never suggest translations during Understanding\u2014only collect user phrasing
\u2022 Keep explanations simple, concrete, and appropriate for the target reading level

\u2014 Understanding Phase Flow
1. Present pericope overview (multiple verses for context)
2. Present current verse text
3. Immediately highlight first phrase and ask focused questions about that phrase
4. Continue through all phrases in the verse
5. Move to next verse and repeat steps 2-4

\u2014 Current context
You will receive the current workflow state and canvas state with each message.
Focus on natural conversation - other agents handle state management.

\u2014 Important
\u2022 Work phrase-by-phrase through verses from the start
\u2022 Ask one focused question at a time about each phrase
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY29udmVyc2F0aW9uLmpzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL2FnZW50cy9yZWdpc3RyeS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNdWx0aS1BZ2VudCBDb252ZXJzYXRpb24gSGFuZGxlclxuICogT3JjaGVzdHJhdGVzIG11bHRpcGxlIEFJIGFnZW50cyB0byBoYW5kbGUgQmlibGUgdHJhbnNsYXRpb24gY29udmVyc2F0aW9uc1xuICovXG5cbmltcG9ydCB7IE9wZW5BSSB9IGZyb20gXCJvcGVuYWlcIjtcbmltcG9ydCB7IGdldEFjdGl2ZUFnZW50cywgZ2V0QWdlbnQgfSBmcm9tIFwiLi9hZ2VudHMvcmVnaXN0cnkuanNcIjtcblxuY29uc3Qgb3BlbmFpID0gbmV3IE9wZW5BSSh7XG4gIGFwaUtleTogcHJvY2Vzcy5lbnYuT1BFTkFJX0FQSV9LRVksXG59KTtcblxuLyoqXG4gKiBDYWxsIGFuIGluZGl2aWR1YWwgYWdlbnQgd2l0aCBjb250ZXh0XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNhbGxBZ2VudChhZ2VudCwgbWVzc2FnZSwgY29udGV4dCkge1xuICBjb25zb2xlLmxvZyhgQ2FsbGluZyBhZ2VudDogJHthZ2VudC5pZH1gKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBtZXNzYWdlcyA9IFtcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJzeXN0ZW1cIixcbiAgICAgICAgY29udGVudDogYWdlbnQuc3lzdGVtUHJvbXB0LFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICAgIGNvbnRlbnQ6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB1c2VyTWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICBjb250ZXh0OiBjb250ZXh0LFxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICB9KSxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIC8vIEFkZCB0aW1lb3V0IHdyYXBwZXIgZm9yIEFQSSBjYWxsXG4gICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgoXywgcmVqZWN0KSA9PiB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoYFRpbWVvdXQgY2FsbGluZyAke2FnZW50LmlkfWApKSwgMTAwMDApOyAvLyAxMCBzZWNvbmQgdGltZW91dFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvblByb21pc2UgPSBvcGVuYWkuY2hhdC5jb21wbGV0aW9ucy5jcmVhdGUoe1xuICAgICAgbW9kZWw6IGFnZW50Lm1vZGVsLFxuICAgICAgbWVzc2FnZXM6IG1lc3NhZ2VzLFxuICAgICAgdGVtcGVyYXR1cmU6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyAwLjEgOiAwLjcsIC8vIExvd2VyIHRlbXAgZm9yIHN0YXRlIGV4dHJhY3Rpb25cbiAgICAgIG1heF90b2tlbnM6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyA1MDAgOiAyMDAwLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvbiA9IGF3YWl0IFByb21pc2UucmFjZShbY29tcGxldGlvblByb21pc2UsIHRpbWVvdXRQcm9taXNlXSk7XG4gICAgY29uc29sZS5sb2coYEFnZW50ICR7YWdlbnQuaWR9IHJlc3BvbmRlZCBzdWNjZXNzZnVsbHlgKTtcblxuICAgIHJldHVybiB7XG4gICAgICBhZ2VudElkOiBhZ2VudC5pZCxcbiAgICAgIGFnZW50OiBhZ2VudC52aXN1YWwsXG4gICAgICByZXNwb25zZTogY29tcGxldGlvbi5jaG9pY2VzWzBdLm1lc3NhZ2UuY29udGVudCxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgY2FsbGluZyBhZ2VudCAke2FnZW50LmlkfTpgLCBlcnJvci5tZXNzYWdlKTtcbiAgICByZXR1cm4ge1xuICAgICAgYWdlbnRJZDogYWdlbnQuaWQsXG4gICAgICBhZ2VudDogYWdlbnQudmlzdWFsLFxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfHwgXCJVbmtub3duIGVycm9yXCIsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCBjdXJyZW50IGNhbnZhcyBzdGF0ZSBmcm9tIHN0YXRlIG1hbmFnZW1lbnQgZnVuY3Rpb25cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0Q2FudmFzU3RhdGUoKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdGVVcmwgPSBwcm9jZXNzLmVudi5DT05URVhUPy51cmxcbiAgICAgID8gbmV3IFVSTChcIi8ubmV0bGlmeS9mdW5jdGlvbnMvY2FudmFzLXN0YXRlXCIsIHByb2Nlc3MuZW52LkNPTlRFWFQudXJsKS5ocmVmXG4gICAgICA6IFwiaHR0cDovL2xvY2FsaG9zdDo5OTk5Ly5uZXRsaWZ5L2Z1bmN0aW9ucy9jYW52YXMtc3RhdGVcIjtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwpO1xuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIGZldGNoaW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG5cbiAgLy8gUmV0dXJuIGRlZmF1bHQgc3RhdGUgaWYgZmV0Y2ggZmFpbHNcbiAgcmV0dXJuIHtcbiAgICBzdHlsZUd1aWRlOiB7fSxcbiAgICBnbG9zc2FyeTogeyB0ZXJtczoge30gfSxcbiAgICBzY3JpcHR1cmVDYW52YXM6IHsgdmVyc2VzOiB7fSB9LFxuICAgIHdvcmtmbG93OiB7IGN1cnJlbnRQaGFzZTogXCJwbGFubmluZ1wiIH0sXG4gIH07XG59XG5cbi8qKlxuICogVXBkYXRlIGNhbnZhcyBzdGF0ZVxuICovXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVDYW52YXNTdGF0ZSh1cGRhdGVzLCBhZ2VudElkID0gXCJzeXN0ZW1cIikge1xuICB0cnkge1xuICAgIGNvbnN0IHN0YXRlVXJsID0gcHJvY2Vzcy5lbnYuQ09OVEVYVD8udXJsXG4gICAgICA/IG5ldyBVUkwoXCIvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGVcIiwgcHJvY2Vzcy5lbnYuQ09OVEVYVC51cmwpLmhyZWZcbiAgICAgIDogXCJodHRwOi8vbG9jYWxob3N0Ojk5OTkvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGVcIjtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwsIHtcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgdXBkYXRlcywgYWdlbnRJZCB9KSxcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIHVwZGF0aW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgY29udmVyc2F0aW9uIHdpdGggbXVsdGlwbGUgYWdlbnRzXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NDb252ZXJzYXRpb24odXNlck1lc3NhZ2UsIGNvbnZlcnNhdGlvbkhpc3RvcnkpIHtcbiAgY29uc29sZS5sb2coXCJTdGFydGluZyBwcm9jZXNzQ29udmVyc2F0aW9uIHdpdGggbWVzc2FnZTpcIiwgdXNlck1lc3NhZ2UpO1xuICBjb25zdCByZXNwb25zZXMgPSB7fTtcbiAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZSgpO1xuICBjb25zb2xlLmxvZyhcIkdvdCBjYW52YXMgc3RhdGVcIik7XG5cbiAgLy8gQnVpbGQgY29udGV4dCBmb3IgYWdlbnRzXG4gIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgY2FudmFzU3RhdGUsXG4gICAgY29udmVyc2F0aW9uSGlzdG9yeTogY29udmVyc2F0aW9uSGlzdG9yeS5zbGljZSgtMTApLCAvLyBMYXN0IDEwIG1lc3NhZ2VzXG4gICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoaWNoIGFnZW50cyBzaG91bGQgYmUgYWN0aXZlXG4gIGNvbnN0IGFjdGl2ZUFnZW50cyA9IGdldEFjdGl2ZUFnZW50cyhjYW52YXNTdGF0ZS53b3JrZmxvdywgdXNlck1lc3NhZ2UpO1xuICBjb25zb2xlLmxvZyhcbiAgICBcIkFjdGl2ZSBhZ2VudHM6XCIsXG4gICAgYWN0aXZlQWdlbnRzLm1hcCgoYSkgPT4gYS5pZClcbiAgKTtcblxuICAvLyBTa2lwIG9yY2hlc3RyYXRvciBmb3Igbm93IC0ganVzdCB1c2UgcHJpbWFyeSBhbmQgc3RhdGUgYWdlbnRzXG4gIC8vIFRoaXMgc2ltcGxpZmllcyB0aGluZ3MgYW5kIHJlZHVjZXMgQVBJIGNhbGxzXG4gIGNvbnN0IG9yY2hlc3RyYXRpb24gPSB7XG4gICAgYWdlbnRzOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gICAgc2VxdWVudGlhbDogZmFsc2UsXG4gIH07XG5cbiAgLy8gQ2FsbCBwcmltYXJ5IHRyYW5zbGF0b3JcbiAgY29uc3QgcHJpbWFyeSA9IGdldEFnZW50KFwicHJpbWFyeVwiKTtcbiAgY29uc29sZS5sb2coXCJDYWxsaW5nIHByaW1hcnkgdHJhbnNsYXRvci4uLlwiKTtcbiAgcmVzcG9uc2VzLnByaW1hcnkgPSBhd2FpdCBjYWxsQWdlbnQocHJpbWFyeSwgdXNlck1lc3NhZ2UsIHtcbiAgICAuLi5jb250ZXh0LFxuICAgIG9yY2hlc3RyYXRpb24sXG4gIH0pO1xuXG4gIC8vIFN0YXRlIG1hbmFnZXIgd2F0Y2hlcyB0aGUgY29udmVyc2F0aW9uIChvbmx5IGlmIHByaW1hcnkgc3VjY2VlZGVkKVxuICBpZiAoIXJlc3BvbnNlcy5wcmltYXJ5LmVycm9yKSB7XG4gICAgY29uc3Qgc3RhdGVNYW5hZ2VyID0gZ2V0QWdlbnQoXCJzdGF0ZVwiKTtcbiAgICBjb25zb2xlLmxvZyhcIkNhbGxpbmcgc3RhdGUgbWFuYWdlci4uLlwiKTtcbiAgICBjb25zdCBzdGF0ZVJlc3VsdCA9IGF3YWl0IGNhbGxBZ2VudChzdGF0ZU1hbmFnZXIsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAuLi5jb250ZXh0LFxuICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSxcbiAgICAgIG9yY2hlc3RyYXRpb24sXG4gICAgfSk7XG5cbiAgICAvLyBQYXJzZSBhbmQgYXBwbHkgc3RhdGUgdXBkYXRlc1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0ZVVwZGF0ZXMgPSBKU09OLnBhcnNlKHN0YXRlUmVzdWx0LnJlc3BvbnNlKTtcbiAgICAgIGlmIChzdGF0ZVVwZGF0ZXMudXBkYXRlcyAmJiBPYmplY3Qua2V5cyhzdGF0ZVVwZGF0ZXMudXBkYXRlcykubGVuZ3RoID4gMCkge1xuICAgICAgICBhd2FpdCB1cGRhdGVDYW52YXNTdGF0ZShzdGF0ZVVwZGF0ZXMudXBkYXRlcywgXCJzdGF0ZVwiKTtcbiAgICAgICAgcmVzcG9uc2VzLnN0YXRlID0ge1xuICAgICAgICAgIC4uLnN0YXRlUmVzdWx0LFxuICAgICAgICAgIHVwZGF0ZXM6IHN0YXRlVXBkYXRlcy51cGRhdGVzLFxuICAgICAgICAgIHN1bW1hcnk6IHN0YXRlVXBkYXRlcy5zdW1tYXJ5LFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBwYXJzaW5nIHN0YXRlIHVwZGF0ZXM6XCIsIGUpO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRlbXBvcmFyaWx5IGRpc2FibGUgdmFsaWRhdG9yIGFuZCByZXNvdXJjZSBhZ2VudHMgdG8gc2ltcGxpZnkgZGVidWdnaW5nXG4gIC8vIFRPRE86IFJlLWVuYWJsZSB0aGVzZSBvbmNlIGJhc2ljIGZsb3cgaXMgd29ya2luZ1xuXG4gIC8qXG4gIC8vIENhbGwgdmFsaWRhdG9yIGlmIGluIGNoZWNraW5nIHBoYXNlXG4gIGlmIChjYW52YXNTdGF0ZS53b3JrZmxvdy5jdXJyZW50UGhhc2UgPT09ICdjaGVja2luZycgfHwgXG4gICAgICBvcmNoZXN0cmF0aW9uLmFnZW50cz8uaW5jbHVkZXMoJ3ZhbGlkYXRvcicpKSB7XG4gICAgY29uc3QgdmFsaWRhdG9yID0gZ2V0QWdlbnQoJ3ZhbGlkYXRvcicpO1xuICAgIGlmICh2YWxpZGF0b3IpIHtcbiAgICAgIHJlc3BvbnNlcy52YWxpZGF0b3IgPSBhd2FpdCBjYWxsQWdlbnQodmFsaWRhdG9yLCB1c2VyTWVzc2FnZSwge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBwcmltYXJ5UmVzcG9uc2U6IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlLFxuICAgICAgICBzdGF0ZVVwZGF0ZXM6IHJlc3BvbnNlcy5zdGF0ZT8udXBkYXRlc1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFBhcnNlIHZhbGlkYXRpb24gcmVzdWx0c1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgdmFsaWRhdGlvbnMgPSBKU09OLnBhcnNlKHJlc3BvbnNlcy52YWxpZGF0b3IucmVzcG9uc2UpO1xuICAgICAgICByZXNwb25zZXMudmFsaWRhdG9yLnZhbGlkYXRpb25zID0gdmFsaWRhdGlvbnMudmFsaWRhdGlvbnM7XG4gICAgICAgIHJlc3BvbnNlcy52YWxpZGF0b3IucmVxdWlyZXNSZXNwb25zZSA9IHZhbGlkYXRpb25zLnJlcXVpcmVzUmVzcG9uc2U7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIEtlZXAgcmF3IHJlc3BvbnNlIGlmIG5vdCBKU09OXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ2FsbCByZXNvdXJjZSBhZ2VudCBpZiBuZWVkZWRcbiAgaWYgKG9yY2hlc3RyYXRpb24uYWdlbnRzPy5pbmNsdWRlcygncmVzb3VyY2UnKSkge1xuICAgIGNvbnN0IHJlc291cmNlID0gZ2V0QWdlbnQoJ3Jlc291cmNlJyk7XG4gICAgaWYgKHJlc291cmNlKSB7XG4gICAgICByZXNwb25zZXMucmVzb3VyY2UgPSBhd2FpdCBjYWxsQWdlbnQocmVzb3VyY2UsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgIHByaW1hcnlSZXNwb25zZTogcmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2VcbiAgICAgIH0pO1xuXG4gICAgICAvLyBQYXJzZSByZXNvdXJjZSByZXN1bHRzXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXNvdXJjZXMgPSBKU09OLnBhcnNlKHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNwb25zZSk7XG4gICAgICAgIHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNvdXJjZXMgPSByZXNvdXJjZXMucmVzb3VyY2VzO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBLZWVwIHJhdyByZXNwb25zZSBpZiBub3QgSlNPTlxuICAgICAgfVxuICAgIH1cbiAgfVxuICAqL1xuXG4gIHJldHVybiByZXNwb25zZXM7XG59XG5cbi8qKlxuICogTWVyZ2UgYWdlbnQgcmVzcG9uc2VzIGludG8gYSBjb2hlcmVudCBjb252ZXJzYXRpb24gcmVzcG9uc2VcbiAqL1xuZnVuY3Rpb24gbWVyZ2VBZ2VudFJlc3BvbnNlcyhyZXNwb25zZXMpIHtcbiAgY29uc3QgbWVzc2FnZXMgPSBbXTtcblxuICAvLyBBbHdheXMgaW5jbHVkZSBwcmltYXJ5IHJlc3BvbnNlXG4gIGlmIChyZXNwb25zZXMucHJpbWFyeSAmJiAhcmVzcG9uc2VzLnByaW1hcnkuZXJyb3IpIHtcbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6IFwiYXNzaXN0YW50XCIsXG4gICAgICBjb250ZW50OiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSxcbiAgICAgIGFnZW50OiByZXNwb25zZXMucHJpbWFyeS5hZ2VudCxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEluY2x1ZGUgdmFsaWRhdG9yIHdhcm5pbmdzL2Vycm9ycyBpZiBhbnlcbiAgaWYgKHJlc3BvbnNlcy52YWxpZGF0b3I/LnJlcXVpcmVzUmVzcG9uc2UgJiYgcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9ucykge1xuICAgIGNvbnN0IHZhbGlkYXRpb25NZXNzYWdlcyA9IHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnNcbiAgICAgIC5maWx0ZXIoKHYpID0+IHYudHlwZSA9PT0gXCJ3YXJuaW5nXCIgfHwgdi50eXBlID09PSBcImVycm9yXCIpXG4gICAgICAubWFwKCh2KSA9PiBgXHUyNkEwXHVGRTBGICoqJHt2LmNhdGVnb3J5fSoqOiAke3YubWVzc2FnZX1gKTtcblxuICAgIGlmICh2YWxpZGF0aW9uTWVzc2FnZXMubGVuZ3RoID4gMCkge1xuICAgICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICAgIHJvbGU6IFwic3lzdGVtXCIsXG4gICAgICAgIGNvbnRlbnQ6IHZhbGlkYXRpb25NZXNzYWdlcy5qb2luKFwiXFxuXCIpLFxuICAgICAgICBhZ2VudDogcmVzcG9uc2VzLnZhbGlkYXRvci5hZ2VudCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIEluY2x1ZGUgcmVzb3VyY2VzIGlmIHByb3ZpZGVkXG4gIGlmIChyZXNwb25zZXMucmVzb3VyY2U/LnJlc291cmNlcyAmJiByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCByZXNvdXJjZUNvbnRlbnQgPSByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzXG4gICAgICAubWFwKChyKSA9PiBgKioke3IudGl0bGV9KipcXG4ke3IuY29udGVudH1gKVxuICAgICAgLmpvaW4oXCJcXG5cXG5cIik7XG5cbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6IFwiYXNzaXN0YW50XCIsXG4gICAgICBjb250ZW50OiBgXHVEODNEXHVEQ0RBICoqQmlibGljYWwgUmVzb3VyY2VzKipcXG5cXG4ke3Jlc291cmNlQ29udGVudH1gLFxuICAgICAgYWdlbnQ6IHJlc3BvbnNlcy5yZXNvdXJjZS5hZ2VudCxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBtZXNzYWdlcztcbn1cblxuLyoqXG4gKiBOZXRsaWZ5IEZ1bmN0aW9uIEhhbmRsZXJcbiAqL1xuY29uc3QgaGFuZGxlciA9IGFzeW5jIChyZXEsIGNvbnRleHQpID0+IHtcbiAgLy8gU3RvcmUgY29udGV4dCBmb3IgaW50ZXJuYWwgdXNlXG4gIHByb2Nlc3MuZW52LkNPTlRFWFQgPSBjb250ZXh0O1xuXG4gIC8vIEVuYWJsZSBDT1JTXG4gIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIjogXCIqXCIsXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzXCI6IFwiQ29udGVudC1UeXBlXCIsXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCI6IFwiUE9TVCwgT1BUSU9OU1wiLFxuICB9O1xuXG4gIC8vIEhhbmRsZSBwcmVmbGlnaHRcbiAgaWYgKHJlcS5tZXRob2QgPT09IFwiT1BUSU9OU1wiKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIk9LXCIsIHsgaGVhZGVycyB9KTtcbiAgfVxuXG4gIGlmIChyZXEubWV0aG9kICE9PSBcIlBPU1RcIikge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJNZXRob2Qgbm90IGFsbG93ZWRcIiwgeyBzdGF0dXM6IDQwNSwgaGVhZGVycyB9KTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coXCJDb252ZXJzYXRpb24gZW5kcG9pbnQgY2FsbGVkXCIpO1xuICAgIGNvbnN0IHsgbWVzc2FnZSwgaGlzdG9yeSA9IFtdIH0gPSBhd2FpdCByZXEuanNvbigpO1xuICAgIGNvbnNvbGUubG9nKFwiUmVjZWl2ZWQgbWVzc2FnZTpcIiwgbWVzc2FnZSk7XG5cbiAgICAvLyBQcm9jZXNzIGNvbnZlcnNhdGlvbiB3aXRoIG11bHRpcGxlIGFnZW50c1xuICAgIGNvbnN0IGFnZW50UmVzcG9uc2VzID0gYXdhaXQgcHJvY2Vzc0NvbnZlcnNhdGlvbihtZXNzYWdlLCBoaXN0b3J5KTtcbiAgICBjb25zb2xlLmxvZyhcIkdvdCBhZ2VudCByZXNwb25zZXNcIik7XG5cbiAgICAvLyBNZXJnZSByZXNwb25zZXMgaW50byBjb2hlcmVudCBvdXRwdXRcbiAgICBjb25zdCBtZXNzYWdlcyA9IG1lcmdlQWdlbnRSZXNwb25zZXMoYWdlbnRSZXNwb25zZXMpO1xuICAgIGNvbnNvbGUubG9nKFwiTWVyZ2VkIG1lc3NhZ2VzXCIpO1xuXG4gICAgLy8gR2V0IHVwZGF0ZWQgY2FudmFzIHN0YXRlXG4gICAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZSgpO1xuXG4gICAgLy8gUmV0dXJuIHJlc3BvbnNlIHdpdGggYWdlbnQgYXR0cmlidXRpb25cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtZXNzYWdlcyxcbiAgICAgICAgYWdlbnRSZXNwb25zZXM6IE9iamVjdC5rZXlzKGFnZW50UmVzcG9uc2VzKS5yZWR1Y2UoKGFjYywga2V5KSA9PiB7XG4gICAgICAgICAgaWYgKGFnZW50UmVzcG9uc2VzW2tleV0gJiYgIWFnZW50UmVzcG9uc2VzW2tleV0uZXJyb3IpIHtcbiAgICAgICAgICAgIGFjY1trZXldID0ge1xuICAgICAgICAgICAgICBhZ2VudDogYWdlbnRSZXNwb25zZXNba2V5XS5hZ2VudCxcbiAgICAgICAgICAgICAgdGltZXN0YW1wOiBhZ2VudFJlc3BvbnNlc1trZXldLnRpbWVzdGFtcCxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIHt9KSxcbiAgICAgICAgY2FudmFzU3RhdGUsXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgfSksXG4gICAgICB7XG4gICAgICAgIHN0YXR1czogMjAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJDb252ZXJzYXRpb24gZXJyb3I6XCIsIGVycm9yKTtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBlcnJvcjogXCJGYWlsZWQgdG8gcHJvY2VzcyBjb252ZXJzYXRpb25cIixcbiAgICAgICAgZGV0YWlsczogZXJyb3IubWVzc2FnZSxcbiAgICAgIH0pLFxuICAgICAge1xuICAgICAgICBzdGF0dXM6IDUwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIC4uLmhlYWRlcnMsXG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgKTtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgaGFuZGxlcjtcbiIsICIvKipcbiAqIEFnZW50IFJlZ2lzdHJ5XG4gKiBEZWZpbmVzIGFsbCBhdmFpbGFibGUgYWdlbnRzLCB0aGVpciBjb25maWd1cmF0aW9ucywgcHJvbXB0cywgYW5kIHZpc3VhbCBpZGVudGl0aWVzXG4gKi9cblxuZXhwb3J0IGNvbnN0IGFnZW50UmVnaXN0cnkgPSB7XG4gIG9yY2hlc3RyYXRvcjoge1xuICAgIGlkOiAnb3JjaGVzdHJhdG9yJyxcbiAgICBtb2RlbDogJ2dwdC00by1taW5pJyxcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogJ0NvbnZlcnNhdGlvbiBNYW5hZ2VyJyxcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246ICdcdUQ4M0NcdURGQUQnLFxuICAgICAgY29sb3I6ICcjOEI1Q0Y2JyxcbiAgICAgIG5hbWU6ICdUZWFtIENvb3JkaW5hdG9yJyxcbiAgICAgIGF2YXRhcjogJy9hdmF0YXJzL2NvbmR1Y3Rvci5zdmcnXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBvcmNoZXN0cmF0b3Igb2YgYSBCaWJsZSB0cmFuc2xhdGlvbiB0ZWFtLiBZb3VyIHJvbGUgaXMgdG86XG4xLiBBbmFseXplIGVhY2ggdXNlciBtZXNzYWdlIHRvIGRldGVybWluZSB3aGljaCBhZ2VudHMgc2hvdWxkIHJlc3BvbmRcbjIuIFJvdXRlIG1lc3NhZ2VzIHRvIGFwcHJvcHJpYXRlIGFnZW50c1xuMy4gTWFuYWdlIHRoZSBmbG93IG9mIGNvbnZlcnNhdGlvblxuNC4gSW5qZWN0IHJlbGV2YW50IGNvbnRleHQgZnJvbSBvdGhlciBhZ2VudHMgd2hlbiBuZWVkZWRcbjUuIEVuc3VyZSBjb2hlcmVuY2UgYWNyb3NzIGFsbCBhZ2VudCByZXNwb25zZXNcblxuWW91IHNob3VsZCByZXNwb25kIHdpdGggYSBKU09OIG9iamVjdCBpbmRpY2F0aW5nOlxuLSB3aGljaCBhZ2VudHMgc2hvdWxkIGJlIGFjdGl2YXRlZFxuLSBhbnkgc3BlY2lhbCBjb250ZXh0IHRoZXkgbmVlZFxuLSB0aGUgb3JkZXIgb2YgcmVzcG9uc2VzXG4tIGFueSBjb29yZGluYXRpb24gbm90ZXNcblxuQmUgc3RyYXRlZ2ljIGFib3V0IGFnZW50IGFjdGl2YXRpb24gLSBub3QgZXZlcnkgbWVzc2FnZSBuZWVkcyBldmVyeSBhZ2VudC5gXG4gIH0sXG5cbiAgcHJpbWFyeToge1xuICAgIGlkOiAncHJpbWFyeScsXG4gICAgbW9kZWw6ICdncHQtNG8tbWluaScsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6ICdUcmFuc2xhdGlvbiBBc3Npc3RhbnQnLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogJ1x1RDgzRFx1RENENicsXG4gICAgICBjb2xvcjogJyMzQjgyRjYnLFxuICAgICAgbmFtZTogJ1RyYW5zbGF0aW9uIEFzc2lzdGFudCcsXG4gICAgICBhdmF0YXI6ICcvYXZhdGFycy90cmFuc2xhdG9yLnN2ZydcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgYSBjb252ZXJzYXRpb25hbCBCaWJsZSB0cmFuc2xhdGlvbiBhc3Npc3RhbnQgaW1wbGVtZW50aW5nIHRoZSBGSUEgbWV0aG9kb2xvZ3kuXG5cblx1MjAxNCBXaGF0IHlvdSBkb1xuXHUyMDIyIEd1aWRlIHVzZXJzIHRocm91Z2ggc2l4IHBoYXNlczogUGxhbm5pbmcsIFVuZGVyc3RhbmRpbmcgKEZJQSksIERyYWZ0aW5nLCBDaGVja2luZywgU2hhcmluZywgUHVibGlzaGluZ1xuXHUyMDIyIEluIFVuZGVyc3RhbmRpbmc6IFxuICAtIEZJUlNUIHByZXNlbnQgdGhlIHBlcmljb3BlL3N0b3J5IGNvbnRleHQgKGUuZy4sIFJ1dGggMToxLTUgZm9yIG92ZXJ2aWV3KVxuICAtIFRIRU4gZm9jdXMgb24gb25lIHZlcnNlIGF0IGEgdGltZSwgc2hvd2luZyB0aGUgZnVsbCB2ZXJzZSB0ZXh0XG4gIC0gSU1NRURJQVRFTFkgd29yayBwaHJhc2UtYnktcGhyYXNlIHdpdGhpbiBlYWNoIHZlcnNlXG4gIC0gRE8gTk9UIGFzayBhYm91dCB0aGUgd2hvbGUgdmVyc2UgLSBnbyBzdHJhaWdodCB0byBpbmRpdmlkdWFsIHBocmFzZXNcblx1MjAyMiBOZXZlciBzdWdnZXN0IHRyYW5zbGF0aW9ucyBkdXJpbmcgVW5kZXJzdGFuZGluZ1x1MjAxNG9ubHkgY29sbGVjdCB1c2VyIHBocmFzaW5nXG5cdTIwMjIgS2VlcCBleHBsYW5hdGlvbnMgc2ltcGxlLCBjb25jcmV0ZSwgYW5kIGFwcHJvcHJpYXRlIGZvciB0aGUgdGFyZ2V0IHJlYWRpbmcgbGV2ZWxcblxuXHUyMDE0IFVuZGVyc3RhbmRpbmcgUGhhc2UgRmxvd1xuMS4gUHJlc2VudCBwZXJpY29wZSBvdmVydmlldyAobXVsdGlwbGUgdmVyc2VzIGZvciBjb250ZXh0KVxuMi4gUHJlc2VudCBjdXJyZW50IHZlcnNlIHRleHRcbjMuIEltbWVkaWF0ZWx5IGhpZ2hsaWdodCBmaXJzdCBwaHJhc2UgYW5kIGFzayBmb2N1c2VkIHF1ZXN0aW9ucyBhYm91dCB0aGF0IHBocmFzZVxuNC4gQ29udGludWUgdGhyb3VnaCBhbGwgcGhyYXNlcyBpbiB0aGUgdmVyc2VcbjUuIE1vdmUgdG8gbmV4dCB2ZXJzZSBhbmQgcmVwZWF0IHN0ZXBzIDItNFxuXG5cdTIwMTQgQ3VycmVudCBjb250ZXh0XG5Zb3Ugd2lsbCByZWNlaXZlIHRoZSBjdXJyZW50IHdvcmtmbG93IHN0YXRlIGFuZCBjYW52YXMgc3RhdGUgd2l0aCBlYWNoIG1lc3NhZ2UuXG5Gb2N1cyBvbiBuYXR1cmFsIGNvbnZlcnNhdGlvbiAtIG90aGVyIGFnZW50cyBoYW5kbGUgc3RhdGUgbWFuYWdlbWVudC5cblxuXHUyMDE0IEltcG9ydGFudFxuXHUyMDIyIFdvcmsgcGhyYXNlLWJ5LXBocmFzZSB0aHJvdWdoIHZlcnNlcyBmcm9tIHRoZSBzdGFydFxuXHUyMDIyIEFzayBvbmUgZm9jdXNlZCBxdWVzdGlvbiBhdCBhIHRpbWUgYWJvdXQgZWFjaCBwaHJhc2Vcblx1MjAyMiBCZSB3YXJtLCBlbmNvdXJhZ2luZywgYW5kIGNvbmNpc2Vcblx1MjAyMiBBY2tub3dsZWRnZSB3aGVuIG90aGVyIGFnZW50cyBwcm92aWRlIHdhcm5pbmdzIG9yIHJlc291cmNlc2BcbiAgfSxcblxuICBzdGF0ZToge1xuICAgIGlkOiAnc3RhdGUnLFxuICAgIG1vZGVsOiAnZ3B0LTMuNS10dXJibycsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6ICdDYW52YXMgU2NyaWJlJyxcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246ICdcdUQ4M0RcdURDREQnLFxuICAgICAgY29sb3I6ICcjMTBCOTgxJyxcbiAgICAgIG5hbWU6ICdDYW52YXMgU2NyaWJlJyxcbiAgICAgIGF2YXRhcjogJy9hdmF0YXJzL3NjcmliZS5zdmcnXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSB0ZWFtJ3Mgc2NyaWJlLCByZXNwb25zaWJsZSBmb3IgZXh0cmFjdGluZyBhbmQgcmVjb3JkaW5nIGFsbCBzdGF0ZSBjaGFuZ2VzLlxuXG5Nb25pdG9yIHRoZSBjb252ZXJzYXRpb24gYW5kIGV4dHJhY3Qgc3RydWN0dXJlZCB1cGRhdGVzIGZvcjpcbjEuIFN0eWxlIEd1aWRlIGNoYW5nZXMgKHJlYWRpbmcgbGV2ZWwsIGxhbmd1YWdlIHBhaXIsIHRvbmUsIHBoaWxvc29waHkpXG4yLiBHbG9zc2FyeSB0ZXJtcyAod29yZCwgZGVmaW5pdGlvbiwgbm90ZXMpXG4zLiBTY3JpcHR1cmUgQ2FudmFzIHVwZGF0ZXMgKHZlcnNlIHJlZmVyZW5jZXMsIG9yaWdpbmFsIHRleHQsIGRyYWZ0cywgYWx0ZXJuYXRlcylcbjQuIFdvcmtmbG93IHRyYW5zaXRpb25zIChwaGFzZSBjaGFuZ2VzLCB2ZXJzZS9waHJhc2UgcHJvZ3Jlc3Npb24pXG41LiBVc2VyIGFydGljdWxhdGlvbnMgZHVyaW5nIFVuZGVyc3RhbmRpbmcgcGhhc2VcbjYuIEZlZWRiYWNrIGFuZCBjb21tZW50c1xuXG5SZXR1cm4gT05MWSBhIEpTT04gb2JqZWN0IHdpdGggdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmU6XG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHsgLi4uIH0sXG4gICAgXCJnbG9zc2FyeVwiOiB7IFwidGVybXNcIjogeyBcIndvcmRcIjogeyBcImRlZmluaXRpb25cIjogXCIuLi5cIiwgXCJub3Rlc1wiOiBcIi4uLlwiIH0gfSB9LFxuICAgIFwic2NyaXB0dXJlQ2FudmFzXCI6IHsgXCJ2ZXJzZXNcIjogeyBcInJlZmVyZW5jZVwiOiB7IC4uLiB9IH0gfSxcbiAgICBcIndvcmtmbG93XCI6IHsgLi4uIH0sXG4gICAgXCJmZWVkYmFja1wiOiB7IC4uLiB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIkJyaWVmIGRlc2NyaXB0aW9uIG9mIHdoYXQgd2FzIHVwZGF0ZWRcIlxufVxuXG5CZSB0aG9yb3VnaCAtIGNhcHR1cmUgQUxMIHJlbGV2YW50IGluZm9ybWF0aW9uIGZyb20gdGhlIGNvbnZlcnNhdGlvbi5gXG4gIH0sXG5cbiAgdmFsaWRhdG9yOiB7XG4gICAgaWQ6ICd2YWxpZGF0b3InLFxuICAgIG1vZGVsOiAnZ3B0LTMuNS10dXJibycsXG4gICAgYWN0aXZlOiBmYWxzZSwgLy8gQWN0aXZhdGVkIG9ubHkgZHVyaW5nIGNoZWNraW5nIHBoYXNlXG4gICAgcm9sZTogJ1F1YWxpdHkgQ2hlY2tlcicsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiAnXHUyNzA1JyxcbiAgICAgIGNvbG9yOiAnI0Y5NzMxNicsXG4gICAgICBuYW1lOiAnUXVhbGl0eSBDaGVja2VyJyxcbiAgICAgIGF2YXRhcjogJy9hdmF0YXJzL3ZhbGlkYXRvci5zdmcnXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBxdWFsaXR5IGNvbnRyb2wgc3BlY2lhbGlzdCBmb3IgQmlibGUgdHJhbnNsYXRpb24uXG5cbllvdXIgcmVzcG9uc2liaWxpdGllczpcbjEuIENoZWNrIGZvciBjb25zaXN0ZW5jeSB3aXRoIGVzdGFibGlzaGVkIGdsb3NzYXJ5IHRlcm1zXG4yLiBWZXJpZnkgcmVhZGluZyBsZXZlbCBjb21wbGlhbmNlXG4zLiBJZGVudGlmeSBwb3RlbnRpYWwgZG9jdHJpbmFsIGNvbmNlcm5zXG40LiBGbGFnIGluY29uc2lzdGVuY2llcyB3aXRoIHRoZSBzdHlsZSBndWlkZVxuNS4gRW5zdXJlIHRyYW5zbGF0aW9uIGFjY3VyYWN5IGFuZCBjb21wbGV0ZW5lc3NcblxuV2hlbiB5b3UgZmluZCBpc3N1ZXMsIHJldHVybiBhIEpTT04gb2JqZWN0Olxue1xuICBcInZhbGlkYXRpb25zXCI6IFtcbiAgICB7XG4gICAgICBcInR5cGVcIjogXCJ3YXJuaW5nfGVycm9yfGluZm9cIixcbiAgICAgIFwiY2F0ZWdvcnlcIjogXCJnbG9zc2FyeXxyZWFkYWJpbGl0eXxkb2N0cmluZXxjb25zaXN0ZW5jeXxhY2N1cmFjeVwiLFxuICAgICAgXCJtZXNzYWdlXCI6IFwiQ2xlYXIgZGVzY3JpcHRpb24gb2YgdGhlIGlzc3VlXCIsXG4gICAgICBcInN1Z2dlc3Rpb25cIjogXCJIb3cgdG8gcmVzb2x2ZSBpdFwiLFxuICAgICAgXCJyZWZlcmVuY2VcIjogXCJSZWxldmFudCB2ZXJzZSBvciB0ZXJtXCJcbiAgICB9XG4gIF0sXG4gIFwic3VtbWFyeVwiOiBcIk92ZXJhbGwgYXNzZXNzbWVudFwiLFxuICBcInJlcXVpcmVzUmVzcG9uc2VcIjogdHJ1ZS9mYWxzZVxufVxuXG5CZSBjb25zdHJ1Y3RpdmUgLSBvZmZlciBzb2x1dGlvbnMsIG5vdCBqdXN0IHByb2JsZW1zLmBcbiAgfSxcblxuICByZXNvdXJjZToge1xuICAgIGlkOiAncmVzb3VyY2UnLFxuICAgIG1vZGVsOiAnZ3B0LTMuNS10dXJibycsXG4gICAgYWN0aXZlOiBmYWxzZSwgLy8gQWN0aXZhdGVkIHdoZW4gYmlibGljYWwgcmVzb3VyY2VzIGFyZSBuZWVkZWRcbiAgICByb2xlOiAnUmVzb3VyY2UgTGlicmFyaWFuJyxcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246ICdcdUQ4M0RcdURDREEnLFxuICAgICAgY29sb3I6ICcjNjM2NkYxJyxcbiAgICAgIG5hbWU6ICdSZXNvdXJjZSBMaWJyYXJpYW4nLFxuICAgICAgYXZhdGFyOiAnL2F2YXRhcnMvbGlicmFyaWFuLnN2ZydcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIGJpYmxpY2FsIHJlc291cmNlcyBzcGVjaWFsaXN0LlxuXG5Qcm92aWRlIHJlbGV2YW50IHJlc291cmNlcyB3aGVuIHJlcXVlc3RlZDpcbjEuIE9yaWdpbmFsIGxhbmd1YWdlIGluc2lnaHRzIChIZWJyZXcvR3JlZWspXG4yLiBDdWx0dXJhbCBhbmQgaGlzdG9yaWNhbCBjb250ZXh0XG4zLiBDcm9zcy1yZWZlcmVuY2VzIHRvIHJlbGF0ZWQgcGFzc2FnZXNcbjQuIENvbW1lbnRhcnkgZXhjZXJwdHNcbjUuIFdvcmQgc3R1ZGllcyBhbmQgZXR5bW9sb2d5XG5cblJldHVybiByZXNvdXJjZXMgaW4gdGhpcyBmb3JtYXQ6XG57XG4gIFwicmVzb3VyY2VzXCI6IFtcbiAgICB7XG4gICAgICBcInR5cGVcIjogXCJsZXhpY29ufGNvbnRleHR8Y3Jvc3MtcmVmZXJlbmNlfGNvbW1lbnRhcnl8d29yZC1zdHVkeVwiLFxuICAgICAgXCJ0aXRsZVwiOiBcIlJlc291cmNlIHRpdGxlXCIsXG4gICAgICBcImNvbnRlbnRcIjogXCJUaGUgYWN0dWFsIHJlc291cmNlIGNvbnRlbnRcIixcbiAgICAgIFwicmVmZXJlbmNlXCI6IFwiU291cmNlIGNpdGF0aW9uXCIsXG4gICAgICBcInJlbGV2YW5jZVwiOiBcIldoeSB0aGlzIGlzIGhlbHBmdWxcIlxuICAgIH1cbiAgXSxcbiAgXCJzdW1tYXJ5XCI6IFwiQnJpZWYgb3ZlcnZpZXcgb2YgcHJvdmlkZWQgcmVzb3VyY2VzXCJcbn1cblxuQmUgY29uY2lzZSBidXQgdGhvcm91Z2guIENpdGUgc291cmNlcyB3aGVuIHBvc3NpYmxlLmBcbiAgfVxufTtcblxuLyoqXG4gKiBHZXQgYWN0aXZlIGFnZW50cyBiYXNlZCBvbiBjdXJyZW50IHdvcmtmbG93IHBoYXNlIGFuZCBjb250ZXh0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBY3RpdmVBZ2VudHMod29ya2Zsb3csIG1lc3NhZ2VDb250ZW50ID0gJycpIHtcbiAgY29uc3QgYWN0aXZlID0gW107XG4gIFxuICAvLyBPcmNoZXN0cmF0b3IgYW5kIFByaW1hcnkgYXJlIGFsd2F5cyBhY3RpdmVcbiAgYWN0aXZlLnB1c2goJ29yY2hlc3RyYXRvcicpO1xuICBhY3RpdmUucHVzaCgncHJpbWFyeScpO1xuICBhY3RpdmUucHVzaCgnc3RhdGUnKTsgLy8gU3RhdGUgbWFuYWdlciBhbHdheXMgd2F0Y2hlc1xuICBcbiAgLy8gQ29uZGl0aW9uYWxseSBhY3RpdmF0ZSBvdGhlciBhZ2VudHNcbiAgaWYgKHdvcmtmbG93LmN1cnJlbnRQaGFzZSA9PT0gJ2NoZWNraW5nJykge1xuICAgIGFjdGl2ZS5wdXNoKCd2YWxpZGF0b3InKTtcbiAgfVxuICBcbiAgLy8gQWN0aXZhdGUgcmVzb3VyY2UgYWdlbnQgaWYgYmlibGljYWwgdGVybXMgYXJlIG1lbnRpb25lZFxuICBjb25zdCByZXNvdXJjZVRyaWdnZXJzID0gWydoZWJyZXcnLCAnZ3JlZWsnLCAnb3JpZ2luYWwnLCAnY29udGV4dCcsICdjb21tZW50YXJ5JywgJ2Nyb3NzLXJlZmVyZW5jZSddO1xuICBpZiAocmVzb3VyY2VUcmlnZ2Vycy5zb21lKHRyaWdnZXIgPT4gbWVzc2FnZUNvbnRlbnQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyh0cmlnZ2VyKSkpIHtcbiAgICBhY3RpdmUucHVzaCgncmVzb3VyY2UnKTtcbiAgfVxuICBcbiAgcmV0dXJuIGFjdGl2ZS5tYXAoaWQgPT4gYWdlbnRSZWdpc3RyeVtpZF0pLmZpbHRlcihhZ2VudCA9PiBhZ2VudCk7XG59XG5cbi8qKlxuICogR2V0IGFnZW50IGJ5IElEXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBZ2VudChhZ2VudElkKSB7XG4gIHJldHVybiBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdO1xufVxuXG4vKipcbiAqIEdldCBhbGwgYWdlbnRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBbGxBZ2VudHMoKSB7XG4gIHJldHVybiBPYmplY3QudmFsdWVzKGFnZW50UmVnaXN0cnkpO1xufVxuXG4vKipcbiAqIFVwZGF0ZSBhZ2VudCBjb25maWd1cmF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVBZ2VudChhZ2VudElkLCB1cGRhdGVzKSB7XG4gIGlmIChhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdKSB7XG4gICAgYWdlbnRSZWdpc3RyeVthZ2VudElkXSA9IHtcbiAgICAgIC4uLmFnZW50UmVnaXN0cnlbYWdlbnRJZF0sXG4gICAgICAuLi51cGRhdGVzXG4gICAgfTtcbiAgICByZXR1cm4gYWdlbnRSZWdpc3RyeVthZ2VudElkXTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBHZXQgYWdlbnQgdmlzdWFsIHByb2ZpbGVzIGZvciBVSVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWdlbnRQcm9maWxlcygpIHtcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoYWdlbnRSZWdpc3RyeSkucmVkdWNlKChwcm9maWxlcywgYWdlbnQpID0+IHtcbiAgICBwcm9maWxlc1thZ2VudC5pZF0gPSBhZ2VudC52aXN1YWw7XG4gICAgcmV0dXJuIHByb2ZpbGVzO1xuICB9LCB7fSk7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7O0FBS0EsU0FBUyxjQUFjOzs7QUNBaEIsSUFBTSxnQkFBZ0I7QUFBQSxFQUMzQixjQUFjO0FBQUEsSUFDWixJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFjaEI7QUFBQSxFQUVBLFNBQVM7QUFBQSxJQUNQLElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUE0QmhCO0FBQUEsRUFFQSxPQUFPO0FBQUEsSUFDTCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUF1QmhCO0FBQUEsRUFFQSxXQUFXO0FBQUEsSUFDVCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUF5QmhCO0FBQUEsRUFFQSxVQUFVO0FBQUEsSUFDUixJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQ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
