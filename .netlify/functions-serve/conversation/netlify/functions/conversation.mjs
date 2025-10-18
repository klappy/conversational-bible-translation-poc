
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
1. Language of Wider Communication (what language for our conversation)
2. Source and target languages (what are we translating from and into)  
3. Target audience (who will read this translation)
4. Reading level (grade level for the translation output)
5. Translation approach (word-for-word vs meaning-based)
6. Tone/style (formal, narrative, conversational)

IMPORTANT: Ask for each piece of information one at a time. Don't assume answers.

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
1. Translation Brief (ONLY when explicitly stated by user):
   - Conversation language (LWC) - when user says what language to chat in
   - Source language - when user says what they're translating FROM
   - Target language - when user says what they're translating INTO
   - Target audience - when user describes WHO will read it
   - Reading level - when user gives a specific grade level
   - Translation approach - when user chooses word-for-word or meaning-based
   - Tone/style - when user specifies formal, narrative, conversational, etc.
2. Glossary terms and definitions
3. Scripture drafts and revisions
4. Workflow progress
5. User understanding and articulations
6. Feedback and review notes

\u2014 How to Respond
ONLY respond when the user provides information to record.
DO NOT hallucinate or assume information not explicitly stated.

When you need to record something, provide TWO outputs:
1. A brief conversational acknowledgment (1-2 sentences max)
2. The JSON state update object (MUST be valid JSON - no trailing commas!)

Format your response EXACTLY like this:
"Got it! Recording [what was actually said]."

{
  "updates": {
    "styleGuide": { "fieldName": "value" }
  },
  "summary": "Brief summary"
}

If the user hasn't provided specific information to record yet, stay SILENT.
Only speak when you have something concrete to record.

\u2014 Special Cases
\u2022 If user says one language "for everything" or "for all", record it as:
  - conversationLanguage: [that language]
  - sourceLanguage: [that language]  
  - targetLanguage: [that language]
