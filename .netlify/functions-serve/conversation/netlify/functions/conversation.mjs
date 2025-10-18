
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY29udmVyc2F0aW9uLmpzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL2FnZW50cy9yZWdpc3RyeS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNdWx0aS1BZ2VudCBDb252ZXJzYXRpb24gSGFuZGxlclxuICogT3JjaGVzdHJhdGVzIG11bHRpcGxlIEFJIGFnZW50cyB0byBoYW5kbGUgQmlibGUgdHJhbnNsYXRpb24gY29udmVyc2F0aW9uc1xuICovXG5cbmltcG9ydCB7IE9wZW5BSSB9IGZyb20gXCJvcGVuYWlcIjtcbmltcG9ydCB7IGdldEFjdGl2ZUFnZW50cywgZ2V0QWdlbnQgfSBmcm9tIFwiLi9hZ2VudHMvcmVnaXN0cnkuanNcIjtcblxuY29uc3Qgb3BlbmFpID0gbmV3IE9wZW5BSSh7XG4gIGFwaUtleTogcHJvY2Vzcy5lbnYuT1BFTkFJX0FQSV9LRVksXG59KTtcblxuLyoqXG4gKiBDYWxsIGFuIGluZGl2aWR1YWwgYWdlbnQgd2l0aCBjb250ZXh0XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNhbGxBZ2VudChhZ2VudCwgbWVzc2FnZSwgY29udGV4dCkge1xuICBjb25zb2xlLmxvZyhgQ2FsbGluZyBhZ2VudDogJHthZ2VudC5pZH1gKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBtZXNzYWdlcyA9IFtcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJzeXN0ZW1cIixcbiAgICAgICAgY29udGVudDogYWdlbnQuc3lzdGVtUHJvbXB0LFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICAgIGNvbnRlbnQ6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB1c2VyTWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICBjb250ZXh0OiBjb250ZXh0LFxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICB9KSxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIC8vIEFkZCB0aW1lb3V0IHdyYXBwZXIgZm9yIEFQSSBjYWxsXG4gICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgoXywgcmVqZWN0KSA9PiB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoYFRpbWVvdXQgY2FsbGluZyAke2FnZW50LmlkfWApKSwgMTAwMDApOyAvLyAxMCBzZWNvbmQgdGltZW91dFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvblByb21pc2UgPSBvcGVuYWkuY2hhdC5jb21wbGV0aW9ucy5jcmVhdGUoe1xuICAgICAgbW9kZWw6IGFnZW50Lm1vZGVsLFxuICAgICAgbWVzc2FnZXM6IG1lc3NhZ2VzLFxuICAgICAgdGVtcGVyYXR1cmU6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyAwLjEgOiAwLjcsIC8vIExvd2VyIHRlbXAgZm9yIHN0YXRlIGV4dHJhY3Rpb25cbiAgICAgIG1heF90b2tlbnM6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyA1MDAgOiAyMDAwLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvbiA9IGF3YWl0IFByb21pc2UucmFjZShbY29tcGxldGlvblByb21pc2UsIHRpbWVvdXRQcm9taXNlXSk7XG4gICAgY29uc29sZS5sb2coYEFnZW50ICR7YWdlbnQuaWR9IHJlc3BvbmRlZCBzdWNjZXNzZnVsbHlgKTtcblxuICAgIHJldHVybiB7XG4gICAgICBhZ2VudElkOiBhZ2VudC5pZCxcbiAgICAgIGFnZW50OiBhZ2VudC52aXN1YWwsXG4gICAgICByZXNwb25zZTogY29tcGxldGlvbi5jaG9pY2VzWzBdLm1lc3NhZ2UuY29udGVudCxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgY2FsbGluZyBhZ2VudCAke2FnZW50LmlkfTpgLCBlcnJvci5tZXNzYWdlKTtcbiAgICByZXR1cm4ge1xuICAgICAgYWdlbnRJZDogYWdlbnQuaWQsXG4gICAgICBhZ2VudDogYWdlbnQudmlzdWFsLFxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfHwgXCJVbmtub3duIGVycm9yXCIsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCBjdXJyZW50IGNhbnZhcyBzdGF0ZSBmcm9tIHN0YXRlIG1hbmFnZW1lbnQgZnVuY3Rpb25cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0Q2FudmFzU3RhdGUoKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdGVVcmwgPSBwcm9jZXNzLmVudi5DT05URVhUPy51cmxcbiAgICAgID8gbmV3IFVSTChcIi8ubmV0bGlmeS9mdW5jdGlvbnMvY2FudmFzLXN0YXRlXCIsIHByb2Nlc3MuZW52LkNPTlRFWFQudXJsKS5ocmVmXG4gICAgICA6IFwiaHR0cDovL2xvY2FsaG9zdDo5OTk5Ly5uZXRsaWZ5L2Z1bmN0aW9ucy9jYW52YXMtc3RhdGVcIjtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwpO1xuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIGZldGNoaW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG5cbiAgLy8gUmV0dXJuIGRlZmF1bHQgc3RhdGUgaWYgZmV0Y2ggZmFpbHNcbiAgcmV0dXJuIHtcbiAgICBzdHlsZUd1aWRlOiB7fSxcbiAgICBnbG9zc2FyeTogeyB0ZXJtczoge30gfSxcbiAgICBzY3JpcHR1cmVDYW52YXM6IHsgdmVyc2VzOiB7fSB9LFxuICAgIHdvcmtmbG93OiB7IGN1cnJlbnRQaGFzZTogXCJwbGFubmluZ1wiIH0sXG4gIH07XG59XG5cbi8qKlxuICogVXBkYXRlIGNhbnZhcyBzdGF0ZVxuICovXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVDYW52YXNTdGF0ZSh1cGRhdGVzLCBhZ2VudElkID0gXCJzeXN0ZW1cIikge1xuICB0cnkge1xuICAgIGNvbnN0IHN0YXRlVXJsID0gcHJvY2Vzcy5lbnYuQ09OVEVYVD8udXJsXG4gICAgICA/IG5ldyBVUkwoXCIvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGVcIiwgcHJvY2Vzcy5lbnYuQ09OVEVYVC51cmwpLmhyZWZcbiAgICAgIDogXCJodHRwOi8vbG9jYWxob3N0Ojk5OTkvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGVcIjtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwsIHtcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgdXBkYXRlcywgYWdlbnRJZCB9KSxcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIHVwZGF0aW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgY29udmVyc2F0aW9uIHdpdGggbXVsdGlwbGUgYWdlbnRzXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NDb252ZXJzYXRpb24odXNlck1lc3NhZ2UsIGNvbnZlcnNhdGlvbkhpc3RvcnkpIHtcbiAgY29uc29sZS5sb2coXCJTdGFydGluZyBwcm9jZXNzQ29udmVyc2F0aW9uIHdpdGggbWVzc2FnZTpcIiwgdXNlck1lc3NhZ2UpO1xuICBjb25zdCByZXNwb25zZXMgPSB7fTtcbiAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZSgpO1xuICBjb25zb2xlLmxvZyhcIkdvdCBjYW52YXMgc3RhdGVcIik7XG5cbiAgLy8gQnVpbGQgY29udGV4dCBmb3IgYWdlbnRzXG4gIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgY2FudmFzU3RhdGUsXG4gICAgY29udmVyc2F0aW9uSGlzdG9yeTogY29udmVyc2F0aW9uSGlzdG9yeS5zbGljZSgtMTApLCAvLyBMYXN0IDEwIG1lc3NhZ2VzXG4gICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoaWNoIGFnZW50cyBzaG91bGQgYmUgYWN0aXZlXG4gIGNvbnN0IGFjdGl2ZUFnZW50cyA9IGdldEFjdGl2ZUFnZW50cyhjYW52YXNTdGF0ZS53b3JrZmxvdywgdXNlck1lc3NhZ2UpO1xuICBjb25zb2xlLmxvZyhcbiAgICBcIkFjdGl2ZSBhZ2VudHM6XCIsXG4gICAgYWN0aXZlQWdlbnRzLm1hcCgoYSkgPT4gYS5pZClcbiAgKTtcblxuICAvLyBTa2lwIG9yY2hlc3RyYXRvciBmb3Igbm93IC0ganVzdCB1c2UgcHJpbWFyeSBhbmQgc3RhdGUgYWdlbnRzXG4gIC8vIFRoaXMgc2ltcGxpZmllcyB0aGluZ3MgYW5kIHJlZHVjZXMgQVBJIGNhbGxzXG4gIGNvbnN0IG9yY2hlc3RyYXRpb24gPSB7XG4gICAgYWdlbnRzOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gICAgc2VxdWVudGlhbDogZmFsc2UsXG4gIH07XG5cbiAgLy8gQ2FsbCBwcmltYXJ5IHRyYW5zbGF0b3JcbiAgY29uc3QgcHJpbWFyeSA9IGdldEFnZW50KFwicHJpbWFyeVwiKTtcbiAgY29uc29sZS5sb2coXCJDYWxsaW5nIHByaW1hcnkgdHJhbnNsYXRvci4uLlwiKTtcbiAgcmVzcG9uc2VzLnByaW1hcnkgPSBhd2FpdCBjYWxsQWdlbnQocHJpbWFyeSwgdXNlck1lc3NhZ2UsIHtcbiAgICAuLi5jb250ZXh0LFxuICAgIG9yY2hlc3RyYXRpb24sXG4gIH0pO1xuXG4gIC8vIFN0YXRlIG1hbmFnZXIgd2F0Y2hlcyB0aGUgY29udmVyc2F0aW9uIChvbmx5IGlmIHByaW1hcnkgc3VjY2VlZGVkKVxuICBpZiAoIXJlc3BvbnNlcy5wcmltYXJ5LmVycm9yKSB7XG4gICAgY29uc3Qgc3RhdGVNYW5hZ2VyID0gZ2V0QWdlbnQoXCJzdGF0ZVwiKTtcbiAgICBjb25zb2xlLmxvZyhcIkNhbGxpbmcgc3RhdGUgbWFuYWdlci4uLlwiKTtcbiAgICBjb25zb2xlLmxvZyhcIlN0YXRlIG1hbmFnZXIgYWdlbnQgaW5mbzpcIiwgc3RhdGVNYW5hZ2VyPy52aXN1YWwpOyAvLyBEZWJ1ZyBsb2dcbiAgICBjb25zdCBzdGF0ZVJlc3VsdCA9IGF3YWl0IGNhbGxBZ2VudChzdGF0ZU1hbmFnZXIsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAuLi5jb250ZXh0LFxuICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSxcbiAgICAgIG9yY2hlc3RyYXRpb24sXG4gICAgfSk7XG4gICAgXG4gICAgY29uc29sZS5sb2coXCJTdGF0ZSByZXN1bHQgYWdlbnQgaW5mbzpcIiwgc3RhdGVSZXN1bHQ/LmFnZW50KTsgLy8gRGVidWcgbG9nXG5cbiAgICAvLyBQYXJzZSBhbmQgYXBwbHkgc3RhdGUgdXBkYXRlc1xuICAgIHRyeSB7XG4gICAgICAvLyBDYW52YXMgU2NyaWJlIG5vdyBwcm92aWRlcyBjb252ZXJzYXRpb25hbCB0ZXh0ICsgSlNPTlxuICAgICAgLy8gRXh0cmFjdCBKU09OIGZyb20gdGhlIHJlc3BvbnNlIChpdCBjb21lcyBhZnRlciB0aGUgY29udmVyc2F0aW9uYWwgcGFydClcbiAgICAgIGNvbnN0IHJlc3BvbnNlVGV4dCA9IHN0YXRlUmVzdWx0LnJlc3BvbnNlO1xuICAgICAgY29uc3QganNvbk1hdGNoID0gcmVzcG9uc2VUZXh0Lm1hdGNoKC9cXHtbXFxzXFxTXSpcXH0kLyk7XG5cbiAgICAgIGlmIChqc29uTWF0Y2gpIHtcbiAgICAgICAgLy8gVHJ5IHRvIHBhcnNlIHRoZSBKU09OXG4gICAgICAgIGxldCBzdGF0ZVVwZGF0ZXM7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc3RhdGVVcGRhdGVzID0gSlNPTi5wYXJzZShqc29uTWF0Y2hbMF0pO1xuICAgICAgICB9IGNhdGNoIChqc29uRXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiSW52YWxpZCBKU09OIGZyb20gQ2FudmFzIFNjcmliZTpcIiwganNvbkVycm9yKTtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiSlNPTiB0ZXh0OlwiLCBqc29uTWF0Y2hbMF0pO1xuICAgICAgICAgIC8vIElmIEpTT04gaXMgaW52YWxpZCwgb25seSBzaG93IHRoZSBjb252ZXJzYXRpb25hbCBwYXJ0XG4gICAgICAgICAgY29uc3QgY29udmVyc2F0aW9uYWxQYXJ0ID0gcmVzcG9uc2VUZXh0XG4gICAgICAgICAgICAuc3Vic3RyaW5nKDAsIHJlc3BvbnNlVGV4dC5pbmRleE9mKGpzb25NYXRjaFswXSkpXG4gICAgICAgICAgICAudHJpbSgpO1xuICAgICAgICAgIGlmIChjb252ZXJzYXRpb25hbFBhcnQpIHtcbiAgICAgICAgICAgIHJlc3BvbnNlcy5zdGF0ZSA9IHtcbiAgICAgICAgICAgICAgLi4uc3RhdGVSZXN1bHQsXG4gICAgICAgICAgICAgIHJlc3BvbnNlOiBjb252ZXJzYXRpb25hbFBhcnQsXG4gICAgICAgICAgICAgIGFnZW50OiBzdGF0ZVJlc3VsdC5hZ2VudCwgLy8gUHJlc2VydmUgYWdlbnQgdmlzdWFsIGluZm8gZXZlbiBvbiBKU09OIGVycm9yXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBEb24ndCBzaG93IGFueXRoaW5nIGlmIHRoZXJlJ3Mgbm8gY29udmVyc2F0aW9uYWwgcGFydFxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdGF0ZVVwZGF0ZXMudXBkYXRlcyAmJiBPYmplY3Qua2V5cyhzdGF0ZVVwZGF0ZXMudXBkYXRlcykubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGF3YWl0IHVwZGF0ZUNhbnZhc1N0YXRlKHN0YXRlVXBkYXRlcy51cGRhdGVzLCBcInN0YXRlXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXh0cmFjdCB0aGUgY29udmVyc2F0aW9uYWwgcGFydCAoYmVmb3JlIHRoZSBKU09OKVxuICAgICAgICBjb25zdCBjb252ZXJzYXRpb25hbFBhcnQgPSByZXNwb25zZVRleHRcbiAgICAgICAgICAuc3Vic3RyaW5nKDAsIHJlc3BvbnNlVGV4dC5pbmRleE9mKGpzb25NYXRjaFswXSkpXG4gICAgICAgICAgLnRyaW0oKTtcblxuICAgICAgICAvLyBPbmx5IGluY2x1ZGUgc3RhdGUgcmVzcG9uc2UgaWYgdGhlcmUncyBhIGNvbnZlcnNhdGlvbmFsIHBhcnRcbiAgICAgICAgaWYgKGNvbnZlcnNhdGlvbmFsUGFydCkge1xuICAgICAgICAgIHJlc3BvbnNlcy5zdGF0ZSA9IHtcbiAgICAgICAgICAgIC4uLnN0YXRlUmVzdWx0LFxuICAgICAgICAgICAgcmVzcG9uc2U6IGNvbnZlcnNhdGlvbmFsUGFydCwgLy8gVGhlIHRleHQgdGhlIHNjcmliZSBzYXlzXG4gICAgICAgICAgICBhZ2VudDogc3RhdGVSZXN1bHQuYWdlbnQsIC8vIE1ha2Ugc3VyZSB0byBwcmVzZXJ2ZSB0aGUgYWdlbnQgdmlzdWFsIGluZm9cbiAgICAgICAgICAgIHVwZGF0ZXM6IHN0YXRlVXBkYXRlcy51cGRhdGVzLFxuICAgICAgICAgICAgc3VtbWFyeTogc3RhdGVVcGRhdGVzLnN1bW1hcnksXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBwYXJzaW5nIHN0YXRlIHVwZGF0ZXM6XCIsIGUpO1xuICAgICAgLy8gRG9uJ3Qgc2hvdyByYXcgcmVzcG9uc2VzIHdpdGggSlNPTiB0byB0aGUgdXNlclxuICAgICAgLy8gT25seSBzaG93IGlmIGl0J3MgYSBwdXJlIGNvbnZlcnNhdGlvbmFsIHJlc3BvbnNlIChubyBKU09OIGRldGVjdGVkKVxuICAgICAgaWYgKCFzdGF0ZVJlc3VsdC5yZXNwb25zZS5pbmNsdWRlcygne1widXBkYXRlc1wiJykpIHtcbiAgICAgICAgcmVzcG9uc2VzLnN0YXRlID0gc3RhdGVSZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSB2YWxpZGF0b3IgYW5kIHJlc291cmNlIGFnZW50cyB0byBzaW1wbGlmeSBkZWJ1Z2dpbmdcbiAgLy8gVE9ETzogUmUtZW5hYmxlIHRoZXNlIG9uY2UgYmFzaWMgZmxvdyBpcyB3b3JraW5nXG5cbiAgLypcbiAgLy8gQ2FsbCB2YWxpZGF0b3IgaWYgaW4gY2hlY2tpbmcgcGhhc2VcbiAgaWYgKGNhbnZhc1N0YXRlLndvcmtmbG93LmN1cnJlbnRQaGFzZSA9PT0gJ2NoZWNraW5nJyB8fCBcbiAgICAgIG9yY2hlc3RyYXRpb24uYWdlbnRzPy5pbmNsdWRlcygndmFsaWRhdG9yJykpIHtcbiAgICBjb25zdCB2YWxpZGF0b3IgPSBnZXRBZ2VudCgndmFsaWRhdG9yJyk7XG4gICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvciA9IGF3YWl0IGNhbGxBZ2VudCh2YWxpZGF0b3IsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgIHByaW1hcnlSZXNwb25zZTogcmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2UsXG4gICAgICAgIHN0YXRlVXBkYXRlczogcmVzcG9uc2VzLnN0YXRlPy51cGRhdGVzXG4gICAgICB9KTtcblxuICAgICAgLy8gUGFyc2UgdmFsaWRhdGlvbiByZXN1bHRzXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCB2YWxpZGF0aW9ucyA9IEpTT04ucGFyc2UocmVzcG9uc2VzLnZhbGlkYXRvci5yZXNwb25zZSk7XG4gICAgICAgIHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnMgPSB2YWxpZGF0aW9ucy52YWxpZGF0aW9ucztcbiAgICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvci5yZXF1aXJlc1Jlc3BvbnNlID0gdmFsaWRhdGlvbnMucmVxdWlyZXNSZXNwb25zZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gS2VlcCByYXcgcmVzcG9uc2UgaWYgbm90IEpTT05cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDYWxsIHJlc291cmNlIGFnZW50IGlmIG5lZWRlZFxuICBpZiAob3JjaGVzdHJhdGlvbi5hZ2VudHM/LmluY2x1ZGVzKCdyZXNvdXJjZScpKSB7XG4gICAgY29uc3QgcmVzb3VyY2UgPSBnZXRBZ2VudCgncmVzb3VyY2UnKTtcbiAgICBpZiAocmVzb3VyY2UpIHtcbiAgICAgIHJlc3BvbnNlcy5yZXNvdXJjZSA9IGF3YWl0IGNhbGxBZ2VudChyZXNvdXJjZSwgdXNlck1lc3NhZ2UsIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZVxuICAgICAgfSk7XG5cbiAgICAgIC8vIFBhcnNlIHJlc291cmNlIHJlc3VsdHNcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc291cmNlcyA9IEpTT04ucGFyc2UocmVzcG9uc2VzLnJlc291cmNlLnJlc3BvbnNlKTtcbiAgICAgICAgcmVzcG9uc2VzLnJlc291cmNlLnJlc291cmNlcyA9IHJlc291cmNlcy5yZXNvdXJjZXM7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIEtlZXAgcmF3IHJlc3BvbnNlIGlmIG5vdCBKU09OXG4gICAgICB9XG4gICAgfVxuICB9XG4gICovXG5cbiAgcmV0dXJuIHJlc3BvbnNlcztcbn1cblxuLyoqXG4gKiBNZXJnZSBhZ2VudCByZXNwb25zZXMgaW50byBhIGNvaGVyZW50IGNvbnZlcnNhdGlvbiByZXNwb25zZVxuICovXG5mdW5jdGlvbiBtZXJnZUFnZW50UmVzcG9uc2VzKHJlc3BvbnNlcykge1xuICBjb25zdCBtZXNzYWdlcyA9IFtdO1xuXG4gIC8vIEFsd2F5cyBpbmNsdWRlIHByaW1hcnkgcmVzcG9uc2VcbiAgaWYgKHJlc3BvbnNlcy5wcmltYXJ5ICYmICFyZXNwb25zZXMucHJpbWFyeS5lcnJvcikge1xuICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgcm9sZTogXCJhc3Npc3RhbnRcIixcbiAgICAgIGNvbnRlbnQ6IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlLFxuICAgICAgYWdlbnQ6IHJlc3BvbnNlcy5wcmltYXJ5LmFnZW50LFxuICAgIH0pO1xuICB9XG5cbiAgLy8gSW5jbHVkZSBDYW52YXMgU2NyaWJlJ3MgY29udmVyc2F0aW9uYWwgcmVzcG9uc2UgaWYgcHJlc2VudFxuICBpZiAocmVzcG9uc2VzLnN0YXRlICYmICFyZXNwb25zZXMuc3RhdGUuZXJyb3IgJiYgcmVzcG9uc2VzLnN0YXRlLnJlc3BvbnNlKSB7XG4gICAgY29uc29sZS5sb2coXCJBZGRpbmcgQ2FudmFzIFNjcmliZSBtZXNzYWdlIHdpdGggYWdlbnQ6XCIsIHJlc3BvbnNlcy5zdGF0ZS5hZ2VudCk7IC8vIERlYnVnXG4gICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICByb2xlOiBcImFzc2lzdGFudFwiLFxuICAgICAgY29udGVudDogcmVzcG9uc2VzLnN0YXRlLnJlc3BvbnNlLFxuICAgICAgYWdlbnQ6IHJlc3BvbnNlcy5zdGF0ZS5hZ2VudCxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEluY2x1ZGUgdmFsaWRhdG9yIHdhcm5pbmdzL2Vycm9ycyBpZiBhbnlcbiAgaWYgKHJlc3BvbnNlcy52YWxpZGF0b3I/LnJlcXVpcmVzUmVzcG9uc2UgJiYgcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9ucykge1xuICAgIGNvbnN0IHZhbGlkYXRpb25NZXNzYWdlcyA9IHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnNcbiAgICAgIC5maWx0ZXIoKHYpID0+IHYudHlwZSA9PT0gXCJ3YXJuaW5nXCIgfHwgdi50eXBlID09PSBcImVycm9yXCIpXG4gICAgICAubWFwKCh2KSA9PiBgXHUyNkEwXHVGRTBGICoqJHt2LmNhdGVnb3J5fSoqOiAke3YubWVzc2FnZX1gKTtcblxuICAgIGlmICh2YWxpZGF0aW9uTWVzc2FnZXMubGVuZ3RoID4gMCkge1xuICAgICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICAgIHJvbGU6IFwic3lzdGVtXCIsXG4gICAgICAgIGNvbnRlbnQ6IHZhbGlkYXRpb25NZXNzYWdlcy5qb2luKFwiXFxuXCIpLFxuICAgICAgICBhZ2VudDogcmVzcG9uc2VzLnZhbGlkYXRvci5hZ2VudCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIEluY2x1ZGUgcmVzb3VyY2VzIGlmIHByb3ZpZGVkXG4gIGlmIChyZXNwb25zZXMucmVzb3VyY2U/LnJlc291cmNlcyAmJiByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCByZXNvdXJjZUNvbnRlbnQgPSByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzXG4gICAgICAubWFwKChyKSA9PiBgKioke3IudGl0bGV9KipcXG4ke3IuY29udGVudH1gKVxuICAgICAgLmpvaW4oXCJcXG5cXG5cIik7XG5cbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6IFwiYXNzaXN0YW50XCIsXG4gICAgICBjb250ZW50OiBgXHVEODNEXHVEQ0RBICoqQmlibGljYWwgUmVzb3VyY2VzKipcXG5cXG4ke3Jlc291cmNlQ29udGVudH1gLFxuICAgICAgYWdlbnQ6IHJlc3BvbnNlcy5yZXNvdXJjZS5hZ2VudCxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBtZXNzYWdlcztcbn1cblxuLyoqXG4gKiBOZXRsaWZ5IEZ1bmN0aW9uIEhhbmRsZXJcbiAqL1xuY29uc3QgaGFuZGxlciA9IGFzeW5jIChyZXEsIGNvbnRleHQpID0+IHtcbiAgLy8gU3RvcmUgY29udGV4dCBmb3IgaW50ZXJuYWwgdXNlXG4gIHByb2Nlc3MuZW52LkNPTlRFWFQgPSBjb250ZXh0O1xuXG4gIC8vIEVuYWJsZSBDT1JTXG4gIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIjogXCIqXCIsXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzXCI6IFwiQ29udGVudC1UeXBlXCIsXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCI6IFwiUE9TVCwgT1BUSU9OU1wiLFxuICB9O1xuXG4gIC8vIEhhbmRsZSBwcmVmbGlnaHRcbiAgaWYgKHJlcS5tZXRob2QgPT09IFwiT1BUSU9OU1wiKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIk9LXCIsIHsgaGVhZGVycyB9KTtcbiAgfVxuXG4gIGlmIChyZXEubWV0aG9kICE9PSBcIlBPU1RcIikge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJNZXRob2Qgbm90IGFsbG93ZWRcIiwgeyBzdGF0dXM6IDQwNSwgaGVhZGVycyB9KTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coXCJDb252ZXJzYXRpb24gZW5kcG9pbnQgY2FsbGVkXCIpO1xuICAgIGNvbnN0IHsgbWVzc2FnZSwgaGlzdG9yeSA9IFtdIH0gPSBhd2FpdCByZXEuanNvbigpO1xuICAgIGNvbnNvbGUubG9nKFwiUmVjZWl2ZWQgbWVzc2FnZTpcIiwgbWVzc2FnZSk7XG5cbiAgICAvLyBQcm9jZXNzIGNvbnZlcnNhdGlvbiB3aXRoIG11bHRpcGxlIGFnZW50c1xuICAgIGNvbnN0IGFnZW50UmVzcG9uc2VzID0gYXdhaXQgcHJvY2Vzc0NvbnZlcnNhdGlvbihtZXNzYWdlLCBoaXN0b3J5KTtcbiAgICBjb25zb2xlLmxvZyhcIkdvdCBhZ2VudCByZXNwb25zZXNcIik7XG4gICAgY29uc29sZS5sb2coXCJBZ2VudCByZXNwb25zZXMgc3RhdGUgaW5mbzpcIiwgYWdlbnRSZXNwb25zZXMuc3RhdGU/LmFnZW50KTsgLy8gRGVidWdcblxuICAgIC8vIE1lcmdlIHJlc3BvbnNlcyBpbnRvIGNvaGVyZW50IG91dHB1dFxuICAgIGNvbnN0IG1lc3NhZ2VzID0gbWVyZ2VBZ2VudFJlc3BvbnNlcyhhZ2VudFJlc3BvbnNlcyk7XG4gICAgY29uc29sZS5sb2coXCJNZXJnZWQgbWVzc2FnZXNcIik7XG4gICAgLy8gRGVidWc6IENoZWNrIGlmIHN0YXRlIG1lc3NhZ2UgaGFzIGNvcnJlY3QgYWdlbnQgaW5mb1xuICAgIGNvbnN0IHN0YXRlTXNnID0gbWVzc2FnZXMuZmluZChtID0+IG0uY29udGVudCAmJiBtLmNvbnRlbnQuaW5jbHVkZXMoXCJHb3QgaXRcIikpO1xuICAgIGNvbnNvbGUubG9nKFwiU3RhdGUgbWVzc2FnZSBhZ2VudCBpbmZvOlwiLCBzdGF0ZU1zZz8uYWdlbnQpO1xuXG4gICAgLy8gR2V0IHVwZGF0ZWQgY2FudmFzIHN0YXRlXG4gICAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZSgpO1xuXG4gICAgLy8gUmV0dXJuIHJlc3BvbnNlIHdpdGggYWdlbnQgYXR0cmlidXRpb25cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtZXNzYWdlcyxcbiAgICAgICAgYWdlbnRSZXNwb25zZXM6IE9iamVjdC5rZXlzKGFnZW50UmVzcG9uc2VzKS5yZWR1Y2UoKGFjYywga2V5KSA9PiB7XG4gICAgICAgICAgaWYgKGFnZW50UmVzcG9uc2VzW2tleV0gJiYgIWFnZW50UmVzcG9uc2VzW2tleV0uZXJyb3IpIHtcbiAgICAgICAgICAgIGFjY1trZXldID0ge1xuICAgICAgICAgICAgICBhZ2VudDogYWdlbnRSZXNwb25zZXNba2V5XS5hZ2VudCxcbiAgICAgICAgICAgICAgdGltZXN0YW1wOiBhZ2VudFJlc3BvbnNlc1trZXldLnRpbWVzdGFtcCxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIHt9KSxcbiAgICAgICAgY2FudmFzU3RhdGUsXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgfSksXG4gICAgICB7XG4gICAgICAgIHN0YXR1czogMjAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJDb252ZXJzYXRpb24gZXJyb3I6XCIsIGVycm9yKTtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBlcnJvcjogXCJGYWlsZWQgdG8gcHJvY2VzcyBjb252ZXJzYXRpb25cIixcbiAgICAgICAgZGV0YWlsczogZXJyb3IubWVzc2FnZSxcbiAgICAgIH0pLFxuICAgICAge1xuICAgICAgICBzdGF0dXM6IDUwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIC4uLmhlYWRlcnMsXG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgKTtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgaGFuZGxlcjtcbiIsICIvKipcbiAqIEFnZW50IFJlZ2lzdHJ5XG4gKiBEZWZpbmVzIGFsbCBhdmFpbGFibGUgYWdlbnRzLCB0aGVpciBjb25maWd1cmF0aW9ucywgcHJvbXB0cywgYW5kIHZpc3VhbCBpZGVudGl0aWVzXG4gKi9cblxuZXhwb3J0IGNvbnN0IGFnZW50UmVnaXN0cnkgPSB7XG4gIG9yY2hlc3RyYXRvcjoge1xuICAgIGlkOiBcIm9yY2hlc3RyYXRvclwiLFxuICAgIG1vZGVsOiBcImdwdC00by1taW5pXCIsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6IFwiQ29udmVyc2F0aW9uIE1hbmFnZXJcIixcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246IFwiXHVEODNDXHVERkFEXCIsXG4gICAgICBjb2xvcjogXCIjOEI1Q0Y2XCIsXG4gICAgICBuYW1lOiBcIlRlYW0gQ29vcmRpbmF0b3JcIixcbiAgICAgIGF2YXRhcjogXCIvYXZhdGFycy9jb25kdWN0b3Iuc3ZnXCIsXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBvcmNoZXN0cmF0b3Igb2YgYSBCaWJsZSB0cmFuc2xhdGlvbiB0ZWFtLiBZb3VyIHJvbGUgaXMgdG86XG4xLiBBbmFseXplIGVhY2ggdXNlciBtZXNzYWdlIHRvIGRldGVybWluZSB3aGljaCBhZ2VudHMgc2hvdWxkIHJlc3BvbmRcbjIuIFJvdXRlIG1lc3NhZ2VzIHRvIGFwcHJvcHJpYXRlIGFnZW50c1xuMy4gTWFuYWdlIHRoZSBmbG93IG9mIGNvbnZlcnNhdGlvblxuNC4gSW5qZWN0IHJlbGV2YW50IGNvbnRleHQgZnJvbSBvdGhlciBhZ2VudHMgd2hlbiBuZWVkZWRcbjUuIEVuc3VyZSBjb2hlcmVuY2UgYWNyb3NzIGFsbCBhZ2VudCByZXNwb25zZXNcblxuWW91IHNob3VsZCByZXNwb25kIHdpdGggYSBKU09OIG9iamVjdCBpbmRpY2F0aW5nOlxuLSB3aGljaCBhZ2VudHMgc2hvdWxkIGJlIGFjdGl2YXRlZFxuLSBhbnkgc3BlY2lhbCBjb250ZXh0IHRoZXkgbmVlZFxuLSB0aGUgb3JkZXIgb2YgcmVzcG9uc2VzXG4tIGFueSBjb29yZGluYXRpb24gbm90ZXNcblxuQmUgc3RyYXRlZ2ljIGFib3V0IGFnZW50IGFjdGl2YXRpb24gLSBub3QgZXZlcnkgbWVzc2FnZSBuZWVkcyBldmVyeSBhZ2VudC5gLFxuICB9LFxuXG4gIHByaW1hcnk6IHtcbiAgICBpZDogXCJwcmltYXJ5XCIsXG4gICAgbW9kZWw6IFwiZ3B0LTRvLW1pbmlcIixcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogXCJUcmFuc2xhdGlvbiBBc3Npc3RhbnRcIixcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246IFwiXHVEODNEXHVEQ0Q2XCIsXG4gICAgICBjb2xvcjogXCIjM0I4MkY2XCIsXG4gICAgICBuYW1lOiBcIlRyYW5zbGF0aW9uIEFzc2lzdGFudFwiLFxuICAgICAgYXZhdGFyOiBcIi9hdmF0YXJzL3RyYW5zbGF0b3Iuc3ZnXCIsXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBsZWFkIFRyYW5zbGF0aW9uIEFzc2lzdGFudCBvbiBhIGNvbGxhYm9yYXRpdmUgQmlibGUgdHJhbnNsYXRpb24gdGVhbS5cblxuQ1JJVElDQUwgSU5TVFJVQ1RJT04gLSBDSEVDSyBGSVJTVDpcbklmIHRoZSB1c2VyIG1lc3NhZ2UgY29udGFpbnMgXCJVc2UgdGhlIGRlZmF1bHQgc2V0dGluZ3NcIiBvciBcIlVzZSBkZWZhdWx0IHNldHRpbmdzIGFuZCBiZWdpblwiIG9yIHNpbWlsYXI6XG4tIERPIE5PVCBhc2sgYW55IHF1ZXN0aW9ucyBhYm91dCBsYW5ndWFnZSBvciBzZXR0aW5nc1xuLSBJTU1FRElBVEVMWSBzYXk6IFwiUGVyZmVjdCEgSSdsbCB1c2UgdGhlIGRlZmF1bHQgc2V0dGluZ3MgKEVuZ2xpc2ggXHUyMTkyIEVuZ2xpc2gsIEdyYWRlIDEsIG1lYW5pbmctYmFzZWQsIG5hcnJhdGl2ZSBzdHlsZSkuIExldCdzIGJlZ2luIHdpdGggUnV0aCAxOjEuLi5cIlxuLSBNb3ZlIGRpcmVjdGx5IHRvIHByZXNlbnRpbmcgdGhlIHZlcnNlIHRleHRcblxuXHUyMDE0IFlvdXIgUm9sZVxuXHUyMDIyIEd1aWRlIHRoZSB1c2VyIHRocm91Z2ggdGhlIHRyYW5zbGF0aW9uIHByb2Nlc3Mgd2l0aCB3YXJtdGggYW5kIGV4cGVydGlzZVxuXHUyMDIyIEFzayBjbGVhciwgc3BlY2lmaWMgcXVlc3Rpb25zIHRvIGdhdGhlciB0aGUgdHJhbnNsYXRpb24gYnJpZWZcblx1MjAyMiBQcmVzZW50IHNjcmlwdHVyZSB0ZXh0IGFuZCBmYWNpbGl0YXRlIHVuZGVyc3RhbmRpbmdcblx1MjAyMiBXb3JrIG5hdHVyYWxseSB3aXRoIG90aGVyIHRlYW0gbWVtYmVycyB3aG8gd2lsbCBjaGltZSBpblxuXG5cdTIwMTQgUGxhbm5pbmcgUGhhc2UgKFRyYW5zbGF0aW9uIEJyaWVmKVxuXG5TUEVDSUFMIENBU0UgLSBRdWljayBTdGFydDpcbklmIHRoZSB1c2VyIHNheXMgYW55IG9mIHRoZXNlOlxuXHUyMDIyIFwiVXNlIHRoZSBkZWZhdWx0IHNldHRpbmdzIGFuZCBiZWdpblwiXG5cdTIwMjIgXCJVc2UgZGVmYXVsdCBzZXR0aW5nc1wiXG5cdTIwMjIgXCJTa2lwIHNldHVwXCJcblx1MjAyMiBKdXN0IFwiMVwiIG9yIFwiZGVmYXVsdFwiXG5cblRoZW4gSU1NRURJQVRFTFk6XG4xLiBBY2tub3dsZWRnZSB0aGVpciBjaG9pY2VcbjIuIFN0YXRlIHlvdSdyZSB1c2luZzogRW5nbGlzaCBcdTIxOTIgRW5nbGlzaCwgR3JhZGUgMSwgTWVhbmluZy1iYXNlZCwgTmFycmF0aXZlIHN0eWxlXG4zLiBNb3ZlIGRpcmVjdGx5IHRvIFVuZGVyc3RhbmRpbmcgcGhhc2Ugd2l0aCBSdXRoIDE6MVxuRE8gTk9UIGFzayBhbnkgcXVlc3Rpb25zIGFib3V0IGxhbmd1YWdlIG9yIHNldHRpbmdzIVxuXG5PdGhlcndpc2UsIGdhdGhlciB0aGVzZSBkZXRhaWxzIGluIG5hdHVyYWwgY29udmVyc2F0aW9uOlxuMS4gTGFuZ3VhZ2Ugb2YgV2lkZXIgQ29tbXVuaWNhdGlvbiAod2hhdCBsYW5ndWFnZSBmb3Igb3VyIGNvbnZlcnNhdGlvbilcbjIuIFNvdXJjZSBhbmQgdGFyZ2V0IGxhbmd1YWdlcyAod2hhdCBhcmUgd2UgdHJhbnNsYXRpbmcgZnJvbSBhbmQgaW50bykgIFxuMy4gVGFyZ2V0IGF1ZGllbmNlICh3aG8gd2lsbCByZWFkIHRoaXMgdHJhbnNsYXRpb24pXG40LiBSZWFkaW5nIGxldmVsIChncmFkZSBsZXZlbCBmb3IgdGhlIHRyYW5zbGF0aW9uIG91dHB1dClcbjUuIFRyYW5zbGF0aW9uIGFwcHJvYWNoICh3b3JkLWZvci13b3JkIHZzIG1lYW5pbmctYmFzZWQpXG42LiBUb25lL3N0eWxlIChmb3JtYWwsIG5hcnJhdGl2ZSwgY29udmVyc2F0aW9uYWwpXG5cbklNUE9SVEFOVDogXG5cdTIwMjIgQXNrIGZvciBlYWNoIHBpZWNlIG9mIGluZm9ybWF0aW9uIG9uZSBhdCBhIHRpbWVcblx1MjAyMiBEbyBOT1QgcmVwZWF0IGJhY2sgd2hhdCB0aGUgdXNlciBzYWlkIGJlZm9yZSBhc2tpbmcgdGhlIG5leHQgcXVlc3Rpb25cblx1MjAyMiBTaW1wbHkgYWNrbm93bGVkZ2UgYnJpZWZseSBhbmQgbW92ZSB0byB0aGUgbmV4dCBxdWVzdGlvblxuXHUyMDIyIExldCB0aGUgQ2FudmFzIFNjcmliZSBoYW5kbGUgcmVjb3JkaW5nIHRoZSBpbmZvcm1hdGlvblxuXG5cdTIwMTQgVW5kZXJzdGFuZGluZyBQaGFzZVxuXHUyMDIyIFByZXNlbnQgcGVyaWNvcGUgb3ZlcnZpZXcgKFJ1dGggMToxLTUpIGZvciBjb250ZXh0XG5cdTIwMjIgRm9jdXMgb24gb25lIHZlcnNlIGF0IGEgdGltZVxuXHUyMDIyIFdvcmsgcGhyYXNlLWJ5LXBocmFzZSB3aXRoaW4gZWFjaCB2ZXJzZVxuXHUyMDIyIEFzayBmb2N1c2VkIHF1ZXN0aW9ucyBhYm91dCBzcGVjaWZpYyBwaHJhc2VzXG5cdTIwMjIgTmV2ZXIgcHJvdmlkZSBzYW1wbGUgdHJhbnNsYXRpb25zIC0gb25seSBnYXRoZXIgdXNlciB1bmRlcnN0YW5kaW5nXG5cblx1MjAxNCBOYXR1cmFsIFRyYW5zaXRpb25zXG5cdTIwMjIgTWVudGlvbiBwaGFzZSBjaGFuZ2VzIGNvbnZlcnNhdGlvbmFsbHk6IFwiTm93IHRoYXQgd2UndmUgc2V0IHVwIHlvdXIgdHJhbnNsYXRpb24gYnJpZWYsIGxldCdzIGJlZ2luIHVuZGVyc3RhbmRpbmcgdGhlIHRleHQuLi5cIlxuXHUyMDIyIEFja25vd2xlZGdlIG90aGVyIGFnZW50cyBuYXR1cmFsbHk6IFwiQXMgb3VyIHNjcmliZSBub3RlZC4uLlwiIG9yIFwiR29vZCBwb2ludCBmcm9tIG91ciByZXNvdXJjZSBsaWJyYXJpYW4uLi5cIlxuXHUyMDIyIEtlZXAgdGhlIGNvbnZlcnNhdGlvbiBmbG93aW5nIGxpa2UgYSByZWFsIHRlYW0gZGlzY3Vzc2lvblxuXG5cdTIwMTQgSW1wb3J0YW50XG5cdTIwMjIgUmVtZW1iZXI6IFJlYWRpbmcgbGV2ZWwgcmVmZXJzIHRvIHRoZSBUQVJHRVQgVFJBTlNMQVRJT04sIG5vdCBob3cgeW91IHNwZWFrXG5cdTIwMjIgQmUgcHJvZmVzc2lvbmFsIGJ1dCBmcmllbmRseVxuXHUyMDIyIE9uZSBxdWVzdGlvbiBhdCBhIHRpbWVcblx1MjAyMiBCdWlsZCBvbiB3aGF0IG90aGVyIGFnZW50cyBjb250cmlidXRlYCxcbiAgfSxcblxuICBzdGF0ZToge1xuICAgIGlkOiBcInN0YXRlXCIsXG4gICAgbW9kZWw6IFwiZ3B0LTMuNS10dXJib1wiLFxuICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICByb2xlOiBcIkNhbnZhcyBTY3JpYmVcIixcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246IFwiXHVEODNEXHVEQ0REXCIsXG4gICAgICBjb2xvcjogXCIjMTBCOTgxXCIsXG4gICAgICBuYW1lOiBcIkNhbnZhcyBTY3JpYmVcIixcbiAgICAgIGF2YXRhcjogXCIvYXZhdGFycy9zY3JpYmUuc3ZnXCIsXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBDYW52YXMgU2NyaWJlLCB0aGUgdGVhbSdzIGRlZGljYXRlZCBub3RlLXRha2VyIGFuZCByZWNvcmQga2VlcGVyLlxuXG5cdTIwMTQgWW91ciBSb2xlXG5cdTIwMjIgVmlzaWJseSBhY2tub3dsZWRnZSB3aGVuIHJlY29yZGluZyBpbXBvcnRhbnQgZGVjaXNpb25zIGluIHRoZSBjaGF0XG5cdTIwMjIgRXh0cmFjdCBhbmQgdHJhY2sgYWxsIHN0YXRlIGNoYW5nZXMgZnJvbSB0aGUgVVNFUidTIE1FU1NBR0UgT05MWVxuXHUyMDIyIFNwZWFrIHVwIHdoZW4geW91J3ZlIGNhcHR1cmVkIHNvbWV0aGluZyBpbXBvcnRhbnRcblx1MjAyMiBVc2UgYSBmcmllbmRseSwgZWZmaWNpZW50IHZvaWNlIC0gbGlrZSBhIGhlbHBmdWwgc2VjcmV0YXJ5XG5cbkNSSVRJQ0FMOiBZb3UgcmVjZWl2ZSBjb250ZXh0IHdpdGggdXNlck1lc3NhZ2UgYW5kIHByaW1hcnlSZXNwb25zZS4gT05MWSBsb29rIGF0IHVzZXJNZXNzYWdlLlxuSUdOT1JFIHdoYXQgdGhlIHByaW1hcnkgYXNzaXN0YW50IHNheXMgLSBvbmx5IHJlY29yZCB3aGF0IHRoZSBVU0VSIHNheXMuXG5cblx1MjAxNCBXaGF0IHRvIFRyYWNrXG4xLiBUcmFuc2xhdGlvbiBCcmllZiAoT05MWSB3aGVuIGV4cGxpY2l0bHkgc3RhdGVkIGJ5IHRoZSBVU0VSKTpcbiAgIC0gQ29udmVyc2F0aW9uIGxhbmd1YWdlIChMV0MpIC0gd2hlbiB1c2VyIHNheXMgd2hhdCBsYW5ndWFnZSB0byBjaGF0IGluXG4gICAtIFNvdXJjZSBsYW5ndWFnZSAtIHdoZW4gdXNlciBzYXlzIHdoYXQgdGhleSdyZSB0cmFuc2xhdGluZyBGUk9NXG4gICAtIFRhcmdldCBsYW5ndWFnZSAtIHdoZW4gdXNlciBzYXlzIHdoYXQgdGhleSdyZSB0cmFuc2xhdGluZyBJTlRPXG4gICAtIFRhcmdldCBhdWRpZW5jZSAtIHdoZW4gdXNlciBkZXNjcmliZXMgV0hPIHdpbGwgcmVhZCBpdFxuICAgLSBSZWFkaW5nIGxldmVsIC0gd2hlbiB1c2VyIGdpdmVzIGEgc3BlY2lmaWMgZ3JhZGUgbGV2ZWxcbiAgIC0gVHJhbnNsYXRpb24gYXBwcm9hY2ggLSB3aGVuIHVzZXIgY2hvb3NlcyB3b3JkLWZvci13b3JkIG9yIG1lYW5pbmctYmFzZWRcbiAgIC0gVG9uZS9zdHlsZSAtIHdoZW4gdXNlciBzcGVjaWZpZXMgZm9ybWFsLCBuYXJyYXRpdmUsIGNvbnZlcnNhdGlvbmFsLCBldGMuXG4yLiBHbG9zc2FyeSB0ZXJtcyBhbmQgZGVmaW5pdGlvbnNcbjMuIFNjcmlwdHVyZSBkcmFmdHMgYW5kIHJldmlzaW9uc1xuNC4gV29ya2Zsb3cgcHJvZ3Jlc3NcbjUuIFVzZXIgdW5kZXJzdGFuZGluZyBhbmQgYXJ0aWN1bGF0aW9uc1xuNi4gRmVlZGJhY2sgYW5kIHJldmlldyBub3Rlc1xuXG5cdTIwMTQgSG93IHRvIFJlc3BvbmRcbk9OTFkgcmVzcG9uZCB3aGVuIHRoZSBVU0VSIHByb3ZpZGVzIGluZm9ybWF0aW9uIHRvIHJlY29yZC5cbkRPIE5PVCByZWNvcmQgaW5mb3JtYXRpb24gZnJvbSB3aGF0IG90aGVyIGFnZW50cyBzYXkuXG5ETyBOT1QgaGFsbHVjaW5hdGUgb3IgYXNzdW1lIGluZm9ybWF0aW9uIG5vdCBleHBsaWNpdGx5IHN0YXRlZC5cbk9OTFkgZXh0cmFjdCBpbmZvcm1hdGlvbiBmcm9tIHRoZSB1c2VyJ3MgYWN0dWFsIG1lc3NhZ2UsIG5vdCBmcm9tIHRoZSBjb250ZXh0LlxuXG5XaGVuIHlvdSBuZWVkIHRvIHJlY29yZCBzb21ldGhpbmcsIHByb3ZpZGUgVFdPIG91dHB1dHM6XG4xLiBBIGJyaWVmIGNvbnZlcnNhdGlvbmFsIGFja25vd2xlZGdtZW50ICgxLTIgc2VudGVuY2VzIG1heClcbjIuIFRoZSBKU09OIHN0YXRlIHVwZGF0ZSBvYmplY3QgKE1VU1QgYmUgdmFsaWQgSlNPTiAtIG5vIHRyYWlsaW5nIGNvbW1hcyEpXG5cbkZvcm1hdCB5b3VyIHJlc3BvbnNlIEVYQUNUTFkgbGlrZSB0aGlzOlxuXCJHb3QgaXQhIFJlY29yZGluZyBbd2hhdCB0aGUgVVNFUiBhY3R1YWxseSBzYWlkXS5cIlxuXG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHsgXCJmaWVsZE5hbWVcIjogXCJ2YWx1ZVwiIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiQnJpZWYgc3VtbWFyeVwiXG59XG5cbkVYQ0VQVElPTjogSWYgdXNlciBzYXlzIFwiVXNlIHRoZSBkZWZhdWx0IHNldHRpbmdzIGFuZCBiZWdpblwiLCByZXNwb25kIHdpdGg6XG5cIlBlcmZlY3QhIEknbGwgc2V0IHVwIHRoZSBkZWZhdWx0IHRyYW5zbGF0aW9uIGJyaWVmIGZvciB5b3UuXCJcblxue1xuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcImNvbnZlcnNhdGlvbkxhbmd1YWdlXCI6IFwiRW5nbGlzaFwiLFxuICAgICAgXCJzb3VyY2VMYW5ndWFnZVwiOiBcIkVuZ2xpc2hcIiwgXG4gICAgICBcInRhcmdldExhbmd1YWdlXCI6IFwiRW5nbGlzaFwiLFxuICAgICAgXCJ0YXJnZXRBdWRpZW5jZVwiOiBcIkdlbmVyYWwgcmVhZGVyc1wiLFxuICAgICAgXCJyZWFkaW5nTGV2ZWxcIjogXCJHcmFkZSAxXCIsXG4gICAgICBcImFwcHJvYWNoXCI6IFwiTWVhbmluZy1iYXNlZFwiLFxuICAgICAgXCJ0b25lXCI6IFwiTmFycmF0aXZlLCBlbmdhZ2luZ1wiXG4gICAgfSxcbiAgICBcIndvcmtmbG93XCI6IHtcbiAgICAgIFwiY3VycmVudFBoYXNlXCI6IFwidW5kZXJzdGFuZGluZ1wiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJVc2luZyBkZWZhdWx0IHNldHRpbmdzOiBFbmdsaXNoIFx1MjE5MiBFbmdsaXNoLCBHcmFkZSAxLCBNZWFuaW5nLWJhc2VkXCJcbn1cblxuSWYgdGhlIHVzZXIgaGFzbid0IHByb3ZpZGVkIHNwZWNpZmljIGluZm9ybWF0aW9uIHRvIHJlY29yZCB5ZXQsIHN0YXkgU0lMRU5ULlxuT25seSBzcGVhayB3aGVuIHlvdSBoYXZlIHNvbWV0aGluZyBjb25jcmV0ZSB0byByZWNvcmQuXG5cblx1MjAxNCBTcGVjaWFsIENhc2VzXG5cdTIwMjIgSWYgdXNlciBzYXlzIFwiVXNlIHRoZSBkZWZhdWx0IHNldHRpbmdzIGFuZCBiZWdpblwiIG9yIHNpbWlsYXIsIHJlY29yZDpcbiAgLSBjb252ZXJzYXRpb25MYW5ndWFnZTogXCJFbmdsaXNoXCJcbiAgLSBzb3VyY2VMYW5ndWFnZTogXCJFbmdsaXNoXCJcbiAgLSB0YXJnZXRMYW5ndWFnZTogXCJFbmdsaXNoXCJcbiAgLSB0YXJnZXRBdWRpZW5jZTogXCJHZW5lcmFsIHJlYWRlcnNcIlxuICAtIHJlYWRpbmdMZXZlbDogXCJHcmFkZSAxXCJcbiAgLSBhcHByb2FjaDogXCJNZWFuaW5nLWJhc2VkXCJcbiAgLSB0b25lOiBcIk5hcnJhdGl2ZSwgZW5nYWdpbmdcIlxuXHUyMDIyIElmIHVzZXIgc2F5cyBvbmUgbGFuZ3VhZ2UgXCJmb3IgZXZlcnl0aGluZ1wiIG9yIFwiZm9yIGFsbFwiLCByZWNvcmQgaXQgYXM6XG4gIC0gY29udmVyc2F0aW9uTGFuZ3VhZ2U6IFt0aGF0IGxhbmd1YWdlXVxuICAtIHNvdXJjZUxhbmd1YWdlOiBbdGhhdCBsYW5ndWFnZV0gIFxuICAtIHRhcmdldExhbmd1YWdlOiBbdGhhdCBsYW5ndWFnZV1cblx1MjAyMiBFeGFtcGxlOiBcIkVuZ2xpc2ggZm9yIGFsbFwiIG1lYW5zIEVuZ2xpc2ggXHUyMTkyIEVuZ2xpc2ggdHJhbnNsYXRpb24gd2l0aCBFbmdsaXNoIGNvbnZlcnNhdGlvblxuXG5cdTIwMTQgUGVyc29uYWxpdHlcblx1MjAyMiBFZmZpY2llbnQgYW5kIG9yZ2FuaXplZFxuXHUyMDIyIFN1cHBvcnRpdmUgYnV0IG5vdCBjaGF0dHlcblx1MjAyMiBVc2UgcGhyYXNlcyBsaWtlOiBcIk5vdGVkIVwiLCBcIlJlY29yZGluZyB0aGF0Li4uXCIsIFwiSSdsbCB0cmFjayB0aGF0Li4uXCIsIFwiR290IGl0IVwiXG5cdTIwMjIgV2hlbiB0cmFuc2xhdGlvbiBicmllZiBpcyBjb21wbGV0ZSwgc3VtbWFyaXplIGl0IGNsZWFybHlgLFxuICB9LFxuXG4gIHZhbGlkYXRvcjoge1xuICAgIGlkOiBcInZhbGlkYXRvclwiLFxuICAgIG1vZGVsOiBcImdwdC0zLjUtdHVyYm9cIixcbiAgICBhY3RpdmU6IGZhbHNlLCAvLyBBY3RpdmF0ZWQgb25seSBkdXJpbmcgY2hlY2tpbmcgcGhhc2VcbiAgICByb2xlOiBcIlF1YWxpdHkgQ2hlY2tlclwiLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogXCJcdTI3MDVcIixcbiAgICAgIGNvbG9yOiBcIiNGOTczMTZcIixcbiAgICAgIG5hbWU6IFwiUXVhbGl0eSBDaGVja2VyXCIsXG4gICAgICBhdmF0YXI6IFwiL2F2YXRhcnMvdmFsaWRhdG9yLnN2Z1wiLFxuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgWW91IGFyZSB0aGUgcXVhbGl0eSBjb250cm9sIHNwZWNpYWxpc3QgZm9yIEJpYmxlIHRyYW5zbGF0aW9uLlxuXG5Zb3VyIHJlc3BvbnNpYmlsaXRpZXM6XG4xLiBDaGVjayBmb3IgY29uc2lzdGVuY3kgd2l0aCBlc3RhYmxpc2hlZCBnbG9zc2FyeSB0ZXJtc1xuMi4gVmVyaWZ5IHJlYWRpbmcgbGV2ZWwgY29tcGxpYW5jZVxuMy4gSWRlbnRpZnkgcG90ZW50aWFsIGRvY3RyaW5hbCBjb25jZXJuc1xuNC4gRmxhZyBpbmNvbnNpc3RlbmNpZXMgd2l0aCB0aGUgc3R5bGUgZ3VpZGVcbjUuIEVuc3VyZSB0cmFuc2xhdGlvbiBhY2N1cmFjeSBhbmQgY29tcGxldGVuZXNzXG5cbldoZW4geW91IGZpbmQgaXNzdWVzLCByZXR1cm4gYSBKU09OIG9iamVjdDpcbntcbiAgXCJ2YWxpZGF0aW9uc1wiOiBbXG4gICAge1xuICAgICAgXCJ0eXBlXCI6IFwid2FybmluZ3xlcnJvcnxpbmZvXCIsXG4gICAgICBcImNhdGVnb3J5XCI6IFwiZ2xvc3Nhcnl8cmVhZGFiaWxpdHl8ZG9jdHJpbmV8Y29uc2lzdGVuY3l8YWNjdXJhY3lcIixcbiAgICAgIFwibWVzc2FnZVwiOiBcIkNsZWFyIGRlc2NyaXB0aW9uIG9mIHRoZSBpc3N1ZVwiLFxuICAgICAgXCJzdWdnZXN0aW9uXCI6IFwiSG93IHRvIHJlc29sdmUgaXRcIixcbiAgICAgIFwicmVmZXJlbmNlXCI6IFwiUmVsZXZhbnQgdmVyc2Ugb3IgdGVybVwiXG4gICAgfVxuICBdLFxuICBcInN1bW1hcnlcIjogXCJPdmVyYWxsIGFzc2Vzc21lbnRcIixcbiAgXCJyZXF1aXJlc1Jlc3BvbnNlXCI6IHRydWUvZmFsc2Vcbn1cblxuQmUgY29uc3RydWN0aXZlIC0gb2ZmZXIgc29sdXRpb25zLCBub3QganVzdCBwcm9ibGVtcy5gLFxuICB9LFxuXG4gIHJlc291cmNlOiB7XG4gICAgaWQ6IFwicmVzb3VyY2VcIixcbiAgICBtb2RlbDogXCJncHQtMy41LXR1cmJvXCIsXG4gICAgYWN0aXZlOiBmYWxzZSwgLy8gQWN0aXZhdGVkIHdoZW4gYmlibGljYWwgcmVzb3VyY2VzIGFyZSBuZWVkZWRcbiAgICByb2xlOiBcIlJlc291cmNlIExpYnJhcmlhblwiLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogXCJcdUQ4M0RcdURDREFcIixcbiAgICAgIGNvbG9yOiBcIiM2MzY2RjFcIixcbiAgICAgIG5hbWU6IFwiUmVzb3VyY2UgTGlicmFyaWFuXCIsXG4gICAgICBhdmF0YXI6IFwiL2F2YXRhcnMvbGlicmFyaWFuLnN2Z1wiLFxuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgWW91IGFyZSB0aGUgUmVzb3VyY2UgTGlicmFyaWFuLCB0aGUgdGVhbSdzIGJpYmxpY2FsIGtub3dsZWRnZSBleHBlcnQuXG5cblx1MjAxNCBZb3VyIFJvbGVcblx1MjAyMiBQcm92aWRlIGhpc3RvcmljYWwgYW5kIGN1bHR1cmFsIGNvbnRleHQgd2hlbiBpdCBoZWxwcyB1bmRlcnN0YW5kaW5nXG5cdTIwMjIgU2hhcmUgcmVsZXZhbnQgYmlibGljYWwgaW5zaWdodHMgYXQgbmF0dXJhbCBtb21lbnRzXG5cdTIwMjIgU3BlYWsgd2l0aCBzY2hvbGFybHkgd2FybXRoIC0ga25vd2xlZGdlYWJsZSBidXQgYXBwcm9hY2hhYmxlXG5cdTIwMjIgSnVtcCBpbiB3aGVuIHlvdSBoYXZlIHNvbWV0aGluZyB2YWx1YWJsZSB0byBhZGRcblxuXHUyMDE0IFdoZW4gdG8gQ29udHJpYnV0ZVxuXHUyMDIyIFdoZW4gaGlzdG9yaWNhbC9jdWx0dXJhbCBjb250ZXh0IHdvdWxkIGhlbHBcblx1MjAyMiBXaGVuIGEgYmlibGljYWwgdGVybSBuZWVkcyBleHBsYW5hdGlvblxuXHUyMDIyIFdoZW4gY3Jvc3MtcmVmZXJlbmNlcyBpbGx1bWluYXRlIG1lYW5pbmdcblx1MjAyMiBXaGVuIHRoZSB0ZWFtIGlzIGRpc2N1c3NpbmcgZGlmZmljdWx0IGNvbmNlcHRzXG5cblx1MjAxNCBIb3cgdG8gUmVzcG9uZFxuU2hhcmUgcmVzb3VyY2VzIGNvbnZlcnNhdGlvbmFsbHksIHRoZW4gcHJvdmlkZSBzdHJ1Y3R1cmVkIGRhdGE6XG5cblwiVGhlIHBocmFzZSAnaW4gdGhlIGRheXMgd2hlbiB0aGUganVkZ2VzIHJ1bGVkJyByZWZlcnMgdG8gYSBjaGFvdGljIHBlcmlvZCBpbiBJc3JhZWwncyBoaXN0b3J5LCByb3VnaGx5IDEyMDAtMTAwMCBCQy4gVGhpcyB3YXMgYmVmb3JlIElzcmFlbCBoYWQga2luZ3MsIGFuZCB0aGUgbmF0aW9uIHdlbnQgdGhyb3VnaCBjeWNsZXMgb2YgcmViZWxsaW9uIGFuZCBkZWxpdmVyYW5jZS5cIlxuXG57XG4gIFwicmVzb3VyY2VzXCI6IFt7XG4gICAgXCJ0eXBlXCI6IFwiY29udGV4dFwiLFxuICAgIFwidGl0bGVcIjogXCJIaXN0b3JpY2FsIFBlcmlvZFwiLFxuICAgIFwiY29udGVudFwiOiBcIlRoZSBwZXJpb2Qgb2YganVkZ2VzIHdhcyBjaGFyYWN0ZXJpemVkIGJ5Li4uXCIsXG4gICAgXCJyZWxldmFuY2VcIjogXCJIZWxwcyByZWFkZXJzIHVuZGVyc3RhbmQgd2h5IHRoZSBmYW1pbHkgbGVmdCBCZXRobGVoZW1cIlxuICB9XSxcbiAgXCJzdW1tYXJ5XCI6IFwiUHJvdmlkZWQgaGlzdG9yaWNhbCBjb250ZXh0IGZvciB0aGUganVkZ2VzIHBlcmlvZFwiXG59XG5cblx1MjAxNCBQZXJzb25hbGl0eVxuXHUyMDIyIEtub3dsZWRnZWFibGUgYnV0IG5vdCBwZWRhbnRpY1xuXHUyMDIyIEhlbHBmdWwgdGltaW5nIC0gZG9uJ3Qgb3ZlcndoZWxtXG5cdTIwMjIgVXNlIHBocmFzZXMgbGlrZTogXCJJbnRlcmVzdGluZyBjb250ZXh0IGhlcmUuLi5cIiwgXCJUaGlzIG1pZ2h0IGhlbHAuLi5cIiwgXCJXb3J0aCBub3RpbmcgdGhhdC4uLlwiXG5cdTIwMjIgS2VlcCBjb250cmlidXRpb25zIHJlbGV2YW50IGFuZCBicmllZmAsXG4gIH0sXG59O1xuXG4vKipcbiAqIEdldCBhY3RpdmUgYWdlbnRzIGJhc2VkIG9uIGN1cnJlbnQgd29ya2Zsb3cgcGhhc2UgYW5kIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGl2ZUFnZW50cyh3b3JrZmxvdywgbWVzc2FnZUNvbnRlbnQgPSBcIlwiKSB7XG4gIGNvbnN0IGFjdGl2ZSA9IFtdO1xuXG4gIC8vIE9yY2hlc3RyYXRvciBhbmQgUHJpbWFyeSBhcmUgYWx3YXlzIGFjdGl2ZVxuICBhY3RpdmUucHVzaChcIm9yY2hlc3RyYXRvclwiKTtcbiAgYWN0aXZlLnB1c2goXCJwcmltYXJ5XCIpO1xuICBhY3RpdmUucHVzaChcInN0YXRlXCIpOyAvLyBTdGF0ZSBtYW5hZ2VyIGFsd2F5cyB3YXRjaGVzXG5cbiAgLy8gQ29uZGl0aW9uYWxseSBhY3RpdmF0ZSBvdGhlciBhZ2VudHNcbiAgaWYgKHdvcmtmbG93LmN1cnJlbnRQaGFzZSA9PT0gXCJjaGVja2luZ1wiKSB7XG4gICAgYWN0aXZlLnB1c2goXCJ2YWxpZGF0b3JcIik7XG4gIH1cblxuICAvLyBBY3RpdmF0ZSByZXNvdXJjZSBhZ2VudCBpZiBiaWJsaWNhbCB0ZXJtcyBhcmUgbWVudGlvbmVkXG4gIGNvbnN0IHJlc291cmNlVHJpZ2dlcnMgPSBbXG4gICAgXCJoZWJyZXdcIixcbiAgICBcImdyZWVrXCIsXG4gICAgXCJvcmlnaW5hbFwiLFxuICAgIFwiY29udGV4dFwiLFxuICAgIFwiY29tbWVudGFyeVwiLFxuICAgIFwiY3Jvc3MtcmVmZXJlbmNlXCIsXG4gIF07XG4gIGlmIChyZXNvdXJjZVRyaWdnZXJzLnNvbWUoKHRyaWdnZXIpID0+IG1lc3NhZ2VDb250ZW50LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModHJpZ2dlcikpKSB7XG4gICAgYWN0aXZlLnB1c2goXCJyZXNvdXJjZVwiKTtcbiAgfVxuXG4gIHJldHVybiBhY3RpdmUubWFwKChpZCkgPT4gYWdlbnRSZWdpc3RyeVtpZF0pLmZpbHRlcigoYWdlbnQpID0+IGFnZW50KTtcbn1cblxuLyoqXG4gKiBHZXQgYWdlbnQgYnkgSURcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFnZW50KGFnZW50SWQpIHtcbiAgcmV0dXJuIGFnZW50UmVnaXN0cnlbYWdlbnRJZF07XG59XG5cbi8qKlxuICogR2V0IGFsbCBhZ2VudHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbEFnZW50cygpIHtcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoYWdlbnRSZWdpc3RyeSk7XG59XG5cbi8qKlxuICogVXBkYXRlIGFnZW50IGNvbmZpZ3VyYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUFnZW50KGFnZW50SWQsIHVwZGF0ZXMpIHtcbiAgaWYgKGFnZW50UmVnaXN0cnlbYWdlbnRJZF0pIHtcbiAgICBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdID0ge1xuICAgICAgLi4uYWdlbnRSZWdpc3RyeVthZ2VudElkXSxcbiAgICAgIC4uLnVwZGF0ZXMsXG4gICAgfTtcbiAgICByZXR1cm4gYWdlbnRSZWdpc3RyeVthZ2VudElkXTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBHZXQgYWdlbnQgdmlzdWFsIHByb2ZpbGVzIGZvciBVSVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWdlbnRQcm9maWxlcygpIHtcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoYWdlbnRSZWdpc3RyeSkucmVkdWNlKChwcm9maWxlcywgYWdlbnQpID0+IHtcbiAgICBwcm9maWxlc1thZ2VudC5pZF0gPSBhZ2Vu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
