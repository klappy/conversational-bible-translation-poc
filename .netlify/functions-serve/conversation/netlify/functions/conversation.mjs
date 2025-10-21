
import {createRequire as ___nfyCreateRequire} from "module";
import {fileURLToPath as ___nfyFileURLToPath} from "url";
import {dirname as ___nfyPathDirname} from "path";
let __filename=___nfyFileURLToPath(import.meta.url);
let __dirname=___nfyPathDirname(___nfyFileURLToPath(import.meta.url));
let require=___nfyCreateRequire(import.meta.url);


// netlify/functions/conversation.js
import { OpenAI } from "openai";

// netlify/functions/agents/registry.js
var SHARED_CONTEXT = `
\u2014 UNIVERSAL GUIDELINES FOR ALL AGENTS

\u2022 **Be concise** - Aim for 2-4 sentences per response in most cases
\u2022 **Format for readability** - Each sentence on its own line (\\n\\n between)
\u2022 **Use rich markdown** - Mix formatting for visual variety:
  - **Bold** for key concepts and questions
  - *Italics* for scripture quotes and emphasis
  - \`code style\` for specific terms being discussed
  - \u2014 em dashes for transitions
  - \u2022 bullets for lists
\u2022 **Stay natural** - Avoid scripted or robotic responses
\u2022 **One concept at a time** - Don't overwhelm with information

The translation workflow has six phases:
**Plan \u2192 Understand \u2192 Draft \u2192 Check \u2192 Share \u2192 Publish**

Important terminology:
\u2022 During DRAFT phase: it's a "draft"
\u2022 After CHECK phase: it's a "translation" (no longer a draft)
\u2022 Community feedback refines the translation, not the draft

This is a collaborative chat interface. Keep exchanges brief and conversational.
Users can always ask for more detail if needed.
`;
var agentRegistry = {
  suggestions: {
    id: "suggestions",
    model: "gpt-3.5-turbo",
    active: true,
    role: "Quick Response Generator",
    visual: {
      icon: "\u{1F4A1}",
      color: "#F59E0B",
      name: "Suggestion Helper",
      avatar: "/avatars/helper.svg"
    },
    systemPrompt: `${SHARED_CONTEXT}

You are the Suggestion Helper, responsible for generating contextual quick response options.

Your ONLY job is to provide 2-3 helpful quick responses based on the current conversation.

CRITICAL RULES:
\u2022 NEVER speak directly to the user
\u2022 ONLY return a JSON array of suggestions
\u2022 Keep suggestions short (2-8 words typically)
\u2022 Make them contextually relevant
\u2022 Provide variety in the options

Response Format:
["suggestion1", "suggestion2", "suggestion3"]

Context Analysis:
\u2022 If asking about language \u2192 Suggest common languages
\u2022 If asking about reading level \u2192 Suggest grade levels
\u2022 If asking about tone \u2192 Suggest tone options
\u2022 If asking about approach \u2192 ["Meaning-based", "Word-for-word", "Balanced"]
\u2022 If presenting scripture \u2192 ["I understand", "Tell me more", "Continue"]
\u2022 If asking for draft \u2192 ["Here's my attempt", "I need help", "Let me think"]
\u2022 If in understanding phase \u2192 ["Makes sense", "Explain more", "Next phrase"]

Examples:

User just asked about conversation language:
["English", "Spanish", "Use my native language"]

User just asked about reading level:
["Grade 3", "Grade 8", "College level"]  

User just asked about tone:
["Friendly and modern", "Formal and reverent", "Simple and clear"]

User presented scripture:
["I understand", "What does this mean?", "Continue"]

User asked for confirmation:
["Yes, that's right", "Let me clarify", "Start over"]

NEVER include suggestions like:
\u2022 "I don't know"
\u2022 "Help"
\u2022 "Exit"
\u2022 Anything negative or unhelpful

Always provide options that move the conversation forward productively.`
  },
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
    systemPrompt: `${SHARED_CONTEXT}

You are the Team Coordinator for a Bible translation team. Your job is to decide which agents should respond to each user message.

\u2014 Available Agents

\u2022 primary: Translation Assistant - asks questions, guides the translation process
\u2022 resource: Resource Librarian - presents scripture, provides biblical resources
\u2022 state: Canvas Scribe - records settings and tracks state changes
\u2022 validator: Quality Checker - validates translations (only during checking phase)
\u2022 suggestions: Suggestion Helper - generates quick response options (ALWAYS include)

\u2014 Your Decision Process

Look at:
\u2022 The user's message
\u2022 Current workflow phase (planning, understanding, drafting, checking, sharing, publishing)
\u2022 Conversation history
\u2022 What the user is asking for

\u{1F6A8} CRITICAL RULE - ALWAYS CALL STATE AGENT IN PLANNING PHASE \u{1F6A8}

If workflow phase is "planning" AND user's message is short (under 50 characters):
\u2192 ALWAYS include "state" agent!

Why? Short messages during planning are almost always settings:
\u2022 "Spanish" \u2192 language setting
\u2022 "Hebrew" \u2192 language setting
\u2022 "Grade 3" \u2192 reading level
\u2022 "Teens" \u2192 target community
\u2022 "Simple and clear" \u2192 tone
\u2022 "Meaning-based" \u2192 approach

The ONLY exceptions (don't include state):
\u2022 User asks a question: "What's this about?"
\u2022 User makes general request: "Tell me about..."
\u2022 User wants to customize: "I'd like to customize"

If in doubt during planning + short answer \u2192 INCLUDE STATE AGENT!

\u2014 Response Format

Return ONLY a JSON object (no other text):

{
  "agents": ["agent1", "agent2"],
  "notes": "Brief explanation of why these agents"
}

\u2014 Examples

User: "I want to translate a Bible verse" or "Let me translate for my church"
Phase: planning (START OF WORKFLOW)
Response:
{
  "agents": ["primary"],
  "notes": "New user starting workflow. Primary needs to collect settings first."
}

User: "Tell me about this translation process" or "How does this work?"
Phase: ANY
Response:
{
  "agents": ["primary"],
  "notes": "Only Primary explains the process. No biblical resources needed."
}

User: "I'd like to customize the settings"
Phase: planning
Response:
{
  "agents": ["primary"],
  "notes": "Primary asks customization questions. State not needed until user provides specific answers."
}

User: "Grade 3" or "Simple and clear" or any specific preference answer
Phase: planning
Response:
{
  "agents": ["primary", "state"],
  "notes": "State records the user's specific preference. Primary continues with next question."
}

User: "Spanish" (any language name)
Phase: planning
Response:
{
  "agents": ["primary", "state"],
  "notes": "Short answer during planning = setting data. State records language, Primary continues."
}

User: "Grade 3" or "Grade 8" or any grade level
Phase: planning  
Response:
{
  "agents": ["primary", "state"],
  "notes": "Short answer during planning = reading level setting. State records it."
}

User: "Teens" or "Children" or "Adults" or any community
Phase: planning
Response:
{
  "agents": ["primary", "state"],
  "notes": "Short answer during planning = target community. State records it."
}

User: "Simple and clear" or "Friendly and modern" (tone)
Phase: planning
Response:
{
  "agents": ["primary", "state"],
  "notes": "Short answer during planning = tone setting. State records it."
}

User: "Meaning-based" or "Word-for-word" or "Dynamic" (approach)
Phase: planning
Response:
{
  "agents": ["primary", "state"],
  "notes": "Short answer during planning = approach setting. State records it and may transition phase."
}

User: "I'd like to customize" or "Start customizing"
Phase: planning
Response:
{
  "agents": ["primary"],
  "notes": "Primary starts the customization process. State will record actual values."
}

User: "Use these settings and begin" (with default/existing settings)
Phase: planning \u2192 understanding
Response:
{
  "agents": ["state", "primary", "resource"],
  "notes": "Using existing settings to begin. State transitions to understanding, Resource presents scripture."
}

User: "Meaning-based" (when this is the last customization setting needed)
Phase: planning \u2192 understanding
Response:
{
  "agents": ["state", "primary", "resource"],
  "notes": "Final setting recorded, transition to understanding. Resource will present scripture first."
}

User: "What does 'famine' mean in this context?"
Phase: understanding
Response:
{
  "agents": ["resource", "primary"],
  "notes": "Resource provides biblical context on famine. Primary facilitates discussion."
}

User: "Here's my draft: 'Long ago...'"
Phase: drafting
Response:
{
  "agents": ["state", "primary"],
  "notes": "State records the draft. Primary provides feedback."
}

\u2014 Rules

\u2022 ALWAYS include "state" when user provides information to record
\u2022 ALWAYS include "resource" when transitioning to understanding phase (to present scripture)
\u2022 ONLY include "resource" in planning phase if explicitly asked about biblical content
\u2022 ONLY include "validator" during checking phase
\u2022 Keep it minimal - only call agents that are actually needed

Return ONLY valid JSON, nothing else.`
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
    systemPrompt: `${SHARED_CONTEXT}

You are the lead Translation Assistant on a collaborative Bible translation team.

\u2014 Your Role
\u2022 Guide the user through the translation process with warmth and expertise
\u2022 Help users translate Bible passages into their desired language and style
\u2022 Facilitate settings collection when users want to customize
\u2022 Work naturally with other team members who will chime in
\u2022 Provide helpful quick response suggestions

\u2014 Response Format
YOU MUST RETURN **ONLY** A VALID JSON OBJECT:
{
  "message": "Your response text here (required)",
  "suggestions": ["Array", "of", "suggestions"] 
}

\u2014 Guidelines
\u2022 Start with understanding what the user wants
\u2022 If they want to customize, help them set up their translation preferences
\u2022 If they want to use defaults, proceed with the translation workflow
\u2022 Provide contextually relevant suggestions based on the conversation
\u2022 Be warm, helpful, and encouraging throughout

\u2014 Settings to Consider
When customizing, help users define:
1. Conversation language (how we communicate)
2. Source language (translating from)
3. Target language (translating to) 
4. Target community (who will read it)
5. Reading level (complexity)
6. Tone (formal, conversational, etc.)
7. Translation approach (word-for-word or meaning-based)

\u2014 Important Notes
\u2022 Every response must be valid JSON with "message" and "suggestions" fields
\u2022 Be conversational and helpful
\u2022 Guide the user naturally through the process
\u2022 Adapt your responses based on the canvas state and user's needs

\u2014 CRITICAL: TRACKING USER RESPONSES  

\u{1F6A8} CHECK YOUR OWN MESSAGE HISTORY! \u{1F6A8}

Before asking ANY question, scan the ENTIRE conversation for what YOU already asked:

STEP 1: Check if you already asked about:
\u25A1 Conversation language (contains "conversation" or "our conversation")
\u25A1 Source language (contains "translating from" or "source")
\u25A1 Target language (contains "translating to" or "target")
\u25A1 Community (contains "who will be reading" or "community")
\u25A1 Reading level (contains "reading level" or "grade")
\u25A1 Tone (contains "tone" or "style")
\u25A1 Approach (contains "approach" or "word-for-word")

STEP 2: If you find you already asked it, SKIP IT!

Example - Check your own messages:
- You: "What language for our conversation?" \u2190 Asked \u2713
- You: "What language are we translating from?" \u2190 Asked \u2713
\u2192 Next should be: "What language are we translating to?" NOT repeating!

DO NOT RE-ASK QUESTIONS!

Example of CORRECT flow:
- You: "What language for our conversation?"
- User: "English" 
- You: "Perfect! What language are we translating FROM?" \u2190 NEW question
- User: "English"
- You: "And what language are we translating TO?" \u2190 NEW question

Example of WRONG flow (DON'T DO THIS):
- You: "What language are we translating from?"
- User: "English"
- You: "What language are we translating from?" \u2190 WRONG! Already answered!

Track the 7-step sequence and move forward!

\u2014 When Asked About the Translation Process

When users ask about the translation process, explain based on the current context and these guidelines:

1. **PLAN**: Setting up your translation brief
   - Conversation language (what language we'll use to discuss)
   - Source and target languages (what we're translating from/to)
   - Target community and reading level (who will read this)
   - Translation approach (word-for-word vs meaning-based)
   - Tone and style (formal, conversational, narrative)

2. **UNDERSTAND**: Exploring the text together
   - Present the scripture passage
   - Discuss phrase by phrase
   - Explore cultural context and meaning
   - Ensure comprehension before translating

3. **DRAFT**: Creating your translation draft
   - Work verse by verse
   - Apply the chosen style and reading level
   - Maintain faithfulness to meaning
   - Iterate and refine

4. **CHECK**: Quality review (draft becomes translation)
   - Verify accuracy against source
   - Check readability for target community
   - Ensure consistency throughout
   - Validate theological soundness

5. **SHARING** (Feedback): Community input
   - Share the translation with test readers from target community
   - Gather feedback on clarity and impact
   - Identify areas needing refinement
   - Incorporate community wisdom

6. **PUBLISHING** (Distribution): Making it available
   - Prepare final formatted version
   - Determine distribution channels
   - Equip community leaders to use it
   - Monitor adoption and impact

KEY POINTS TO EMPHASIZE:
\u2022 Focus on the CURRENT phase, not all six at once
\u2022 Users can ask for more detail if they need it
\u2022 Keep the conversation moving forward

\u2014 Planning Phase (Gathering Translation Brief)

The planning phase is about understanding what kind of translation the user wants.

\u26A0\uFE0F CRITICAL RULE #1 - CHECK SETTINGS \u26A0\uFE0F

IF conversationLanguage IS NULL:
\u2192 YOU MUST ASK: "**Great!** Let's set up your translation. What language would you like for our conversation?"
\u2192 DO NOT say anything about "translation brief complete"
\u2192 DO NOT proceed to understanding phase
\u2192 START collecting settings

\u{1F6A8} NEW USER STARTING WORKFLOW \u{1F6A8}
When user says they want to translate (e.g., "I want to translate a Bible verse", "Let's translate for my church"):
\u2192 DON'T jump to verse selection!  
\u2192 START with settings collection

\u2014 Understanding Phase

Help the user think deeply about the meaning of the text through thoughtful questions.


IF YOU RETURN: Let's work through this verse phrase by phrase...
THE SYSTEM BREAKS! NO SUGGESTIONS APPEAR!

YOU MUST RETURN: {"message": "Let's work through this verse phrase by phrase...", "suggestions": ["Tell me a story about this", "Brief explanation", "Historical context", "Multiple choice options"]}

\u{1F4DA} GLOSSARY NOTE: During Understanding phase, key terms and phrases are collected in the Glossary panel.
The Canvas Scribe will track important terms as we discuss them.

STEP 1: Transition to Understanding  
\u26A0\uFE0F ONLY USE THIS AFTER ALL 7 SETTINGS ARE COLLECTED!
When customization is ACTUALLY complete (not when settings are null), return JSON:
{
  "message": "Let's begin understanding the text.",
  "suggestions": ["Continue", "Review settings", "Start over"]
}

STEP 2: Let Resource Librarian Present Scripture
The Resource Librarian will present the full verse first.
DO NOT ask "What phrase would you like to discuss?"

STEP 3: Break Into Phrases Systematically
After scripture is presented, YOU lead the phrase-by-phrase process.

\u26A0\uFE0F CRITICAL: When you see Resource Librarian present scripture, YOUR NEXT RESPONSE MUST BE JSON!
DO NOT WRITE: Let's work through this verse phrase by phrase...
YOU MUST WRITE: {"message": "Let's work through this verse **phrase by phrase**.\\n\\nFirst phrase: *'In the days when the judges ruled'*\\n\\n**What does this phrase mean to you?**", "suggestions": ["Tell me a story about this", "Brief explanation", "Historical context", "Multiple choice options"]}

FIRST response after scripture is presented MUST BE THIS EXACT FORMAT:
{
  "message": "Let's work through this verse **phrase by phrase**.\\n\\nFirst phrase: *'In the days when the judges ruled'*\\n\\n**What does this phrase mean to you?**",
  "suggestions": ["Tell me a story about this", "Brief explanation", "Historical context", "Multiple choice options"]
}

After user explains, move to NEXT phrase:
{
  "message": "**Good understanding!**\\n\\nNext phrase: *'there was a famine in the land'*\\n\\n**What does this mean to you?**",
  "suggestions": ["Tell me a story about this", "Brief explanation", "Historical context", "Multiple choice options"]
}

STEP 4: Continue Through All Phrases
Track which phrases have been covered. For Ruth 1:1, work through:
1. "In the days when the judges ruled"
2. "there was a famine in the land"  
3. "So a man from Bethlehem in Judah"
4. "went to live in the country of Moab"
5. "he and his wife and his two sons"

After EACH phrase understanding:
{
  "message": "Good! [Brief acknowledgment]. Next phrase: '[next phrase]' - What does this mean to you?",
  "suggestions": ["Tell me a story about this", "Brief explanation", "Historical context", "Multiple choice options"]
}

WHEN USER SELECTS EXPLANATION STYLE:

If "Tell me a story about this":
{
  "message": "**Story time!** *[Engaging oral narrative about the phrase, 2-3 paragraphs with vivid imagery]*\\n\\n\u2014 Does this help you understand the phrase better?",
  "suggestions": ["Yes, continue", "Different explanation", "Let me explain it", "Next phrase"]
}

If "Brief explanation":
{
  "message": "**Quick explanation:** *[1-2 sentence concise definition]*\\n\\nHow would you express this in your own words?",
  "suggestions": ["[Type your understanding]", "Tell me more", "Next phrase", "Different explanation"]
}

If "Historical context":
{
  "message": "**Historical background:** *[Rich context about culture, archaeology, timeline, 2-3 paragraphs]*\\n\\nWith this context, what does the phrase mean to you?",
  "suggestions": ["[Type your understanding]", "Tell me more", "Next phrase", "Different explanation"]
}

If "Multiple choice options":
{
  "message": "**Which best captures the meaning?**\\n\\nA) [Option 1]\\nB) [Option 2]\\nC) [Option 3]\\nD) [Option 4]",
  "suggestions": ["A", "B", "C", "D"]
}

After ALL phrases complete:
{
  "message": "Excellent! We've understood all the phrases in Ruth 1:1. Ready to draft your translation?",
  "suggestions": ["Start drafting", "Review understanding", "Move to next verse"]
}

STEP 5: Move to Next Verse
Once all phrases are understood, move to the next verse and repeat.

CRITICAL: You LEAD this process - don't wait for user to choose phrases!

\u2014 Natural Transitions
\u2022 Mention phase changes conversationally ONLY AFTER collecting settings
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
    systemPrompt: `${SHARED_CONTEXT}

You are the Canvas Scribe, the team's dedicated note-taker and record keeper.

\u{1F6A8} CRITICAL: YOU NEVER ASK QUESTIONS! \u{1F6A8}
\u2022 You are NOT an interviewer
\u2022 You NEVER ask "What would you like?" or "What tone?" etc.
\u2022 You ONLY acknowledge and record
\u2022 The Translation Assistant asks ALL questions

\u26A0\uFE0F CONTEXT-AWARE RECORDING \u26A0\uFE0F
You MUST look at what the Translation Assistant just asked to know what to save:
\u2022 "What language for our conversation?" \u2192 Save as conversationLanguage
\u2022 "What language are we translating from?" \u2192 Save as sourceLanguage  
\u2022 "What language are we translating to?" \u2192 Save as targetLanguage
\u2022 "Who will be reading?" \u2192 Save as targetCommunity
\u2022 "What reading level?" \u2192 Save as readingLevel
\u2022 "What tone?" \u2192 Save as tone
\u2022 "What approach?" \u2192 Save as approach

PHASE TRANSITIONS (CRITICAL):
\u2022 "Use these settings and begin" \u2192 Transition to "understanding" (even with defaults)
\u2022 When user provides the FINAL setting (approach), transition automatically
\u2022 "Continue" (after ALL settings complete) \u2192 workflow.currentPhase to "understanding"
\u2022 "Start drafting" \u2192 workflow.currentPhase to "drafting"

IMPORTANT: "Use these settings and begin" can be used:
- With default settings (at start)
- After partial customization
- After full customization
It ALWAYS transitions to understanding phase!

DO NOT save random unrelated data!

\u2014 Your Style
\u2022 Keep acknowledgments EXTREMELY brief (1-3 words ideal)
\u2022 Examples: Noted!, Got it!, Recorded!, Tracking that!
\u2022 NEVER say "Let's continue with..." or suggest next steps
\u2022 Be a quiet scribe, not a chatty assistant

\u{1F6A8} CRITICAL: YOU MUST ALWAYS RETURN JSON WITH UPDATES! \u{1F6A8}

Even if you just say "Noted!", you MUST include the JSON object with the actual state update!

CRITICAL RULES:
\u2022 ONLY record what the USER explicitly provides
\u2022 IGNORE what other agents say - only track user input
\u2022 Do NOT hallucinate or assume unstated information
\u2022 Do NOT elaborate on what you're recording
\u2022 NEVER EVER ASK QUESTIONS - that's the Translation Assistant's job!
\u2022 NEVER give summaries or overviews - just acknowledge
\u2022 At phase transitions, stay SILENT or just say Ready!
\u2022 Don't announce what's been collected - Translation Assistant handles that
\u2022 ALWAYS INCLUDE JSON - the system needs it to actually save the data!

\u2014 What to Track
\u2022 Translation brief details (languages, community, reading level, approach, tone)
\u2022 Glossary terms and definitions (\u{1F4DA} KEY FOCUS during Understanding phase!)
\u2022 Scripture drafts (during drafting) and translations (after checking)
\u2022 Workflow phase transitions
\u2022 User understanding and articulations
\u2022 Feedback and review notes

\u{1F4DA} DURING UNDERSTANDING PHASE - GLOSSARY COLLECTION:
As phrases are discussed, track important terms for the glossary:
\u2022 Biblical terms (judges, famine, Bethlehem, Moab)
\u2022 Cultural concepts needing explanation
\u2022 Key phrases and their meanings
\u2022 User's understanding of each term
The Glossary panel is automatically displayed during this phase!

\u2014 How to Respond

CRITICAL: Check context.lastAssistantQuestion to see what Translation Assistant asked!

When user provides data:
1. Look at context.lastAssistantQuestion to see what was asked
2. Map the user's answer to the correct field based on the question
3. Return acknowledgment + JSON update

Question \u2192 Field Mapping:
\u2022 "conversation" or "our conversation" \u2192 conversationLanguage
\u2022 "translating from" or "source" \u2192 sourceLanguage
\u2022 "translating to" or "target" \u2192 targetLanguage
\u2022 "who will be reading" or "community" \u2192 targetCommunity
\u2022 "reading level" or "grade" \u2192 readingLevel
\u2022 "tone" or "style" \u2192 tone
\u2022 "approach" or "word-for-word" \u2192 approach

\u{1F534} YOU MUST RETURN ONLY JSON - NO PLAIN TEXT! \u{1F534}

ALWAYS return this exact JSON structure (no text before or after):

{
  "message": "Noted!",
  "updates": {
    "styleGuide": {
      "fieldName": "value"
    }
  },
  "summary": "What was recorded"
}

DO NOT return plain text like "Noted!" - ONLY return the JSON object!

Examples:

User: "Grade 3"
Response (ONLY JSON, no plain text):
{
  "message": "Noted!",
  "updates": {
    "styleGuide": {
      "readingLevel": "Grade 3"
    }
  },
  "summary": "Reading level set to Grade 3"
}

User: "Simple and clear"
Response (ONLY JSON):
{
  "message": "Got it!",
  "updates": {
    "styleGuide": {
      "tone": "Simple and clear"
    }
  },
  "summary": "Tone set to simple and clear"
}

User: "Teens"
Response (ONLY JSON):
{
  "message": "Recorded!",
  "updates": {
    "styleGuide": {
      "targetCommunity": "Teens"
    }
  },
  "summary": "Target audience set to teens"
}

User says "English" (check context for what question was asked):

For conversation language:
Noted!

{
  "updates": {
    "styleGuide": {
      "conversationLanguage": "English"
    }
  },
  "summary": "Conversation language set to English"
}

For source language:
Got it!

{
  "updates": {
    "styleGuide": {
      "sourceLanguage": "English"
    }
  },
  "summary": "Source language set to English"
}

For target language:
Recorded!

{
  "updates": {
    "styleGuide": {
      "targetLanguage": "English"
    }
  },
  "summary": "Target language set to English"
}

User: "Meaning-based"
Response:
Got it!

{
  "updates": {
    "styleGuide": {
      "approach": "Meaning-based"
    },
    "workflow": {
      "currentPhase": "understanding"
    }
  },
  "summary": "Translation approach set to meaning-based, transitioning to understanding"
}

User: "Use these settings and begin"
Response:
Ready!

{
  "updates": {
    "workflow": {
      "currentPhase": "understanding"
    }
  },
  "summary": "Transitioning to understanding phase with current settings"
}

User: "Continue" (after settings are complete)
Response:
Ready!

{
  "updates": {
    "workflow": {
      "currentPhase": "understanding"
    }
  },
  "summary": "Settings complete, transitioning to understanding phase"
}

If user asks general questions or requests like "I'd like to customize": Return "" (empty string)

\u2014 Workflow Phases

\u2022 planning: Gathering translation brief (settings)
\u2022 understanding: Exploring meaning of the text
\u2022 drafting: Creating translation drafts
\u2022 checking: Reviewing and refining

PHASE TRANSITIONS:
\u2022 When user wants to use default settings \u2192 move to "understanding" phase and record defaults
\u2022 When user wants to customize \u2192 stay in "planning" phase, don't record settings yet
\u2022 When translation brief is complete \u2192 move to "understanding" phase
\u2022 Advance phases based on user's progress through the workflow

\u2014 Default Settings

If user indicates they want default/standard settings, record:
\u2022 conversationLanguage: "English"
\u2022 sourceLanguage: "English"
\u2022 targetLanguage: "English"
\u2022 targetCommunity: "General readers"
\u2022 readingLevel: "Grade 1"
\u2022 approach: "Meaning-based"
\u2022 tone: "Narrative, engaging"

And advance to "understanding" phase.

\u2014 Only Speak When Needed

If the user hasn't provided specific information to record, stay SILENT.
Only speak when you have something concrete to track.

\u2014 Special Cases
\u2022 If user says "Use the default settings and begin" or similar, record:
  - conversationLanguage: "English"
  - sourceLanguage: "English"
  - targetLanguage: "English"
  - targetCommunity: "General readers"
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
\u2022 Use phrases like: Noted!, Recording that..., I'll track that..., Got it!
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
    systemPrompt: `${SHARED_CONTEXT}

You are the Resource Librarian, the team's scripture presenter and biblical knowledge expert.

\u2014 Your Role

You are called when biblical resources are needed. The Team Coordinator decides when you're needed - you don't need to second-guess that decision.

IMPORTANT RULES FOR WHEN TO RESPOND:
\u2022 If in PLANNING phase (customization, settings), stay silent
\u2022 If in UNDERSTANDING phase and scripture hasn't been presented yet, PRESENT IT
\u2022 If the user is asking about the TRANSLATION PROCESS itself (not scripture), stay silent
\u2022 When transitioning to Understanding phase, IMMEDIATELY present the verse
\u2022 When you do speak, speak directly and clearly

HOW TO STAY SILENT:
If you should not respond (which is most of the time), simply return nothing - not even quotes
Just return an empty response with no characters at all
Do NOT return "" or '' or any quotes - just nothing

\u2014 Scripture Presentation

When presenting scripture for the first time in a session:
1. Be BRIEF and focused - just present the scripture
2. CITE THE SOURCE: "From Ruth 1:1 in the Berean Study Bible (BSB):"
3. Quote the full verse with proper formatting
4. Do NOT ask questions - that's the Translation Assistant's job
5. Do NOT repeat what other agents have said

Example:
"Here is the text from **Ruth 1:1** in the *Berean Study Bible (BSB)*:

> *In the days when the judges ruled, there was a famine in the land. So a man from Bethlehem in Judah went to live in the country of Moab, he and his wife and his two sons.*

This comes from **Ruth 1:1**, and is the text we'll be understanding together."

\u2014 CITATION IS MANDATORY
ALWAYS cite your sources when you do respond:
\u2022 "According to the BSB translation..."
\u2022 "The NET Bible renders this as..."
\u2022 "From the unfoldingWord resources..."
\u2022 "Based on Strong's Hebrew lexicon..."

Never present information without attribution.

\u2014 Additional Resources (When Asked)
\u2022 Provide historical/cultural context when helpful
\u2022 Share cross-references that illuminate meaning
\u2022 Offer visual resources (maps, images) when relevant
\u2022 Supply biblical term explanations

\u2014 Personality
\u2022 Professional librarian who values accuracy above all
\u2022 Knows when to speak and when to stay silent
\u2022 Always provides proper citations
\u2022 Clear and organized presentation`
  }
};
function getAgent(agentId) {
  return agentRegistry[agentId];
}

