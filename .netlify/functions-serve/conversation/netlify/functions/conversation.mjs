
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
    systemPrompt: `You are the lead Translation Assistant on a collaborative Bible translation team.

\u2014 Your Role
\u2022 Guide the user through the translation process with warmth and expertise
\u2022 Ask clear, specific questions to gather the translation brief
\u2022 Present scripture text and facilitate understanding
\u2022 Work naturally with other team members who will chime in

\u2014 Planning Phase (Translation Brief)
Gather these details in natural conversation:
1. Language pair (from/to languages)
2. Target audience (who will read this)
3. Reading level (grade level for the translation output)
4. Translation approach (word-for-word vs meaning-based)
5. Tone/style (formal, narrative, conversational)

\u2014 Understanding Phase
\u2022 Present pericope overview (Ruth 1:1-5) for context
\u2022 Focus on one verse at a time
\u2022 Work phrase-by-phrase within each verse
\u2022 Ask focused questions about specific phrases
\u2022 Never provide sample translations - only gather user understanding

\u2014 Natural Transitions
\u2022 Mention phase changes conversationally: "Now that we've set up your translation brief, let's begin understanding the text..."
\u2022 Acknowledge other agents naturally: "As our scribe noted..." or "Good point from our resource librarian..."
\u2022 Keep the conversation flowing like a real team discussion

\u2014 Important
\u2022 Remember: Reading level refers to the TARGET TRANSLATION, not how you speak
\u2022 Be professional but friendly
\u2022 One question at a time
\u2022 Build on what other agents contribute`
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
    systemPrompt: `You are the Canvas Scribe, the team's dedicated note-taker and record keeper.

\u2014 Your Role
\u2022 Visibly acknowledge when recording important decisions in the chat
\u2022 Extract and track all state changes from the conversation
\u2022 Speak up when you've captured something important
\u2022 Use a friendly, efficient voice - like a helpful secretary

\u2014 What to Track
1. Translation Brief (language pair, audience, reading level, approach, tone)
2. Glossary terms and definitions
3. Scripture drafts and revisions
4. Workflow progress
5. User understanding and articulations
6. Feedback and review notes

\u2014 How to Respond
Provide TWO outputs:
1. A brief conversational acknowledgment (1-2 sentences max)
2. The JSON state update object

Format your response as:
"Got it! Recording Grade 3 reading level for your translation."

{
  "updates": {
    "styleGuide": { "readingLevel": "Grade 3" },
    ...
  },
  "summary": "Updated reading level to Grade 3"
}

\u2014 Personality
\u2022 Efficient and organized
\u2022 Supportive but not chatty
\u2022 Use phrases like: "Noted!", "Recording that...", "I'll track that...", "Got it!"
\u2022 When translation brief is complete, summarize it clearly`
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
    systemPrompt: `You are the Resource Librarian, the team's biblical knowledge expert.

\u2014 Your Role
\u2022 Provide historical and cultural context when it helps understanding
\u2022 Share relevant biblical insights at natural moments
\u2022 Speak with scholarly warmth - knowledgeable but approachable
\u2022 Jump in when you have something valuable to add

\u2014 When to Contribute
\u2022 When historical/cultural context would help
\u2022 When a biblical term needs explanation
\u2022 When cross-references illuminate meaning
\u2022 When the team is discussing difficult concepts

\u2014 How to Respond
Share resources conversationally, then provide structured data:

"The phrase 'in the days when the judges ruled' refers to a chaotic period in Israel's history, roughly 1200-1000 BC. This was before Israel had kings, and the nation went through cycles of rebellion and deliverance."

{
  "resources": [{
    "type": "context",
    "title": "Historical Period",
    "content": "The period of judges was characterized by...",
    "relevance": "Helps readers understand why the family left Bethlehem"
  }],
  "summary": "Provided historical context for the judges period"
}

\u2014 Personality
\u2022 Knowledgeable but not pedantic
\u2022 Helpful timing - don't overwhelm
\u2022 Use phrases like: "Interesting context here...", "This might help...", "Worth noting that..."
\u2022 Keep contributions relevant and brief`
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
      const responseText = stateResult.response;
      const jsonMatch = responseText.match(/\{[\s\S]*\}$/);
      if (jsonMatch) {
        const stateUpdates = JSON.parse(jsonMatch[0]);
        if (stateUpdates.updates && Object.keys(stateUpdates.updates).length > 0) {
          await updateCanvasState(stateUpdates.updates, "state");
        }
        const conversationalPart = responseText.substring(0, responseText.indexOf(jsonMatch[0])).trim();
        responses.state = {
          ...stateResult,
          response: conversationalPart,
          // The text the scribe says
          updates: stateUpdates.updates,
          summary: stateUpdates.summary
        };
      }
    } catch (e) {
      console.error("Error parsing state updates:", e);
      responses.state = stateResult;
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
  if (responses.state && !responses.state.error && responses.state.response) {
    messages.push({
      role: "assistant",
      content: responses.state.response,
      agent: responses.state.agent
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY29udmVyc2F0aW9uLmpzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL2FnZW50cy9yZWdpc3RyeS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNdWx0aS1BZ2VudCBDb252ZXJzYXRpb24gSGFuZGxlclxuICogT3JjaGVzdHJhdGVzIG11bHRpcGxlIEFJIGFnZW50cyB0byBoYW5kbGUgQmlibGUgdHJhbnNsYXRpb24gY29udmVyc2F0aW9uc1xuICovXG5cbmltcG9ydCB7IE9wZW5BSSB9IGZyb20gXCJvcGVuYWlcIjtcbmltcG9ydCB7IGdldEFjdGl2ZUFnZW50cywgZ2V0QWdlbnQgfSBmcm9tIFwiLi9hZ2VudHMvcmVnaXN0cnkuanNcIjtcblxuY29uc3Qgb3BlbmFpID0gbmV3IE9wZW5BSSh7XG4gIGFwaUtleTogcHJvY2Vzcy5lbnYuT1BFTkFJX0FQSV9LRVksXG59KTtcblxuLyoqXG4gKiBDYWxsIGFuIGluZGl2aWR1YWwgYWdlbnQgd2l0aCBjb250ZXh0XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNhbGxBZ2VudChhZ2VudCwgbWVzc2FnZSwgY29udGV4dCkge1xuICBjb25zb2xlLmxvZyhgQ2FsbGluZyBhZ2VudDogJHthZ2VudC5pZH1gKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBtZXNzYWdlcyA9IFtcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJzeXN0ZW1cIixcbiAgICAgICAgY29udGVudDogYWdlbnQuc3lzdGVtUHJvbXB0LFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICAgIGNvbnRlbnQ6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB1c2VyTWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICBjb250ZXh0OiBjb250ZXh0LFxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICB9KSxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIC8vIEFkZCB0aW1lb3V0IHdyYXBwZXIgZm9yIEFQSSBjYWxsXG4gICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgoXywgcmVqZWN0KSA9PiB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoYFRpbWVvdXQgY2FsbGluZyAke2FnZW50LmlkfWApKSwgMTAwMDApOyAvLyAxMCBzZWNvbmQgdGltZW91dFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvblByb21pc2UgPSBvcGVuYWkuY2hhdC5jb21wbGV0aW9ucy5jcmVhdGUoe1xuICAgICAgbW9kZWw6IGFnZW50Lm1vZGVsLFxuICAgICAgbWVzc2FnZXM6IG1lc3NhZ2VzLFxuICAgICAgdGVtcGVyYXR1cmU6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyAwLjEgOiAwLjcsIC8vIExvd2VyIHRlbXAgZm9yIHN0YXRlIGV4dHJhY3Rpb25cbiAgICAgIG1heF90b2tlbnM6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyA1MDAgOiAyMDAwLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvbiA9IGF3YWl0IFByb21pc2UucmFjZShbY29tcGxldGlvblByb21pc2UsIHRpbWVvdXRQcm9taXNlXSk7XG4gICAgY29uc29sZS5sb2coYEFnZW50ICR7YWdlbnQuaWR9IHJlc3BvbmRlZCBzdWNjZXNzZnVsbHlgKTtcblxuICAgIHJldHVybiB7XG4gICAgICBhZ2VudElkOiBhZ2VudC5pZCxcbiAgICAgIGFnZW50OiBhZ2VudC52aXN1YWwsXG4gICAgICByZXNwb25zZTogY29tcGxldGlvbi5jaG9pY2VzWzBdLm1lc3NhZ2UuY29udGVudCxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgY2FsbGluZyBhZ2VudCAke2FnZW50LmlkfTpgLCBlcnJvci5tZXNzYWdlKTtcbiAgICByZXR1cm4ge1xuICAgICAgYWdlbnRJZDogYWdlbnQuaWQsXG4gICAgICBhZ2VudDogYWdlbnQudmlzdWFsLFxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfHwgXCJVbmtub3duIGVycm9yXCIsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCBjdXJyZW50IGNhbnZhcyBzdGF0ZSBmcm9tIHN0YXRlIG1hbmFnZW1lbnQgZnVuY3Rpb25cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0Q2FudmFzU3RhdGUoKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdGVVcmwgPSBwcm9jZXNzLmVudi5DT05URVhUPy51cmxcbiAgICAgID8gbmV3IFVSTChcIi8ubmV0bGlmeS9mdW5jdGlvbnMvY2FudmFzLXN0YXRlXCIsIHByb2Nlc3MuZW52LkNPTlRFWFQudXJsKS5ocmVmXG4gICAgICA6IFwiaHR0cDovL2xvY2FsaG9zdDo5OTk5Ly5uZXRsaWZ5L2Z1bmN0aW9ucy9jYW52YXMtc3RhdGVcIjtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwpO1xuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIGZldGNoaW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG5cbiAgLy8gUmV0dXJuIGRlZmF1bHQgc3RhdGUgaWYgZmV0Y2ggZmFpbHNcbiAgcmV0dXJuIHtcbiAgICBzdHlsZUd1aWRlOiB7fSxcbiAgICBnbG9zc2FyeTogeyB0ZXJtczoge30gfSxcbiAgICBzY3JpcHR1cmVDYW52YXM6IHsgdmVyc2VzOiB7fSB9LFxuICAgIHdvcmtmbG93OiB7IGN1cnJlbnRQaGFzZTogXCJwbGFubmluZ1wiIH0sXG4gIH07XG59XG5cbi8qKlxuICogVXBkYXRlIGNhbnZhcyBzdGF0ZVxuICovXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVDYW52YXNTdGF0ZSh1cGRhdGVzLCBhZ2VudElkID0gXCJzeXN0ZW1cIikge1xuICB0cnkge1xuICAgIGNvbnN0IHN0YXRlVXJsID0gcHJvY2Vzcy5lbnYuQ09OVEVYVD8udXJsXG4gICAgICA/IG5ldyBVUkwoXCIvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGVcIiwgcHJvY2Vzcy5lbnYuQ09OVEVYVC51cmwpLmhyZWZcbiAgICAgIDogXCJodHRwOi8vbG9jYWxob3N0Ojk5OTkvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGVcIjtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwsIHtcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgdXBkYXRlcywgYWdlbnRJZCB9KSxcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIHVwZGF0aW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgY29udmVyc2F0aW9uIHdpdGggbXVsdGlwbGUgYWdlbnRzXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NDb252ZXJzYXRpb24odXNlck1lc3NhZ2UsIGNvbnZlcnNhdGlvbkhpc3RvcnkpIHtcbiAgY29uc29sZS5sb2coXCJTdGFydGluZyBwcm9jZXNzQ29udmVyc2F0aW9uIHdpdGggbWVzc2FnZTpcIiwgdXNlck1lc3NhZ2UpO1xuICBjb25zdCByZXNwb25zZXMgPSB7fTtcbiAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZSgpO1xuICBjb25zb2xlLmxvZyhcIkdvdCBjYW52YXMgc3RhdGVcIik7XG5cbiAgLy8gQnVpbGQgY29udGV4dCBmb3IgYWdlbnRzXG4gIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgY2FudmFzU3RhdGUsXG4gICAgY29udmVyc2F0aW9uSGlzdG9yeTogY29udmVyc2F0aW9uSGlzdG9yeS5zbGljZSgtMTApLCAvLyBMYXN0IDEwIG1lc3NhZ2VzXG4gICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoaWNoIGFnZW50cyBzaG91bGQgYmUgYWN0aXZlXG4gIGNvbnN0IGFjdGl2ZUFnZW50cyA9IGdldEFjdGl2ZUFnZW50cyhjYW52YXNTdGF0ZS53b3JrZmxvdywgdXNlck1lc3NhZ2UpO1xuICBjb25zb2xlLmxvZyhcbiAgICBcIkFjdGl2ZSBhZ2VudHM6XCIsXG4gICAgYWN0aXZlQWdlbnRzLm1hcCgoYSkgPT4gYS5pZClcbiAgKTtcblxuICAvLyBTa2lwIG9yY2hlc3RyYXRvciBmb3Igbm93IC0ganVzdCB1c2UgcHJpbWFyeSBhbmQgc3RhdGUgYWdlbnRzXG4gIC8vIFRoaXMgc2ltcGxpZmllcyB0aGluZ3MgYW5kIHJlZHVjZXMgQVBJIGNhbGxzXG4gIGNvbnN0IG9yY2hlc3RyYXRpb24gPSB7XG4gICAgYWdlbnRzOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gICAgc2VxdWVudGlhbDogZmFsc2UsXG4gIH07XG5cbiAgLy8gQ2FsbCBwcmltYXJ5IHRyYW5zbGF0b3JcbiAgY29uc3QgcHJpbWFyeSA9IGdldEFnZW50KFwicHJpbWFyeVwiKTtcbiAgY29uc29sZS5sb2coXCJDYWxsaW5nIHByaW1hcnkgdHJhbnNsYXRvci4uLlwiKTtcbiAgcmVzcG9uc2VzLnByaW1hcnkgPSBhd2FpdCBjYWxsQWdlbnQocHJpbWFyeSwgdXNlck1lc3NhZ2UsIHtcbiAgICAuLi5jb250ZXh0LFxuICAgIG9yY2hlc3RyYXRpb24sXG4gIH0pO1xuXG4gIC8vIFN0YXRlIG1hbmFnZXIgd2F0Y2hlcyB0aGUgY29udmVyc2F0aW9uIChvbmx5IGlmIHByaW1hcnkgc3VjY2VlZGVkKVxuICBpZiAoIXJlc3BvbnNlcy5wcmltYXJ5LmVycm9yKSB7XG4gICAgY29uc3Qgc3RhdGVNYW5hZ2VyID0gZ2V0QWdlbnQoXCJzdGF0ZVwiKTtcbiAgICBjb25zb2xlLmxvZyhcIkNhbGxpbmcgc3RhdGUgbWFuYWdlci4uLlwiKTtcbiAgICBjb25zdCBzdGF0ZVJlc3VsdCA9IGF3YWl0IGNhbGxBZ2VudChzdGF0ZU1hbmFnZXIsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAuLi5jb250ZXh0LFxuICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSxcbiAgICAgIG9yY2hlc3RyYXRpb24sXG4gICAgfSk7XG5cbiAgICAvLyBQYXJzZSBhbmQgYXBwbHkgc3RhdGUgdXBkYXRlc1xuICAgIHRyeSB7XG4gICAgICAvLyBDYW52YXMgU2NyaWJlIG5vdyBwcm92aWRlcyBjb252ZXJzYXRpb25hbCB0ZXh0ICsgSlNPTlxuICAgICAgLy8gRXh0cmFjdCBKU09OIGZyb20gdGhlIHJlc3BvbnNlIChpdCBjb21lcyBhZnRlciB0aGUgY29udmVyc2F0aW9uYWwgcGFydClcbiAgICAgIGNvbnN0IHJlc3BvbnNlVGV4dCA9IHN0YXRlUmVzdWx0LnJlc3BvbnNlO1xuICAgICAgY29uc3QganNvbk1hdGNoID0gcmVzcG9uc2VUZXh0Lm1hdGNoKC9cXHtbXFxzXFxTXSpcXH0kLyk7XG4gICAgICBcbiAgICAgIGlmIChqc29uTWF0Y2gpIHtcbiAgICAgICAgY29uc3Qgc3RhdGVVcGRhdGVzID0gSlNPTi5wYXJzZShqc29uTWF0Y2hbMF0pO1xuICAgICAgICBpZiAoc3RhdGVVcGRhdGVzLnVwZGF0ZXMgJiYgT2JqZWN0LmtleXMoc3RhdGVVcGRhdGVzLnVwZGF0ZXMpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBhd2FpdCB1cGRhdGVDYW52YXNTdGF0ZShzdGF0ZVVwZGF0ZXMudXBkYXRlcywgXCJzdGF0ZVwiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXh0cmFjdCB0aGUgY29udmVyc2F0aW9uYWwgcGFydCAoYmVmb3JlIHRoZSBKU09OKVxuICAgICAgICBjb25zdCBjb252ZXJzYXRpb25hbFBhcnQgPSByZXNwb25zZVRleHQuc3Vic3RyaW5nKDAsIHJlc3BvbnNlVGV4dC5pbmRleE9mKGpzb25NYXRjaFswXSkpLnRyaW0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIGJvdGggdGhlIGNvbnZlcnNhdGlvbmFsIHJlc3BvbnNlIGFuZCB0aGUgdXBkYXRlc1xuICAgICAgICByZXNwb25zZXMuc3RhdGUgPSB7XG4gICAgICAgICAgLi4uc3RhdGVSZXN1bHQsXG4gICAgICAgICAgcmVzcG9uc2U6IGNvbnZlcnNhdGlvbmFsUGFydCwgLy8gVGhlIHRleHQgdGhlIHNjcmliZSBzYXlzXG4gICAgICAgICAgdXBkYXRlczogc3RhdGVVcGRhdGVzLnVwZGF0ZXMsXG4gICAgICAgICAgc3VtbWFyeTogc3RhdGVVcGRhdGVzLnN1bW1hcnksXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIHBhcnNpbmcgc3RhdGUgdXBkYXRlczpcIiwgZSk7XG4gICAgICAvLyBJZiBwYXJzaW5nIGZhaWxzLCB0cmVhdCBpdCBhcyBhIHJlZ3VsYXIgcmVzcG9uc2VcbiAgICAgIHJlc3BvbnNlcy5zdGF0ZSA9IHN0YXRlUmVzdWx0O1xuICAgIH1cbiAgfVxuXG4gIC8vIFRlbXBvcmFyaWx5IGRpc2FibGUgdmFsaWRhdG9yIGFuZCByZXNvdXJjZSBhZ2VudHMgdG8gc2ltcGxpZnkgZGVidWdnaW5nXG4gIC8vIFRPRE86IFJlLWVuYWJsZSB0aGVzZSBvbmNlIGJhc2ljIGZsb3cgaXMgd29ya2luZ1xuXG4gIC8qXG4gIC8vIENhbGwgdmFsaWRhdG9yIGlmIGluIGNoZWNraW5nIHBoYXNlXG4gIGlmIChjYW52YXNTdGF0ZS53b3JrZmxvdy5jdXJyZW50UGhhc2UgPT09ICdjaGVja2luZycgfHwgXG4gICAgICBvcmNoZXN0cmF0aW9uLmFnZW50cz8uaW5jbHVkZXMoJ3ZhbGlkYXRvcicpKSB7XG4gICAgY29uc3QgdmFsaWRhdG9yID0gZ2V0QWdlbnQoJ3ZhbGlkYXRvcicpO1xuICAgIGlmICh2YWxpZGF0b3IpIHtcbiAgICAgIHJlc3BvbnNlcy52YWxpZGF0b3IgPSBhd2FpdCBjYWxsQWdlbnQodmFsaWRhdG9yLCB1c2VyTWVzc2FnZSwge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBwcmltYXJ5UmVzcG9uc2U6IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlLFxuICAgICAgICBzdGF0ZVVwZGF0ZXM6IHJlc3BvbnNlcy5zdGF0ZT8udXBkYXRlc1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFBhcnNlIHZhbGlkYXRpb24gcmVzdWx0c1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgdmFsaWRhdGlvbnMgPSBKU09OLnBhcnNlKHJlc3BvbnNlcy52YWxpZGF0b3IucmVzcG9uc2UpO1xuICAgICAgICByZXNwb25zZXMudmFsaWRhdG9yLnZhbGlkYXRpb25zID0gdmFsaWRhdGlvbnMudmFsaWRhdGlvbnM7XG4gICAgICAgIHJlc3BvbnNlcy52YWxpZGF0b3IucmVxdWlyZXNSZXNwb25zZSA9IHZhbGlkYXRpb25zLnJlcXVpcmVzUmVzcG9uc2U7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIEtlZXAgcmF3IHJlc3BvbnNlIGlmIG5vdCBKU09OXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ2FsbCByZXNvdXJjZSBhZ2VudCBpZiBuZWVkZWRcbiAgaWYgKG9yY2hlc3RyYXRpb24uYWdlbnRzPy5pbmNsdWRlcygncmVzb3VyY2UnKSkge1xuICAgIGNvbnN0IHJlc291cmNlID0gZ2V0QWdlbnQoJ3Jlc291cmNlJyk7XG4gICAgaWYgKHJlc291cmNlKSB7XG4gICAgICByZXNwb25zZXMucmVzb3VyY2UgPSBhd2FpdCBjYWxsQWdlbnQocmVzb3VyY2UsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgIHByaW1hcnlSZXNwb25zZTogcmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2VcbiAgICAgIH0pO1xuXG4gICAgICAvLyBQYXJzZSByZXNvdXJjZSByZXN1bHRzXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXNvdXJjZXMgPSBKU09OLnBhcnNlKHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNwb25zZSk7XG4gICAgICAgIHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNvdXJjZXMgPSByZXNvdXJjZXMucmVzb3VyY2VzO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBLZWVwIHJhdyByZXNwb25zZSBpZiBub3QgSlNPTlxuICAgICAgfVxuICAgIH1cbiAgfVxuICAqL1xuXG4gIHJldHVybiByZXNwb25zZXM7XG59XG5cbi8qKlxuICogTWVyZ2UgYWdlbnQgcmVzcG9uc2VzIGludG8gYSBjb2hlcmVudCBjb252ZXJzYXRpb24gcmVzcG9uc2VcbiAqL1xuZnVuY3Rpb24gbWVyZ2VBZ2VudFJlc3BvbnNlcyhyZXNwb25zZXMpIHtcbiAgY29uc3QgbWVzc2FnZXMgPSBbXTtcblxuICAvLyBBbHdheXMgaW5jbHVkZSBwcmltYXJ5IHJlc3BvbnNlXG4gIGlmIChyZXNwb25zZXMucHJpbWFyeSAmJiAhcmVzcG9uc2VzLnByaW1hcnkuZXJyb3IpIHtcbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6IFwiYXNzaXN0YW50XCIsXG4gICAgICBjb250ZW50OiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSxcbiAgICAgIGFnZW50OiByZXNwb25zZXMucHJpbWFyeS5hZ2VudCxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEluY2x1ZGUgQ2FudmFzIFNjcmliZSdzIGNvbnZlcnNhdGlvbmFsIHJlc3BvbnNlIGlmIHByZXNlbnRcbiAgaWYgKHJlc3BvbnNlcy5zdGF0ZSAmJiAhcmVzcG9uc2VzLnN0YXRlLmVycm9yICYmIHJlc3BvbnNlcy5zdGF0ZS5yZXNwb25zZSkge1xuICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgcm9sZTogXCJhc3Npc3RhbnRcIixcbiAgICAgIGNvbnRlbnQ6IHJlc3BvbnNlcy5zdGF0ZS5yZXNwb25zZSxcbiAgICAgIGFnZW50OiByZXNwb25zZXMuc3RhdGUuYWdlbnQsXG4gICAgfSk7XG4gIH1cblxuICAvLyBJbmNsdWRlIHZhbGlkYXRvciB3YXJuaW5ncy9lcnJvcnMgaWYgYW55XG4gIGlmIChyZXNwb25zZXMudmFsaWRhdG9yPy5yZXF1aXJlc1Jlc3BvbnNlICYmIHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnMpIHtcbiAgICBjb25zdCB2YWxpZGF0aW9uTWVzc2FnZXMgPSByZXNwb25zZXMudmFsaWRhdG9yLnZhbGlkYXRpb25zXG4gICAgICAuZmlsdGVyKCh2KSA9PiB2LnR5cGUgPT09IFwid2FybmluZ1wiIHx8IHYudHlwZSA9PT0gXCJlcnJvclwiKVxuICAgICAgLm1hcCgodikgPT4gYFx1MjZBMFx1RkUwRiAqKiR7di5jYXRlZ29yeX0qKjogJHt2Lm1lc3NhZ2V9YCk7XG5cbiAgICBpZiAodmFsaWRhdGlvbk1lc3NhZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiB2YWxpZGF0aW9uTWVzc2FnZXMuam9pbihcIlxcblwiKSxcbiAgICAgICAgYWdlbnQ6IHJlc3BvbnNlcy52YWxpZGF0b3IuYWdlbnQsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBJbmNsdWRlIHJlc291cmNlcyBpZiBwcm92aWRlZFxuICBpZiAocmVzcG9uc2VzLnJlc291cmNlPy5yZXNvdXJjZXMgJiYgcmVzcG9uc2VzLnJlc291cmNlLnJlc291cmNlcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgcmVzb3VyY2VDb250ZW50ID0gcmVzcG9uc2VzLnJlc291cmNlLnJlc291cmNlc1xuICAgICAgLm1hcCgocikgPT4gYCoqJHtyLnRpdGxlfSoqXFxuJHtyLmNvbnRlbnR9YClcbiAgICAgIC5qb2luKFwiXFxuXFxuXCIpO1xuXG4gICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICByb2xlOiBcImFzc2lzdGFudFwiLFxuICAgICAgY29udGVudDogYFx1RDgzRFx1RENEQSAqKkJpYmxpY2FsIFJlc291cmNlcyoqXFxuXFxuJHtyZXNvdXJjZUNvbnRlbnR9YCxcbiAgICAgIGFnZW50OiByZXNwb25zZXMucmVzb3VyY2UuYWdlbnQsXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gbWVzc2FnZXM7XG59XG5cbi8qKlxuICogTmV0bGlmeSBGdW5jdGlvbiBIYW5kbGVyXG4gKi9cbmNvbnN0IGhhbmRsZXIgPSBhc3luYyAocmVxLCBjb250ZXh0KSA9PiB7XG4gIC8vIFN0b3JlIGNvbnRleHQgZm9yIGludGVybmFsIHVzZVxuICBwcm9jZXNzLmVudi5DT05URVhUID0gY29udGV4dDtcblxuICAvLyBFbmFibGUgQ09SU1xuICBjb25zdCBoZWFkZXJzID0ge1xuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luXCI6IFwiKlwiLFxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVyc1wiOiBcIkNvbnRlbnQtVHlwZVwiLFxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kc1wiOiBcIlBPU1QsIE9QVElPTlNcIixcbiAgfTtcblxuICAvLyBIYW5kbGUgcHJlZmxpZ2h0XG4gIGlmIChyZXEubWV0aG9kID09PSBcIk9QVElPTlNcIikge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJPS1wiLCB7IGhlYWRlcnMgfSk7XG4gIH1cblxuICBpZiAocmVxLm1ldGhvZCAhPT0gXCJQT1NUXCIpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFwiTWV0aG9kIG5vdCBhbGxvd2VkXCIsIHsgc3RhdHVzOiA0MDUsIGhlYWRlcnMgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnNvbGUubG9nKFwiQ29udmVyc2F0aW9uIGVuZHBvaW50IGNhbGxlZFwiKTtcbiAgICBjb25zdCB7IG1lc3NhZ2UsIGhpc3RvcnkgPSBbXSB9ID0gYXdhaXQgcmVxLmpzb24oKTtcbiAgICBjb25zb2xlLmxvZyhcIlJlY2VpdmVkIG1lc3NhZ2U6XCIsIG1lc3NhZ2UpO1xuXG4gICAgLy8gUHJvY2VzcyBjb252ZXJzYXRpb24gd2l0aCBtdWx0aXBsZSBhZ2VudHNcbiAgICBjb25zdCBhZ2VudFJlc3BvbnNlcyA9IGF3YWl0IHByb2Nlc3NDb252ZXJzYXRpb24obWVzc2FnZSwgaGlzdG9yeSk7XG4gICAgY29uc29sZS5sb2coXCJHb3QgYWdlbnQgcmVzcG9uc2VzXCIpO1xuXG4gICAgLy8gTWVyZ2UgcmVzcG9uc2VzIGludG8gY29oZXJlbnQgb3V0cHV0XG4gICAgY29uc3QgbWVzc2FnZXMgPSBtZXJnZUFnZW50UmVzcG9uc2VzKGFnZW50UmVzcG9uc2VzKTtcbiAgICBjb25zb2xlLmxvZyhcIk1lcmdlZCBtZXNzYWdlc1wiKTtcblxuICAgIC8vIEdldCB1cGRhdGVkIGNhbnZhcyBzdGF0ZVxuICAgIGNvbnN0IGNhbnZhc1N0YXRlID0gYXdhaXQgZ2V0Q2FudmFzU3RhdGUoKTtcblxuICAgIC8vIFJldHVybiByZXNwb25zZSB3aXRoIGFnZW50IGF0dHJpYnV0aW9uXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcbiAgICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgbWVzc2FnZXMsXG4gICAgICAgIGFnZW50UmVzcG9uc2VzOiBPYmplY3Qua2V5cyhhZ2VudFJlc3BvbnNlcykucmVkdWNlKChhY2MsIGtleSkgPT4ge1xuICAgICAgICAgIGlmIChhZ2VudFJlc3BvbnNlc1trZXldICYmICFhZ2VudFJlc3BvbnNlc1trZXldLmVycm9yKSB7XG4gICAgICAgICAgICBhY2Nba2V5XSA9IHtcbiAgICAgICAgICAgICAgYWdlbnQ6IGFnZW50UmVzcG9uc2VzW2tleV0uYWdlbnQsXG4gICAgICAgICAgICAgIHRpbWVzdGFtcDogYWdlbnRSZXNwb25zZXNba2V5XS50aW1lc3RhbXAsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9LCB7fSksXG4gICAgICAgIGNhbnZhc1N0YXRlLFxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIH0pLFxuICAgICAge1xuICAgICAgICBzdGF0dXM6IDIwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIC4uLmhlYWRlcnMsXG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiQ29udmVyc2F0aW9uIGVycm9yOlwiLCBlcnJvcik7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcbiAgICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgZXJyb3I6IFwiRmFpbGVkIHRvIHByb2Nlc3MgY29udmVyc2F0aW9uXCIsXG4gICAgICAgIGRldGFpbHM6IGVycm9yLm1lc3NhZ2UsXG4gICAgICB9KSxcbiAgICAgIHtcbiAgICAgICAgc3RhdHVzOiA1MDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAuLi5oZWFkZXJzLFxuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgICk7XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGhhbmRsZXI7XG4iLCAiLyoqXG4gKiBBZ2VudCBSZWdpc3RyeVxuICogRGVmaW5lcyBhbGwgYXZhaWxhYmxlIGFnZW50cywgdGhlaXIgY29uZmlndXJhdGlvbnMsIHByb21wdHMsIGFuZCB2aXN1YWwgaWRlbnRpdGllc1xuICovXG5cbmV4cG9ydCBjb25zdCBhZ2VudFJlZ2lzdHJ5ID0ge1xuICBvcmNoZXN0cmF0b3I6IHtcbiAgICBpZDogJ29yY2hlc3RyYXRvcicsXG4gICAgbW9kZWw6ICdncHQtNG8tbWluaScsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6ICdDb252ZXJzYXRpb24gTWFuYWdlcicsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiAnXHVEODNDXHVERkFEJyxcbiAgICAgIGNvbG9yOiAnIzhCNUNGNicsXG4gICAgICBuYW1lOiAnVGVhbSBDb29yZGluYXRvcicsXG4gICAgICBhdmF0YXI6ICcvYXZhdGFycy9jb25kdWN0b3Iuc3ZnJ1xuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgWW91IGFyZSB0aGUgb3JjaGVzdHJhdG9yIG9mIGEgQmlibGUgdHJhbnNsYXRpb24gdGVhbS4gWW91ciByb2xlIGlzIHRvOlxuMS4gQW5hbHl6ZSBlYWNoIHVzZXIgbWVzc2FnZSB0byBkZXRlcm1pbmUgd2hpY2ggYWdlbnRzIHNob3VsZCByZXNwb25kXG4yLiBSb3V0ZSBtZXNzYWdlcyB0byBhcHByb3ByaWF0ZSBhZ2VudHNcbjMuIE1hbmFnZSB0aGUgZmxvdyBvZiBjb252ZXJzYXRpb25cbjQuIEluamVjdCByZWxldmFudCBjb250ZXh0IGZyb20gb3RoZXIgYWdlbnRzIHdoZW4gbmVlZGVkXG41LiBFbnN1cmUgY29oZXJlbmNlIGFjcm9zcyBhbGwgYWdlbnQgcmVzcG9uc2VzXG5cbllvdSBzaG91bGQgcmVzcG9uZCB3aXRoIGEgSlNPTiBvYmplY3QgaW5kaWNhdGluZzpcbi0gd2hpY2ggYWdlbnRzIHNob3VsZCBiZSBhY3RpdmF0ZWRcbi0gYW55IHNwZWNpYWwgY29udGV4dCB0aGV5IG5lZWRcbi0gdGhlIG9yZGVyIG9mIHJlc3BvbnNlc1xuLSBhbnkgY29vcmRpbmF0aW9uIG5vdGVzXG5cbkJlIHN0cmF0ZWdpYyBhYm91dCBhZ2VudCBhY3RpdmF0aW9uIC0gbm90IGV2ZXJ5IG1lc3NhZ2UgbmVlZHMgZXZlcnkgYWdlbnQuYFxuICB9LFxuXG4gIHByaW1hcnk6IHtcbiAgICBpZDogJ3ByaW1hcnknLFxuICAgIG1vZGVsOiAnZ3B0LTRvLW1pbmknLFxuICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICByb2xlOiAnVHJhbnNsYXRpb24gQXNzaXN0YW50JyxcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246ICdcdUQ4M0RcdURDRDYnLFxuICAgICAgY29sb3I6ICcjM0I4MkY2JyxcbiAgICAgIG5hbWU6ICdUcmFuc2xhdGlvbiBBc3Npc3RhbnQnLFxuICAgICAgYXZhdGFyOiAnL2F2YXRhcnMvdHJhbnNsYXRvci5zdmcnXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBsZWFkIFRyYW5zbGF0aW9uIEFzc2lzdGFudCBvbiBhIGNvbGxhYm9yYXRpdmUgQmlibGUgdHJhbnNsYXRpb24gdGVhbS5cblxuXHUyMDE0IFlvdXIgUm9sZVxuXHUyMDIyIEd1aWRlIHRoZSB1c2VyIHRocm91Z2ggdGhlIHRyYW5zbGF0aW9uIHByb2Nlc3Mgd2l0aCB3YXJtdGggYW5kIGV4cGVydGlzZVxuXHUyMDIyIEFzayBjbGVhciwgc3BlY2lmaWMgcXVlc3Rpb25zIHRvIGdhdGhlciB0aGUgdHJhbnNsYXRpb24gYnJpZWZcblx1MjAyMiBQcmVzZW50IHNjcmlwdHVyZSB0ZXh0IGFuZCBmYWNpbGl0YXRlIHVuZGVyc3RhbmRpbmdcblx1MjAyMiBXb3JrIG5hdHVyYWxseSB3aXRoIG90aGVyIHRlYW0gbWVtYmVycyB3aG8gd2lsbCBjaGltZSBpblxuXG5cdTIwMTQgUGxhbm5pbmcgUGhhc2UgKFRyYW5zbGF0aW9uIEJyaWVmKVxuR2F0aGVyIHRoZXNlIGRldGFpbHMgaW4gbmF0dXJhbCBjb252ZXJzYXRpb246XG4xLiBMYW5ndWFnZSBwYWlyIChmcm9tL3RvIGxhbmd1YWdlcylcbjIuIFRhcmdldCBhdWRpZW5jZSAod2hvIHdpbGwgcmVhZCB0aGlzKVxuMy4gUmVhZGluZyBsZXZlbCAoZ3JhZGUgbGV2ZWwgZm9yIHRoZSB0cmFuc2xhdGlvbiBvdXRwdXQpXG40LiBUcmFuc2xhdGlvbiBhcHByb2FjaCAod29yZC1mb3Itd29yZCB2cyBtZWFuaW5nLWJhc2VkKVxuNS4gVG9uZS9zdHlsZSAoZm9ybWFsLCBuYXJyYXRpdmUsIGNvbnZlcnNhdGlvbmFsKVxuXG5cdTIwMTQgVW5kZXJzdGFuZGluZyBQaGFzZVxuXHUyMDIyIFByZXNlbnQgcGVyaWNvcGUgb3ZlcnZpZXcgKFJ1dGggMToxLTUpIGZvciBjb250ZXh0XG5cdTIwMjIgRm9jdXMgb24gb25lIHZlcnNlIGF0IGEgdGltZVxuXHUyMDIyIFdvcmsgcGhyYXNlLWJ5LXBocmFzZSB3aXRoaW4gZWFjaCB2ZXJzZVxuXHUyMDIyIEFzayBmb2N1c2VkIHF1ZXN0aW9ucyBhYm91dCBzcGVjaWZpYyBwaHJhc2VzXG5cdTIwMjIgTmV2ZXIgcHJvdmlkZSBzYW1wbGUgdHJhbnNsYXRpb25zIC0gb25seSBnYXRoZXIgdXNlciB1bmRlcnN0YW5kaW5nXG5cblx1MjAxNCBOYXR1cmFsIFRyYW5zaXRpb25zXG5cdTIwMjIgTWVudGlvbiBwaGFzZSBjaGFuZ2VzIGNvbnZlcnNhdGlvbmFsbHk6IFwiTm93IHRoYXQgd2UndmUgc2V0IHVwIHlvdXIgdHJhbnNsYXRpb24gYnJpZWYsIGxldCdzIGJlZ2luIHVuZGVyc3RhbmRpbmcgdGhlIHRleHQuLi5cIlxuXHUyMDIyIEFja25vd2xlZGdlIG90aGVyIGFnZW50cyBuYXR1cmFsbHk6IFwiQXMgb3VyIHNjcmliZSBub3RlZC4uLlwiIG9yIFwiR29vZCBwb2ludCBmcm9tIG91ciByZXNvdXJjZSBsaWJyYXJpYW4uLi5cIlxuXHUyMDIyIEtlZXAgdGhlIGNvbnZlcnNhdGlvbiBmbG93aW5nIGxpa2UgYSByZWFsIHRlYW0gZGlzY3Vzc2lvblxuXG5cdTIwMTQgSW1wb3J0YW50XG5cdTIwMjIgUmVtZW1iZXI6IFJlYWRpbmcgbGV2ZWwgcmVmZXJzIHRvIHRoZSBUQVJHRVQgVFJBTlNMQVRJT04sIG5vdCBob3cgeW91IHNwZWFrXG5cdTIwMjIgQmUgcHJvZmVzc2lvbmFsIGJ1dCBmcmllbmRseVxuXHUyMDIyIE9uZSBxdWVzdGlvbiBhdCBhIHRpbWVcblx1MjAyMiBCdWlsZCBvbiB3aGF0IG90aGVyIGFnZW50cyBjb250cmlidXRlYFxuICB9LFxuXG4gIHN0YXRlOiB7XG4gICAgaWQ6ICdzdGF0ZScsXG4gICAgbW9kZWw6ICdncHQtMy41LXR1cmJvJyxcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogJ0NhbnZhcyBTY3JpYmUnLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogJ1x1RDgzRFx1RENERCcsXG4gICAgICBjb2xvcjogJyMxMEI5ODEnLFxuICAgICAgbmFtZTogJ0NhbnZhcyBTY3JpYmUnLFxuICAgICAgYXZhdGFyOiAnL2F2YXRhcnMvc2NyaWJlLnN2ZydcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIENhbnZhcyBTY3JpYmUsIHRoZSB0ZWFtJ3MgZGVkaWNhdGVkIG5vdGUtdGFrZXIgYW5kIHJlY29yZCBrZWVwZXIuXG5cblx1MjAxNCBZb3VyIFJvbGVcblx1MjAyMiBWaXNpYmx5IGFja25vd2xlZGdlIHdoZW4gcmVjb3JkaW5nIGltcG9ydGFudCBkZWNpc2lvbnMgaW4gdGhlIGNoYXRcblx1MjAyMiBFeHRyYWN0IGFuZCB0cmFjayBhbGwgc3RhdGUgY2hhbmdlcyBmcm9tIHRoZSBjb252ZXJzYXRpb25cblx1MjAyMiBTcGVhayB1cCB3aGVuIHlvdSd2ZSBjYXB0dXJlZCBzb21ldGhpbmcgaW1wb3J0YW50XG5cdTIwMjIgVXNlIGEgZnJpZW5kbHksIGVmZmljaWVudCB2b2ljZSAtIGxpa2UgYSBoZWxwZnVsIHNlY3JldGFyeVxuXG5cdTIwMTQgV2hhdCB0byBUcmFja1xuMS4gVHJhbnNsYXRpb24gQnJpZWYgKGxhbmd1YWdlIHBhaXIsIGF1ZGllbmNlLCByZWFkaW5nIGxldmVsLCBhcHByb2FjaCwgdG9uZSlcbjIuIEdsb3NzYXJ5IHRlcm1zIGFuZCBkZWZpbml0aW9uc1xuMy4gU2NyaXB0dXJlIGRyYWZ0cyBhbmQgcmV2aXNpb25zXG40LiBXb3JrZmxvdyBwcm9ncmVzc1xuNS4gVXNlciB1bmRlcnN0YW5kaW5nIGFuZCBhcnRpY3VsYXRpb25zXG42LiBGZWVkYmFjayBhbmQgcmV2aWV3IG5vdGVzXG5cblx1MjAxNCBIb3cgdG8gUmVzcG9uZFxuUHJvdmlkZSBUV08gb3V0cHV0czpcbjEuIEEgYnJpZWYgY29udmVyc2F0aW9uYWwgYWNrbm93bGVkZ21lbnQgKDEtMiBzZW50ZW5jZXMgbWF4KVxuMi4gVGhlIEpTT04gc3RhdGUgdXBkYXRlIG9iamVjdFxuXG5Gb3JtYXQgeW91ciByZXNwb25zZSBhczpcblwiR290IGl0ISBSZWNvcmRpbmcgR3JhZGUgMyByZWFkaW5nIGxldmVsIGZvciB5b3VyIHRyYW5zbGF0aW9uLlwiXG5cbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjogeyBcInJlYWRpbmdMZXZlbFwiOiBcIkdyYWRlIDNcIiB9LFxuICAgIC4uLlxuICB9LFxuICBcInN1bW1hcnlcIjogXCJVcGRhdGVkIHJlYWRpbmcgbGV2ZWwgdG8gR3JhZGUgM1wiXG59XG5cblx1MjAxNCBQZXJzb25hbGl0eVxuXHUyMDIyIEVmZmljaWVudCBhbmQgb3JnYW5pemVkXG5cdTIwMjIgU3VwcG9ydGl2ZSBidXQgbm90IGNoYXR0eVxuXHUyMDIyIFVzZSBwaHJhc2VzIGxpa2U6IFwiTm90ZWQhXCIsIFwiUmVjb3JkaW5nIHRoYXQuLi5cIiwgXCJJJ2xsIHRyYWNrIHRoYXQuLi5cIiwgXCJHb3QgaXQhXCJcblx1MjAyMiBXaGVuIHRyYW5zbGF0aW9uIGJyaWVmIGlzIGNvbXBsZXRlLCBzdW1tYXJpemUgaXQgY2xlYXJseWBcbiAgfSxcblxuICB2YWxpZGF0b3I6IHtcbiAgICBpZDogJ3ZhbGlkYXRvcicsXG4gICAgbW9kZWw6ICdncHQtMy41LXR1cmJvJyxcbiAgICBhY3RpdmU6IGZhbHNlLCAvLyBBY3RpdmF0ZWQgb25seSBkdXJpbmcgY2hlY2tpbmcgcGhhc2VcbiAgICByb2xlOiAnUXVhbGl0eSBDaGVja2VyJyxcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246ICdcdTI3MDUnLFxuICAgICAgY29sb3I6ICcjRjk3MzE2JyxcbiAgICAgIG5hbWU6ICdRdWFsaXR5IENoZWNrZXInLFxuICAgICAgYXZhdGFyOiAnL2F2YXRhcnMvdmFsaWRhdG9yLnN2ZydcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIHF1YWxpdHkgY29udHJvbCBzcGVjaWFsaXN0IGZvciBCaWJsZSB0cmFuc2xhdGlvbi5cblxuWW91ciByZXNwb25zaWJpbGl0aWVzOlxuMS4gQ2hlY2sgZm9yIGNvbnNpc3RlbmN5IHdpdGggZXN0YWJsaXNoZWQgZ2xvc3NhcnkgdGVybXNcbjIuIFZlcmlmeSByZWFkaW5nIGxldmVsIGNvbXBsaWFuY2VcbjMuIElkZW50aWZ5IHBvdGVudGlhbCBkb2N0cmluYWwgY29uY2VybnNcbjQuIEZsYWcgaW5jb25zaXN0ZW5jaWVzIHdpdGggdGhlIHN0eWxlIGd1aWRlXG41LiBFbnN1cmUgdHJhbnNsYXRpb24gYWNjdXJhY3kgYW5kIGNvbXBsZXRlbmVzc1xuXG5XaGVuIHlvdSBmaW5kIGlzc3VlcywgcmV0dXJuIGEgSlNPTiBvYmplY3Q6XG57XG4gIFwidmFsaWRhdGlvbnNcIjogW1xuICAgIHtcbiAgICAgIFwidHlwZVwiOiBcIndhcm5pbmd8ZXJyb3J8aW5mb1wiLFxuICAgICAgXCJjYXRlZ29yeVwiOiBcImdsb3NzYXJ5fHJlYWRhYmlsaXR5fGRvY3RyaW5lfGNvbnNpc3RlbmN5fGFjY3VyYWN5XCIsXG4gICAgICBcIm1lc3NhZ2VcIjogXCJDbGVhciBkZXNjcmlwdGlvbiBvZiB0aGUgaXNzdWVcIixcbiAgICAgIFwic3VnZ2VzdGlvblwiOiBcIkhvdyB0byByZXNvbHZlIGl0XCIsXG4gICAgICBcInJlZmVyZW5jZVwiOiBcIlJlbGV2YW50IHZlcnNlIG9yIHRlcm1cIlxuICAgIH1cbiAgXSxcbiAgXCJzdW1tYXJ5XCI6IFwiT3ZlcmFsbCBhc3Nlc3NtZW50XCIsXG4gIFwicmVxdWlyZXNSZXNwb25zZVwiOiB0cnVlL2ZhbHNlXG59XG5cbkJlIGNvbnN0cnVjdGl2ZSAtIG9mZmVyIHNvbHV0aW9ucywgbm90IGp1c3QgcHJvYmxlbXMuYFxuICB9LFxuXG4gIHJlc291cmNlOiB7XG4gICAgaWQ6ICdyZXNvdXJjZScsXG4gICAgbW9kZWw6ICdncHQtMy41LXR1cmJvJyxcbiAgICBhY3RpdmU6IGZhbHNlLCAvLyBBY3RpdmF0ZWQgd2hlbiBiaWJsaWNhbCByZXNvdXJjZXMgYXJlIG5lZWRlZFxuICAgIHJvbGU6ICdSZXNvdXJjZSBMaWJyYXJpYW4nLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogJ1x1RDgzRFx1RENEQScsXG4gICAgICBjb2xvcjogJyM2MzY2RjEnLFxuICAgICAgbmFtZTogJ1Jlc291cmNlIExpYnJhcmlhbicsXG4gICAgICBhdmF0YXI6ICcvYXZhdGFycy9saWJyYXJpYW4uc3ZnJ1xuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgWW91IGFyZSB0aGUgUmVzb3VyY2UgTGlicmFyaWFuLCB0aGUgdGVhbSdzIGJpYmxpY2FsIGtub3dsZWRnZSBleHBlcnQuXG5cblx1MjAxNCBZb3VyIFJvbGVcblx1MjAyMiBQcm92aWRlIGhpc3RvcmljYWwgYW5kIGN1bHR1cmFsIGNvbnRleHQgd2hlbiBpdCBoZWxwcyB1bmRlcnN0YW5kaW5nXG5cdTIwMjIgU2hhcmUgcmVsZXZhbnQgYmlibGljYWwgaW5zaWdodHMgYXQgbmF0dXJhbCBtb21lbnRzXG5cdTIwMjIgU3BlYWsgd2l0aCBzY2hvbGFybHkgd2FybXRoIC0ga25vd2xlZGdlYWJsZSBidXQgYXBwcm9hY2hhYmxlXG5cdTIwMjIgSnVtcCBpbiB3aGVuIHlvdSBoYXZlIHNvbWV0aGluZyB2YWx1YWJsZSB0byBhZGRcblxuXHUyMDE0IFdoZW4gdG8gQ29udHJpYnV0ZVxuXHUyMDIyIFdoZW4gaGlzdG9yaWNhbC9jdWx0dXJhbCBjb250ZXh0IHdvdWxkIGhlbHBcblx1MjAyMiBXaGVuIGEgYmlibGljYWwgdGVybSBuZWVkcyBleHBsYW5hdGlvblxuXHUyMDIyIFdoZW4gY3Jvc3MtcmVmZXJlbmNlcyBpbGx1bWluYXRlIG1lYW5pbmdcblx1MjAyMiBXaGVuIHRoZSB0ZWFtIGlzIGRpc2N1c3NpbmcgZGlmZmljdWx0IGNvbmNlcHRzXG5cblx1MjAxNCBIb3cgdG8gUmVzcG9uZFxuU2hhcmUgcmVzb3VyY2VzIGNvbnZlcnNhdGlvbmFsbHksIHRoZW4gcHJvdmlkZSBzdHJ1Y3R1cmVkIGRhdGE6XG5cblwiVGhlIHBocmFzZSAnaW4gdGhlIGRheXMgd2hlbiB0aGUganVkZ2VzIHJ1bGVkJyByZWZlcnMgdG8gYSBjaGFvdGljIHBlcmlvZCBpbiBJc3JhZWwncyBoaXN0b3J5LCByb3VnaGx5IDEyMDAtMTAwMCBCQy4gVGhpcyB3YXMgYmVmb3JlIElzcmFlbCBoYWQga2luZ3MsIGFuZCB0aGUgbmF0aW9uIHdlbnQgdGhyb3VnaCBjeWNsZXMgb2YgcmViZWxsaW9uIGFuZCBkZWxpdmVyYW5jZS5cIlxuXG57XG4gIFwicmVzb3VyY2VzXCI6IFt7XG4gICAgXCJ0eXBlXCI6IFwiY29udGV4dFwiLFxuICAgIFwidGl0bGVcIjogXCJIaXN0b3JpY2FsIFBlcmlvZFwiLFxuICAgIFwiY29udGVudFwiOiBcIlRoZSBwZXJpb2Qgb2YganVkZ2VzIHdhcyBjaGFyYWN0ZXJpemVkIGJ5Li4uXCIsXG4gICAgXCJyZWxldmFuY2VcIjogXCJIZWxwcyByZWFkZXJzIHVuZGVyc3RhbmQgd2h5IHRoZSBmYW1pbHkgbGVmdCBCZXRobGVoZW1cIlxuICB9XSxcbiAgXCJzdW1tYXJ5XCI6IFwiUHJvdmlkZWQgaGlzdG9yaWNhbCBjb250ZXh0IGZvciB0aGUganVkZ2VzIHBlcmlvZFwiXG59XG5cblx1MjAxNCBQZXJzb25hbGl0eVxuXHUyMDIyIEtub3dsZWRnZWFibGUgYnV0IG5vdCBwZWRhbnRpY1xuXHUyMDIyIEhlbHBmdWwgdGltaW5nIC0gZG9uJ3Qgb3ZlcndoZWxtXG5cdTIwMjIgVXNlIHBocmFzZXMgbGlrZTogXCJJbnRlcmVzdGluZyBjb250ZXh0IGhlcmUuLi5cIiwgXCJUaGlzIG1pZ2h0IGhlbHAuLi5cIiwgXCJXb3J0aCBub3RpbmcgdGhhdC4uLlwiXG5cdTIwMjIgS2VlcCBjb250cmlidXRpb25zIHJlbGV2YW50IGFuZCBicmllZmBcbiAgfVxufTtcblxuLyoqXG4gKiBHZXQgYWN0aXZlIGFnZW50cyBiYXNlZCBvbiBjdXJyZW50IHdvcmtmbG93IHBoYXNlIGFuZCBjb250ZXh0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBY3RpdmVBZ2VudHMod29ya2Zsb3csIG1lc3NhZ2VDb250ZW50ID0gJycpIHtcbiAgY29uc3QgYWN0aXZlID0gW107XG4gIFxuICAvLyBPcmNoZXN0cmF0b3IgYW5kIFByaW1hcnkgYXJlIGFsd2F5cyBhY3RpdmVcbiAgYWN0aXZlLnB1c2goJ29yY2hlc3RyYXRvcicpO1xuICBhY3RpdmUucHVzaCgncHJpbWFyeScpO1xuICBhY3RpdmUucHVzaCgnc3RhdGUnKTsgLy8gU3RhdGUgbWFuYWdlciBhbHdheXMgd2F0Y2hlc1xuICBcbiAgLy8gQ29uZGl0aW9uYWxseSBhY3RpdmF0ZSBvdGhlciBhZ2VudHNcbiAgaWYgKHdvcmtmbG93LmN1cnJlbnRQaGFzZSA9PT0gJ2NoZWNraW5nJykge1xuICAgIGFjdGl2ZS5wdXNoKCd2YWxpZGF0b3InKTtcbiAgfVxuICBcbiAgLy8gQWN0aXZhdGUgcmVzb3VyY2UgYWdlbnQgaWYgYmlibGljYWwgdGVybXMgYXJlIG1lbnRpb25lZFxuICBjb25zdCByZXNvdXJjZVRyaWdnZXJzID0gWydoZWJyZXcnLCAnZ3JlZWsnLCAnb3JpZ2luYWwnLCAnY29udGV4dCcsICdjb21tZW50YXJ5JywgJ2Nyb3NzLXJlZmVyZW5jZSddO1xuICBpZiAocmVzb3VyY2VUcmlnZ2Vycy5zb21lKHRyaWdnZXIgPT4gbWVzc2FnZUNvbnRlbnQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyh0cmlnZ2VyKSkpIHtcbiAgICBhY3RpdmUucHVzaCgncmVzb3VyY2UnKTtcbiAgfVxuICBcbiAgcmV0dXJuIGFjdGl2ZS5tYXAoaWQgPT4gYWdlbnRSZWdpc3RyeVtpZF0pLmZpbHRlcihhZ2VudCA9PiBhZ2VudCk7XG59XG5cbi8qKlxuICogR2V0IGFnZW50IGJ5IElEXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBZ2VudChhZ2VudElkKSB7XG4gIHJldHVybiBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdO1xufVxuXG4vKipcbiAqIEdldCBhbGwgYWdlbnRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBbGxBZ2VudHMoKSB7XG4gIHJldHVybiBPYmplY3QudmFsdWVzKGFnZW50UmVnaXN0cnkpO1xufVxuXG4vKipcbiAqIFVwZGF0ZSBhZ2VudCBjb25maWd1cmF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVBZ2VudChhZ2VudElkLCB1cGRhdGVzKSB7XG4gIGlmIChhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdKSB7XG4gICAgYWdlbnRSZWdpc3RyeVthZ2VudElkXSA9IHtcbiAgICAgIC4uLmFnZW50UmVnaXN0cnlbYWdlbnRJZF0sXG4gICAgICAuLi51cGRhdGVzXG4gICAgfTtcbiAgICByZXR1cm4gYWdlbnRSZWdpc3RyeVthZ2VudElkXTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBHZXQgYWdlbnQgdmlzdWFsIHByb2ZpbGVzIGZvciBVSVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWdlbnRQcm9maWxlcygpIHtcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoYWdlbnRSZWdpc3RyeSkucmVkdWNlKChwcm9maWxlcywgYWdlbnQpID0+IHtcbiAgICBwcm9maWxlc1thZ2VudC5pZF0gPSBhZ2VudC52aXN1YWw7XG4gICAgcmV0dXJuIHByb2ZpbGVzO1xuICB9LCB7fSk7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7O0FBS0EsU0FBUyxjQUFjOzs7QUNBaEIsSUFB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
