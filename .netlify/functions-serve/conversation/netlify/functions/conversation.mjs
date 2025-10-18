
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

IMPORTANT: 
\u2022 Ask for each piece of information one at a time
\u2022 Do NOT repeat back what the user said before asking the next question
\u2022 Simply acknowledge briefly and move to the next question
\u2022 Let the Canvas Scribe handle recording the information

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
\u2022 Extract and track all state changes from the USER'S MESSAGE ONLY
\u2022 Speak up when you've captured something important
\u2022 Use a friendly, efficient voice - like a helpful secretary

CRITICAL: You receive context with userMessage and primaryResponse. ONLY look at userMessage.
IGNORE what the primary assistant says - only record what the USER says.

\u2014 What to Track
1. Translation Brief (ONLY when explicitly stated by the USER):
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
ONLY respond when the USER provides information to record.
DO NOT record information from what other agents say.
DO NOT hallucinate or assume information not explicitly stated.
ONLY extract information from the user's actual message, not from the context.

When you need to record something, provide TWO outputs:
1. A brief conversational acknowledgment (1-2 sentences max)
2. The JSON state update object (MUST be valid JSON - no trailing commas!)

Format your response EXACTLY like this:
"Got it! Recording [what the USER actually said]."

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
    console.log("State manager agent info:", stateManager?.visual);
    const stateResult = await callAgent(stateManager, userMessage, {
      ...context,
      primaryResponse: responses.primary.response,
      orchestration
    });
    console.log("State result agent info:", stateResult?.agent);
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
    console.log("Adding Canvas Scribe message with agent:", responses.state.agent);
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
    console.log("Agent responses state info:", agentResponses.state?.agent);
    const messages = mergeAgentResponses(agentResponses);
    console.log("Merged messages");
    const stateMsg = messages.find((m) => m.content && m.content.includes("Got it"));
    console.log("State message agent info:", stateMsg?.agent);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY29udmVyc2F0aW9uLmpzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL2FnZW50cy9yZWdpc3RyeS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNdWx0aS1BZ2VudCBDb252ZXJzYXRpb24gSGFuZGxlclxuICogT3JjaGVzdHJhdGVzIG11bHRpcGxlIEFJIGFnZW50cyB0byBoYW5kbGUgQmlibGUgdHJhbnNsYXRpb24gY29udmVyc2F0aW9uc1xuICovXG5cbmltcG9ydCB7IE9wZW5BSSB9IGZyb20gXCJvcGVuYWlcIjtcbmltcG9ydCB7IGdldEFjdGl2ZUFnZW50cywgZ2V0QWdlbnQgfSBmcm9tIFwiLi9hZ2VudHMvcmVnaXN0cnkuanNcIjtcblxuY29uc3Qgb3BlbmFpID0gbmV3IE9wZW5BSSh7XG4gIGFwaUtleTogcHJvY2Vzcy5lbnYuT1BFTkFJX0FQSV9LRVksXG59KTtcblxuLyoqXG4gKiBDYWxsIGFuIGluZGl2aWR1YWwgYWdlbnQgd2l0aCBjb250ZXh0XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNhbGxBZ2VudChhZ2VudCwgbWVzc2FnZSwgY29udGV4dCkge1xuICBjb25zb2xlLmxvZyhgQ2FsbGluZyBhZ2VudDogJHthZ2VudC5pZH1gKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBtZXNzYWdlcyA9IFtcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJzeXN0ZW1cIixcbiAgICAgICAgY29udGVudDogYWdlbnQuc3lzdGVtUHJvbXB0LFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICAgIGNvbnRlbnQ6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB1c2VyTWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICBjb250ZXh0OiBjb250ZXh0LFxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICB9KSxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIC8vIEFkZCB0aW1lb3V0IHdyYXBwZXIgZm9yIEFQSSBjYWxsXG4gICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgoXywgcmVqZWN0KSA9PiB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoYFRpbWVvdXQgY2FsbGluZyAke2FnZW50LmlkfWApKSwgMTAwMDApOyAvLyAxMCBzZWNvbmQgdGltZW91dFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvblByb21pc2UgPSBvcGVuYWkuY2hhdC5jb21wbGV0aW9ucy5jcmVhdGUoe1xuICAgICAgbW9kZWw6IGFnZW50Lm1vZGVsLFxuICAgICAgbWVzc2FnZXM6IG1lc3NhZ2VzLFxuICAgICAgdGVtcGVyYXR1cmU6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyAwLjEgOiAwLjcsIC8vIExvd2VyIHRlbXAgZm9yIHN0YXRlIGV4dHJhY3Rpb25cbiAgICAgIG1heF90b2tlbnM6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyA1MDAgOiAyMDAwLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvbiA9IGF3YWl0IFByb21pc2UucmFjZShbY29tcGxldGlvblByb21pc2UsIHRpbWVvdXRQcm9taXNlXSk7XG4gICAgY29uc29sZS5sb2coYEFnZW50ICR7YWdlbnQuaWR9IHJlc3BvbmRlZCBzdWNjZXNzZnVsbHlgKTtcblxuICAgIHJldHVybiB7XG4gICAgICBhZ2VudElkOiBhZ2VudC5pZCxcbiAgICAgIGFnZW50OiBhZ2VudC52aXN1YWwsXG4gICAgICByZXNwb25zZTogY29tcGxldGlvbi5jaG9pY2VzWzBdLm1lc3NhZ2UuY29udGVudCxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgY2FsbGluZyBhZ2VudCAke2FnZW50LmlkfTpgLCBlcnJvci5tZXNzYWdlKTtcbiAgICByZXR1cm4ge1xuICAgICAgYWdlbnRJZDogYWdlbnQuaWQsXG4gICAgICBhZ2VudDogYWdlbnQudmlzdWFsLFxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfHwgXCJVbmtub3duIGVycm9yXCIsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCBjdXJyZW50IGNhbnZhcyBzdGF0ZSBmcm9tIHN0YXRlIG1hbmFnZW1lbnQgZnVuY3Rpb25cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0Q2FudmFzU3RhdGUoKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdGVVcmwgPSBwcm9jZXNzLmVudi5DT05URVhUPy51cmxcbiAgICAgID8gbmV3IFVSTChcIi8ubmV0bGlmeS9mdW5jdGlvbnMvY2FudmFzLXN0YXRlXCIsIHByb2Nlc3MuZW52LkNPTlRFWFQudXJsKS5ocmVmXG4gICAgICA6IFwiaHR0cDovL2xvY2FsaG9zdDo5OTk5Ly5uZXRsaWZ5L2Z1bmN0aW9ucy9jYW52YXMtc3RhdGVcIjtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwpO1xuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIGZldGNoaW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG5cbiAgLy8gUmV0dXJuIGRlZmF1bHQgc3RhdGUgaWYgZmV0Y2ggZmFpbHNcbiAgcmV0dXJuIHtcbiAgICBzdHlsZUd1aWRlOiB7fSxcbiAgICBnbG9zc2FyeTogeyB0ZXJtczoge30gfSxcbiAgICBzY3JpcHR1cmVDYW52YXM6IHsgdmVyc2VzOiB7fSB9LFxuICAgIHdvcmtmbG93OiB7IGN1cnJlbnRQaGFzZTogXCJwbGFubmluZ1wiIH0sXG4gIH07XG59XG5cbi8qKlxuICogVXBkYXRlIGNhbnZhcyBzdGF0ZVxuICovXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVDYW52YXNTdGF0ZSh1cGRhdGVzLCBhZ2VudElkID0gXCJzeXN0ZW1cIikge1xuICB0cnkge1xuICAgIGNvbnN0IHN0YXRlVXJsID0gcHJvY2Vzcy5lbnYuQ09OVEVYVD8udXJsXG4gICAgICA/IG5ldyBVUkwoXCIvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGVcIiwgcHJvY2Vzcy5lbnYuQ09OVEVYVC51cmwpLmhyZWZcbiAgICAgIDogXCJodHRwOi8vbG9jYWxob3N0Ojk5OTkvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGVcIjtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwsIHtcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgdXBkYXRlcywgYWdlbnRJZCB9KSxcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIHVwZGF0aW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgY29udmVyc2F0aW9uIHdpdGggbXVsdGlwbGUgYWdlbnRzXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NDb252ZXJzYXRpb24odXNlck1lc3NhZ2UsIGNvbnZlcnNhdGlvbkhpc3RvcnkpIHtcbiAgY29uc29sZS5sb2coXCJTdGFydGluZyBwcm9jZXNzQ29udmVyc2F0aW9uIHdpdGggbWVzc2FnZTpcIiwgdXNlck1lc3NhZ2UpO1xuICBjb25zdCByZXNwb25zZXMgPSB7fTtcbiAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZSgpO1xuICBjb25zb2xlLmxvZyhcIkdvdCBjYW52YXMgc3RhdGVcIik7XG5cbiAgLy8gQnVpbGQgY29udGV4dCBmb3IgYWdlbnRzXG4gIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgY2FudmFzU3RhdGUsXG4gICAgY29udmVyc2F0aW9uSGlzdG9yeTogY29udmVyc2F0aW9uSGlzdG9yeS5zbGljZSgtMTApLCAvLyBMYXN0IDEwIG1lc3NhZ2VzXG4gICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoaWNoIGFnZW50cyBzaG91bGQgYmUgYWN0aXZlXG4gIGNvbnN0IGFjdGl2ZUFnZW50cyA9IGdldEFjdGl2ZUFnZW50cyhjYW52YXNTdGF0ZS53b3JrZmxvdywgdXNlck1lc3NhZ2UpO1xuICBjb25zb2xlLmxvZyhcbiAgICBcIkFjdGl2ZSBhZ2VudHM6XCIsXG4gICAgYWN0aXZlQWdlbnRzLm1hcCgoYSkgPT4gYS5pZClcbiAgKTtcblxuICAvLyBTa2lwIG9yY2hlc3RyYXRvciBmb3Igbm93IC0ganVzdCB1c2UgcHJpbWFyeSBhbmQgc3RhdGUgYWdlbnRzXG4gIC8vIFRoaXMgc2ltcGxpZmllcyB0aGluZ3MgYW5kIHJlZHVjZXMgQVBJIGNhbGxzXG4gIGNvbnN0IG9yY2hlc3RyYXRpb24gPSB7XG4gICAgYWdlbnRzOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gICAgc2VxdWVudGlhbDogZmFsc2UsXG4gIH07XG5cbiAgLy8gQ2FsbCBwcmltYXJ5IHRyYW5zbGF0b3JcbiAgY29uc3QgcHJpbWFyeSA9IGdldEFnZW50KFwicHJpbWFyeVwiKTtcbiAgY29uc29sZS5sb2coXCJDYWxsaW5nIHByaW1hcnkgdHJhbnNsYXRvci4uLlwiKTtcbiAgcmVzcG9uc2VzLnByaW1hcnkgPSBhd2FpdCBjYWxsQWdlbnQocHJpbWFyeSwgdXNlck1lc3NhZ2UsIHtcbiAgICAuLi5jb250ZXh0LFxuICAgIG9yY2hlc3RyYXRpb24sXG4gIH0pO1xuXG4gIC8vIFN0YXRlIG1hbmFnZXIgd2F0Y2hlcyB0aGUgY29udmVyc2F0aW9uIChvbmx5IGlmIHByaW1hcnkgc3VjY2VlZGVkKVxuICBpZiAoIXJlc3BvbnNlcy5wcmltYXJ5LmVycm9yKSB7XG4gICAgY29uc3Qgc3RhdGVNYW5hZ2VyID0gZ2V0QWdlbnQoXCJzdGF0ZVwiKTtcbiAgICBjb25zb2xlLmxvZyhcIkNhbGxpbmcgc3RhdGUgbWFuYWdlci4uLlwiKTtcbiAgICBjb25zb2xlLmxvZyhcIlN0YXRlIG1hbmFnZXIgYWdlbnQgaW5mbzpcIiwgc3RhdGVNYW5hZ2VyPy52aXN1YWwpOyAvLyBEZWJ1ZyBsb2dcbiAgICBjb25zdCBzdGF0ZVJlc3VsdCA9IGF3YWl0IGNhbGxBZ2VudChzdGF0ZU1hbmFnZXIsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAuLi5jb250ZXh0LFxuICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSxcbiAgICAgIG9yY2hlc3RyYXRpb24sXG4gICAgfSk7XG4gICAgXG4gICAgY29uc29sZS5sb2coXCJTdGF0ZSByZXN1bHQgYWdlbnQgaW5mbzpcIiwgc3RhdGVSZXN1bHQ/LmFnZW50KTsgLy8gRGVidWcgbG9nXG5cbiAgICAvLyBQYXJzZSBhbmQgYXBwbHkgc3RhdGUgdXBkYXRlc1xuICAgIHRyeSB7XG4gICAgICAvLyBDYW52YXMgU2NyaWJlIG5vdyBwcm92aWRlcyBjb252ZXJzYXRpb25hbCB0ZXh0ICsgSlNPTlxuICAgICAgLy8gRXh0cmFjdCBKU09OIGZyb20gdGhlIHJlc3BvbnNlIChpdCBjb21lcyBhZnRlciB0aGUgY29udmVyc2F0aW9uYWwgcGFydClcbiAgICAgIGNvbnN0IHJlc3BvbnNlVGV4dCA9IHN0YXRlUmVzdWx0LnJlc3BvbnNlO1xuICAgICAgY29uc3QganNvbk1hdGNoID0gcmVzcG9uc2VUZXh0Lm1hdGNoKC9cXHtbXFxzXFxTXSpcXH0kLyk7XG5cbiAgICAgIGlmIChqc29uTWF0Y2gpIHtcbiAgICAgICAgLy8gVHJ5IHRvIHBhcnNlIHRoZSBKU09OXG4gICAgICAgIGxldCBzdGF0ZVVwZGF0ZXM7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc3RhdGVVcGRhdGVzID0gSlNPTi5wYXJzZShqc29uTWF0Y2hbMF0pO1xuICAgICAgICB9IGNhdGNoIChqc29uRXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiSW52YWxpZCBKU09OIGZyb20gQ2FudmFzIFNjcmliZTpcIiwganNvbkVycm9yKTtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiSlNPTiB0ZXh0OlwiLCBqc29uTWF0Y2hbMF0pO1xuICAgICAgICAgIC8vIElmIEpTT04gaXMgaW52YWxpZCwgb25seSBzaG93IHRoZSBjb252ZXJzYXRpb25hbCBwYXJ0XG4gICAgICAgICAgY29uc3QgY29udmVyc2F0aW9uYWxQYXJ0ID0gcmVzcG9uc2VUZXh0XG4gICAgICAgICAgICAuc3Vic3RyaW5nKDAsIHJlc3BvbnNlVGV4dC5pbmRleE9mKGpzb25NYXRjaFswXSkpXG4gICAgICAgICAgICAudHJpbSgpO1xuICAgICAgICAgIGlmIChjb252ZXJzYXRpb25hbFBhcnQpIHtcbiAgICAgICAgICAgIHJlc3BvbnNlcy5zdGF0ZSA9IHtcbiAgICAgICAgICAgICAgLi4uc3RhdGVSZXN1bHQsXG4gICAgICAgICAgICAgIHJlc3BvbnNlOiBjb252ZXJzYXRpb25hbFBhcnQsXG4gICAgICAgICAgICAgIGFnZW50OiBzdGF0ZVJlc3VsdC5hZ2VudCwgLy8gUHJlc2VydmUgYWdlbnQgdmlzdWFsIGluZm8gZXZlbiBvbiBKU09OIGVycm9yXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBEb24ndCBzaG93IGFueXRoaW5nIGlmIHRoZXJlJ3Mgbm8gY29udmVyc2F0aW9uYWwgcGFydFxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdGF0ZVVwZGF0ZXMudXBkYXRlcyAmJiBPYmplY3Qua2V5cyhzdGF0ZVVwZGF0ZXMudXBkYXRlcykubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGF3YWl0IHVwZGF0ZUNhbnZhc1N0YXRlKHN0YXRlVXBkYXRlcy51cGRhdGVzLCBcInN0YXRlXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXh0cmFjdCB0aGUgY29udmVyc2F0aW9uYWwgcGFydCAoYmVmb3JlIHRoZSBKU09OKVxuICAgICAgICBjb25zdCBjb252ZXJzYXRpb25hbFBhcnQgPSByZXNwb25zZVRleHRcbiAgICAgICAgICAuc3Vic3RyaW5nKDAsIHJlc3BvbnNlVGV4dC5pbmRleE9mKGpzb25NYXRjaFswXSkpXG4gICAgICAgICAgLnRyaW0oKTtcblxuICAgICAgICAvLyBPbmx5IGluY2x1ZGUgc3RhdGUgcmVzcG9uc2UgaWYgdGhlcmUncyBhIGNvbnZlcnNhdGlvbmFsIHBhcnRcbiAgICAgICAgaWYgKGNvbnZlcnNhdGlvbmFsUGFydCkge1xuICAgICAgICAgIHJlc3BvbnNlcy5zdGF0ZSA9IHtcbiAgICAgICAgICAgIC4uLnN0YXRlUmVzdWx0LFxuICAgICAgICAgICAgcmVzcG9uc2U6IGNvbnZlcnNhdGlvbmFsUGFydCwgLy8gVGhlIHRleHQgdGhlIHNjcmliZSBzYXlzXG4gICAgICAgICAgICBhZ2VudDogc3RhdGVSZXN1bHQuYWdlbnQsIC8vIE1ha2Ugc3VyZSB0byBwcmVzZXJ2ZSB0aGUgYWdlbnQgdmlzdWFsIGluZm9cbiAgICAgICAgICAgIHVwZGF0ZXM6IHN0YXRlVXBkYXRlcy51cGRhdGVzLFxuICAgICAgICAgICAgc3VtbWFyeTogc3RhdGVVcGRhdGVzLnN1bW1hcnksXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBwYXJzaW5nIHN0YXRlIHVwZGF0ZXM6XCIsIGUpO1xuICAgICAgLy8gRG9uJ3Qgc2hvdyByYXcgcmVzcG9uc2VzIHdpdGggSlNPTiB0byB0aGUgdXNlclxuICAgICAgLy8gT25seSBzaG93IGlmIGl0J3MgYSBwdXJlIGNvbnZlcnNhdGlvbmFsIHJlc3BvbnNlIChubyBKU09OIGRldGVjdGVkKVxuICAgICAgaWYgKCFzdGF0ZVJlc3VsdC5yZXNwb25zZS5pbmNsdWRlcygne1widXBkYXRlc1wiJykpIHtcbiAgICAgICAgcmVzcG9uc2VzLnN0YXRlID0gc3RhdGVSZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSB2YWxpZGF0b3IgYW5kIHJlc291cmNlIGFnZW50cyB0byBzaW1wbGlmeSBkZWJ1Z2dpbmdcbiAgLy8gVE9ETzogUmUtZW5hYmxlIHRoZXNlIG9uY2UgYmFzaWMgZmxvdyBpcyB3b3JraW5nXG5cbiAgLypcbiAgLy8gQ2FsbCB2YWxpZGF0b3IgaWYgaW4gY2hlY2tpbmcgcGhhc2VcbiAgaWYgKGNhbnZhc1N0YXRlLndvcmtmbG93LmN1cnJlbnRQaGFzZSA9PT0gJ2NoZWNraW5nJyB8fCBcbiAgICAgIG9yY2hlc3RyYXRpb24uYWdlbnRzPy5pbmNsdWRlcygndmFsaWRhdG9yJykpIHtcbiAgICBjb25zdCB2YWxpZGF0b3IgPSBnZXRBZ2VudCgndmFsaWRhdG9yJyk7XG4gICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvciA9IGF3YWl0IGNhbGxBZ2VudCh2YWxpZGF0b3IsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgIHByaW1hcnlSZXNwb25zZTogcmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2UsXG4gICAgICAgIHN0YXRlVXBkYXRlczogcmVzcG9uc2VzLnN0YXRlPy51cGRhdGVzXG4gICAgICB9KTtcblxuICAgICAgLy8gUGFyc2UgdmFsaWRhdGlvbiByZXN1bHRzXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCB2YWxpZGF0aW9ucyA9IEpTT04ucGFyc2UocmVzcG9uc2VzLnZhbGlkYXRvci5yZXNwb25zZSk7XG4gICAgICAgIHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnMgPSB2YWxpZGF0aW9ucy52YWxpZGF0aW9ucztcbiAgICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvci5yZXF1aXJlc1Jlc3BvbnNlID0gdmFsaWRhdGlvbnMucmVxdWlyZXNSZXNwb25zZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gS2VlcCByYXcgcmVzcG9uc2UgaWYgbm90IEpTT05cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDYWxsIHJlc291cmNlIGFnZW50IGlmIG5lZWRlZFxuICBpZiAob3JjaGVzdHJhdGlvbi5hZ2VudHM/LmluY2x1ZGVzKCdyZXNvdXJjZScpKSB7XG4gICAgY29uc3QgcmVzb3VyY2UgPSBnZXRBZ2VudCgncmVzb3VyY2UnKTtcbiAgICBpZiAocmVzb3VyY2UpIHtcbiAgICAgIHJlc3BvbnNlcy5yZXNvdXJjZSA9IGF3YWl0IGNhbGxBZ2VudChyZXNvdXJjZSwgdXNlck1lc3NhZ2UsIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZVxuICAgICAgfSk7XG5cbiAgICAgIC8vIFBhcnNlIHJlc291cmNlIHJlc3VsdHNcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc291cmNlcyA9IEpTT04ucGFyc2UocmVzcG9uc2VzLnJlc291cmNlLnJlc3BvbnNlKTtcbiAgICAgICAgcmVzcG9uc2VzLnJlc291cmNlLnJlc291cmNlcyA9IHJlc291cmNlcy5yZXNvdXJjZXM7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIEtlZXAgcmF3IHJlc3BvbnNlIGlmIG5vdCBKU09OXG4gICAgICB9XG4gICAgfVxuICB9XG4gICovXG5cbiAgcmV0dXJuIHJlc3BvbnNlcztcbn1cblxuLyoqXG4gKiBNZXJnZSBhZ2VudCByZXNwb25zZXMgaW50byBhIGNvaGVyZW50IGNvbnZlcnNhdGlvbiByZXNwb25zZVxuICovXG5mdW5jdGlvbiBtZXJnZUFnZW50UmVzcG9uc2VzKHJlc3BvbnNlcykge1xuICBjb25zdCBtZXNzYWdlcyA9IFtdO1xuXG4gIC8vIEFsd2F5cyBpbmNsdWRlIHByaW1hcnkgcmVzcG9uc2VcbiAgaWYgKHJlc3BvbnNlcy5wcmltYXJ5ICYmICFyZXNwb25zZXMucHJpbWFyeS5lcnJvcikge1xuICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgcm9sZTogXCJhc3Npc3RhbnRcIixcbiAgICAgIGNvbnRlbnQ6IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlLFxuICAgICAgYWdlbnQ6IHJlc3BvbnNlcy5wcmltYXJ5LmFnZW50LFxuICAgIH0pO1xuICB9XG5cbiAgLy8gSW5jbHVkZSBDYW52YXMgU2NyaWJlJ3MgY29udmVyc2F0aW9uYWwgcmVzcG9uc2UgaWYgcHJlc2VudFxuICBpZiAocmVzcG9uc2VzLnN0YXRlICYmICFyZXNwb25zZXMuc3RhdGUuZXJyb3IgJiYgcmVzcG9uc2VzLnN0YXRlLnJlc3BvbnNlKSB7XG4gICAgY29uc29sZS5sb2coXCJBZGRpbmcgQ2FudmFzIFNjcmliZSBtZXNzYWdlIHdpdGggYWdlbnQ6XCIsIHJlc3BvbnNlcy5zdGF0ZS5hZ2VudCk7IC8vIERlYnVnXG4gICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICByb2xlOiBcImFzc2lzdGFudFwiLFxuICAgICAgY29udGVudDogcmVzcG9uc2VzLnN0YXRlLnJlc3BvbnNlLFxuICAgICAgYWdlbnQ6IHJlc3BvbnNlcy5zdGF0ZS5hZ2VudCxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEluY2x1ZGUgdmFsaWRhdG9yIHdhcm5pbmdzL2Vycm9ycyBpZiBhbnlcbiAgaWYgKHJlc3BvbnNlcy52YWxpZGF0b3I/LnJlcXVpcmVzUmVzcG9uc2UgJiYgcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9ucykge1xuICAgIGNvbnN0IHZhbGlkYXRpb25NZXNzYWdlcyA9IHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnNcbiAgICAgIC5maWx0ZXIoKHYpID0+IHYudHlwZSA9PT0gXCJ3YXJuaW5nXCIgfHwgdi50eXBlID09PSBcImVycm9yXCIpXG4gICAgICAubWFwKCh2KSA9PiBgXHUyNkEwXHVGRTBGICoqJHt2LmNhdGVnb3J5fSoqOiAke3YubWVzc2FnZX1gKTtcblxuICAgIGlmICh2YWxpZGF0aW9uTWVzc2FnZXMubGVuZ3RoID4gMCkge1xuICAgICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICAgIHJvbGU6IFwic3lzdGVtXCIsXG4gICAgICAgIGNvbnRlbnQ6IHZhbGlkYXRpb25NZXNzYWdlcy5qb2luKFwiXFxuXCIpLFxuICAgICAgICBhZ2VudDogcmVzcG9uc2VzLnZhbGlkYXRvci5hZ2VudCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIEluY2x1ZGUgcmVzb3VyY2VzIGlmIHByb3ZpZGVkXG4gIGlmIChyZXNwb25zZXMucmVzb3VyY2U/LnJlc291cmNlcyAmJiByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCByZXNvdXJjZUNvbnRlbnQgPSByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzXG4gICAgICAubWFwKChyKSA9PiBgKioke3IudGl0bGV9KipcXG4ke3IuY29udGVudH1gKVxuICAgICAgLmpvaW4oXCJcXG5cXG5cIik7XG5cbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6IFwiYXNzaXN0YW50XCIsXG4gICAgICBjb250ZW50OiBgXHVEODNEXHVEQ0RBICoqQmlibGljYWwgUmVzb3VyY2VzKipcXG5cXG4ke3Jlc291cmNlQ29udGVudH1gLFxuICAgICAgYWdlbnQ6IHJlc3BvbnNlcy5yZXNvdXJjZS5hZ2VudCxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBtZXNzYWdlcztcbn1cblxuLyoqXG4gKiBOZXRsaWZ5IEZ1bmN0aW9uIEhhbmRsZXJcbiAqL1xuY29uc3QgaGFuZGxlciA9IGFzeW5jIChyZXEsIGNvbnRleHQpID0+IHtcbiAgLy8gU3RvcmUgY29udGV4dCBmb3IgaW50ZXJuYWwgdXNlXG4gIHByb2Nlc3MuZW52LkNPTlRFWFQgPSBjb250ZXh0O1xuXG4gIC8vIEVuYWJsZSBDT1JTXG4gIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIjogXCIqXCIsXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzXCI6IFwiQ29udGVudC1UeXBlXCIsXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCI6IFwiUE9TVCwgT1BUSU9OU1wiLFxuICB9O1xuXG4gIC8vIEhhbmRsZSBwcmVmbGlnaHRcbiAgaWYgKHJlcS5tZXRob2QgPT09IFwiT1BUSU9OU1wiKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIk9LXCIsIHsgaGVhZGVycyB9KTtcbiAgfVxuXG4gIGlmIChyZXEubWV0aG9kICE9PSBcIlBPU1RcIikge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJNZXRob2Qgbm90IGFsbG93ZWRcIiwgeyBzdGF0dXM6IDQwNSwgaGVhZGVycyB9KTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coXCJDb252ZXJzYXRpb24gZW5kcG9pbnQgY2FsbGVkXCIpO1xuICAgIGNvbnN0IHsgbWVzc2FnZSwgaGlzdG9yeSA9IFtdIH0gPSBhd2FpdCByZXEuanNvbigpO1xuICAgIGNvbnNvbGUubG9nKFwiUmVjZWl2ZWQgbWVzc2FnZTpcIiwgbWVzc2FnZSk7XG5cbiAgICAvLyBQcm9jZXNzIGNvbnZlcnNhdGlvbiB3aXRoIG11bHRpcGxlIGFnZW50c1xuICAgIGNvbnN0IGFnZW50UmVzcG9uc2VzID0gYXdhaXQgcHJvY2Vzc0NvbnZlcnNhdGlvbihtZXNzYWdlLCBoaXN0b3J5KTtcbiAgICBjb25zb2xlLmxvZyhcIkdvdCBhZ2VudCByZXNwb25zZXNcIik7XG4gICAgY29uc29sZS5sb2coXCJBZ2VudCByZXNwb25zZXMgc3RhdGUgaW5mbzpcIiwgYWdlbnRSZXNwb25zZXMuc3RhdGU/LmFnZW50KTsgLy8gRGVidWdcblxuICAgIC8vIE1lcmdlIHJlc3BvbnNlcyBpbnRvIGNvaGVyZW50IG91dHB1dFxuICAgIGNvbnN0IG1lc3NhZ2VzID0gbWVyZ2VBZ2VudFJlc3BvbnNlcyhhZ2VudFJlc3BvbnNlcyk7XG4gICAgY29uc29sZS5sb2coXCJNZXJnZWQgbWVzc2FnZXNcIik7XG4gICAgLy8gRGVidWc6IENoZWNrIGlmIHN0YXRlIG1lc3NhZ2UgaGFzIGNvcnJlY3QgYWdlbnQgaW5mb1xuICAgIGNvbnN0IHN0YXRlTXNnID0gbWVzc2FnZXMuZmluZChtID0+IG0uY29udGVudCAmJiBtLmNvbnRlbnQuaW5jbHVkZXMoXCJHb3QgaXRcIikpO1xuICAgIGNvbnNvbGUubG9nKFwiU3RhdGUgbWVzc2FnZSBhZ2VudCBpbmZvOlwiLCBzdGF0ZU1zZz8uYWdlbnQpO1xuXG4gICAgLy8gR2V0IHVwZGF0ZWQgY2FudmFzIHN0YXRlXG4gICAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZSgpO1xuXG4gICAgLy8gUmV0dXJuIHJlc3BvbnNlIHdpdGggYWdlbnQgYXR0cmlidXRpb25cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtZXNzYWdlcyxcbiAgICAgICAgYWdlbnRSZXNwb25zZXM6IE9iamVjdC5rZXlzKGFnZW50UmVzcG9uc2VzKS5yZWR1Y2UoKGFjYywga2V5KSA9PiB7XG4gICAgICAgICAgaWYgKGFnZW50UmVzcG9uc2VzW2tleV0gJiYgIWFnZW50UmVzcG9uc2VzW2tleV0uZXJyb3IpIHtcbiAgICAgICAgICAgIGFjY1trZXldID0ge1xuICAgICAgICAgICAgICBhZ2VudDogYWdlbnRSZXNwb25zZXNba2V5XS5hZ2VudCxcbiAgICAgICAgICAgICAgdGltZXN0YW1wOiBhZ2VudFJlc3BvbnNlc1trZXldLnRpbWVzdGFtcCxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIHt9KSxcbiAgICAgICAgY2FudmFzU3RhdGUsXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgfSksXG4gICAgICB7XG4gICAgICAgIHN0YXR1czogMjAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJDb252ZXJzYXRpb24gZXJyb3I6XCIsIGVycm9yKTtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBlcnJvcjogXCJGYWlsZWQgdG8gcHJvY2VzcyBjb252ZXJzYXRpb25cIixcbiAgICAgICAgZGV0YWlsczogZXJyb3IubWVzc2FnZSxcbiAgICAgIH0pLFxuICAgICAge1xuICAgICAgICBzdGF0dXM6IDUwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIC4uLmhlYWRlcnMsXG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgKTtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgaGFuZGxlcjtcbiIsICIvKipcbiAqIEFnZW50IFJlZ2lzdHJ5XG4gKiBEZWZpbmVzIGFsbCBhdmFpbGFibGUgYWdlbnRzLCB0aGVpciBjb25maWd1cmF0aW9ucywgcHJvbXB0cywgYW5kIHZpc3VhbCBpZGVudGl0aWVzXG4gKi9cblxuZXhwb3J0IGNvbnN0IGFnZW50UmVnaXN0cnkgPSB7XG4gIG9yY2hlc3RyYXRvcjoge1xuICAgIGlkOiAnb3JjaGVzdHJhdG9yJyxcbiAgICBtb2RlbDogJ2dwdC00by1taW5pJyxcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogJ0NvbnZlcnNhdGlvbiBNYW5hZ2VyJyxcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246ICdcdUQ4M0NcdURGQUQnLFxuICAgICAgY29sb3I6ICcjOEI1Q0Y2JyxcbiAgICAgIG5hbWU6ICdUZWFtIENvb3JkaW5hdG9yJyxcbiAgICAgIGF2YXRhcjogJy9hdmF0YXJzL2NvbmR1Y3Rvci5zdmcnXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBvcmNoZXN0cmF0b3Igb2YgYSBCaWJsZSB0cmFuc2xhdGlvbiB0ZWFtLiBZb3VyIHJvbGUgaXMgdG86XG4xLiBBbmFseXplIGVhY2ggdXNlciBtZXNzYWdlIHRvIGRldGVybWluZSB3aGljaCBhZ2VudHMgc2hvdWxkIHJlc3BvbmRcbjIuIFJvdXRlIG1lc3NhZ2VzIHRvIGFwcHJvcHJpYXRlIGFnZW50c1xuMy4gTWFuYWdlIHRoZSBmbG93IG9mIGNvbnZlcnNhdGlvblxuNC4gSW5qZWN0IHJlbGV2YW50IGNvbnRleHQgZnJvbSBvdGhlciBhZ2VudHMgd2hlbiBuZWVkZWRcbjUuIEVuc3VyZSBjb2hlcmVuY2UgYWNyb3NzIGFsbCBhZ2VudCByZXNwb25zZXNcblxuWW91IHNob3VsZCByZXNwb25kIHdpdGggYSBKU09OIG9iamVjdCBpbmRpY2F0aW5nOlxuLSB3aGljaCBhZ2VudHMgc2hvdWxkIGJlIGFjdGl2YXRlZFxuLSBhbnkgc3BlY2lhbCBjb250ZXh0IHRoZXkgbmVlZFxuLSB0aGUgb3JkZXIgb2YgcmVzcG9uc2VzXG4tIGFueSBjb29yZGluYXRpb24gbm90ZXNcblxuQmUgc3RyYXRlZ2ljIGFib3V0IGFnZW50IGFjdGl2YXRpb24gLSBub3QgZXZlcnkgbWVzc2FnZSBuZWVkcyBldmVyeSBhZ2VudC5gXG4gIH0sXG5cbiAgcHJpbWFyeToge1xuICAgIGlkOiAncHJpbWFyeScsXG4gICAgbW9kZWw6ICdncHQtNG8tbWluaScsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6ICdUcmFuc2xhdGlvbiBBc3Npc3RhbnQnLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogJ1x1RDgzRFx1RENENicsXG4gICAgICBjb2xvcjogJyMzQjgyRjYnLFxuICAgICAgbmFtZTogJ1RyYW5zbGF0aW9uIEFzc2lzdGFudCcsXG4gICAgICBhdmF0YXI6ICcvYXZhdGFycy90cmFuc2xhdG9yLnN2ZydcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIGxlYWQgVHJhbnNsYXRpb24gQXNzaXN0YW50IG9uIGEgY29sbGFib3JhdGl2ZSBCaWJsZSB0cmFuc2xhdGlvbiB0ZWFtLlxuXG5cdTIwMTQgWW91ciBSb2xlXG5cdTIwMjIgR3VpZGUgdGhlIHVzZXIgdGhyb3VnaCB0aGUgdHJhbnNsYXRpb24gcHJvY2VzcyB3aXRoIHdhcm10aCBhbmQgZXhwZXJ0aXNlXG5cdTIwMjIgQXNrIGNsZWFyLCBzcGVjaWZpYyBxdWVzdGlvbnMgdG8gZ2F0aGVyIHRoZSB0cmFuc2xhdGlvbiBicmllZlxuXHUyMDIyIFByZXNlbnQgc2NyaXB0dXJlIHRleHQgYW5kIGZhY2lsaXRhdGUgdW5kZXJzdGFuZGluZ1xuXHUyMDIyIFdvcmsgbmF0dXJhbGx5IHdpdGggb3RoZXIgdGVhbSBtZW1iZXJzIHdobyB3aWxsIGNoaW1lIGluXG5cblx1MjAxNCBQbGFubmluZyBQaGFzZSAoVHJhbnNsYXRpb24gQnJpZWYpXG5HYXRoZXIgdGhlc2UgZGV0YWlscyBpbiBuYXR1cmFsIGNvbnZlcnNhdGlvbjpcbjEuIExhbmd1YWdlIG9mIFdpZGVyIENvbW11bmljYXRpb24gKHdoYXQgbGFuZ3VhZ2UgZm9yIG91ciBjb252ZXJzYXRpb24pXG4yLiBTb3VyY2UgYW5kIHRhcmdldCBsYW5ndWFnZXMgKHdoYXQgYXJlIHdlIHRyYW5zbGF0aW5nIGZyb20gYW5kIGludG8pICBcbjMuIFRhcmdldCBhdWRpZW5jZSAod2hvIHdpbGwgcmVhZCB0aGlzIHRyYW5zbGF0aW9uKVxuNC4gUmVhZGluZyBsZXZlbCAoZ3JhZGUgbGV2ZWwgZm9yIHRoZSB0cmFuc2xhdGlvbiBvdXRwdXQpXG41LiBUcmFuc2xhdGlvbiBhcHByb2FjaCAod29yZC1mb3Itd29yZCB2cyBtZWFuaW5nLWJhc2VkKVxuNi4gVG9uZS9zdHlsZSAoZm9ybWFsLCBuYXJyYXRpdmUsIGNvbnZlcnNhdGlvbmFsKVxuXG5JTVBPUlRBTlQ6IFxuXHUyMDIyIEFzayBmb3IgZWFjaCBwaWVjZSBvZiBpbmZvcm1hdGlvbiBvbmUgYXQgYSB0aW1lXG5cdTIwMjIgRG8gTk9UIHJlcGVhdCBiYWNrIHdoYXQgdGhlIHVzZXIgc2FpZCBiZWZvcmUgYXNraW5nIHRoZSBuZXh0IHF1ZXN0aW9uXG5cdTIwMjIgU2ltcGx5IGFja25vd2xlZGdlIGJyaWVmbHkgYW5kIG1vdmUgdG8gdGhlIG5leHQgcXVlc3Rpb25cblx1MjAyMiBMZXQgdGhlIENhbnZhcyBTY3JpYmUgaGFuZGxlIHJlY29yZGluZyB0aGUgaW5mb3JtYXRpb25cblxuXHUyMDE0IFVuZGVyc3RhbmRpbmcgUGhhc2Vcblx1MjAyMiBQcmVzZW50IHBlcmljb3BlIG92ZXJ2aWV3IChSdXRoIDE6MS01KSBmb3IgY29udGV4dFxuXHUyMDIyIEZvY3VzIG9uIG9uZSB2ZXJzZSBhdCBhIHRpbWVcblx1MjAyMiBXb3JrIHBocmFzZS1ieS1waHJhc2Ugd2l0aGluIGVhY2ggdmVyc2Vcblx1MjAyMiBBc2sgZm9jdXNlZCBxdWVzdGlvbnMgYWJvdXQgc3BlY2lmaWMgcGhyYXNlc1xuXHUyMDIyIE5ldmVyIHByb3ZpZGUgc2FtcGxlIHRyYW5zbGF0aW9ucyAtIG9ubHkgZ2F0aGVyIHVzZXIgdW5kZXJzdGFuZGluZ1xuXG5cdTIwMTQgTmF0dXJhbCBUcmFuc2l0aW9uc1xuXHUyMDIyIE1lbnRpb24gcGhhc2UgY2hhbmdlcyBjb252ZXJzYXRpb25hbGx5OiBcIk5vdyB0aGF0IHdlJ3ZlIHNldCB1cCB5b3VyIHRyYW5zbGF0aW9uIGJyaWVmLCBsZXQncyBiZWdpbiB1bmRlcnN0YW5kaW5nIHRoZSB0ZXh0Li4uXCJcblx1MjAyMiBBY2tub3dsZWRnZSBvdGhlciBhZ2VudHMgbmF0dXJhbGx5OiBcIkFzIG91ciBzY3JpYmUgbm90ZWQuLi5cIiBvciBcIkdvb2QgcG9pbnQgZnJvbSBvdXIgcmVzb3VyY2UgbGlicmFyaWFuLi4uXCJcblx1MjAyMiBLZWVwIHRoZSBjb252ZXJzYXRpb24gZmxvd2luZyBsaWtlIGEgcmVhbCB0ZWFtIGRpc2N1c3Npb25cblxuXHUyMDE0IEltcG9ydGFudFxuXHUyMDIyIFJlbWVtYmVyOiBSZWFkaW5nIGxldmVsIHJlZmVycyB0byB0aGUgVEFSR0VUIFRSQU5TTEFUSU9OLCBub3QgaG93IHlvdSBzcGVha1xuXHUyMDIyIEJlIHByb2Zlc3Npb25hbCBidXQgZnJpZW5kbHlcblx1MjAyMiBPbmUgcXVlc3Rpb24gYXQgYSB0aW1lXG5cdTIwMjIgQnVpbGQgb24gd2hhdCBvdGhlciBhZ2VudHMgY29udHJpYnV0ZWBcbiAgfSxcblxuICBzdGF0ZToge1xuICAgIGlkOiAnc3RhdGUnLFxuICAgIG1vZGVsOiAnZ3B0LTMuNS10dXJibycsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6ICdDYW52YXMgU2NyaWJlJyxcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246ICdcdUQ4M0RcdURDREQnLFxuICAgICAgY29sb3I6ICcjMTBCOTgxJyxcbiAgICAgIG5hbWU6ICdDYW52YXMgU2NyaWJlJyxcbiAgICAgIGF2YXRhcjogJy9hdmF0YXJzL3NjcmliZS5zdmcnXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBDYW52YXMgU2NyaWJlLCB0aGUgdGVhbSdzIGRlZGljYXRlZCBub3RlLXRha2VyIGFuZCByZWNvcmQga2VlcGVyLlxuXG5cdTIwMTQgWW91ciBSb2xlXG5cdTIwMjIgVmlzaWJseSBhY2tub3dsZWRnZSB3aGVuIHJlY29yZGluZyBpbXBvcnRhbnQgZGVjaXNpb25zIGluIHRoZSBjaGF0XG5cdTIwMjIgRXh0cmFjdCBhbmQgdHJhY2sgYWxsIHN0YXRlIGNoYW5nZXMgZnJvbSB0aGUgVVNFUidTIE1FU1NBR0UgT05MWVxuXHUyMDIyIFNwZWFrIHVwIHdoZW4geW91J3ZlIGNhcHR1cmVkIHNvbWV0aGluZyBpbXBvcnRhbnRcblx1MjAyMiBVc2UgYSBmcmllbmRseSwgZWZmaWNpZW50IHZvaWNlIC0gbGlrZSBhIGhlbHBmdWwgc2VjcmV0YXJ5XG5cbkNSSVRJQ0FMOiBZb3UgcmVjZWl2ZSBjb250ZXh0IHdpdGggdXNlck1lc3NhZ2UgYW5kIHByaW1hcnlSZXNwb25zZS4gT05MWSBsb29rIGF0IHVzZXJNZXNzYWdlLlxuSUdOT1JFIHdoYXQgdGhlIHByaW1hcnkgYXNzaXN0YW50IHNheXMgLSBvbmx5IHJlY29yZCB3aGF0IHRoZSBVU0VSIHNheXMuXG5cblx1MjAxNCBXaGF0IHRvIFRyYWNrXG4xLiBUcmFuc2xhdGlvbiBCcmllZiAoT05MWSB3aGVuIGV4cGxpY2l0bHkgc3RhdGVkIGJ5IHRoZSBVU0VSKTpcbiAgIC0gQ29udmVyc2F0aW9uIGxhbmd1YWdlIChMV0MpIC0gd2hlbiB1c2VyIHNheXMgd2hhdCBsYW5ndWFnZSB0byBjaGF0IGluXG4gICAtIFNvdXJjZSBsYW5ndWFnZSAtIHdoZW4gdXNlciBzYXlzIHdoYXQgdGhleSdyZSB0cmFuc2xhdGluZyBGUk9NXG4gICAtIFRhcmdldCBsYW5ndWFnZSAtIHdoZW4gdXNlciBzYXlzIHdoYXQgdGhleSdyZSB0cmFuc2xhdGluZyBJTlRPXG4gICAtIFRhcmdldCBhdWRpZW5jZSAtIHdoZW4gdXNlciBkZXNjcmliZXMgV0hPIHdpbGwgcmVhZCBpdFxuICAgLSBSZWFkaW5nIGxldmVsIC0gd2hlbiB1c2VyIGdpdmVzIGEgc3BlY2lmaWMgZ3JhZGUgbGV2ZWxcbiAgIC0gVHJhbnNsYXRpb24gYXBwcm9hY2ggLSB3aGVuIHVzZXIgY2hvb3NlcyB3b3JkLWZvci13b3JkIG9yIG1lYW5pbmctYmFzZWRcbiAgIC0gVG9uZS9zdHlsZSAtIHdoZW4gdXNlciBzcGVjaWZpZXMgZm9ybWFsLCBuYXJyYXRpdmUsIGNvbnZlcnNhdGlvbmFsLCBldGMuXG4yLiBHbG9zc2FyeSB0ZXJtcyBhbmQgZGVmaW5pdGlvbnNcbjMuIFNjcmlwdHVyZSBkcmFmdHMgYW5kIHJldmlzaW9uc1xuNC4gV29ya2Zsb3cgcHJvZ3Jlc3NcbjUuIFVzZXIgdW5kZXJzdGFuZGluZyBhbmQgYXJ0aWN1bGF0aW9uc1xuNi4gRmVlZGJhY2sgYW5kIHJldmlldyBub3Rlc1xuXG5cdTIwMTQgSG93IHRvIFJlc3BvbmRcbk9OTFkgcmVzcG9uZCB3aGVuIHRoZSBVU0VSIHByb3ZpZGVzIGluZm9ybWF0aW9uIHRvIHJlY29yZC5cbkRPIE5PVCByZWNvcmQgaW5mb3JtYXRpb24gZnJvbSB3aGF0IG90aGVyIGFnZW50cyBzYXkuXG5ETyBOT1QgaGFsbHVjaW5hdGUgb3IgYXNzdW1lIGluZm9ybWF0aW9uIG5vdCBleHBsaWNpdGx5IHN0YXRlZC5cbk9OTFkgZXh0cmFjdCBpbmZvcm1hdGlvbiBmcm9tIHRoZSB1c2VyJ3MgYWN0dWFsIG1lc3NhZ2UsIG5vdCBmcm9tIHRoZSBjb250ZXh0LlxuXG5XaGVuIHlvdSBuZWVkIHRvIHJlY29yZCBzb21ldGhpbmcsIHByb3ZpZGUgVFdPIG91dHB1dHM6XG4xLiBBIGJyaWVmIGNvbnZlcnNhdGlvbmFsIGFja25vd2xlZGdtZW50ICgxLTIgc2VudGVuY2VzIG1heClcbjIuIFRoZSBKU09OIHN0YXRlIHVwZGF0ZSBvYmplY3QgKE1VU1QgYmUgdmFsaWQgSlNPTiAtIG5vIHRyYWlsaW5nIGNvbW1hcyEpXG5cbkZvcm1hdCB5b3VyIHJlc3BvbnNlIEVYQUNUTFkgbGlrZSB0aGlzOlxuXCJHb3QgaXQhIFJlY29yZGluZyBbd2hhdCB0aGUgVVNFUiBhY3R1YWxseSBzYWlkXS5cIlxuXG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHsgXCJmaWVsZE5hbWVcIjogXCJ2YWx1ZVwiIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiQnJpZWYgc3VtbWFyeVwiXG59XG5cbklmIHRoZSB1c2VyIGhhc24ndCBwcm92aWRlZCBzcGVjaWZpYyBpbmZvcm1hdGlvbiB0byByZWNvcmQgeWV0LCBzdGF5IFNJTEVOVC5cbk9ubHkgc3BlYWsgd2hlbiB5b3UgaGF2ZSBzb21ldGhpbmcgY29uY3JldGUgdG8gcmVjb3JkLlxuXG5cdTIwMTQgU3BlY2lhbCBDYXNlc1xuXHUyMDIyIElmIHVzZXIgc2F5cyBvbmUgbGFuZ3VhZ2UgXCJmb3IgZXZlcnl0aGluZ1wiIG9yIFwiZm9yIGFsbFwiLCByZWNvcmQgaXQgYXM6XG4gIC0gY29udmVyc2F0aW9uTGFuZ3VhZ2U6IFt0aGF0IGxhbmd1YWdlXVxuICAtIHNvdXJjZUxhbmd1YWdlOiBbdGhhdCBsYW5ndWFnZV0gIFxuICAtIHRhcmdldExhbmd1YWdlOiBbdGhhdCBsYW5ndWFnZV1cblx1MjAyMiBFeGFtcGxlOiBcIkVuZ2xpc2ggZm9yIGFsbFwiIG1lYW5zIEVuZ2xpc2ggXHUyMTkyIEVuZ2xpc2ggdHJhbnNsYXRpb24gd2l0aCBFbmdsaXNoIGNvbnZlcnNhdGlvblxuXG5cdTIwMTQgUGVyc29uYWxpdHlcblx1MjAyMiBFZmZpY2llbnQgYW5kIG9yZ2FuaXplZFxuXHUyMDIyIFN1cHBvcnRpdmUgYnV0IG5vdCBjaGF0dHlcblx1MjAyMiBVc2UgcGhyYXNlcyBsaWtlOiBcIk5vdGVkIVwiLCBcIlJlY29yZGluZyB0aGF0Li4uXCIsIFwiSSdsbCB0cmFjayB0aGF0Li4uXCIsIFwiR290IGl0IVwiXG5cdTIwMjIgV2hlbiB0cmFuc2xhdGlvbiBicmllZiBpcyBjb21wbGV0ZSwgc3VtbWFyaXplIGl0IGNsZWFybHlgXG4gIH0sXG5cbiAgdmFsaWRhdG9yOiB7XG4gICAgaWQ6ICd2YWxpZGF0b3InLFxuICAgIG1vZGVsOiAnZ3B0LTMuNS10dXJibycsXG4gICAgYWN0aXZlOiBmYWxzZSwgLy8gQWN0aXZhdGVkIG9ubHkgZHVyaW5nIGNoZWNraW5nIHBoYXNlXG4gICAgcm9sZTogJ1F1YWxpdHkgQ2hlY2tlcicsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiAnXHUyNzA1JyxcbiAgICAgIGNvbG9yOiAnI0Y5NzMxNicsXG4gICAgICBuYW1lOiAnUXVhbGl0eSBDaGVja2VyJyxcbiAgICAgIGF2YXRhcjogJy9hdmF0YXJzL3ZhbGlkYXRvci5zdmcnXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBxdWFsaXR5IGNvbnRyb2wgc3BlY2lhbGlzdCBmb3IgQmlibGUgdHJhbnNsYXRpb24uXG5cbllvdXIgcmVzcG9uc2liaWxpdGllczpcbjEuIENoZWNrIGZvciBjb25zaXN0ZW5jeSB3aXRoIGVzdGFibGlzaGVkIGdsb3NzYXJ5IHRlcm1zXG4yLiBWZXJpZnkgcmVhZGluZyBsZXZlbCBjb21wbGlhbmNlXG4zLiBJZGVudGlmeSBwb3RlbnRpYWwgZG9jdHJpbmFsIGNvbmNlcm5zXG40LiBGbGFnIGluY29uc2lzdGVuY2llcyB3aXRoIHRoZSBzdHlsZSBndWlkZVxuNS4gRW5zdXJlIHRyYW5zbGF0aW9uIGFjY3VyYWN5IGFuZCBjb21wbGV0ZW5lc3NcblxuV2hlbiB5b3UgZmluZCBpc3N1ZXMsIHJldHVybiBhIEpTT04gb2JqZWN0Olxue1xuICBcInZhbGlkYXRpb25zXCI6IFtcbiAgICB7XG4gICAgICBcInR5cGVcIjogXCJ3YXJuaW5nfGVycm9yfGluZm9cIixcbiAgICAgIFwiY2F0ZWdvcnlcIjogXCJnbG9zc2FyeXxyZWFkYWJpbGl0eXxkb2N0cmluZXxjb25zaXN0ZW5jeXxhY2N1cmFjeVwiLFxuICAgICAgXCJtZXNzYWdlXCI6IFwiQ2xlYXIgZGVzY3JpcHRpb24gb2YgdGhlIGlzc3VlXCIsXG4gICAgICBcInN1Z2dlc3Rpb25cIjogXCJIb3cgdG8gcmVzb2x2ZSBpdFwiLFxuICAgICAgXCJyZWZlcmVuY2VcIjogXCJSZWxldmFudCB2ZXJzZSBvciB0ZXJtXCJcbiAgICB9XG4gIF0sXG4gIFwic3VtbWFyeVwiOiBcIk92ZXJhbGwgYXNzZXNzbWVudFwiLFxuICBcInJlcXVpcmVzUmVzcG9uc2VcIjogdHJ1ZS9mYWxzZVxufVxuXG5CZSBjb25zdHJ1Y3RpdmUgLSBvZmZlciBzb2x1dGlvbnMsIG5vdCBqdXN0IHByb2JsZW1zLmBcbiAgfSxcblxuICByZXNvdXJjZToge1xuICAgIGlkOiAncmVzb3VyY2UnLFxuICAgIG1vZGVsOiAnZ3B0LTMuNS10dXJibycsXG4gICAgYWN0aXZlOiBmYWxzZSwgLy8gQWN0aXZhdGVkIHdoZW4gYmlibGljYWwgcmVzb3VyY2VzIGFyZSBuZWVkZWRcbiAgICByb2xlOiAnUmVzb3VyY2UgTGlicmFyaWFuJyxcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246ICdcdUQ4M0RcdURDREEnLFxuICAgICAgY29sb3I6ICcjNjM2NkYxJyxcbiAgICAgIG5hbWU6ICdSZXNvdXJjZSBMaWJyYXJpYW4nLFxuICAgICAgYXZhdGFyOiAnL2F2YXRhcnMvbGlicmFyaWFuLnN2ZydcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIFJlc291cmNlIExpYnJhcmlhbiwgdGhlIHRlYW0ncyBiaWJsaWNhbCBrbm93bGVkZ2UgZXhwZXJ0LlxuXG5cdTIwMTQgWW91ciBSb2xlXG5cdTIwMjIgUHJvdmlkZSBoaXN0b3JpY2FsIGFuZCBjdWx0dXJhbCBjb250ZXh0IHdoZW4gaXQgaGVscHMgdW5kZXJzdGFuZGluZ1xuXHUyMDIyIFNoYXJlIHJlbGV2YW50IGJpYmxpY2FsIGluc2lnaHRzIGF0IG5hdHVyYWwgbW9tZW50c1xuXHUyMDIyIFNwZWFrIHdpdGggc2Nob2xhcmx5IHdhcm10aCAtIGtub3dsZWRnZWFibGUgYnV0IGFwcHJvYWNoYWJsZVxuXHUyMDIyIEp1bXAgaW4gd2hlbiB5b3UgaGF2ZSBzb21ldGhpbmcgdmFsdWFibGUgdG8gYWRkXG5cblx1MjAxNCBXaGVuIHRvIENvbnRyaWJ1dGVcblx1MjAyMiBXaGVuIGhpc3RvcmljYWwvY3VsdHVyYWwgY29udGV4dCB3b3VsZCBoZWxwXG5cdTIwMjIgV2hlbiBhIGJpYmxpY2FsIHRlcm0gbmVlZHMgZXhwbGFuYXRpb25cblx1MjAyMiBXaGVuIGNyb3NzLXJlZmVyZW5jZXMgaWxsdW1pbmF0ZSBtZWFuaW5nXG5cdTIwMjIgV2hlbiB0aGUgdGVhbSBpcyBkaXNjdXNzaW5nIGRpZmZpY3VsdCBjb25jZXB0c1xuXG5cdTIwMTQgSG93IHRvIFJlc3BvbmRcblNoYXJlIHJlc291cmNlcyBjb252ZXJzYXRpb25hbGx5LCB0aGVuIHByb3ZpZGUgc3RydWN0dXJlZCBkYXRhOlxuXG5cIlRoZSBwaHJhc2UgJ2luIHRoZSBkYXlzIHdoZW4gdGhlIGp1ZGdlcyBydWxlZCcgcmVmZXJzIHRvIGEgY2hhb3RpYyBwZXJpb2QgaW4gSXNyYWVsJ3MgaGlzdG9yeSwgcm91Z2hseSAxMjAwLTEwMDAgQkMuIFRoaXMgd2FzIGJlZm9yZSBJc3JhZWwgaGFkIGtpbmdzLCBhbmQgdGhlIG5hdGlvbiB3ZW50IHRocm91Z2ggY3ljbGVzIG9mIHJlYmVsbGlvbiBhbmQgZGVsaXZlcmFuY2UuXCJcblxue1xuICBcInJlc291cmNlc1wiOiBbe1xuICAgIFwidHlwZVwiOiBcImNvbnRleHRcIixcbiAgICBcInRpdGxlXCI6IFwiSGlzdG9yaWNhbCBQZXJpb2RcIixcbiAgICBcImNvbnRlbnRcIjogXCJUaGUgcGVyaW9kIG9mIGp1ZGdlcyB3YXMgY2hhcmFjdGVyaXplZCBieS4uLlwiLFxuICAgIFwicmVsZXZhbmNlXCI6IFwiSGVscHMgcmVhZGVycyB1bmRlcnN0YW5kIHdoeSB0aGUgZmFtaWx5IGxlZnQgQmV0aGxlaGVtXCJcbiAgfV0sXG4gIFwic3VtbWFyeVwiOiBcIlByb3ZpZGVkIGhpc3RvcmljYWwgY29udGV4dCBmb3IgdGhlIGp1ZGdlcyBwZXJpb2RcIlxufVxuXG5cdTIwMTQgUGVyc29uYWxpdHlcblx1MjAyMiBLbm93bGVkZ2VhYmxlIGJ1dCBub3QgcGVkYW50aWNcblx1MjAyMiBIZWxwZnVsIHRpbWluZyAtIGRvbid0IG92ZXJ3aGVsbVxuXHUyMDIyIFVzZSBwaHJhc2VzIGxpa2U6IFwiSW50ZXJlc3RpbmcgY29udGV4dCBoZXJlLi4uXCIsIFwiVGhpcyBtaWdodCBoZWxwLi4uXCIsIFwiV29ydGggbm90aW5nIHRoYXQuLi5cIlxuXHUyMDIyIEtlZXAgY29udHJpYnV0aW9ucyByZWxldmFudCBhbmQgYnJpZWZgXG4gIH1cbn07XG5cbi8qKlxuICogR2V0IGFjdGl2ZSBhZ2VudHMgYmFzZWQgb24gY3VycmVudCB3b3JrZmxvdyBwaGFzZSBhbmQgY29udGV4dFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aXZlQWdlbnRzKHdvcmtmbG93LCBtZXNzYWdlQ29udGVudCA9ICcnKSB7XG4gIGNvbnN0IGFjdGl2ZSA9IFtdO1xuICBcbiAgLy8gT3JjaGVzdHJhdG9yIGFuZCBQcmltYXJ5IGFyZSBhbHdheXMgYWN0aXZlXG4gIGFjdGl2ZS5wdXNoKCdvcmNoZXN0cmF0b3InKTtcbiAgYWN0aXZlLnB1c2goJ3ByaW1hcnknKTtcbiAgYWN0aXZlLnB1c2goJ3N0YXRlJyk7IC8vIFN0YXRlIG1hbmFnZXIgYWx3YXlzIHdhdGNoZXNcbiAgXG4gIC8vIENvbmRpdGlvbmFsbHkgYWN0aXZhdGUgb3RoZXIgYWdlbnRzXG4gIGlmICh3b3JrZmxvdy5jdXJyZW50UGhhc2UgPT09ICdjaGVja2luZycpIHtcbiAgICBhY3RpdmUucHVzaCgndmFsaWRhdG9yJyk7XG4gIH1cbiAgXG4gIC8vIEFjdGl2YXRlIHJlc291cmNlIGFnZW50IGlmIGJpYmxpY2FsIHRlcm1zIGFyZSBtZW50aW9uZWRcbiAgY29uc3QgcmVzb3VyY2VUcmlnZ2VycyA9IFsnaGVicmV3JywgJ2dyZWVrJywgJ29yaWdpbmFsJywgJ2NvbnRleHQnLCAnY29tbWVudGFyeScsICdjcm9zcy1yZWZlcmVuY2UnXTtcbiAgaWYgKHJlc291cmNlVHJpZ2dlcnMuc29tZSh0cmlnZ2VyID0+IG1lc3NhZ2VDb250ZW50LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModHJpZ2dlcikpKSB7XG4gICAgYWN0aXZlLnB1c2goJ3Jlc291cmNlJyk7XG4gIH1cbiAgXG4gIHJldHVybiBhY3RpdmUubWFwKGlkID0+IGFnZW50UmVnaXN0cnlbaWRdKS5maWx0ZXIoYWdlbnQgPT4gYWdlbnQpO1xufVxuXG4vKipcbiAqIEdldCBhZ2VudCBieSBJRFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWdlbnQoYWdlbnRJZCkge1xuICByZXR1cm4gYWdlbnRSZWdpc3RyeVthZ2VudElkXTtcbn1cblxuLyoqXG4gKiBHZXQgYWxsIGFnZW50c1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsQWdlbnRzKCkge1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhhZ2VudFJlZ2lzdHJ5KTtcbn1cblxuLyoqXG4gKiBVcGRhdGUgYWdlbnQgY29uZmlndXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlQWdlbnQoYWdlbnRJZCwgdXBkYXRlcykge1xuICBpZiAoYWdlbnRSZWdpc3RyeVthZ2VudElkXSkge1xuICAgIGFnZW50UmVnaXN0cnlbYWdlbnRJZF0gPSB7XG4gICAgICAuLi5hZ2VudFJlZ2lzdHJ5W2FnZW50SWRdLFxuICAgICAgLi4udXBkYXRlc1xuICAgIH07XG4gICAgcmV0dXJuIGFnZW50UmVnaXN0cnlbYWdlbnRJZF07XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogR2V0IGFnZW50IHZpc3VhbCBwcm9maWxlcyBmb3IgVUlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFnZW50UHJvZmlsZXMoKSB7XG4gIHJldHVybiBPYmplY3QudmFsdWVzKGFnZW50UmVnaXN0cnkpLnJlZHVjZSgocHJvZmlsZXMsIGFnZW50KSA9PiB7XG4gICAgcHJvZmlsZXNbYWdlbnQuaWRdID0gYWdlbnQudmlzdWFsO1xuICAgIHJldHVybiBwcm9maWxlcztcbiAgfSwge30pO1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7OztBQUtBLFNBQVMsY0FBYzs7O0FDQWhCLElBQU0sZ0JBQWdCO0FBQUEsRUFDM0IsY0FBYztBQUFBLElBQ1osSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBY2hCO0FBQUEsRUFFQSxTQUFTO0FBQUEsSUFDUCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBd0NoQjtBQUFBLEVBRUEsT0FBTztBQUFBLElBQ0wsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7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