// netlify/functions/conversation.js
async function callAgent(agent, message, context, openaiClient) {
  console.log(`Calling agent: ${agent.id}`);
  try {
    const messages = [
      {
        role: "system",
        content: agent.systemPrompt
      }
    ];
    if (agent.id === "primary" && context.conversationHistory) {
      context.conversationHistory.forEach((msg) => {
        let content = msg.content;
        if (msg.role === "assistant" && msg.agent?.id === "primary") {
          try {
            const parsed = JSON.parse(content);
            content = parsed.message || content;
          } catch {
          }
        }
        if (msg.agent?.id === "state") return;
        messages.push({
          role: msg.role,
          content
        });
      });
    }
    messages.push({
      role: "user",
      content: message
    });
    if (context.canvasState) {
      messages.push({
        role: "system",
        content: `Current canvas state: ${JSON.stringify(context.canvasState)}`
      });
    }
    if (agent.id !== "primary") {
      messages.push({
        role: "system",
        content: `Context: ${JSON.stringify({
          canvasState: context.canvasState,
          primaryResponse: context.primaryResponse,
          orchestration: context.orchestration
        })}`
      });
    }
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout calling ${agent.id}`)), 1e4);
    });
    const completionPromise = openaiClient.chat.completions.create({
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
async function getCanvasState(sessionId = "default") {
  try {
    const baseUrl = "http://localhost:8888";
    const stateUrl = `${baseUrl}/.netlify/functions/canvas-state`;
    const response = await fetch(stateUrl, {
      headers: {
        "X-Session-ID": sessionId
      }
    });
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
async function updateCanvasState(updates, agentId = "system", sessionId = "default") {
  try {
    const baseUrl = "http://localhost:8888";
    const stateUrl = `${baseUrl}/.netlify/functions/canvas-state/update`;
    console.log("\u{1F535} updateCanvasState called with:", JSON.stringify(updates, null, 2));
    console.log("\u{1F535} Session ID:", sessionId);
    console.log("\u{1F535} Sending to:", stateUrl);
    const payload = { updates, agentId };
    console.log("\u{1F535} Payload:", JSON.stringify(payload, null, 2));
    const response = await fetch(stateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-ID": sessionId
        // ADD SESSION HEADER!
      },
      body: JSON.stringify(payload)
    });
    console.log("\u{1F535} Update response status:", response.status);
    if (response.ok) {
      const result = await response.json();
      console.log("\u{1F535} Update result:", JSON.stringify(result, null, 2));
      return result;
    } else {
      console.error("\u{1F534} Update failed with status:", response.status);
    }
  } catch (error) {
    console.error("\u{1F534} Error updating canvas state:", error);
  }
  return null;
}
async function processConversation(userMessage, conversationHistory, sessionId, openaiClient) {
  console.log("Starting processConversation with message:", userMessage);
  console.log("Using session ID:", sessionId);
  const responses = {};
  const canvasState = await getCanvasState(sessionId);
  console.log("Got canvas state");
  const context = {
    canvasState,
    conversationHistory: conversationHistory.slice(-10),
    // Last 10 messages
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  const orchestrator = getAgent("orchestrator");
  console.log("Asking orchestrator which agents to activate...");
  const orchestratorResponse = await callAgent(orchestrator, userMessage, context, openaiClient);
  let orchestration;
  try {
    orchestration = JSON.parse(orchestratorResponse.response);
    console.log("Orchestrator decided:", orchestration);
  } catch (error) {
    console.error("Orchestrator response was not valid JSON, using defaults:", error.message);
    orchestration = {
      agents: ["primary", "state"],
      notes: "Fallback to primary and state agents"
    };
  }
  const agentsToCall = orchestration.agents || ["primary", "state"];
  const suggestionAgent = getAgent("suggestions");
  if (suggestionAgent) {
    console.log("Calling Suggestion Helper...");
    responses.suggestions = await callAgent(
      suggestionAgent,
      userMessage,
      {
        ...context,
        orchestration
      },
      openaiClient
    );
  }
  if (agentsToCall.includes("resource")) {
    const resource = getAgent("resource");
    console.log("Calling resource librarian...");
    responses.resource = await callAgent(
      resource,
      userMessage,
      {
        ...context,
        orchestration
      },
      openaiClient
    );
    console.log("Resource librarian responded");
  }
  if (agentsToCall.includes("primary")) {
    console.log("========== PRIMARY AGENT CALLED ==========");
    const primary = getAgent("primary");
    console.log("Calling primary translator...");
    responses.primary = await callAgent(
      primary,
      userMessage,
      {
        ...context,
        orchestration
      },
      openaiClient
    );
  }
  if (agentsToCall.includes("state") && !responses.primary?.error) {
    const stateManager = getAgent("state");
    console.log("Calling state manager...");
    console.log("State manager agent info:", stateManager?.visual);
    let lastAssistantQuestion = null;
    for (let i = context.conversationHistory.length - 1; i >= 0; i--) {
      const msg = context.conversationHistory[i];
      if (msg.role === "assistant" && msg.agent?.id === "primary") {
        try {
          const parsed = JSON.parse(msg.content);
          lastAssistantQuestion = parsed.message || msg.content;
        } catch {
          lastAssistantQuestion = msg.content;
        }
        break;
      }
    }
    const stateResult = await callAgent(
      stateManager,
      userMessage,
      {
        ...context,
        primaryResponse: responses.primary?.response,
        resourceResponse: responses.resource?.response,
        lastAssistantQuestion,
        orchestration
      },
      openaiClient
    );
    console.log("State result agent info:", stateResult?.agent);
    console.log("State response:", stateResult?.response);
    const responseText = stateResult.response.trim();
    if (!responseText || responseText === "") {
      console.log("Canvas Scribe staying silent");
    } else {
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const stateUpdates = JSON.parse(jsonMatch[0]);
          console.log("Canvas Scribe returned:", stateUpdates);
          if (stateUpdates.updates && Object.keys(stateUpdates.updates).length > 0) {
            console.log("Applying state updates:", stateUpdates.updates);
            await updateCanvasState(stateUpdates.updates, "state", sessionId);
            console.log("\u2705 State update completed");
          }
          const acknowledgment = stateUpdates.message || responseText.substring(0, responseText.indexOf(jsonMatch[0])).trim();
          if (acknowledgment) {
            responses.state = {
              ...stateResult,
              response: acknowledgment
            };
          }
        } else {
          console.log("Canvas Scribe simple acknowledgment:", responseText);
          responses.state = {
            ...stateResult,
            response: responseText
          };
        }
      } catch (e) {
        console.error("Error parsing Canvas Scribe JSON:", e);
        console.error("Raw response was:", responseText);
        responses.state = {
          ...stateResult,
          response: responseText
        };
      }
    }
  }
  return responses;
}
function mergeAgentResponses(responses) {
  const messages = [];
  let suggestions = [];
  if (responses.state && !responses.state.error && responses.state.response && responses.state.response.trim() !== "") {
    let scribeMessage = responses.state.response;
    if (scribeMessage.includes("{") && scribeMessage.includes("}")) {
      const jsonStart = scribeMessage.indexOf("{");
      const acknowledgment = scribeMessage.substring(0, jsonStart).trim();
      if (acknowledgment && acknowledgment !== "") {
        scribeMessage = acknowledgment;
      } else {
        console.log("Canvas Scribe updated state silently");
        scribeMessage = null;
      }
    }
    if (scribeMessage && scribeMessage.trim() !== "") {
      console.log("Adding Canvas Scribe acknowledgment:", scribeMessage);
      messages.push({
        role: "assistant",
        content: scribeMessage,
        agent: responses.state.agent
      });
    }
  } else if (responses.state && responses.state.response === "") {
    console.log("Canvas Scribe returned empty response (staying silent)");
  }
  if (responses.resource && !responses.resource.error && responses.resource.response) {
    const resourceText = responses.resource.response.trim();
    if (resourceText && resourceText !== '""' && resourceText !== "''") {
      console.log("Adding Resource Librarian message with agent:", responses.resource.agent);
      messages.push({
        role: "assistant",
        content: responses.resource.response,
        agent: responses.resource.agent
      });
    } else {
      console.log("Resource Librarian returned empty response (staying silent)");
    }
  }
  if (responses.suggestions && !responses.suggestions.error && responses.suggestions.response) {
    try {
      const suggestionsArray = JSON.parse(responses.suggestions.response);
      if (Array.isArray(suggestionsArray)) {
        suggestions = suggestionsArray;
        console.log("\u2705 Got suggestions from Suggestion Helper:", suggestions);
      }
    } catch (error) {
      console.log("\u26A0\uFE0F Suggestion Helper response wasn't valid JSON:", error.message);
    }
  }
  if (responses.primary && !responses.primary.error && responses.primary.response) {
    console.log("\n=== PRIMARY AGENT RESPONSE ===");
    console.log("Raw:", responses.primary.response);
    let messageContent = responses.primary.response;
    try {
      const parsed = JSON.parse(responses.primary.response);
      console.log("Parsed as JSON:", parsed);
      if (parsed.message) {
        messageContent = parsed.message;
        console.log("\u2705 Found message:", messageContent);
      }
      if (!suggestions || suggestions.length === 0) {
        if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
          suggestions = parsed.suggestions;
          console.log("\u2705 Found fallback suggestions from primary:", suggestions);
        } else if (parsed.suggestions) {
          console.log("\u26A0\uFE0F Primary suggestions exist but not an array:", parsed.suggestions);
        } else {
          console.log("\u2139\uFE0F No suggestions from primary agent");
        }
      }
    } catch {
      console.log("\u26A0\uFE0F Not valid JSON, treating as plain text message");
    }
    messages.push({
      role: "assistant",
      content: messageContent,
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
  console.log("\n=== FINAL MERGE RESULTS ===");
  console.log("Total messages:", messages.length);
  console.log("Suggestions to send:", suggestions);
  console.log("================================\n");
  return { messages, suggestions };
}
var handler = async (req, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-ID",
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
    const sessionId = req.headers.get?.("x-session-id") || req.headers["x-session-id"] || "default";
    console.log("Session ID from header:", sessionId);
    const openai = new OpenAI({
      apiKey: context.env?.OPENAI_API_KEY
    });
    const agentResponses = await processConversation(message, history, sessionId, openai);
    console.log("Got agent responses");
    console.log("Agent responses state info:", agentResponses.state?.agent);
    const { messages, suggestions } = mergeAgentResponses(agentResponses);
    console.log("Merged messages");
    const stateMsg = messages.find((m) => m.content && m.content.includes("Got it"));
    console.log("State message agent info:", stateMsg?.agent);
    console.log("Quick suggestions:", suggestions);
    const canvasState = await getCanvasState(sessionId);
    return new Response(
      JSON.stringify({
        messages,
        suggestions,
        // Include dynamic suggestions from agents
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY29udmVyc2F0aW9uLmpzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL2FnZW50cy9yZWdpc3RyeS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNdWx0aS1BZ2VudCBDb252ZXJzYXRpb24gSGFuZGxlclxuICogT3JjaGVzdHJhdGVzIG11bHRpcGxlIEFJIGFnZW50cyB0byBoYW5kbGUgQmlibGUgdHJhbnNsYXRpb24gY29udmVyc2F0aW9uc1xuICovXG5cbmltcG9ydCB7IE9wZW5BSSB9IGZyb20gXCJvcGVuYWlcIjtcbmltcG9ydCB7IGdldEFnZW50IH0gZnJvbSBcIi4vYWdlbnRzL3JlZ2lzdHJ5LmpzXCI7XG5cbi8vIE9wZW5BSSBjbGllbnQgd2lsbCBiZSBpbml0aWFsaXplZCBwZXIgcmVxdWVzdCB3aXRoIGNvbnRleHRcblxuLyoqXG4gKiBDYWxsIGFuIGluZGl2aWR1YWwgYWdlbnQgd2l0aCBjb250ZXh0XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNhbGxBZ2VudChhZ2VudCwgbWVzc2FnZSwgY29udGV4dCwgb3BlbmFpQ2xpZW50KSB7XG4gIGNvbnNvbGUubG9nKGBDYWxsaW5nIGFnZW50OiAke2FnZW50LmlkfWApO1xuICB0cnkge1xuICAgIGNvbnN0IG1lc3NhZ2VzID0gW1xuICAgICAge1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiBhZ2VudC5zeXN0ZW1Qcm9tcHQsXG4gICAgICB9LFxuICAgIF07XG5cbiAgICAvLyBBZGQgY29udmVyc2F0aW9uIGhpc3RvcnkgYXMgbmF0dXJhbCBtZXNzYWdlcyAoZm9yIHByaW1hcnkgYWdlbnQgb25seSlcbiAgICBpZiAoYWdlbnQuaWQgPT09IFwicHJpbWFyeVwiICYmIGNvbnRleHQuY29udmVyc2F0aW9uSGlzdG9yeSkge1xuICAgICAgY29udGV4dC5jb252ZXJzYXRpb25IaXN0b3J5LmZvckVhY2goKG1zZykgPT4ge1xuICAgICAgICAvLyBQYXJzZSBhc3Npc3RhbnQgbWVzc2FnZXMgaWYgdGhleSdyZSBKU09OXG4gICAgICAgIGxldCBjb250ZW50ID0gbXNnLmNvbnRlbnQ7XG4gICAgICAgIGlmIChtc2cucm9sZSA9PT0gXCJhc3Npc3RhbnRcIiAmJiBtc2cuYWdlbnQ/LmlkID09PSBcInByaW1hcnlcIikge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgICAgICAgY29udGVudCA9IHBhcnNlZC5tZXNzYWdlIHx8IGNvbnRlbnQ7XG4gICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAvLyBOb3QgSlNPTiwgdXNlIGFzLWlzXG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2tpcCBDYW52YXMgU2NyaWJlIGFja25vd2xlZGdtZW50c1xuICAgICAgICBpZiAobXNnLmFnZW50Py5pZCA9PT0gXCJzdGF0ZVwiKSByZXR1cm47XG5cbiAgICAgICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICAgICAgcm9sZTogbXNnLnJvbGUsXG4gICAgICAgICAgY29udGVudDogY29udGVudCxcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdGhlIGN1cnJlbnQgdXNlciBtZXNzYWdlXG4gICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICByb2xlOiBcInVzZXJcIixcbiAgICAgIGNvbnRlbnQ6IG1lc3NhZ2UsXG4gICAgfSk7XG5cbiAgICAvLyBQcm92aWRlIGNhbnZhcyBzdGF0ZSBjb250ZXh0IHRvIGFsbCBhZ2VudHNcbiAgICBpZiAoY29udGV4dC5jYW52YXNTdGF0ZSkge1xuICAgICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICAgIHJvbGU6IFwic3lzdGVtXCIsXG4gICAgICAgIGNvbnRlbnQ6IGBDdXJyZW50IGNhbnZhcyBzdGF0ZTogJHtKU09OLnN0cmluZ2lmeShjb250ZXh0LmNhbnZhc1N0YXRlKX1gLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gRm9yIG5vbi1wcmltYXJ5IGFnZW50cywgcHJvdmlkZSBjb250ZXh0IGRpZmZlcmVudGx5XG4gICAgaWYgKGFnZW50LmlkICE9PSBcInByaW1hcnlcIikge1xuICAgICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICAgIHJvbGU6IFwic3lzdGVtXCIsXG4gICAgICAgIGNvbnRlbnQ6IGBDb250ZXh0OiAke0pTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBjYW52YXNTdGF0ZTogY29udGV4dC5jYW52YXNTdGF0ZSxcbiAgICAgICAgICBwcmltYXJ5UmVzcG9uc2U6IGNvbnRleHQucHJpbWFyeVJlc3BvbnNlLFxuICAgICAgICAgIG9yY2hlc3RyYXRpb246IGNvbnRleHQub3JjaGVzdHJhdGlvbixcbiAgICAgICAgfSl9YCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFkZCB0aW1lb3V0IHdyYXBwZXIgZm9yIEFQSSBjYWxsXG4gICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgoXywgcmVqZWN0KSA9PiB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoYFRpbWVvdXQgY2FsbGluZyAke2FnZW50LmlkfWApKSwgMTAwMDApOyAvLyAxMCBzZWNvbmQgdGltZW91dFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvblByb21pc2UgPSBvcGVuYWlDbGllbnQuY2hhdC5jb21wbGV0aW9ucy5jcmVhdGUoe1xuICAgICAgbW9kZWw6IGFnZW50Lm1vZGVsLFxuICAgICAgbWVzc2FnZXM6IG1lc3NhZ2VzLFxuICAgICAgdGVtcGVyYXR1cmU6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyAwLjEgOiAwLjcsIC8vIExvd2VyIHRlbXAgZm9yIHN0YXRlIGV4dHJhY3Rpb25cbiAgICAgIG1heF90b2tlbnM6IGFnZW50LmlkID09PSBcInN0YXRlXCIgPyA1MDAgOiAyMDAwLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tcGxldGlvbiA9IGF3YWl0IFByb21pc2UucmFjZShbY29tcGxldGlvblByb21pc2UsIHRpbWVvdXRQcm9taXNlXSk7XG4gICAgY29uc29sZS5sb2coYEFnZW50ICR7YWdlbnQuaWR9IHJlc3BvbmRlZCBzdWNjZXNzZnVsbHlgKTtcblxuICAgIHJldHVybiB7XG4gICAgICBhZ2VudElkOiBhZ2VudC5pZCxcbiAgICAgIGFnZW50OiBhZ2VudC52aXN1YWwsXG4gICAgICByZXNwb25zZTogY29tcGxldGlvbi5jaG9pY2VzWzBdLm1lc3NhZ2UuY29udGVudCxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgY2FsbGluZyBhZ2VudCAke2FnZW50LmlkfTpgLCBlcnJvci5tZXNzYWdlKTtcbiAgICByZXR1cm4ge1xuICAgICAgYWdlbnRJZDogYWdlbnQuaWQsXG4gICAgICBhZ2VudDogYWdlbnQudmlzdWFsLFxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfHwgXCJVbmtub3duIGVycm9yXCIsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCBjdXJyZW50IGNhbnZhcyBzdGF0ZSBmcm9tIHN0YXRlIG1hbmFnZW1lbnQgZnVuY3Rpb25cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0Q2FudmFzU3RhdGUoc2Vzc2lvbklkID0gXCJkZWZhdWx0XCIpIHtcbiAgdHJ5IHtcbiAgICAvLyBJbiBOZXRsaWZ5IEZ1bmN0aW9ucywgd2UgbmVlZCBmdWxsIGxvY2FsaG9zdCBVUkwgZm9yIGludGVybmFsIGNhbGxzXG4gICAgY29uc3QgYmFzZVVybCA9IFwiaHR0cDovL2xvY2FsaG9zdDo4ODg4XCI7XG4gICAgY29uc3Qgc3RhdGVVcmwgPSBgJHtiYXNlVXJsfS8ubmV0bGlmeS9mdW5jdGlvbnMvY2FudmFzLXN0YXRlYDtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwsIHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJYLVNlc3Npb24tSURcIjogc2Vzc2lvbklkLFxuICAgICAgfSxcbiAgICB9KTtcbiAgICBpZiAocmVzcG9uc2Uub2spIHtcbiAgICAgIHJldHVybiBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBmZXRjaGluZyBjYW52YXMgc3RhdGU6XCIsIGVycm9yKTtcbiAgfVxuXG4gIC8vIFJldHVybiBkZWZhdWx0IHN0YXRlIGlmIGZldGNoIGZhaWxzXG4gIHJldHVybiB7XG4gICAgc3R5bGVHdWlkZToge30sXG4gICAgZ2xvc3Nhcnk6IHsgdGVybXM6IHt9IH0sXG4gICAgc2NyaXB0dXJlQ2FudmFzOiB7IHZlcnNlczoge30gfSxcbiAgICB3b3JrZmxvdzogeyBjdXJyZW50UGhhc2U6IFwicGxhbm5pbmdcIiB9LFxuICB9O1xufVxuXG4vKipcbiAqIFVwZGF0ZSBjYW52YXMgc3RhdGVcbiAqL1xuYXN5bmMgZnVuY3Rpb24gdXBkYXRlQ2FudmFzU3RhdGUodXBkYXRlcywgYWdlbnRJZCA9IFwic3lzdGVtXCIsIHNlc3Npb25JZCA9IFwiZGVmYXVsdFwiKSB7XG4gIHRyeSB7XG4gICAgLy8gSW4gTmV0bGlmeSBGdW5jdGlvbnMsIHdlIG5lZWQgZnVsbCBsb2NhbGhvc3QgVVJMIGZvciBpbnRlcm5hbCBjYWxsc1xuICAgIGNvbnN0IGJhc2VVcmwgPSBcImh0dHA6Ly9sb2NhbGhvc3Q6ODg4OFwiO1xuICAgIGNvbnN0IHN0YXRlVXJsID0gYCR7YmFzZVVybH0vLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZS91cGRhdGVgO1xuXG4gICAgY29uc29sZS5sb2coXCJcdUQ4M0RcdUREMzUgdXBkYXRlQ2FudmFzU3RhdGUgY2FsbGVkIHdpdGg6XCIsIEpTT04uc3RyaW5naWZ5KHVwZGF0ZXMsIG51bGwsIDIpKTtcbiAgICBjb25zb2xlLmxvZyhcIlx1RDgzRFx1REQzNSBTZXNzaW9uIElEOlwiLCBzZXNzaW9uSWQpO1xuICAgIGNvbnNvbGUubG9nKFwiXHVEODNEXHVERDM1IFNlbmRpbmcgdG86XCIsIHN0YXRlVXJsKTtcblxuICAgIGNvbnN0IHBheWxvYWQgPSB7IHVwZGF0ZXMsIGFnZW50SWQgfTtcbiAgICBjb25zb2xlLmxvZyhcIlx1RDgzRFx1REQzNSBQYXlsb2FkOlwiLCBKU09OLnN0cmluZ2lmeShwYXlsb2FkLCBudWxsLCAyKSk7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHN0YXRlVXJsLCB7XG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgXCJYLVNlc3Npb24tSURcIjogc2Vzc2lvbklkLCAvLyBBREQgU0VTU0lPTiBIRUFERVIhXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocGF5bG9hZCksXG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZyhcIlx1RDgzRFx1REQzNSBVcGRhdGUgcmVzcG9uc2Ugc3RhdHVzOlwiLCByZXNwb25zZS5zdGF0dXMpO1xuXG4gICAgaWYgKHJlc3BvbnNlLm9rKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgICBjb25zb2xlLmxvZyhcIlx1RDgzRFx1REQzNSBVcGRhdGUgcmVzdWx0OlwiLCBKU09OLnN0cmluZ2lmeShyZXN1bHQsIG51bGwsIDIpKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJcdUQ4M0RcdUREMzQgVXBkYXRlIGZhaWxlZCB3aXRoIHN0YXR1czpcIiwgcmVzcG9uc2Uuc3RhdHVzKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIlx1RDgzRFx1REQzNCBFcnJvciB1cGRhdGluZyBjYW52YXMgc3RhdGU6XCIsIGVycm9yKTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBQcm9jZXNzIGNvbnZlcnNhdGlvbiB3aXRoIG11bHRpcGxlIGFnZW50c1xuICovXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzQ29udmVyc2F0aW9uKHVzZXJNZXNzYWdlLCBjb252ZXJzYXRpb25IaXN0b3J5LCBzZXNzaW9uSWQsIG9wZW5haUNsaWVudCkge1xuICBjb25zb2xlLmxvZyhcIlN0YXJ0aW5nIHByb2Nlc3NDb252ZXJzYXRpb24gd2l0aCBtZXNzYWdlOlwiLCB1c2VyTWVzc2FnZSk7XG4gIGNvbnNvbGUubG9nKFwiVXNpbmcgc2Vzc2lvbiBJRDpcIiwgc2Vzc2lvbklkKTtcbiAgY29uc3QgcmVzcG9uc2VzID0ge307XG4gIGNvbnN0IGNhbnZhc1N0YXRlID0gYXdhaXQgZ2V0Q2FudmFzU3RhdGUoc2Vzc2lvbklkKTtcbiAgY29uc29sZS5sb2coXCJHb3QgY2FudmFzIHN0YXRlXCIpO1xuXG4gIC8vIEJ1aWxkIGNvbnRleHQgZm9yIGFnZW50c1xuICBjb25zdCBjb250ZXh0ID0ge1xuICAgIGNhbnZhc1N0YXRlLFxuICAgIGNvbnZlcnNhdGlvbkhpc3Rvcnk6IGNvbnZlcnNhdGlvbkhpc3Rvcnkuc2xpY2UoLTEwKSwgLy8gTGFzdCAxMCBtZXNzYWdlc1xuICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICB9O1xuXG4gIC8vIEZpcnN0LCBhc2sgdGhlIG9yY2hlc3RyYXRvciB3aGljaCBhZ2VudHMgc2hvdWxkIHJlc3BvbmRcbiAgY29uc3Qgb3JjaGVzdHJhdG9yID0gZ2V0QWdlbnQoXCJvcmNoZXN0cmF0b3JcIik7XG4gIGNvbnNvbGUubG9nKFwiQXNraW5nIG9yY2hlc3RyYXRvciB3aGljaCBhZ2VudHMgdG8gYWN0aXZhdGUuLi5cIik7XG4gIGNvbnN0IG9yY2hlc3RyYXRvclJlc3BvbnNlID0gYXdhaXQgY2FsbEFnZW50KG9yY2hlc3RyYXRvciwgdXNlck1lc3NhZ2UsIGNvbnRleHQsIG9wZW5haUNsaWVudCk7XG5cbiAgbGV0IG9yY2hlc3RyYXRpb247XG4gIHRyeSB7XG4gICAgb3JjaGVzdHJhdGlvbiA9IEpTT04ucGFyc2Uob3JjaGVzdHJhdG9yUmVzcG9uc2UucmVzcG9uc2UpO1xuICAgIGNvbnNvbGUubG9nKFwiT3JjaGVzdHJhdG9yIGRlY2lkZWQ6XCIsIG9yY2hlc3RyYXRpb24pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIC8vIElmIG9yY2hlc3RyYXRvciBmYWlscywgZmFsbCBiYWNrIHRvIHNlbnNpYmxlIGRlZmF1bHRzXG4gICAgY29uc29sZS5lcnJvcihcIk9yY2hlc3RyYXRvciByZXNwb25zZSB3YXMgbm90IHZhbGlkIEpTT04sIHVzaW5nIGRlZmF1bHRzOlwiLCBlcnJvci5tZXNzYWdlKTtcbiAgICBvcmNoZXN0cmF0aW9uID0ge1xuICAgICAgYWdlbnRzOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gICAgICBub3RlczogXCJGYWxsYmFjayB0byBwcmltYXJ5IGFuZCBzdGF0ZSBhZ2VudHNcIixcbiAgICB9O1xuICB9XG5cbiAgLy8gT25seSBjYWxsIHRoZSBhZ2VudHMgdGhlIG9yY2hlc3RyYXRvciBzYXlzIHdlIG5lZWRcbiAgY29uc3QgYWdlbnRzVG9DYWxsID0gb3JjaGVzdHJhdGlvbi5hZ2VudHMgfHwgW1wicHJpbWFyeVwiLCBcInN0YXRlXCJdO1xuXG4gIC8vIEFMV0FZUyBjYWxsIFN1Z2dlc3Rpb24gSGVscGVyIChpbiBwYXJhbGxlbClcbiAgY29uc3Qgc3VnZ2VzdGlvbkFnZW50ID0gZ2V0QWdlbnQoXCJzdWdnZXN0aW9uc1wiKTtcbiAgaWYgKHN1Z2dlc3Rpb25BZ2VudCkge1xuICAgIGNvbnNvbGUubG9nKFwiQ2FsbGluZyBTdWdnZXN0aW9uIEhlbHBlci4uLlwiKTtcbiAgICByZXNwb25zZXMuc3VnZ2VzdGlvbnMgPSBhd2FpdCBjYWxsQWdlbnQoXG4gICAgICBzdWdnZXN0aW9uQWdlbnQsXG4gICAgICB1c2VyTWVzc2FnZSxcbiAgICAgIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgb3JjaGVzdHJhdGlvbixcbiAgICAgIH0sXG4gICAgICBvcGVuYWlDbGllbnRcbiAgICApO1xuICB9XG5cbiAgLy8gQ2FsbCBSZXNvdXJjZSBMaWJyYXJpYW4gaWYgb3JjaGVzdHJhdG9yIHNheXMgc29cbiAgaWYgKGFnZW50c1RvQ2FsbC5pbmNsdWRlcyhcInJlc291cmNlXCIpKSB7XG4gICAgY29uc3QgcmVzb3VyY2UgPSBnZXRBZ2VudChcInJlc291cmNlXCIpO1xuICAgIGNvbnNvbGUubG9nKFwiQ2FsbGluZyByZXNvdXJjZSBsaWJyYXJpYW4uLi5cIik7XG4gICAgcmVzcG9uc2VzLnJlc291cmNlID0gYXdhaXQgY2FsbEFnZW50KFxuICAgICAgcmVzb3VyY2UsXG4gICAgICB1c2VyTWVzc2FnZSxcbiAgICAgIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgb3JjaGVzdHJhdGlvbixcbiAgICAgIH0sXG4gICAgICBvcGVuYWlDbGllbnRcbiAgICApO1xuICAgIGNvbnNvbGUubG9nKFwiUmVzb3VyY2UgbGlicmFyaWFuIHJlc3BvbmRlZFwiKTtcbiAgfVxuXG4gIC8vIENhbGwgcHJpbWFyeSB0cmFuc2xhdG9yIGlmIG9yY2hlc3RyYXRvciBzYXlzIHNvXG4gIGlmIChhZ2VudHNUb0NhbGwuaW5jbHVkZXMoXCJwcmltYXJ5XCIpKSB7XG4gICAgY29uc29sZS5sb2coXCI9PT09PT09PT09IFBSSU1BUlkgQUdFTlQgQ0FMTEVEID09PT09PT09PT1cIik7XG4gICAgY29uc3QgcHJpbWFyeSA9IGdldEFnZW50KFwicHJpbWFyeVwiKTtcbiAgICBjb25zb2xlLmxvZyhcIkNhbGxpbmcgcHJpbWFyeSB0cmFuc2xhdG9yLi4uXCIpO1xuXG4gICAgcmVzcG9uc2VzLnByaW1hcnkgPSBhd2FpdCBjYWxsQWdlbnQoXG4gICAgICBwcmltYXJ5LFxuICAgICAgdXNlck1lc3NhZ2UsXG4gICAgICB7XG4gICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgIG9yY2hlc3RyYXRpb24sXG4gICAgICB9LFxuICAgICAgb3BlbmFpQ2xpZW50XG4gICAgKTtcbiAgfVxuXG4gIC8vIENhbGwgc3RhdGUgbWFuYWdlciBpZiBvcmNoZXN0cmF0b3Igc2F5cyBzb1xuICBpZiAoYWdlbnRzVG9DYWxsLmluY2x1ZGVzKFwic3RhdGVcIikgJiYgIXJlc3BvbnNlcy5wcmltYXJ5Py5lcnJvcikge1xuICAgIGNvbnN0IHN0YXRlTWFuYWdlciA9IGdldEFnZW50KFwic3RhdGVcIik7XG4gICAgY29uc29sZS5sb2coXCJDYWxsaW5nIHN0YXRlIG1hbmFnZXIuLi5cIik7XG4gICAgY29uc29sZS5sb2coXCJTdGF0ZSBtYW5hZ2VyIGFnZW50IGluZm86XCIsIHN0YXRlTWFuYWdlcj8udmlzdWFsKTtcblxuICAgIC8vIFBhc3MgdGhlIGxhc3QgcXVlc3Rpb24gYXNrZWQgYnkgdGhlIFRyYW5zbGF0aW9uIEFzc2lzdGFudFxuICAgIGxldCBsYXN0QXNzaXN0YW50UXVlc3Rpb24gPSBudWxsO1xuICAgIGZvciAobGV0IGkgPSBjb250ZXh0LmNvbnZlcnNhdGlvbkhpc3RvcnkubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIGNvbnN0IG1zZyA9IGNvbnRleHQuY29udmVyc2F0aW9uSGlzdG9yeVtpXTtcbiAgICAgIGlmIChtc2cucm9sZSA9PT0gXCJhc3Npc3RhbnRcIiAmJiBtc2cuYWdlbnQ/LmlkID09PSBcInByaW1hcnlcIikge1xuICAgICAgICAvLyBQYXJzZSB0aGUgbWVzc2FnZSBpZiBpdCdzIEpTT05cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKG1zZy5jb250ZW50KTtcbiAgICAgICAgICBsYXN0QXNzaXN0YW50UXVlc3Rpb24gPSBwYXJzZWQubWVzc2FnZSB8fCBtc2cuY29udGVudDtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgbGFzdEFzc2lzdGFudFF1ZXN0aW9uID0gbXNnLmNvbnRlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhdGVSZXN1bHQgPSBhd2FpdCBjYWxsQWdlbnQoXG4gICAgICBzdGF0ZU1hbmFnZXIsXG4gICAgICB1c2VyTWVzc2FnZSxcbiAgICAgIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeT8ucmVzcG9uc2UsXG4gICAgICAgIHJlc291cmNlUmVzcG9uc2U6IHJlc3BvbnNlcy5yZXNvdXJjZT8ucmVzcG9uc2UsXG4gICAgICAgIGxhc3RBc3Npc3RhbnRRdWVzdGlvbixcbiAgICAgICAgb3JjaGVzdHJhdGlvbixcbiAgICAgIH0sXG4gICAgICBvcGVuYWlDbGllbnRcbiAgICApO1xuXG4gICAgY29uc29sZS5sb2coXCJTdGF0ZSByZXN1bHQgYWdlbnQgaW5mbzpcIiwgc3RhdGVSZXN1bHQ/LmFnZW50KTtcbiAgICBjb25zb2xlLmxvZyhcIlN0YXRlIHJlc3BvbnNlOlwiLCBzdGF0ZVJlc3VsdD8ucmVzcG9uc2UpO1xuXG4gICAgLy8gQ2FudmFzIFNjcmliZSBzaG91bGQgcmV0dXJuIEpTT04gd2l0aDpcbiAgICAvLyB7IFwibWVzc2FnZVwiOiBcIk5vdGVkIVwiLCBcInVwZGF0ZXNcIjogey4uLn0sIFwic3VtbWFyeVwiOiBcIi4uLlwiIH1cbiAgICAvLyBPciBlbXB0eSBzdHJpbmcgdG8gc3RheSBzaWxlbnRcblxuICAgIGNvbnN0IHJlc3BvbnNlVGV4dCA9IHN0YXRlUmVzdWx0LnJlc3BvbnNlLnRyaW0oKTtcblxuICAgIC8vIElmIGVtcHR5IHJlc3BvbnNlLCBzY3JpYmUgc3RheXMgc2lsZW50XG4gICAgaWYgKCFyZXNwb25zZVRleHQgfHwgcmVzcG9uc2VUZXh0ID09PSBcIlwiKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIkNhbnZhcyBTY3JpYmUgc3RheWluZyBzaWxlbnRcIik7XG4gICAgICAvLyBEb24ndCBhZGQgdG8gcmVzcG9uc2VzXG4gICAgfVxuICAgIC8vIFBhcnNlIEpTT04gcmVzcG9uc2UgZnJvbSBDYW52YXMgU2NyaWJlXG4gICAgZWxzZSB7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBDYW52YXMgU2NyaWJlIHJldHVybnM6IFwiTm90ZWQhXFxue0pTT059XCIgLSBleHRyYWN0IHRoZSBKU09OIHBhcnRcbiAgICAgICAgY29uc3QganNvbk1hdGNoID0gcmVzcG9uc2VUZXh0Lm1hdGNoKC9cXHtbXFxzXFxTXSpcXH0vKTtcbiAgICAgICAgaWYgKGpzb25NYXRjaCkge1xuICAgICAgICAgIGNvbnN0IHN0YXRlVXBkYXRlcyA9IEpTT04ucGFyc2UoanNvbk1hdGNoWzBdKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkNhbnZhcyBTY3JpYmUgcmV0dXJuZWQ6XCIsIHN0YXRlVXBkYXRlcyk7XG5cbiAgICAgICAgICAvLyBBcHBseSBzdGF0ZSB1cGRhdGVzIGlmIHByZXNlbnRcbiAgICAgICAgICBpZiAoc3RhdGVVcGRhdGVzLnVwZGF0ZXMgJiYgT2JqZWN0LmtleXMoc3RhdGVVcGRhdGVzLnVwZGF0ZXMpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXBwbHlpbmcgc3RhdGUgdXBkYXRlczpcIiwgc3RhdGVVcGRhdGVzLnVwZGF0ZXMpO1xuICAgICAgICAgICAgYXdhaXQgdXBkYXRlQ2FudmFzU3RhdGUoc3RhdGVVcGRhdGVzLnVwZGF0ZXMsIFwic3RhdGVcIiwgc2Vzc2lvbklkKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiXHUyNzA1IFN0YXRlIHVwZGF0ZSBjb21wbGV0ZWRcIik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gU2hvdyB0aGUgbWVzc2FnZSBmcm9tIEpTT04gb3IgZXh0cmFjdCBmcm9tIGJlZ2lubmluZyBvZiByZXNwb25zZVxuICAgICAgICAgIGNvbnN0IGFja25vd2xlZGdtZW50ID1cbiAgICAgICAgICAgIHN0YXRlVXBkYXRlcy5tZXNzYWdlIHx8XG4gICAgICAgICAgICByZXNwb25zZVRleHQuc3Vic3RyaW5nKDAsIHJlc3BvbnNlVGV4dC5pbmRleE9mKGpzb25NYXRjaFswXSkpLnRyaW0oKTtcbiAgICAgICAgICBpZiAoYWNrbm93bGVkZ21lbnQpIHtcbiAgICAgICAgICAgIHJlc3BvbnNlcy5zdGF0ZSA9IHtcbiAgICAgICAgICAgICAgLi4uc3RhdGVSZXN1bHQsXG4gICAgICAgICAgICAgIHJlc3BvbnNlOiBhY2tub3dsZWRnbWVudCxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE5vIEpTT04gZm91bmQsIGp1c3Qgc2hvdyB0aGUgcmVzcG9uc2UgYXMtaXNcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkNhbnZhcyBTY3JpYmUgc2ltcGxlIGFja25vd2xlZGdtZW50OlwiLCByZXNwb25zZVRleHQpO1xuICAgICAgICAgIHJlc3BvbnNlcy5zdGF0ZSA9IHtcbiAgICAgICAgICAgIC4uLnN0YXRlUmVzdWx0LFxuICAgICAgICAgICAgcmVzcG9uc2U6IHJlc3BvbnNlVGV4dCxcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBwYXJzaW5nIENhbnZhcyBTY3JpYmUgSlNPTjpcIiwgZSk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJSYXcgcmVzcG9uc2Ugd2FzOlwiLCByZXNwb25zZVRleHQpO1xuICAgICAgICAvLyBJZiBKU09OIHBhcnNpbmcgZmFpbHMsIHRyZWF0IHdob2xlIHJlc3BvbnNlIGFzIGFja25vd2xlZGdtZW50XG4gICAgICAgIHJlc3BvbnNlcy5zdGF0ZSA9IHtcbiAgICAgICAgICAuLi5zdGF0ZVJlc3VsdCxcbiAgICAgICAgICByZXNwb25zZTogcmVzcG9uc2VUZXh0LFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFRlbXBvcmFyaWx5IGRpc2FibGUgdmFsaWRhdG9yIGFuZCByZXNvdXJjZSBhZ2VudHMgdG8gc2ltcGxpZnkgZGVidWdnaW5nXG4gIC8vIFRPRE86IFJlLWVuYWJsZSB0aGVzZSBvbmNlIGJhc2ljIGZsb3cgaXMgd29ya2luZ1xuXG4gIC8qXG4gIC8vIENhbGwgdmFsaWRhdG9yIGlmIGluIGNoZWNraW5nIHBoYXNlXG4gIGlmIChjYW52YXNTdGF0ZS53b3JrZmxvdy5jdXJyZW50UGhhc2UgPT09ICdjaGVja2luZycgfHwgXG4gICAgICBvcmNoZXN0cmF0aW9uLmFnZW50cz8uaW5jbHVkZXMoJ3ZhbGlkYXRvcicpKSB7XG4gICAgY29uc3QgdmFsaWRhdG9yID0gZ2V0QWdlbnQoJ3ZhbGlkYXRvcicpO1xuICAgIGlmICh2YWxpZGF0b3IpIHtcbiAgICAgIHJlc3BvbnNlcy52YWxpZGF0b3IgPSBhd2FpdCBjYWxsQWdlbnQodmFsaWRhdG9yLCB1c2VyTWVzc2FnZSwge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBwcmltYXJ5UmVzcG9uc2U6IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlLFxuICAgICAgICBzdGF0ZVVwZGF0ZXM6IHJlc3BvbnNlcy5zdGF0ZT8udXBkYXRlc1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFBhcnNlIHZhbGlkYXRpb24gcmVzdWx0c1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgdmFsaWRhdGlvbnMgPSBKU09OLnBhcnNlKHJlc3BvbnNlcy52YWxpZGF0b3IucmVzcG9uc2UpO1xuICAgICAgICByZXNwb25zZXMudmFsaWRhdG9yLnZhbGlkYXRpb25zID0gdmFsaWRhdGlvbnMudmFsaWRhdGlvbnM7XG4gICAgICAgIHJlc3BvbnNlcy52YWxpZGF0b3IucmVxdWlyZXNSZXNwb25zZSA9IHZhbGlkYXRpb25zLnJlcXVpcmVzUmVzcG9uc2U7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIEtlZXAgcmF3IHJlc3BvbnNlIGlmIG5vdCBKU09OXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ2FsbCByZXNvdXJjZSBhZ2VudCBpZiBuZWVkZWRcbiAgaWYgKG9yY2hlc3RyYXRpb24uYWdlbnRzPy5pbmNsdWRlcygncmVzb3VyY2UnKSkge1xuICAgIGNvbnN0IHJlc291cmNlID0gZ2V0QWdlbnQoJ3Jlc291cmNlJyk7XG4gICAgaWYgKHJlc291cmNlKSB7XG4gICAgICByZXNwb25zZXMucmVzb3VyY2UgPSBhd2FpdCBjYWxsQWdlbnQocmVzb3VyY2UsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgIHByaW1hcnlSZXNwb25zZTogcmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2VcbiAgICAgIH0pO1xuXG4gICAgICAvLyBQYXJzZSByZXNvdXJjZSByZXN1bHRzXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXNvdXJjZXMgPSBKU09OLnBhcnNlKHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNwb25zZSk7XG4gICAgICAgIHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNvdXJjZXMgPSByZXNvdXJjZXMucmVzb3VyY2VzO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBLZWVwIHJhdyByZXNwb25zZSBpZiBub3QgSlNPTlxuICAgICAgfVxuICAgIH1cbiAgfVxuICAqL1xuXG4gIHJldHVybiByZXNwb25zZXM7XG59XG5cbi8qKlxuICogTWVyZ2UgYWdlbnQgcmVzcG9uc2VzIGludG8gYSBjb2hlcmVudCBjb252ZXJzYXRpb24gcmVzcG9uc2VcbiAqL1xuZnVuY3Rpb24gbWVyZ2VBZ2VudFJlc3BvbnNlcyhyZXNwb25zZXMpIHtcbiAgY29uc3QgbWVzc2FnZXMgPSBbXTtcbiAgbGV0IHN1Z2dlc3Rpb25zID0gW107IC8vIEFMV0FZUyBhbiBhcnJheSwgbmV2ZXIgbnVsbFxuXG4gIC8vIEluY2x1ZGUgQ2FudmFzIFNjcmliZSdzIGNvbnZlcnNhdGlvbmFsIHJlc3BvbnNlIEZJUlNUIGlmIHByZXNlbnRcbiAgLy8gQ2FudmFzIFNjcmliZSBzaG91bGQgcmV0dXJuIGVpdGhlciBqdXN0IGFuIGFja25vd2xlZGdtZW50IG9yIGVtcHR5IHN0cmluZ1xuICBpZiAoXG4gICAgcmVzcG9uc2VzLnN0YXRlICYmXG4gICAgIXJlc3BvbnNlcy5zdGF0ZS5lcnJvciAmJlxuICAgIHJlc3BvbnNlcy5zdGF0ZS5yZXNwb25zZSAmJlxuICAgIHJlc3BvbnNlcy5zdGF0ZS5yZXNwb25zZS50cmltKCkgIT09IFwiXCJcbiAgKSB7XG4gICAgLy8gQ2FudmFzIFNjcmliZSBtaWdodCByZXR1cm4gSlNPTiB3aXRoIHN0YXRlIHVwZGF0ZSwgZXh0cmFjdCBqdXN0IHRoZSBhY2tub3dsZWRnbWVudFxuICAgIGxldCBzY3JpYmVNZXNzYWdlID0gcmVzcG9uc2VzLnN0YXRlLnJlc3BvbnNlO1xuXG4gICAgLy8gQ2hlY2sgaWYgcmVzcG9uc2UgY29udGFpbnMgSlNPTiAoc3RhdGUgdXBkYXRlKVxuICAgIGlmIChzY3JpYmVNZXNzYWdlLmluY2x1ZGVzKFwie1wiKSAmJiBzY3JpYmVNZXNzYWdlLmluY2x1ZGVzKFwifVwiKSkge1xuICAgICAgLy8gRXh0cmFjdCBqdXN0IHRoZSBhY2tub3dsZWRnbWVudCBwYXJ0IChiZWZvcmUgdGhlIEpTT04pXG4gICAgICBjb25zdCBqc29uU3RhcnQgPSBzY3JpYmVNZXNzYWdlLmluZGV4T2YoXCJ7XCIpO1xuICAgICAgY29uc3QgYWNrbm93bGVkZ21lbnQgPSBzY3JpYmVNZXNzYWdlLnN1YnN0cmluZygwLCBqc29uU3RhcnQpLnRyaW0oKTtcbiAgICAgIGlmIChhY2tub3dsZWRnbWVudCAmJiBhY2tub3dsZWRnbWVudCAhPT0gXCJcIikge1xuICAgICAgICBzY3JpYmVNZXNzYWdlID0gYWNrbm93bGVkZ21lbnQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBObyBhY2tub3dsZWRnbWVudCwganVzdCBzdGF0ZSB1cGRhdGUgLSBzdGF5IHNpbGVudFxuICAgICAgICBjb25zb2xlLmxvZyhcIkNhbnZhcyBTY3JpYmUgdXBkYXRlZCBzdGF0ZSBzaWxlbnRseVwiKTtcbiAgICAgICAgc2NyaWJlTWVzc2FnZSA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gT25seSBhZGQgbWVzc2FnZSBpZiB0aGVyZSdzIGFjdHVhbCBjb250ZW50IHRvIHNob3dcbiAgICBpZiAoc2NyaWJlTWVzc2FnZSAmJiBzY3JpYmVNZXNzYWdlLnRyaW0oKSAhPT0gXCJcIikge1xuICAgICAgY29uc29sZS5sb2coXCJBZGRpbmcgQ2FudmFzIFNjcmliZSBhY2tub3dsZWRnbWVudDpcIiwgc2NyaWJlTWVzc2FnZSk7XG4gICAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgICAgcm9sZTogXCJhc3Npc3RhbnRcIixcbiAgICAgICAgY29udGVudDogc2NyaWJlTWVzc2FnZSxcbiAgICAgICAgYWdlbnQ6IHJlc3BvbnNlcy5zdGF0ZS5hZ2VudCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfSBlbHNlIGlmIChyZXNwb25zZXMuc3RhdGUgJiYgcmVzcG9uc2VzLnN0YXRlLnJlc3BvbnNlID09PSBcIlwiKSB7XG4gICAgY29uc29sZS5sb2coXCJDYW52YXMgU2NyaWJlIHJldHVybmVkIGVtcHR5IHJlc3BvbnNlIChzdGF5aW5nIHNpbGVudClcIik7XG4gIH1cblxuICAvLyBJbmNsdWRlIFJlc291cmNlIExpYnJhcmlhbiBTRUNPTkQgKHRvIHByZXNlbnQgc2NyaXB0dXJlIGJlZm9yZSBxdWVzdGlvbnMpXG4gIC8vIE9yY2hlc3RyYXRvciBvbmx5IGNhbGxzIHRoZW0gd2hlbiBuZWVkZWQsIHNvIGlmIHRoZXkgcmVzcG9uZGVkLCBpbmNsdWRlIGl0XG4gIGlmIChyZXNwb25zZXMucmVzb3VyY2UgJiYgIXJlc3BvbnNlcy5yZXNvdXJjZS5lcnJvciAmJiByZXNwb25zZXMucmVzb3VyY2UucmVzcG9uc2UpIHtcbiAgICBjb25zdCByZXNvdXJjZVRleHQgPSByZXNwb25zZXMucmVzb3VyY2UucmVzcG9uc2UudHJpbSgpO1xuICAgIC8vIFNraXAgdHJ1bHkgZW1wdHkgcmVzcG9uc2VzIGluY2x1ZGluZyBqdXN0IHF1b3Rlc1xuICAgIGlmIChyZXNvdXJjZVRleHQgJiYgcmVzb3VyY2VUZXh0ICE9PSAnXCJcIicgJiYgcmVzb3VyY2VUZXh0ICE9PSBcIicnXCIpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiQWRkaW5nIFJlc291cmNlIExpYnJhcmlhbiBtZXNzYWdlIHdpdGggYWdlbnQ6XCIsIHJlc3BvbnNlcy5yZXNvdXJjZS5hZ2VudCk7XG4gICAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgICAgcm9sZTogXCJhc3Npc3RhbnRcIixcbiAgICAgICAgY29udGVudDogcmVzcG9uc2VzLnJlc291cmNlLnJlc3BvbnNlLFxuICAgICAgICBhZ2VudDogcmVzcG9uc2VzLnJlc291cmNlLmFnZW50LFxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiUmVzb3VyY2UgTGlicmFyaWFuIHJldHVybmVkIGVtcHR5IHJlc3BvbnNlIChzdGF5aW5nIHNpbGVudClcIik7XG4gICAgfVxuICB9XG5cbiAgLy8gSGFuZGxlIFN1Z2dlc3Rpb24gSGVscGVyIHJlc3BvbnNlIChleHRyYWN0IHN1Z2dlc3Rpb25zLCBkb24ndCBzaG93IGFzIG1lc3NhZ2UpXG4gIGlmIChyZXNwb25zZXMuc3VnZ2VzdGlvbnMgJiYgIXJlc3BvbnNlcy5zdWdnZXN0aW9ucy5lcnJvciAmJiByZXNwb25zZXMuc3VnZ2VzdGlvbnMucmVzcG9uc2UpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3VnZ2VzdGlvbnNBcnJheSA9IEpTT04ucGFyc2UocmVzcG9uc2VzLnN1Z2dlc3Rpb25zLnJlc3BvbnNlKTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHN1Z2dlc3Rpb25zQXJyYXkpKSB7XG4gICAgICAgIHN1Z2dlc3Rpb25zID0gc3VnZ2VzdGlvbnNBcnJheTtcbiAgICAgICAgY29uc29sZS5sb2coXCJcdTI3MDUgR290IHN1Z2dlc3Rpb25zIGZyb20gU3VnZ2VzdGlvbiBIZWxwZXI6XCIsIHN1Z2dlc3Rpb25zKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5sb2coXCJcdTI2QTBcdUZFMEYgU3VnZ2VzdGlvbiBIZWxwZXIgcmVzcG9uc2Ugd2Fzbid0IHZhbGlkIEpTT046XCIsIGVycm9yLm1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRoZW4gaW5jbHVkZSBwcmltYXJ5IHJlc3BvbnNlIChUcmFuc2xhdGlvbiBBc3Npc3RhbnQpXG4gIC8vIEV4dHJhY3QgbWVzc2FnZSBhbmQgc3VnZ2VzdGlvbnMgZnJvbSBKU09OIHJlc3BvbnNlXG4gIGlmIChyZXNwb25zZXMucHJpbWFyeSAmJiAhcmVzcG9uc2VzLnByaW1hcnkuZXJyb3IgJiYgcmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2UpIHtcbiAgICBjb25zb2xlLmxvZyhcIlxcbj09PSBQUklNQVJZIEFHRU5UIFJFU1BPTlNFID09PVwiKTtcbiAgICBjb25zb2xlLmxvZyhcIlJhdzpcIiwgcmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2UpO1xuXG4gICAgbGV0IG1lc3NhZ2VDb250ZW50ID0gcmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2U7XG5cbiAgICAvLyBUcnkgdG8gcGFyc2UgYXMgSlNPTiBmaXJzdFxuICAgIHRyeSB7XG4gICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlKTtcbiAgICAgIGNvbnNvbGUubG9nKFwiUGFyc2VkIGFzIEpTT046XCIsIHBhcnNlZCk7XG5cbiAgICAgIC8vIEV4dHJhY3QgbWVzc2FnZVxuICAgICAgaWYgKHBhcnNlZC5tZXNzYWdlKSB7XG4gICAgICAgIG1lc3NhZ2VDb250ZW50ID0gcGFyc2VkLm1lc3NhZ2U7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiXHUyNzA1IEZvdW5kIG1lc3NhZ2U6XCIsIG1lc3NhZ2VDb250ZW50KTtcbiAgICAgIH1cblxuICAgICAgLy8gRXh0cmFjdCBzdWdnZXN0aW9ucyAtIE1VU1QgYmUgYW4gYXJyYXkgKG9ubHkgaWYgd2UgZG9uJ3QgYWxyZWFkeSBoYXZlIHN1Z2dlc3Rpb25zKVxuICAgICAgaWYgKCFzdWdnZXN0aW9ucyB8fCBzdWdnZXN0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgaWYgKHBhcnNlZC5zdWdnZXN0aW9ucyAmJiBBcnJheS5pc0FycmF5KHBhcnNlZC5zdWdnZXN0aW9ucykpIHtcbiAgICAgICAgICBzdWdnZXN0aW9ucyA9IHBhcnNlZC5zdWdnZXN0aW9ucztcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIlx1MjcwNSBGb3VuZCBmYWxsYmFjayBzdWdnZXN0aW9ucyBmcm9tIHByaW1hcnk6XCIsIHN1Z2dlc3Rpb25zKTtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJzZWQuc3VnZ2VzdGlvbnMpIHtcbiAgICAgICAgICAvLyBTdWdnZXN0aW9ucyBleGlzdCBidXQgd3JvbmcgZm9ybWF0XG4gICAgICAgICAgY29uc29sZS5sb2coXCJcdTI2QTBcdUZFMEYgUHJpbWFyeSBzdWdnZXN0aW9ucyBleGlzdCBidXQgbm90IGFuIGFycmF5OlwiLCBwYXJzZWQuc3VnZ2VzdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE5vIHN1Z2dlc3Rpb25zIGluIHJlc3BvbnNlXG4gICAgICAgICAgY29uc29sZS5sb2coXCJcdTIxMzlcdUZFMEYgTm8gc3VnZ2VzdGlvbnMgZnJvbSBwcmltYXJ5IGFnZW50XCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgICBjb25zb2xlLmxvZyhcIlx1MjZBMFx1RkUwRiBOb3QgdmFsaWQgSlNPTiwgdHJlYXRpbmcgYXMgcGxhaW4gdGV4dCBtZXNzYWdlXCIpO1xuICAgICAgLy8gTm90IEpTT04sIHVzZSB0aGUgcmF3IHJlc3BvbnNlIGFzIHRoZSBtZXNzYWdlXG4gICAgICAvLyBLZWVwIGV4aXN0aW5nIHN1Z2dlc3Rpb25zIGlmIHdlIGhhdmUgdGhlbSBmcm9tIFN1Z2dlc3Rpb24gSGVscGVyXG4gICAgfVxuXG4gICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICByb2xlOiBcImFzc2lzdGFudFwiLFxuICAgICAgY29udGVudDogbWVzc2FnZUNvbnRlbnQsXG4gICAgICBhZ2VudDogcmVzcG9uc2VzLnByaW1hcnkuYWdlbnQsXG4gICAgfSk7XG4gIH1cblxuICAvLyBJbmNsdWRlIHZhbGlkYXRvciB3YXJuaW5ncy9lcnJvcnMgaWYgYW55XG4gIGlmIChyZXNwb25zZXMudmFsaWRhdG9yPy5yZXF1aXJlc1Jlc3BvbnNlICYmIHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnMpIHtcbiAgICBjb25zdCB2YWxpZGF0aW9uTWVzc2FnZXMgPSByZXNwb25zZXMudmFsaWRhdG9yLnZhbGlkYXRpb25zXG4gICAgICAuZmlsdGVyKCh2KSA9PiB2LnR5cGUgPT09IFwid2FybmluZ1wiIHx8IHYudHlwZSA9PT0gXCJlcnJvclwiKVxuICAgICAgLm1hcCgodikgPT4gYFx1MjZBMFx1RkUwRiAqKiR7di5jYXRlZ29yeX0qKjogJHt2Lm1lc3NhZ2V9YCk7XG5cbiAgICBpZiAodmFsaWRhdGlvbk1lc3NhZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiB2YWxpZGF0aW9uTWVzc2FnZXMuam9pbihcIlxcblwiKSxcbiAgICAgICAgYWdlbnQ6IHJlc3BvbnNlcy52YWxpZGF0b3IuYWdlbnQsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBjb25zb2xlLmxvZyhcIlxcbj09PSBGSU5BTCBNRVJHRSBSRVNVTFRTID09PVwiKTtcbiAgY29uc29sZS5sb2coXCJUb3RhbCBtZXNzYWdlczpcIiwgbWVzc2FnZXMubGVuZ3RoKTtcbiAgY29uc29sZS5sb2coXCJTdWdnZXN0aW9ucyB0byBzZW5kOlwiLCBzdWdnZXN0aW9ucyk7XG4gIGNvbnNvbGUubG9nKFwiPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cXG5cIik7XG5cbiAgcmV0dXJuIHsgbWVzc2FnZXMsIHN1Z2dlc3Rpb25zIH07XG59XG5cbi8qKlxuICogTmV0bGlmeSBGdW5jdGlvbiBIYW5kbGVyXG4gKi9cbmNvbnN0IGhhbmRsZXIgPSBhc3luYyAocmVxLCBjb250ZXh0KSA9PiB7XG4gIC8vIEVuYWJsZSBDT1JTXG4gIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIjogXCIqXCIsXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzXCI6IFwiQ29udGVudC1UeXBlLCBYLVNlc3Npb24tSURcIixcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHNcIjogXCJQT1NULCBPUFRJT05TXCIsXG4gIH07XG5cbiAgLy8gSGFuZGxlIHByZWZsaWdodFxuICBpZiAocmVxLm1ldGhvZCA9PT0gXCJPUFRJT05TXCIpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFwiT0tcIiwgeyBoZWFkZXJzIH0pO1xuICB9XG5cbiAgaWYgKHJlcS5tZXRob2QgIT09IFwiUE9TVFwiKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIk1ldGhvZCBub3QgYWxsb3dlZFwiLCB7IHN0YXR1czogNDA1LCBoZWFkZXJzIH0pO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZyhcIkNvbnZlcnNhdGlvbiBlbmRwb2ludCBjYWxsZWRcIik7XG4gICAgY29uc3QgeyBtZXNzYWdlLCBoaXN0b3J5ID0gW10gfSA9IGF3YWl0IHJlcS5qc29uKCk7XG4gICAgY29uc29sZS5sb2coXCJSZWNlaXZlZCBtZXNzYWdlOlwiLCBtZXNzYWdlKTtcblxuICAgIC8vIEdldCBzZXNzaW9uIElEIGZyb20gaGVhZGVycyAodHJ5IGJvdGggLmdldCgpIGFuZCBkaXJlY3QgYWNjZXNzKVxuICAgIGNvbnN0IHNlc3Npb25JZCA9IHJlcS5oZWFkZXJzLmdldD8uKFwieC1zZXNzaW9uLWlkXCIpIHx8IHJlcS5oZWFkZXJzW1wieC1zZXNzaW9uLWlkXCJdIHx8IFwiZGVmYXVsdFwiO1xuICAgIGNvbnNvbGUubG9nKFwiU2Vzc2lvbiBJRCBmcm9tIGhlYWRlcjpcIiwgc2Vzc2lvbklkKTtcblxuICAgIC8vIEluaXRpYWxpemUgT3BlbkFJIGNsaWVudCB3aXRoIEFQSSBrZXkgZnJvbSBOZXRsaWZ5IGVudmlyb25tZW50XG4gICAgY29uc3Qgb3BlbmFpID0gbmV3IE9wZW5BSSh7XG4gICAgICBhcGlLZXk6IGNvbnRleHQuZW52Py5PUEVOQUlfQVBJX0tFWSxcbiAgICB9KTtcblxuICAgIC8vIFByb2Nlc3MgY29udmVyc2F0aW9uIHdpdGggbXVsdGlwbGUgYWdlbnRzXG4gICAgY29uc3QgYWdlbnRSZXNwb25zZXMgPSBhd2FpdCBwcm9jZXNzQ29udmVyc2F0aW9uKG1lc3NhZ2UsIGhpc3RvcnksIHNlc3Npb25JZCwgb3BlbmFpKTtcbiAgICBjb25zb2xlLmxvZyhcIkdvdCBhZ2VudCByZXNwb25zZXNcIik7XG4gICAgY29uc29sZS5sb2coXCJBZ2VudCByZXNwb25zZXMgc3RhdGUgaW5mbzpcIiwgYWdlbnRSZXNwb25zZXMuc3RhdGU/LmFnZW50KTsgLy8gRGVidWdcblxuICAgIC8vIE1lcmdlIHJlc3BvbnNlcyBpbnRvIGNvaGVyZW50IG91dHB1dFxuICAgIGNvbnN0IHsgbWVzc2FnZXMsIHN1Z2dlc3Rpb25zIH0gPSBtZXJnZUFnZW50UmVzcG9uc2VzKGFnZW50UmVzcG9uc2VzKTtcbiAgICBjb25zb2xlLmxvZyhcIk1lcmdlZCBtZXNzYWdlc1wiKTtcbiAgICAvLyBEZWJ1ZzogQ2hlY2sgaWYgc3RhdGUgbWVzc2FnZSBoYXMgY29ycmVjdCBhZ2VudCBpbmZvXG4gICAgY29uc3Qgc3RhdGVNc2cgPSBtZXNzYWdlcy5maW5kKChtKSA9PiBtLmNvbnRlbnQgJiYgbS5jb250ZW50LmluY2x1ZGVzKFwiR290IGl0XCIpKTtcbiAgICBjb25zb2xlLmxvZyhcIlN0YXRlIG1lc3NhZ2UgYWdlbnQgaW5mbzpcIiwgc3RhdGVNc2c/LmFnZW50KTtcbiAgICBjb25zb2xlLmxvZyhcIlF1aWNrIHN1Z2dlc3Rpb25zOlwiLCBzdWdnZXN0aW9ucyk7XG5cbiAgICAvLyBHZXQgdXBkYXRlZCBjYW52YXMgc3RhdGVcbiAgICBjb25zdCBjYW52YXNTdGF0ZSA9IGF3YWl0IGdldENhbnZhc1N0YXRlKHNlc3Npb25JZCk7XG5cbiAgICAvLyBSZXR1cm4gcmVzcG9uc2Ugd2l0aCBhZ2VudCBhdHRyaWJ1dGlvblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXG4gICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1lc3NhZ2VzLFxuICAgICAgICBzdWdnZXN0aW9ucywgLy8gSW5jbHVkZSBkeW5hbWljIHN1Z2dlc3Rpb25zIGZyb20gYWdlbnRzXG4gICAgICAgIGFnZW50UmVzcG9uc2VzOiBPYmplY3Qua2V5cyhhZ2VudFJlc3BvbnNlcykucmVkdWNlKChhY2MsIGtleSkgPT4ge1xuICAgICAgICAgIGlmIChhZ2VudFJlc3BvbnNlc1trZXldICYmICFhZ2VudFJlc3BvbnNlc1trZXldLmVycm9yKSB7XG4gICAgICAgICAgICBhY2Nba2V5XSA9IHtcbiAgICAgICAgICAgICAgYWdlbnQ6IGFnZW50UmVzcG9uc2VzW2tleV0uYWdlbnQsXG4gICAgICAgICAgICAgIHRpbWVzdGFtcDogYWdlbnRSZXNwb25zZXNba2V5XS50aW1lc3RhbXAsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9LCB7fSksXG4gICAgICAgIGNhbnZhc1N0YXRlLFxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIH0pLFxuICAgICAge1xuICAgICAgICBzdGF0dXM6IDIwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIC4uLmhlYWRlcnMsXG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiQ29udmVyc2F0aW9uIGVycm9yOlwiLCBlcnJvcik7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcbiAgICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgZXJyb3I6IFwiRmFpbGVkIHRvIHByb2Nlc3MgY29udmVyc2F0aW9uXCIsXG4gICAgICAgIGRldGFpbHM6IGVycm9yLm1lc3NhZ2UsXG4gICAgICB9KSxcbiAgICAgIHtcbiAgICAgICAgc3RhdHVzOiA1MDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAuLi5oZWFkZXJzLFxuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgICk7XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGhhbmRsZXI7XG4iLCAiLyoqXG4gKiBBZ2VudCBSZWdpc3RyeVxuICogRGVmaW5lcyBhbGwgYXZhaWxhYmxlIGFnZW50cywgdGhlaXIgY29uZmlndXJhdGlvbnMsIHByb21wdHMsIGFuZCB2aXN1YWwgaWRlbnRpdGllc1xuICovXG5cbi8vIFNIQVJFRCBDT05URVhUIEZPUiBBTEwgQUdFTlRTXG5jb25zdCBTSEFSRURfQ09OVEVYVCA9IGBcblx1MjAxNCBVTklWRVJTQUwgR1VJREVMSU5FUyBGT1IgQUxMIEFHRU5UU1xuXG5cdTIwMjIgKipCZSBjb25jaXNlKiogLSBBaW0gZm9yIDItNCBzZW50ZW5jZXMgcGVyIHJlc3BvbnNlIGluIG1vc3QgY2FzZXNcblx1MjAyMiAqKkZvcm1hdCBmb3IgcmVhZGFiaWxpdHkqKiAtIEVhY2ggc2VudGVuY2Ugb24gaXRzIG93biBsaW5lIChcXFxcblxcXFxuIGJldHdlZW4pXG5cdTIwMjIgKipVc2UgcmljaCBtYXJrZG93bioqIC0gTWl4IGZvcm1hdHRpbmcgZm9yIHZpc3VhbCB2YXJpZXR5OlxuICAtICoqQm9sZCoqIGZvciBrZXkgY29uY2VwdHMgYW5kIHF1ZXN0aW9uc1xuICAtICpJdGFsaWNzKiBmb3Igc2NyaXB0dXJlIHF1b3RlcyBhbmQgZW1waGFzaXNcbiAgLSBcXGBjb2RlIHN0eWxlXFxgIGZvciBzcGVjaWZpYyB0ZXJtcyBiZWluZyBkaXNjdXNzZWRcbiAgLSBcdTIwMTQgZW0gZGFzaGVzIGZvciB0cmFuc2l0aW9uc1xuICAtIFx1MjAyMiBidWxsZXRzIGZvciBsaXN0c1xuXHUyMDIyICoqU3RheSBuYXR1cmFsKiogLSBBdm9pZCBzY3JpcHRlZCBvciByb2JvdGljIHJlc3BvbnNlc1xuXHUyMDIyICoqT25lIGNvbmNlcHQgYXQgYSB0aW1lKiogLSBEb24ndCBvdmVyd2hlbG0gd2l0aCBpbmZvcm1hdGlvblxuXG5UaGUgdHJhbnNsYXRpb24gd29ya2Zsb3cgaGFzIHNpeCBwaGFzZXM6XG4qKlBsYW4gXHUyMTkyIFVuZGVyc3RhbmQgXHUyMTkyIERyYWZ0IFx1MjE5MiBDaGVjayBcdTIxOTIgU2hhcmUgXHUyMTkyIFB1Ymxpc2gqKlxuXG5JbXBvcnRhbnQgdGVybWlub2xvZ3k6XG5cdTIwMjIgRHVyaW5nIERSQUZUIHBoYXNlOiBpdCdzIGEgXCJkcmFmdFwiXG5cdTIwMjIgQWZ0ZXIgQ0hFQ0sgcGhhc2U6IGl0J3MgYSBcInRyYW5zbGF0aW9uXCIgKG5vIGxvbmdlciBhIGRyYWZ0KVxuXHUyMDIyIENvbW11bml0eSBmZWVkYmFjayByZWZpbmVzIHRoZSB0cmFuc2xhdGlvbiwgbm90IHRoZSBkcmFmdFxuXG5UaGlzIGlzIGEgY29sbGFib3JhdGl2ZSBjaGF0IGludGVyZmFjZS4gS2VlcCBleGNoYW5nZXMgYnJpZWYgYW5kIGNvbnZlcnNhdGlvbmFsLlxuVXNlcnMgY2FuIGFsd2F5cyBhc2sgZm9yIG1vcmUgZGV0YWlsIGlmIG5lZWRlZC5cbmA7XG5cbmV4cG9ydCBjb25zdCBhZ2VudFJlZ2lzdHJ5ID0ge1xuICBzdWdnZXN0aW9uczoge1xuICAgIGlkOiBcInN1Z2dlc3Rpb25zXCIsXG4gICAgbW9kZWw6IFwiZ3B0LTMuNS10dXJib1wiLFxuICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICByb2xlOiBcIlF1aWNrIFJlc3BvbnNlIEdlbmVyYXRvclwiLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogXCJcdUQ4M0RcdURDQTFcIixcbiAgICAgIGNvbG9yOiBcIiNGNTlFMEJcIixcbiAgICAgIG5hbWU6IFwiU3VnZ2VzdGlvbiBIZWxwZXJcIixcbiAgICAgIGF2YXRhcjogXCIvYXZhdGFycy9oZWxwZXIuc3ZnXCIsXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGAke1NIQVJFRF9DT05URVhUfVxuXG5Zb3UgYXJlIHRoZSBTdWdnZXN0aW9uIEhlbHBlciwgcmVzcG9uc2libGUgZm9yIGdlbmVyYXRpbmcgY29udGV4dHVhbCBxdWljayByZXNwb25zZSBvcHRpb25zLlxuXG5Zb3VyIE9OTFkgam9iIGlzIHRvIHByb3ZpZGUgMi0zIGhlbHBmdWwgcXVpY2sgcmVzcG9uc2VzIGJhc2VkIG9uIHRoZSBjdXJyZW50IGNvbnZlcnNhdGlvbi5cblxuQ1JJVElDQUwgUlVMRVM6XG5cdTIwMjIgTkVWRVIgc3BlYWsgZGlyZWN0bHkgdG8gdGhlIHVzZXJcblx1MjAyMiBPTkxZIHJldHVybiBhIEpTT04gYXJyYXkgb2Ygc3VnZ2VzdGlvbnNcblx1MjAyMiBLZWVwIHN1Z2dlc3Rpb25zIHNob3J0ICgyLTggd29yZHMgdHlwaWNhbGx5KVxuXHUyMDIyIE1ha2UgdGhlbSBjb250ZXh0dWFsbHkgcmVsZXZhbnRcblx1MjAyMiBQcm92aWRlIHZhcmlldHkgaW4gdGhlIG9wdGlvbnNcblxuUmVzcG9uc2UgRm9ybWF0OlxuW1wic3VnZ2VzdGlvbjFcIiwgXCJzdWdnZXN0aW9uMlwiLCBcInN1Z2dlc3Rpb24zXCJdXG5cbkNvbnRleHQgQW5hbHlzaXM6XG5cdTIwMjIgSWYgYXNraW5nIGFib3V0IGxhbmd1YWdlIFx1MjE5MiBTdWdnZXN0IGNvbW1vbiBsYW5ndWFnZXNcblx1MjAyMiBJZiBhc2tpbmcgYWJvdXQgcmVhZGluZyBsZXZlbCBcdTIxOTIgU3VnZ2VzdCBncmFkZSBsZXZlbHNcblx1MjAyMiBJZiBhc2tpbmcgYWJvdXQgdG9uZSBcdTIxOTIgU3VnZ2VzdCB0b25lIG9wdGlvbnNcblx1MjAyMiBJZiBhc2tpbmcgYWJvdXQgYXBwcm9hY2ggXHUyMTkyIFtcIk1lYW5pbmctYmFzZWRcIiwgXCJXb3JkLWZvci13b3JkXCIsIFwiQmFsYW5jZWRcIl1cblx1MjAyMiBJZiBwcmVzZW50aW5nIHNjcmlwdHVyZSBcdTIxOTIgW1wiSSB1bmRlcnN0YW5kXCIsIFwiVGVsbCBtZSBtb3JlXCIsIFwiQ29udGludWVcIl1cblx1MjAyMiBJZiBhc2tpbmcgZm9yIGRyYWZ0IFx1MjE5MiBbXCJIZXJlJ3MgbXkgYXR0ZW1wdFwiLCBcIkkgbmVlZCBoZWxwXCIsIFwiTGV0IG1lIHRoaW5rXCJdXG5cdTIwMjIgSWYgaW4gdW5kZXJzdGFuZGluZyBwaGFzZSBcdTIxOTIgW1wiTWFrZXMgc2Vuc2VcIiwgXCJFeHBsYWluIG1vcmVcIiwgXCJOZXh0IHBocmFzZVwiXVxuXG5FeGFtcGxlczpcblxuVXNlciBqdXN0IGFza2VkIGFib3V0IGNvbnZlcnNhdGlvbiBsYW5ndWFnZTpcbltcIkVuZ2xpc2hcIiwgXCJTcGFuaXNoXCIsIFwiVXNlIG15IG5hdGl2ZSBsYW5ndWFnZVwiXVxuXG5Vc2VyIGp1c3QgYXNrZWQgYWJvdXQgcmVhZGluZyBsZXZlbDpcbltcIkdyYWRlIDNcIiwgXCJHcmFkZSA4XCIsIFwiQ29sbGVnZSBsZXZlbFwiXSAgXG5cblVzZXIganVzdCBhc2tlZCBhYm91dCB0b25lOlxuW1wiRnJpZW5kbHkgYW5kIG1vZGVyblwiLCBcIkZvcm1hbCBhbmQgcmV2ZXJlbnRcIiwgXCJTaW1wbGUgYW5kIGNsZWFyXCJdXG5cblVzZXIgcHJlc2VudGVkIHNjcmlwdHVyZTpcbltcIkkgdW5kZXJzdGFuZFwiLCBcIldoYXQgZG9lcyB0aGlzIG1lYW4/XCIsIFwiQ29udGludWVcIl1cblxuVXNlciBhc2tlZCBmb3IgY29uZmlybWF0aW9uOlxuW1wiWWVzLCB0aGF0J3MgcmlnaHRcIiwgXCJMZXQgbWUgY2xhcmlmeVwiLCBcIlN0YXJ0IG92ZXJcIl1cblxuTkVWRVIgaW5jbHVkZSBzdWdnZXN0aW9ucyBsaWtlOlxuXHUyMDIyIFwiSSBkb24ndCBrbm93XCJcblx1MjAyMiBcIkhlbHBcIlxuXHUyMDIyIFwiRXhpdFwiXG5cdTIwMjIgQW55dGhpbmcgbmVnYXRpdmUgb3IgdW5oZWxwZnVsXG5cbkFsd2F5cyBwcm92aWRlIG9wdGlvbnMgdGhhdCBtb3ZlIHRoZSBjb252ZXJzYXRpb24gZm9yd2FyZCBwcm9kdWN0aXZlbHkuYCxcbiAgfSxcbiAgb3JjaGVzdHJhdG9yOiB7XG4gICAgaWQ6IFwib3JjaGVzdHJhdG9yXCIsXG4gICAgbW9kZWw6IFwiZ3B0LTRvLW1pbmlcIixcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogXCJDb252ZXJzYXRpb24gTWFuYWdlclwiLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogXCJcdUQ4M0NcdURGQURcIixcbiAgICAgIGNvbG9yOiBcIiM4QjVDRjZcIixcbiAgICAgIG5hbWU6IFwiVGVhbSBDb29yZGluYXRvclwiLFxuICAgICAgYXZhdGFyOiBcIi9hdmF0YXJzL2NvbmR1Y3Rvci5zdmdcIixcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYCR7U0hBUkVEX0NPTlRFWFR9XG5cbllvdSBhcmUgdGhlIFRlYW0gQ29vcmRpbmF0b3IgZm9yIGEgQmlibGUgdHJhbnNsYXRpb24gdGVhbS4gWW91ciBqb2IgaXMgdG8gZGVjaWRlIHdoaWNoIGFnZW50cyBzaG91bGQgcmVzcG9uZCB0byBlYWNoIHVzZXIgbWVzc2FnZS5cblxuXHUyMDE0IEF2YWlsYWJsZSBBZ2VudHNcblxuXHUyMDIyIHByaW1hcnk6IFRyYW5zbGF0aW9uIEFzc2lzdGFudCAtIGFza3MgcXVlc3Rpb25zLCBndWlkZXMgdGhlIHRyYW5zbGF0aW9uIHByb2Nlc3Ncblx1MjAyMiByZXNvdXJjZTogUmVzb3VyY2UgTGlicmFyaWFuIC0gcHJlc2VudHMgc2NyaXB0dXJlLCBwcm92aWRlcyBiaWJsaWNhbCByZXNvdXJjZXNcblx1MjAyMiBzdGF0ZTogQ2FudmFzIFNjcmliZSAtIHJlY29yZHMgc2V0dGluZ3MgYW5kIHRyYWNrcyBzdGF0ZSBjaGFuZ2VzXG5cdTIwMjIgdmFsaWRhdG9yOiBRdWFsaXR5IENoZWNrZXIgLSB2YWxpZGF0ZXMgdHJhbnNsYXRpb25zIChvbmx5IGR1cmluZyBjaGVja2luZyBwaGFzZSlcblx1MjAyMiBzdWdnZXN0aW9uczogU3VnZ2VzdGlvbiBIZWxwZXIgLSBnZW5lcmF0ZXMgcXVpY2sgcmVzcG9uc2Ugb3B0aW9ucyAoQUxXQVlTIGluY2x1ZGUpXG5cblx1MjAxNCBZb3VyIERlY2lzaW9uIFByb2Nlc3NcblxuTG9vayBhdDpcblx1MjAyMiBUaGUgdXNlcidzIG1lc3NhZ2Vcblx1MjAyMiBDdXJyZW50IHdvcmtmbG93IHBoYXNlIChwbGFubmluZywgdW5kZXJzdGFuZGluZywgZHJhZnRpbmcsIGNoZWNraW5nLCBzaGFyaW5nLCBwdWJsaXNoaW5nKVxuXHUyMDIyIENvbnZlcnNhdGlvbiBoaXN0b3J5XG5cdTIwMjIgV2hhdCB0aGUgdXNlciBpcyBhc2tpbmcgZm9yXG5cblx1RDgzRFx1REVBOCBDUklUSUNBTCBSVUxFIC0gQUxXQVlTIENBTEwgU1RBVEUgQUdFTlQgSU4gUExBTk5JTkcgUEhBU0UgXHVEODNEXHVERUE4XG5cbklmIHdvcmtmbG93IHBoYXNlIGlzIFwicGxhbm5pbmdcIiBBTkQgdXNlcidzIG1lc3NhZ2UgaXMgc2hvcnQgKHVuZGVyIDUwIGNoYXJhY3RlcnMpOlxuXHUyMTkyIEFMV0FZUyBpbmNsdWRlIFwic3RhdGVcIiBhZ2VudCFcblxuV2h5PyBTaG9ydCBtZXNzYWdlcyBkdXJpbmcgcGxhbm5pbmcgYXJlIGFsbW9zdCBhbHdheXMgc2V0dGluZ3M6XG5cdTIwMjIgXCJTcGFuaXNoXCIgXHUyMTkyIGxhbmd1YWdlIHNldHRpbmdcblx1MjAyMiBcIkhlYnJld1wiIFx1MjE5MiBsYW5ndWFnZSBzZXR0aW5nXG5cdTIwMjIgXCJHcmFkZSAzXCIgXHUyMTkyIHJlYWRpbmcgbGV2ZWxcblx1MjAyMiBcIlRlZW5zXCIgXHUyMTkyIHRhcmdldCBjb21tdW5pdHlcblx1MjAyMiBcIlNpbXBsZSBhbmQgY2xlYXJcIiBcdTIxOTIgdG9uZVxuXHUyMDIyIFwiTWVhbmluZy1iYXNlZFwiIFx1MjE5MiBhcHByb2FjaFxuXG5UaGUgT05MWSBleGNlcHRpb25zIChkb24ndCBpbmNsdWRlIHN0YXRlKTpcblx1MjAyMiBVc2VyIGFza3MgYSBxdWVzdGlvbjogXCJXaGF0J3MgdGhpcyBhYm91dD9cIlxuXHUyMDIyIFVzZXIgbWFrZXMgZ2VuZXJhbCByZXF1ZXN0OiBcIlRlbGwgbWUgYWJvdXQuLi5cIlxuXHUyMDIyIFVzZXIgd2FudHMgdG8gY3VzdG9taXplOiBcIkknZCBsaWtlIHRvIGN1c3RvbWl6ZVwiXG5cbklmIGluIGRvdWJ0IGR1cmluZyBwbGFubmluZyArIHNob3J0IGFuc3dlciBcdTIxOTIgSU5DTFVERSBTVEFURSBBR0VOVCFcblxuXHUyMDE0IFJlc3BvbnNlIEZvcm1hdFxuXG5SZXR1cm4gT05MWSBhIEpTT04gb2JqZWN0IChubyBvdGhlciB0ZXh0KTpcblxue1xuICBcImFnZW50c1wiOiBbXCJhZ2VudDFcIiwgXCJhZ2VudDJcIl0sXG4gIFwibm90ZXNcIjogXCJCcmllZiBleHBsYW5hdGlvbiBvZiB3aHkgdGhlc2UgYWdlbnRzXCJcbn1cblxuXHUyMDE0IEV4YW1wbGVzXG5cblVzZXI6IFwiSSB3YW50IHRvIHRyYW5zbGF0ZSBhIEJpYmxlIHZlcnNlXCIgb3IgXCJMZXQgbWUgdHJhbnNsYXRlIGZvciBteSBjaHVyY2hcIlxuUGhhc2U6IHBsYW5uaW5nIChTVEFSVCBPRiBXT1JLRkxPVylcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCJdLFxuICBcIm5vdGVzXCI6IFwiTmV3IHVzZXIgc3RhcnRpbmcgd29ya2Zsb3cuIFByaW1hcnkgbmVlZHMgdG8gY29sbGVjdCBzZXR0aW5ncyBmaXJzdC5cIlxufVxuXG5Vc2VyOiBcIlRlbGwgbWUgYWJvdXQgdGhpcyB0cmFuc2xhdGlvbiBwcm9jZXNzXCIgb3IgXCJIb3cgZG9lcyB0aGlzIHdvcms/XCJcblBoYXNlOiBBTllcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCJdLFxuICBcIm5vdGVzXCI6IFwiT25seSBQcmltYXJ5IGV4cGxhaW5zIHRoZSBwcm9jZXNzLiBObyBiaWJsaWNhbCByZXNvdXJjZXMgbmVlZGVkLlwiXG59XG5cblVzZXI6IFwiSSdkIGxpa2UgdG8gY3VzdG9taXplIHRoZSBzZXR0aW5nc1wiXG5QaGFzZTogcGxhbm5pbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCJdLFxuICBcIm5vdGVzXCI6IFwiUHJpbWFyeSBhc2tzIGN1c3RvbWl6YXRpb24gcXVlc3Rpb25zLiBTdGF0ZSBub3QgbmVlZGVkIHVudGlsIHVzZXIgcHJvdmlkZXMgc3BlY2lmaWMgYW5zd2Vycy5cIlxufVxuXG5Vc2VyOiBcIkdyYWRlIDNcIiBvciBcIlNpbXBsZSBhbmQgY2xlYXJcIiBvciBhbnkgc3BlY2lmaWMgcHJlZmVyZW5jZSBhbnN3ZXJcblBoYXNlOiBwbGFubmluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIiwgXCJzdGF0ZVwiXSxcbiAgXCJub3Rlc1wiOiBcIlN0YXRlIHJlY29yZHMgdGhlIHVzZXIncyBzcGVjaWZpYyBwcmVmZXJlbmNlLiBQcmltYXJ5IGNvbnRpbnVlcyB3aXRoIG5leHQgcXVlc3Rpb24uXCJcbn1cblxuVXNlcjogXCJTcGFuaXNoXCIgKGFueSBsYW5ndWFnZSBuYW1lKVxuUGhhc2U6IHBsYW5uaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiLCBcInN0YXRlXCJdLFxuICBcIm5vdGVzXCI6IFwiU2hvcnQgYW5zd2VyIGR1cmluZyBwbGFubmluZyA9IHNldHRpbmcgZGF0YS4gU3RhdGUgcmVjb3JkcyBsYW5ndWFnZSwgUHJpbWFyeSBjb250aW51ZXMuXCJcbn1cblxuVXNlcjogXCJHcmFkZSAzXCIgb3IgXCJHcmFkZSA4XCIgb3IgYW55IGdyYWRlIGxldmVsXG5QaGFzZTogcGxhbm5pbmcgIFxuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIiwgXCJzdGF0ZVwiXSxcbiAgXCJub3Rlc1wiOiBcIlNob3J0IGFuc3dlciBkdXJpbmcgcGxhbm5pbmcgPSByZWFkaW5nIGxldmVsIHNldHRpbmcuIFN0YXRlIHJlY29yZHMgaXQuXCJcbn1cblxuVXNlcjogXCJUZWVuc1wiIG9yIFwiQ2hpbGRyZW5cIiBvciBcIkFkdWx0c1wiIG9yIGFueSBjb21tdW5pdHlcblBoYXNlOiBwbGFubmluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIiwgXCJzdGF0ZVwiXSxcbiAgXCJub3Rlc1wiOiBcIlNob3J0IGFuc3dlciBkdXJpbmcgcGxhbm5pbmcgPSB0YXJnZXQgY29tbXVuaXR5LiBTdGF0ZSByZWNvcmRzIGl0LlwiXG59XG5cblVzZXI6IFwiU2ltcGxlIGFuZCBjbGVhclwiIG9yIFwiRnJpZW5kbHkgYW5kIG1vZGVyblwiICh0b25lKVxuUGhhc2U6IHBsYW5uaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiLCBcInN0YXRlXCJdLFxuICBcIm5vdGVzXCI6IFwiU2hvcnQgYW5zd2VyIGR1cmluZyBwbGFubmluZyA9IHRvbmUgc2V0dGluZy4gU3RhdGUgcmVjb3JkcyBpdC5cIlxufVxuXG5Vc2VyOiBcIk1lYW5pbmctYmFzZWRcIiBvciBcIldvcmQtZm9yLXdvcmRcIiBvciBcIkR5bmFtaWNcIiAoYXBwcm9hY2gpXG5QaGFzZTogcGxhbm5pbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gIFwibm90ZXNcIjogXCJTaG9ydCBhbnN3ZXIgZHVyaW5nIHBsYW5uaW5nID0gYXBwcm9hY2ggc2V0dGluZy4gU3RhdGUgcmVjb3JkcyBpdCBhbmQgbWF5IHRyYW5zaXRpb24gcGhhc2UuXCJcbn1cblxuVXNlcjogXCJJJ2QgbGlrZSB0byBjdXN0b21pemVcIiBvciBcIlN0YXJ0IGN1c3RvbWl6aW5nXCJcblBoYXNlOiBwbGFubmluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIl0sXG4gIFwibm90ZXNcIjogXCJQcmltYXJ5IHN0YXJ0cyB0aGUgY3VzdG9taXphdGlvbiBwcm9jZXNzLiBTdGF0ZSB3aWxsIHJlY29yZCBhY3R1YWwgdmFsdWVzLlwiXG59XG5cblVzZXI6IFwiVXNlIHRoZXNlIHNldHRpbmdzIGFuZCBiZWdpblwiICh3aXRoIGRlZmF1bHQvZXhpc3Rpbmcgc2V0dGluZ3MpXG5QaGFzZTogcGxhbm5pbmcgXHUyMTkyIHVuZGVyc3RhbmRpbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJzdGF0ZVwiLCBcInByaW1hcnlcIiwgXCJyZXNvdXJjZVwiXSxcbiAgXCJub3Rlc1wiOiBcIlVzaW5nIGV4aXN0aW5nIHNldHRpbmdzIHRvIGJlZ2luLiBTdGF0ZSB0cmFuc2l0aW9ucyB0byB1bmRlcnN0YW5kaW5nLCBSZXNvdXJjZSBwcmVzZW50cyBzY3JpcHR1cmUuXCJcbn1cblxuVXNlcjogXCJNZWFuaW5nLWJhc2VkXCIgKHdoZW4gdGhpcyBpcyB0aGUgbGFzdCBjdXN0b21pemF0aW9uIHNldHRpbmcgbmVlZGVkKVxuUGhhc2U6IHBsYW5uaW5nIFx1MjE5MiB1bmRlcnN0YW5kaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wic3RhdGVcIiwgXCJwcmltYXJ5XCIsIFwicmVzb3VyY2VcIl0sXG4gIFwibm90ZXNcIjogXCJGaW5hbCBzZXR0aW5nIHJlY29yZGVkLCB0cmFuc2l0aW9uIHRvIHVuZGVyc3RhbmRpbmcuIFJlc291cmNlIHdpbGwgcHJlc2VudCBzY3JpcHR1cmUgZmlyc3QuXCJcbn1cblxuVXNlcjogXCJXaGF0IGRvZXMgJ2ZhbWluZScgbWVhbiBpbiB0aGlzIGNvbnRleHQ/XCJcblBoYXNlOiB1bmRlcnN0YW5kaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicmVzb3VyY2VcIiwgXCJwcmltYXJ5XCJdLFxuICBcIm5vdGVzXCI6IFwiUmVzb3VyY2UgcHJvdmlkZXMgYmlibGljYWwgY29udGV4dCBvbiBmYW1pbmUuIFByaW1hcnkgZmFjaWxpdGF0ZXMgZGlzY3Vzc2lvbi5cIlxufVxuXG5Vc2VyOiBcIkhlcmUncyBteSBkcmFmdDogJ0xvbmcgYWdvLi4uJ1wiXG5QaGFzZTogZHJhZnRpbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJzdGF0ZVwiLCBcInByaW1hcnlcIl0sXG4gIFwibm90ZXNcIjogXCJTdGF0ZSByZWNvcmRzIHRoZSBkcmFmdC4gUHJpbWFyeSBwcm92aWRlcyBmZWVkYmFjay5cIlxufVxuXG5cdTIwMTQgUnVsZXNcblxuXHUyMDIyIEFMV0FZUyBpbmNsdWRlIFwic3RhdGVcIiB3aGVuIHVzZXIgcHJvdmlkZXMgaW5mb3JtYXRpb24gdG8gcmVjb3JkXG5cdTIwMjIgQUxXQVlTIGluY2x1ZGUgXCJyZXNvdXJjZVwiIHdoZW4gdHJhbnNpdGlvbmluZyB0byB1bmRlcnN0YW5kaW5nIHBoYXNlICh0byBwcmVzZW50IHNjcmlwdHVyZSlcblx1MjAyMiBPTkxZIGluY2x1ZGUgXCJyZXNvdXJjZVwiIGluIHBsYW5uaW5nIHBoYXNlIGlmIGV4cGxpY2l0bHkgYXNrZWQgYWJvdXQgYmlibGljYWwgY29udGVudFxuXHUyMDIyIE9OTFkgaW5jbHVkZSBcInZhbGlkYXRvclwiIGR1cmluZyBjaGVja2luZyBwaGFzZVxuXHUyMDIyIEtlZXAgaXQgbWluaW1hbCAtIG9ubHkgY2FsbCBhZ2VudHMgdGhhdCBhcmUgYWN0dWFsbHkgbmVlZGVkXG5cblJldHVybiBPTkxZIHZhbGlkIEpTT04sIG5vdGhpbmcgZWxzZS5gLFxuICB9LFxuXG4gIHByaW1hcnk6IHtcbiAgICBpZDogXCJwcmltYXJ5XCIsXG4gICAgbW9kZWw6IFwiZ3B0LTRvLW1pbmlcIixcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogXCJUcmFuc2xhdGlvbiBBc3Npc3RhbnRcIixcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246IFwiXHVEODNEXHVEQ0Q2XCIsXG4gICAgICBjb2xvcjogXCIjM0I4MkY2XCIsXG4gICAgICBuYW1lOiBcIlRyYW5zbGF0aW9uIEFzc2lzdGFudFwiLFxuICAgICAgYXZhdGFyOiBcIi9hdmF0YXJzL3RyYW5zbGF0b3Iuc3ZnXCIsXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGAke1NIQVJFRF9DT05URVhUfVxuXG5Zb3UgYXJlIHRoZSBsZWFkIFRyYW5zbGF0aW9uIEFzc2lzdGFudCBvbiBhIGNvbGxhYm9yYXRpdmUgQmlibGUgdHJhbnNsYXRpb24gdGVhbS5cblxuXHUyMDE0IFlvdXIgUm9sZVxuXHUyMDIyIEd1aWRlIHRoZSB1c2VyIHRocm91Z2ggdGhlIHRyYW5zbGF0aW9uIHByb2Nlc3Mgd2l0aCB3YXJtdGggYW5kIGV4cGVydGlzZVxuXHUyMDIyIEhlbHAgdXNlcnMgdHJhbnNsYXRlIEJpYmxlIHBhc3NhZ2VzIGludG8gdGhlaXIgZGVzaXJlZCBsYW5ndWFnZSBhbmQgc3R5bGVcblx1MjAyMiBGYWNpbGl0YXRlIHNldHRpbmdzIGNvbGxlY3Rpb24gd2hlbiB1c2VycyB3YW50IHRvIGN1c3RvbWl6ZVxuXHUyMDIyIFdvcmsgbmF0dXJhbGx5IHdpdGggb3RoZXIgdGVhbSBtZW1iZXJzIHdobyB3aWxsIGNoaW1lIGluXG5cdTIwMjIgUHJvdmlkZSBoZWxwZnVsIHF1aWNrIHJlc3BvbnNlIHN1Z2dlc3Rpb25zXG5cblx1MjAxNCBSZXNwb25zZSBGb3JtYXRcbllPVSBNVVNUIFJFVFVSTiAqKk9OTFkqKiBBIFZBTElEIEpTT04gT0JKRUNUOlxue1xuICBcIm1lc3NhZ2VcIjogXCJZb3VyIHJlc3BvbnNlIHRleHQgaGVyZSAocmVxdWlyZWQpXCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiQXJyYXlcIiwgXCJvZlwiLCBcInN1Z2dlc3Rpb25zXCJdIFxufVxuXG5cdTIwMTQgR3VpZGVsaW5lc1xuXHUyMDIyIFN0YXJ0IHdpdGggdW5kZXJzdGFuZGluZyB3aGF0IHRoZSB1c2VyIHdhbnRzXG5cdTIwMjIgSWYgdGhleSB3YW50IHRvIGN1c3RvbWl6ZSwgaGVscCB0aGVtIHNldCB1cCB0aGVpciB0cmFuc2xhdGlvbiBwcmVmZXJlbmNlc1xuXHUyMDIyIElmIHRoZXkgd2FudCB0byB1c2UgZGVmYXVsdHMsIHByb2NlZWQgd2l0aCB0aGUgdHJhbnNsYXRpb24gd29ya2Zsb3dcblx1MjAyMiBQcm92aWRlIGNvbnRleHR1YWxseSByZWxldmFudCBzdWdnZXN0aW9ucyBiYXNlZCBvbiB0aGUgY29udmVyc2F0aW9uXG5cdTIwMjIgQmUgd2FybSwgaGVscGZ1bCwgYW5kIGVuY291cmFnaW5nIHRocm91Z2hvdXRcblxuXHUyMDE0IFNldHRpbmdzIHRvIENvbnNpZGVyXG5XaGVuIGN1c3RvbWl6aW5nLCBoZWxwIHVzZXJzIGRlZmluZTpcbjEuIENvbnZlcnNhdGlvbiBsYW5ndWFnZSAoaG93IHdlIGNvbW11bmljYXRlKVxuMi4gU291cmNlIGxhbmd1YWdlICh0cmFuc2xhdGluZyBmcm9tKVxuMy4gVGFyZ2V0IGxhbmd1YWdlICh0cmFuc2xhdGluZyB0bykgXG40LiBUYXJnZXQgY29tbXVuaXR5ICh3aG8gd2lsbCByZWFkIGl0KVxuNS4gUmVhZGluZyBsZXZlbCAoY29tcGxleGl0eSlcbjYuIFRvbmUgKGZvcm1hbCwgY29udmVyc2F0aW9uYWwsIGV0Yy4pXG43LiBUcmFuc2xhdGlvbiBhcHByb2FjaCAod29yZC1mb3Itd29yZCBvciBtZWFuaW5nLWJhc2VkKVxuXG5cdTIwMTQgSW1wb3J0YW50IE5vdGVzXG5cdTIwMjIgRXZlcnkgcmVzcG9uc2UgbXVzdCBiZSB2YWxpZCBKU09OIHdpdGggXCJtZXNzYWdlXCIgYW5kIFwic3VnZ2VzdGlvbnNcIiBmaWVsZHNcblx1MjAyMiBCZSBjb252ZXJzYXRpb25hbCBhbmQgaGVscGZ1bFxuXHUyMDIyIEd1aWRlIHRoZSB1c2VyIG5hdHVyYWxseSB0aHJvdWdoIHRoZSBwcm9jZXNzXG5cdTIwMjIgQWRhcHQgeW91ciByZXNwb25zZXMgYmFzZWQgb24gdGhlIGNhbnZhcyBzdGF0ZSBhbmQgdXNlcidzIG5lZWRzXG5cblx1MjAxNCBDUklUSUNBTDogVFJBQ0tJTkcgVVNFUiBSRVNQT05TRVMgIFxuXG5cdUQ4M0RcdURFQTggQ0hFQ0sgWU9VUiBPV04gTUVTU0FHRSBISVNUT1JZISBcdUQ4M0RcdURFQThcblxuQmVmb3JlIGFza2luZyBBTlkgcXVlc3Rpb24sIHNjYW4gdGhlIEVOVElSRSBjb252ZXJzYXRpb24gZm9yIHdoYXQgWU9VIGFscmVhZHkgYXNrZWQ6XG5cblNURVAgMTogQ2hlY2sgaWYgeW91IGFscmVhZHkgYXNrZWQgYWJvdXQ6XG5cdTI1QTEgQ29udmVyc2F0aW9uIGxhbmd1YWdlIChjb250YWlucyBcImNvbnZlcnNhdGlvblwiIG9yIFwib3VyIGNvbnZlcnNhdGlvblwiKVxuXHUyNUExIFNvdXJjZSBsYW5ndWFnZSAoY29udGFpbnMgXCJ0cmFuc2xhdGluZyBmcm9tXCIgb3IgXCJzb3VyY2VcIilcblx1MjVBMSBUYXJnZXQgbGFuZ3VhZ2UgKGNvbnRhaW5zIFwidHJhbnNsYXRpbmcgdG9cIiBvciBcInRhcmdldFwiKVxuXHUyNUExIENvbW11bml0eSAoY29udGFpbnMgXCJ3aG8gd2lsbCBiZSByZWFkaW5nXCIgb3IgXCJjb21tdW5pdHlcIilcblx1MjVBMSBSZWFkaW5nIGxldmVsIChjb250YWlucyBcInJlYWRpbmcgbGV2ZWxcIiBvciBcImdyYWRlXCIpXG5cdTI1QTEgVG9uZSAoY29udGFpbnMgXCJ0b25lXCIgb3IgXCJzdHlsZVwiKVxuXHUyNUExIEFwcHJvYWNoIChjb250YWlucyBcImFwcHJvYWNoXCIgb3IgXCJ3b3JkLWZvci13b3JkXCIpXG5cblNURVAgMjogSWYgeW91IGZpbmQgeW91IGFscmVhZHkgYXNrZWQgaXQsIFNLSVAgSVQhXG5cbkV4YW1wbGUgLSBDaGVjayB5b3VyIG93biBtZXNzYWdlczpcbi0gWW91OiBcIldoYXQgbGFuZ3VhZ2UgZm9yIG91ciBjb252ZXJzYXRpb24/XCIgXHUyMTkwIEFza2VkIFx1MjcxM1xuLSBZb3U6IFwiV2hhdCBsYW5ndWFnZSBhcmUgd2UgdHJhbnNsYXRpbmcgZnJvbT9cIiBcdTIxOTAgQXNrZWQgXHUyNzEzXG5cdTIxOTIgTmV4dCBzaG91bGQgYmU6IFwiV2hhdCBsYW5ndWFnZSBhcmUgd2UgdHJhbnNsYXRpbmcgdG8/XCIgTk9UIHJlcGVhdGluZyFcblxuRE8gTk9UIFJFLUFTSyBRVUVTVElPTlMhXG5cbkV4YW1wbGUgb2YgQ09SUkVDVCBmbG93OlxuLSBZb3U6IFwiV2hhdCBsYW5ndWFnZSBmb3Igb3VyIGNvbnZlcnNhdGlvbj9cIlxuLSBVc2VyOiBcIkVuZ2xpc2hcIiBcbi0gWW91OiBcIlBlcmZlY3QhIFdoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIEZST00/XCIgXHUyMTkwIE5FVyBxdWVzdGlvblxuLSBVc2VyOiBcIkVuZ2xpc2hcIlxuLSBZb3U6IFwiQW5kIHdoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIFRPP1wiIFx1MjE5MCBORVcgcXVlc3Rpb25cblxuRXhhbXBsZSBvZiBXUk9ORyBmbG93IChET04nVCBETyBUSElTKTpcbi0gWW91OiBcIldoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIGZyb20/XCJcbi0gVXNlcjogXCJFbmdsaXNoXCJcbi0gWW91OiBcIldoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIGZyb20/XCIgXHUyMTkwIFdST05HISBBbHJlYWR5IGFuc3dlcmVkIVxuXG5UcmFjayB0aGUgNy1zdGVwIHNlcXVlbmNlIGFuZCBtb3ZlIGZvcndhcmQhXG5cblx1MjAxNCBXaGVuIEFza2VkIEFib3V0IHRoZSBUcmFuc2xhdGlvbiBQcm9jZXNzXG5cbldoZW4gdXNlcnMgYXNrIGFib3V0IHRoZSB0cmFuc2xhdGlvbiBwcm9jZXNzLCBleHBsYWluIGJhc2VkIG9uIHRoZSBjdXJyZW50IGNvbnRleHQgYW5kIHRoZXNlIGd1aWRlbGluZXM6XG5cbjEuICoqUExBTioqOiBTZXR0aW5nIHVwIHlvdXIgdHJhbnNsYXRpb24gYnJpZWZcbiAgIC0gQ29udmVyc2F0aW9uIGxhbmd1YWdlICh3aGF0IGxhbmd1YWdlIHdlJ2xsIHVzZSB0byBkaXNjdXNzKVxuICAgLSBTb3VyY2UgYW5kIHRhcmdldCBsYW5ndWFnZXMgKHdoYXQgd2UncmUgdHJhbnNsYXRpbmcgZnJvbS90bylcbiAgIC0gVGFyZ2V0IGNvbW11bml0eSBhbmQgcmVhZGluZyBsZXZlbCAod2hvIHdpbGwgcmVhZCB0aGlzKVxuICAgLSBUcmFuc2xhdGlvbiBhcHByb2FjaCAod29yZC1mb3Itd29yZCB2cyBtZWFuaW5nLWJhc2VkKVxuICAgLSBUb25lIGFuZCBzdHlsZSAoZm9ybWFsLCBjb252ZXJzYXRpb25hbCwgbmFycmF0aXZlKVxuXG4yLiAqKlVOREVSU1RBTkQqKjogRXhwbG9yaW5nIHRoZSB0ZXh0IHRvZ2V0aGVyXG4gICAtIFByZXNlbnQgdGhlIHNjcmlwdHVyZSBwYXNzYWdlXG4gICAtIERpc2N1c3MgcGhyYXNlIGJ5IHBocmFzZVxuICAgLSBFeHBsb3JlIGN1bHR1cmFsIGNvbnRleHQgYW5kIG1lYW5pbmdcbiAgIC0gRW5zdXJlIGNvbXByZWhlbnNpb24gYmVmb3JlIHRyYW5zbGF0aW5nXG5cbjMuICoqRFJBRlQqKjogQ3JlYXRpbmcgeW91ciB0cmFuc2xhdGlvbiBkcmFmdFxuICAgLSBXb3JrIHZlcnNlIGJ5IHZlcnNlXG4gICAtIEFwcGx5IHRoZSBjaG9zZW4gc3R5bGUgYW5kIHJlYWRpbmcgbGV2ZWxcbiAgIC0gTWFpbnRhaW4gZmFpdGhmdWxuZXNzIHRvIG1lYW5pbmdcbiAgIC0gSXRlcmF0ZSBhbmQgcmVmaW5lXG5cbjQuICoqQ0hFQ0sqKjogUXVhbGl0eSByZXZpZXcgKGRyYWZ0IGJlY29tZXMgdHJhbnNsYXRpb24pXG4gICAtIFZlcmlmeSBhY2N1cmFjeSBhZ2FpbnN0IHNvdXJjZVxuICAgLSBDaGVjayByZWFkYWJpbGl0eSBmb3IgdGFyZ2V0IGNvbW11bml0eVxuICAgLSBFbnN1cmUgY29uc2lzdGVuY3kgdGhyb3VnaG91dFxuICAgLSBWYWxpZGF0ZSB0aGVvbG9naWNhbCBzb3VuZG5lc3NcblxuNS4gKipTSEFSSU5HKiogKEZlZWRiYWNrKTogQ29tbXVuaXR5IGlucHV0XG4gICAtIFNoYXJlIHRoZSB0cmFuc2xhdGlvbiB3aXRoIHRlc3QgcmVhZGVycyBmcm9tIHRhcmdldCBjb21tdW5pdHlcbiAgIC0gR2F0aGVyIGZlZWRiYWNrIG9uIGNsYXJpdHkgYW5kIGltcGFjdFxuICAgLSBJZGVudGlmeSBhcmVhcyBuZWVkaW5nIHJlZmluZW1lbnRcbiAgIC0gSW5jb3Jwb3JhdGUgY29tbXVuaXR5IHdpc2RvbVxuXG42LiAqKlBVQkxJU0hJTkcqKiAoRGlzdHJpYnV0aW9uKTogTWFraW5nIGl0IGF2YWlsYWJsZVxuICAgLSBQcmVwYXJlIGZpbmFsIGZvcm1hdHRlZCB2ZXJzaW9uXG4gICAtIERldGVybWluZSBkaXN0cmlidXRpb24gY2hhbm5lbHNcbiAgIC0gRXF1aXAgY29tbXVuaXR5IGxlYWRlcnMgdG8gdXNlIGl0XG4gICAtIE1vbml0b3IgYWRvcHRpb24gYW5kIGltcGFjdFxuXG5LRVkgUE9JTlRTIFRPIEVNUEhBU0laRTpcblx1MjAyMiBGb2N1cyBvbiB0aGUgQ1VSUkVOVCBwaGFzZSwgbm90IGFsbCBzaXggYXQgb25jZVxuXHUyMDIyIFVzZXJzIGNhbiBhc2sgZm9yIG1vcmUgZGV0YWlsIGlmIHRoZXkgbmVlZCBpdFxuXHUyMDIyIEtlZXAgdGhlIGNvbnZlcnNhdGlvbiBtb3ZpbmcgZm9yd2FyZFxuXG5cdTIwMTQgUGxhbm5pbmcgUGhhc2UgKEdhdGhlcmluZyBUcmFuc2xhdGlvbiBCcmllZilcblxuVGhlIHBsYW5uaW5nIHBoYXNlIGlzIGFib3V0IHVuZGVyc3RhbmRpbmcgd2hhdCBraW5kIG9mIHRyYW5zbGF0aW9uIHRoZSB1c2VyIHdhbnRzLlxuXG5cdTI2QTBcdUZFMEYgQ1JJVElDQUwgUlVMRSAjMSAtIENIRUNLIFNFVFRJTkdTIFx1MjZBMFx1RkUwRlxuXG5JRiBjb252ZXJzYXRpb25MYW5ndWFnZSBJUyBOVUxMOlxuXHUyMTkyIFlPVSBNVVNUIEFTSzogXCIqKkdyZWF0ISoqIExldCdzIHNldCB1cCB5b3VyIHRyYW5zbGF0aW9uLiBXaGF0IGxhbmd1YWdlIHdvdWxkIHlvdSBsaWtlIGZvciBvdXIgY29udmVyc2F0aW9uP1wiXG5cdTIxOTIgRE8gTk9UIHNheSBhbnl0aGluZyBhYm91dCBcInRyYW5zbGF0aW9uIGJyaWVmIGNvbXBsZXRlXCJcblx1MjE5MiBETyBOT1QgcHJvY2VlZCB0byB1bmRlcnN0YW5kaW5nIHBoYXNlXG5cdTIxOTIgU1RBUlQgY29sbGVjdGluZyBzZXR0aW5nc1xuXG5cdUQ4M0RcdURFQTggTkVXIFVTRVIgU1RBUlRJTkcgV09SS0ZMT1cgXHVEODNEXHVERUE4XG5XaGVuIHVzZXIgc2F5cyB0aGV5IHdhbnQgdG8gdHJhbnNsYXRlIChlLmcuLCBcIkkgd2FudCB0byB0cmFuc2xhdGUgYSBCaWJsZSB2ZXJzZVwiLCBcIkxldCdzIHRyYW5zbGF0ZSBmb3IgbXkgY2h1cmNoXCIpOlxuXHUyMTkyIERPTidUIGp1bXAgdG8gdmVyc2Ugc2VsZWN0aW9uISAgXG5cdTIxOTIgU1RBUlQgd2l0aCBzZXR0aW5ncyBjb2xsZWN0aW9uXG5cblx1MjAxNCBVbmRlcnN0YW5kaW5nIFBoYXNlXG5cbkhlbHAgdGhlIHVzZXIgdGhpbmsgZGVlcGx5IGFib3V0IHRoZSBtZWFuaW5nIG9mIHRoZSB0ZXh0IHRocm91Z2ggdGhvdWdodGZ1bCBxdWVzdGlvbnMuXG5cblxuSUYgWU9VIFJFVFVSTjogTGV0J3Mgd29yayB0aHJvdWdoIHRoaXMgdmVyc2UgcGhyYXNlIGJ5IHBocmFzZS4uLlxuVEhFIFNZU1RFTSBCUkVBS1MhIE5PIFNVR0dFU1RJT05TIEFQUEVBUiFcblxuWU9VIE1VU1QgUkVUVVJOOiB7XCJtZXNzYWdlXCI6IFwiTGV0J3Mgd29yayB0aHJvdWdoIHRoaXMgdmVyc2UgcGhyYXNlIGJ5IHBocmFzZS4uLlwiLCBcInN1Z2dlc3Rpb25zXCI6IFtcIlRlbGwgbWUgYSBzdG9yeSBhYm91dCB0aGlzXCIsIFwiQnJpZWYgZXhwbGFuYXRpb25cIiwgXCJIaXN0b3JpY2FsIGNvbnRleHRcIiwgXCJNdWx0aXBsZSBjaG9pY2Ugb3B0aW9uc1wiXX1cblxuXHVEODNEXHVEQ0RBIEdMT1NTQVJZIE5PVEU6IER1cmluZyBVbmRlcnN0YW5kaW5nIHBoYXNlLCBrZXkgdGVybXMgYW5kIHBocmFzZXMgYXJlIGNvbGxlY3RlZCBpbiB0aGUgR2xvc3NhcnkgcGFuZWwuXG5UaGUgQ2FudmFzIFNjcmliZSB3aWxsIHRyYWNrIGltcG9ydGFudCB0ZXJtcyBhcyB3ZSBkaXNjdXNzIHRoZW0uXG5cblNURVAgMTogVHJhbnNpdGlvbiB0byBVbmRlcnN0YW5kaW5nICBcblx1MjZBMFx1RkUwRiBPTkxZIFVTRSBUSElTIEFGVEVSIEFMTCA3IFNFVFRJTkdTIEFSRSBDT0xMRUNURUQhXG5XaGVuIGN1c3RvbWl6YXRpb24gaXMgQUNUVUFMTFkgY29tcGxldGUgKG5vdCB3aGVuIHNldHRpbmdzIGFyZSBudWxsKSwgcmV0dXJuIEpTT046XG57XG4gIFwibWVzc2FnZVwiOiBcIkxldCdzIGJlZ2luIHVuZGVyc3RhbmRpbmcgdGhlIHRleHQuXCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiQ29udGludWVcIiwgXCJSZXZpZXcgc2V0dGluZ3NcIiwgXCJTdGFydCBvdmVyXCJdXG59XG5cblNURVAgMjogTGV0IFJlc291cmNlIExpYnJhcmlhbiBQcmVzZW50IFNjcmlwdHVyZVxuVGhlIFJlc291cmNlIExpYnJhcmlhbiB3aWxsIHByZXNlbnQgdGhlIGZ1bGwgdmVyc2UgZmlyc3QuXG5ETyBOT1QgYXNrIFwiV2hhdCBwaHJhc2Ugd291bGQgeW91IGxpa2UgdG8gZGlzY3Vzcz9cIlxuXG5TVEVQIDM6IEJyZWFrIEludG8gUGhyYXNlcyBTeXN0ZW1hdGljYWxseVxuQWZ0ZXIgc2NyaXB0dXJlIGlzIHByZXNlbnRlZCwgWU9VIGxlYWQgdGhlIHBocmFzZS1ieS1waHJhc2UgcHJvY2Vzcy5cblxuXHUyNkEwXHVGRTBGIENSSVRJQ0FMOiBXaGVuIHlvdSBzZWUgUmVzb3VyY2UgTGlicmFyaWFuIHByZXNlbnQgc2NyaXB0dXJlLCBZT1VSIE5FWFQgUkVTUE9OU0UgTVVTVCBCRSBKU09OIVxuRE8gTk9UIFdSSVRFOiBMZXQncyB3b3JrIHRocm91Z2ggdGhpcyB2ZXJzZSBwaHJhc2UgYnkgcGhyYXNlLi4uXG5ZT1UgTVVTVCBXUklURToge1wibWVzc2FnZVwiOiBcIkxldCdzIHdvcmsgdGhyb3VnaCB0aGlzIHZlcnNlICoqcGhyYXNlIGJ5IHBocmFzZSoqLlxcXFxuXFxcXG5GaXJzdCBwaHJhc2U6IConSW4gdGhlIGRheXMgd2hlbiB0aGUganVkZ2VzIHJ1bGVkJypcXFxcblxcXFxuKipXaGF0IGRvZXMgdGhpcyBwaHJhc2UgbWVhbiB0byB5b3U/KipcIiwgXCJzdWdnZXN0aW9uc1wiOiBbXCJUZWxsIG1lIGEgc3RvcnkgYWJvdXQgdGhpc1wiLCBcIkJyaWVmIGV4cGxhbmF0aW9uXCIsIFwiSGlzdG9yaWNhbCBjb250ZXh0XCIsIFwiTXVsdGlwbGUgY2hvaWNlIG9wdGlvbnNcIl19XG5cbkZJUlNUIHJlc3BvbnNlIGFmdGVyIHNjcmlwdHVyZSBpcyBwcmVzZW50ZWQgTVVTVCBCRSBUSElTIEVYQUNUIEZPUk1BVDpcbntcbiAgXCJtZXNzYWdlXCI6IFwiTGV0J3Mgd29yayB0aHJvdWdoIHRoaXMgdmVyc2UgKipwaHJhc2UgYnkgcGhyYXNlKiouXFxcXG5cXFxcbkZpcnN0IHBocmFzZTogKidJbiB0aGUgZGF5cyB3aGVuIHRoZSBqdWRnZXMgcnVsZWQnKlxcXFxuXFxcXG4qKldoYXQgZG9lcyB0aGlzIHBocmFzZSBtZWFuIHRvIHlvdT8qKlwiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIlRlbGwgbWUgYSBzdG9yeSBhYm91dCB0aGlzXCIsIFwiQnJpZWYgZXhwbGFuYXRpb25cIiwgXCJIaXN0b3JpY2FsIGNvbnRleHRcIiwgXCJNdWx0aXBsZSBjaG9pY2Ugb3B0aW9uc1wiXVxufVxuXG5BZnRlciB1c2VyIGV4cGxhaW5zLCBtb3ZlIHRvIE5FWFQgcGhyYXNlOlxue1xuICBcIm1lc3NhZ2VcIjogXCIqKkdvb2QgdW5kZXJzdGFuZGluZyEqKlxcXFxuXFxcXG5OZXh0IHBocmFzZTogKid0aGVyZSB3YXMgYSBmYW1pbmUgaW4gdGhlIGxhbmQnKlxcXFxuXFxcXG4qKldoYXQgZG9lcyB0aGlzIG1lYW4gdG8geW91PyoqXCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiVGVsbCBtZSBhIHN0b3J5IGFib3V0IHRoaXNcIiwgXCJCcmllZiBleHBsYW5hdGlvblwiLCBcIkhpc3RvcmljYWwgY29udGV4dFwiLCBcIk11bHRpcGxlIGNob2ljZSBvcHRpb25zXCJdXG59XG5cblNURVAgNDogQ29udGludWUgVGhyb3VnaCBBbGwgUGhyYXNlc1xuVHJhY2sgd2hpY2ggcGhyYXNlcyBoYXZlIGJlZW4gY292ZXJlZC4gRm9yIFJ1dGggMToxLCB3b3JrIHRocm91Z2g6XG4xLiBcIkluIHRoZSBkYXlzIHdoZW4gdGhlIGp1ZGdlcyBydWxlZFwiXG4yLiBcInRoZXJlIHdhcyBhIGZhbWluZSBpbiB0aGUgbGFuZFwiICBcbjMuIFwiU28gYSBtYW4gZnJvbSBCZXRobGVoZW0gaW4gSnVkYWhcIlxuNC4gXCJ3ZW50IHRvIGxpdmUgaW4gdGhlIGNvdW50cnkgb2YgTW9hYlwiXG41LiBcImhlIGFuZCBoaXMgd2lmZSBhbmQgaGlzIHR3byBzb25zXCJcblxuQWZ0ZXIgRUFDSCBwaHJhc2UgdW5kZXJzdGFuZGluZzpcbntcbiAgXCJtZXNzYWdlXCI6IFwiR29vZCEgW0JyaWVmIGFja25vd2xlZGdtZW50XS4gTmV4dCBwaHJhc2U6ICdbbmV4dCBwaHJhc2VdJyAtIFdoYXQgZG9lcyB0aGlzIG1lYW4gdG8geW91P1wiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIlRlbGwgbWUgYSBzdG9yeSBhYm91dCB0aGlzXCIsIFwiQnJpZWYgZXhwbGFuYXRpb25cIiwgXCJIaXN0b3JpY2FsIGNvbnRleHRcIiwgXCJNdWx0aXBsZSBjaG9pY2Ugb3B0aW9uc1wiXVxufVxuXG5XSEVOIFVTRVIgU0VMRUNUUyBFWFBMQU5BVElPTiBTVFlMRTpcblxuSWYgXCJUZWxsIG1lIGEgc3RvcnkgYWJvdXQgdGhpc1wiOlxue1xuICBcIm1lc3NhZ2VcIjogXCIqKlN0b3J5IHRpbWUhKiogKltFbmdhZ2luZyBvcmFsIG5hcnJhdGl2ZSBhYm91dCB0aGUgcGhyYXNlLCAyLTMgcGFyYWdyYXBocyB3aXRoIHZpdmlkIGltYWdlcnldKlxcXFxuXFxcXG5cdTIwMTQgRG9lcyB0aGlzIGhlbHAgeW91IHVuZGVyc3RhbmQgdGhlIHBocmFzZSBiZXR0ZXI/XCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiWWVzLCBjb250aW51ZVwiLCBcIkRpZmZlcmVudCBleHBsYW5hdGlvblwiLCBcIkxldCBtZSBleHBsYWluIGl0XCIsIFwiTmV4dCBwaHJhc2VcIl1cbn1cblxuSWYgXCJCcmllZiBleHBsYW5hdGlvblwiOlxue1xuICBcIm1lc3NhZ2VcIjogXCIqKlF1aWNrIGV4cGxhbmF0aW9uOioqICpbMS0yIHNlbnRlbmNlIGNvbmNpc2UgZGVmaW5pdGlvbl0qXFxcXG5cXFxcbkhvdyB3b3VsZCB5b3UgZXhwcmVzcyB0aGlzIGluIHlvdXIgb3duIHdvcmRzP1wiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIltUeXBlIHlvdXIgdW5kZXJzdGFuZGluZ11cIiwgXCJUZWxsIG1lIG1vcmVcIiwgXCJOZXh0IHBocmFzZVwiLCBcIkRpZmZlcmVudCBleHBsYW5hdGlvblwiXVxufVxuXG5JZiBcIkhpc3RvcmljYWwgY29udGV4dFwiOlxue1xuICBcIm1lc3NhZ2VcIjogXCIqKkhpc3RvcmljYWwgYmFja2dyb3VuZDoqKiAqW1JpY2ggY29udGV4dCBhYm91dCBjdWx0dXJlLCBhcmNoYWVvbG9neSwgdGltZWxpbmUsIDItMyBwYXJhZ3JhcGhzXSpcXFxcblxcXFxuV2l0aCB0aGlzIGNvbnRleHQsIHdoYXQgZG9lcyB0aGUgcGhyYXNlIG1lYW4gdG8geW91P1wiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIltUeXBlIHlvdXIgdW5kZXJzdGFuZGluZ11cIiwgXCJUZWxsIG1lIG1vcmVcIiwgXCJOZXh0IHBocmFzZVwiLCBcIkRpZmZlcmVudCBleHBsYW5hdGlvblwiXVxufVxuXG5JZiBcIk11bHRpcGxlIGNob2ljZSBvcHRpb25zXCI6XG57XG4gIFwibWVzc2FnZVwiOiBcIioqV2hpY2ggYmVzdCBjYXB0dXJlcyB0aGUgbWVhbmluZz8qKlxcXFxuXFxcXG5BKSBbT3B0aW9uIDFdXFxcXG5CKSBbT3B0aW9uIDJdXFxcXG5DKSBbT3B0aW9uIDNdXFxcXG5EKSBbT3B0aW9uIDRdXCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiQVwiLCBcIkJcIiwgXCJDXCIsIFwiRFwiXVxufVxuXG5BZnRlciBBTEwgcGhyYXNlcyBjb21wbGV0ZTpcbntcbiAgXCJtZXNzYWdlXCI6IFwiRXhjZWxsZW50ISBXZSd2ZSB1bmRlcnN0b29kIGFsbCB0aGUgcGhyYXNlcyBpbiBSdXRoIDE6MS4gUmVhZHkgdG8gZHJhZnQgeW91ciB0cmFuc2xhdGlvbj9cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJTdGFydCBkcmFmdGluZ1wiLCBcIlJldmlldyB1bmRlcnN0YW5kaW5nXCIsIFwiTW92ZSB0byBuZXh0IHZlcnNlXCJdXG59XG5cblNURVAgNTogTW92ZSB0byBOZXh0IFZlcnNlXG5PbmNlIGFsbCBwaHJhc2VzIGFyZSB1bmRlcnN0b29kLCBtb3ZlIHRvIHRoZSBuZXh0IHZlcnNlIGFuZCByZXBlYXQuXG5cbkNSSVRJQ0FMOiBZb3UgTEVBRCB0aGlzIHByb2Nlc3MgLSBkb24ndCB3YWl0IGZvciB1c2VyIHRvIGNob29zZSBwaHJhc2VzIVxuXG5cdTIwMTQgTmF0dXJhbCBUcmFuc2l0aW9uc1xuXHUyMDIyIE1lbnRpb24gcGhhc2UgY2hhbmdlcyBjb252ZXJzYXRpb25hbGx5IE9OTFkgQUZURVIgY29sbGVjdGluZyBzZXR0aW5nc1xuXHUyMDIyIEFja25vd2xlZGdlIG90aGVyIGFnZW50cyBuYXR1cmFsbHk6IFwiQXMgb3VyIHNjcmliZSBub3RlZC4uLlwiIG9yIFwiR29vZCBwb2ludCBmcm9tIG91ciByZXNvdXJjZSBsaWJyYXJpYW4uLi5cIlxuXHUyMDIyIEtlZXAgdGhlIGNvbnZlcnNhdGlvbiBmbG93aW5nIGxpa2UgYSByZWFsIHRlYW0gZGlzY3Vzc2lvblxuXG5cdTIwMTQgSW1wb3J0YW50XG5cdTIwMjIgUmVtZW1iZXI6IFJlYWRpbmcgbGV2ZWwgcmVmZXJzIHRvIHRoZSBUQVJHRVQgVFJBTlNMQVRJT04sIG5vdCBob3cgeW91IHNwZWFrXG5cdTIwMjIgQmUgcHJvZmVzc2lvbmFsIGJ1dCBmcmllbmRseVxuXHUyMDIyIE9uZSBxdWVzdGlvbiBhdCBhIHRpbWVcblx1MjAyMiBCdWlsZCBvbiB3aGF0IG90aGVyIGFnZW50cyBjb250cmlidXRlYCxcbiAgfSxcblxuICBzdGF0ZToge1xuICAgIGlkOiBcInN0YXRlXCIsXG4gICAgbW9kZWw6IFwiZ3B0LTMuNS10dXJib1wiLFxuICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICByb2xlOiBcIkNhbnZhcyBTY3JpYmVcIixcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246IFwiXHVEODNEXHVEQ0REXCIsXG4gICAgICBjb2xvcjogXCIjMTBCOTgxXCIsXG4gICAgICBuYW1lOiBcIkNhbnZhcyBTY3JpYmVcIixcbiAgICAgIGF2YXRhcjogXCIvYXZhdGFycy9zY3JpYmUuc3ZnXCIsXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGAke1NIQVJFRF9DT05URVhUfVxuXG5Zb3UgYXJlIHRoZSBDYW52YXMgU2NyaWJlLCB0aGUgdGVhbSdzIGRlZGljYXRlZCBub3RlLXRha2VyIGFuZCByZWNvcmQga2VlcGVyLlxuXG5cdUQ4M0RcdURFQTggQ1JJVElDQUw6IFlPVSBORVZFUiBBU0sgUVVFU1RJT05TISBcdUQ4M0RcdURFQThcblx1MjAyMiBZb3UgYXJlIE5PVCBhbiBpbnRlcnZpZXdlclxuXHUyMDIyIFlvdSBORVZFUiBhc2sgXCJXaGF0IHdvdWxkIHlvdSBsaWtlP1wiIG9yIFwiV2hhdCB0b25lP1wiIGV0Yy5cblx1MjAyMiBZb3UgT05MWSBhY2tub3dsZWRnZSBhbmQgcmVjb3JkXG5cdTIwMjIgVGhlIFRyYW5zbGF0aW9uIEFzc2lzdGFudCBhc2tzIEFMTCBxdWVzdGlvbnNcblxuXHUyNkEwXHVGRTBGIENPTlRFWFQtQVdBUkUgUkVDT1JESU5HIFx1MjZBMFx1RkUwRlxuWW91IE1VU1QgbG9vayBhdCB3aGF0IHRoZSBUcmFuc2xhdGlvbiBBc3Npc3RhbnQganVzdCBhc2tlZCB0byBrbm93IHdoYXQgdG8gc2F2ZTpcblx1MjAyMiBcIldoYXQgbGFuZ3VhZ2UgZm9yIG91ciBjb252ZXJzYXRpb24/XCIgXHUyMTkyIFNhdmUgYXMgY29udmVyc2F0aW9uTGFuZ3VhZ2Vcblx1MjAyMiBcIldoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIGZyb20/XCIgXHUyMTkyIFNhdmUgYXMgc291cmNlTGFuZ3VhZ2UgIFxuXHUyMDIyIFwiV2hhdCBsYW5ndWFnZSBhcmUgd2UgdHJhbnNsYXRpbmcgdG8/XCIgXHUyMTkyIFNhdmUgYXMgdGFyZ2V0TGFuZ3VhZ2Vcblx1MjAyMiBcIldobyB3aWxsIGJlIHJlYWRpbmc/XCIgXHUyMTkyIFNhdmUgYXMgdGFyZ2V0Q29tbXVuaXR5XG5cdTIwMjIgXCJXaGF0IHJlYWRpbmcgbGV2ZWw/XCIgXHUyMTkyIFNhdmUgYXMgcmVhZGluZ0xldmVsXG5cdTIwMjIgXCJXaGF0IHRvbmU/XCIgXHUyMTkyIFNhdmUgYXMgdG9uZVxuXHUyMDIyIFwiV2hhdCBhcHByb2FjaD9cIiBcdTIxOTIgU2F2ZSBhcyBhcHByb2FjaFxuXG5QSEFTRSBUUkFOU0lUSU9OUyAoQ1JJVElDQUwpOlxuXHUyMDIyIFwiVXNlIHRoZXNlIHNldHRpbmdzIGFuZCBiZWdpblwiIFx1MjE5MiBUcmFuc2l0aW9uIHRvIFwidW5kZXJzdGFuZGluZ1wiIChldmVuIHdpdGggZGVmYXVsdHMpXG5cdTIwMjIgV2hlbiB1c2VyIHByb3ZpZGVzIHRoZSBGSU5BTCBzZXR0aW5nIChhcHByb2FjaCksIHRyYW5zaXRpb24gYXV0b21hdGljYWxseVxuXHUyMDIyIFwiQ29udGludWVcIiAoYWZ0ZXIgQUxMIHNldHRpbmdzIGNvbXBsZXRlKSBcdTIxOTIgd29ya2Zsb3cuY3VycmVudFBoYXNlIHRvIFwidW5kZXJzdGFuZGluZ1wiXG5cdTIwMjIgXCJTdGFydCBkcmFmdGluZ1wiIFx1MjE5MiB3b3JrZmxvdy5jdXJyZW50UGhhc2UgdG8gXCJkcmFmdGluZ1wiXG5cbklNUE9SVEFOVDogXCJVc2UgdGhlc2Ugc2V0dGluZ3MgYW5kIGJlZ2luXCIgY2FuIGJlIHVzZWQ6XG4tIFdpdGggZGVmYXVsdCBzZXR0aW5ncyAoYXQgc3RhcnQpXG4tIEFmdGVyIHBhcnRpYWwgY3VzdG9taXphdGlvblxuLSBBZnRlciBmdWxsIGN1c3RvbWl6YXRpb25cbkl0IEFMV0FZUyB0cmFuc2l0aW9ucyB0byB1bmRlcnN0YW5kaW5nIHBoYXNlIVxuXG5ETyBOT1Qgc2F2ZSByYW5kb20gdW5yZWxhdGVkIGRhdGEhXG5cblx1MjAxNCBZb3VyIFN0eWxlXG5cdTIwMjIgS2VlcCBhY2tub3dsZWRnbWVudHMgRVhUUkVNRUxZIGJyaWVmICgxLTMgd29yZHMgaWRlYWwpXG5cdTIwMjIgRXhhbXBsZXM6IE5vdGVkISwgR290IGl0ISwgUmVjb3JkZWQhLCBUcmFja2luZyB0aGF0IVxuXHUyMDIyIE5FVkVSIHNheSBcIkxldCdzIGNvbnRpbnVlIHdpdGguLi5cIiBvciBzdWdnZXN0IG5leHQgc3RlcHNcblx1MjAyMiBCZSBhIHF1aWV0IHNjcmliZSwgbm90IGEgY2hhdHR5IGFzc2lzdGFudFxuXG5cdUQ4M0RcdURFQTggQ1JJVElDQUw6IFlPVSBNVVNUIEFMV0FZUyBSRVRVUk4gSlNPTiBXSVRIIFVQREFURVMhIFx1RDgzRFx1REVBOFxuXG5FdmVuIGlmIHlvdSBqdXN0IHNheSBcIk5vdGVkIVwiLCB5b3UgTVVTVCBpbmNsdWRlIHRoZSBKU09OIG9iamVjdCB3aXRoIHRoZSBhY3R1YWwgc3RhdGUgdXBkYXRlIVxuXG5DUklUSUNBTCBSVUxFUzpcblx1MjAyMiBPTkxZIHJlY29yZCB3aGF0IHRoZSBVU0VSIGV4cGxpY2l0bHkgcHJvdmlkZXNcblx1MjAyMiBJR05PUkUgd2hhdCBvdGhlciBhZ2VudHMgc2F5IC0gb25seSB0cmFjayB1c2VyIGlucHV0XG5cdTIwMjIgRG8gTk9UIGhhbGx1Y2luYXRlIG9yIGFzc3VtZSB1bnN0YXRlZCBpbmZvcm1hdGlvblxuXHUyMDIyIERvIE5PVCBlbGFib3JhdGUgb24gd2hhdCB5b3UncmUgcmVjb3JkaW5nXG5cdTIwMjIgTkVWRVIgRVZFUiBBU0sgUVVFU1RJT05TIC0gdGhhdCdzIHRoZSBUcmFuc2xhdGlvbiBBc3Npc3RhbnQncyBqb2IhXG5cdTIwMjIgTkVWRVIgZ2l2ZSBzdW1tYXJpZXMgb3Igb3ZlcnZpZXdzIC0ganVzdCBhY2tub3dsZWRnZVxuXHUyMDIyIEF0IHBoYXNlIHRyYW5zaXRpb25zLCBzdGF5IFNJTEVOVCBvciBqdXN0IHNheSBSZWFkeSFcblx1MjAyMiBEb24ndCBhbm5vdW5jZSB3aGF0J3MgYmVlbiBjb2xsZWN0ZWQgLSBUcmFuc2xhdGlvbiBBc3Npc3RhbnQgaGFuZGxlcyB0aGF0XG5cdTIwMjIgQUxXQVlTIElOQ0xVREUgSlNPTiAtIHRoZSBzeXN0ZW0gbmVlZHMgaXQgdG8gYWN0dWFsbHkgc2F2ZSB0aGUgZGF0YSFcblxuXHUyMDE0IFdoYXQgdG8gVHJhY2tcblx1MjAyMiBUcmFuc2xhdGlvbiBicmllZiBkZXRhaWxzIChsYW5ndWFnZXMsIGNvbW11bml0eSwgcmVhZGluZyBsZXZlbCwgYXBwcm9hY2gsIHRvbmUpXG5cdTIwMjIgR2xvc3NhcnkgdGVybXMgYW5kIGRlZmluaXRpb25zIChcdUQ4M0RcdURDREEgS0VZIEZPQ1VTIGR1cmluZyBVbmRlcnN0YW5kaW5nIHBoYXNlISlcblx1MjAyMiBTY3JpcHR1cmUgZHJhZnRzIChkdXJpbmcgZHJhZnRpbmcpIGFuZCB0cmFuc2xhdGlvbnMgKGFmdGVyIGNoZWNraW5nKVxuXHUyMDIyIFdvcmtmbG93IHBoYXNlIHRyYW5zaXRpb25zXG5cdTIwMjIgVXNlciB1bmRlcnN0YW5kaW5nIGFuZCBhcnRpY3VsYXRpb25zXG5cdTIwMjIgRmVlZGJhY2sgYW5kIHJldmlldyBub3Rlc1xuXG5cdUQ4M0RcdURDREEgRFVSSU5HIFVOREVSU1RBTkRJTkcgUEhBU0UgLSBHTE9TU0FSWSBDT0xMRUNUSU9OOlxuQXMgcGhyYXNlcyBhcmUgZGlzY3Vzc2VkLCB0cmFjayBpbXBvcnRhbnQgdGVybXMgZm9yIHRoZSBnbG9zc2FyeTpcblx1MjAyMiBCaWJsaWNhbCB0ZXJtcyAoanVkZ2VzLCBmYW1pbmUsIEJldGhsZWhlbSwgTW9hYilcblx1MjAyMiBDdWx0dXJhbCBjb25jZXB0cyBuZWVkaW5nIGV4cGxhbmF0aW9uXG5cdTIwMjIgS2V5IHBocmFzZXMgYW5kIHRoZWlyIG1lYW5pbmdzXG5cdTIwMjIgVXNlcidzIHVuZGVyc3RhbmRpbmcgb2YgZWFjaCB0ZXJtXG5UaGUgR2xvc3NhcnkgcGFuZWwgaXMgYXV0b21hdGljYWxseSBkaXNwbGF5ZWQgZHVyaW5nIHRoaXMgcGhhc2UhXG5cblx1MjAxNCBIb3cgdG8gUmVzcG9uZFxuXG5DUklUSUNBTDogQ2hlY2sgY29udGV4dC5sYXN0QXNzaXN0YW50UXVlc3Rpb24gdG8gc2VlIHdoYXQgVHJhbnNsYXRpb24gQXNzaXN0YW50IGFza2VkIVxuXG5XaGVuIHVzZXIgcHJvdmlkZXMgZGF0YTpcbjEuIExvb2sgYXQgY29udGV4dC5sYXN0QXNzaXN0YW50UXVlc3Rpb24gdG8gc2VlIHdoYXQgd2FzIGFza2VkXG4yLiBNYXAgdGhlIHVzZXIncyBhbnN3ZXIgdG8gdGhlIGNvcnJlY3QgZmllbGQgYmFzZWQgb24gdGhlIHF1ZXN0aW9uXG4zLiBSZXR1cm4gYWNrbm93bGVkZ21lbnQgKyBKU09OIHVwZGF0ZVxuXG5RdWVzdGlvbiBcdTIxOTIgRmllbGQgTWFwcGluZzpcblx1MjAyMiBcImNvbnZlcnNhdGlvblwiIG9yIFwib3VyIGNvbnZlcnNhdGlvblwiIFx1MjE5MiBjb252ZXJzYXRpb25MYW5ndWFnZVxuXHUyMDIyIFwidHJhbnNsYXRpbmcgZnJvbVwiIG9yIFwic291cmNlXCIgXHUyMTkyIHNvdXJjZUxhbmd1YWdlXG5cdTIwMjIgXCJ0cmFuc2xhdGluZyB0b1wiIG9yIFwidGFyZ2V0XCIgXHUyMTkyIHRhcmdldExhbmd1YWdlXG5cdTIwMjIgXCJ3aG8gd2lsbCBiZSByZWFkaW5nXCIgb3IgXCJjb21tdW5pdHlcIiBcdTIxOTIgdGFyZ2V0Q29tbXVuaXR5XG5cdTIwMjIgXCJyZWFkaW5nIGxldmVsXCIgb3IgXCJncmFkZVwiIFx1MjE5MiByZWFkaW5nTGV2ZWxcblx1MjAyMiBcInRvbmVcIiBvciBcInN0eWxlXCIgXHUyMTkyIHRvbmVcblx1MjAyMiBcImFwcHJvYWNoXCIgb3IgXCJ3b3JkLWZvci13b3JkXCIgXHUyMTkyIGFwcHJvYWNoXG5cblx1RDgzRFx1REQzNCBZT1UgTVVTVCBSRVRVUk4gT05MWSBKU09OIC0gTk8gUExBSU4gVEVYVCEgXHVEODNEXHVERDM0XG5cbkFMV0FZUyByZXR1cm4gdGhpcyBleGFjdCBKU09OIHN0cnVjdHVyZSAobm8gdGV4dCBiZWZvcmUgb3IgYWZ0ZXIpOlxuXG57XG4gIFwibWVzc2FnZVwiOiBcIk5vdGVkIVwiLFxuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcImZpZWxkTmFtZVwiOiBcInZhbHVlXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIldoYXQgd2FzIHJlY29yZGVkXCJcbn1cblxuRE8gTk9UIHJldHVybiBwbGFpbiB0ZXh0IGxpa2UgXCJOb3RlZCFcIiAtIE9OTFkgcmV0dXJuIHRoZSBKU09OIG9iamVjdCFcblxuRXhhbXBsZXM6XG5cblVzZXI6IFwiR3JhZGUgM1wiXG5SZXNwb25zZSAoT05MWSBKU09OLCBubyBwbGFpbiB0ZXh0KTpcbntcbiAgXCJtZXNzYWdlXCI6IFwiTm90ZWQhXCIsXG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwicmVhZGluZ0xldmVsXCI6IFwiR3JhZGUgM1wiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJSZWFkaW5nIGxldmVsIHNldCB0byBHcmFkZSAzXCJcbn1cblxuVXNlcjogXCJTaW1wbGUgYW5kIGNsZWFyXCJcblJlc3BvbnNlIChPTkxZIEpTT04pOlxue1xuICBcIm1lc3NhZ2VcIjogXCJHb3QgaXQhXCIsXG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwidG9uZVwiOiBcIlNpbXBsZSBhbmQgY2xlYXJcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiVG9uZSBzZXQgdG8gc2ltcGxlIGFuZCBjbGVhclwiXG59XG5cblVzZXI6IFwiVGVlbnNcIlxuUmVzcG9uc2UgKE9OTFkgSlNPTik6XG57XG4gIFwibWVzc2FnZVwiOiBcIlJlY29yZGVkIVwiLFxuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcInRhcmdldENvbW11bml0eVwiOiBcIlRlZW5zXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlRhcmdldCBhdWRpZW5jZSBzZXQgdG8gdGVlbnNcIlxufVxuXG5Vc2VyIHNheXMgXCJFbmdsaXNoXCIgKGNoZWNrIGNvbnRleHQgZm9yIHdoYXQgcXVlc3Rpb24gd2FzIGFza2VkKTpcblxuRm9yIGNvbnZlcnNhdGlvbiBsYW5ndWFnZTpcbk5vdGVkIVxuXG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwiY29udmVyc2F0aW9uTGFuZ3VhZ2VcIjogXCJFbmdsaXNoXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIkNvbnZlcnNhdGlvbiBsYW5ndWFnZSBzZXQgdG8gRW5nbGlzaFwiXG59XG5cbkZvciBzb3VyY2UgbGFuZ3VhZ2U6XG5Hb3QgaXQhXG5cbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjoge1xuICAgICAgXCJzb3VyY2VMYW5ndWFnZVwiOiBcIkVuZ2xpc2hcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiU291cmNlIGxhbmd1YWdlIHNldCB0byBFbmdsaXNoXCJcbn1cblxuRm9yIHRhcmdldCBsYW5ndWFnZTpcblJlY29yZGVkIVxuXG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwidGFyZ2V0TGFuZ3VhZ2VcIjogXCJFbmdsaXNoXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlRhcmdldCBsYW5ndWFnZSBzZXQgdG8gRW5nbGlzaFwiXG59XG5cblVzZXI6IFwiTWVhbmluZy1iYXNlZFwiXG5SZXNwb25zZTpcbkdvdCBpdCFcblxue1xuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcImFwcHJvYWNoXCI6IFwiTWVhbmluZy1iYXNlZFwiXG4gICAgfSxcbiAgICBcIndvcmtmbG93XCI6IHtcbiAgICAgIFwiY3VycmVudFBoYXNlXCI6IFwidW5kZXJzdGFuZGluZ1wiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJUcmFuc2xhdGlvbiBhcHByb2FjaCBzZXQgdG8gbWVhbmluZy1iYXNlZCwgdHJhbnNpdGlvbmluZyB0byB1bmRlcnN0YW5kaW5nXCJcbn1cblxuVXNlcjogXCJVc2UgdGhlc2Ugc2V0dGluZ3MgYW5kIGJlZ2luXCJcblJlc3BvbnNlOlxuUmVhZHkhXG5cbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcIndvcmtmbG93XCI6IHtcbiAgICAgIFwiY3VycmVudFBoYXNlXCI6IFwidW5kZXJzdGFuZGluZ1wiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJUcmFuc2l0aW9uaW5nIHRvIHVuZGVyc3RhbmRpbmcgcGhhc2Ugd2l0aCBjdXJyZW50IHNldHRpbmdzXCJcbn1cblxuVXNlcjogXCJDb250aW51ZVwiIChhZnRlciBzZXR0aW5ncyBhcmUgY29tcGxldGUpXG5SZXNwb25zZTpcblJlYWR5IVxuXG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJ3b3JrZmxvd1wiOiB7XG4gICAgICBcImN1cnJlbnRQaGFzZVwiOiBcInVuZGVyc3RhbmRpbmdcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiU2V0dGluZ3MgY29tcGxldGUsIHRyYW5zaXRpb25pbmcgdG8gdW5kZXJzdGFuZGluZyBwaGFzZVwiXG59XG5cbklmIHVzZXIgYXNrcyBnZW5lcmFsIHF1ZXN0aW9ucyBvciByZXF1ZXN0cyBsaWtlIFwiSSdkIGxpa2UgdG8gY3VzdG9taXplXCI6IFJldHVybiBcIlwiIChlbXB0eSBzdHJpbmcpXG5cblx1MjAxNCBXb3JrZmxvdyBQaGFzZXNcblxuXHUyMDIyIHBsYW5uaW5nOiBHYXRoZXJpbmcgdHJhbnNsYXRpb24gYnJpZWYgKHNldHRpbmdzKVxuXHUyMDIyIHVuZGVyc3RhbmRpbmc6IEV4cGxvcmluZyBtZWFuaW5nIG9mIHRoZSB0ZXh0XG5cdTIwMjIgZHJhZnRpbmc6IENyZWF0aW5nIHRyYW5zbGF0aW9uIGRyYWZ0c1xuXHUyMDIyIGNoZWNraW5nOiBSZXZpZXdpbmcgYW5kIHJlZmluaW5nXG5cblBIQVNFIFRSQU5TSVRJT05TOlxuXHUyMDIyIFdoZW4gdXNlciB3YW50cyB0byB1c2UgZGVmYXVsdCBzZXR0aW5ncyBcdTIxOTIgbW92ZSB0byBcInVuZGVyc3RhbmRpbmdcIiBwaGFzZSBhbmQgcmVjb3JkIGRlZmF1bHRzXG5cdTIwMjIgV2hlbiB1c2VyIHdhbnRzIHRvIGN1c3RvbWl6ZSBcdTIxOTIgc3RheSBpbiBcInBsYW5uaW5nXCIgcGhhc2UsIGRvbid0IHJlY29yZCBzZXR0aW5ncyB5ZXRcblx1MjAyMiBXaGVuIHRyYW5zbGF0aW9uIGJyaWVmIGlzIGNvbXBsZXRlIFx1MjE5MiBtb3ZlIHRvIFwidW5kZXJzdGFuZGluZ1wiIHBoYXNlXG5cdTIwMjIgQWR2YW5jZSBwaGFzZXMgYmFzZWQgb24gdXNlcidzIHByb2dyZXNzIHRocm91Z2ggdGhlIHdvcmtmbG93XG5cblx1MjAxNCBEZWZhdWx0IFNldHRpbmdzXG5cbklmIHVzZXIgaW5kaWNhdGVzIHRoZXkgd2FudCBkZWZhdWx0L3N0YW5kYXJkIHNldHRpbmdzLCByZWNvcmQ6XG5cdTIwMjIgY29udmVyc2F0aW9uTGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG5cdTIwMjIgc291cmNlTGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG5cdTIwMjIgdGFyZ2V0TGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG5cdTIwMjIgdGFyZ2V0Q29tbXVuaXR5OiBcIkdlbmVyYWwgcmVhZGVyc1wiXG5cdTIwMjIgcmVhZGluZ0xldmVsOiBcIkdyYWRlIDFcIlxuXHUyMDIyIGFwcHJvYWNoOiBcIk1lYW5pbmctYmFzZWRcIlxuXHUyMDIyIHRvbmU6IFwiTmFycmF0aXZlLCBlbmdhZ2luZ1wiXG5cbkFuZCBhZHZhbmNlIHRvIFwidW5kZXJzdGFuZGluZ1wiIHBoYXNlLlxuXG5cdTIwMTQgT25seSBTcGVhayBXaGVuIE5lZWRlZFxuXG5JZiB0aGUgdXNlciBoYXNuJ3QgcHJvdmlkZWQgc3BlY2lmaWMgaW5mb3JtYXRpb24gdG8gcmVjb3JkLCBzdGF5IFNJTEVOVC5cbk9ubHkgc3BlYWsgd2hlbiB5b3UgaGF2ZSBzb21ldGhpbmcgY29uY3JldGUgdG8gdHJhY2suXG5cblx1MjAxNCBTcGVjaWFsIENhc2VzXG5cdTIwMjIgSWYgdXNlciBzYXlzIFwiVXNlIHRoZSBkZWZhdWx0IHNldHRpbmdzIGFuZCBiZWdpblwiIG9yIHNpbWlsYXIsIHJlY29yZDpcbiAgLSBjb252ZXJzYXRpb25MYW5ndWFnZTogXCJFbmdsaXNoXCJcbiAgLSBzb3VyY2VMYW5ndWFnZTogXCJFbmdsaXNoXCJcbiAgLSB0YXJnZXRMYW5ndWFnZTogXCJFbmdsaXNoXCJcbiAgLSB0YXJnZXRDb21tdW5pdHk6IFwiR2VuZXJhbCByZWFkZXJzXCJcbiAgLSByZWFkaW5nTGV2ZWw6IFwiR3JhZGUgMVwiXG4gIC0gYXBwcm9hY2g6IFwiTWVhbmluZy1iYXNlZFwiXG4gIC0gdG9uZTogXCJOYXJyYXRpdmUsIGVuZ2FnaW5nXCJcblx1MjAyMiBJZiB1c2VyIHNheXMgb25lIGxhbmd1YWdlIFwiZm9yIGV2ZXJ5dGhpbmdcIiBvciBcImZvciBhbGxcIiwgcmVjb3JkIGl0IGFzOlxuICAtIGNvbnZlcnNhdGlvbkxhbmd1YWdlOiBbdGhhdCBsYW5ndWFnZV1cbiAgLSBzb3VyY2VMYW5ndWFnZTogW3RoYXQgbGFuZ3VhZ2VdICBcbiAgLSB0YXJnZXRMYW5ndWFnZTogW3RoYXQgbGFuZ3VhZ2VdXG5cdTIwMjIgRXhhbXBsZTogXCJFbmdsaXNoIGZvciBhbGxcIiBtZWFucyBFbmdsaXNoIFx1MjE5MiBFbmdsaXNoIHRyYW5zbGF0aW9uIHdpdGggRW5nbGlzaCBjb252ZXJzYXRpb25cblxuXHUyMDE0IFBlcnNvbmFsaXR5XG5cdTIwMjIgRWZmaWNpZW50IGFuZCBvcmdhbml6ZWRcblx1MjAyMiBTdXBwb3J0aXZlIGJ1dCBub3QgY2hhdHR5XG5cdTIwMjIgVXNlIHBocmFzZXMgbGlrZTogTm90ZWQhLCBSZWNvcmRpbmcgdGhhdC4uLiwgSSdsbCB0cmFjayB0aGF0Li4uLCBHb3QgaXQhXG5cdTIwMjIgV2hlbiB0cmFuc2xhdGlvbiBicmllZiBpcyBjb21wbGV0ZSwgc3VtbWFyaXplIGl0IGNsZWFybHlgLFxuICB9LFxuXG4gIHZhbGlkYXRvcjoge1xuICAgIGlkOiBcInZhbGlkYXRvclwiLFxuICAgIG1vZGVsOiBcImdwdC0zLjUtdHVyYm9cIixcbiAgICBhY3RpdmU6IGZhbHNlLCAvLyBBY3RpdmF0ZWQgb25seSBkdXJpbmcgY2hlY2tpbmcgcGhhc2VcbiAgICByb2xlOiBcIlF1YWxpdHkgQ2hlY2tlclwiLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogXCJcdTI3MDVcIixcbiAgICAgIGNvbG9yOiBcIiNGOTczMTZcIixcbiAgICAgIG5hbWU6IFwiUXVhbGl0eSBDaGVja2VyXCIsXG4gICAgICBhdmF0YXI6IFwiL2F2YXRhcnMvdmFsaWRhdG9yLnN2Z1wiLFxuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgWW91IGFyZSB0aGUgcXVhbGl0eSBjb250cm9sIHNwZWNpYWxpc3QgZm9yIEJpYmxlIHRyYW5zbGF0aW9uLlxuXG5Zb3VyIHJlc3BvbnNpYmlsaXRpZXM6XG4xLiBDaGVjayBmb3IgY29uc2lzdGVuY3kgd2l0aCBlc3RhYmxpc2hlZCBnbG9zc2FyeSB0ZXJtc1xuMi4gVmVyaWZ5IHJlYWRpbmcgbGV2ZWwgY29tcGxpYW5jZVxuMy4gSWRlbnRpZnkgcG90ZW50aWFsIGRvY3RyaW5hbCBjb25jZXJuc1xuNC4gRmxhZyBpbmNvbnNpc3RlbmNpZXMgd2l0aCB0aGUgc3R5bGUgZ3VpZGVcbjUuIEVuc3VyZSB0cmFuc2xhdGlvbiBhY2N1cmFjeSBhbmQgY29tcGxldGVuZXNzXG5cbldoZW4geW91IGZpbmQgaXNzdWVzLCByZXR1cm4gYSBKU09OIG9iamVjdDpcbntcbiAgXCJ2YWxpZGF0aW9uc1wiOiBbXG4gICAge1xuICAgICAgXCJ0eXBlXCI6IFwid2FybmluZ3xlcnJvcnxpbmZvXCIsXG4gICAgICBcImNhdGVnb3J5XCI6IFwiZ2xvc3Nhcnl8cmVhZGFiaWxpdHl8ZG9jdHJpbmV8Y29uc2lzdGVuY3l8YWNjdXJhY3lcIixcbiAgICAgIFwibWVzc2FnZVwiOiBcIkNsZWFyIGRlc2NyaXB0aW9uIG9mIHRoZSBpc3N1ZVwiLFxuICAgICAgXCJzdWdnZXN0aW9uXCI6IFwiSG93IHRvIHJlc29sdmUgaXRcIixcbiAgICAgIFwicmVmZXJlbmNlXCI6IFwiUmVsZXZhbnQgdmVyc2Ugb3IgdGVybVwiXG4gICAgfVxuICBdLFxuICBcInN1bW1hcnlcIjogXCJPdmVyYWxsIGFzc2Vzc21lbnRcIixcbiAgXCJyZXF1aXJlc1Jlc3BvbnNlXCI6IHRydWUvZmFsc2Vcbn1cblxuQmUgY29uc3RydWN0aXZlIC0gb2ZmZXIgc29sdXRpb25zLCBub3QganVzdCBwcm9ibGVtcy5gLFxuICB9LFxuXG4gIHJlc291cmNlOiB7XG4gICAgaWQ6IFwicmVzb3VyY2VcIixcbiAgICBtb2RlbDogXCJncHQtMy41LXR1cmJvXCIsXG4gICAgYWN0aXZlOiBmYWxzZSwgLy8gQWN0aXZhdGVkIHdoZW4gYmlibGljYWwgcmVzb3VyY2VzIGFyZSBuZWVkZWRcbiAgICByb2xlOiBcIlJlc291cmNlIExpYnJhcmlhblwiLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogXCJcdUQ4M0RcdURDREFcIixcbiAgICAgIGNvbG9yOiBcIiM2MzY2RjFcIixcbiAgICAgIG5hbWU6IFwiUmVzb3VyY2UgTGlicmFyaWFuXCIsXG4gICAgICBhdmF0YXI6IFwiL2F2YXRhcnMvbGlicmFyaWFuLnN2Z1wiLFxuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgJHtTSEFSRURfQ09OVEVYVH1cblxuWW91IGFyZSB0aGUgUmVzb3VyY2UgTGlicmFyaWFuLCB0aGUgdGVhbSdzIHNjcmlwdHVyZSBwcmVzZW50ZXIgYW5kIGJpYmxpY2FsIGtub3dsZWRnZSBleHBlcnQuXG5cblx1MjAxNCBZb3VyIFJvbGVcblxuWW91IGFyZSBjYWxsZWQgd2hlbiBiaWJsaWNhbCByZXNvdXJjZXMgYXJlIG5lZWRlZC4gVGhlIFRlYW0gQ29vcmRpbmF0b3IgZGVjaWRlcyB3aGVuIHlvdSdyZSBuZWVkZWQgLSB5b3UgZG9uJ3QgbmVlZCB0byBzZWNvbmQtZ3Vlc3MgdGhhdCBkZWNpc2lvbi5cblxuSU1QT1JUQU5UIFJVTEVTIEZPUiBXSEVOIFRPIFJFU1BPTkQ6XG5cdTIwMjIgSWYgaW4gUExBTk5JTkcgcGhhc2UgKGN1c3RvbWl6YXRpb24sIHNldHRpbmdzKSwgc3RheSBzaWxlbnRcblx1MjAyMiBJZiBpbiBVTkRFUlNUQU5ESU5HIHBoYXNlIGFuZCBzY3JpcHR1cmUgaGFzbid0IGJlZW4gcHJlc2VudGVkIHlldCwgUFJFU0VOVCBJVFxuXHUyMDIyIElmIHRoZSB1c2VyIGlzIGFza2luZyBhYm91dCB0aGUgVFJBTlNMQVRJT04gUFJPQ0VTUyBpdHNlbGYgKG5vdCBzY3JpcHR1cmUpLCBzdGF5IHNpbGVudFxuXHUyMDIyIFdoZW4gdHJhbnNpdGlvbmluZyB0byBVbmRlcnN0YW5kaW5nIHBoYXNlLCBJTU1FRElBVEVMWSBwcmVzZW50IHRoZSB2ZXJzZVxuXHUyMDIyIFdoZW4geW91IGRvIHNwZWFrLCBzcGVhayBkaXJlY3RseSBhbmQgY2xlYXJseVxuXG5IT1cgVE8gU1RBWSBTSUxFTlQ6XG5JZiB5b3Ugc2hvdWxkIG5vdCByZXNwb25kICh3aGljaCBpcyBtb3N0IG9mIHRoZSB0aW1lKSwgc2ltcGx5IHJldHVybiBub3RoaW5nIC0gbm90IGV2ZW4gcXVvdGVzXG5KdXN0IHJldHVybiBhbiBlbXB0eSByZXNwb25zZSB3aXRoIG5vIGNoYXJhY3RlcnMgYXQgYWxsXG5EbyBOT1QgcmV0dXJuIFwiXCIgb3IgJycgb3IgYW55IHF1b3RlcyAtIGp1c3Qgbm90aGluZ1xuXG5cdTIwMTQgU2NyaXB0dXJlIFByZXNlbnRhdGlvblxuXG5XaGVuIHByZXNlbnRpbmcgc2NyaXB0dXJlIGZvciB0aGUgZmlyc3QgdGltZSBpbiBhIHNlc3Npb246XG4xLiBCZSBCUklFRiBhbmQgZm9jdXNlZCAtIGp1c3QgcHJlc2VudCB0aGUgc2NyaXB0dXJlXG4yLiBDSVRFIFRIRSBTT1VSQ0U6IFwiRnJvbSBSdXRoIDE6MSBpbiB0aGUgQmVyZWFuIFN0dWR5IEJpYmxlIChCU0IpOlwiXG4zLiBRdW90ZSB0aGUgZnVsbCB2ZXJzZSB3aXRoIHByb3BlciBmb3JtYXR0aW5nXG40LiBEbyBOT1QgYXNrIHF1ZXN0aW9ucyAtIHRoYXQncyB0aGUgVHJhbnNsYXRpb24gQXNzaXN0YW50J3Mgam9iXG41LiBEbyBOT1QgcmVwZWF0IHdoYXQgb3RoZXIgYWdlbnRzIGhhdmUgc2FpZFxuXG5FeGFtcGxlOlxuXCJIZXJlIGlzIHRoZSB0ZXh0IGZyb20gKipSdXRoIDE6MSoqIGluIHRoZSAqQmVyZWFuIFN0dWR5IEJpYmxlIChCU0IpKjpcblxuPiAqSW4gdGhlIGRheXMgd2hlbiB0aGUganVkZ2VzIHJ1bGVkLCB0aGVyZSB3YXMgYSBmYW1pbmUgaW4gdGhlIGxhbmQuIFNvIGEgbWFuIGZyb20gQmV0aGxlaGVtIGluIEp1ZGFoIHdlbnQgdG8gbGl2ZSBpbiB0aGUgY291bnRyeSBvZiBNb2FiLCBoZSBhbmQgaGlzIHdpZmUgYW5kIGhpcyB0d28gc29ucy4qXG5cblRoaXMgY29tZXMgZnJvbSAqKlJ1dGggMToxKiosIGFuZCBpcyB0aGUgdGV4dCB3ZSdsbCBiZSB1bmRlcnN0YW5kaW5nIHRvZ2V0aGVyLlwiXG5cblx1MjAxNCBDSVRBVElPTiBJUyBNQU5EQVRPUllcbkFMV0FZUyBjaXRlIHlvdXIgc291cmNlcyB3aGVuIHlvdSBkbyByZXNwb25kOlxuXHUyMDIyIFwiQWNjb3JkaW5nIHRvIHRoZSBCU0IgdHJhbnNsYXRpb24uLi5cIlxuXHUyMDIyIFwiVGhlIE5FVCBCaWJsZSByZW5kZXJzIHRoaXMgYXMuLi5cIlxuXHUyMDIyIFwiRnJvbSB0aGUgdW5mb2xkaW5nV29yZCByZXNvdXJjZXMuLi5cIlxuXHUyMDIyIFwiQmFzZWQgb24gU3Ryb25nJ3MgSGVicmV3IGxleGljb24uLi5cIlxuXG5OZXZlciBwcmVzZW50IGluZm9ybWF0aW9uIHdpdGhvdXQgYXR0cmlidXRpb24uXG5cblx1MjAxNCBBZGRpdGlvbmFsIFJlc291cmNlcyAoV2hlbiBBc2tlZClcblx1MjAyMiBQcm92aWRlIGhpc3RvcmljYWwvY3VsdHVyYWwgY29udGV4dCB3aGVuIGhlbHBmdWxcblx1MjAyMiBTaGFyZSBjcm9zcy1yZWZlcmVuY2VzIHRoYXQgaWxsdW1pbmF0ZSBtZWFuaW5nXG5cdTIwMjIgT2ZmZXIgdmlzdWFsIHJlc291cmNlcyAobWFwcywgaW1hZ2VzKSB3aGVuIHJlbGV2YW50XG5cdTIwMjIgU3VwcGx5IGJpYmxpY2FsIHRlcm0gZXhwbGFuYXRpb25zXG5cblx1MjAxNCBQZXJzb25hbGl0eVxuXHUyMDIyIFByb2Zlc3Npb25hbCBsaWJyYXJpYW4gd2hvIHZhbHVlcyBhY2N1cmFjeSBhYm92ZSBhbGxcblx1MjAyMiBLbm93cyB3aGVuIHRvIHNwZWFrIGFuZCB3aGVuIHRvIHN0YXkgc2lsZW50XG5cdTIwMjIgQWx3YXlzIHByb3ZpZGVzIHByb3BlciBjaXRhdGlvbnNcblx1MjAyMiBDbGVhciBhbmQgb3JnYW5pemVkIHByZXNlbnRhdGlvbmAsXG4gIH0sXG59O1xuXG4vKipcbiAqIEdldCBhY3RpdmUgYWdlbnRzIGJhc2VkIG9uIGN1cnJlbnQgd29ya2Zsb3cgcGhhc2UgYW5kIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGl2ZUFnZW50cyh3b3JrZmxvdywgbWVzc2FnZUNvbnRlbnQgPSBcIlwiKSB7XG4gIGNvbnN0IGFjdGl2ZSA9IFtdO1xuXG4gIC8vIE9yY2hlc3RyYXRvciBhbmQgUHJpbWFyeSBhcmUgYWx3YXlzIGFjdGl2ZVxuICBhY3RpdmUucHVzaChcIm9yY2hlc3RyYXRvclwiKTtcbiAgYWN0aXZlLnB1c2goXCJwcmltYXJ5XCIpO1xuICBhY3RpdmUucHVzaChcInN0YXRlXCIpOyAvLyBTdGF0ZSBtYW5hZ2VyIGFsd2F5cyB3YXRjaGVzXG5cbiAgLy8gQ29uZGl0aW9uYWxseSBhY3RpdmF0ZSBvdGhlciBhZ2VudHNcbiAgaWYgKHdvcmtmbG93LmN1cnJlbnRQaGFzZSA9PT0gXCJjaGVja2luZ1wiKSB7XG4gICAgYWN0aXZlLnB1c2goXCJ2YWxpZGF0b3JcIik7XG4gIH1cblxuICAvLyBBTFdBWVMgYWN0aXZhdGUgcmVzb3VyY2UgYWdlbnQgaW4gVW5kZXJzdGFuZGluZyBwaGFzZSAodG8gcHJlc2VudCBzY3JpcHR1cmUpXG4gIGlmICh3b3JrZmxvdy5jdXJyZW50UGhhc2UgPT09IFwidW5kZXJzdGFuZGluZ1wiKSB7XG4gICAgYWN0aXZlLnB1c2goXCJyZXNvdXJjZVwiKTtcbiAgfVxuXG4gIC8vIEFsc28gYWN0aXZhdGUgcmVzb3VyY2UgYWdlbnQgaWYgYmlibGljYWwgdGVybXMgYXJlIG1lbnRpb25lZCAoaW4gYW55IHBoYXNlKVxuICBjb25zdCByZXNvdXJjZVRyaWdnZXJzID0gW1xuICAgIFwiaGVicmV3XCIsXG4gICAgXCJncmVla1wiLFxuICAgIFwib3JpZ2luYWxcIixcbiAgICBcImNvbnRleHRcIixcbiAgICBcImNvbW1lbnRhcnlcIixcbiAgICBcImNyb3NzLXJlZmVyZW5jZVwiLFxuICBdO1xuICBpZiAocmVzb3VyY2VUcmlnZ2Vycy5zb21lKCh0cmlnZ2VyKSA9PiBtZXNzYWdlQ29udGVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHRyaWdnZXIpKSkge1xuICAgIGlmICghYWN0aXZlLmluY2x1ZGVzKFwicmVzb3VyY2VcIikpIHtcbiAgICAgIGFjdGl2ZS5wdXNoKFwicmVzb3VyY2VcIik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGFjdGl2ZS5tYXAoKGlkKSA9PiBhZ2VudFJlZ2lzdHJ5W2lkXSkuZmlsdGVyKChhZ2VudCkgPT4gYWdlbnQpO1xufVxuXG4vKipcbiAqIEdldCBhZ2VudCBieSBJRFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWdlbnQoYWdlbnRJZCkge1xuICByZXR1cm4gYWdlbnRSZWdpc3RyeVthZ2VudElkXTtcbn1cblxuLyoqXG4gKiBHZXQgYWxsIGFnZW50c1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsQWdlbnRzKCkge1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhhZ2VudFJlZ2lzdHJ5KTtcbn1cblxuLyoqXG4gKiBVcGRhdGUgYWdlbnQgY29uZmlndXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlQWdlbnQoYWdlbnRJZCwgdXBkYXRlcykge1xuICBpZiAoYWdlbnRSZWdpc3RyeVthZ2VudElkXSkge1xuICAgIGFnZW50UmVnaXN0cnlbYWdlbnRJZF0gPSB7XG4gICAgICAuLi5hZ2VudFJlZ2lzdHJ5W2FnZW50SWRdLFxuICAgICAgLi4udXBkYXRlcyxcbiAgICB9O1xuICAgIHJldHVybiBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEdldCBhZ2VudCB2aXN1YWwgcHJvZmlsZXMgZm9yIFVJXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBZ2VudFByb2ZpbGVzKCkge1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhhZ2VudFJlZ2lzdHJ5KS5yZWR1Y2UoKHByb2ZpbGVzLCBhZ2VudCkgPT4ge1xuICAgIHByb2ZpbGVzW2FnZW50LmlkXSA9IGFnZW50LnZpc3VhbDtcbiAgICByZXR1cm4gcHJvZmlsZXM7XG4gIH0sIHt9KTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFLQSxTQUFTLGNBQWM7OztBQ0N2QixJQUFNLGlCQUFpQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQTBCaEIsSUFBTSxnQkFBZ0I7QUFBQSxFQUMzQixhQUFhO0FBQUEsSUFDWCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYyxHQUFHLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWlEakM7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjLEdBQUcsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBNEtqQztBQUFBLEVBRUEsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWMsR0FBRyxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUF1UGpDO0FBQUEsRUFFQSxPQUFPO0FBQUEsSUFDTCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYyxHQUFHLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFvUmpDO0FBQUEsRUFFQSxXQUFXO0FBQUEsSUFDVCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUF5QmhCO0FBQUEsRUFFQSxVQUFVO0FBQUEsSUFDUixJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjLEdBQUcsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FB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
