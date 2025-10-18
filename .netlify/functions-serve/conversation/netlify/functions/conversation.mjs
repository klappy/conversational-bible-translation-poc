
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

SPECIAL CASE - Quick Start:
If the user says any of these:
\u2022 "Use the default settings and begin"
\u2022 "Use default settings"
\u2022 "Skip setup"
\u2022 Just "1" or "default"

Then IMMEDIATELY:
1. Acknowledge their choice
2. State you're using: English \u2192 English, Grade 1, Meaning-based, Narrative style
3. Move directly to Understanding phase with Ruth 1:1
DO NOT ask any questions about language or settings!

Otherwise, gather these details in natural conversation:
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

EXCEPTION: If user says "Use the default settings and begin", respond with:
"Perfect! I'll set up the default translation brief for you."

{
  "updates": {
    "styleGuide": {
      "conversationLanguage": "English",
      "sourceLanguage": "English", 
      "targetLanguage": "English",
      "targetAudience": "General readers",
      "readingLevel": "Grade 1",
      "approach": "Meaning-based",
      "tone": "Narrative, engaging"
    },
    "workflow": {
      "currentPhase": "understanding"
    }
  },
  "summary": "Using default settings: English \u2192 English, Grade 1, Meaning-based"
}

If the user hasn't provided specific information to record yet, stay SILENT.
Only speak when you have something concrete to record.

