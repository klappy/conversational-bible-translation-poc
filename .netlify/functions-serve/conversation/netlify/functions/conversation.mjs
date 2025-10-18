
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

CRITICAL INSTRUCTION - CHECK FIRST:
If the user message contains "Use the default settings" or "Use default settings and begin" or similar:
- DO NOT ask any questions about language or settings
- IMMEDIATELY say: "Perfect! I'll use the default settings (English \u2192 English, Grade 1, meaning-based, narrative style). Let's begin with Ruth 1:1..."
- Move directly to presenting the verse text

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
  const resourceTriggers = [
    "hebrew",
    "greek",
    "original",
    "context",
    "commentary",
    "cross-reference"
  ];
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
  if (responses.state && !responses.state.error && responses.state.response) {
    console.log("Adding Canvas Scribe message with agent:", responses.state.agent);
    messages.push({
      role: "assistant",
      content: responses.state.response,
      agent: responses.state.agent
    });
  }
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY29udmVyc2F0aW9uLmpzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL2FnZW50cy9yZWdpc3RyeS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNdWx0aS1BZ2VudCBDb252ZXJzYXRpb24gSGFuZGxlclxuICogT3JjaGVzdHJhdGVzIG11bHRpcGxlIEFJIGFnZW50cyB0byBoYW5kbGUgQmlibGUgdHJhbnNsYXRpb24gY29udmVyc2F0aW9uc1xuICovXG5cbmltcG9ydCB7IE9wZW5BSSB9IGZyb20gXCJvcGVuYWlcIjtcbmltcG9ydCB7IGdldEFjdGl2ZUFnZW50cywgZ2V0QWdlbnQgfSBmcm9tIFwiLi9hZ2VudHMvcmVnaXN0cnkuanNcIjtcblxuY29uc3Qgb3BlbmFpID0gbmV3IE9wZW5BSSh7XG4gIGFwaUtleTogcHJvY2Vzcy5lbnYuT1BFTkFJX0FQSV9LRVksXG59KTtcblxuLyoqXG4gKiBDYWxsIGFuIGluZGl2aWR1YWwgYWdlbnQgd2l0aCBjb250ZXh0XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNhbGxBZ2VudChhZ2VudCwgbWVzc2FnZSwgY29udGV4dCkge1xuICBjb25zb2xlLmxvZyhgQ2FsbGluZyBhZ2VudDogJHthZ2VudC5pZH1gKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBtZXNzYWdlcyA9IFtcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJzeXN0ZW1cIixcbiAgICAgICAgY29udGVudDogYWdlbnQuc3lzdGVtUHJvbXB0LFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICAgIGNvbnRlbnQ6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB1c2VyTWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICBjb250ZXh0OiBjb250ZXh0LFxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICB9KSxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIC8vIEFkZCB0aW1lb3V0IHdyYXBwZXIgZm9yIEFQSSBjYWxsXG4gICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgoXywgcmVqZWN0KSA9PiB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoYFRpbWVvdXQgY2FsbGluZyAke2FnZW50LmlkfWApKSwgMTAwMDApOyAvLyAxMCBzZWNvbmQgdGltZW91dFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvblByb21pc2UgPSBvcGVuYWkuY2hhdC5jb21wbGV0aW9ucy5jcmVhdGUoe1xuICAgICAgbW9kZWw6IGFnZW50Lm1vZGVsLFxuICAgICAgbWVzc2FnZXM6IG1lc3NhZ2VzLFxuICAgICAgdGVtcGVyYXR1cmU6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyAwLjEgOiAwLjcsIC8vIExvd2VyIHRlbXAgZm9yIHN0YXRlIGV4dHJhY3Rpb25cbiAgICAgIG1heF90b2tlbnM6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyA1MDAgOiAyMDAwLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvbiA9IGF3YWl0IFByb21pc2UucmFjZShbY29tcGxldGlvblByb21pc2UsIHRpbWVvdXRQcm9taXNlXSk7XG4gICAgY29uc29sZS5sb2coYEFnZW50ICR7YWdlbnQuaWR9IHJlc3BvbmRlZCBzdWNjZXNzZnVsbHlgKTtcblxuICAgIHJldHVybiB7XG4gICAgICBhZ2VudElkOiBhZ2VudC5pZCxcbiAgICAgIGFnZW50OiBhZ2VudC52aXN1YWwsXG4gICAgICByZXNwb25zZTogY29tcGxldGlvbi5jaG9pY2VzWzBdLm1lc3NhZ2UuY29udGVudCxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgY2FsbGluZyBhZ2VudCAke2FnZW50LmlkfTpgLCBlcnJvci5tZXNzYWdlKTtcbiAgICByZXR1cm4ge1xuICAgICAgYWdlbnRJZDogYWdlbnQuaWQsXG4gICAgICBhZ2VudDogYWdlbnQudmlzdWFsLFxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfHwgXCJVbmtub3duIGVycm9yXCIsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCBjdXJyZW50IGNhbnZhcyBzdGF0ZSBmcm9tIHN0YXRlIG1hbmFnZW1lbnQgZnVuY3Rpb25cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0Q2FudmFzU3RhdGUoKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdGVVcmwgPSBwcm9jZXNzLmVudi5DT05URVhUPy51cmxcbiAgICAgID8gbmV3IFVSTChcIi8ubmV0bGlmeS9mdW5jdGlvbnMvY2FudmFzLXN0YXRlXCIsIHByb2Nlc3MuZW52LkNPTlRFWFQudXJsKS5ocmVmXG4gICAgICA6IFwiaHR0cDovL2xvY2FsaG9zdDo5OTk5Ly5uZXRsaWZ5L2Z1bmN0aW9ucy9jYW52YXMtc3RhdGVcIjtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwpO1xuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIGZldGNoaW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG5cbiAgLy8gUmV0dXJuIGRlZmF1bHQgc3RhdGUgaWYgZmV0Y2ggZmFpbHNcbiAgcmV0dXJuIHtcbiAgICBzdHlsZUd1aWRlOiB7fSxcbiAgICBnbG9zc2FyeTogeyB0ZXJtczoge30gfSxcbiAgICBzY3JpcHR1cmVDYW52YXM6IHsgdmVyc2VzOiB7fSB9LFxuICAgIHdvcmtmbG93OiB7IGN1cnJlbnRQaGFzZTogXCJwbGFubmluZ1wiIH0sXG4gIH07XG59XG5cbi8qKlxuICogVXBkYXRlIGNhbnZhcyBzdGF0ZVxuICovXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVDYW52YXNTdGF0ZSh1cGRhdGVzLCBhZ2VudElkID0gXCJzeXN0ZW1cIikge1xuICB0cnkge1xuICAgIGNvbnN0IHN0YXRlVXJsID0gcHJvY2Vzcy5lbnYuQ09OVEVYVD8udXJsXG4gICAgICA/IG5ldyBVUkwoXCIvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGVcIiwgcHJvY2Vzcy5lbnYuQ09OVEVYVC51cmwpLmhyZWZcbiAgICAgIDogXCJodHRwOi8vbG9jYWxob3N0Ojk5OTkvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGVcIjtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwsIHtcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgdXBkYXRlcywgYWdlbnRJZCB9KSxcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIHVwZGF0aW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgY29udmVyc2F0aW9uIHdpdGggbXVsdGlwbGUgYWdlbnRzXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NDb252ZXJzYXRpb24odXNlck1lc3NhZ2UsIGNvbnZlcnNhdGlvbkhpc3RvcnkpIHtcbiAgY29uc29sZS5sb2coXCJTdGFydGluZyBwcm9jZXNzQ29udmVyc2F0aW9uIHdpdGggbWVzc2FnZTpcIiwgdXNlck1lc3NhZ2UpO1xuICBjb25zdCByZXNwb25zZXMgPSB7fTtcbiAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZSgpO1xuICBjb25zb2xlLmxvZyhcIkdvdCBjYW52YXMgc3RhdGVcIik7XG5cbiAgLy8gQnVpbGQgY29udGV4dCBmb3IgYWdlbnRzXG4gIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgY2FudmFzU3RhdGUsXG4gICAgY29udmVyc2F0aW9uSGlzdG9yeTogY29udmVyc2F0aW9uSGlzdG9yeS5zbGljZSgtMTApLCAvLyBMYXN0IDEwIG1lc3NhZ2VzXG4gICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoaWNoIGFnZW50cyBzaG91bGQgYmUgYWN0aXZlXG4gIGNvbnN0IGFjdGl2ZUFnZW50cyA9IGdldEFjdGl2ZUFnZW50cyhjYW52YXNTdGF0ZS53b3JrZmxvdywgdXNlck1lc3NhZ2UpO1xuICBjb25zb2xlLmxvZyhcbiAgICBcIkFjdGl2ZSBhZ2VudHM6XCIsXG4gICAgYWN0aXZlQWdlbnRzLm1hcCgoYSkgPT4gYS5pZClcbiAgKTtcblxuICAvLyBTa2lwIG9yY2hlc3RyYXRvciBmb3Igbm93IC0ganVzdCB1c2UgcHJpbWFyeSBhbmQgc3RhdGUgYWdlbnRzXG4gIC8vIFRoaXMgc2ltcGxpZmllcyB0aGluZ3MgYW5kIHJlZHVjZXMgQVBJIGNhbGxzXG4gIGNvbnN0IG9yY2hlc3RyYXRpb24gPSB7XG4gICAgYWdlbnRzOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gICAgc2VxdWVudGlhbDogZmFsc2UsXG4gIH07XG5cbiAgLy8gQ2FsbCBwcmltYXJ5IHRyYW5zbGF0b3JcbiAgY29uc3QgcHJpbWFyeSA9IGdldEFnZW50KFwicHJpbWFyeVwiKTtcbiAgY29uc29sZS5sb2coXCJDYWxsaW5nIHByaW1hcnkgdHJhbnNsYXRvci4uLlwiKTtcbiAgcmVzcG9uc2VzLnByaW1hcnkgPSBhd2FpdCBjYWxsQWdlbnQocHJpbWFyeSwgdXNlck1lc3NhZ2UsIHtcbiAgICAuLi5jb250ZXh0LFxuICAgIG9yY2hlc3RyYXRpb24sXG4gIH0pO1xuXG4gIC8vIFN0YXRlIG1hbmFnZXIgd2F0Y2hlcyB0aGUgY29udmVyc2F0aW9uIChvbmx5IGlmIHByaW1hcnkgc3VjY2VlZGVkKVxuICBpZiAoIXJlc3BvbnNlcy5wcmltYXJ5LmVycm9yKSB7XG4gICAgY29uc3Qgc3RhdGVNYW5hZ2VyID0gZ2V0QWdlbnQoXCJzdGF0ZVwiKTtcbiAgICBjb25zb2xlLmxvZyhcIkNhbGxpbmcgc3RhdGUgbWFuYWdlci4uLlwiKTtcbiAgICBjb25zb2xlLmxvZyhcIlN0YXRlIG1hbmFnZXIgYWdlbnQgaW5mbzpcIiwgc3RhdGVNYW5hZ2VyPy52aXN1YWwpOyAvLyBEZWJ1ZyBsb2dcbiAgICBjb25zdCBzdGF0ZVJlc3VsdCA9IGF3YWl0IGNhbGxBZ2VudChzdGF0ZU1hbmFnZXIsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAuLi5jb250ZXh0LFxuICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSxcbiAgICAgIG9yY2hlc3RyYXRpb24sXG4gICAgfSk7XG4gICAgXG4gICAgY29uc29sZS5sb2coXCJTdGF0ZSByZXN1bHQgYWdlbnQgaW5mbzpcIiwgc3RhdGVSZXN1bHQ/LmFnZW50KTsgLy8gRGVidWcgbG9nXG5cbiAgICAvLyBQYXJzZSBhbmQgYXBwbHkgc3RhdGUgdXBkYXRlc1xuICAgIHRyeSB7XG4gICAgICAvLyBDYW52YXMgU2NyaWJlIG5vdyBwcm92aWRlcyBjb252ZXJzYXRpb25hbCB0ZXh0ICsgSlNPTlxuICAgICAgLy8gRXh0cmFjdCBKU09OIGZyb20gdGhlIHJlc3BvbnNlIChpdCBjb21lcyBhZnRlciB0aGUgY29udmVyc2F0aW9uYWwgcGFydClcbiAgICAgIGNvbnN0IHJlc3BvbnNlVGV4dCA9IHN0YXRlUmVzdWx0LnJlc3BvbnNlO1xuICAgICAgY29uc3QganNvbk1hdGNoID0gcmVzcG9uc2VUZXh0Lm1hdGNoKC9cXHtbXFxzXFxTXSpcXH0kLyk7XG5cbiAgICAgIGlmIChqc29uTWF0Y2gpIHtcbiAgICAgICAgLy8gVHJ5IHRvIHBhcnNlIHRoZSBKU09OXG4gICAgICAgIGxldCBzdGF0ZVVwZGF0ZXM7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc3RhdGVVcGRhdGVzID0gSlNPTi5wYXJzZShqc29uTWF0Y2hbMF0pO1xuICAgICAgICB9IGNhdGNoIChqc29uRXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiSW52YWxpZCBKU09OIGZyb20gQ2FudmFzIFNjcmliZTpcIiwganNvbkVycm9yKTtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiSlNPTiB0ZXh0OlwiLCBqc29uTWF0Y2hbMF0pO1xuICAgICAgICAgIC8vIElmIEpTT04gaXMgaW52YWxpZCwgb25seSBzaG93IHRoZSBjb252ZXJzYXRpb25hbCBwYXJ0XG4gICAgICAgICAgY29uc3QgY29udmVyc2F0aW9uYWxQYXJ0ID0gcmVzcG9uc2VUZXh0XG4gICAgICAgICAgICAuc3Vic3RyaW5nKDAsIHJlc3BvbnNlVGV4dC5pbmRleE9mKGpzb25NYXRjaFswXSkpXG4gICAgICAgICAgICAudHJpbSgpO1xuICAgICAgICAgIGlmIChjb252ZXJzYXRpb25hbFBhcnQpIHtcbiAgICAgICAgICAgIHJlc3BvbnNlcy5zdGF0ZSA9IHtcbiAgICAgICAgICAgICAgLi4uc3RhdGVSZXN1bHQsXG4gICAgICAgICAgICAgIHJlc3BvbnNlOiBjb252ZXJzYXRpb25hbFBhcnQsXG4gICAgICAgICAgICAgIGFnZW50OiBzdGF0ZVJlc3VsdC5hZ2VudCwgLy8gUHJlc2VydmUgYWdlbnQgdmlzdWFsIGluZm8gZXZlbiBvbiBKU09OIGVycm9yXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBEb24ndCBzaG93IGFueXRoaW5nIGlmIHRoZXJlJ3Mgbm8gY29udmVyc2F0aW9uYWwgcGFydFxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdGF0ZVVwZGF0ZXMudXBkYXRlcyAmJiBPYmplY3Qua2V5cyhzdGF0ZVVwZGF0ZXMudXBkYXRlcykubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGF3YWl0IHVwZGF0ZUNhbnZhc1N0YXRlKHN0YXRlVXBkYXRlcy51cGRhdGVzLCBcInN0YXRlXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXh0cmFjdCB0aGUgY29udmVyc2F0aW9uYWwgcGFydCAoYmVmb3JlIHRoZSBKU09OKVxuICAgICAgICBjb25zdCBjb252ZXJzYXRpb25hbFBhcnQgPSByZXNwb25zZVRleHRcbiAgICAgICAgICAuc3Vic3RyaW5nKDAsIHJlc3BvbnNlVGV4dC5pbmRleE9mKGpzb25NYXRjaFswXSkpXG4gICAgICAgICAgLnRyaW0oKTtcblxuICAgICAgICAvLyBPbmx5IGluY2x1ZGUgc3RhdGUgcmVzcG9uc2UgaWYgdGhlcmUncyBhIGNvbnZlcnNhdGlvbmFsIHBhcnRcbiAgICAgICAgaWYgKGNvbnZlcnNhdGlvbmFsUGFydCkge1xuICAgICAgICAgIHJlc3BvbnNlcy5zdGF0ZSA9IHtcbiAgICAgICAgICAgIC4uLnN0YXRlUmVzdWx0LFxuICAgICAgICAgICAgcmVzcG9uc2U6IGNvbnZlcnNhdGlvbmFsUGFydCwgLy8gVGhlIHRleHQgdGhlIHNjcmliZSBzYXlzXG4gICAgICAgICAgICBhZ2VudDogc3RhdGVSZXN1bHQuYWdlbnQsIC8vIE1ha2Ugc3VyZSB0byBwcmVzZXJ2ZSB0aGUgYWdlbnQgdmlzdWFsIGluZm9cbiAgICAgICAgICAgIHVwZGF0ZXM6IHN0YXRlVXBkYXRlcy51cGRhdGVzLFxuICAgICAgICAgICAgc3VtbWFyeTogc3RhdGVVcGRhdGVzLnN1bW1hcnksXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBwYXJzaW5nIHN0YXRlIHVwZGF0ZXM6XCIsIGUpO1xuICAgICAgLy8gRG9uJ3Qgc2hvdyByYXcgcmVzcG9uc2VzIHdpdGggSlNPTiB0byB0aGUgdXNlclxuICAgICAgLy8gT25seSBzaG93IGlmIGl0J3MgYSBwdXJlIGNvbnZlcnNhdGlvbmFsIHJlc3BvbnNlIChubyBKU09OIGRldGVjdGVkKVxuICAgICAgaWYgKCFzdGF0ZVJlc3VsdC5yZXNwb25zZS5pbmNsdWRlcygne1widXBkYXRlc1wiJykpIHtcbiAgICAgICAgcmVzcG9uc2VzLnN0YXRlID0gc3RhdGVSZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSB2YWxpZGF0b3IgYW5kIHJlc291cmNlIGFnZW50cyB0byBzaW1wbGlmeSBkZWJ1Z2dpbmdcbiAgLy8gVE9ETzogUmUtZW5hYmxlIHRoZXNlIG9uY2UgYmFzaWMgZmxvdyBpcyB3b3JraW5nXG5cbiAgLypcbiAgLy8gQ2FsbCB2YWxpZGF0b3IgaWYgaW4gY2hlY2tpbmcgcGhhc2VcbiAgaWYgKGNhbnZhc1N0YXRlLndvcmtmbG93LmN1cnJlbnRQaGFzZSA9PT0gJ2NoZWNraW5nJyB8fCBcbiAgICAgIG9yY2hlc3RyYXRpb24uYWdlbnRzPy5pbmNsdWRlcygndmFsaWRhdG9yJykpIHtcbiAgICBjb25zdCB2YWxpZGF0b3IgPSBnZXRBZ2VudCgndmFsaWRhdG9yJyk7XG4gICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvciA9IGF3YWl0IGNhbGxBZ2VudCh2YWxpZGF0b3IsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgIHByaW1hcnlSZXNwb25zZTogcmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2UsXG4gICAgICAgIHN0YXRlVXBkYXRlczogcmVzcG9uc2VzLnN0YXRlPy51cGRhdGVzXG4gICAgICB9KTtcblxuICAgICAgLy8gUGFyc2UgdmFsaWRhdGlvbiByZXN1bHRzXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCB2YWxpZGF0aW9ucyA9IEpTT04ucGFyc2UocmVzcG9uc2VzLnZhbGlkYXRvci5yZXNwb25zZSk7XG4gICAgICAgIHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnMgPSB2YWxpZGF0aW9ucy52YWxpZGF0aW9ucztcbiAgICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvci5yZXF1aXJlc1Jlc3BvbnNlID0gdmFsaWRhdGlvbnMucmVxdWlyZXNSZXNwb25zZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gS2VlcCByYXcgcmVzcG9uc2UgaWYgbm90IEpTT05cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDYWxsIHJlc291cmNlIGFnZW50IGlmIG5lZWRlZFxuICBpZiAob3JjaGVzdHJhdGlvbi5hZ2VudHM/LmluY2x1ZGVzKCdyZXNvdXJjZScpKSB7XG4gICAgY29uc3QgcmVzb3VyY2UgPSBnZXRBZ2VudCgncmVzb3VyY2UnKTtcbiAgICBpZiAocmVzb3VyY2UpIHtcbiAgICAgIHJlc3BvbnNlcy5yZXNvdXJjZSA9IGF3YWl0IGNhbGxBZ2VudChyZXNvdXJjZSwgdXNlck1lc3NhZ2UsIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZVxuICAgICAgfSk7XG5cbiAgICAgIC8vIFBhcnNlIHJlc291cmNlIHJlc3VsdHNcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc291cmNlcyA9IEpTT04ucGFyc2UocmVzcG9uc2VzLnJlc291cmNlLnJlc3BvbnNlKTtcbiAgICAgICAgcmVzcG9uc2VzLnJlc291cmNlLnJlc291cmNlcyA9IHJlc291cmNlcy5yZXNvdXJjZXM7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIEtlZXAgcmF3IHJlc3BvbnNlIGlmIG5vdCBKU09OXG4gICAgICB9XG4gICAgfVxuICB9XG4gICovXG5cbiAgcmV0dXJuIHJlc3BvbnNlcztcbn1cblxuLyoqXG4gKiBNZXJnZSBhZ2VudCByZXNwb25zZXMgaW50byBhIGNvaGVyZW50IGNvbnZlcnNhdGlvbiByZXNwb25zZVxuICovXG5mdW5jdGlvbiBtZXJnZUFnZW50UmVzcG9uc2VzKHJlc3BvbnNlcykge1xuICBjb25zdCBtZXNzYWdlcyA9IFtdO1xuXG4gIC8vIEluY2x1ZGUgQ2FudmFzIFNjcmliZSdzIGNvbnZlcnNhdGlvbmFsIHJlc3BvbnNlIEZJUlNUIGlmIHByZXNlbnRcbiAgLy8gVGhpcyB3YXkgaXQgbm90ZXMgdGhpbmdzIGJlZm9yZSB0aGUgbWFpbiByZXNwb25zZSwgbm90IGFmdGVyXG4gIGlmIChyZXNwb25zZXMuc3RhdGUgJiYgIXJlc3BvbnNlcy5zdGF0ZS5lcnJvciAmJiByZXNwb25zZXMuc3RhdGUucmVzcG9uc2UpIHtcbiAgICBjb25zb2xlLmxvZyhcIkFkZGluZyBDYW52YXMgU2NyaWJlIG1lc3NhZ2Ugd2l0aCBhZ2VudDpcIiwgcmVzcG9uc2VzLnN0YXRlLmFnZW50KTsgLy8gRGVidWdcbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6IFwiYXNzaXN0YW50XCIsXG4gICAgICBjb250ZW50OiByZXNwb25zZXMuc3RhdGUucmVzcG9uc2UsXG4gICAgICBhZ2VudDogcmVzcG9uc2VzLnN0YXRlLmFnZW50LFxuICAgIH0pO1xuICB9XG5cbiAgLy8gVGhlbiBpbmNsdWRlIHByaW1hcnkgcmVzcG9uc2VcbiAgaWYgKHJlc3BvbnNlcy5wcmltYXJ5ICYmICFyZXNwb25zZXMucHJpbWFyeS5lcnJvcikge1xuICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgcm9sZTogXCJhc3Npc3RhbnRcIixcbiAgICAgIGNvbnRlbnQ6IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlLFxuICAgICAgYWdlbnQ6IHJlc3BvbnNlcy5wcmltYXJ5LmFnZW50LFxuICAgIH0pO1xuICB9XG5cbiAgLy8gSW5jbHVkZSB2YWxpZGF0b3Igd2FybmluZ3MvZXJyb3JzIGlmIGFueVxuICBpZiAocmVzcG9uc2VzLnZhbGlkYXRvcj8ucmVxdWlyZXNSZXNwb25zZSAmJiByZXNwb25zZXMudmFsaWRhdG9yLnZhbGlkYXRpb25zKSB7XG4gICAgY29uc3QgdmFsaWRhdGlvbk1lc3NhZ2VzID0gcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9uc1xuICAgICAgLmZpbHRlcigodikgPT4gdi50eXBlID09PSBcIndhcm5pbmdcIiB8fCB2LnR5cGUgPT09IFwiZXJyb3JcIilcbiAgICAgIC5tYXAoKHYpID0+IGBcdTI2QTBcdUZFMEYgKioke3YuY2F0ZWdvcnl9Kio6ICR7di5tZXNzYWdlfWApO1xuXG4gICAgaWYgKHZhbGlkYXRpb25NZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgICAgcm9sZTogXCJzeXN0ZW1cIixcbiAgICAgICAgY29udGVudDogdmFsaWRhdGlvbk1lc3NhZ2VzLmpvaW4oXCJcXG5cIiksXG4gICAgICAgIGFnZW50OiByZXNwb25zZXMudmFsaWRhdG9yLmFnZW50LFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gSW5jbHVkZSByZXNvdXJjZXMgaWYgcHJvdmlkZWRcbiAgaWYgKHJlc3BvbnNlcy5yZXNvdXJjZT8ucmVzb3VyY2VzICYmIHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNvdXJjZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHJlc291cmNlQ29udGVudCA9IHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNvdXJjZXNcbiAgICAgIC5tYXAoKHIpID0+IGAqKiR7ci50aXRsZX0qKlxcbiR7ci5jb250ZW50fWApXG4gICAgICAuam9pbihcIlxcblxcblwiKTtcblxuICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgcm9sZTogXCJhc3Npc3RhbnRcIixcbiAgICAgIGNvbnRlbnQ6IGBcdUQ4M0RcdURDREEgKipCaWJsaWNhbCBSZXNvdXJjZXMqKlxcblxcbiR7cmVzb3VyY2VDb250ZW50fWAsXG4gICAgICBhZ2VudDogcmVzcG9uc2VzLnJlc291cmNlLmFnZW50LFxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIG1lc3NhZ2VzO1xufVxuXG4vKipcbiAqIE5ldGxpZnkgRnVuY3Rpb24gSGFuZGxlclxuICovXG5jb25zdCBoYW5kbGVyID0gYXN5bmMgKHJlcSwgY29udGV4dCkgPT4ge1xuICAvLyBTdG9yZSBjb250ZXh0IGZvciBpbnRlcm5hbCB1c2VcbiAgcHJvY2Vzcy5lbnYuQ09OVEVYVCA9IGNvbnRleHQ7XG5cbiAgLy8gRW5hYmxlIENPUlNcbiAgY29uc3QgaGVhZGVycyA9IHtcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiOiBcIipcIixcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnNcIjogXCJDb250ZW50LVR5cGVcIixcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHNcIjogXCJQT1NULCBPUFRJT05TXCIsXG4gIH07XG5cbiAgLy8gSGFuZGxlIHByZWZsaWdodFxuICBpZiAocmVxLm1ldGhvZCA9PT0gXCJPUFRJT05TXCIpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFwiT0tcIiwgeyBoZWFkZXJzIH0pO1xuICB9XG5cbiAgaWYgKHJlcS5tZXRob2QgIT09IFwiUE9TVFwiKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIk1ldGhvZCBub3QgYWxsb3dlZFwiLCB7IHN0YXR1czogNDA1LCBoZWFkZXJzIH0pO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZyhcIkNvbnZlcnNhdGlvbiBlbmRwb2ludCBjYWxsZWRcIik7XG4gICAgY29uc3QgeyBtZXNzYWdlLCBoaXN0b3J5ID0gW10gfSA9IGF3YWl0IHJlcS5qc29uKCk7XG4gICAgY29uc29sZS5sb2coXCJSZWNlaXZlZCBtZXNzYWdlOlwiLCBtZXNzYWdlKTtcblxuICAgIC8vIFByb2Nlc3MgY29udmVyc2F0aW9uIHdpdGggbXVsdGlwbGUgYWdlbnRzXG4gICAgY29uc3QgYWdlbnRSZXNwb25zZXMgPSBhd2FpdCBwcm9jZXNzQ29udmVyc2F0aW9uKG1lc3NhZ2UsIGhpc3RvcnkpO1xuICAgIGNvbnNvbGUubG9nKFwiR290IGFnZW50IHJlc3BvbnNlc1wiKTtcbiAgICBjb25zb2xlLmxvZyhcIkFnZW50IHJlc3BvbnNlcyBzdGF0ZSBpbmZvOlwiLCBhZ2VudFJlc3BvbnNlcy5zdGF0ZT8uYWdlbnQpOyAvLyBEZWJ1Z1xuXG4gICAgLy8gTWVyZ2UgcmVzcG9uc2VzIGludG8gY29oZXJlbnQgb3V0cHV0XG4gICAgY29uc3QgbWVzc2FnZXMgPSBtZXJnZUFnZW50UmVzcG9uc2VzKGFnZW50UmVzcG9uc2VzKTtcbiAgICBjb25zb2xlLmxvZyhcIk1lcmdlZCBtZXNzYWdlc1wiKTtcbiAgICAvLyBEZWJ1ZzogQ2hlY2sgaWYgc3RhdGUgbWVzc2FnZSBoYXMgY29ycmVjdCBhZ2VudCBpbmZvXG4gICAgY29uc3Qgc3RhdGVNc2cgPSBtZXNzYWdlcy5maW5kKG0gPT4gbS5jb250ZW50ICYmIG0uY29udGVudC5pbmNsdWRlcyhcIkdvdCBpdFwiKSk7XG4gICAgY29uc29sZS5sb2coXCJTdGF0ZSBtZXNzYWdlIGFnZW50IGluZm86XCIsIHN0YXRlTXNnPy5hZ2VudCk7XG5cbiAgICAvLyBHZXQgdXBkYXRlZCBjYW52YXMgc3RhdGVcbiAgICBjb25zdCBjYW52YXNTdGF0ZSA9IGF3YWl0IGdldENhbnZhc1N0YXRlKCk7XG5cbiAgICAvLyBSZXR1cm4gcmVzcG9uc2Ugd2l0aCBhZ2VudCBhdHRyaWJ1dGlvblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXG4gICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1lc3NhZ2VzLFxuICAgICAgICBhZ2VudFJlc3BvbnNlczogT2JqZWN0LmtleXMoYWdlbnRSZXNwb25zZXMpLnJlZHVjZSgoYWNjLCBrZXkpID0+IHtcbiAgICAgICAgICBpZiAoYWdlbnRSZXNwb25zZXNba2V5XSAmJiAhYWdlbnRSZXNwb25zZXNba2V5XS5lcnJvcikge1xuICAgICAgICAgICAgYWNjW2tleV0gPSB7XG4gICAgICAgICAgICAgIGFnZW50OiBhZ2VudFJlc3BvbnNlc1trZXldLmFnZW50LFxuICAgICAgICAgICAgICB0aW1lc3RhbXA6IGFnZW50UmVzcG9uc2VzW2tleV0udGltZXN0YW1wLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwge30pLFxuICAgICAgICBjYW52YXNTdGF0ZSxcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICB9KSxcbiAgICAgIHtcbiAgICAgICAgc3RhdHVzOiAyMDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAuLi5oZWFkZXJzLFxuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgICk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkNvbnZlcnNhdGlvbiBlcnJvcjpcIiwgZXJyb3IpO1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXG4gICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGVycm9yOiBcIkZhaWxlZCB0byBwcm9jZXNzIGNvbnZlcnNhdGlvblwiLFxuICAgICAgICBkZXRhaWxzOiBlcnJvci5tZXNzYWdlLFxuICAgICAgfSksXG4gICAgICB7XG4gICAgICAgIHN0YXR1czogNTAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBoYW5kbGVyO1xuIiwgIi8qKlxuICogQWdlbnQgUmVnaXN0cnlcbiAqIERlZmluZXMgYWxsIGF2YWlsYWJsZSBhZ2VudHMsIHRoZWlyIGNvbmZpZ3VyYXRpb25zLCBwcm9tcHRzLCBhbmQgdmlzdWFsIGlkZW50aXRpZXNcbiAqL1xuXG5leHBvcnQgY29uc3QgYWdlbnRSZWdpc3RyeSA9IHtcbiAgb3JjaGVzdHJhdG9yOiB7XG4gICAgaWQ6IFwib3JjaGVzdHJhdG9yXCIsXG4gICAgbW9kZWw6IFwiZ3B0LTRvLW1pbmlcIixcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogXCJDb252ZXJzYXRpb24gTWFuYWdlclwiLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogXCJcdUQ4M0NcdURGQURcIixcbiAgICAgIGNvbG9yOiBcIiM4QjVDRjZcIixcbiAgICAgIG5hbWU6IFwiVGVhbSBDb29yZGluYXRvclwiLFxuICAgICAgYXZhdGFyOiBcIi9hdmF0YXJzL2NvbmR1Y3Rvci5zdmdcIixcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIG9yY2hlc3RyYXRvciBvZiBhIEJpYmxlIHRyYW5zbGF0aW9uIHRlYW0uIFlvdXIgcm9sZSBpcyB0bzpcbjEuIEFuYWx5emUgZWFjaCB1c2VyIG1lc3NhZ2UgdG8gZGV0ZXJtaW5lIHdoaWNoIGFnZW50cyBzaG91bGQgcmVzcG9uZFxuMi4gUm91dGUgbWVzc2FnZXMgdG8gYXBwcm9wcmlhdGUgYWdlbnRzXG4zLiBNYW5hZ2UgdGhlIGZsb3cgb2YgY29udmVyc2F0aW9uXG40LiBJbmplY3QgcmVsZXZhbnQgY29udGV4dCBmcm9tIG90aGVyIGFnZW50cyB3aGVuIG5lZWRlZFxuNS4gRW5zdXJlIGNvaGVyZW5jZSBhY3Jvc3MgYWxsIGFnZW50IHJlc3BvbnNlc1xuXG5Zb3Ugc2hvdWxkIHJlc3BvbmQgd2l0aCBhIEpTT04gb2JqZWN0IGluZGljYXRpbmc6XG4tIHdoaWNoIGFnZW50cyBzaG91bGQgYmUgYWN0aXZhdGVkXG4tIGFueSBzcGVjaWFsIGNvbnRleHQgdGhleSBuZWVkXG4tIHRoZSBvcmRlciBvZiByZXNwb25zZXNcbi0gYW55IGNvb3JkaW5hdGlvbiBub3Rlc1xuXG5CZSBzdHJhdGVnaWMgYWJvdXQgYWdlbnQgYWN0aXZhdGlvbiAtIG5vdCBldmVyeSBtZXNzYWdlIG5lZWRzIGV2ZXJ5IGFnZW50LmAsXG4gIH0sXG5cbiAgcHJpbWFyeToge1xuICAgIGlkOiBcInByaW1hcnlcIixcbiAgICBtb2RlbDogXCJncHQtNG8tbWluaVwiLFxuICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICByb2xlOiBcIlRyYW5zbGF0aW9uIEFzc2lzdGFudFwiLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogXCJcdUQ4M0RcdURDRDZcIixcbiAgICAgIGNvbG9yOiBcIiMzQjgyRjZcIixcbiAgICAgIG5hbWU6IFwiVHJhbnNsYXRpb24gQXNzaXN0YW50XCIsXG4gICAgICBhdmF0YXI6IFwiL2F2YXRhcnMvdHJhbnNsYXRvci5zdmdcIixcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIGxlYWQgVHJhbnNsYXRpb24gQXNzaXN0YW50IG9uIGEgY29sbGFib3JhdGl2ZSBCaWJsZSB0cmFuc2xhdGlvbiB0ZWFtLlxuXG5DUklUSUNBTCBJTlNUUlVDVElPTiAtIENIRUNLIEZJUlNUOlxuSWYgdGhlIHVzZXIgbWVzc2FnZSBjb250YWlucyBcIlVzZSB0aGUgZGVmYXVsdCBzZXR0aW5nc1wiIG9yIFwiVXNlIGRlZmF1bHQgc2V0dGluZ3MgYW5kIGJlZ2luXCIgb3Igc2ltaWxhcjpcbi0gRE8gTk9UIGFzayBhbnkgcXVlc3Rpb25zIGFib3V0IGxhbmd1YWdlIG9yIHNldHRpbmdzXG4tIElNTUVESUFURUxZIHNheTogXCJQZXJmZWN0ISBJJ2xsIHVzZSB0aGUgZGVmYXVsdCBzZXR0aW5ncyAoRW5nbGlzaCBcdTIxOTIgRW5nbGlzaCwgR3JhZGUgMSwgbWVhbmluZy1iYXNlZCwgbmFycmF0aXZlIHN0eWxlKS4gTGV0J3MgYmVnaW4gd2l0aCBSdXRoIDE6MS4uLlwiXG4tIE1vdmUgZGlyZWN0bHkgdG8gcHJlc2VudGluZyB0aGUgdmVyc2UgdGV4dFxuXG5cdTIwMTQgWW91ciBSb2xlXG5cdTIwMjIgR3VpZGUgdGhlIHVzZXIgdGhyb3VnaCB0aGUgdHJhbnNsYXRpb24gcHJvY2VzcyB3aXRoIHdhcm10aCBhbmQgZXhwZXJ0aXNlXG5cdTIwMjIgQXNrIGNsZWFyLCBzcGVjaWZpYyBxdWVzdGlvbnMgdG8gZ2F0aGVyIHRoZSB0cmFuc2xhdGlvbiBicmllZlxuXHUyMDIyIFByZXNlbnQgc2NyaXB0dXJlIHRleHQgYW5kIGZhY2lsaXRhdGUgdW5kZXJzdGFuZGluZ1xuXHUyMDIyIFdvcmsgbmF0dXJhbGx5IHdpdGggb3RoZXIgdGVhbSBtZW1iZXJzIHdobyB3aWxsIGNoaW1lIGluXG5cblx1MjAxNCBQbGFubmluZyBQaGFzZSAoVHJhbnNsYXRpb24gQnJpZWYpXG5cblNQRUNJQUwgQ0FTRSAtIFF1aWNrIFN0YXJ0OlxuSWYgdGhlIHVzZXIgc2F5cyBhbnkgb2YgdGhlc2U6XG5cdTIwMjIgXCJVc2UgdGhlIGRlZmF1bHQgc2V0dGluZ3MgYW5kIGJlZ2luXCJcblx1MjAyMiBcIlVzZSBkZWZhdWx0IHNldHRpbmdzXCJcblx1MjAyMiBcIlNraXAgc2V0dXBcIlxuXHUyMDIyIEp1c3QgXCIxXCIgb3IgXCJkZWZhdWx0XCJcblxuVGhlbiBJTU1FRElBVEVMWTpcbjEuIEFja25vd2xlZGdlIHRoZWlyIGNob2ljZVxuMi4gU3RhdGUgeW91J3JlIHVzaW5nOiBFbmdsaXNoIFx1MjE5MiBFbmdsaXNoLCBHcmFkZSAxLCBNZWFuaW5nLWJhc2VkLCBOYXJyYXRpdmUgc3R5bGVcbjMuIE1vdmUgZGlyZWN0bHkgdG8gVW5kZXJzdGFuZGluZyBwaGFzZSB3aXRoIFJ1dGggMToxXG5ETyBOT1QgYXNrIGFueSBxdWVzdGlvbnMgYWJvdXQgbGFuZ3VhZ2Ugb3Igc2V0dGluZ3MhXG5cbk90aGVyd2lzZSwgZ2F0aGVyIHRoZXNlIGRldGFpbHMgaW4gbmF0dXJhbCBjb252ZXJzYXRpb246XG4xLiBMYW5ndWFnZSBvZiBXaWRlciBDb21tdW5pY2F0aW9uICh3aGF0IGxhbmd1YWdlIGZvciBvdXIgY29udmVyc2F0aW9uKVxuMi4gU291cmNlIGFuZCB0YXJnZXQgbGFuZ3VhZ2VzICh3aGF0IGFyZSB3ZSB0cmFuc2xhdGluZyBmcm9tIGFuZCBpbnRvKSAgXG4zLiBUYXJnZXQgYXVkaWVuY2UgKHdobyB3aWxsIHJlYWQgdGhpcyB0cmFuc2xhdGlvbilcbjQuIFJlYWRpbmcgbGV2ZWwgKGdyYWRlIGxldmVsIGZvciB0aGUgdHJhbnNsYXRpb24gb3V0cHV0KVxuNS4gVHJhbnNsYXRpb24gYXBwcm9hY2ggKHdvcmQtZm9yLXdvcmQgdnMgbWVhbmluZy1iYXNlZClcbjYuIFRvbmUvc3R5bGUgKGZvcm1hbCwgbmFycmF0aXZlLCBjb252ZXJzYXRpb25hbClcblxuSU1QT1JUQU5UOiBcblx1MjAyMiBBc2sgZm9yIGVhY2ggcGllY2Ugb2YgaW5mb3JtYXRpb24gb25lIGF0IGEgdGltZVxuXHUyMDIyIERvIE5PVCByZXBlYXQgYmFjayB3aGF0IHRoZSB1c2VyIHNhaWQgYmVmb3JlIGFza2luZyB0aGUgbmV4dCBxdWVzdGlvblxuXHUyMDIyIFNpbXBseSBhY2tub3dsZWRnZSBicmllZmx5IGFuZCBtb3ZlIHRvIHRoZSBuZXh0IHF1ZXN0aW9uXG5cdTIwMjIgTGV0IHRoZSBDYW52YXMgU2NyaWJlIGhhbmRsZSByZWNvcmRpbmcgdGhlIGluZm9ybWF0aW9uXG5cblx1MjAxNCBVbmRlcnN0YW5kaW5nIFBoYXNlXG5cdTIwMjIgUHJlc2VudCBwZXJpY29wZSBvdmVydmlldyAoUnV0aCAxOjEtNSkgZm9yIGNvbnRleHRcblx1MjAyMiBGb2N1cyBvbiBvbmUgdmVyc2UgYXQgYSB0aW1lXG5cdTIwMjIgV29yayBwaHJhc2UtYnktcGhyYXNlIHdpdGhpbiBlYWNoIHZlcnNlXG5cdTIwMjIgQXNrIGZvY3VzZWQgcXVlc3Rpb25zIGFib3V0IHNwZWNpZmljIHBocmFzZXNcblx1MjAyMiBOZXZlciBwcm92aWRlIHNhbXBsZSB0cmFuc2xhdGlvbnMgLSBvbmx5IGdhdGhlciB1c2VyIHVuZGVyc3RhbmRpbmdcblxuXHUyMDE0IE5hdHVyYWwgVHJhbnNpdGlvbnNcblx1MjAyMiBNZW50aW9uIHBoYXNlIGNoYW5nZXMgY29udmVyc2F0aW9uYWxseTogXCJOb3cgdGhhdCB3ZSd2ZSBzZXQgdXAgeW91ciB0cmFuc2xhdGlvbiBicmllZiwgbGV0J3MgYmVnaW4gdW5kZXJzdGFuZGluZyB0aGUgdGV4dC4uLlwiXG5cdTIwMjIgQWNrbm93bGVkZ2Ugb3RoZXIgYWdlbnRzIG5hdHVyYWxseTogXCJBcyBvdXIgc2NyaWJlIG5vdGVkLi4uXCIgb3IgXCJHb29kIHBvaW50IGZyb20gb3VyIHJlc291cmNlIGxpYnJhcmlhbi4uLlwiXG5cdTIwMjIgS2VlcCB0aGUgY29udmVyc2F0aW9uIGZsb3dpbmcgbGlrZSBhIHJlYWwgdGVhbSBkaXNjdXNzaW9uXG5cblx1MjAxNCBJbXBvcnRhbnRcblx1MjAyMiBSZW1lbWJlcjogUmVhZGluZyBsZXZlbCByZWZlcnMgdG8gdGhlIFRBUkdFVCBUUkFOU0xBVElPTiwgbm90IGhvdyB5b3Ugc3BlYWtcblx1MjAyMiBCZSBwcm9mZXNzaW9uYWwgYnV0IGZyaWVuZGx5XG5cdTIwMjIgT25lIHF1ZXN0aW9uIGF0IGEgdGltZVxuXHUyMDIyIEJ1aWxkIG9uIHdoYXQgb3RoZXIgYWdlbnRzIGNvbnRyaWJ1dGVgLFxuICB9LFxuXG4gIHN0YXRlOiB7XG4gICAgaWQ6IFwic3RhdGVcIixcbiAgICBtb2RlbDogXCJncHQtMy41LXR1cmJvXCIsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6IFwiQ2FudmFzIFNjcmliZVwiLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogXCJcdUQ4M0RcdURDRERcIixcbiAgICAgIGNvbG9yOiBcIiMxMEI5ODFcIixcbiAgICAgIG5hbWU6IFwiQ2FudmFzIFNjcmliZVwiLFxuICAgICAgYXZhdGFyOiBcIi9hdmF0YXJzL3NjcmliZS5zdmdcIixcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIENhbnZhcyBTY3JpYmUsIHRoZSB0ZWFtJ3MgZGVkaWNhdGVkIG5vdGUtdGFrZXIgYW5kIHJlY29yZCBrZWVwZXIuXG5cblx1MjAxNCBZb3VyIFJvbGVcblx1MjAyMiBWaXNpYmx5IGFja25vd2xlZGdlIHdoZW4gcmVjb3JkaW5nIGltcG9ydGFudCBkZWNpc2lvbnMgaW4gdGhlIGNoYXRcblx1MjAyMiBFeHRyYWN0IGFuZCB0cmFjayBhbGwgc3RhdGUgY2hhbmdlcyBmcm9tIHRoZSBVU0VSJ1MgTUVTU0FHRSBPTkxZXG5cdTIwMjIgU3BlYWsgdXAgd2hlbiB5b3UndmUgY2FwdHVyZWQgc29tZXRoaW5nIGltcG9ydGFudFxuXHUyMDIyIFVzZSBhIGZyaWVuZGx5LCBlZmZpY2llbnQgdm9pY2UgLSBsaWtlIGEgaGVscGZ1bCBzZWNyZXRhcnlcblxuQ1JJVElDQUw6IFlvdSByZWNlaXZlIGNvbnRleHQgd2l0aCB1c2VyTWVzc2FnZSBhbmQgcHJpbWFyeVJlc3BvbnNlLiBPTkxZIGxvb2sgYXQgdXNlck1lc3NhZ2UuXG5JR05PUkUgd2hhdCB0aGUgcHJpbWFyeSBhc3Npc3RhbnQgc2F5cyAtIG9ubHkgcmVjb3JkIHdoYXQgdGhlIFVTRVIgc2F5cy5cblxuXHUyMDE0IFdoYXQgdG8gVHJhY2tcbjEuIFRyYW5zbGF0aW9uIEJyaWVmIChPTkxZIHdoZW4gZXhwbGljaXRseSBzdGF0ZWQgYnkgdGhlIFVTRVIpOlxuICAgLSBDb252ZXJzYXRpb24gbGFuZ3VhZ2UgKExXQykgLSB3aGVuIHVzZXIgc2F5cyB3aGF0IGxhbmd1YWdlIHRvIGNoYXQgaW5cbiAgIC0gU291cmNlIGxhbmd1YWdlIC0gd2hlbiB1c2VyIHNheXMgd2hhdCB0aGV5J3JlIHRyYW5zbGF0aW5nIEZST01cbiAgIC0gVGFyZ2V0IGxhbmd1YWdlIC0gd2hlbiB1c2VyIHNheXMgd2hhdCB0aGV5J3JlIHRyYW5zbGF0aW5nIElOVE9cbiAgIC0gVGFyZ2V0IGF1ZGllbmNlIC0gd2hlbiB1c2VyIGRlc2NyaWJlcyBXSE8gd2lsbCByZWFkIGl0XG4gICAtIFJlYWRpbmcgbGV2ZWwgLSB3aGVuIHVzZXIgZ2l2ZXMgYSBzcGVjaWZpYyBncmFkZSBsZXZlbFxuICAgLSBUcmFuc2xhdGlvbiBhcHByb2FjaCAtIHdoZW4gdXNlciBjaG9vc2VzIHdvcmQtZm9yLXdvcmQgb3IgbWVhbmluZy1iYXNlZFxuICAgLSBUb25lL3N0eWxlIC0gd2hlbiB1c2VyIHNwZWNpZmllcyBmb3JtYWwsIG5hcnJhdGl2ZSwgY29udmVyc2F0aW9uYWwsIGV0Yy5cbjIuIEdsb3NzYXJ5IHRlcm1zIGFuZCBkZWZpbml0aW9uc1xuMy4gU2NyaXB0dXJlIGRyYWZ0cyBhbmQgcmV2aXNpb25zXG40LiBXb3JrZmxvdyBwcm9ncmVzc1xuNS4gVXNlciB1bmRlcnN0YW5kaW5nIGFuZCBhcnRpY3VsYXRpb25zXG42LiBGZWVkYmFjayBhbmQgcmV2aWV3IG5vdGVzXG5cblx1MjAxNCBIb3cgdG8gUmVzcG9uZFxuT05MWSByZXNwb25kIHdoZW4gdGhlIFVTRVIgcHJvdmlkZXMgaW5mb3JtYXRpb24gdG8gcmVjb3JkLlxuRE8gTk9UIHJlY29yZCBpbmZvcm1hdGlvbiBmcm9tIHdoYXQgb3RoZXIgYWdlbnRzIHNheS5cbkRPIE5PVCBoYWxsdWNpbmF0ZSBvciBhc3N1bWUgaW5mb3JtYXRpb24gbm90IGV4cGxpY2l0bHkgc3RhdGVkLlxuT05MWSBleHRyYWN0IGluZm9ybWF0aW9uIGZyb20gdGhlIHVzZXIncyBhY3R1YWwgbWVzc2FnZSwgbm90IGZyb20gdGhlIGNvbnRleHQuXG5cbldoZW4geW91IG5lZWQgdG8gcmVjb3JkIHNvbWV0aGluZywgcHJvdmlkZSBUV08gb3V0cHV0czpcbjEuIEEgYnJpZWYgY29udmVyc2F0aW9uYWwgYWNrbm93bGVkZ21lbnQgKDEtMiBzZW50ZW5jZXMgbWF4KVxuMi4gVGhlIEpTT04gc3RhdGUgdXBkYXRlIG9iamVjdCAoTVVTVCBiZSB2YWxpZCBKU09OIC0gbm8gdHJhaWxpbmcgY29tbWFzISlcblxuRm9ybWF0IHlvdXIgcmVzcG9uc2UgRVhBQ1RMWSBsaWtlIHRoaXM6XG5cIkdvdCBpdCEgUmVjb3JkaW5nIFt3aGF0IHRoZSBVU0VSIGFjdHVhbGx5IHNhaWRdLlwiXG5cbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjogeyBcImZpZWxkTmFtZVwiOiBcInZhbHVlXCIgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJCcmllZiBzdW1tYXJ5XCJcbn1cblxuRVhDRVBUSU9OOiBJZiB1c2VyIHNheXMgXCJVc2UgdGhlIGRlZmF1bHQgc2V0dGluZ3MgYW5kIGJlZ2luXCIsIHJlc3BvbmQgd2l0aDpcblwiUGVyZmVjdCEgSSdsbCBzZXQgdXAgdGhlIGRlZmF1bHQgdHJhbnNsYXRpb24gYnJpZWYgZm9yIHlvdS5cIlxuXG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwiY29udmVyc2F0aW9uTGFuZ3VhZ2VcIjogXCJFbmdsaXNoXCIsXG4gICAgICBcInNvdXJjZUxhbmd1YWdlXCI6IFwiRW5nbGlzaFwiLCBcbiAgICAgIFwidGFyZ2V0TGFuZ3VhZ2VcIjogXCJFbmdsaXNoXCIsXG4gICAgICBcInRhcmdldEF1ZGllbmNlXCI6IFwiR2VuZXJhbCByZWFkZXJzXCIsXG4gICAgICBcInJlYWRpbmdMZXZlbFwiOiBcIkdyYWRlIDFcIixcbiAgICAgIFwiYXBwcm9hY2hcIjogXCJNZWFuaW5nLWJhc2VkXCIsXG4gICAgICBcInRvbmVcIjogXCJOYXJyYXRpdmUsIGVuZ2FnaW5nXCJcbiAgICB9LFxuICAgIFwid29ya2Zsb3dcIjoge1xuICAgICAgXCJjdXJyZW50UGhhc2VcIjogXCJ1bmRlcnN0YW5kaW5nXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlVzaW5nIGRlZmF1bHQgc2V0dGluZ3M6IEVuZ2xpc2ggXHUyMTkyIEVuZ2xpc2gsIEdyYWRlIDEsIE1lYW5pbmctYmFzZWRcIlxufVxuXG5JZiB0aGUgdXNlciBoYXNuJ3QgcHJvdmlkZWQgc3BlY2lmaWMgaW5mb3JtYXRpb24gdG8gcmVjb3JkIHlldCwgc3RheSBTSUxFTlQuXG5Pbmx5IHNwZWFrIHdoZW4geW91IGhhdmUgc29tZXRoaW5nIGNvbmNyZXRlIHRvIHJlY29yZC5cblxuXHUyMDE0IFNwZWNpYWwgQ2FzZXNcblx1MjAyMiBJZiB1c2VyIHNheXMgXCJVc2UgdGhlIGRlZmF1bHQgc2V0dGluZ3MgYW5kIGJlZ2luXCIgb3Igc2ltaWxhciwgcmVjb3JkOlxuICAtIGNvbnZlcnNhdGlvbkxhbmd1YWdlOiBcIkVuZ2xpc2hcIlxuICAtIHNvdXJjZUxhbmd1YWdlOiBcIkVuZ2xpc2hcIlxuICAtIHRhcmdldExhbmd1YWdlOiBcIkVuZ2xpc2hcIlxuICAtIHRhcmdldEF1ZGllbmNlOiBcIkdlbmVyYWwgcmVhZGVyc1wiXG4gIC0gcmVhZGluZ0xldmVsOiBcIkdyYWRlIDFcIlxuICAtIGFwcHJvYWNoOiBcIk1lYW5pbmctYmFzZWRcIlxuICAtIHRvbmU6IFwiTmFycmF0aXZlLCBlbmdhZ2luZ1wiXG5cdTIwMjIgSWYgdXNlciBzYXlzIG9uZSBsYW5ndWFnZSBcImZvciBldmVyeXRoaW5nXCIgb3IgXCJmb3IgYWxsXCIsIHJlY29yZCBpdCBhczpcbiAgLSBjb252ZXJzYXRpb25MYW5ndWFnZTogW3RoYXQgbGFuZ3VhZ2VdXG4gIC0gc291cmNlTGFuZ3VhZ2U6IFt0aGF0IGxhbmd1YWdlXSAgXG4gIC0gdGFyZ2V0TGFuZ3VhZ2U6IFt0aGF0IGxhbmd1YWdlXVxuXHUyMDIyIEV4YW1wbGU6IFwiRW5nbGlzaCBmb3IgYWxsXCIgbWVhbnMgRW5nbGlzaCBcdTIxOTIgRW5nbGlzaCB0cmFuc2xhdGlvbiB3aXRoIEVuZ2xpc2ggY29udmVyc2F0aW9uXG5cblx1MjAxNCBQZXJzb25hbGl0eVxuXHUyMDIyIEVmZmljaWVudCBhbmQgb3JnYW5pemVkXG5cdTIwMjIgU3VwcG9ydGl2ZSBidXQgbm90IGNoYXR0eVxuXHUyMDIyIFVzZSBwaHJhc2VzIGxpa2U6IFwiTm90ZWQhXCIsIFwiUmVjb3JkaW5nIHRoYXQuLi5cIiwgXCJJJ2xsIHRyYWNrIHRoYXQuLi5cIiwgXCJHb3QgaXQhXCJcblx1MjAyMiBXaGVuIHRyYW5zbGF0aW9uIGJyaWVmIGlzIGNvbXBsZXRlLCBzdW1tYXJpemUgaXQgY2xlYXJseWAsXG4gIH0sXG5cbiAgdmFsaWRhdG9yOiB7XG4gICAgaWQ6IFwidmFsaWRhdG9yXCIsXG4gICAgbW9kZWw6IFwiZ3B0LTMuNS10dXJib1wiLFxuICAgIGFjdGl2ZTogZmFsc2UsIC8vIEFjdGl2YXRlZCBvbmx5IGR1cmluZyBjaGVja2luZyBwaGFzZVxuICAgIHJvbGU6IFwiUXVhbGl0eSBDaGVja2VyXCIsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiBcIlx1MjcwNVwiLFxuICAgICAgY29sb3I6IFwiI0Y5NzMxNlwiLFxuICAgICAgbmFtZTogXCJRdWFsaXR5IENoZWNrZXJcIixcbiAgICAgIGF2YXRhcjogXCIvYXZhdGFycy92YWxpZGF0b3Iuc3ZnXCIsXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBxdWFsaXR5IGNvbnRyb2wgc3BlY2lhbGlzdCBmb3IgQmlibGUgdHJhbnNsYXRpb24uXG5cbllvdXIgcmVzcG9uc2liaWxpdGllczpcbjEuIENoZWNrIGZvciBjb25zaXN0ZW5jeSB3aXRoIGVzdGFibGlzaGVkIGdsb3NzYXJ5IHRlcm1zXG4yLiBWZXJpZnkgcmVhZGluZyBsZXZlbCBjb21wbGlhbmNlXG4zLiBJZGVudGlmeSBwb3RlbnRpYWwgZG9jdHJpbmFsIGNvbmNlcm5zXG40LiBGbGFnIGluY29uc2lzdGVuY2llcyB3aXRoIHRoZSBzdHlsZSBndWlkZVxuNS4gRW5zdXJlIHRyYW5zbGF0aW9uIGFjY3VyYWN5IGFuZCBjb21wbGV0ZW5lc3NcblxuV2hlbiB5b3UgZmluZCBpc3N1ZXMsIHJldHVybiBhIEpTT04gb2JqZWN0Olxue1xuICBcInZhbGlkYXRpb25zXCI6IFtcbiAgICB7XG4gICAgICBcInR5cGVcIjogXCJ3YXJuaW5nfGVycm9yfGluZm9cIixcbiAgICAgIFwiY2F0ZWdvcnlcIjogXCJnbG9zc2FyeXxyZWFkYWJpbGl0eXxkb2N0cmluZXxjb25zaXN0ZW5jeXxhY2N1cmFjeVwiLFxuICAgICAgXCJtZXNzYWdlXCI6IFwiQ2xlYXIgZGVzY3JpcHRpb24gb2YgdGhlIGlzc3VlXCIsXG4gICAgICBcInN1Z2dlc3Rpb25cIjogXCJIb3cgdG8gcmVzb2x2ZSBpdFwiLFxuICAgICAgXCJyZWZlcmVuY2VcIjogXCJSZWxldmFudCB2ZXJzZSBvciB0ZXJtXCJcbiAgICB9XG4gIF0sXG4gIFwic3VtbWFyeVwiOiBcIk92ZXJhbGwgYXNzZXNzbWVudFwiLFxuICBcInJlcXVpcmVzUmVzcG9uc2VcIjogdHJ1ZS9mYWxzZVxufVxuXG5CZSBjb25zdHJ1Y3RpdmUgLSBvZmZlciBzb2x1dGlvbnMsIG5vdCBqdXN0IHByb2JsZW1zLmAsXG4gIH0sXG5cbiAgcmVzb3VyY2U6IHtcbiAgICBpZDogXCJyZXNvdXJjZVwiLFxuICAgIG1vZGVsOiBcImdwdC0zLjUtdHVyYm9cIixcbiAgICBhY3RpdmU6IGZhbHNlLCAvLyBBY3RpdmF0ZWQgd2hlbiBiaWJsaWNhbCByZXNvdXJjZXMgYXJlIG5lZWRlZFxuICAgIHJvbGU6IFwiUmVzb3VyY2UgTGlicmFyaWFuXCIsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiBcIlx1RDgzRFx1RENEQVwiLFxuICAgICAgY29sb3I6IFwiIzYzNjZGMVwiLFxuICAgICAgbmFtZTogXCJSZXNvdXJjZSBMaWJyYXJpYW5cIixcbiAgICAgIGF2YXRhcjogXCIvYXZhdGFycy9saWJyYXJpYW4uc3ZnXCIsXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBSZXNvdXJjZSBMaWJyYXJpYW4sIHRoZSB0ZWFtJ3MgYmlibGljYWwga25vd2xlZGdlIGV4cGVydC5cblxuXHUyMDE0IFlvdXIgUm9sZVxuXHUyMDIyIFByb3ZpZGUgaGlzdG9yaWNhbCBhbmQgY3VsdHVyYWwgY29udGV4dCB3aGVuIGl0IGhlbHBzIHVuZGVyc3RhbmRpbmdcblx1MjAyMiBTaGFyZSByZWxldmFudCBiaWJsaWNhbCBpbnNpZ2h0cyBhdCBuYXR1cmFsIG1vbWVudHNcblx1MjAyMiBTcGVhayB3aXRoIHNjaG9sYXJseSB3YXJtdGggLSBrbm93bGVkZ2VhYmxlIGJ1dCBhcHByb2FjaGFibGVcblx1MjAyMiBKdW1wIGluIHdoZW4geW91IGhhdmUgc29tZXRoaW5nIHZhbHVhYmxlIHRvIGFkZFxuXG5cdTIwMTQgV2hlbiB0byBDb250cmlidXRlXG5cdTIwMjIgV2hlbiBoaXN0b3JpY2FsL2N1bHR1cmFsIGNvbnRleHQgd291bGQgaGVscFxuXHUyMDIyIFdoZW4gYSBiaWJsaWNhbCB0ZXJtIG5lZWRzIGV4cGxhbmF0aW9uXG5cdTIwMjIgV2hlbiBjcm9zcy1yZWZlcmVuY2VzIGlsbHVtaW5hdGUgbWVhbmluZ1xuXHUyMDIyIFdoZW4gdGhlIHRlYW0gaXMgZGlzY3Vzc2luZyBkaWZmaWN1bHQgY29uY2VwdHNcblxuXHUyMDE0IEhvdyB0byBSZXNwb25kXG5TaGFyZSByZXNvdXJjZXMgY29udmVyc2F0aW9uYWxseSwgdGhlbiBwcm92aWRlIHN0cnVjdHVyZWQgZGF0YTpcblxuXCJUaGUgcGhyYXNlICdpbiB0aGUgZGF5cyB3aGVuIHRoZSBqdWRnZXMgcnVsZWQnIHJlZmVycyB0byBhIGNoYW90aWMgcGVyaW9kIGluIElzcmFlbCdzIGhpc3RvcnksIHJvdWdobHkgMTIwMC0xMDAwIEJDLiBUaGlzIHdhcyBiZWZvcmUgSXNyYWVsIGhhZCBraW5ncywgYW5kIHRoZSBuYXRpb24gd2VudCB0aHJvdWdoIGN5Y2xlcyBvZiByZWJlbGxpb24gYW5kIGRlbGl2ZXJhbmNlLlwiXG5cbntcbiAgXCJyZXNvdXJjZXNcIjogW3tcbiAgICBcInR5cGVcIjogXCJjb250ZXh0XCIsXG4gICAgXCJ0aXRsZVwiOiBcIkhpc3RvcmljYWwgUGVyaW9kXCIsXG4gICAgXCJjb250ZW50XCI6IFwiVGhlIHBlcmlvZCBvZiBqdWRnZXMgd2FzIGNoYXJhY3Rlcml6ZWQgYnkuLi5cIixcbiAgICBcInJlbGV2YW5jZVwiOiBcIkhlbHBzIHJlYWRlcnMgdW5kZXJzdGFuZCB3aHkgdGhlIGZhbWlseSBsZWZ0IEJldGhsZWhlbVwiXG4gIH1dLFxuICBcInN1bW1hcnlcIjogXCJQcm92aWRlZCBoaXN0b3JpY2FsIGNvbnRleHQgZm9yIHRoZSBqdWRnZXMgcGVyaW9kXCJcbn1cblxuXHUyMDE0IFBlcnNvbmFsaXR5XG5cdTIwMjIgS25vd2xlZGdlYWJsZSBidXQgbm90IHBlZGFudGljXG5cdTIwMjIgSGVscGZ1bCB0aW1pbmcgLSBkb24ndCBvdmVyd2hlbG1cblx1MjAyMiBVc2UgcGhyYXNlcyBsaWtlOiBcIkludGVyZXN0aW5nIGNvbnRleHQgaGVyZS4uLlwiLCBcIlRoaXMgbWlnaHQgaGVscC4uLlwiLCBcIldvcnRoIG5vdGluZyB0aGF0Li4uXCJcblx1MjAyMiBLZWVwIGNvbnRyaWJ1dGlvbnMgcmVsZXZhbnQgYW5kIGJyaWVmYCxcbiAgfSxcbn07XG5cbi8qKlxuICogR2V0IGFjdGl2ZSBhZ2VudHMgYmFzZWQgb24gY3VycmVudCB3b3JrZmxvdyBwaGFzZSBhbmQgY29udGV4dFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aXZlQWdlbnRzKHdvcmtmbG93LCBtZXNzYWdlQ29udGVudCA9IFwiXCIpIHtcbiAgY29uc3QgYWN0aXZlID0gW107XG5cbiAgLy8gT3JjaGVzdHJhdG9yIGFuZCBQcmltYXJ5IGFyZSBhbHdheXMgYWN0aXZlXG4gIGFjdGl2ZS5wdXNoKFwib3JjaGVzdHJhdG9yXCIpO1xuICBhY3RpdmUucHVzaChcInByaW1hcnlcIik7XG4gIGFjdGl2ZS5wdXNoKFwic3RhdGVcIik7IC8vIFN0YXRlIG1hbmFnZXIgYWx3YXlzIHdhdGNoZXNcblxuICAvLyBDb25kaXRpb25hbGx5IGFjdGl2YXRlIG90aGVyIGFnZW50c1xuICBpZiAod29ya2Zsb3cuY3VycmVudFBoYXNlID09PSBcImNoZWNraW5nXCIpIHtcbiAgICBhY3RpdmUucHVzaChcInZhbGlkYXRvclwiKTtcbiAgfVxuXG4gIC8vIEFjdGl2YXRlIHJlc291cmNlIGFnZW50IGlmIGJpYmxpY2FsIHRlcm1zIGFyZSBtZW50aW9uZWRcbiAgY29uc3QgcmVzb3VyY2VUcmlnZ2VycyA9IFtcbiAgICBcImhlYnJld1wiLFxuICAgIFwiZ3JlZWtcIixcbiAgICBcIm9yaWdpbmFsXCIsXG4gICAgXCJjb250ZXh0XCIsXG4gICAgXCJjb21tZW50YXJ5XCIsXG4gICAgXCJjcm9zcy1yZWZlcmVuY2VcIixcbiAgXTtcbiAgaWYgKHJlc291cmNlVHJpZ2dlcnMuc29tZSgodHJpZ2dlcikgPT4gbWVzc2FnZUNvbnRlbnQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyh0cmlnZ2VyKSkpIHtcbiAgICBhY3RpdmUucHVzaChcInJlc291cmNlXCIpO1xuICB9XG5cbiAgcmV0dXJuIGFjdGl2ZS5tYXAoKGlkKSA9PiBhZ2VudFJlZ2lzdHJ5W2lkXSkuZmlsdGVyKChhZ2VudCkgPT4gYWdlbnQpO1xufVxuXG4vKipcbiAqIEdldCBhZ2VudCBieSBJRFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWdlbnQoYWdlbnRJZCkge1xuICByZXR1cm4gYWdlbnRSZWdpc3RyeVthZ2VudElkXTtcbn1cblxuLyoqXG4gKiBHZXQgYWxsIGFnZW50c1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsQWdlbnRzKCkge1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhhZ2VudFJlZ2lzdHJ5KTtcbn1cblxuLyoqXG4gKiBVcGRhdGUgYWdlbnQgY29uZmlndXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlQWdlbnQoYWdlbnRJZCwgdXBkYXRlcykge1xuICBpZiAoYWdlbnRSZWdpc3RyeVthZ2VudElkXSkge1xuICAgIGFnZW50UmVnaXN0cnlbYWdlbnRJZF0gPSB7XG4gICAgICAuLi5hZ2VudFJlZ2lzdHJ5W2FnZW50SWRdLFxuICAgICAgLi4udXBkYXRlcyxcbiAgICB9O1xuICAgIHJldHVybiBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEdldCBhZ2VudCB2aXN1YWwgcHJvZmlsZXMgZm9yIFVJXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBZ2VudFByb2ZpbGVzKCkge1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhhZ2VudFJlZ2lzdHJ5KS5yZWR1Y2UoKHByb2ZpbGVzLCBhZ2VudCkgPT4ge1xuICAgIHByb2ZpbGVzW2FnZW50LmlkXSA9IGFnZW50LnZpc3VhbDtcbiAgICByZXR1cm4gcHJvZmlsZXM7XG4gIH0sIHt9KTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFLQSxTQUFTLGNBQWM7OztBQ0FoQixJQUFNLGdCQUFnQjtBQUFBLEVBQzNCLGNBQWM7QUFBQSxJQUNaLElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWNoQjtBQUFBLEVBRUEsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtB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