\u2022 Example: "English for all" means English \u2192 English translation with English conversation

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
        let stateUpdates;
        try {
          stateUpdates = JSON.parse(jsonMatch[0]);
        } catch (jsonError) {
          console.error("Invalid JSON from Canvas Scribe:", jsonError);
          console.error("JSON text:", jsonMatch[0]);
          const conversationalPart2 = responseText.substring(0, responseText.indexOf(jsonMatch[0])).trim();
          if (conversationalPart2) {
            responses.state = {
              ...stateResult,
              response: conversationalPart2,
              agent: stateResult.agent
              // Preserve agent visual info even on JSON error
            };
          }
          return;
        }
        if (stateUpdates.updates && Object.keys(stateUpdates.updates).length > 0) {
          await updateCanvasState(stateUpdates.updates, "state");
        }
        const conversationalPart = responseText.substring(0, responseText.indexOf(jsonMatch[0])).trim();
        if (conversationalPart) {
          responses.state = {
            ...stateResult,
            response: conversationalPart,
            // The text the scribe says
            agent: stateResult.agent,
            // Make sure to preserve the agent visual info
            updates: stateUpdates.updates,
            summary: stateUpdates.summary
          };
        }
      }
    } catch (e) {
      console.error("Error parsing state updates:", e);
      if (!stateResult.response.includes('{"updates"')) {
        responses.state = stateResult;
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY29udmVyc2F0aW9uLmpzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL2FnZW50cy9yZWdpc3RyeS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNdWx0aS1BZ2VudCBDb252ZXJzYXRpb24gSGFuZGxlclxuICogT3JjaGVzdHJhdGVzIG11bHRpcGxlIEFJIGFnZW50cyB0byBoYW5kbGUgQmlibGUgdHJhbnNsYXRpb24gY29udmVyc2F0aW9uc1xuICovXG5cbmltcG9ydCB7IE9wZW5BSSB9IGZyb20gXCJvcGVuYWlcIjtcbmltcG9ydCB7IGdldEFjdGl2ZUFnZW50cywgZ2V0QWdlbnQgfSBmcm9tIFwiLi9hZ2VudHMvcmVnaXN0cnkuanNcIjtcblxuY29uc3Qgb3BlbmFpID0gbmV3IE9wZW5BSSh7XG4gIGFwaUtleTogcHJvY2Vzcy5lbnYuT1BFTkFJX0FQSV9LRVksXG59KTtcblxuLyoqXG4gKiBDYWxsIGFuIGluZGl2aWR1YWwgYWdlbnQgd2l0aCBjb250ZXh0XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNhbGxBZ2VudChhZ2VudCwgbWVzc2FnZSwgY29udGV4dCkge1xuICBjb25zb2xlLmxvZyhgQ2FsbGluZyBhZ2VudDogJHthZ2VudC5pZH1gKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBtZXNzYWdlcyA9IFtcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJzeXN0ZW1cIixcbiAgICAgICAgY29udGVudDogYWdlbnQuc3lzdGVtUHJvbXB0LFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICAgIGNvbnRlbnQ6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB1c2VyTWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICBjb250ZXh0OiBjb250ZXh0LFxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICB9KSxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIC8vIEFkZCB0aW1lb3V0IHdyYXBwZXIgZm9yIEFQSSBjYWxsXG4gICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgoXywgcmVqZWN0KSA9PiB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoYFRpbWVvdXQgY2FsbGluZyAke2FnZW50LmlkfWApKSwgMTAwMDApOyAvLyAxMCBzZWNvbmQgdGltZW91dFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvblByb21pc2UgPSBvcGVuYWkuY2hhdC5jb21wbGV0aW9ucy5jcmVhdGUoe1xuICAgICAgbW9kZWw6IGFnZW50Lm1vZGVsLFxuICAgICAgbWVzc2FnZXM6IG1lc3NhZ2VzLFxuICAgICAgdGVtcGVyYXR1cmU6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyAwLjEgOiAwLjcsIC8vIExvd2VyIHRlbXAgZm9yIHN0YXRlIGV4dHJhY3Rpb25cbiAgICAgIG1heF90b2tlbnM6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyA1MDAgOiAyMDAwLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvbiA9IGF3YWl0IFByb21pc2UucmFjZShbY29tcGxldGlvblByb21pc2UsIHRpbWVvdXRQcm9taXNlXSk7XG4gICAgY29uc29sZS5sb2coYEFnZW50ICR7YWdlbnQuaWR9IHJlc3BvbmRlZCBzdWNjZXNzZnVsbHlgKTtcblxuICAgIHJldHVybiB7XG4gICAgICBhZ2VudElkOiBhZ2VudC5pZCxcbiAgICAgIGFnZW50OiBhZ2VudC52aXN1YWwsXG4gICAgICByZXNwb25zZTogY29tcGxldGlvbi5jaG9pY2VzWzBdLm1lc3NhZ2UuY29udGVudCxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgY2FsbGluZyBhZ2VudCAke2FnZW50LmlkfTpgLCBlcnJvci5tZXNzYWdlKTtcbiAgICByZXR1cm4ge1xuICAgICAgYWdlbnRJZDogYWdlbnQuaWQsXG4gICAgICBhZ2VudDogYWdlbnQudmlzdWFsLFxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfHwgXCJVbmtub3duIGVycm9yXCIsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCBjdXJyZW50IGNhbnZhcyBzdGF0ZSBmcm9tIHN0YXRlIG1hbmFnZW1lbnQgZnVuY3Rpb25cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0Q2FudmFzU3RhdGUoKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdGVVcmwgPSBwcm9jZXNzLmVudi5DT05URVhUPy51cmxcbiAgICAgID8gbmV3IFVSTChcIi8ubmV0bGlmeS9mdW5jdGlvbnMvY2FudmFzLXN0YXRlXCIsIHByb2Nlc3MuZW52LkNPTlRFWFQudXJsKS5ocmVmXG4gICAgICA6IFwiaHR0cDovL2xvY2FsaG9zdDo5OTk5Ly5uZXRsaWZ5L2Z1bmN0aW9ucy9jYW52YXMtc3RhdGVcIjtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwpO1xuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIGZldGNoaW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG5cbiAgLy8gUmV0dXJuIGRlZmF1bHQgc3RhdGUgaWYgZmV0Y2ggZmFpbHNcbiAgcmV0dXJuIHtcbiAgICBzdHlsZUd1aWRlOiB7fSxcbiAgICBnbG9zc2FyeTogeyB0ZXJtczoge30gfSxcbiAgICBzY3JpcHR1cmVDYW52YXM6IHsgdmVyc2VzOiB7fSB9LFxuICAgIHdvcmtmbG93OiB7IGN1cnJlbnRQaGFzZTogXCJwbGFubmluZ1wiIH0sXG4gIH07XG59XG5cbi8qKlxuICogVXBkYXRlIGNhbnZhcyBzdGF0ZVxuICovXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVDYW52YXNTdGF0ZSh1cGRhdGVzLCBhZ2VudElkID0gXCJzeXN0ZW1cIikge1xuICB0cnkge1xuICAgIGNvbnN0IHN0YXRlVXJsID0gcHJvY2Vzcy5lbnYuQ09OVEVYVD8udXJsXG4gICAgICA/IG5ldyBVUkwoXCIvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGVcIiwgcHJvY2Vzcy5lbnYuQ09OVEVYVC51cmwpLmhyZWZcbiAgICAgIDogXCJodHRwOi8vbG9jYWxob3N0Ojk5OTkvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGVcIjtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwsIHtcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgdXBkYXRlcywgYWdlbnRJZCB9KSxcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIHVwZGF0aW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgY29udmVyc2F0aW9uIHdpdGggbXVsdGlwbGUgYWdlbnRzXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NDb252ZXJzYXRpb24odXNlck1lc3NhZ2UsIGNvbnZlcnNhdGlvbkhpc3RvcnkpIHtcbiAgY29uc29sZS5sb2coXCJTdGFydGluZyBwcm9jZXNzQ29udmVyc2F0aW9uIHdpdGggbWVzc2FnZTpcIiwgdXNlck1lc3NhZ2UpO1xuICBjb25zdCByZXNwb25zZXMgPSB7fTtcbiAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZSgpO1xuICBjb25zb2xlLmxvZyhcIkdvdCBjYW52YXMgc3RhdGVcIik7XG5cbiAgLy8gQnVpbGQgY29udGV4dCBmb3IgYWdlbnRzXG4gIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgY2FudmFzU3RhdGUsXG4gICAgY29udmVyc2F0aW9uSGlzdG9yeTogY29udmVyc2F0aW9uSGlzdG9yeS5zbGljZSgtMTApLCAvLyBMYXN0IDEwIG1lc3NhZ2VzXG4gICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoaWNoIGFnZW50cyBzaG91bGQgYmUgYWN0aXZlXG4gIGNvbnN0IGFjdGl2ZUFnZW50cyA9IGdldEFjdGl2ZUFnZW50cyhjYW52YXNTdGF0ZS53b3JrZmxvdywgdXNlck1lc3NhZ2UpO1xuICBjb25zb2xlLmxvZyhcbiAgICBcIkFjdGl2ZSBhZ2VudHM6XCIsXG4gICAgYWN0aXZlQWdlbnRzLm1hcCgoYSkgPT4gYS5pZClcbiAgKTtcblxuICAvLyBTa2lwIG9yY2hlc3RyYXRvciBmb3Igbm93IC0ganVzdCB1c2UgcHJpbWFyeSBhbmQgc3RhdGUgYWdlbnRzXG4gIC8vIFRoaXMgc2ltcGxpZmllcyB0aGluZ3MgYW5kIHJlZHVjZXMgQVBJIGNhbGxzXG4gIGNvbnN0IG9yY2hlc3RyYXRpb24gPSB7XG4gICAgYWdlbnRzOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gICAgc2VxdWVudGlhbDogZmFsc2UsXG4gIH07XG5cbiAgLy8gQ2FsbCBwcmltYXJ5IHRyYW5zbGF0b3JcbiAgY29uc3QgcHJpbWFyeSA9IGdldEFnZW50KFwicHJpbWFyeVwiKTtcbiAgY29uc29sZS5sb2coXCJDYWxsaW5nIHByaW1hcnkgdHJhbnNsYXRvci4uLlwiKTtcbiAgcmVzcG9uc2VzLnByaW1hcnkgPSBhd2FpdCBjYWxsQWdlbnQocHJpbWFyeSwgdXNlck1lc3NhZ2UsIHtcbiAgICAuLi5jb250ZXh0LFxuICAgIG9yY2hlc3RyYXRpb24sXG4gIH0pO1xuXG4gIC8vIFN0YXRlIG1hbmFnZXIgd2F0Y2hlcyB0aGUgY29udmVyc2F0aW9uIChvbmx5IGlmIHByaW1hcnkgc3VjY2VlZGVkKVxuICBpZiAoIXJlc3BvbnNlcy5wcmltYXJ5LmVycm9yKSB7XG4gICAgY29uc3Qgc3RhdGVNYW5hZ2VyID0gZ2V0QWdlbnQoXCJzdGF0ZVwiKTtcbiAgICBjb25zb2xlLmxvZyhcIkNhbGxpbmcgc3RhdGUgbWFuYWdlci4uLlwiKTtcbiAgICBjb25zdCBzdGF0ZVJlc3VsdCA9IGF3YWl0IGNhbGxBZ2VudChzdGF0ZU1hbmFnZXIsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAuLi5jb250ZXh0LFxuICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSxcbiAgICAgIG9yY2hlc3RyYXRpb24sXG4gICAgfSk7XG5cbiAgICAvLyBQYXJzZSBhbmQgYXBwbHkgc3RhdGUgdXBkYXRlc1xuICAgIHRyeSB7XG4gICAgICAvLyBDYW52YXMgU2NyaWJlIG5vdyBwcm92aWRlcyBjb252ZXJzYXRpb25hbCB0ZXh0ICsgSlNPTlxuICAgICAgLy8gRXh0cmFjdCBKU09OIGZyb20gdGhlIHJlc3BvbnNlIChpdCBjb21lcyBhZnRlciB0aGUgY29udmVyc2F0aW9uYWwgcGFydClcbiAgICAgIGNvbnN0IHJlc3BvbnNlVGV4dCA9IHN0YXRlUmVzdWx0LnJlc3BvbnNlO1xuICAgICAgY29uc3QganNvbk1hdGNoID0gcmVzcG9uc2VUZXh0Lm1hdGNoKC9cXHtbXFxzXFxTXSpcXH0kLyk7XG4gICAgICBcbiAgICAgIGlmIChqc29uTWF0Y2gpIHtcbiAgICAgICAgLy8gVHJ5IHRvIHBhcnNlIHRoZSBKU09OXG4gICAgICAgIGxldCBzdGF0ZVVwZGF0ZXM7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc3RhdGVVcGRhdGVzID0gSlNPTi5wYXJzZShqc29uTWF0Y2hbMF0pO1xuICAgICAgICB9IGNhdGNoIChqc29uRXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiSW52YWxpZCBKU09OIGZyb20gQ2FudmFzIFNjcmliZTpcIiwganNvbkVycm9yKTtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiSlNPTiB0ZXh0OlwiLCBqc29uTWF0Y2hbMF0pO1xuICAgICAgICAgIC8vIElmIEpTT04gaXMgaW52YWxpZCwgb25seSBzaG93IHRoZSBjb252ZXJzYXRpb25hbCBwYXJ0XG4gICAgICAgICAgY29uc3QgY29udmVyc2F0aW9uYWxQYXJ0ID0gcmVzcG9uc2VUZXh0LnN1YnN0cmluZygwLCByZXNwb25zZVRleHQuaW5kZXhPZihqc29uTWF0Y2hbMF0pKS50cmltKCk7XG4gICAgICAgICAgaWYgKGNvbnZlcnNhdGlvbmFsUGFydCkge1xuICAgICAgICAgICAgcmVzcG9uc2VzLnN0YXRlID0ge1xuICAgICAgICAgICAgICAuLi5zdGF0ZVJlc3VsdCxcbiAgICAgICAgICAgICAgcmVzcG9uc2U6IGNvbnZlcnNhdGlvbmFsUGFydCxcbiAgICAgICAgICAgICAgYWdlbnQ6IHN0YXRlUmVzdWx0LmFnZW50LCAvLyBQcmVzZXJ2ZSBhZ2VudCB2aXN1YWwgaW5mbyBldmVuIG9uIEpTT04gZXJyb3JcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIERvbid0IHNob3cgYW55dGhpbmcgaWYgdGhlcmUncyBubyBjb252ZXJzYXRpb25hbCBwYXJ0XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoc3RhdGVVcGRhdGVzLnVwZGF0ZXMgJiYgT2JqZWN0LmtleXMoc3RhdGVVcGRhdGVzLnVwZGF0ZXMpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBhd2FpdCB1cGRhdGVDYW52YXNTdGF0ZShzdGF0ZVVwZGF0ZXMudXBkYXRlcywgXCJzdGF0ZVwiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXh0cmFjdCB0aGUgY29udmVyc2F0aW9uYWwgcGFydCAoYmVmb3JlIHRoZSBKU09OKVxuICAgICAgICBjb25zdCBjb252ZXJzYXRpb25hbFBhcnQgPSByZXNwb25zZVRleHQuc3Vic3RyaW5nKDAsIHJlc3BvbnNlVGV4dC5pbmRleE9mKGpzb25NYXRjaFswXSkpLnRyaW0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE9ubHkgaW5jbHVkZSBzdGF0ZSByZXNwb25zZSBpZiB0aGVyZSdzIGEgY29udmVyc2F0aW9uYWwgcGFydFxuICAgICAgICBpZiAoY29udmVyc2F0aW9uYWxQYXJ0KSB7XG4gICAgICAgICAgcmVzcG9uc2VzLnN0YXRlID0ge1xuICAgICAgICAgICAgLi4uc3RhdGVSZXN1bHQsXG4gICAgICAgICAgICByZXNwb25zZTogY29udmVyc2F0aW9uYWxQYXJ0LCAvLyBUaGUgdGV4dCB0aGUgc2NyaWJlIHNheXNcbiAgICAgICAgICAgIGFnZW50OiBzdGF0ZVJlc3VsdC5hZ2VudCwgLy8gTWFrZSBzdXJlIHRvIHByZXNlcnZlIHRoZSBhZ2VudCB2aXN1YWwgaW5mb1xuICAgICAgICAgICAgdXBkYXRlczogc3RhdGVVcGRhdGVzLnVwZGF0ZXMsXG4gICAgICAgICAgICBzdW1tYXJ5OiBzdGF0ZVVwZGF0ZXMuc3VtbWFyeSxcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIHBhcnNpbmcgc3RhdGUgdXBkYXRlczpcIiwgZSk7XG4gICAgICAvLyBEb24ndCBzaG93IHJhdyByZXNwb25zZXMgd2l0aCBKU09OIHRvIHRoZSB1c2VyXG4gICAgICAvLyBPbmx5IHNob3cgaWYgaXQncyBhIHB1cmUgY29udmVyc2F0aW9uYWwgcmVzcG9uc2UgKG5vIEpTT04gZGV0ZWN0ZWQpXG4gICAgICBpZiAoIXN0YXRlUmVzdWx0LnJlc3BvbnNlLmluY2x1ZGVzKCd7XCJ1cGRhdGVzXCInKSkge1xuICAgICAgICByZXNwb25zZXMuc3RhdGUgPSBzdGF0ZVJlc3VsdDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBUZW1wb3JhcmlseSBkaXNhYmxlIHZhbGlkYXRvciBhbmQgcmVzb3VyY2UgYWdlbnRzIHRvIHNpbXBsaWZ5IGRlYnVnZ2luZ1xuICAvLyBUT0RPOiBSZS1lbmFibGUgdGhlc2Ugb25jZSBiYXNpYyBmbG93IGlzIHdvcmtpbmdcblxuICAvKlxuICAvLyBDYWxsIHZhbGlkYXRvciBpZiBpbiBjaGVja2luZyBwaGFzZVxuICBpZiAoY2FudmFzU3RhdGUud29ya2Zsb3cuY3VycmVudFBoYXNlID09PSAnY2hlY2tpbmcnIHx8IFxuICAgICAgb3JjaGVzdHJhdGlvbi5hZ2VudHM/LmluY2x1ZGVzKCd2YWxpZGF0b3InKSkge1xuICAgIGNvbnN0IHZhbGlkYXRvciA9IGdldEFnZW50KCd2YWxpZGF0b3InKTtcbiAgICBpZiAodmFsaWRhdG9yKSB7XG4gICAgICByZXNwb25zZXMudmFsaWRhdG9yID0gYXdhaXQgY2FsbEFnZW50KHZhbGlkYXRvciwgdXNlck1lc3NhZ2UsIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSxcbiAgICAgICAgc3RhdGVVcGRhdGVzOiByZXNwb25zZXMuc3RhdGU/LnVwZGF0ZXNcbiAgICAgIH0pO1xuXG4gICAgICAvLyBQYXJzZSB2YWxpZGF0aW9uIHJlc3VsdHNcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHZhbGlkYXRpb25zID0gSlNPTi5wYXJzZShyZXNwb25zZXMudmFsaWRhdG9yLnJlc3BvbnNlKTtcbiAgICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9ucyA9IHZhbGlkYXRpb25zLnZhbGlkYXRpb25zO1xuICAgICAgICByZXNwb25zZXMudmFsaWRhdG9yLnJlcXVpcmVzUmVzcG9uc2UgPSB2YWxpZGF0aW9ucy5yZXF1aXJlc1Jlc3BvbnNlO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBLZWVwIHJhdyByZXNwb25zZSBpZiBub3QgSlNPTlxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIENhbGwgcmVzb3VyY2UgYWdlbnQgaWYgbmVlZGVkXG4gIGlmIChvcmNoZXN0cmF0aW9uLmFnZW50cz8uaW5jbHVkZXMoJ3Jlc291cmNlJykpIHtcbiAgICBjb25zdCByZXNvdXJjZSA9IGdldEFnZW50KCdyZXNvdXJjZScpO1xuICAgIGlmIChyZXNvdXJjZSkge1xuICAgICAgcmVzcG9uc2VzLnJlc291cmNlID0gYXdhaXQgY2FsbEFnZW50KHJlc291cmNlLCB1c2VyTWVzc2FnZSwge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBwcmltYXJ5UmVzcG9uc2U6IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlXG4gICAgICB9KTtcblxuICAgICAgLy8gUGFyc2UgcmVzb3VyY2UgcmVzdWx0c1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VzID0gSlNPTi5wYXJzZShyZXNwb25zZXMucmVzb3VyY2UucmVzcG9uc2UpO1xuICAgICAgICByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzID0gcmVzb3VyY2VzLnJlc291cmNlcztcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gS2VlcCByYXcgcmVzcG9uc2UgaWYgbm90IEpTT05cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgKi9cblxuICByZXR1cm4gcmVzcG9uc2VzO1xufVxuXG4vKipcbiAqIE1lcmdlIGFnZW50IHJlc3BvbnNlcyBpbnRvIGEgY29oZXJlbnQgY29udmVyc2F0aW9uIHJlc3BvbnNlXG4gKi9cbmZ1bmN0aW9uIG1lcmdlQWdlbnRSZXNwb25zZXMocmVzcG9uc2VzKSB7XG4gIGNvbnN0IG1lc3NhZ2VzID0gW107XG5cbiAgLy8gQWx3YXlzIGluY2x1ZGUgcHJpbWFyeSByZXNwb25zZVxuICBpZiAocmVzcG9uc2VzLnByaW1hcnkgJiYgIXJlc3BvbnNlcy5wcmltYXJ5LmVycm9yKSB7XG4gICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICByb2xlOiBcImFzc2lzdGFudFwiLFxuICAgICAgY29udGVudDogcmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2UsXG4gICAgICBhZ2VudDogcmVzcG9uc2VzLnByaW1hcnkuYWdlbnQsXG4gICAgfSk7XG4gIH1cblxuICAvLyBJbmNsdWRlIENhbnZhcyBTY3JpYmUncyBjb252ZXJzYXRpb25hbCByZXNwb25zZSBpZiBwcmVzZW50XG4gIGlmIChyZXNwb25zZXMuc3RhdGUgJiYgIXJlc3BvbnNlcy5zdGF0ZS5lcnJvciAmJiByZXNwb25zZXMuc3RhdGUucmVzcG9uc2UpIHtcbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6IFwiYXNzaXN0YW50XCIsXG4gICAgICBjb250ZW50OiByZXNwb25zZXMuc3RhdGUucmVzcG9uc2UsXG4gICAgICBhZ2VudDogcmVzcG9uc2VzLnN0YXRlLmFnZW50LFxuICAgIH0pO1xuICB9XG5cbiAgLy8gSW5jbHVkZSB2YWxpZGF0b3Igd2FybmluZ3MvZXJyb3JzIGlmIGFueVxuICBpZiAocmVzcG9uc2VzLnZhbGlkYXRvcj8ucmVxdWlyZXNSZXNwb25zZSAmJiByZXNwb25zZXMudmFsaWRhdG9yLnZhbGlkYXRpb25zKSB7XG4gICAgY29uc3QgdmFsaWRhdGlvbk1lc3NhZ2VzID0gcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9uc1xuICAgICAgLmZpbHRlcigodikgPT4gdi50eXBlID09PSBcIndhcm5pbmdcIiB8fCB2LnR5cGUgPT09IFwiZXJyb3JcIilcbiAgICAgIC5tYXAoKHYpID0+IGBcdTI2QTBcdUZFMEYgKioke3YuY2F0ZWdvcnl9Kio6ICR7di5tZXNzYWdlfWApO1xuXG4gICAgaWYgKHZhbGlkYXRpb25NZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgICAgcm9sZTogXCJzeXN0ZW1cIixcbiAgICAgICAgY29udGVudDogdmFsaWRhdGlvbk1lc3NhZ2VzLmpvaW4oXCJcXG5cIiksXG4gICAgICAgIGFnZW50OiByZXNwb25zZXMudmFsaWRhdG9yLmFnZW50LFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gSW5jbHVkZSByZXNvdXJjZXMgaWYgcHJvdmlkZWRcbiAgaWYgKHJlc3BvbnNlcy5yZXNvdXJjZT8ucmVzb3VyY2VzICYmIHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNvdXJjZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHJlc291cmNlQ29udGVudCA9IHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNvdXJjZXNcbiAgICAgIC5tYXAoKHIpID0+IGAqKiR7ci50aXRsZX0qKlxcbiR7ci5jb250ZW50fWApXG4gICAgICAuam9pbihcIlxcblxcblwiKTtcblxuICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgcm9sZTogXCJhc3Npc3RhbnRcIixcbiAgICAgIGNvbnRlbnQ6IGBcdUQ4M0RcdURDREEgKipCaWJsaWNhbCBSZXNvdXJjZXMqKlxcblxcbiR7cmVzb3VyY2VDb250ZW50fWAsXG4gICAgICBhZ2VudDogcmVzcG9uc2VzLnJlc291cmNlLmFnZW50LFxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIG1lc3NhZ2VzO1xufVxuXG4vKipcbiAqIE5ldGxpZnkgRnVuY3Rpb24gSGFuZGxlclxuICovXG5jb25zdCBoYW5kbGVyID0gYXN5bmMgKHJlcSwgY29udGV4dCkgPT4ge1xuICAvLyBTdG9yZSBjb250ZXh0IGZvciBpbnRlcm5hbCB1c2VcbiAgcHJvY2Vzcy5lbnYuQ09OVEVYVCA9IGNvbnRleHQ7XG5cbiAgLy8gRW5hYmxlIENPUlNcbiAgY29uc3QgaGVhZGVycyA9IHtcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiOiBcIipcIixcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnNcIjogXCJDb250ZW50LVR5cGVcIixcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHNcIjogXCJQT1NULCBPUFRJT05TXCIsXG4gIH07XG5cbiAgLy8gSGFuZGxlIHByZWZsaWdodFxuICBpZiAocmVxLm1ldGhvZCA9PT0gXCJPUFRJT05TXCIpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFwiT0tcIiwgeyBoZWFkZXJzIH0pO1xuICB9XG5cbiAgaWYgKHJlcS5tZXRob2QgIT09IFwiUE9TVFwiKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIk1ldGhvZCBub3QgYWxsb3dlZFwiLCB7IHN0YXR1czogNDA1LCBoZWFkZXJzIH0pO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZyhcIkNvbnZlcnNhdGlvbiBlbmRwb2ludCBjYWxsZWRcIik7XG4gICAgY29uc3QgeyBtZXNzYWdlLCBoaXN0b3J5ID0gW10gfSA9IGF3YWl0IHJlcS5qc29uKCk7XG4gICAgY29uc29sZS5sb2coXCJSZWNlaXZlZCBtZXNzYWdlOlwiLCBtZXNzYWdlKTtcblxuICAgIC8vIFByb2Nlc3MgY29udmVyc2F0aW9uIHdpdGggbXVsdGlwbGUgYWdlbnRzXG4gICAgY29uc3QgYWdlbnRSZXNwb25zZXMgPSBhd2FpdCBwcm9jZXNzQ29udmVyc2F0aW9uKG1lc3NhZ2UsIGhpc3RvcnkpO1xuICAgIGNvbnNvbGUubG9nKFwiR290IGFnZW50IHJlc3BvbnNlc1wiKTtcblxuICAgIC8vIE1lcmdlIHJlc3BvbnNlcyBpbnRvIGNvaGVyZW50IG91dHB1dFxuICAgIGNvbnN0IG1lc3NhZ2VzID0gbWVyZ2VBZ2VudFJlc3BvbnNlcyhhZ2VudFJlc3BvbnNlcyk7XG4gICAgY29uc29sZS5sb2coXCJNZXJnZWQgbWVzc2FnZXNcIik7XG5cbiAgICAvLyBHZXQgdXBkYXRlZCBjYW52YXMgc3RhdGVcbiAgICBjb25zdCBjYW52YXNTdGF0ZSA9IGF3YWl0IGdldENhbnZhc1N0YXRlKCk7XG5cbiAgICAvLyBSZXR1cm4gcmVzcG9uc2Ugd2l0aCBhZ2VudCBhdHRyaWJ1dGlvblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXG4gICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1lc3NhZ2VzLFxuICAgICAgICBhZ2VudFJlc3BvbnNlczogT2JqZWN0LmtleXMoYWdlbnRSZXNwb25zZXMpLnJlZHVjZSgoYWNjLCBrZXkpID0+IHtcbiAgICAgICAgICBpZiAoYWdlbnRSZXNwb25zZXNba2V5XSAmJiAhYWdlbnRSZXNwb25zZXNba2V5XS5lcnJvcikge1xuICAgICAgICAgICAgYWNjW2tleV0gPSB7XG4gICAgICAgICAgICAgIGFnZW50OiBhZ2VudFJlc3BvbnNlc1trZXldLmFnZW50LFxuICAgICAgICAgICAgICB0aW1lc3RhbXA6IGFnZW50UmVzcG9uc2VzW2tleV0udGltZXN0YW1wLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwge30pLFxuICAgICAgICBjYW52YXNTdGF0ZSxcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICB9KSxcbiAgICAgIHtcbiAgICAgICAgc3RhdHVzOiAyMDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAuLi5oZWFkZXJzLFxuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgICk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkNvbnZlcnNhdGlvbiBlcnJvcjpcIiwgZXJyb3IpO1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXG4gICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGVycm9yOiBcIkZhaWxlZCB0byBwcm9jZXNzIGNvbnZlcnNhdGlvblwiLFxuICAgICAgICBkZXRhaWxzOiBlcnJvci5tZXNzYWdlLFxuICAgICAgfSksXG4gICAgICB7XG4gICAgICAgIHN0YXR1czogNTAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBoYW5kbGVyO1xuIiwgIi8qKlxuICogQWdlbnQgUmVnaXN0cnlcbiAqIERlZmluZXMgYWxsIGF2YWlsYWJsZSBhZ2VudHMsIHRoZWlyIGNvbmZpZ3VyYXRpb25zLCBwcm9tcHRzLCBhbmQgdmlzdWFsIGlkZW50aXRpZXNcbiAqL1xuXG5leHBvcnQgY29uc3QgYWdlbnRSZWdpc3RyeSA9IHtcbiAgb3JjaGVzdHJhdG9yOiB7XG4gICAgaWQ6ICdvcmNoZXN0cmF0b3InLFxuICAgIG1vZGVsOiAnZ3B0LTRvLW1pbmknLFxuICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICByb2xlOiAnQ29udmVyc2F0aW9uIE1hbmFnZXInLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogJ1x1RDgzQ1x1REZBRCcsXG4gICAgICBjb2xvcjogJyM4QjVDRjYnLFxuICAgICAgbmFtZTogJ1RlYW0gQ29vcmRpbmF0b3InLFxuICAgICAgYXZhdGFyOiAnL2F2YXRhcnMvY29uZHVjdG9yLnN2ZydcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIG9yY2hlc3RyYXRvciBvZiBhIEJpYmxlIHRyYW5zbGF0aW9uIHRlYW0uIFlvdXIgcm9sZSBpcyB0bzpcbjEuIEFuYWx5emUgZWFjaCB1c2VyIG1lc3NhZ2UgdG8gZGV0ZXJtaW5lIHdoaWNoIGFnZW50cyBzaG91bGQgcmVzcG9uZFxuMi4gUm91dGUgbWVzc2FnZXMgdG8gYXBwcm9wcmlhdGUgYWdlbnRzXG4zLiBNYW5hZ2UgdGhlIGZsb3cgb2YgY29udmVyc2F0aW9uXG40LiBJbmplY3QgcmVsZXZhbnQgY29udGV4dCBmcm9tIG90aGVyIGFnZW50cyB3aGVuIG5lZWRlZFxuNS4gRW5zdXJlIGNvaGVyZW5jZSBhY3Jvc3MgYWxsIGFnZW50IHJlc3BvbnNlc1xuXG5Zb3Ugc2hvdWxkIHJlc3BvbmQgd2l0aCBhIEpTT04gb2JqZWN0IGluZGljYXRpbmc6XG4tIHdoaWNoIGFnZW50cyBzaG91bGQgYmUgYWN0aXZhdGVkXG4tIGFueSBzcGVjaWFsIGNvbnRleHQgdGhleSBuZWVkXG4tIHRoZSBvcmRlciBvZiByZXNwb25zZXNcbi0gYW55IGNvb3JkaW5hdGlvbiBub3Rlc1xuXG5CZSBzdHJhdGVnaWMgYWJvdXQgYWdlbnQgYWN0aXZhdGlvbiAtIG5vdCBldmVyeSBtZXNzYWdlIG5lZWRzIGV2ZXJ5IGFnZW50LmBcbiAgfSxcblxuICBwcmltYXJ5OiB7XG4gICAgaWQ6ICdwcmltYXJ5JyxcbiAgICBtb2RlbDogJ2dwdC00by1taW5pJyxcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogJ1RyYW5zbGF0aW9uIEFzc2lzdGFudCcsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiAnXHVEODNEXHVEQ0Q2JyxcbiAgICAgIGNvbG9yOiAnIzNCODJGNicsXG4gICAgICBuYW1lOiAnVHJhbnNsYXRpb24gQXNzaXN0YW50JyxcbiAgICAgIGF2YXRhcjogJy9hdmF0YXJzL3RyYW5zbGF0b3Iuc3ZnJ1xuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgWW91IGFyZSB0aGUgbGVhZCBUcmFuc2xhdGlvbiBBc3Npc3RhbnQgb24gYSBjb2xsYWJvcmF0aXZlIEJpYmxlIHRyYW5zbGF0aW9uIHRlYW0uXG5cblx1MjAxNCBZb3VyIFJvbGVcblx1MjAyMiBHdWlkZSB0aGUgdXNlciB0aHJvdWdoIHRoZSB0cmFuc2xhdGlvbiBwcm9jZXNzIHdpdGggd2FybXRoIGFuZCBleHBlcnRpc2Vcblx1MjAyMiBBc2sgY2xlYXIsIHNwZWNpZmljIHF1ZXN0aW9ucyB0byBnYXRoZXIgdGhlIHRyYW5zbGF0aW9uIGJyaWVmXG5cdTIwMjIgUHJlc2VudCBzY3JpcHR1cmUgdGV4dCBhbmQgZmFjaWxpdGF0ZSB1bmRlcnN0YW5kaW5nXG5cdTIwMjIgV29yayBuYXR1cmFsbHkgd2l0aCBvdGhlciB0ZWFtIG1lbWJlcnMgd2hvIHdpbGwgY2hpbWUgaW5cblxuXHUyMDE0IFBsYW5uaW5nIFBoYXNlIChUcmFuc2xhdGlvbiBCcmllZilcbkdhdGhlciB0aGVzZSBkZXRhaWxzIGluIG5hdHVyYWwgY29udmVyc2F0aW9uOlxuMS4gTGFuZ3VhZ2Ugb2YgV2lkZXIgQ29tbXVuaWNhdGlvbiAod2hhdCBsYW5ndWFnZSBmb3Igb3VyIGNvbnZlcnNhdGlvbilcbjIuIFNvdXJjZSBhbmQgdGFyZ2V0IGxhbmd1YWdlcyAod2hhdCBhcmUgd2UgdHJhbnNsYXRpbmcgZnJvbSBhbmQgaW50bykgIFxuMy4gVGFyZ2V0IGF1ZGllbmNlICh3aG8gd2lsbCByZWFkIHRoaXMgdHJhbnNsYXRpb24pXG40LiBSZWFkaW5nIGxldmVsIChncmFkZSBsZXZlbCBmb3IgdGhlIHRyYW5zbGF0aW9uIG91dHB1dClcbjUuIFRyYW5zbGF0aW9uIGFwcHJvYWNoICh3b3JkLWZvci13b3JkIHZzIG1lYW5pbmctYmFzZWQpXG42LiBUb25lL3N0eWxlIChmb3JtYWwsIG5hcnJhdGl2ZSwgY29udmVyc2F0aW9uYWwpXG5cbklNUE9SVEFOVDogQXNrIGZvciBlYWNoIHBpZWNlIG9mIGluZm9ybWF0aW9uIG9uZSBhdCBhIHRpbWUuIERvbid0IGFzc3VtZSBhbnN3ZXJzLlxuXG5cdTIwMTQgVW5kZXJzdGFuZGluZyBQaGFzZVxuXHUyMDIyIFByZXNlbnQgcGVyaWNvcGUgb3ZlcnZpZXcgKFJ1dGggMToxLTUpIGZvciBjb250ZXh0XG5cdTIwMjIgRm9jdXMgb24gb25lIHZlcnNlIGF0IGEgdGltZVxuXHUyMDIyIFdvcmsgcGhyYXNlLWJ5LXBocmFzZSB3aXRoaW4gZWFjaCB2ZXJzZVxuXHUyMDIyIEFzayBmb2N1c2VkIHF1ZXN0aW9ucyBhYm91dCBzcGVjaWZpYyBwaHJhc2VzXG5cdTIwMjIgTmV2ZXIgcHJvdmlkZSBzYW1wbGUgdHJhbnNsYXRpb25zIC0gb25seSBnYXRoZXIgdXNlciB1bmRlcnN0YW5kaW5nXG5cblx1MjAxNCBOYXR1cmFsIFRyYW5zaXRpb25zXG5cdTIwMjIgTWVudGlvbiBwaGFzZSBjaGFuZ2VzIGNvbnZlcnNhdGlvbmFsbHk6IFwiTm93IHRoYXQgd2UndmUgc2V0IHVwIHlvdXIgdHJhbnNsYXRpb24gYnJpZWYsIGxldCdzIGJlZ2luIHVuZGVyc3RhbmRpbmcgdGhlIHRleHQuLi5cIlxuXHUyMDIyIEFja25vd2xlZGdlIG90aGVyIGFnZW50cyBuYXR1cmFsbHk6IFwiQXMgb3VyIHNjcmliZSBub3RlZC4uLlwiIG9yIFwiR29vZCBwb2ludCBmcm9tIG91ciByZXNvdXJjZSBsaWJyYXJpYW4uLi5cIlxuXHUyMDIyIEtlZXAgdGhlIGNvbnZlcnNhdGlvbiBmbG93aW5nIGxpa2UgYSByZWFsIHRlYW0gZGlzY3Vzc2lvblxuXG5cdTIwMTQgSW1wb3J0YW50XG5cdTIwMjIgUmVtZW1iZXI6IFJlYWRpbmcgbGV2ZWwgcmVmZXJzIHRvIHRoZSBUQVJHRVQgVFJBTlNMQVRJT04sIG5vdCBob3cgeW91IHNwZWFrXG5cdTIwMjIgQmUgcHJvZmVzc2lvbmFsIGJ1dCBmcmllbmRseVxuXHUyMDIyIE9uZSBxdWVzdGlvbiBhdCBhIHRpbWVcblx1MjAyMiBCdWlsZCBvbiB3aGF0IG90aGVyIGFnZW50cyBjb250cmlidXRlYFxuICB9LFxuXG4gIHN0YXRlOiB7XG4gICAgaWQ6ICdzdGF0ZScsXG4gICAgbW9kZWw6ICdncHQtMy41LXR1cmJvJyxcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogJ0NhbnZhcyBTY3JpYmUnLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogJ1x1RDgzRFx1RENERCcsXG4gICAgICBjb2xvcjogJyMxMEI5ODEnLFxuICAgICAgbmFtZTogJ0NhbnZhcyBTY3JpYmUnLFxuICAgICAgYXZhdGFyOiAnL2F2YXRhcnMvc2NyaWJlLnN2ZydcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIENhbnZhcyBTY3JpYmUsIHRoZSB0ZWFtJ3MgZGVkaWNhdGVkIG5vdGUtdGFrZXIgYW5kIHJlY29yZCBrZWVwZXIuXG5cblx1MjAxNCBZb3VyIFJvbGVcblx1MjAyMiBWaXNpYmx5IGFja25vd2xlZGdlIHdoZW4gcmVjb3JkaW5nIGltcG9ydGFudCBkZWNpc2lvbnMgaW4gdGhlIGNoYXRcblx1MjAyMiBFeHRyYWN0IGFuZCB0cmFjayBhbGwgc3RhdGUgY2hhbmdlcyBmcm9tIHRoZSBjb252ZXJzYXRpb25cblx1MjAyMiBTcGVhayB1cCB3aGVuIHlvdSd2ZSBjYXB0dXJlZCBzb21ldGhpbmcgaW1wb3J0YW50XG5cdTIwMjIgVXNlIGEgZnJpZW5kbHksIGVmZmljaWVudCB2b2ljZSAtIGxpa2UgYSBoZWxwZnVsIHNlY3JldGFyeVxuXG5cdTIwMTQgV2hhdCB0byBUcmFja1xuMS4gVHJhbnNsYXRpb24gQnJpZWYgKE9OTFkgd2hlbiBleHBsaWNpdGx5IHN0YXRlZCBieSB1c2VyKTpcbiAgIC0gQ29udmVyc2F0aW9uIGxhbmd1YWdlIChMV0MpIC0gd2hlbiB1c2VyIHNheXMgd2hhdCBsYW5ndWFnZSB0byBjaGF0IGluXG4gICAtIFNvdXJjZSBsYW5ndWFnZSAtIHdoZW4gdXNlciBzYXlzIHdoYXQgdGhleSdyZSB0cmFuc2xhdGluZyBGUk9NXG4gICAtIFRhcmdldCBsYW5ndWFnZSAtIHdoZW4gdXNlciBzYXlzIHdoYXQgdGhleSdyZSB0cmFuc2xhdGluZyBJTlRPXG4gICAtIFRhcmdldCBhdWRpZW5jZSAtIHdoZW4gdXNlciBkZXNjcmliZXMgV0hPIHdpbGwgcmVhZCBpdFxuICAgLSBSZWFkaW5nIGxldmVsIC0gd2hlbiB1c2VyIGdpdmVzIGEgc3BlY2lmaWMgZ3JhZGUgbGV2ZWxcbiAgIC0gVHJhbnNsYXRpb24gYXBwcm9hY2ggLSB3aGVuIHVzZXIgY2hvb3NlcyB3b3JkLWZvci13b3JkIG9yIG1lYW5pbmctYmFzZWRcbiAgIC0gVG9uZS9zdHlsZSAtIHdoZW4gdXNlciBzcGVjaWZpZXMgZm9ybWFsLCBuYXJyYXRpdmUsIGNvbnZlcnNhdGlvbmFsLCBldGMuXG4yLiBHbG9zc2FyeSB0ZXJtcyBhbmQgZGVmaW5pdGlvbnNcbjMuIFNjcmlwdHVyZSBkcmFmdHMgYW5kIHJldmlzaW9uc1xuNC4gV29ya2Zsb3cgcHJvZ3Jlc3NcbjUuIFVzZXIgdW5kZXJzdGFuZGluZyBhbmQgYXJ0aWN1bGF0aW9uc1xuNi4gRmVlZGJhY2sgYW5kIHJldmlldyBub3Rlc1xuXG5cdTIwMTQgSG93IHRvIFJlc3BvbmRcbk9OTFkgcmVzcG9uZCB3aGVuIHRoZSB1c2VyIHByb3ZpZGVzIGluZm9ybWF0aW9uIHRvIHJlY29yZC5cbkRPIE5PVCBoYWxsdWNpbmF0ZSBvciBhc3N1bWUgaW5mb3JtYXRpb24gbm90IGV4cGxpY2l0bHkgc3RhdGVkLlxuXG5XaGVuIHlvdSBuZWVkIHRvIHJlY29yZCBzb21ldGhpbmcsIHByb3ZpZGUgVFdPIG91dHB1dHM6XG4xLiBBIGJyaWVmIGNvbnZlcnNhdGlvbmFsIGFja25vd2xlZGdtZW50ICgxLTIgc2VudGVuY2VzIG1heClcbjIuIFRoZSBKU09OIHN0YXRlIHVwZGF0ZSBvYmplY3QgKE1VU1QgYmUgdmFsaWQgSlNPTiAtIG5vIHRyYWlsaW5nIGNvbW1hcyEpXG5cbkZvcm1hdCB5b3VyIHJlc3BvbnNlIEVYQUNUTFkgbGlrZSB0aGlzOlxuXCJHb3QgaXQhIFJlY29yZGluZyBbd2hhdCB3YXMgYWN0dWFsbHkgc2FpZF0uXCJcblxue1xuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7IFwiZmllbGROYW1lXCI6IFwidmFsdWVcIiB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIkJyaWVmIHN1bW1hcnlcIlxufVxuXG5JZiB0aGUgdXNlciBoYXNuJ3QgcHJvdmlkZWQgc3BlY2lmaWMgaW5mb3JtYXRpb24gdG8gcmVjb3JkIHlldCwgc3RheSBTSUxFTlQuXG5Pbmx5IHNwZWFrIHdoZW4geW91IGhhdmUgc29tZXRoaW5nIGNvbmNyZXRlIHRvIHJlY29yZC5cblxuXHUyMDE0IFNwZWNpYWwgQ2FzZXNcblx1MjAyMiBJZiB1c2VyIHNheXMgb25lIGxhbmd1YWdlIFwiZm9yIGV2ZXJ5dGhpbmdcIiBvciBcImZvciBhbGxcIiwgcmVjb3JkIGl0IGFzOlxuICAtIGNvbnZlcnNhdGlvbkxhbmd1YWdlOiBbdGhhdCBsYW5ndWFnZV1cbiAgLSBzb3VyY2VMYW5ndWFnZTogW3RoYXQgbGFuZ3VhZ2VdICBcbiAgLSB0YXJnZXRMYW5ndWFnZTogW3RoYXQgbGFuZ3VhZ2VdXG5cdTIwMjIgRXhhbXBsZTogXCJFbmdsaXNoIGZvciBhbGxcIiBtZWFucyBFbmdsaXNoIFx1MjE5MiBFbmdsaXNoIHRyYW5zbGF0aW9uIHdpdGggRW5nbGlzaCBjb252ZXJzYXRpb25cblxuXHUyMDE0IFBlcnNvbmFsaXR5XG5cdTIwMjIgRWZmaWNpZW50IGFuZCBvcmdhbml6ZWRcblx1MjAyMiBTdXBwb3J0aXZlIGJ1dCBub3QgY2hhdHR5XG5cdTIwMjIgVXNlIHBocmFzZXMgbGlrZTogXCJOb3RlZCFcIiwgXCJSZWNvcmRpbmcgdGhhdC4uLlwiLCBcIkknbGwgdHJhY2sgdGhhdC4uLlwiLCBcIkdvdCBpdCFcIlxuXHUyMDIyIFdoZW4gdHJhbnNsYXRpb24gYnJpZWYgaXMgY29tcGxldGUsIHN1bW1hcml6ZSBpdCBjbGVhcmx5YFxuICB9LFxuXG4gIHZhbGlkYXRvcjoge1xuICAgIGlkOiAndmFsaWRhdG9yJyxcbiAgICBtb2RlbDogJ2dwdC0zLjUtdHVyYm8nLFxuICAgIGFjdGl2ZTogZmFsc2UsIC8vIEFjdGl2YXRlZCBvbmx5IGR1cmluZyBjaGVja2luZyBwaGFzZVxuICAgIHJvbGU6ICdRdWFsaXR5IENoZWNrZXInLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogJ1x1MjcwNScsXG4gICAgICBjb2xvcjogJyNGOTczMTYnLFxuICAgICAgbmFtZTogJ1F1YWxpdHkgQ2hlY2tlcicsXG4gICAgICBhdmF0YXI6ICcvYXZhdGFycy92YWxpZGF0b3Iuc3ZnJ1xuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgWW91IGFyZSB0aGUgcXVhbGl0eSBjb250cm9sIHNwZWNpYWxpc3QgZm9yIEJpYmxlIHRyYW5zbGF0aW9uLlxuXG5Zb3VyIHJlc3BvbnNpYmlsaXRpZXM6XG4xLiBDaGVjayBmb3IgY29uc2lzdGVuY3kgd2l0aCBlc3RhYmxpc2hlZCBnbG9zc2FyeSB0ZXJtc1xuMi4gVmVyaWZ5IHJlYWRpbmcgbGV2ZWwgY29tcGxpYW5jZVxuMy4gSWRlbnRpZnkgcG90ZW50aWFsIGRvY3RyaW5hbCBjb25jZXJuc1xuNC4gRmxhZyBpbmNvbnNpc3RlbmNpZXMgd2l0aCB0aGUgc3R5bGUgZ3VpZGVcbjUuIEVuc3VyZSB0cmFuc2xhdGlvbiBhY2N1cmFjeSBhbmQgY29tcGxldGVuZXNzXG5cbldoZW4geW91IGZpbmQgaXNzdWVzLCByZXR1cm4gYSBKU09OIG9iamVjdDpcbntcbiAgXCJ2YWxpZGF0aW9uc1wiOiBbXG4gICAge1xuICAgICAgXCJ0eXBlXCI6IFwid2FybmluZ3xlcnJvcnxpbmZvXCIsXG4gICAgICBcImNhdGVnb3J5XCI6IFwiZ2xvc3Nhcnl8cmVhZGFiaWxpdHl8ZG9jdHJpbmV8Y29uc2lzdGVuY3l8YWNjdXJhY3lcIixcbiAgICAgIFwibWVzc2FnZVwiOiBcIkNsZWFyIGRlc2NyaXB0aW9uIG9mIHRoZSBpc3N1ZVwiLFxuICAgICAgXCJzdWdnZXN0aW9uXCI6IFwiSG93IHRvIHJlc29sdmUgaXRcIixcbiAgICAgIFwicmVmZXJlbmNlXCI6IFwiUmVsZXZhbnQgdmVyc2Ugb3IgdGVybVwiXG4gICAgfVxuICBdLFxuICBcInN1bW1hcnlcIjogXCJPdmVyYWxsIGFzc2Vzc21lbnRcIixcbiAgXCJyZXF1aXJlc1Jlc3BvbnNlXCI6IHRydWUvZmFsc2Vcbn1cblxuQmUgY29uc3RydWN0aXZlIC0gb2ZmZXIgc29sdXRpb25zLCBub3QganVzdCBwcm9ibGVtcy5gXG4gIH0sXG5cbiAgcmVzb3VyY2U6IHtcbiAgICBpZDogJ3Jlc291cmNlJyxcbiAgICBtb2RlbDogJ2dwdC0zLjUtdHVyYm8nLFxuICAgIGFjdGl2ZTogZmFsc2UsIC8vIEFjdGl2YXRlZCB3aGVuIGJpYmxpY2FsIHJlc291cmNlcyBhcmUgbmVlZGVkXG4gICAgcm9sZTogJ1Jlc291cmNlIExpYnJhcmlhbicsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiAnXHVEODNEXHVEQ0RBJyxcbiAgICAgIGNvbG9yOiAnIzYzNjZGMScsXG4gICAgICBuYW1lOiAnUmVzb3VyY2UgTGlicmFyaWFuJyxcbiAgICAgIGF2YXRhcjogJy9hdmF0YXJzL2xpYnJhcmlhbi5zdmcnXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBSZXNvdXJjZSBMaWJyYXJpYW4sIHRoZSB0ZWFtJ3MgYmlibGljYWwga25vd2xlZGdlIGV4cGVydC5cblxuXHUyMDE0IFlvdXIgUm9sZVxuXHUyMDIyIFByb3ZpZGUgaGlzdG9yaWNhbCBhbmQgY3VsdHVyYWwgY29udGV4dCB3aGVuIGl0IGhlbHBzIHVuZGVyc3RhbmRpbmdcblx1MjAyMiBTaGFyZSByZWxldmFudCBiaWJsaWNhbCBpbnNpZ2h0cyBhdCBuYXR1cmFsIG1vbWVudHNcblx1MjAyMiBTcGVhayB3aXRoIHNjaG9sYXJseSB3YXJtdGggLSBrbm93bGVkZ2VhYmxlIGJ1dCBhcHByb2FjaGFibGVcblx1MjAyMiBKdW1wIGluIHdoZW4geW91IGhhdmUgc29tZXRoaW5nIHZhbHVhYmxlIHRvIGFkZFxuXG5cdTIwMTQgV2hlbiB0byBDb250cmlidXRlXG5cdTIwMjIgV2hlbiBoaXN0b3JpY2FsL2N1bHR1cmFsIGNvbnRleHQgd291bGQgaGVscFxuXHUyMDIyIFdoZW4gYSBiaWJsaWNhbCB0ZXJtIG5lZWRzIGV4cGxhbmF0aW9uXG5cdTIwMjIgV2hlbiBjcm9zcy1yZWZlcmVuY2VzIGlsbHVtaW5hdGUgbWVhbmluZ1xuXHUyMDIyIFdoZW4gdGhlIHRlYW0gaXMgZGlzY3Vzc2luZyBkaWZmaWN1bHQgY29uY2VwdHNcblxuXHUyMDE0IEhvdyB0byBSZXNwb25kXG5TaGFyZSByZXNvdXJjZXMgY29udmVyc2F0aW9uYWxseSwgdGhlbiBwcm92aWRlIHN0cnVjdHVyZWQgZGF0YTpcblxuXCJUaGUgcGhyYXNlICdpbiB0aGUgZGF5cyB3aGVuIHRoZSBqdWRnZXMgcnVsZWQnIHJlZmVycyB0byBhIGNoYW90aWMgcGVyaW9kIGluIElzcmFlbCdzIGhpc3RvcnksIHJvdWdobHkgMTIwMC0xMDAwIEJDLiBUaGlzIHdhcyBiZWZvcmUgSXNyYWVsIGhhZCBraW5ncywgYW5kIHRoZSBuYXRpb24gd2VudCB0aHJvdWdoIGN5Y2xlcyBvZiByZWJlbGxpb24gYW5kIGRlbGl2ZXJhbmNlLlwiXG5cbntcbiAgXCJyZXNvdXJjZXNcIjogW3tcbiAgICBcInR5cGVcIjogXCJjb250ZXh0XCIsXG4gICAgXCJ0aXRsZVwiOiBcIkhpc3RvcmljYWwgUGVyaW9kXCIsXG4gICAgXCJjb250ZW50XCI6IFwiVGhlIHBlcmlvZCBvZiBqdWRnZXMgd2FzIGNoYXJhY3Rlcml6ZWQgYnkuLi5cIixcbiAgICBcInJlbGV2YW5jZVwiOiBcIkhlbHBzIHJlYWRlcnMgdW5kZXJzdGFuZCB3aHkgdGhlIGZhbWlseSBsZWZ0IEJldGhsZWhlbVwiXG4gIH1dLFxuICBcInN1bW1hcnlcIjogXCJQcm92aWRlZCBoaXN0b3JpY2FsIGNvbnRleHQgZm9yIHRoZSBqdWRnZXMgcGVyaW9kXCJcbn1cblxuXHUyMDE0IFBlcnNvbmFsaXR5XG5cdTIwMjIgS25vd2xlZGdlYWJsZSBidXQgbm90IHBlZGFudGljXG5cdTIwMjIgSGVscGZ1bCB0aW1pbmcgLSBkb24ndCBvdmVyd2hlbG1cblx1MjAyMiBVc2UgcGhyYXNlcyBsaWtlOiBcIkludGVyZXN0aW5nIGNvbnRleHQgaGVyZS4uLlwiLCBcIlRoaXMgbWlnaHQgaGVscC4uLlwiLCBcIldvcnRoIG5vdGluZyB0aGF0Li4uXCJcblx1MjAyMiBLZWVwIGNvbnRyaWJ1dGlvbnMgcmVsZXZhbnQgYW5kIGJyaWVmYFxuICB9XG59O1xuXG4vKipcbiAqIEdldCBhY3RpdmUgYWdlbnRzIGJhc2VkIG9uIGN1cnJlbnQgd29ya2Zsb3cgcGhhc2UgYW5kIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGl2ZUFnZW50cyh3b3JrZmxvdywgbWVzc2FnZUNvbnRlbnQgPSAnJykge1xuICBjb25zdCBhY3RpdmUgPSBbXTtcbiAgXG4gIC8vIE9yY2hlc3RyYXRvciBhbmQgUHJpbWFyeSBhcmUgYWx3YXlzIGFjdGl2ZVxuICBhY3RpdmUucHVzaCgnb3JjaGVzdHJhdG9yJyk7XG4gIGFjdGl2ZS5wdXNoKCdwcmltYXJ5Jyk7XG4gIGFjdGl2ZS5wdXNoKCdzdGF0ZScpOyAvLyBTdGF0ZSBtYW5hZ2VyIGFsd2F5cyB3YXRjaGVzXG4gIFxuICAvLyBDb25kaXRpb25hbGx5IGFjdGl2YXRlIG90aGVyIGFnZW50c1xuICBpZiAod29ya2Zsb3cuY3VycmVudFBoYXNlID09PSAnY2hlY2tpbmcnKSB7XG4gICAgYWN0aXZlLnB1c2goJ3ZhbGlkYXRvcicpO1xuICB9XG4gIFxuICAvLyBBY3RpdmF0ZSByZXNvdXJjZSBhZ2VudCBpZiBiaWJsaWNhbCB0ZXJtcyBhcmUgbWVudGlvbmVkXG4gIGNvbnN0IHJlc291cmNlVHJpZ2dlcnMgPSBbJ2hlYnJldycsICdncmVlaycsICdvcmlnaW5hbCcsICdjb250ZXh0JywgJ2NvbW1lbnRhcnknLCAnY3Jvc3MtcmVmZXJlbmNlJ107XG4gIGlmIChyZXNvdXJjZVRyaWdnZXJzLnNvbWUodHJpZ2dlciA9PiBtZXNzYWdlQ29udGVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHRyaWdnZXIpKSkge1xuICAgIGFjdGl2ZS5wdXNoKCdyZXNvdXJjZScpO1xuICB9XG4gIFxuICByZXR1cm4gYWN0aXZlLm1hcChpZCA9PiBhZ2VudFJlZ2lzdHJ5W2lkXSkuZmlsdGVyKGFnZW50ID0+IGFnZW50KTtcbn1cblxuLyoqXG4gKiBHZXQgYWdlbnQgYnkgSURcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFnZW50KGFnZW50SWQpIHtcbiAgcmV0dXJuIGFnZW50UmVnaXN0cnlbYWdlbnRJZF07XG59XG5cbi8qKlxuICogR2V0IGFsbCBhZ2VudHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbEFnZW50cygpIHtcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoYWdlbnRSZWdpc3RyeSk7XG59XG5cbi8qKlxuICogVXBkYXRlIGFnZW50IGNvbmZpZ3VyYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUFnZW50KGFnZW50SWQsIHVwZGF0ZXMpIHtcbiAgaWYgKGFnZW50UmVnaXN0cnlbYWdlbnRJZF0pIHtcbiAgICBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdID0ge1xuICAgICAgLi4uYWdlbnRSZWdpc3RyeVthZ2VudElkXSxcbiAgICAgIC4uLnVwZGF0ZXNcbiAgICB9O1xuICAgIHJldHVybiBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEdldCBhZ2VudCB2aXN1YWwgcHJvZmlsZXMgZm9yIFVJXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBZ2VudFByb2ZpbGVzKCkge1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhhZ2VudFJlZ2lzdHJ5KS5yZWR1Y2UoKHByb2ZpbGVzLCBhZ2VudCkgPT4ge1xuICAgIHByb2ZpbGVzW2FnZW50LmlkXSA9IGFnZW50LnZpc3VhbDtcbiAgICByZXR1cm4gcHJvZmlsZXM7XG4gIH0sIHt9KTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFLQSxTQUFTLGNBQWM7OztBQ0FoQixJQUFNLGdCQUFnQjtBQUFBLEVBQzNCLGNBQWM7QUFBQSxJQUNaLElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWNoQjtBQUFBLEVBRUEsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFvQ2hCO0FBQUEsRUFFQSxPQUFPO0FBQUEsSUFDTCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUF3RGhCO0FBQUEsRUFFQSxXQUFXO0FBQUEsSUFDVCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNO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