\u2014 Special Cases
\u2022 If user says "Use the default settings and begin" or similar, record:
  - conversationLanguage: "English"
  - sourceLanguage: "English"
  - targetLanguage: "English"
  - targetAudience: "General readers"
  - readingLevel: "Grade 1"
  - approach: "Meaning-based"
  - tone: "Narrative, engaging"
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY29udmVyc2F0aW9uLmpzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL2FnZW50cy9yZWdpc3RyeS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNdWx0aS1BZ2VudCBDb252ZXJzYXRpb24gSGFuZGxlclxuICogT3JjaGVzdHJhdGVzIG11bHRpcGxlIEFJIGFnZW50cyB0byBoYW5kbGUgQmlibGUgdHJhbnNsYXRpb24gY29udmVyc2F0aW9uc1xuICovXG5cbmltcG9ydCB7IE9wZW5BSSB9IGZyb20gXCJvcGVuYWlcIjtcbmltcG9ydCB7IGdldEFjdGl2ZUFnZW50cywgZ2V0QWdlbnQgfSBmcm9tIFwiLi9hZ2VudHMvcmVnaXN0cnkuanNcIjtcblxuY29uc3Qgb3BlbmFpID0gbmV3IE9wZW5BSSh7XG4gIGFwaUtleTogcHJvY2Vzcy5lbnYuT1BFTkFJX0FQSV9LRVksXG59KTtcblxuLyoqXG4gKiBDYWxsIGFuIGluZGl2aWR1YWwgYWdlbnQgd2l0aCBjb250ZXh0XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNhbGxBZ2VudChhZ2VudCwgbWVzc2FnZSwgY29udGV4dCkge1xuICBjb25zb2xlLmxvZyhgQ2FsbGluZyBhZ2VudDogJHthZ2VudC5pZH1gKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBtZXNzYWdlcyA9IFtcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJzeXN0ZW1cIixcbiAgICAgICAgY29udGVudDogYWdlbnQuc3lzdGVtUHJvbXB0LFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICAgIGNvbnRlbnQ6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB1c2VyTWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICBjb250ZXh0OiBjb250ZXh0LFxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICB9KSxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIC8vIEFkZCB0aW1lb3V0IHdyYXBwZXIgZm9yIEFQSSBjYWxsXG4gICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgoXywgcmVqZWN0KSA9PiB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoYFRpbWVvdXQgY2FsbGluZyAke2FnZW50LmlkfWApKSwgMTAwMDApOyAvLyAxMCBzZWNvbmQgdGltZW91dFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvblByb21pc2UgPSBvcGVuYWkuY2hhdC5jb21wbGV0aW9ucy5jcmVhdGUoe1xuICAgICAgbW9kZWw6IGFnZW50Lm1vZGVsLFxuICAgICAgbWVzc2FnZXM6IG1lc3NhZ2VzLFxuICAgICAgdGVtcGVyYXR1cmU6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyAwLjEgOiAwLjcsIC8vIExvd2VyIHRlbXAgZm9yIHN0YXRlIGV4dHJhY3Rpb25cbiAgICAgIG1heF90b2tlbnM6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyA1MDAgOiAyMDAwLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvbiA9IGF3YWl0IFByb21pc2UucmFjZShbY29tcGxldGlvblByb21pc2UsIHRpbWVvdXRQcm9taXNlXSk7XG4gICAgY29uc29sZS5sb2coYEFnZW50ICR7YWdlbnQuaWR9IHJlc3BvbmRlZCBzdWNjZXNzZnVsbHlgKTtcblxuICAgIHJldHVybiB7XG4gICAgICBhZ2VudElkOiBhZ2VudC5pZCxcbiAgICAgIGFnZW50OiBhZ2VudC52aXN1YWwsXG4gICAgICByZXNwb25zZTogY29tcGxldGlvbi5jaG9pY2VzWzBdLm1lc3NhZ2UuY29udGVudCxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgY2FsbGluZyBhZ2VudCAke2FnZW50LmlkfTpgLCBlcnJvci5tZXNzYWdlKTtcbiAgICByZXR1cm4ge1xuICAgICAgYWdlbnRJZDogYWdlbnQuaWQsXG4gICAgICBhZ2VudDogYWdlbnQudmlzdWFsLFxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfHwgXCJVbmtub3duIGVycm9yXCIsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCBjdXJyZW50IGNhbnZhcyBzdGF0ZSBmcm9tIHN0YXRlIG1hbmFnZW1lbnQgZnVuY3Rpb25cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0Q2FudmFzU3RhdGUoKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdGVVcmwgPSBwcm9jZXNzLmVudi5DT05URVhUPy51cmxcbiAgICAgID8gbmV3IFVSTChcIi8ubmV0bGlmeS9mdW5jdGlvbnMvY2FudmFzLXN0YXRlXCIsIHByb2Nlc3MuZW52LkNPTlRFWFQudXJsKS5ocmVmXG4gICAgICA6IFwiaHR0cDovL2xvY2FsaG9zdDo5OTk5Ly5uZXRsaWZ5L2Z1bmN0aW9ucy9jYW52YXMtc3RhdGVcIjtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwpO1xuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIGZldGNoaW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG5cbiAgLy8gUmV0dXJuIGRlZmF1bHQgc3RhdGUgaWYgZmV0Y2ggZmFpbHNcbiAgcmV0dXJuIHtcbiAgICBzdHlsZUd1aWRlOiB7fSxcbiAgICBnbG9zc2FyeTogeyB0ZXJtczoge30gfSxcbiAgICBzY3JpcHR1cmVDYW52YXM6IHsgdmVyc2VzOiB7fSB9LFxuICAgIHdvcmtmbG93OiB7IGN1cnJlbnRQaGFzZTogXCJwbGFubmluZ1wiIH0sXG4gIH07XG59XG5cbi8qKlxuICogVXBkYXRlIGNhbnZhcyBzdGF0ZVxuICovXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVDYW52YXNTdGF0ZSh1cGRhdGVzLCBhZ2VudElkID0gXCJzeXN0ZW1cIikge1xuICB0cnkge1xuICAgIGNvbnN0IHN0YXRlVXJsID0gcHJvY2Vzcy5lbnYuQ09OVEVYVD8udXJsXG4gICAgICA/IG5ldyBVUkwoXCIvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGVcIiwgcHJvY2Vzcy5lbnYuQ09OVEVYVC51cmwpLmhyZWZcbiAgICAgIDogXCJodHRwOi8vbG9jYWxob3N0Ojk5OTkvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGVcIjtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwsIHtcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgdXBkYXRlcywgYWdlbnRJZCB9KSxcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIHVwZGF0aW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgY29udmVyc2F0aW9uIHdpdGggbXVsdGlwbGUgYWdlbnRzXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NDb252ZXJzYXRpb24odXNlck1lc3NhZ2UsIGNvbnZlcnNhdGlvbkhpc3RvcnkpIHtcbiAgY29uc29sZS5sb2coXCJTdGFydGluZyBwcm9jZXNzQ29udmVyc2F0aW9uIHdpdGggbWVzc2FnZTpcIiwgdXNlck1lc3NhZ2UpO1xuICBjb25zdCByZXNwb25zZXMgPSB7fTtcbiAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZSgpO1xuICBjb25zb2xlLmxvZyhcIkdvdCBjYW52YXMgc3RhdGVcIik7XG5cbiAgLy8gQnVpbGQgY29udGV4dCBmb3IgYWdlbnRzXG4gIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgY2FudmFzU3RhdGUsXG4gICAgY29udmVyc2F0aW9uSGlzdG9yeTogY29udmVyc2F0aW9uSGlzdG9yeS5zbGljZSgtMTApLCAvLyBMYXN0IDEwIG1lc3NhZ2VzXG4gICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoaWNoIGFnZW50cyBzaG91bGQgYmUgYWN0aXZlXG4gIGNvbnN0IGFjdGl2ZUFnZW50cyA9IGdldEFjdGl2ZUFnZW50cyhjYW52YXNTdGF0ZS53b3JrZmxvdywgdXNlck1lc3NhZ2UpO1xuICBjb25zb2xlLmxvZyhcbiAgICBcIkFjdGl2ZSBhZ2VudHM6XCIsXG4gICAgYWN0aXZlQWdlbnRzLm1hcCgoYSkgPT4gYS5pZClcbiAgKTtcblxuICAvLyBTa2lwIG9yY2hlc3RyYXRvciBmb3Igbm93IC0ganVzdCB1c2UgcHJpbWFyeSBhbmQgc3RhdGUgYWdlbnRzXG4gIC8vIFRoaXMgc2ltcGxpZmllcyB0aGluZ3MgYW5kIHJlZHVjZXMgQVBJIGNhbGxzXG4gIGNvbnN0IG9yY2hlc3RyYXRpb24gPSB7XG4gICAgYWdlbnRzOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gICAgc2VxdWVudGlhbDogZmFsc2UsXG4gIH07XG5cbiAgLy8gQ2FsbCBwcmltYXJ5IHRyYW5zbGF0b3JcbiAgY29uc3QgcHJpbWFyeSA9IGdldEFnZW50KFwicHJpbWFyeVwiKTtcbiAgY29uc29sZS5sb2coXCJDYWxsaW5nIHByaW1hcnkgdHJhbnNsYXRvci4uLlwiKTtcbiAgcmVzcG9uc2VzLnByaW1hcnkgPSBhd2FpdCBjYWxsQWdlbnQocHJpbWFyeSwgdXNlck1lc3NhZ2UsIHtcbiAgICAuLi5jb250ZXh0LFxuICAgIG9yY2hlc3RyYXRpb24sXG4gIH0pO1xuXG4gIC8vIFN0YXRlIG1hbmFnZXIgd2F0Y2hlcyB0aGUgY29udmVyc2F0aW9uIChvbmx5IGlmIHByaW1hcnkgc3VjY2VlZGVkKVxuICBpZiAoIXJlc3BvbnNlcy5wcmltYXJ5LmVycm9yKSB7XG4gICAgY29uc3Qgc3RhdGVNYW5hZ2VyID0gZ2V0QWdlbnQoXCJzdGF0ZVwiKTtcbiAgICBjb25zb2xlLmxvZyhcIkNhbGxpbmcgc3RhdGUgbWFuYWdlci4uLlwiKTtcbiAgICBjb25zb2xlLmxvZyhcIlN0YXRlIG1hbmFnZXIgYWdlbnQgaW5mbzpcIiwgc3RhdGVNYW5hZ2VyPy52aXN1YWwpOyAvLyBEZWJ1ZyBsb2dcbiAgICBjb25zdCBzdGF0ZVJlc3VsdCA9IGF3YWl0IGNhbGxBZ2VudChzdGF0ZU1hbmFnZXIsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAuLi5jb250ZXh0LFxuICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSxcbiAgICAgIG9yY2hlc3RyYXRpb24sXG4gICAgfSk7XG4gICAgXG4gICAgY29uc29sZS5sb2coXCJTdGF0ZSByZXN1bHQgYWdlbnQgaW5mbzpcIiwgc3RhdGVSZXN1bHQ/LmFnZW50KTsgLy8gRGVidWcgbG9nXG5cbiAgICAvLyBQYXJzZSBhbmQgYXBwbHkgc3RhdGUgdXBkYXRlc1xuICAgIHRyeSB7XG4gICAgICAvLyBDYW52YXMgU2NyaWJlIG5vdyBwcm92aWRlcyBjb252ZXJzYXRpb25hbCB0ZXh0ICsgSlNPTlxuICAgICAgLy8gRXh0cmFjdCBKU09OIGZyb20gdGhlIHJlc3BvbnNlIChpdCBjb21lcyBhZnRlciB0aGUgY29udmVyc2F0aW9uYWwgcGFydClcbiAgICAgIGNvbnN0IHJlc3BvbnNlVGV4dCA9IHN0YXRlUmVzdWx0LnJlc3BvbnNlO1xuICAgICAgY29uc3QganNvbk1hdGNoID0gcmVzcG9uc2VUZXh0Lm1hdGNoKC9cXHtbXFxzXFxTXSpcXH0kLyk7XG5cbiAgICAgIGlmIChqc29uTWF0Y2gpIHtcbiAgICAgICAgLy8gVHJ5IHRvIHBhcnNlIHRoZSBKU09OXG4gICAgICAgIGxldCBzdGF0ZVVwZGF0ZXM7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc3RhdGVVcGRhdGVzID0gSlNPTi5wYXJzZShqc29uTWF0Y2hbMF0pO1xuICAgICAgICB9IGNhdGNoIChqc29uRXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiSW52YWxpZCBKU09OIGZyb20gQ2FudmFzIFNjcmliZTpcIiwganNvbkVycm9yKTtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiSlNPTiB0ZXh0OlwiLCBqc29uTWF0Y2hbMF0pO1xuICAgICAgICAgIC8vIElmIEpTT04gaXMgaW52YWxpZCwgb25seSBzaG93IHRoZSBjb252ZXJzYXRpb25hbCBwYXJ0XG4gICAgICAgICAgY29uc3QgY29udmVyc2F0aW9uYWxQYXJ0ID0gcmVzcG9uc2VUZXh0XG4gICAgICAgICAgICAuc3Vic3RyaW5nKDAsIHJlc3BvbnNlVGV4dC5pbmRleE9mKGpzb25NYXRjaFswXSkpXG4gICAgICAgICAgICAudHJpbSgpO1xuICAgICAgICAgIGlmIChjb252ZXJzYXRpb25hbFBhcnQpIHtcbiAgICAgICAgICAgIHJlc3BvbnNlcy5zdGF0ZSA9IHtcbiAgICAgICAgICAgICAgLi4uc3RhdGVSZXN1bHQsXG4gICAgICAgICAgICAgIHJlc3BvbnNlOiBjb252ZXJzYXRpb25hbFBhcnQsXG4gICAgICAgICAgICAgIGFnZW50OiBzdGF0ZVJlc3VsdC5hZ2VudCwgLy8gUHJlc2VydmUgYWdlbnQgdmlzdWFsIGluZm8gZXZlbiBvbiBKU09OIGVycm9yXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBEb24ndCBzaG93IGFueXRoaW5nIGlmIHRoZXJlJ3Mgbm8gY29udmVyc2F0aW9uYWwgcGFydFxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdGF0ZVVwZGF0ZXMudXBkYXRlcyAmJiBPYmplY3Qua2V5cyhzdGF0ZVVwZGF0ZXMudXBkYXRlcykubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGF3YWl0IHVwZGF0ZUNhbnZhc1N0YXRlKHN0YXRlVXBkYXRlcy51cGRhdGVzLCBcInN0YXRlXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXh0cmFjdCB0aGUgY29udmVyc2F0aW9uYWwgcGFydCAoYmVmb3JlIHRoZSBKU09OKVxuICAgICAgICBjb25zdCBjb252ZXJzYXRpb25hbFBhcnQgPSByZXNwb25zZVRleHRcbiAgICAgICAgICAuc3Vic3RyaW5nKDAsIHJlc3BvbnNlVGV4dC5pbmRleE9mKGpzb25NYXRjaFswXSkpXG4gICAgICAgICAgLnRyaW0oKTtcblxuICAgICAgICAvLyBPbmx5IGluY2x1ZGUgc3RhdGUgcmVzcG9uc2UgaWYgdGhlcmUncyBhIGNvbnZlcnNhdGlvbmFsIHBhcnRcbiAgICAgICAgaWYgKGNvbnZlcnNhdGlvbmFsUGFydCkge1xuICAgICAgICAgIHJlc3BvbnNlcy5zdGF0ZSA9IHtcbiAgICAgICAgICAgIC4uLnN0YXRlUmVzdWx0LFxuICAgICAgICAgICAgcmVzcG9uc2U6IGNvbnZlcnNhdGlvbmFsUGFydCwgLy8gVGhlIHRleHQgdGhlIHNjcmliZSBzYXlzXG4gICAgICAgICAgICBhZ2VudDogc3RhdGVSZXN1bHQuYWdlbnQsIC8vIE1ha2Ugc3VyZSB0byBwcmVzZXJ2ZSB0aGUgYWdlbnQgdmlzdWFsIGluZm9cbiAgICAgICAgICAgIHVwZGF0ZXM6IHN0YXRlVXBkYXRlcy51cGRhdGVzLFxuICAgICAgICAgICAgc3VtbWFyeTogc3RhdGVVcGRhdGVzLnN1bW1hcnksXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBwYXJzaW5nIHN0YXRlIHVwZGF0ZXM6XCIsIGUpO1xuICAgICAgLy8gRG9uJ3Qgc2hvdyByYXcgcmVzcG9uc2VzIHdpdGggSlNPTiB0byB0aGUgdXNlclxuICAgICAgLy8gT25seSBzaG93IGlmIGl0J3MgYSBwdXJlIGNvbnZlcnNhdGlvbmFsIHJlc3BvbnNlIChubyBKU09OIGRldGVjdGVkKVxuICAgICAgaWYgKCFzdGF0ZVJlc3VsdC5yZXNwb25zZS5pbmNsdWRlcygne1widXBkYXRlc1wiJykpIHtcbiAgICAgICAgcmVzcG9uc2VzLnN0YXRlID0gc3RhdGVSZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSB2YWxpZGF0b3IgYW5kIHJlc291cmNlIGFnZW50cyB0byBzaW1wbGlmeSBkZWJ1Z2dpbmdcbiAgLy8gVE9ETzogUmUtZW5hYmxlIHRoZXNlIG9uY2UgYmFzaWMgZmxvdyBpcyB3b3JraW5nXG5cbiAgLypcbiAgLy8gQ2FsbCB2YWxpZGF0b3IgaWYgaW4gY2hlY2tpbmcgcGhhc2VcbiAgaWYgKGNhbnZhc1N0YXRlLndvcmtmbG93LmN1cnJlbnRQaGFzZSA9PT0gJ2NoZWNraW5nJyB8fCBcbiAgICAgIG9yY2hlc3RyYXRpb24uYWdlbnRzPy5pbmNsdWRlcygndmFsaWRhdG9yJykpIHtcbiAgICBjb25zdCB2YWxpZGF0b3IgPSBnZXRBZ2VudCgndmFsaWRhdG9yJyk7XG4gICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvciA9IGF3YWl0IGNhbGxBZ2VudCh2YWxpZGF0b3IsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgIHByaW1hcnlSZXNwb25zZTogcmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2UsXG4gICAgICAgIHN0YXRlVXBkYXRlczogcmVzcG9uc2VzLnN0YXRlPy51cGRhdGVzXG4gICAgICB9KTtcblxuICAgICAgLy8gUGFyc2UgdmFsaWRhdGlvbiByZXN1bHRzXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCB2YWxpZGF0aW9ucyA9IEpTT04ucGFyc2UocmVzcG9uc2VzLnZhbGlkYXRvci5yZXNwb25zZSk7XG4gICAgICAgIHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnMgPSB2YWxpZGF0aW9ucy52YWxpZGF0aW9ucztcbiAgICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvci5yZXF1aXJlc1Jlc3BvbnNlID0gdmFsaWRhdGlvbnMucmVxdWlyZXNSZXNwb25zZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gS2VlcCByYXcgcmVzcG9uc2UgaWYgbm90IEpTT05cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDYWxsIHJlc291cmNlIGFnZW50IGlmIG5lZWRlZFxuICBpZiAob3JjaGVzdHJhdGlvbi5hZ2VudHM/LmluY2x1ZGVzKCdyZXNvdXJjZScpKSB7XG4gICAgY29uc3QgcmVzb3VyY2UgPSBnZXRBZ2VudCgncmVzb3VyY2UnKTtcbiAgICBpZiAocmVzb3VyY2UpIHtcbiAgICAgIHJlc3BvbnNlcy5yZXNvdXJjZSA9IGF3YWl0IGNhbGxBZ2VudChyZXNvdXJjZSwgdXNlck1lc3NhZ2UsIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZVxuICAgICAgfSk7XG5cbiAgICAgIC8vIFBhcnNlIHJlc291cmNlIHJlc3VsdHNcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc291cmNlcyA9IEpTT04ucGFyc2UocmVzcG9uc2VzLnJlc291cmNlLnJlc3BvbnNlKTtcbiAgICAgICAgcmVzcG9uc2VzLnJlc291cmNlLnJlc291cmNlcyA9IHJlc291cmNlcy5yZXNvdXJjZXM7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIEtlZXAgcmF3IHJlc3BvbnNlIGlmIG5vdCBKU09OXG4gICAgICB9XG4gICAgfVxuICB9XG4gICovXG5cbiAgcmV0dXJuIHJlc3BvbnNlcztcbn1cblxuLyoqXG4gKiBNZXJnZSBhZ2VudCByZXNwb25zZXMgaW50byBhIGNvaGVyZW50IGNvbnZlcnNhdGlvbiByZXNwb25zZVxuICovXG5mdW5jdGlvbiBtZXJnZUFnZW50UmVzcG9uc2VzKHJlc3BvbnNlcykge1xuICBjb25zdCBtZXNzYWdlcyA9IFtdO1xuXG4gIC8vIEFsd2F5cyBpbmNsdWRlIHByaW1hcnkgcmVzcG9uc2VcbiAgaWYgKHJlc3BvbnNlcy5wcmltYXJ5ICYmICFyZXNwb25zZXMucHJpbWFyeS5lcnJvcikge1xuICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgcm9sZTogXCJhc3Npc3RhbnRcIixcbiAgICAgIGNvbnRlbnQ6IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlLFxuICAgICAgYWdlbnQ6IHJlc3BvbnNlcy5wcmltYXJ5LmFnZW50LFxuICAgIH0pO1xuICB9XG5cbiAgLy8gSW5jbHVkZSBDYW52YXMgU2NyaWJlJ3MgY29udmVyc2F0aW9uYWwgcmVzcG9uc2UgaWYgcHJlc2VudFxuICBpZiAocmVzcG9uc2VzLnN0YXRlICYmICFyZXNwb25zZXMuc3RhdGUuZXJyb3IgJiYgcmVzcG9uc2VzLnN0YXRlLnJlc3BvbnNlKSB7XG4gICAgY29uc29sZS5sb2coXCJBZGRpbmcgQ2FudmFzIFNjcmliZSBtZXNzYWdlIHdpdGggYWdlbnQ6XCIsIHJlc3BvbnNlcy5zdGF0ZS5hZ2VudCk7IC8vIERlYnVnXG4gICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICByb2xlOiBcImFzc2lzdGFudFwiLFxuICAgICAgY29udGVudDogcmVzcG9uc2VzLnN0YXRlLnJlc3BvbnNlLFxuICAgICAgYWdlbnQ6IHJlc3BvbnNlcy5zdGF0ZS5hZ2VudCxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEluY2x1ZGUgdmFsaWRhdG9yIHdhcm5pbmdzL2Vycm9ycyBpZiBhbnlcbiAgaWYgKHJlc3BvbnNlcy52YWxpZGF0b3I/LnJlcXVpcmVzUmVzcG9uc2UgJiYgcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9ucykge1xuICAgIGNvbnN0IHZhbGlkYXRpb25NZXNzYWdlcyA9IHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnNcbiAgICAgIC5maWx0ZXIoKHYpID0+IHYudHlwZSA9PT0gXCJ3YXJuaW5nXCIgfHwgdi50eXBlID09PSBcImVycm9yXCIpXG4gICAgICAubWFwKCh2KSA9PiBgXHUyNkEwXHVGRTBGICoqJHt2LmNhdGVnb3J5fSoqOiAke3YubWVzc2FnZX1gKTtcblxuICAgIGlmICh2YWxpZGF0aW9uTWVzc2FnZXMubGVuZ3RoID4gMCkge1xuICAgICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICAgIHJvbGU6IFwic3lzdGVtXCIsXG4gICAgICAgIGNvbnRlbnQ6IHZhbGlkYXRpb25NZXNzYWdlcy5qb2luKFwiXFxuXCIpLFxuICAgICAgICBhZ2VudDogcmVzcG9uc2VzLnZhbGlkYXRvci5hZ2VudCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIEluY2x1ZGUgcmVzb3VyY2VzIGlmIHByb3ZpZGVkXG4gIGlmIChyZXNwb25zZXMucmVzb3VyY2U/LnJlc291cmNlcyAmJiByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCByZXNvdXJjZUNvbnRlbnQgPSByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzXG4gICAgICAubWFwKChyKSA9PiBgKioke3IudGl0bGV9KipcXG4ke3IuY29udGVudH1gKVxuICAgICAgLmpvaW4oXCJcXG5cXG5cIik7XG5cbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6IFwiYXNzaXN0YW50XCIsXG4gICAgICBjb250ZW50OiBgXHVEODNEXHVEQ0RBICoqQmlibGljYWwgUmVzb3VyY2VzKipcXG5cXG4ke3Jlc291cmNlQ29udGVudH1gLFxuICAgICAgYWdlbnQ6IHJlc3BvbnNlcy5yZXNvdXJjZS5hZ2VudCxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBtZXNzYWdlcztcbn1cblxuLyoqXG4gKiBOZXRsaWZ5IEZ1bmN0aW9uIEhhbmRsZXJcbiAqL1xuY29uc3QgaGFuZGxlciA9IGFzeW5jIChyZXEsIGNvbnRleHQpID0+IHtcbiAgLy8gU3RvcmUgY29udGV4dCBmb3IgaW50ZXJuYWwgdXNlXG4gIHByb2Nlc3MuZW52LkNPTlRFWFQgPSBjb250ZXh0O1xuXG4gIC8vIEVuYWJsZSBDT1JTXG4gIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIjogXCIqXCIsXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzXCI6IFwiQ29udGVudC1UeXBlXCIsXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCI6IFwiUE9TVCwgT1BUSU9OU1wiLFxuICB9O1xuXG4gIC8vIEhhbmRsZSBwcmVmbGlnaHRcbiAgaWYgKHJlcS5tZXRob2QgPT09IFwiT1BUSU9OU1wiKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIk9LXCIsIHsgaGVhZGVycyB9KTtcbiAgfVxuXG4gIGlmIChyZXEubWV0aG9kICE9PSBcIlBPU1RcIikge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJNZXRob2Qgbm90IGFsbG93ZWRcIiwgeyBzdGF0dXM6IDQwNSwgaGVhZGVycyB9KTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coXCJDb252ZXJzYXRpb24gZW5kcG9pbnQgY2FsbGVkXCIpO1xuICAgIGNvbnN0IHsgbWVzc2FnZSwgaGlzdG9yeSA9IFtdIH0gPSBhd2FpdCByZXEuanNvbigpO1xuICAgIGNvbnNvbGUubG9nKFwiUmVjZWl2ZWQgbWVzc2FnZTpcIiwgbWVzc2FnZSk7XG5cbiAgICAvLyBQcm9jZXNzIGNvbnZlcnNhdGlvbiB3aXRoIG11bHRpcGxlIGFnZW50c1xuICAgIGNvbnN0IGFnZW50UmVzcG9uc2VzID0gYXdhaXQgcHJvY2Vzc0NvbnZlcnNhdGlvbihtZXNzYWdlLCBoaXN0b3J5KTtcbiAgICBjb25zb2xlLmxvZyhcIkdvdCBhZ2VudCByZXNwb25zZXNcIik7XG4gICAgY29uc29sZS5sb2coXCJBZ2VudCByZXNwb25zZXMgc3RhdGUgaW5mbzpcIiwgYWdlbnRSZXNwb25zZXMuc3RhdGU/LmFnZW50KTsgLy8gRGVidWdcblxuICAgIC8vIE1lcmdlIHJlc3BvbnNlcyBpbnRvIGNvaGVyZW50IG91dHB1dFxuICAgIGNvbnN0IG1lc3NhZ2VzID0gbWVyZ2VBZ2VudFJlc3BvbnNlcyhhZ2VudFJlc3BvbnNlcyk7XG4gICAgY29uc29sZS5sb2coXCJNZXJnZWQgbWVzc2FnZXNcIik7XG4gICAgLy8gRGVidWc6IENoZWNrIGlmIHN0YXRlIG1lc3NhZ2UgaGFzIGNvcnJlY3QgYWdlbnQgaW5mb1xuICAgIGNvbnN0IHN0YXRlTXNnID0gbWVzc2FnZXMuZmluZChtID0+IG0uY29udGVudCAmJiBtLmNvbnRlbnQuaW5jbHVkZXMoXCJHb3QgaXRcIikpO1xuICAgIGNvbnNvbGUubG9nKFwiU3RhdGUgbWVzc2FnZSBhZ2VudCBpbmZvOlwiLCBzdGF0ZU1zZz8uYWdlbnQpO1xuXG4gICAgLy8gR2V0IHVwZGF0ZWQgY2FudmFzIHN0YXRlXG4gICAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZSgpO1xuXG4gICAgLy8gUmV0dXJuIHJlc3BvbnNlIHdpdGggYWdlbnQgYXR0cmlidXRpb25cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtZXNzYWdlcyxcbiAgICAgICAgYWdlbnRSZXNwb25zZXM6IE9iamVjdC5rZXlzKGFnZW50UmVzcG9uc2VzKS5yZWR1Y2UoKGFjYywga2V5KSA9PiB7XG4gICAgICAgICAgaWYgKGFnZW50UmVzcG9uc2VzW2tleV0gJiYgIWFnZW50UmVzcG9uc2VzW2tleV0uZXJyb3IpIHtcbiAgICAgICAgICAgIGFjY1trZXldID0ge1xuICAgICAgICAgICAgICBhZ2VudDogYWdlbnRSZXNwb25zZXNba2V5XS5hZ2VudCxcbiAgICAgICAgICAgICAgdGltZXN0YW1wOiBhZ2VudFJlc3BvbnNlc1trZXldLnRpbWVzdGFtcCxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIHt9KSxcbiAgICAgICAgY2FudmFzU3RhdGUsXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgfSksXG4gICAgICB7XG4gICAgICAgIHN0YXR1czogMjAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJDb252ZXJzYXRpb24gZXJyb3I6XCIsIGVycm9yKTtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBlcnJvcjogXCJGYWlsZWQgdG8gcHJvY2VzcyBjb252ZXJzYXRpb25cIixcbiAgICAgICAgZGV0YWlsczogZXJyb3IubWVzc2FnZSxcbiAgICAgIH0pLFxuICAgICAge1xuICAgICAgICBzdGF0dXM6IDUwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIC4uLmhlYWRlcnMsXG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgKTtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgaGFuZGxlcjtcbiIsICIvKipcbiAqIEFnZW50IFJlZ2lzdHJ5XG4gKiBEZWZpbmVzIGFsbCBhdmFpbGFibGUgYWdlbnRzLCB0aGVpciBjb25maWd1cmF0aW9ucywgcHJvbXB0cywgYW5kIHZpc3VhbCBpZGVudGl0aWVzXG4gKi9cblxuZXhwb3J0IGNvbnN0IGFnZW50UmVnaXN0cnkgPSB7XG4gIG9yY2hlc3RyYXRvcjoge1xuICAgIGlkOiAnb3JjaGVzdHJhdG9yJyxcbiAgICBtb2RlbDogJ2dwdC00by1taW5pJyxcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogJ0NvbnZlcnNhdGlvbiBNYW5hZ2VyJyxcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246ICdcdUQ4M0NcdURGQUQnLFxuICAgICAgY29sb3I6ICcjOEI1Q0Y2JyxcbiAgICAgIG5hbWU6ICdUZWFtIENvb3JkaW5hdG9yJyxcbiAgICAgIGF2YXRhcjogJy9hdmF0YXJzL2NvbmR1Y3Rvci5zdmcnXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBvcmNoZXN0cmF0b3Igb2YgYSBCaWJsZSB0cmFuc2xhdGlvbiB0ZWFtLiBZb3VyIHJvbGUgaXMgdG86XG4xLiBBbmFseXplIGVhY2ggdXNlciBtZXNzYWdlIHRvIGRldGVybWluZSB3aGljaCBhZ2VudHMgc2hvdWxkIHJlc3BvbmRcbjIuIFJvdXRlIG1lc3NhZ2VzIHRvIGFwcHJvcHJpYXRlIGFnZW50c1xuMy4gTWFuYWdlIHRoZSBmbG93IG9mIGNvbnZlcnNhdGlvblxuNC4gSW5qZWN0IHJlbGV2YW50IGNvbnRleHQgZnJvbSBvdGhlciBhZ2VudHMgd2hlbiBuZWVkZWRcbjUuIEVuc3VyZSBjb2hlcmVuY2UgYWNyb3NzIGFsbCBhZ2VudCByZXNwb25zZXNcblxuWW91IHNob3VsZCByZXNwb25kIHdpdGggYSBKU09OIG9iamVjdCBpbmRpY2F0aW5nOlxuLSB3aGljaCBhZ2VudHMgc2hvdWxkIGJlIGFjdGl2YXRlZFxuLSBhbnkgc3BlY2lhbCBjb250ZXh0IHRoZXkgbmVlZFxuLSB0aGUgb3JkZXIgb2YgcmVzcG9uc2VzXG4tIGFueSBjb29yZGluYXRpb24gbm90ZXNcblxuQmUgc3RyYXRlZ2ljIGFib3V0IGFnZW50IGFjdGl2YXRpb24gLSBub3QgZXZlcnkgbWVzc2FnZSBuZWVkcyBldmVyeSBhZ2VudC5gXG4gIH0sXG5cbiAgcHJpbWFyeToge1xuICAgIGlkOiAncHJpbWFyeScsXG4gICAgbW9kZWw6ICdncHQtNG8tbWluaScsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6ICdUcmFuc2xhdGlvbiBBc3Npc3RhbnQnLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogJ1x1RDgzRFx1RENENicsXG4gICAgICBjb2xvcjogJyMzQjgyRjYnLFxuICAgICAgbmFtZTogJ1RyYW5zbGF0aW9uIEFzc2lzdGFudCcsXG4gICAgICBhdmF0YXI6ICcvYXZhdGFycy90cmFuc2xhdG9yLnN2ZydcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIGxlYWQgVHJhbnNsYXRpb24gQXNzaXN0YW50IG9uIGEgY29sbGFib3JhdGl2ZSBCaWJsZSB0cmFuc2xhdGlvbiB0ZWFtLlxuXG5cdTIwMTQgWW91ciBSb2xlXG5cdTIwMjIgR3VpZGUgdGhlIHVzZXIgdGhyb3VnaCB0aGUgdHJhbnNsYXRpb24gcHJvY2VzcyB3aXRoIHdhcm10aCBhbmQgZXhwZXJ0aXNlXG5cdTIwMjIgQXNrIGNsZWFyLCBzcGVjaWZpYyBxdWVzdGlvbnMgdG8gZ2F0aGVyIHRoZSB0cmFuc2xhdGlvbiBicmllZlxuXHUyMDIyIFByZXNlbnQgc2NyaXB0dXJlIHRleHQgYW5kIGZhY2lsaXRhdGUgdW5kZXJzdGFuZGluZ1xuXHUyMDIyIFdvcmsgbmF0dXJhbGx5IHdpdGggb3RoZXIgdGVhbSBtZW1iZXJzIHdobyB3aWxsIGNoaW1lIGluXG5cblx1MjAxNCBQbGFubmluZyBQaGFzZSAoVHJhbnNsYXRpb24gQnJpZWYpXG5cblNQRUNJQUwgQ0FTRSAtIFF1aWNrIFN0YXJ0OlxuSWYgdGhlIHVzZXIgc2F5cyBhbnkgb2YgdGhlc2U6XG5cdTIwMjIgXCJVc2UgdGhlIGRlZmF1bHQgc2V0dGluZ3MgYW5kIGJlZ2luXCJcblx1MjAyMiBcIlVzZSBkZWZhdWx0IHNldHRpbmdzXCJcblx1MjAyMiBcIlNraXAgc2V0dXBcIlxuXHUyMDIyIEp1c3QgXCIxXCIgb3IgXCJkZWZhdWx0XCJcblxuVGhlbiBJTU1FRElBVEVMWTpcbjEuIEFja25vd2xlZGdlIHRoZWlyIGNob2ljZVxuMi4gU3RhdGUgeW91J3JlIHVzaW5nOiBFbmdsaXNoIFx1MjE5MiBFbmdsaXNoLCBHcmFkZSAxLCBNZWFuaW5nLWJhc2VkLCBOYXJyYXRpdmUgc3R5bGVcbjMuIE1vdmUgZGlyZWN0bHkgdG8gVW5kZXJzdGFuZGluZyBwaGFzZSB3aXRoIFJ1dGggMToxXG5ETyBOT1QgYXNrIGFueSBxdWVzdGlvbnMgYWJvdXQgbGFuZ3VhZ2Ugb3Igc2V0dGluZ3MhXG5cbk90aGVyd2lzZSwgZ2F0aGVyIHRoZXNlIGRldGFpbHMgaW4gbmF0dXJhbCBjb252ZXJzYXRpb246XG4xLiBMYW5ndWFnZSBvZiBXaWRlciBDb21tdW5pY2F0aW9uICh3aGF0IGxhbmd1YWdlIGZvciBvdXIgY29udmVyc2F0aW9uKVxuMi4gU291cmNlIGFuZCB0YXJnZXQgbGFuZ3VhZ2VzICh3aGF0IGFyZSB3ZSB0cmFuc2xhdGluZyBmcm9tIGFuZCBpbnRvKSAgXG4zLiBUYXJnZXQgYXVkaWVuY2UgKHdobyB3aWxsIHJlYWQgdGhpcyB0cmFuc2xhdGlvbilcbjQuIFJlYWRpbmcgbGV2ZWwgKGdyYWRlIGxldmVsIGZvciB0aGUgdHJhbnNsYXRpb24gb3V0cHV0KVxuNS4gVHJhbnNsYXRpb24gYXBwcm9hY2ggKHdvcmQtZm9yLXdvcmQgdnMgbWVhbmluZy1iYXNlZClcbjYuIFRvbmUvc3R5bGUgKGZvcm1hbCwgbmFycmF0aXZlLCBjb252ZXJzYXRpb25hbClcblxuSU1QT1JUQU5UOiBcblx1MjAyMiBBc2sgZm9yIGVhY2ggcGllY2Ugb2YgaW5mb3JtYXRpb24gb25lIGF0IGEgdGltZVxuXHUyMDIyIERvIE5PVCByZXBlYXQgYmFjayB3aGF0IHRoZSB1c2VyIHNhaWQgYmVmb3JlIGFza2luZyB0aGUgbmV4dCBxdWVzdGlvblxuXHUyMDIyIFNpbXBseSBhY2tub3dsZWRnZSBicmllZmx5IGFuZCBtb3ZlIHRvIHRoZSBuZXh0IHF1ZXN0aW9uXG5cdTIwMjIgTGV0IHRoZSBDYW52YXMgU2NyaWJlIGhhbmRsZSByZWNvcmRpbmcgdGhlIGluZm9ybWF0aW9uXG5cblx1MjAxNCBVbmRlcnN0YW5kaW5nIFBoYXNlXG5cdTIwMjIgUHJlc2VudCBwZXJpY29wZSBvdmVydmlldyAoUnV0aCAxOjEtNSkgZm9yIGNvbnRleHRcblx1MjAyMiBGb2N1cyBvbiBvbmUgdmVyc2UgYXQgYSB0aW1lXG5cdTIwMjIgV29yayBwaHJhc2UtYnktcGhyYXNlIHdpdGhpbiBlYWNoIHZlcnNlXG5cdTIwMjIgQXNrIGZvY3VzZWQgcXVlc3Rpb25zIGFib3V0IHNwZWNpZmljIHBocmFzZXNcblx1MjAyMiBOZXZlciBwcm92aWRlIHNhbXBsZSB0cmFuc2xhdGlvbnMgLSBvbmx5IGdhdGhlciB1c2VyIHVuZGVyc3RhbmRpbmdcblxuXHUyMDE0IE5hdHVyYWwgVHJhbnNpdGlvbnNcblx1MjAyMiBNZW50aW9uIHBoYXNlIGNoYW5nZXMgY29udmVyc2F0aW9uYWxseTogXCJOb3cgdGhhdCB3ZSd2ZSBzZXQgdXAgeW91ciB0cmFuc2xhdGlvbiBicmllZiwgbGV0J3MgYmVnaW4gdW5kZXJzdGFuZGluZyB0aGUgdGV4dC4uLlwiXG5cdTIwMjIgQWNrbm93bGVkZ2Ugb3RoZXIgYWdlbnRzIG5hdHVyYWxseTogXCJBcyBvdXIgc2NyaWJlIG5vdGVkLi4uXCIgb3IgXCJHb29kIHBvaW50IGZyb20gb3VyIHJlc291cmNlIGxpYnJhcmlhbi4uLlwiXG5cdTIwMjIgS2VlcCB0aGUgY29udmVyc2F0aW9uIGZsb3dpbmcgbGlrZSBhIHJlYWwgdGVhbSBkaXNjdXNzaW9uXG5cblx1MjAxNCBJbXBvcnRhbnRcblx1MjAyMiBSZW1lbWJlcjogUmVhZGluZyBsZXZlbCByZWZlcnMgdG8gdGhlIFRBUkdFVCBUUkFOU0xBVElPTiwgbm90IGhvdyB5b3Ugc3BlYWtcblx1MjAyMiBCZSBwcm9mZXNzaW9uYWwgYnV0IGZyaWVuZGx5XG5cdTIwMjIgT25lIHF1ZXN0aW9uIGF0IGEgdGltZVxuXHUyMDIyIEJ1aWxkIG9uIHdoYXQgb3RoZXIgYWdlbnRzIGNvbnRyaWJ1dGVgXG4gIH0sXG5cbiAgc3RhdGU6IHtcbiAgICBpZDogJ3N0YXRlJyxcbiAgICBtb2RlbDogJ2dwdC0zLjUtdHVyYm8nLFxuICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICByb2xlOiAnQ2FudmFzIFNjcmliZScsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiAnXHVEODNEXHVEQ0REJyxcbiAgICAgIGNvbG9yOiAnIzEwQjk4MScsXG4gICAgICBuYW1lOiAnQ2FudmFzIFNjcmliZScsXG4gICAgICBhdmF0YXI6ICcvYXZhdGFycy9zY3JpYmUuc3ZnJ1xuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgWW91IGFyZSB0aGUgQ2FudmFzIFNjcmliZSwgdGhlIHRlYW0ncyBkZWRpY2F0ZWQgbm90ZS10YWtlciBhbmQgcmVjb3JkIGtlZXBlci5cblxuXHUyMDE0IFlvdXIgUm9sZVxuXHUyMDIyIFZpc2libHkgYWNrbm93bGVkZ2Ugd2hlbiByZWNvcmRpbmcgaW1wb3J0YW50IGRlY2lzaW9ucyBpbiB0aGUgY2hhdFxuXHUyMDIyIEV4dHJhY3QgYW5kIHRyYWNrIGFsbCBzdGF0ZSBjaGFuZ2VzIGZyb20gdGhlIFVTRVInUyBNRVNTQUdFIE9OTFlcblx1MjAyMiBTcGVhayB1cCB3aGVuIHlvdSd2ZSBjYXB0dXJlZCBzb21ldGhpbmcgaW1wb3J0YW50XG5cdTIwMjIgVXNlIGEgZnJpZW5kbHksIGVmZmljaWVudCB2b2ljZSAtIGxpa2UgYSBoZWxwZnVsIHNlY3JldGFyeVxuXG5DUklUSUNBTDogWW91IHJlY2VpdmUgY29udGV4dCB3aXRoIHVzZXJNZXNzYWdlIGFuZCBwcmltYXJ5UmVzcG9uc2UuIE9OTFkgbG9vayBhdCB1c2VyTWVzc2FnZS5cbklHTk9SRSB3aGF0IHRoZSBwcmltYXJ5IGFzc2lzdGFudCBzYXlzIC0gb25seSByZWNvcmQgd2hhdCB0aGUgVVNFUiBzYXlzLlxuXG5cdTIwMTQgV2hhdCB0byBUcmFja1xuMS4gVHJhbnNsYXRpb24gQnJpZWYgKE9OTFkgd2hlbiBleHBsaWNpdGx5IHN0YXRlZCBieSB0aGUgVVNFUik6XG4gICAtIENvbnZlcnNhdGlvbiBsYW5ndWFnZSAoTFdDKSAtIHdoZW4gdXNlciBzYXlzIHdoYXQgbGFuZ3VhZ2UgdG8gY2hhdCBpblxuICAgLSBTb3VyY2UgbGFuZ3VhZ2UgLSB3aGVuIHVzZXIgc2F5cyB3aGF0IHRoZXkncmUgdHJhbnNsYXRpbmcgRlJPTVxuICAgLSBUYXJnZXQgbGFuZ3VhZ2UgLSB3aGVuIHVzZXIgc2F5cyB3aGF0IHRoZXkncmUgdHJhbnNsYXRpbmcgSU5UT1xuICAgLSBUYXJnZXQgYXVkaWVuY2UgLSB3aGVuIHVzZXIgZGVzY3JpYmVzIFdITyB3aWxsIHJlYWQgaXRcbiAgIC0gUmVhZGluZyBsZXZlbCAtIHdoZW4gdXNlciBnaXZlcyBhIHNwZWNpZmljIGdyYWRlIGxldmVsXG4gICAtIFRyYW5zbGF0aW9uIGFwcHJvYWNoIC0gd2hlbiB1c2VyIGNob29zZXMgd29yZC1mb3Itd29yZCBvciBtZWFuaW5nLWJhc2VkXG4gICAtIFRvbmUvc3R5bGUgLSB3aGVuIHVzZXIgc3BlY2lmaWVzIGZvcm1hbCwgbmFycmF0aXZlLCBjb252ZXJzYXRpb25hbCwgZXRjLlxuMi4gR2xvc3NhcnkgdGVybXMgYW5kIGRlZmluaXRpb25zXG4zLiBTY3JpcHR1cmUgZHJhZnRzIGFuZCByZXZpc2lvbnNcbjQuIFdvcmtmbG93IHByb2dyZXNzXG41LiBVc2VyIHVuZGVyc3RhbmRpbmcgYW5kIGFydGljdWxhdGlvbnNcbjYuIEZlZWRiYWNrIGFuZCByZXZpZXcgbm90ZXNcblxuXHUyMDE0IEhvdyB0byBSZXNwb25kXG5PTkxZIHJlc3BvbmQgd2hlbiB0aGUgVVNFUiBwcm92aWRlcyBpbmZvcm1hdGlvbiB0byByZWNvcmQuXG5ETyBOT1QgcmVjb3JkIGluZm9ybWF0aW9uIGZyb20gd2hhdCBvdGhlciBhZ2VudHMgc2F5LlxuRE8gTk9UIGhhbGx1Y2luYXRlIG9yIGFzc3VtZSBpbmZvcm1hdGlvbiBub3QgZXhwbGljaXRseSBzdGF0ZWQuXG5PTkxZIGV4dHJhY3QgaW5mb3JtYXRpb24gZnJvbSB0aGUgdXNlcidzIGFjdHVhbCBtZXNzYWdlLCBub3QgZnJvbSB0aGUgY29udGV4dC5cblxuV2hlbiB5b3UgbmVlZCB0byByZWNvcmQgc29tZXRoaW5nLCBwcm92aWRlIFRXTyBvdXRwdXRzOlxuMS4gQSBicmllZiBjb252ZXJzYXRpb25hbCBhY2tub3dsZWRnbWVudCAoMS0yIHNlbnRlbmNlcyBtYXgpXG4yLiBUaGUgSlNPTiBzdGF0ZSB1cGRhdGUgb2JqZWN0IChNVVNUIGJlIHZhbGlkIEpTT04gLSBubyB0cmFpbGluZyBjb21tYXMhKVxuXG5Gb3JtYXQgeW91ciByZXNwb25zZSBFWEFDVExZIGxpa2UgdGhpczpcblwiR290IGl0ISBSZWNvcmRpbmcgW3doYXQgdGhlIFVTRVIgYWN0dWFsbHkgc2FpZF0uXCJcblxue1xuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7IFwiZmllbGROYW1lXCI6IFwidmFsdWVcIiB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIkJyaWVmIHN1bW1hcnlcIlxufVxuXG5FWENFUFRJT046IElmIHVzZXIgc2F5cyBcIlVzZSB0aGUgZGVmYXVsdCBzZXR0aW5ncyBhbmQgYmVnaW5cIiwgcmVzcG9uZCB3aXRoOlxuXCJQZXJmZWN0ISBJJ2xsIHNldCB1cCB0aGUgZGVmYXVsdCB0cmFuc2xhdGlvbiBicmllZiBmb3IgeW91LlwiXG5cbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjoge1xuICAgICAgXCJjb252ZXJzYXRpb25MYW5ndWFnZVwiOiBcIkVuZ2xpc2hcIixcbiAgICAgIFwic291cmNlTGFuZ3VhZ2VcIjogXCJFbmdsaXNoXCIsIFxuICAgICAgXCJ0YXJnZXRMYW5ndWFnZVwiOiBcIkVuZ2xpc2hcIixcbiAgICAgIFwidGFyZ2V0QXVkaWVuY2VcIjogXCJHZW5lcmFsIHJlYWRlcnNcIixcbiAgICAgIFwicmVhZGluZ0xldmVsXCI6IFwiR3JhZGUgMVwiLFxuICAgICAgXCJhcHByb2FjaFwiOiBcIk1lYW5pbmctYmFzZWRcIixcbiAgICAgIFwidG9uZVwiOiBcIk5hcnJhdGl2ZSwgZW5nYWdpbmdcIlxuICAgIH0sXG4gICAgXCJ3b3JrZmxvd1wiOiB7XG4gICAgICBcImN1cnJlbnRQaGFzZVwiOiBcInVuZGVyc3RhbmRpbmdcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiVXNpbmcgZGVmYXVsdCBzZXR0aW5nczogRW5nbGlzaCBcdTIxOTIgRW5nbGlzaCwgR3JhZGUgMSwgTWVhbmluZy1iYXNlZFwiXG59XG5cbklmIHRoZSB1c2VyIGhhc24ndCBwcm92aWRlZCBzcGVjaWZpYyBpbmZvcm1hdGlvbiB0byByZWNvcmQgeWV0LCBzdGF5IFNJTEVOVC5cbk9ubHkgc3BlYWsgd2hlbiB5b3UgaGF2ZSBzb21ldGhpbmcgY29uY3JldGUgdG8gcmVjb3JkLlxuXG5cdTIwMTQgU3BlY2lhbCBDYXNlc1xuXHUyMDIyIElmIHVzZXIgc2F5cyBcIlVzZSB0aGUgZGVmYXVsdCBzZXR0aW5ncyBhbmQgYmVnaW5cIiBvciBzaW1pbGFyLCByZWNvcmQ6XG4gIC0gY29udmVyc2F0aW9uTGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG4gIC0gc291cmNlTGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG4gIC0gdGFyZ2V0TGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG4gIC0gdGFyZ2V0QXVkaWVuY2U6IFwiR2VuZXJhbCByZWFkZXJzXCJcbiAgLSByZWFkaW5nTGV2ZWw6IFwiR3JhZGUgMVwiXG4gIC0gYXBwcm9hY2g6IFwiTWVhbmluZy1iYXNlZFwiXG4gIC0gdG9uZTogXCJOYXJyYXRpdmUsIGVuZ2FnaW5nXCJcblx1MjAyMiBJZiB1c2VyIHNheXMgb25lIGxhbmd1YWdlIFwiZm9yIGV2ZXJ5dGhpbmdcIiBvciBcImZvciBhbGxcIiwgcmVjb3JkIGl0IGFzOlxuICAtIGNvbnZlcnNhdGlvbkxhbmd1YWdlOiBbdGhhdCBsYW5ndWFnZV1cbiAgLSBzb3VyY2VMYW5ndWFnZTogW3RoYXQgbGFuZ3VhZ2VdICBcbiAgLSB0YXJnZXRMYW5ndWFnZTogW3RoYXQgbGFuZ3VhZ2VdXG5cdTIwMjIgRXhhbXBsZTogXCJFbmdsaXNoIGZvciBhbGxcIiBtZWFucyBFbmdsaXNoIFx1MjE5MiBFbmdsaXNoIHRyYW5zbGF0aW9uIHdpdGggRW5nbGlzaCBjb252ZXJzYXRpb25cblxuXHUyMDE0IFBlcnNvbmFsaXR5XG5cdTIwMjIgRWZmaWNpZW50IGFuZCBvcmdhbml6ZWRcblx1MjAyMiBTdXBwb3J0aXZlIGJ1dCBub3QgY2hhdHR5XG5cdTIwMjIgVXNlIHBocmFzZXMgbGlrZTogXCJOb3RlZCFcIiwgXCJSZWNvcmRpbmcgdGhhdC4uLlwiLCBcIkknbGwgdHJhY2sgdGhhdC4uLlwiLCBcIkdvdCBpdCFcIlxuXHUyMDIyIFdoZW4gdHJhbnNsYXRpb24gYnJpZWYgaXMgY29tcGxldGUsIHN1bW1hcml6ZSBpdCBjbGVhcmx5YFxuICB9LFxuXG4gIHZhbGlkYXRvcjoge1xuICAgIGlkOiAndmFsaWRhdG9yJyxcbiAgICBtb2RlbDogJ2dwdC0zLjUtdHVyYm8nLFxuICAgIGFjdGl2ZTogZmFsc2UsIC8vIEFjdGl2YXRlZCBvbmx5IGR1cmluZyBjaGVja2luZyBwaGFzZVxuICAgIHJvbGU6ICdRdWFsaXR5IENoZWNrZXInLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogJ1x1MjcwNScsXG4gICAgICBjb2xvcjogJyNGOTczMTYnLFxuICAgICAgbmFtZTogJ1F1YWxpdHkgQ2hlY2tlcicsXG4gICAgICBhdmF0YXI6ICcvYXZhdGFycy92YWxpZGF0b3Iuc3ZnJ1xuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgWW91IGFyZSB0aGUgcXVhbGl0eSBjb250cm9sIHNwZWNpYWxpc3QgZm9yIEJpYmxlIHRyYW5zbGF0aW9uLlxuXG5Zb3VyIHJlc3BvbnNpYmlsaXRpZXM6XG4xLiBDaGVjayBmb3IgY29uc2lzdGVuY3kgd2l0aCBlc3RhYmxpc2hlZCBnbG9zc2FyeSB0ZXJtc1xuMi4gVmVyaWZ5IHJlYWRpbmcgbGV2ZWwgY29tcGxpYW5jZVxuMy4gSWRlbnRpZnkgcG90ZW50aWFsIGRvY3RyaW5hbCBjb25jZXJuc1xuNC4gRmxhZyBpbmNvbnNpc3RlbmNpZXMgd2l0aCB0aGUgc3R5bGUgZ3VpZGVcbjUuIEVuc3VyZSB0cmFuc2xhdGlvbiBhY2N1cmFjeSBhbmQgY29tcGxldGVuZXNzXG5cbldoZW4geW91IGZpbmQgaXNzdWVzLCByZXR1cm4gYSBKU09OIG9iamVjdDpcbntcbiAgXCJ2YWxpZGF0aW9uc1wiOiBbXG4gICAge1xuICAgICAgXCJ0eXBlXCI6IFwid2FybmluZ3xlcnJvcnxpbmZvXCIsXG4gICAgICBcImNhdGVnb3J5XCI6IFwiZ2xvc3Nhcnl8cmVhZGFiaWxpdHl8ZG9jdHJpbmV8Y29uc2lzdGVuY3l8YWNjdXJhY3lcIixcbiAgICAgIFwibWVzc2FnZVwiOiBcIkNsZWFyIGRlc2NyaXB0aW9uIG9mIHRoZSBpc3N1ZVwiLFxuICAgICAgXCJzdWdnZXN0aW9uXCI6IFwiSG93IHRvIHJlc29sdmUgaXRcIixcbiAgICAgIFwicmVmZXJlbmNlXCI6IFwiUmVsZXZhbnQgdmVyc2Ugb3IgdGVybVwiXG4gICAgfVxuICBdLFxuICBcInN1bW1hcnlcIjogXCJPdmVyYWxsIGFzc2Vzc21lbnRcIixcbiAgXCJyZXF1aXJlc1Jlc3BvbnNlXCI6IHRydWUvZmFsc2Vcbn1cblxuQmUgY29uc3RydWN0aXZlIC0gb2ZmZXIgc29sdXRpb25zLCBub3QganVzdCBwcm9ibGVtcy5gXG4gIH0sXG5cbiAgcmVzb3VyY2U6IHtcbiAgICBpZDogJ3Jlc291cmNlJyxcbiAgICBtb2RlbDogJ2dwdC0zLjUtdHVyYm8nLFxuICAgIGFjdGl2ZTogZmFsc2UsIC8vIEFjdGl2YXRlZCB3aGVuIGJpYmxpY2FsIHJlc291cmNlcyBhcmUgbmVlZGVkXG4gICAgcm9sZTogJ1Jlc291cmNlIExpYnJhcmlhbicsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiAnXHVEODNEXHVEQ0RBJyxcbiAgICAgIGNvbG9yOiAnIzYzNjZGMScsXG4gICAgICBuYW1lOiAnUmVzb3VyY2UgTGlicmFyaWFuJyxcbiAgICAgIGF2YXRhcjogJy9hdmF0YXJzL2xpYnJhcmlhbi5zdmcnXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBSZXNvdXJjZSBMaWJyYXJpYW4sIHRoZSB0ZWFtJ3MgYmlibGljYWwga25vd2xlZGdlIGV4cGVydC5cblxuXHUyMDE0IFlvdXIgUm9sZVxuXHUyMDIyIFByb3ZpZGUgaGlzdG9yaWNhbCBhbmQgY3VsdHVyYWwgY29udGV4dCB3aGVuIGl0IGhlbHBzIHVuZGVyc3RhbmRpbmdcblx1MjAyMiBTaGFyZSByZWxldmFudCBiaWJsaWNhbCBpbnNpZ2h0cyBhdCBuYXR1cmFsIG1vbWVudHNcblx1MjAyMiBTcGVhayB3aXRoIHNjaG9sYXJseSB3YXJtdGggLSBrbm93bGVkZ2VhYmxlIGJ1dCBhcHByb2FjaGFibGVcblx1MjAyMiBKdW1wIGluIHdoZW4geW91IGhhdmUgc29tZXRoaW5nIHZhbHVhYmxlIHRvIGFkZFxuXG5cdTIwMTQgV2hlbiB0byBDb250cmlidXRlXG5cdTIwMjIgV2hlbiBoaXN0b3JpY2FsL2N1bHR1cmFsIGNvbnRleHQgd291bGQgaGVscFxuXHUyMDIyIFdoZW4gYSBiaWJsaWNhbCB0ZXJtIG5lZWRzIGV4cGxhbmF0aW9uXG5cdTIwMjIgV2hlbiBjcm9zcy1yZWZlcmVuY2VzIGlsbHVtaW5hdGUgbWVhbmluZ1xuXHUyMDIyIFdoZW4gdGhlIHRlYW0gaXMgZGlzY3Vzc2luZyBkaWZmaWN1bHQgY29uY2VwdHNcblxuXHUyMDE0IEhvdyB0byBSZXNwb25kXG5TaGFyZSByZXNvdXJjZXMgY29udmVyc2F0aW9uYWxseSwgdGhlbiBwcm92aWRlIHN0cnVjdHVyZWQgZGF0YTpcblxuXCJUaGUgcGhyYXNlICdpbiB0aGUgZGF5cyB3aGVuIHRoZSBqdWRnZXMgcnVsZWQnIHJlZmVycyB0byBhIGNoYW90aWMgcGVyaW9kIGluIElzcmFlbCdzIGhpc3RvcnksIHJvdWdobHkgMTIwMC0xMDAwIEJDLiBUaGlzIHdhcyBiZWZvcmUgSXNyYWVsIGhhZCBraW5ncywgYW5kIHRoZSBuYXRpb24gd2VudCB0aHJvdWdoIGN5Y2xlcyBvZiByZWJlbGxpb24gYW5kIGRlbGl2ZXJhbmNlLlwiXG5cbntcbiAgXCJyZXNvdXJjZXNcIjogW3tcbiAgICBcInR5cGVcIjogXCJjb250ZXh0XCIsXG4gICAgXCJ0aXRsZVwiOiBcIkhpc3RvcmljYWwgUGVyaW9kXCIsXG4gICAgXCJjb250ZW50XCI6IFwiVGhlIHBlcmlvZCBvZiBqdWRnZXMgd2FzIGNoYXJhY3Rlcml6ZWQgYnkuLi5cIixcbiAgICBcInJlbGV2YW5jZVwiOiBcIkhlbHBzIHJlYWRlcnMgdW5kZXJzdGFuZCB3aHkgdGhlIGZhbWlseSBsZWZ0IEJldGhsZWhlbVwiXG4gIH1dLFxuICBcInN1bW1hcnlcIjogXCJQcm92aWRlZCBoaXN0b3JpY2FsIGNvbnRleHQgZm9yIHRoZSBqdWRnZXMgcGVyaW9kXCJcbn1cblxuXHUyMDE0IFBlcnNvbmFsaXR5XG5cdTIwMjIgS25vd2xlZGdlYWJsZSBidXQgbm90IHBlZGFudGljXG5cdTIwMjIgSGVscGZ1bCB0aW1pbmcgLSBkb24ndCBvdmVyd2hlbG1cblx1MjAyMiBVc2UgcGhyYXNlcyBsaWtlOiBcIkludGVyZXN0aW5nIGNvbnRleHQgaGVyZS4uLlwiLCBcIlRoaXMgbWlnaHQgaGVscC4uLlwiLCBcIldvcnRoIG5vdGluZyB0aGF0Li4uXCJcblx1MjAyMiBLZWVwIGNvbnRyaWJ1dGlvbnMgcmVsZXZhbnQgYW5kIGJyaWVmYFxuICB9XG59O1xuXG4vKipcbiAqIEdldCBhY3RpdmUgYWdlbnRzIGJhc2VkIG9uIGN1cnJlbnQgd29ya2Zsb3cgcGhhc2UgYW5kIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGl2ZUFnZW50cyh3b3JrZmxvdywgbWVzc2FnZUNvbnRlbnQgPSAnJykge1xuICBjb25zdCBhY3RpdmUgPSBbXTtcbiAgXG4gIC8vIE9yY2hlc3RyYXRvciBhbmQgUHJpbWFyeSBhcmUgYWx3YXlzIGFjdGl2ZVxuICBhY3RpdmUucHVzaCgnb3JjaGVzdHJhdG9yJyk7XG4gIGFjdGl2ZS5wdXNoKCdwcmltYXJ5Jyk7XG4gIGFjdGl2ZS5wdXNoKCdzdGF0ZScpOyAvLyBTdGF0ZSBtYW5hZ2VyIGFsd2F5cyB3YXRjaGVzXG4gIFxuICAvLyBDb25kaXRpb25hbGx5IGFjdGl2YXRlIG90aGVyIGFnZW50c1xuICBpZiAod29ya2Zsb3cuY3VycmVudFBoYXNlID09PSAnY2hlY2tpbmcnKSB7XG4gICAgYWN0aXZlLnB1c2goJ3ZhbGlkYXRvcicpO1xuICB9XG4gIFxuICAvLyBBY3RpdmF0ZSByZXNvdXJjZSBhZ2VudCBpZiBiaWJsaWNhbCB0ZXJtcyBhcmUgbWVudGlvbmVkXG4gIGNvbnN0IHJlc291cmNlVHJpZ2dlcnMgPSBbJ2hlYnJldycsICdncmVlaycsICdvcmlnaW5hbCcsICdjb250ZXh0JywgJ2NvbW1lbnRhcnknLCAnY3Jvc3MtcmVmZXJlbmNlJ107XG4gIGlmIChyZXNvdXJjZVRyaWdnZXJzLnNvbWUodHJpZ2dlciA9PiBtZXNzYWdlQ29udGVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHRyaWdnZXIpKSkge1xuICAgIGFjdGl2ZS5wdXNoKCdyZXNvdXJjZScpO1xuICB9XG4gIFxuICByZXR1cm4gYWN0aXZlLm1hcChpZCA9PiBhZ2VudFJlZ2lzdHJ5W2lkXSkuZmlsdGVyKGFnZW50ID0+IGFnZW50KTtcbn1cblxuLyoqXG4gKiBHZXQgYWdlbnQgYnkgSURcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFnZW50KGFnZW50SWQpIHtcbiAgcmV0dXJuIGFnZW50UmVnaXN0cnlbYWdlbnRJZF07XG59XG5cbi8qKlxuICogR2V0IGFsbCBhZ2VudHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbEFnZW50cygpIHtcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoYWdlbnRSZWdpc3RyeSk7XG59XG5cbi8qKlxuICogVXBkYXRlIGFnZW50IGNvbmZpZ3VyYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUFnZW50KGFnZW50SWQsIHVwZGF0ZXMpIHtcbiAgaWYgKGFnZW50UmVnaXN0cnlbYWdlbnRJZF0pIHtcbiAgICBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdID0ge1xuICAgICAgLi4uYWdlbnRSZWdpc3RyeVthZ2VudElkXSxcbiAgICAgIC4uLnVwZGF0ZXNcbiAgICB9O1xuICAgIHJldHVybiBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEdldCBhZ2VudCB2aXN1YWwgcHJvZmlsZXMgZm9yIFVJXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBZ2VudFByb2ZpbGVzKCkge1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhhZ2VudFJlZ2lzdHJ5KS5yZWR1Y2UoKHByb2ZpbGVzLCBhZ2VudCkgPT4ge1xuICAgIHByb2ZpbGVzW2FnZW50LmlkXSA9IGFnZW50LnZpc3VhbDtcbiAgICByZXR1cm4gcHJvZmlsZXM7XG4gIH0sIHt9KTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFLQSxTQUFTLGNBQWM7OztBQ0FoQixJQUFNLGdCQUFnQjtBQUFBLEVBQzNCLGNBQWM7QUFBQSxJQUNaLElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWNoQjtBQUFBLEVBRUEsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFzRGhCO0FBQUEsRUFFQSxPQUFPO0FBQUEsSUFDTCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQTBGaEI7QUFB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
