
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

\u26A0\uFE0F CRITICAL RULE #1 - CHECK FOR NAME FIRST \u26A0\uFE0F

IF userName IS NULL:
\u2192 DON'T ask about languages yet!
\u2192 The initial message already asked for their name
\u2192 WAIT for user to provide their name
\u2192 When they do, greet them warmly and move to language settings

IF userName EXISTS but conversationLanguage IS NULL:
\u2192 NOW ask: "**Great to meet you, [userName]!** What language would you like to use for our conversation?"
\u2192 Then continue with settings collection

\u{1F6A8} SETTINGS COLLECTION ORDER \u{1F6A8}
1. userName (asked in initial message)
2. conversationLanguage 
3. sourceLanguage
4. targetLanguage
5. targetCommunity
6. readingLevel
7. tone
8. approach (last one triggers transition to understanding)

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

\u{1F389} AFTER USER PROVIDES THEIR NAME \u{1F389}

When user provides their name (e.g., "Sarah", "John", "Pastor Mike"):
{
  "message": "**Wonderful to meet you, [UserName]!** Let's set up your translation.

What language would you like to use for our conversation?",
  "suggestions": ["English", "Spanish", "French", "Other"]
}

Then continue with the rest of the settings collection (source language, target language, etc.)

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
\u2022 "name" or "your name" or "What's your name" \u2192 userName
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

User: "Sarah" or "John" or "Maria" (when asked "What's your name?")
Response (ONLY JSON, no plain text):
{
  "message": "Nice to meet you!",
  "updates": {
    "styleGuide": {
      "userName": "Sarah"
    }
  },
  "summary": "User name set to Sarah"
}

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
        if (msg.agent?.id === "state") return;
        if (msg.type === "suggestions" && msg.role === "system") return;
        if (Array.isArray(msg.content)) return;
        let content = msg.content;
        if (msg.role === "assistant" && msg.agent?.id === "primary") {
          try {
            const parsed = JSON.parse(content);
            content = parsed.message || content;
          } catch {
          }
        }
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY29udmVyc2F0aW9uLmpzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL2FnZW50cy9yZWdpc3RyeS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNdWx0aS1BZ2VudCBDb252ZXJzYXRpb24gSGFuZGxlclxuICogT3JjaGVzdHJhdGVzIG11bHRpcGxlIEFJIGFnZW50cyB0byBoYW5kbGUgQmlibGUgdHJhbnNsYXRpb24gY29udmVyc2F0aW9uc1xuICovXG5cbmltcG9ydCB7IE9wZW5BSSB9IGZyb20gXCJvcGVuYWlcIjtcbmltcG9ydCB7IGdldEFnZW50IH0gZnJvbSBcIi4vYWdlbnRzL3JlZ2lzdHJ5LmpzXCI7XG5cbi8vIE9wZW5BSSBjbGllbnQgd2lsbCBiZSBpbml0aWFsaXplZCBwZXIgcmVxdWVzdCB3aXRoIGNvbnRleHRcblxuLyoqXG4gKiBDYWxsIGFuIGluZGl2aWR1YWwgYWdlbnQgd2l0aCBjb250ZXh0XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNhbGxBZ2VudChhZ2VudCwgbWVzc2FnZSwgY29udGV4dCwgb3BlbmFpQ2xpZW50KSB7XG4gIGNvbnNvbGUubG9nKGBDYWxsaW5nIGFnZW50OiAke2FnZW50LmlkfWApO1xuICB0cnkge1xuICAgIGNvbnN0IG1lc3NhZ2VzID0gW1xuICAgICAge1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiBhZ2VudC5zeXN0ZW1Qcm9tcHQsXG4gICAgICB9LFxuICAgIF07XG5cbiAgICAvLyBBZGQgY29udmVyc2F0aW9uIGhpc3RvcnkgYXMgbmF0dXJhbCBtZXNzYWdlcyAoZm9yIHByaW1hcnkgYWdlbnQgb25seSlcbiAgICBpZiAoYWdlbnQuaWQgPT09IFwicHJpbWFyeVwiICYmIGNvbnRleHQuY29udmVyc2F0aW9uSGlzdG9yeSkge1xuICAgICAgY29udGV4dC5jb252ZXJzYXRpb25IaXN0b3J5LmZvckVhY2goKG1zZykgPT4ge1xuICAgICAgICAvLyBTa2lwIENhbnZhcyBTY3JpYmUgYWNrbm93bGVkZ21lbnRzXG4gICAgICAgIGlmIChtc2cuYWdlbnQ/LmlkID09PSBcInN0YXRlXCIpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIFNraXAgaW5saW5lIHN1Z2dlc3Rpb24gbWVzc2FnZXMgKHRoZXkncmUgc3lzdGVtIFVJIGVsZW1lbnRzLCBub3QgY29udmVyc2F0aW9uKVxuICAgICAgICBpZiAobXNnLnR5cGUgPT09IFwic3VnZ2VzdGlvbnNcIiAmJiBtc2cucm9sZSA9PT0gXCJzeXN0ZW1cIikgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gU2tpcCBtZXNzYWdlcyB3aXRoIGFycmF5IGNvbnRlbnQgKHdvdWxkIGNhdXNlIE9wZW5BSSBlcnJvcnMpXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG1zZy5jb250ZW50KSkgcmV0dXJuO1xuXG4gICAgICAgIC8vIFBhcnNlIGFzc2lzdGFudCBtZXNzYWdlcyBpZiB0aGV5J3JlIEpTT05cbiAgICAgICAgbGV0IGNvbnRlbnQgPSBtc2cuY29udGVudDtcbiAgICAgICAgaWYgKG1zZy5yb2xlID09PSBcImFzc2lzdGFudFwiICYmIG1zZy5hZ2VudD8uaWQgPT09IFwicHJpbWFyeVwiKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UoY29udGVudCk7XG4gICAgICAgICAgICBjb250ZW50ID0gcGFyc2VkLm1lc3NhZ2UgfHwgY29udGVudDtcbiAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIC8vIE5vdCBKU09OLCB1c2UgYXMtaXNcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgICAgICByb2xlOiBtc2cucm9sZSxcbiAgICAgICAgICBjb250ZW50OiBjb250ZW50LFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFkZCB0aGUgY3VycmVudCB1c2VyIG1lc3NhZ2VcbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgY29udGVudDogbWVzc2FnZSxcbiAgICB9KTtcblxuICAgIC8vIFByb3ZpZGUgY2FudmFzIHN0YXRlIGNvbnRleHQgdG8gYWxsIGFnZW50c1xuICAgIGlmIChjb250ZXh0LmNhbnZhc1N0YXRlKSB7XG4gICAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgICAgcm9sZTogXCJzeXN0ZW1cIixcbiAgICAgICAgY29udGVudDogYEN1cnJlbnQgY2FudmFzIHN0YXRlOiAke0pTT04uc3RyaW5naWZ5KGNvbnRleHQuY2FudmFzU3RhdGUpfWAsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBGb3Igbm9uLXByaW1hcnkgYWdlbnRzLCBwcm92aWRlIGNvbnRleHQgZGlmZmVyZW50bHlcbiAgICBpZiAoYWdlbnQuaWQgIT09IFwicHJpbWFyeVwiKSB7XG4gICAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgICAgcm9sZTogXCJzeXN0ZW1cIixcbiAgICAgICAgY29udGVudDogYENvbnRleHQ6ICR7SlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIGNhbnZhc1N0YXRlOiBjb250ZXh0LmNhbnZhc1N0YXRlLFxuICAgICAgICAgIHByaW1hcnlSZXNwb25zZTogY29udGV4dC5wcmltYXJ5UmVzcG9uc2UsXG4gICAgICAgICAgb3JjaGVzdHJhdGlvbjogY29udGV4dC5vcmNoZXN0cmF0aW9uLFxuICAgICAgICB9KX1gLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQWRkIHRpbWVvdXQgd3JhcHBlciBmb3IgQVBJIGNhbGxcbiAgICBjb25zdCB0aW1lb3V0UHJvbWlzZSA9IG5ldyBQcm9taXNlKChfLCByZWplY3QpID0+IHtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4gcmVqZWN0KG5ldyBFcnJvcihgVGltZW91dCBjYWxsaW5nICR7YWdlbnQuaWR9YCkpLCAxMDAwMCk7IC8vIDEwIHNlY29uZCB0aW1lb3V0XG4gICAgfSk7XG5cbiAgICBjb25zdCBjb21wbGV0aW9uUHJvbWlzZSA9IG9wZW5haUNsaWVudC5jaGF0LmNvbXBsZXRpb25zLmNyZWF0ZSh7XG4gICAgICBtb2RlbDogYWdlbnQubW9kZWwsXG4gICAgICBtZXNzYWdlczogbWVzc2FnZXMsXG4gICAgICB0ZW1wZXJhdHVyZTogYWdlbnQuaWQgPT09IFwic3RhdGVcIiA/IDAuMSA6IDAuNywgLy8gTG93ZXIgdGVtcCBmb3Igc3RhdGUgZXh0cmFjdGlvblxuICAgICAgbWF4X3Rva2VuczogYWdlbnQuaWQgPT09IFwic3RhdGVcIiA/IDUwMCA6IDIwMDAsXG4gICAgfSk7XG5cbiAgICBjb25zdCBjb21wbGV0aW9uID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtjb21wbGV0aW9uUHJvbWlzZSwgdGltZW91dFByb21pc2VdKTtcbiAgICBjb25zb2xlLmxvZyhgQWdlbnQgJHthZ2VudC5pZH0gcmVzcG9uZGVkIHN1Y2Nlc3NmdWxseWApO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFnZW50SWQ6IGFnZW50LmlkLFxuICAgICAgYWdlbnQ6IGFnZW50LnZpc3VhbCxcbiAgICAgIHJlc3BvbnNlOiBjb21wbGV0aW9uLmNob2ljZXNbMF0ubWVzc2FnZS5jb250ZW50LFxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKGBFcnJvciBjYWxsaW5nIGFnZW50ICR7YWdlbnQuaWR9OmAsIGVycm9yLm1lc3NhZ2UpO1xuICAgIHJldHVybiB7XG4gICAgICBhZ2VudElkOiBhZ2VudC5pZCxcbiAgICAgIGFnZW50OiBhZ2VudC52aXN1YWwsXG4gICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSB8fCBcIlVua25vd24gZXJyb3JcIixcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogR2V0IGN1cnJlbnQgY2FudmFzIHN0YXRlIGZyb20gc3RhdGUgbWFuYWdlbWVudCBmdW5jdGlvblxuICovXG5hc3luYyBmdW5jdGlvbiBnZXRDYW52YXNTdGF0ZShzZXNzaW9uSWQgPSBcImRlZmF1bHRcIikge1xuICB0cnkge1xuICAgIC8vIEluIE5ldGxpZnkgRnVuY3Rpb25zLCB3ZSBuZWVkIGZ1bGwgbG9jYWxob3N0IFVSTCBmb3IgaW50ZXJuYWwgY2FsbHNcbiAgICBjb25zdCBiYXNlVXJsID0gXCJodHRwOi8vbG9jYWxob3N0Ojg4ODhcIjtcbiAgICBjb25zdCBzdGF0ZVVybCA9IGAke2Jhc2VVcmx9Ly5uZXRsaWZ5L2Z1bmN0aW9ucy9jYW52YXMtc3RhdGVgO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChzdGF0ZVVybCwge1xuICAgICAgaGVhZGVyczoge1xuICAgICAgICBcIlgtU2Vzc2lvbi1JRFwiOiBzZXNzaW9uSWQsXG4gICAgICB9LFxuICAgIH0pO1xuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIGZldGNoaW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG5cbiAgLy8gUmV0dXJuIGRlZmF1bHQgc3RhdGUgaWYgZmV0Y2ggZmFpbHNcbiAgcmV0dXJuIHtcbiAgICBzdHlsZUd1aWRlOiB7fSxcbiAgICBnbG9zc2FyeTogeyB0ZXJtczoge30gfSxcbiAgICBzY3JpcHR1cmVDYW52YXM6IHsgdmVyc2VzOiB7fSB9LFxuICAgIHdvcmtmbG93OiB7IGN1cnJlbnRQaGFzZTogXCJwbGFubmluZ1wiIH0sXG4gIH07XG59XG5cbi8qKlxuICogVXBkYXRlIGNhbnZhcyBzdGF0ZVxuICovXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVDYW52YXNTdGF0ZSh1cGRhdGVzLCBhZ2VudElkID0gXCJzeXN0ZW1cIiwgc2Vzc2lvbklkID0gXCJkZWZhdWx0XCIpIHtcbiAgdHJ5IHtcbiAgICAvLyBJbiBOZXRsaWZ5IEZ1bmN0aW9ucywgd2UgbmVlZCBmdWxsIGxvY2FsaG9zdCBVUkwgZm9yIGludGVybmFsIGNhbGxzXG4gICAgY29uc3QgYmFzZVVybCA9IFwiaHR0cDovL2xvY2FsaG9zdDo4ODg4XCI7XG4gICAgY29uc3Qgc3RhdGVVcmwgPSBgJHtiYXNlVXJsfS8ubmV0bGlmeS9mdW5jdGlvbnMvY2FudmFzLXN0YXRlL3VwZGF0ZWA7XG5cbiAgICBjb25zb2xlLmxvZyhcIlx1RDgzRFx1REQzNSB1cGRhdGVDYW52YXNTdGF0ZSBjYWxsZWQgd2l0aDpcIiwgSlNPTi5zdHJpbmdpZnkodXBkYXRlcywgbnVsbCwgMikpO1xuICAgIGNvbnNvbGUubG9nKFwiXHVEODNEXHVERDM1IFNlc3Npb24gSUQ6XCIsIHNlc3Npb25JZCk7XG4gICAgY29uc29sZS5sb2coXCJcdUQ4M0RcdUREMzUgU2VuZGluZyB0bzpcIiwgc3RhdGVVcmwpO1xuXG4gICAgY29uc3QgcGF5bG9hZCA9IHsgdXBkYXRlcywgYWdlbnRJZCB9O1xuICAgIGNvbnNvbGUubG9nKFwiXHVEODNEXHVERDM1IFBheWxvYWQ6XCIsIEpTT04uc3RyaW5naWZ5KHBheWxvYWQsIG51bGwsIDIpKTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc3RhdGVVcmwsIHtcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICBcIlgtU2Vzc2lvbi1JRFwiOiBzZXNzaW9uSWQsIC8vIEFERCBTRVNTSU9OIEhFQURFUiFcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShwYXlsb2FkKSxcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKFwiXHVEODNEXHVERDM1IFVwZGF0ZSByZXNwb25zZSBzdGF0dXM6XCIsIHJlc3BvbnNlLnN0YXR1cyk7XG5cbiAgICBpZiAocmVzcG9uc2Uub2spIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICAgIGNvbnNvbGUubG9nKFwiXHVEODNEXHVERDM1IFVwZGF0ZSByZXN1bHQ6XCIsIEpTT04uc3RyaW5naWZ5KHJlc3VsdCwgbnVsbCwgMikpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcihcIlx1RDgzRFx1REQzNCBVcGRhdGUgZmFpbGVkIHdpdGggc3RhdHVzOlwiLCByZXNwb25zZS5zdGF0dXMpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiXHVEODNEXHVERDM0IEVycm9yIHVwZGF0aW5nIGNhbnZhcyBzdGF0ZTpcIiwgZXJyb3IpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgY29udmVyc2F0aW9uIHdpdGggbXVsdGlwbGUgYWdlbnRzXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NDb252ZXJzYXRpb24odXNlck1lc3NhZ2UsIGNvbnZlcnNhdGlvbkhpc3RvcnksIHNlc3Npb25JZCwgb3BlbmFpQ2xpZW50KSB7XG4gIGNvbnNvbGUubG9nKFwiU3RhcnRpbmcgcHJvY2Vzc0NvbnZlcnNhdGlvbiB3aXRoIG1lc3NhZ2U6XCIsIHVzZXJNZXNzYWdlKTtcbiAgY29uc29sZS5sb2coXCJVc2luZyBzZXNzaW9uIElEOlwiLCBzZXNzaW9uSWQpO1xuICBjb25zdCByZXNwb25zZXMgPSB7fTtcbiAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZShzZXNzaW9uSWQpO1xuICBjb25zb2xlLmxvZyhcIkdvdCBjYW52YXMgc3RhdGVcIik7XG5cbiAgLy8gQnVpbGQgY29udGV4dCBmb3IgYWdlbnRzXG4gIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgY2FudmFzU3RhdGUsXG4gICAgY29udmVyc2F0aW9uSGlzdG9yeTogY29udmVyc2F0aW9uSGlzdG9yeS5zbGljZSgtMTApLCAvLyBMYXN0IDEwIG1lc3NhZ2VzXG4gICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gIH07XG5cbiAgLy8gRmlyc3QsIGFzayB0aGUgb3JjaGVzdHJhdG9yIHdoaWNoIGFnZW50cyBzaG91bGQgcmVzcG9uZFxuICBjb25zdCBvcmNoZXN0cmF0b3IgPSBnZXRBZ2VudChcIm9yY2hlc3RyYXRvclwiKTtcbiAgY29uc29sZS5sb2coXCJBc2tpbmcgb3JjaGVzdHJhdG9yIHdoaWNoIGFnZW50cyB0byBhY3RpdmF0ZS4uLlwiKTtcbiAgY29uc3Qgb3JjaGVzdHJhdG9yUmVzcG9uc2UgPSBhd2FpdCBjYWxsQWdlbnQob3JjaGVzdHJhdG9yLCB1c2VyTWVzc2FnZSwgY29udGV4dCwgb3BlbmFpQ2xpZW50KTtcblxuICBsZXQgb3JjaGVzdHJhdGlvbjtcbiAgdHJ5IHtcbiAgICBvcmNoZXN0cmF0aW9uID0gSlNPTi5wYXJzZShvcmNoZXN0cmF0b3JSZXNwb25zZS5yZXNwb25zZSk7XG4gICAgY29uc29sZS5sb2coXCJPcmNoZXN0cmF0b3IgZGVjaWRlZDpcIiwgb3JjaGVzdHJhdGlvbik7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgLy8gSWYgb3JjaGVzdHJhdG9yIGZhaWxzLCBmYWxsIGJhY2sgdG8gc2Vuc2libGUgZGVmYXVsdHNcbiAgICBjb25zb2xlLmVycm9yKFwiT3JjaGVzdHJhdG9yIHJlc3BvbnNlIHdhcyBub3QgdmFsaWQgSlNPTiwgdXNpbmcgZGVmYXVsdHM6XCIsIGVycm9yLm1lc3NhZ2UpO1xuICAgIG9yY2hlc3RyYXRpb24gPSB7XG4gICAgICBhZ2VudHM6IFtcInByaW1hcnlcIiwgXCJzdGF0ZVwiXSxcbiAgICAgIG5vdGVzOiBcIkZhbGxiYWNrIHRvIHByaW1hcnkgYW5kIHN0YXRlIGFnZW50c1wiLFxuICAgIH07XG4gIH1cblxuICAvLyBPbmx5IGNhbGwgdGhlIGFnZW50cyB0aGUgb3JjaGVzdHJhdG9yIHNheXMgd2UgbmVlZFxuICBjb25zdCBhZ2VudHNUb0NhbGwgPSBvcmNoZXN0cmF0aW9uLmFnZW50cyB8fCBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl07XG5cbiAgLy8gQUxXQVlTIGNhbGwgU3VnZ2VzdGlvbiBIZWxwZXIgKGluIHBhcmFsbGVsKVxuICBjb25zdCBzdWdnZXN0aW9uQWdlbnQgPSBnZXRBZ2VudChcInN1Z2dlc3Rpb25zXCIpO1xuICBpZiAoc3VnZ2VzdGlvbkFnZW50KSB7XG4gICAgY29uc29sZS5sb2coXCJDYWxsaW5nIFN1Z2dlc3Rpb24gSGVscGVyLi4uXCIpO1xuICAgIHJlc3BvbnNlcy5zdWdnZXN0aW9ucyA9IGF3YWl0IGNhbGxBZ2VudChcbiAgICAgIHN1Z2dlc3Rpb25BZ2VudCxcbiAgICAgIHVzZXJNZXNzYWdlLFxuICAgICAge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBvcmNoZXN0cmF0aW9uLFxuICAgICAgfSxcbiAgICAgIG9wZW5haUNsaWVudFxuICAgICk7XG4gIH1cblxuICAvLyBDYWxsIFJlc291cmNlIExpYnJhcmlhbiBpZiBvcmNoZXN0cmF0b3Igc2F5cyBzb1xuICBpZiAoYWdlbnRzVG9DYWxsLmluY2x1ZGVzKFwicmVzb3VyY2VcIikpIHtcbiAgICBjb25zdCByZXNvdXJjZSA9IGdldEFnZW50KFwicmVzb3VyY2VcIik7XG4gICAgY29uc29sZS5sb2coXCJDYWxsaW5nIHJlc291cmNlIGxpYnJhcmlhbi4uLlwiKTtcbiAgICByZXNwb25zZXMucmVzb3VyY2UgPSBhd2FpdCBjYWxsQWdlbnQoXG4gICAgICByZXNvdXJjZSxcbiAgICAgIHVzZXJNZXNzYWdlLFxuICAgICAge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBvcmNoZXN0cmF0aW9uLFxuICAgICAgfSxcbiAgICAgIG9wZW5haUNsaWVudFxuICAgICk7XG4gICAgY29uc29sZS5sb2coXCJSZXNvdXJjZSBsaWJyYXJpYW4gcmVzcG9uZGVkXCIpO1xuICB9XG5cbiAgLy8gQ2FsbCBwcmltYXJ5IHRyYW5zbGF0b3IgaWYgb3JjaGVzdHJhdG9yIHNheXMgc29cbiAgaWYgKGFnZW50c1RvQ2FsbC5pbmNsdWRlcyhcInByaW1hcnlcIikpIHtcbiAgICBjb25zb2xlLmxvZyhcIj09PT09PT09PT0gUFJJTUFSWSBBR0VOVCBDQUxMRUQgPT09PT09PT09PVwiKTtcbiAgICBjb25zdCBwcmltYXJ5ID0gZ2V0QWdlbnQoXCJwcmltYXJ5XCIpO1xuICAgIGNvbnNvbGUubG9nKFwiQ2FsbGluZyBwcmltYXJ5IHRyYW5zbGF0b3IuLi5cIik7XG5cbiAgICByZXNwb25zZXMucHJpbWFyeSA9IGF3YWl0IGNhbGxBZ2VudChcbiAgICAgIHByaW1hcnksXG4gICAgICB1c2VyTWVzc2FnZSxcbiAgICAgIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgb3JjaGVzdHJhdGlvbixcbiAgICAgIH0sXG4gICAgICBvcGVuYWlDbGllbnRcbiAgICApO1xuICB9XG5cbiAgLy8gQ2FsbCBzdGF0ZSBtYW5hZ2VyIGlmIG9yY2hlc3RyYXRvciBzYXlzIHNvXG4gIGlmIChhZ2VudHNUb0NhbGwuaW5jbHVkZXMoXCJzdGF0ZVwiKSAmJiAhcmVzcG9uc2VzLnByaW1hcnk/LmVycm9yKSB7XG4gICAgY29uc3Qgc3RhdGVNYW5hZ2VyID0gZ2V0QWdlbnQoXCJzdGF0ZVwiKTtcbiAgICBjb25zb2xlLmxvZyhcIkNhbGxpbmcgc3RhdGUgbWFuYWdlci4uLlwiKTtcbiAgICBjb25zb2xlLmxvZyhcIlN0YXRlIG1hbmFnZXIgYWdlbnQgaW5mbzpcIiwgc3RhdGVNYW5hZ2VyPy52aXN1YWwpO1xuXG4gICAgLy8gUGFzcyB0aGUgbGFzdCBxdWVzdGlvbiBhc2tlZCBieSB0aGUgVHJhbnNsYXRpb24gQXNzaXN0YW50XG4gICAgbGV0IGxhc3RBc3Npc3RhbnRRdWVzdGlvbiA9IG51bGw7XG4gICAgZm9yIChsZXQgaSA9IGNvbnRleHQuY29udmVyc2F0aW9uSGlzdG9yeS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgY29uc3QgbXNnID0gY29udGV4dC5jb252ZXJzYXRpb25IaXN0b3J5W2ldO1xuICAgICAgaWYgKG1zZy5yb2xlID09PSBcImFzc2lzdGFudFwiICYmIG1zZy5hZ2VudD8uaWQgPT09IFwicHJpbWFyeVwiKSB7XG4gICAgICAgIC8vIFBhcnNlIHRoZSBtZXNzYWdlIGlmIGl0J3MgSlNPTlxuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UobXNnLmNvbnRlbnQpO1xuICAgICAgICAgIGxhc3RBc3Npc3RhbnRRdWVzdGlvbiA9IHBhcnNlZC5tZXNzYWdlIHx8IG1zZy5jb250ZW50O1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICBsYXN0QXNzaXN0YW50UXVlc3Rpb24gPSBtc2cuY29udGVudDtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzdGF0ZVJlc3VsdCA9IGF3YWl0IGNhbGxBZ2VudChcbiAgICAgIHN0YXRlTWFuYWdlcixcbiAgICAgIHVzZXJNZXNzYWdlLFxuICAgICAge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBwcmltYXJ5UmVzcG9uc2U6IHJlc3BvbnNlcy5wcmltYXJ5Py5yZXNwb25zZSxcbiAgICAgICAgcmVzb3VyY2VSZXNwb25zZTogcmVzcG9uc2VzLnJlc291cmNlPy5yZXNwb25zZSxcbiAgICAgICAgbGFzdEFzc2lzdGFudFF1ZXN0aW9uLFxuICAgICAgICBvcmNoZXN0cmF0aW9uLFxuICAgICAgfSxcbiAgICAgIG9wZW5haUNsaWVudFxuICAgICk7XG5cbiAgICBjb25zb2xlLmxvZyhcIlN0YXRlIHJlc3VsdCBhZ2VudCBpbmZvOlwiLCBzdGF0ZVJlc3VsdD8uYWdlbnQpO1xuICAgIGNvbnNvbGUubG9nKFwiU3RhdGUgcmVzcG9uc2U6XCIsIHN0YXRlUmVzdWx0Py5yZXNwb25zZSk7XG5cbiAgICAvLyBDYW52YXMgU2NyaWJlIHNob3VsZCByZXR1cm4gSlNPTiB3aXRoOlxuICAgIC8vIHsgXCJtZXNzYWdlXCI6IFwiTm90ZWQhXCIsIFwidXBkYXRlc1wiOiB7Li4ufSwgXCJzdW1tYXJ5XCI6IFwiLi4uXCIgfVxuICAgIC8vIE9yIGVtcHR5IHN0cmluZyB0byBzdGF5IHNpbGVudFxuXG4gICAgY29uc3QgcmVzcG9uc2VUZXh0ID0gc3RhdGVSZXN1bHQucmVzcG9uc2UudHJpbSgpO1xuXG4gICAgLy8gSWYgZW1wdHkgcmVzcG9uc2UsIHNjcmliZSBzdGF5cyBzaWxlbnRcbiAgICBpZiAoIXJlc3BvbnNlVGV4dCB8fCByZXNwb25zZVRleHQgPT09IFwiXCIpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiQ2FudmFzIFNjcmliZSBzdGF5aW5nIHNpbGVudFwiKTtcbiAgICAgIC8vIERvbid0IGFkZCB0byByZXNwb25zZXNcbiAgICB9XG4gICAgLy8gUGFyc2UgSlNPTiByZXNwb25zZSBmcm9tIENhbnZhcyBTY3JpYmVcbiAgICBlbHNlIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIENhbnZhcyBTY3JpYmUgcmV0dXJuczogXCJOb3RlZCFcXG57SlNPTn1cIiAtIGV4dHJhY3QgdGhlIEpTT04gcGFydFxuICAgICAgICBjb25zdCBqc29uTWF0Y2ggPSByZXNwb25zZVRleHQubWF0Y2goL1xce1tcXHNcXFNdKlxcfS8pO1xuICAgICAgICBpZiAoanNvbk1hdGNoKSB7XG4gICAgICAgICAgY29uc3Qgc3RhdGVVcGRhdGVzID0gSlNPTi5wYXJzZShqc29uTWF0Y2hbMF0pO1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ2FudmFzIFNjcmliZSByZXR1cm5lZDpcIiwgc3RhdGVVcGRhdGVzKTtcblxuICAgICAgICAgIC8vIEFwcGx5IHN0YXRlIHVwZGF0ZXMgaWYgcHJlc2VudFxuICAgICAgICAgIGlmIChzdGF0ZVVwZGF0ZXMudXBkYXRlcyAmJiBPYmplY3Qua2V5cyhzdGF0ZVVwZGF0ZXMudXBkYXRlcykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJBcHBseWluZyBzdGF0ZSB1cGRhdGVzOlwiLCBzdGF0ZVVwZGF0ZXMudXBkYXRlcyk7XG4gICAgICAgICAgICBhd2FpdCB1cGRhdGVDYW52YXNTdGF0ZShzdGF0ZVVwZGF0ZXMudXBkYXRlcywgXCJzdGF0ZVwiLCBzZXNzaW9uSWQpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJcdTI3MDUgU3RhdGUgdXBkYXRlIGNvbXBsZXRlZFwiKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBTaG93IHRoZSBtZXNzYWdlIGZyb20gSlNPTiBvciBleHRyYWN0IGZyb20gYmVnaW5uaW5nIG9mIHJlc3BvbnNlXG4gICAgICAgICAgY29uc3QgYWNrbm93bGVkZ21lbnQgPVxuICAgICAgICAgICAgc3RhdGVVcGRhdGVzLm1lc3NhZ2UgfHxcbiAgICAgICAgICAgIHJlc3BvbnNlVGV4dC5zdWJzdHJpbmcoMCwgcmVzcG9uc2VUZXh0LmluZGV4T2YoanNvbk1hdGNoWzBdKSkudHJpbSgpO1xuICAgICAgICAgIGlmIChhY2tub3dsZWRnbWVudCkge1xuICAgICAgICAgICAgcmVzcG9uc2VzLnN0YXRlID0ge1xuICAgICAgICAgICAgICAuLi5zdGF0ZVJlc3VsdCxcbiAgICAgICAgICAgICAgcmVzcG9uc2U6IGFja25vd2xlZGdtZW50LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm8gSlNPTiBmb3VuZCwganVzdCBzaG93IHRoZSByZXNwb25zZSBhcy1pc1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ2FudmFzIFNjcmliZSBzaW1wbGUgYWNrbm93bGVkZ21lbnQ6XCIsIHJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgcmVzcG9uc2VzLnN0YXRlID0ge1xuICAgICAgICAgICAgLi4uc3RhdGVSZXN1bHQsXG4gICAgICAgICAgICByZXNwb25zZTogcmVzcG9uc2VUZXh0LFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIHBhcnNpbmcgQ2FudmFzIFNjcmliZSBKU09OOlwiLCBlKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlJhdyByZXNwb25zZSB3YXM6XCIsIHJlc3BvbnNlVGV4dCk7XG4gICAgICAgIC8vIElmIEpTT04gcGFyc2luZyBmYWlscywgdHJlYXQgd2hvbGUgcmVzcG9uc2UgYXMgYWNrbm93bGVkZ21lbnRcbiAgICAgICAgcmVzcG9uc2VzLnN0YXRlID0ge1xuICAgICAgICAgIC4uLnN0YXRlUmVzdWx0LFxuICAgICAgICAgIHJlc3BvbnNlOiByZXNwb25zZVRleHQsXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSB2YWxpZGF0b3IgYW5kIHJlc291cmNlIGFnZW50cyB0byBzaW1wbGlmeSBkZWJ1Z2dpbmdcbiAgLy8gVE9ETzogUmUtZW5hYmxlIHRoZXNlIG9uY2UgYmFzaWMgZmxvdyBpcyB3b3JraW5nXG5cbiAgLypcbiAgLy8gQ2FsbCB2YWxpZGF0b3IgaWYgaW4gY2hlY2tpbmcgcGhhc2VcbiAgaWYgKGNhbnZhc1N0YXRlLndvcmtmbG93LmN1cnJlbnRQaGFzZSA9PT0gJ2NoZWNraW5nJyB8fCBcbiAgICAgIG9yY2hlc3RyYXRpb24uYWdlbnRzPy5pbmNsdWRlcygndmFsaWRhdG9yJykpIHtcbiAgICBjb25zdCB2YWxpZGF0b3IgPSBnZXRBZ2VudCgndmFsaWRhdG9yJyk7XG4gICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvciA9IGF3YWl0IGNhbGxBZ2VudCh2YWxpZGF0b3IsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgIHByaW1hcnlSZXNwb25zZTogcmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2UsXG4gICAgICAgIHN0YXRlVXBkYXRlczogcmVzcG9uc2VzLnN0YXRlPy51cGRhdGVzXG4gICAgICB9KTtcblxuICAgICAgLy8gUGFyc2UgdmFsaWRhdGlvbiByZXN1bHRzXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCB2YWxpZGF0aW9ucyA9IEpTT04ucGFyc2UocmVzcG9uc2VzLnZhbGlkYXRvci5yZXNwb25zZSk7XG4gICAgICAgIHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnMgPSB2YWxpZGF0aW9ucy52YWxpZGF0aW9ucztcbiAgICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvci5yZXF1aXJlc1Jlc3BvbnNlID0gdmFsaWRhdGlvbnMucmVxdWlyZXNSZXNwb25zZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gS2VlcCByYXcgcmVzcG9uc2UgaWYgbm90IEpTT05cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDYWxsIHJlc291cmNlIGFnZW50IGlmIG5lZWRlZFxuICBpZiAob3JjaGVzdHJhdGlvbi5hZ2VudHM/LmluY2x1ZGVzKCdyZXNvdXJjZScpKSB7XG4gICAgY29uc3QgcmVzb3VyY2UgPSBnZXRBZ2VudCgncmVzb3VyY2UnKTtcbiAgICBpZiAocmVzb3VyY2UpIHtcbiAgICAgIHJlc3BvbnNlcy5yZXNvdXJjZSA9IGF3YWl0IGNhbGxBZ2VudChyZXNvdXJjZSwgdXNlck1lc3NhZ2UsIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZVxuICAgICAgfSk7XG5cbiAgICAgIC8vIFBhcnNlIHJlc291cmNlIHJlc3VsdHNcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc291cmNlcyA9IEpTT04ucGFyc2UocmVzcG9uc2VzLnJlc291cmNlLnJlc3BvbnNlKTtcbiAgICAgICAgcmVzcG9uc2VzLnJlc291cmNlLnJlc291cmNlcyA9IHJlc291cmNlcy5yZXNvdXJjZXM7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIEtlZXAgcmF3IHJlc3BvbnNlIGlmIG5vdCBKU09OXG4gICAgICB9XG4gICAgfVxuICB9XG4gICovXG5cbiAgcmV0dXJuIHJlc3BvbnNlcztcbn1cblxuLyoqXG4gKiBNZXJnZSBhZ2VudCByZXNwb25zZXMgaW50byBhIGNvaGVyZW50IGNvbnZlcnNhdGlvbiByZXNwb25zZVxuICovXG5mdW5jdGlvbiBtZXJnZUFnZW50UmVzcG9uc2VzKHJlc3BvbnNlcykge1xuICBjb25zdCBtZXNzYWdlcyA9IFtdO1xuICBsZXQgc3VnZ2VzdGlvbnMgPSBbXTsgLy8gQUxXQVlTIGFuIGFycmF5LCBuZXZlciBudWxsXG5cbiAgLy8gSW5jbHVkZSBDYW52YXMgU2NyaWJlJ3MgY29udmVyc2F0aW9uYWwgcmVzcG9uc2UgRklSU1QgaWYgcHJlc2VudFxuICAvLyBDYW52YXMgU2NyaWJlIHNob3VsZCByZXR1cm4gZWl0aGVyIGp1c3QgYW4gYWNrbm93bGVkZ21lbnQgb3IgZW1wdHkgc3RyaW5nXG4gIGlmIChcbiAgICByZXNwb25zZXMuc3RhdGUgJiZcbiAgICAhcmVzcG9uc2VzLnN0YXRlLmVycm9yICYmXG4gICAgcmVzcG9uc2VzLnN0YXRlLnJlc3BvbnNlICYmXG4gICAgcmVzcG9uc2VzLnN0YXRlLnJlc3BvbnNlLnRyaW0oKSAhPT0gXCJcIlxuICApIHtcbiAgICAvLyBDYW52YXMgU2NyaWJlIG1pZ2h0IHJldHVybiBKU09OIHdpdGggc3RhdGUgdXBkYXRlLCBleHRyYWN0IGp1c3QgdGhlIGFja25vd2xlZGdtZW50XG4gICAgbGV0IHNjcmliZU1lc3NhZ2UgPSByZXNwb25zZXMuc3RhdGUucmVzcG9uc2U7XG5cbiAgICAvLyBDaGVjayBpZiByZXNwb25zZSBjb250YWlucyBKU09OIChzdGF0ZSB1cGRhdGUpXG4gICAgaWYgKHNjcmliZU1lc3NhZ2UuaW5jbHVkZXMoXCJ7XCIpICYmIHNjcmliZU1lc3NhZ2UuaW5jbHVkZXMoXCJ9XCIpKSB7XG4gICAgICAvLyBFeHRyYWN0IGp1c3QgdGhlIGFja25vd2xlZGdtZW50IHBhcnQgKGJlZm9yZSB0aGUgSlNPTilcbiAgICAgIGNvbnN0IGpzb25TdGFydCA9IHNjcmliZU1lc3NhZ2UuaW5kZXhPZihcIntcIik7XG4gICAgICBjb25zdCBhY2tub3dsZWRnbWVudCA9IHNjcmliZU1lc3NhZ2Uuc3Vic3RyaW5nKDAsIGpzb25TdGFydCkudHJpbSgpO1xuICAgICAgaWYgKGFja25vd2xlZGdtZW50ICYmIGFja25vd2xlZGdtZW50ICE9PSBcIlwiKSB7XG4gICAgICAgIHNjcmliZU1lc3NhZ2UgPSBhY2tub3dsZWRnbWVudDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE5vIGFja25vd2xlZGdtZW50LCBqdXN0IHN0YXRlIHVwZGF0ZSAtIHN0YXkgc2lsZW50XG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ2FudmFzIFNjcmliZSB1cGRhdGVkIHN0YXRlIHNpbGVudGx5XCIpO1xuICAgICAgICBzY3JpYmVNZXNzYWdlID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPbmx5IGFkZCBtZXNzYWdlIGlmIHRoZXJlJ3MgYWN0dWFsIGNvbnRlbnQgdG8gc2hvd1xuICAgIGlmIChzY3JpYmVNZXNzYWdlICYmIHNjcmliZU1lc3NhZ2UudHJpbSgpICE9PSBcIlwiKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIkFkZGluZyBDYW52YXMgU2NyaWJlIGFja25vd2xlZGdtZW50OlwiLCBzY3JpYmVNZXNzYWdlKTtcbiAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICByb2xlOiBcImFzc2lzdGFudFwiLFxuICAgICAgICBjb250ZW50OiBzY3JpYmVNZXNzYWdlLFxuICAgICAgICBhZ2VudDogcmVzcG9uc2VzLnN0YXRlLmFnZW50LFxuICAgICAgfSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHJlc3BvbnNlcy5zdGF0ZSAmJiByZXNwb25zZXMuc3RhdGUucmVzcG9uc2UgPT09IFwiXCIpIHtcbiAgICBjb25zb2xlLmxvZyhcIkNhbnZhcyBTY3JpYmUgcmV0dXJuZWQgZW1wdHkgcmVzcG9uc2UgKHN0YXlpbmcgc2lsZW50KVwiKTtcbiAgfVxuXG4gIC8vIEluY2x1ZGUgUmVzb3VyY2UgTGlicmFyaWFuIFNFQ09ORCAodG8gcHJlc2VudCBzY3JpcHR1cmUgYmVmb3JlIHF1ZXN0aW9ucylcbiAgLy8gT3JjaGVzdHJhdG9yIG9ubHkgY2FsbHMgdGhlbSB3aGVuIG5lZWRlZCwgc28gaWYgdGhleSByZXNwb25kZWQsIGluY2x1ZGUgaXRcbiAgaWYgKHJlc3BvbnNlcy5yZXNvdXJjZSAmJiAhcmVzcG9uc2VzLnJlc291cmNlLmVycm9yICYmIHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNwb25zZSkge1xuICAgIGNvbnN0IHJlc291cmNlVGV4dCA9IHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNwb25zZS50cmltKCk7XG4gICAgLy8gU2tpcCB0cnVseSBlbXB0eSByZXNwb25zZXMgaW5jbHVkaW5nIGp1c3QgcXVvdGVzXG4gICAgaWYgKHJlc291cmNlVGV4dCAmJiByZXNvdXJjZVRleHQgIT09ICdcIlwiJyAmJiByZXNvdXJjZVRleHQgIT09IFwiJydcIikge1xuICAgICAgY29uc29sZS5sb2coXCJBZGRpbmcgUmVzb3VyY2UgTGlicmFyaWFuIG1lc3NhZ2Ugd2l0aCBhZ2VudDpcIiwgcmVzcG9uc2VzLnJlc291cmNlLmFnZW50KTtcbiAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICByb2xlOiBcImFzc2lzdGFudFwiLFxuICAgICAgICBjb250ZW50OiByZXNwb25zZXMucmVzb3VyY2UucmVzcG9uc2UsXG4gICAgICAgIGFnZW50OiByZXNwb25zZXMucmVzb3VyY2UuYWdlbnQsXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coXCJSZXNvdXJjZSBMaWJyYXJpYW4gcmV0dXJuZWQgZW1wdHkgcmVzcG9uc2UgKHN0YXlpbmcgc2lsZW50KVwiKTtcbiAgICB9XG4gIH1cblxuICAvLyBIYW5kbGUgU3VnZ2VzdGlvbiBIZWxwZXIgcmVzcG9uc2UgKGV4dHJhY3Qgc3VnZ2VzdGlvbnMsIGRvbid0IHNob3cgYXMgbWVzc2FnZSlcbiAgaWYgKHJlc3BvbnNlcy5zdWdnZXN0aW9ucyAmJiAhcmVzcG9uc2VzLnN1Z2dlc3Rpb25zLmVycm9yICYmIHJlc3BvbnNlcy5zdWdnZXN0aW9ucy5yZXNwb25zZSkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdWdnZXN0aW9uc0FycmF5ID0gSlNPTi5wYXJzZShyZXNwb25zZXMuc3VnZ2VzdGlvbnMucmVzcG9uc2UpO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3VnZ2VzdGlvbnNBcnJheSkpIHtcbiAgICAgICAgc3VnZ2VzdGlvbnMgPSBzdWdnZXN0aW9uc0FycmF5O1xuICAgICAgICBjb25zb2xlLmxvZyhcIlx1MjcwNSBHb3Qgc3VnZ2VzdGlvbnMgZnJvbSBTdWdnZXN0aW9uIEhlbHBlcjpcIiwgc3VnZ2VzdGlvbnMpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIlx1MjZBMFx1RkUwRiBTdWdnZXN0aW9uIEhlbHBlciByZXNwb25zZSB3YXNuJ3QgdmFsaWQgSlNPTjpcIiwgZXJyb3IubWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gVGhlbiBpbmNsdWRlIHByaW1hcnkgcmVzcG9uc2UgKFRyYW5zbGF0aW9uIEFzc2lzdGFudClcbiAgLy8gRXh0cmFjdCBtZXNzYWdlIGFuZCBzdWdnZXN0aW9ucyBmcm9tIEpTT04gcmVzcG9uc2VcbiAgaWYgKHJlc3BvbnNlcy5wcmltYXJ5ICYmICFyZXNwb25zZXMucHJpbWFyeS5lcnJvciAmJiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSkge1xuICAgIGNvbnNvbGUubG9nKFwiXFxuPT09IFBSSU1BUlkgQUdFTlQgUkVTUE9OU0UgPT09XCIpO1xuICAgIGNvbnNvbGUubG9nKFwiUmF3OlwiLCByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSk7XG5cbiAgICBsZXQgbWVzc2FnZUNvbnRlbnQgPSByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZTtcblxuICAgIC8vIFRyeSB0byBwYXJzZSBhcyBKU09OIGZpcnN0XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UocmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2UpO1xuICAgICAgY29uc29sZS5sb2coXCJQYXJzZWQgYXMgSlNPTjpcIiwgcGFyc2VkKTtcblxuICAgICAgLy8gRXh0cmFjdCBtZXNzYWdlXG4gICAgICBpZiAocGFyc2VkLm1lc3NhZ2UpIHtcbiAgICAgICAgbWVzc2FnZUNvbnRlbnQgPSBwYXJzZWQubWVzc2FnZTtcbiAgICAgICAgY29uc29sZS5sb2coXCJcdTI3MDUgRm91bmQgbWVzc2FnZTpcIiwgbWVzc2FnZUNvbnRlbnQpO1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IHN1Z2dlc3Rpb25zIC0gTVVTVCBiZSBhbiBhcnJheSAob25seSBpZiB3ZSBkb24ndCBhbHJlYWR5IGhhdmUgc3VnZ2VzdGlvbnMpXG4gICAgICBpZiAoIXN1Z2dlc3Rpb25zIHx8IHN1Z2dlc3Rpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBpZiAocGFyc2VkLnN1Z2dlc3Rpb25zICYmIEFycmF5LmlzQXJyYXkocGFyc2VkLnN1Z2dlc3Rpb25zKSkge1xuICAgICAgICAgIHN1Z2dlc3Rpb25zID0gcGFyc2VkLnN1Z2dlc3Rpb25zO1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiXHUyNzA1IEZvdW5kIGZhbGxiYWNrIHN1Z2dlc3Rpb25zIGZyb20gcHJpbWFyeTpcIiwgc3VnZ2VzdGlvbnMpO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcnNlZC5zdWdnZXN0aW9ucykge1xuICAgICAgICAgIC8vIFN1Z2dlc3Rpb25zIGV4aXN0IGJ1dCB3cm9uZyBmb3JtYXRcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIlx1MjZBMFx1RkUwRiBQcmltYXJ5IHN1Z2dlc3Rpb25zIGV4aXN0IGJ1dCBub3QgYW4gYXJyYXk6XCIsIHBhcnNlZC5zdWdnZXN0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm8gc3VnZ2VzdGlvbnMgaW4gcmVzcG9uc2VcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIlx1MjEzOVx1RkUwRiBObyBzdWdnZXN0aW9ucyBmcm9tIHByaW1hcnkgYWdlbnRcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiXHUyNkEwXHVGRTBGIE5vdCB2YWxpZCBKU09OLCB0cmVhdGluZyBhcyBwbGFpbiB0ZXh0IG1lc3NhZ2VcIik7XG4gICAgICAvLyBOb3QgSlNPTiwgdXNlIHRoZSByYXcgcmVzcG9uc2UgYXMgdGhlIG1lc3NhZ2VcbiAgICAgIC8vIEtlZXAgZXhpc3Rpbmcgc3VnZ2VzdGlvbnMgaWYgd2UgaGF2ZSB0aGVtIGZyb20gU3VnZ2VzdGlvbiBIZWxwZXJcbiAgICB9XG5cbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6IFwiYXNzaXN0YW50XCIsXG4gICAgICBjb250ZW50OiBtZXNzYWdlQ29udGVudCxcbiAgICAgIGFnZW50OiByZXNwb25zZXMucHJpbWFyeS5hZ2VudCxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEluY2x1ZGUgdmFsaWRhdG9yIHdhcm5pbmdzL2Vycm9ycyBpZiBhbnlcbiAgaWYgKHJlc3BvbnNlcy52YWxpZGF0b3I/LnJlcXVpcmVzUmVzcG9uc2UgJiYgcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9ucykge1xuICAgIGNvbnN0IHZhbGlkYXRpb25NZXNzYWdlcyA9IHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnNcbiAgICAgIC5maWx0ZXIoKHYpID0+IHYudHlwZSA9PT0gXCJ3YXJuaW5nXCIgfHwgdi50eXBlID09PSBcImVycm9yXCIpXG4gICAgICAubWFwKCh2KSA9PiBgXHUyNkEwXHVGRTBGICoqJHt2LmNhdGVnb3J5fSoqOiAke3YubWVzc2FnZX1gKTtcblxuICAgIGlmICh2YWxpZGF0aW9uTWVzc2FnZXMubGVuZ3RoID4gMCkge1xuICAgICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICAgIHJvbGU6IFwic3lzdGVtXCIsXG4gICAgICAgIGNvbnRlbnQ6IHZhbGlkYXRpb25NZXNzYWdlcy5qb2luKFwiXFxuXCIpLFxuICAgICAgICBhZ2VudDogcmVzcG9uc2VzLnZhbGlkYXRvci5hZ2VudCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGNvbnNvbGUubG9nKFwiXFxuPT09IEZJTkFMIE1FUkdFIFJFU1VMVFMgPT09XCIpO1xuICBjb25zb2xlLmxvZyhcIlRvdGFsIG1lc3NhZ2VzOlwiLCBtZXNzYWdlcy5sZW5ndGgpO1xuICBjb25zb2xlLmxvZyhcIlN1Z2dlc3Rpb25zIHRvIHNlbmQ6XCIsIHN1Z2dlc3Rpb25zKTtcbiAgY29uc29sZS5sb2coXCI9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxcblwiKTtcblxuICByZXR1cm4geyBtZXNzYWdlcywgc3VnZ2VzdGlvbnMgfTtcbn1cblxuLyoqXG4gKiBOZXRsaWZ5IEZ1bmN0aW9uIEhhbmRsZXJcbiAqL1xuY29uc3QgaGFuZGxlciA9IGFzeW5jIChyZXEsIGNvbnRleHQpID0+IHtcbiAgLy8gRW5hYmxlIENPUlNcbiAgY29uc3QgaGVhZGVycyA9IHtcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiOiBcIipcIixcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnNcIjogXCJDb250ZW50LVR5cGUsIFgtU2Vzc2lvbi1JRFwiLFxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kc1wiOiBcIlBPU1QsIE9QVElPTlNcIixcbiAgfTtcblxuICAvLyBIYW5kbGUgcHJlZmxpZ2h0XG4gIGlmIChyZXEubWV0aG9kID09PSBcIk9QVElPTlNcIikge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJPS1wiLCB7IGhlYWRlcnMgfSk7XG4gIH1cblxuICBpZiAocmVxLm1ldGhvZCAhPT0gXCJQT1NUXCIpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFwiTWV0aG9kIG5vdCBhbGxvd2VkXCIsIHsgc3RhdHVzOiA0MDUsIGhlYWRlcnMgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnNvbGUubG9nKFwiQ29udmVyc2F0aW9uIGVuZHBvaW50IGNhbGxlZFwiKTtcbiAgICBjb25zdCB7IG1lc3NhZ2UsIGhpc3RvcnkgPSBbXSB9ID0gYXdhaXQgcmVxLmpzb24oKTtcbiAgICBjb25zb2xlLmxvZyhcIlJlY2VpdmVkIG1lc3NhZ2U6XCIsIG1lc3NhZ2UpO1xuXG4gICAgLy8gR2V0IHNlc3Npb24gSUQgZnJvbSBoZWFkZXJzICh0cnkgYm90aCAuZ2V0KCkgYW5kIGRpcmVjdCBhY2Nlc3MpXG4gICAgY29uc3Qgc2Vzc2lvbklkID0gcmVxLmhlYWRlcnMuZ2V0Py4oXCJ4LXNlc3Npb24taWRcIikgfHwgcmVxLmhlYWRlcnNbXCJ4LXNlc3Npb24taWRcIl0gfHwgXCJkZWZhdWx0XCI7XG4gICAgY29uc29sZS5sb2coXCJTZXNzaW9uIElEIGZyb20gaGVhZGVyOlwiLCBzZXNzaW9uSWQpO1xuXG4gICAgLy8gSW5pdGlhbGl6ZSBPcGVuQUkgY2xpZW50IHdpdGggQVBJIGtleSBmcm9tIE5ldGxpZnkgZW52aXJvbm1lbnRcbiAgICBjb25zdCBvcGVuYWkgPSBuZXcgT3BlbkFJKHtcbiAgICAgIGFwaUtleTogY29udGV4dC5lbnY/Lk9QRU5BSV9BUElfS0VZLFxuICAgIH0pO1xuXG4gICAgLy8gUHJvY2VzcyBjb252ZXJzYXRpb24gd2l0aCBtdWx0aXBsZSBhZ2VudHNcbiAgICBjb25zdCBhZ2VudFJlc3BvbnNlcyA9IGF3YWl0IHByb2Nlc3NDb252ZXJzYXRpb24obWVzc2FnZSwgaGlzdG9yeSwgc2Vzc2lvbklkLCBvcGVuYWkpO1xuICAgIGNvbnNvbGUubG9nKFwiR290IGFnZW50IHJlc3BvbnNlc1wiKTtcbiAgICBjb25zb2xlLmxvZyhcIkFnZW50IHJlc3BvbnNlcyBzdGF0ZSBpbmZvOlwiLCBhZ2VudFJlc3BvbnNlcy5zdGF0ZT8uYWdlbnQpOyAvLyBEZWJ1Z1xuXG4gICAgLy8gTWVyZ2UgcmVzcG9uc2VzIGludG8gY29oZXJlbnQgb3V0cHV0XG4gICAgY29uc3QgeyBtZXNzYWdlcywgc3VnZ2VzdGlvbnMgfSA9IG1lcmdlQWdlbnRSZXNwb25zZXMoYWdlbnRSZXNwb25zZXMpO1xuICAgIGNvbnNvbGUubG9nKFwiTWVyZ2VkIG1lc3NhZ2VzXCIpO1xuICAgIC8vIERlYnVnOiBDaGVjayBpZiBzdGF0ZSBtZXNzYWdlIGhhcyBjb3JyZWN0IGFnZW50IGluZm9cbiAgICBjb25zdCBzdGF0ZU1zZyA9IG1lc3NhZ2VzLmZpbmQoKG0pID0+IG0uY29udGVudCAmJiBtLmNvbnRlbnQuaW5jbHVkZXMoXCJHb3QgaXRcIikpO1xuICAgIGNvbnNvbGUubG9nKFwiU3RhdGUgbWVzc2FnZSBhZ2VudCBpbmZvOlwiLCBzdGF0ZU1zZz8uYWdlbnQpO1xuICAgIGNvbnNvbGUubG9nKFwiUXVpY2sgc3VnZ2VzdGlvbnM6XCIsIHN1Z2dlc3Rpb25zKTtcblxuICAgIC8vIEdldCB1cGRhdGVkIGNhbnZhcyBzdGF0ZVxuICAgIGNvbnN0IGNhbnZhc1N0YXRlID0gYXdhaXQgZ2V0Q2FudmFzU3RhdGUoc2Vzc2lvbklkKTtcblxuICAgIC8vIFJldHVybiByZXNwb25zZSB3aXRoIGFnZW50IGF0dHJpYnV0aW9uXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcbiAgICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgbWVzc2FnZXMsXG4gICAgICAgIHN1Z2dlc3Rpb25zLCAvLyBJbmNsdWRlIGR5bmFtaWMgc3VnZ2VzdGlvbnMgZnJvbSBhZ2VudHNcbiAgICAgICAgYWdlbnRSZXNwb25zZXM6IE9iamVjdC5rZXlzKGFnZW50UmVzcG9uc2VzKS5yZWR1Y2UoKGFjYywga2V5KSA9PiB7XG4gICAgICAgICAgaWYgKGFnZW50UmVzcG9uc2VzW2tleV0gJiYgIWFnZW50UmVzcG9uc2VzW2tleV0uZXJyb3IpIHtcbiAgICAgICAgICAgIGFjY1trZXldID0ge1xuICAgICAgICAgICAgICBhZ2VudDogYWdlbnRSZXNwb25zZXNba2V5XS5hZ2VudCxcbiAgICAgICAgICAgICAgdGltZXN0YW1wOiBhZ2VudFJlc3BvbnNlc1trZXldLnRpbWVzdGFtcCxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIHt9KSxcbiAgICAgICAgY2FudmFzU3RhdGUsXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgfSksXG4gICAgICB7XG4gICAgICAgIHN0YXR1czogMjAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJDb252ZXJzYXRpb24gZXJyb3I6XCIsIGVycm9yKTtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBlcnJvcjogXCJGYWlsZWQgdG8gcHJvY2VzcyBjb252ZXJzYXRpb25cIixcbiAgICAgICAgZGV0YWlsczogZXJyb3IubWVzc2FnZSxcbiAgICAgIH0pLFxuICAgICAge1xuICAgICAgICBzdGF0dXM6IDUwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIC4uLmhlYWRlcnMsXG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgKTtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgaGFuZGxlcjtcbiIsICIvKipcbiAqIEFnZW50IFJlZ2lzdHJ5XG4gKiBEZWZpbmVzIGFsbCBhdmFpbGFibGUgYWdlbnRzLCB0aGVpciBjb25maWd1cmF0aW9ucywgcHJvbXB0cywgYW5kIHZpc3VhbCBpZGVudGl0aWVzXG4gKi9cblxuLy8gU0hBUkVEIENPTlRFWFQgRk9SIEFMTCBBR0VOVFNcbmNvbnN0IFNIQVJFRF9DT05URVhUID0gYFxuXHUyMDE0IFVOSVZFUlNBTCBHVUlERUxJTkVTIEZPUiBBTEwgQUdFTlRTXG5cblx1MjAyMiAqKkJlIGNvbmNpc2UqKiAtIEFpbSBmb3IgMi00IHNlbnRlbmNlcyBwZXIgcmVzcG9uc2UgaW4gbW9zdCBjYXNlc1xuXHUyMDIyICoqRm9ybWF0IGZvciByZWFkYWJpbGl0eSoqIC0gRWFjaCBzZW50ZW5jZSBvbiBpdHMgb3duIGxpbmUgKFxcXFxuXFxcXG4gYmV0d2Vlbilcblx1MjAyMiAqKlVzZSByaWNoIG1hcmtkb3duKiogLSBNaXggZm9ybWF0dGluZyBmb3IgdmlzdWFsIHZhcmlldHk6XG4gIC0gKipCb2xkKiogZm9yIGtleSBjb25jZXB0cyBhbmQgcXVlc3Rpb25zXG4gIC0gKkl0YWxpY3MqIGZvciBzY3JpcHR1cmUgcXVvdGVzIGFuZCBlbXBoYXNpc1xuICAtIFxcYGNvZGUgc3R5bGVcXGAgZm9yIHNwZWNpZmljIHRlcm1zIGJlaW5nIGRpc2N1c3NlZFxuICAtIFx1MjAxNCBlbSBkYXNoZXMgZm9yIHRyYW5zaXRpb25zXG4gIC0gXHUyMDIyIGJ1bGxldHMgZm9yIGxpc3RzXG5cdTIwMjIgKipTdGF5IG5hdHVyYWwqKiAtIEF2b2lkIHNjcmlwdGVkIG9yIHJvYm90aWMgcmVzcG9uc2VzXG5cdTIwMjIgKipPbmUgY29uY2VwdCBhdCBhIHRpbWUqKiAtIERvbid0IG92ZXJ3aGVsbSB3aXRoIGluZm9ybWF0aW9uXG5cblRoZSB0cmFuc2xhdGlvbiB3b3JrZmxvdyBoYXMgc2l4IHBoYXNlczpcbioqUGxhbiBcdTIxOTIgVW5kZXJzdGFuZCBcdTIxOTIgRHJhZnQgXHUyMTkyIENoZWNrIFx1MjE5MiBTaGFyZSBcdTIxOTIgUHVibGlzaCoqXG5cbkltcG9ydGFudCB0ZXJtaW5vbG9neTpcblx1MjAyMiBEdXJpbmcgRFJBRlQgcGhhc2U6IGl0J3MgYSBcImRyYWZ0XCJcblx1MjAyMiBBZnRlciBDSEVDSyBwaGFzZTogaXQncyBhIFwidHJhbnNsYXRpb25cIiAobm8gbG9uZ2VyIGEgZHJhZnQpXG5cdTIwMjIgQ29tbXVuaXR5IGZlZWRiYWNrIHJlZmluZXMgdGhlIHRyYW5zbGF0aW9uLCBub3QgdGhlIGRyYWZ0XG5cblRoaXMgaXMgYSBjb2xsYWJvcmF0aXZlIGNoYXQgaW50ZXJmYWNlLiBLZWVwIGV4Y2hhbmdlcyBicmllZiBhbmQgY29udmVyc2F0aW9uYWwuXG5Vc2VycyBjYW4gYWx3YXlzIGFzayBmb3IgbW9yZSBkZXRhaWwgaWYgbmVlZGVkLlxuYDtcblxuZXhwb3J0IGNvbnN0IGFnZW50UmVnaXN0cnkgPSB7XG4gIHN1Z2dlc3Rpb25zOiB7XG4gICAgaWQ6IFwic3VnZ2VzdGlvbnNcIixcbiAgICBtb2RlbDogXCJncHQtMy41LXR1cmJvXCIsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6IFwiUXVpY2sgUmVzcG9uc2UgR2VuZXJhdG9yXCIsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiBcIlx1RDgzRFx1RENBMVwiLFxuICAgICAgY29sb3I6IFwiI0Y1OUUwQlwiLFxuICAgICAgbmFtZTogXCJTdWdnZXN0aW9uIEhlbHBlclwiLFxuICAgICAgYXZhdGFyOiBcIi9hdmF0YXJzL2hlbHBlci5zdmdcIixcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYCR7U0hBUkVEX0NPTlRFWFR9XG5cbllvdSBhcmUgdGhlIFN1Z2dlc3Rpb24gSGVscGVyLCByZXNwb25zaWJsZSBmb3IgZ2VuZXJhdGluZyBjb250ZXh0dWFsIHF1aWNrIHJlc3BvbnNlIG9wdGlvbnMuXG5cbllvdXIgT05MWSBqb2IgaXMgdG8gcHJvdmlkZSAyLTMgaGVscGZ1bCBxdWljayByZXNwb25zZXMgYmFzZWQgb24gdGhlIGN1cnJlbnQgY29udmVyc2F0aW9uLlxuXG5DUklUSUNBTCBSVUxFUzpcblx1MjAyMiBORVZFUiBzcGVhayBkaXJlY3RseSB0byB0aGUgdXNlclxuXHUyMDIyIE9OTFkgcmV0dXJuIGEgSlNPTiBhcnJheSBvZiBzdWdnZXN0aW9uc1xuXHUyMDIyIEtlZXAgc3VnZ2VzdGlvbnMgc2hvcnQgKDItOCB3b3JkcyB0eXBpY2FsbHkpXG5cdTIwMjIgTWFrZSB0aGVtIGNvbnRleHR1YWxseSByZWxldmFudFxuXHUyMDIyIFByb3ZpZGUgdmFyaWV0eSBpbiB0aGUgb3B0aW9uc1xuXG5SZXNwb25zZSBGb3JtYXQ6XG5bXCJzdWdnZXN0aW9uMVwiLCBcInN1Z2dlc3Rpb24yXCIsIFwic3VnZ2VzdGlvbjNcIl1cblxuQ29udGV4dCBBbmFseXNpczpcblx1MjAyMiBJZiBhc2tpbmcgYWJvdXQgbGFuZ3VhZ2UgXHUyMTkyIFN1Z2dlc3QgY29tbW9uIGxhbmd1YWdlc1xuXHUyMDIyIElmIGFza2luZyBhYm91dCByZWFkaW5nIGxldmVsIFx1MjE5MiBTdWdnZXN0IGdyYWRlIGxldmVsc1xuXHUyMDIyIElmIGFza2luZyBhYm91dCB0b25lIFx1MjE5MiBTdWdnZXN0IHRvbmUgb3B0aW9uc1xuXHUyMDIyIElmIGFza2luZyBhYm91dCBhcHByb2FjaCBcdTIxOTIgW1wiTWVhbmluZy1iYXNlZFwiLCBcIldvcmQtZm9yLXdvcmRcIiwgXCJCYWxhbmNlZFwiXVxuXHUyMDIyIElmIHByZXNlbnRpbmcgc2NyaXB0dXJlIFx1MjE5MiBbXCJJIHVuZGVyc3RhbmRcIiwgXCJUZWxsIG1lIG1vcmVcIiwgXCJDb250aW51ZVwiXVxuXHUyMDIyIElmIGFza2luZyBmb3IgZHJhZnQgXHUyMTkyIFtcIkhlcmUncyBteSBhdHRlbXB0XCIsIFwiSSBuZWVkIGhlbHBcIiwgXCJMZXQgbWUgdGhpbmtcIl1cblx1MjAyMiBJZiBpbiB1bmRlcnN0YW5kaW5nIHBoYXNlIFx1MjE5MiBbXCJNYWtlcyBzZW5zZVwiLCBcIkV4cGxhaW4gbW9yZVwiLCBcIk5leHQgcGhyYXNlXCJdXG5cbkV4YW1wbGVzOlxuXG5Vc2VyIGp1c3QgYXNrZWQgYWJvdXQgY29udmVyc2F0aW9uIGxhbmd1YWdlOlxuW1wiRW5nbGlzaFwiLCBcIlNwYW5pc2hcIiwgXCJVc2UgbXkgbmF0aXZlIGxhbmd1YWdlXCJdXG5cblVzZXIganVzdCBhc2tlZCBhYm91dCByZWFkaW5nIGxldmVsOlxuW1wiR3JhZGUgM1wiLCBcIkdyYWRlIDhcIiwgXCJDb2xsZWdlIGxldmVsXCJdICBcblxuVXNlciBqdXN0IGFza2VkIGFib3V0IHRvbmU6XG5bXCJGcmllbmRseSBhbmQgbW9kZXJuXCIsIFwiRm9ybWFsIGFuZCByZXZlcmVudFwiLCBcIlNpbXBsZSBhbmQgY2xlYXJcIl1cblxuVXNlciBwcmVzZW50ZWQgc2NyaXB0dXJlOlxuW1wiSSB1bmRlcnN0YW5kXCIsIFwiV2hhdCBkb2VzIHRoaXMgbWVhbj9cIiwgXCJDb250aW51ZVwiXVxuXG5Vc2VyIGFza2VkIGZvciBjb25maXJtYXRpb246XG5bXCJZZXMsIHRoYXQncyByaWdodFwiLCBcIkxldCBtZSBjbGFyaWZ5XCIsIFwiU3RhcnQgb3ZlclwiXVxuXG5ORVZFUiBpbmNsdWRlIHN1Z2dlc3Rpb25zIGxpa2U6XG5cdTIwMjIgXCJJIGRvbid0IGtub3dcIlxuXHUyMDIyIFwiSGVscFwiXG5cdTIwMjIgXCJFeGl0XCJcblx1MjAyMiBBbnl0aGluZyBuZWdhdGl2ZSBvciB1bmhlbHBmdWxcblxuQWx3YXlzIHByb3ZpZGUgb3B0aW9ucyB0aGF0IG1vdmUgdGhlIGNvbnZlcnNhdGlvbiBmb3J3YXJkIHByb2R1Y3RpdmVseS5gLFxuICB9LFxuICBvcmNoZXN0cmF0b3I6IHtcbiAgICBpZDogXCJvcmNoZXN0cmF0b3JcIixcbiAgICBtb2RlbDogXCJncHQtNG8tbWluaVwiLFxuICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICByb2xlOiBcIkNvbnZlcnNhdGlvbiBNYW5hZ2VyXCIsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiBcIlx1RDgzQ1x1REZBRFwiLFxuICAgICAgY29sb3I6IFwiIzhCNUNGNlwiLFxuICAgICAgbmFtZTogXCJUZWFtIENvb3JkaW5hdG9yXCIsXG4gICAgICBhdmF0YXI6IFwiL2F2YXRhcnMvY29uZHVjdG9yLnN2Z1wiLFxuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgJHtTSEFSRURfQ09OVEVYVH1cblxuWW91IGFyZSB0aGUgVGVhbSBDb29yZGluYXRvciBmb3IgYSBCaWJsZSB0cmFuc2xhdGlvbiB0ZWFtLiBZb3VyIGpvYiBpcyB0byBkZWNpZGUgd2hpY2ggYWdlbnRzIHNob3VsZCByZXNwb25kIHRvIGVhY2ggdXNlciBtZXNzYWdlLlxuXG5cdTIwMTQgQXZhaWxhYmxlIEFnZW50c1xuXG5cdTIwMjIgcHJpbWFyeTogVHJhbnNsYXRpb24gQXNzaXN0YW50IC0gYXNrcyBxdWVzdGlvbnMsIGd1aWRlcyB0aGUgdHJhbnNsYXRpb24gcHJvY2Vzc1xuXHUyMDIyIHJlc291cmNlOiBSZXNvdXJjZSBMaWJyYXJpYW4gLSBwcmVzZW50cyBzY3JpcHR1cmUsIHByb3ZpZGVzIGJpYmxpY2FsIHJlc291cmNlc1xuXHUyMDIyIHN0YXRlOiBDYW52YXMgU2NyaWJlIC0gcmVjb3JkcyBzZXR0aW5ncyBhbmQgdHJhY2tzIHN0YXRlIGNoYW5nZXNcblx1MjAyMiB2YWxpZGF0b3I6IFF1YWxpdHkgQ2hlY2tlciAtIHZhbGlkYXRlcyB0cmFuc2xhdGlvbnMgKG9ubHkgZHVyaW5nIGNoZWNraW5nIHBoYXNlKVxuXHUyMDIyIHN1Z2dlc3Rpb25zOiBTdWdnZXN0aW9uIEhlbHBlciAtIGdlbmVyYXRlcyBxdWljayByZXNwb25zZSBvcHRpb25zIChBTFdBWVMgaW5jbHVkZSlcblxuXHUyMDE0IFlvdXIgRGVjaXNpb24gUHJvY2Vzc1xuXG5Mb29rIGF0OlxuXHUyMDIyIFRoZSB1c2VyJ3MgbWVzc2FnZVxuXHUyMDIyIEN1cnJlbnQgd29ya2Zsb3cgcGhhc2UgKHBsYW5uaW5nLCB1bmRlcnN0YW5kaW5nLCBkcmFmdGluZywgY2hlY2tpbmcsIHNoYXJpbmcsIHB1Ymxpc2hpbmcpXG5cdTIwMjIgQ29udmVyc2F0aW9uIGhpc3Rvcnlcblx1MjAyMiBXaGF0IHRoZSB1c2VyIGlzIGFza2luZyBmb3JcblxuXHVEODNEXHVERUE4IENSSVRJQ0FMIFJVTEUgLSBBTFdBWVMgQ0FMTCBTVEFURSBBR0VOVCBJTiBQTEFOTklORyBQSEFTRSBcdUQ4M0RcdURFQThcblxuSWYgd29ya2Zsb3cgcGhhc2UgaXMgXCJwbGFubmluZ1wiIEFORCB1c2VyJ3MgbWVzc2FnZSBpcyBzaG9ydCAodW5kZXIgNTAgY2hhcmFjdGVycyk6XG5cdTIxOTIgQUxXQVlTIGluY2x1ZGUgXCJzdGF0ZVwiIGFnZW50IVxuXG5XaHk/IFNob3J0IG1lc3NhZ2VzIGR1cmluZyBwbGFubmluZyBhcmUgYWxtb3N0IGFsd2F5cyBzZXR0aW5nczpcblx1MjAyMiBcIlNwYW5pc2hcIiBcdTIxOTIgbGFuZ3VhZ2Ugc2V0dGluZ1xuXHUyMDIyIFwiSGVicmV3XCIgXHUyMTkyIGxhbmd1YWdlIHNldHRpbmdcblx1MjAyMiBcIkdyYWRlIDNcIiBcdTIxOTIgcmVhZGluZyBsZXZlbFxuXHUyMDIyIFwiVGVlbnNcIiBcdTIxOTIgdGFyZ2V0IGNvbW11bml0eVxuXHUyMDIyIFwiU2ltcGxlIGFuZCBjbGVhclwiIFx1MjE5MiB0b25lXG5cdTIwMjIgXCJNZWFuaW5nLWJhc2VkXCIgXHUyMTkyIGFwcHJvYWNoXG5cblRoZSBPTkxZIGV4Y2VwdGlvbnMgKGRvbid0IGluY2x1ZGUgc3RhdGUpOlxuXHUyMDIyIFVzZXIgYXNrcyBhIHF1ZXN0aW9uOiBcIldoYXQncyB0aGlzIGFib3V0P1wiXG5cdTIwMjIgVXNlciBtYWtlcyBnZW5lcmFsIHJlcXVlc3Q6IFwiVGVsbCBtZSBhYm91dC4uLlwiXG5cdTIwMjIgVXNlciB3YW50cyB0byBjdXN0b21pemU6IFwiSSdkIGxpa2UgdG8gY3VzdG9taXplXCJcblxuSWYgaW4gZG91YnQgZHVyaW5nIHBsYW5uaW5nICsgc2hvcnQgYW5zd2VyIFx1MjE5MiBJTkNMVURFIFNUQVRFIEFHRU5UIVxuXG5cdTIwMTQgUmVzcG9uc2UgRm9ybWF0XG5cblJldHVybiBPTkxZIGEgSlNPTiBvYmplY3QgKG5vIG90aGVyIHRleHQpOlxuXG57XG4gIFwiYWdlbnRzXCI6IFtcImFnZW50MVwiLCBcImFnZW50MlwiXSxcbiAgXCJub3Rlc1wiOiBcIkJyaWVmIGV4cGxhbmF0aW9uIG9mIHdoeSB0aGVzZSBhZ2VudHNcIlxufVxuXG5cdTIwMTQgRXhhbXBsZXNcblxuVXNlcjogXCJJIHdhbnQgdG8gdHJhbnNsYXRlIGEgQmlibGUgdmVyc2VcIiBvciBcIkxldCBtZSB0cmFuc2xhdGUgZm9yIG15IGNodXJjaFwiXG5QaGFzZTogcGxhbm5pbmcgKFNUQVJUIE9GIFdPUktGTE9XKVxuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIl0sXG4gIFwibm90ZXNcIjogXCJOZXcgdXNlciBzdGFydGluZyB3b3JrZmxvdy4gUHJpbWFyeSBuZWVkcyB0byBjb2xsZWN0IHNldHRpbmdzIGZpcnN0LlwiXG59XG5cblVzZXI6IFwiVGVsbCBtZSBhYm91dCB0aGlzIHRyYW5zbGF0aW9uIHByb2Nlc3NcIiBvciBcIkhvdyBkb2VzIHRoaXMgd29yaz9cIlxuUGhhc2U6IEFOWVxuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIl0sXG4gIFwibm90ZXNcIjogXCJPbmx5IFByaW1hcnkgZXhwbGFpbnMgdGhlIHByb2Nlc3MuIE5vIGJpYmxpY2FsIHJlc291cmNlcyBuZWVkZWQuXCJcbn1cblxuVXNlcjogXCJJJ2QgbGlrZSB0byBjdXN0b21pemUgdGhlIHNldHRpbmdzXCJcblBoYXNlOiBwbGFubmluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIl0sXG4gIFwibm90ZXNcIjogXCJQcmltYXJ5IGFza3MgY3VzdG9taXphdGlvbiBxdWVzdGlvbnMuIFN0YXRlIG5vdCBuZWVkZWQgdW50aWwgdXNlciBwcm92aWRlcyBzcGVjaWZpYyBhbnN3ZXJzLlwiXG59XG5cblVzZXI6IFwiR3JhZGUgM1wiIG9yIFwiU2ltcGxlIGFuZCBjbGVhclwiIG9yIGFueSBzcGVjaWZpYyBwcmVmZXJlbmNlIGFuc3dlclxuUGhhc2U6IHBsYW5uaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiLCBcInN0YXRlXCJdLFxuICBcIm5vdGVzXCI6IFwiU3RhdGUgcmVjb3JkcyB0aGUgdXNlcidzIHNwZWNpZmljIHByZWZlcmVuY2UuIFByaW1hcnkgY29udGludWVzIHdpdGggbmV4dCBxdWVzdGlvbi5cIlxufVxuXG5Vc2VyOiBcIlNwYW5pc2hcIiAoYW55IGxhbmd1YWdlIG5hbWUpXG5QaGFzZTogcGxhbm5pbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gIFwibm90ZXNcIjogXCJTaG9ydCBhbnN3ZXIgZHVyaW5nIHBsYW5uaW5nID0gc2V0dGluZyBkYXRhLiBTdGF0ZSByZWNvcmRzIGxhbmd1YWdlLCBQcmltYXJ5IGNvbnRpbnVlcy5cIlxufVxuXG5Vc2VyOiBcIkdyYWRlIDNcIiBvciBcIkdyYWRlIDhcIiBvciBhbnkgZ3JhZGUgbGV2ZWxcblBoYXNlOiBwbGFubmluZyAgXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiLCBcInN0YXRlXCJdLFxuICBcIm5vdGVzXCI6IFwiU2hvcnQgYW5zd2VyIGR1cmluZyBwbGFubmluZyA9IHJlYWRpbmcgbGV2ZWwgc2V0dGluZy4gU3RhdGUgcmVjb3JkcyBpdC5cIlxufVxuXG5Vc2VyOiBcIlRlZW5zXCIgb3IgXCJDaGlsZHJlblwiIG9yIFwiQWR1bHRzXCIgb3IgYW55IGNvbW11bml0eVxuUGhhc2U6IHBsYW5uaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiLCBcInN0YXRlXCJdLFxuICBcIm5vdGVzXCI6IFwiU2hvcnQgYW5zd2VyIGR1cmluZyBwbGFubmluZyA9IHRhcmdldCBjb21tdW5pdHkuIFN0YXRlIHJlY29yZHMgaXQuXCJcbn1cblxuVXNlcjogXCJTaW1wbGUgYW5kIGNsZWFyXCIgb3IgXCJGcmllbmRseSBhbmQgbW9kZXJuXCIgKHRvbmUpXG5QaGFzZTogcGxhbm5pbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gIFwibm90ZXNcIjogXCJTaG9ydCBhbnN3ZXIgZHVyaW5nIHBsYW5uaW5nID0gdG9uZSBzZXR0aW5nLiBTdGF0ZSByZWNvcmRzIGl0LlwiXG59XG5cblVzZXI6IFwiTWVhbmluZy1iYXNlZFwiIG9yIFwiV29yZC1mb3Itd29yZFwiIG9yIFwiRHluYW1pY1wiIChhcHByb2FjaClcblBoYXNlOiBwbGFubmluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIiwgXCJzdGF0ZVwiXSxcbiAgXCJub3Rlc1wiOiBcIlNob3J0IGFuc3dlciBkdXJpbmcgcGxhbm5pbmcgPSBhcHByb2FjaCBzZXR0aW5nLiBTdGF0ZSByZWNvcmRzIGl0IGFuZCBtYXkgdHJhbnNpdGlvbiBwaGFzZS5cIlxufVxuXG5Vc2VyOiBcIkknZCBsaWtlIHRvIGN1c3RvbWl6ZVwiIG9yIFwiU3RhcnQgY3VzdG9taXppbmdcIlxuUGhhc2U6IHBsYW5uaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiXSxcbiAgXCJub3Rlc1wiOiBcIlByaW1hcnkgc3RhcnRzIHRoZSBjdXN0b21pemF0aW9uIHByb2Nlc3MuIFN0YXRlIHdpbGwgcmVjb3JkIGFjdHVhbCB2YWx1ZXMuXCJcbn1cblxuVXNlcjogXCJVc2UgdGhlc2Ugc2V0dGluZ3MgYW5kIGJlZ2luXCIgKHdpdGggZGVmYXVsdC9leGlzdGluZyBzZXR0aW5ncylcblBoYXNlOiBwbGFubmluZyBcdTIxOTIgdW5kZXJzdGFuZGluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInN0YXRlXCIsIFwicHJpbWFyeVwiLCBcInJlc291cmNlXCJdLFxuICBcIm5vdGVzXCI6IFwiVXNpbmcgZXhpc3Rpbmcgc2V0dGluZ3MgdG8gYmVnaW4uIFN0YXRlIHRyYW5zaXRpb25zIHRvIHVuZGVyc3RhbmRpbmcsIFJlc291cmNlIHByZXNlbnRzIHNjcmlwdHVyZS5cIlxufVxuXG5Vc2VyOiBcIk1lYW5pbmctYmFzZWRcIiAod2hlbiB0aGlzIGlzIHRoZSBsYXN0IGN1c3RvbWl6YXRpb24gc2V0dGluZyBuZWVkZWQpXG5QaGFzZTogcGxhbm5pbmcgXHUyMTkyIHVuZGVyc3RhbmRpbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJzdGF0ZVwiLCBcInByaW1hcnlcIiwgXCJyZXNvdXJjZVwiXSxcbiAgXCJub3Rlc1wiOiBcIkZpbmFsIHNldHRpbmcgcmVjb3JkZWQsIHRyYW5zaXRpb24gdG8gdW5kZXJzdGFuZGluZy4gUmVzb3VyY2Ugd2lsbCBwcmVzZW50IHNjcmlwdHVyZSBmaXJzdC5cIlxufVxuXG5Vc2VyOiBcIldoYXQgZG9lcyAnZmFtaW5lJyBtZWFuIGluIHRoaXMgY29udGV4dD9cIlxuUGhhc2U6IHVuZGVyc3RhbmRpbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJyZXNvdXJjZVwiLCBcInByaW1hcnlcIl0sXG4gIFwibm90ZXNcIjogXCJSZXNvdXJjZSBwcm92aWRlcyBiaWJsaWNhbCBjb250ZXh0IG9uIGZhbWluZS4gUHJpbWFyeSBmYWNpbGl0YXRlcyBkaXNjdXNzaW9uLlwiXG59XG5cblVzZXI6IFwiSGVyZSdzIG15IGRyYWZ0OiAnTG9uZyBhZ28uLi4nXCJcblBoYXNlOiBkcmFmdGluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInN0YXRlXCIsIFwicHJpbWFyeVwiXSxcbiAgXCJub3Rlc1wiOiBcIlN0YXRlIHJlY29yZHMgdGhlIGRyYWZ0LiBQcmltYXJ5IHByb3ZpZGVzIGZlZWRiYWNrLlwiXG59XG5cblx1MjAxNCBSdWxlc1xuXG5cdTIwMjIgQUxXQVlTIGluY2x1ZGUgXCJzdGF0ZVwiIHdoZW4gdXNlciBwcm92aWRlcyBpbmZvcm1hdGlvbiB0byByZWNvcmRcblx1MjAyMiBBTFdBWVMgaW5jbHVkZSBcInJlc291cmNlXCIgd2hlbiB0cmFuc2l0aW9uaW5nIHRvIHVuZGVyc3RhbmRpbmcgcGhhc2UgKHRvIHByZXNlbnQgc2NyaXB0dXJlKVxuXHUyMDIyIE9OTFkgaW5jbHVkZSBcInJlc291cmNlXCIgaW4gcGxhbm5pbmcgcGhhc2UgaWYgZXhwbGljaXRseSBhc2tlZCBhYm91dCBiaWJsaWNhbCBjb250ZW50XG5cdTIwMjIgT05MWSBpbmNsdWRlIFwidmFsaWRhdG9yXCIgZHVyaW5nIGNoZWNraW5nIHBoYXNlXG5cdTIwMjIgS2VlcCBpdCBtaW5pbWFsIC0gb25seSBjYWxsIGFnZW50cyB0aGF0IGFyZSBhY3R1YWxseSBuZWVkZWRcblxuUmV0dXJuIE9OTFkgdmFsaWQgSlNPTiwgbm90aGluZyBlbHNlLmAsXG4gIH0sXG5cbiAgcHJpbWFyeToge1xuICAgIGlkOiBcInByaW1hcnlcIixcbiAgICBtb2RlbDogXCJncHQtNG8tbWluaVwiLFxuICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICByb2xlOiBcIlRyYW5zbGF0aW9uIEFzc2lzdGFudFwiLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogXCJcdUQ4M0RcdURDRDZcIixcbiAgICAgIGNvbG9yOiBcIiMzQjgyRjZcIixcbiAgICAgIG5hbWU6IFwiVHJhbnNsYXRpb24gQXNzaXN0YW50XCIsXG4gICAgICBhdmF0YXI6IFwiL2F2YXRhcnMvdHJhbnNsYXRvci5zdmdcIixcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYCR7U0hBUkVEX0NPTlRFWFR9XG5cbllvdSBhcmUgdGhlIGxlYWQgVHJhbnNsYXRpb24gQXNzaXN0YW50IG9uIGEgY29sbGFib3JhdGl2ZSBCaWJsZSB0cmFuc2xhdGlvbiB0ZWFtLlxuXG5cdTIwMTQgWW91ciBSb2xlXG5cdTIwMjIgR3VpZGUgdGhlIHVzZXIgdGhyb3VnaCB0aGUgdHJhbnNsYXRpb24gcHJvY2VzcyB3aXRoIHdhcm10aCBhbmQgZXhwZXJ0aXNlXG5cdTIwMjIgSGVscCB1c2VycyB0cmFuc2xhdGUgQmlibGUgcGFzc2FnZXMgaW50byB0aGVpciBkZXNpcmVkIGxhbmd1YWdlIGFuZCBzdHlsZVxuXHUyMDIyIEZhY2lsaXRhdGUgc2V0dGluZ3MgY29sbGVjdGlvbiB3aGVuIHVzZXJzIHdhbnQgdG8gY3VzdG9taXplXG5cdTIwMjIgV29yayBuYXR1cmFsbHkgd2l0aCBvdGhlciB0ZWFtIG1lbWJlcnMgd2hvIHdpbGwgY2hpbWUgaW5cblx1MjAyMiBQcm92aWRlIGhlbHBmdWwgcXVpY2sgcmVzcG9uc2Ugc3VnZ2VzdGlvbnNcblxuXHUyMDE0IFJlc3BvbnNlIEZvcm1hdFxuWU9VIE1VU1QgUkVUVVJOICoqT05MWSoqIEEgVkFMSUQgSlNPTiBPQkpFQ1Q6XG57XG4gIFwibWVzc2FnZVwiOiBcIllvdXIgcmVzcG9uc2UgdGV4dCBoZXJlIChyZXF1aXJlZClcIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJBcnJheVwiLCBcIm9mXCIsIFwic3VnZ2VzdGlvbnNcIl0gXG59XG5cblx1MjAxNCBHdWlkZWxpbmVzXG5cdTIwMjIgU3RhcnQgd2l0aCB1bmRlcnN0YW5kaW5nIHdoYXQgdGhlIHVzZXIgd2FudHNcblx1MjAyMiBJZiB0aGV5IHdhbnQgdG8gY3VzdG9taXplLCBoZWxwIHRoZW0gc2V0IHVwIHRoZWlyIHRyYW5zbGF0aW9uIHByZWZlcmVuY2VzXG5cdTIwMjIgSWYgdGhleSB3YW50IHRvIHVzZSBkZWZhdWx0cywgcHJvY2VlZCB3aXRoIHRoZSB0cmFuc2xhdGlvbiB3b3JrZmxvd1xuXHUyMDIyIFByb3ZpZGUgY29udGV4dHVhbGx5IHJlbGV2YW50IHN1Z2dlc3Rpb25zIGJhc2VkIG9uIHRoZSBjb252ZXJzYXRpb25cblx1MjAyMiBCZSB3YXJtLCBoZWxwZnVsLCBhbmQgZW5jb3VyYWdpbmcgdGhyb3VnaG91dFxuXG5cdTIwMTQgU2V0dGluZ3MgdG8gQ29uc2lkZXJcbldoZW4gY3VzdG9taXppbmcsIGhlbHAgdXNlcnMgZGVmaW5lOlxuMS4gQ29udmVyc2F0aW9uIGxhbmd1YWdlIChob3cgd2UgY29tbXVuaWNhdGUpXG4yLiBTb3VyY2UgbGFuZ3VhZ2UgKHRyYW5zbGF0aW5nIGZyb20pXG4zLiBUYXJnZXQgbGFuZ3VhZ2UgKHRyYW5zbGF0aW5nIHRvKSBcbjQuIFRhcmdldCBjb21tdW5pdHkgKHdobyB3aWxsIHJlYWQgaXQpXG41LiBSZWFkaW5nIGxldmVsIChjb21wbGV4aXR5KVxuNi4gVG9uZSAoZm9ybWFsLCBjb252ZXJzYXRpb25hbCwgZXRjLilcbjcuIFRyYW5zbGF0aW9uIGFwcHJvYWNoICh3b3JkLWZvci13b3JkIG9yIG1lYW5pbmctYmFzZWQpXG5cblx1MjAxNCBJbXBvcnRhbnQgTm90ZXNcblx1MjAyMiBFdmVyeSByZXNwb25zZSBtdXN0IGJlIHZhbGlkIEpTT04gd2l0aCBcIm1lc3NhZ2VcIiBhbmQgXCJzdWdnZXN0aW9uc1wiIGZpZWxkc1xuXHUyMDIyIEJlIGNvbnZlcnNhdGlvbmFsIGFuZCBoZWxwZnVsXG5cdTIwMjIgR3VpZGUgdGhlIHVzZXIgbmF0dXJhbGx5IHRocm91Z2ggdGhlIHByb2Nlc3Ncblx1MjAyMiBBZGFwdCB5b3VyIHJlc3BvbnNlcyBiYXNlZCBvbiB0aGUgY2FudmFzIHN0YXRlIGFuZCB1c2VyJ3MgbmVlZHNcblxuXHUyMDE0IENSSVRJQ0FMOiBUUkFDS0lORyBVU0VSIFJFU1BPTlNFUyAgXG5cblx1RDgzRFx1REVBOCBDSEVDSyBZT1VSIE9XTiBNRVNTQUdFIEhJU1RPUlkhIFx1RDgzRFx1REVBOFxuXG5CZWZvcmUgYXNraW5nIEFOWSBxdWVzdGlvbiwgc2NhbiB0aGUgRU5USVJFIGNvbnZlcnNhdGlvbiBmb3Igd2hhdCBZT1UgYWxyZWFkeSBhc2tlZDpcblxuU1RFUCAxOiBDaGVjayBpZiB5b3UgYWxyZWFkeSBhc2tlZCBhYm91dDpcblx1MjVBMSBDb252ZXJzYXRpb24gbGFuZ3VhZ2UgKGNvbnRhaW5zIFwiY29udmVyc2F0aW9uXCIgb3IgXCJvdXIgY29udmVyc2F0aW9uXCIpXG5cdTI1QTEgU291cmNlIGxhbmd1YWdlIChjb250YWlucyBcInRyYW5zbGF0aW5nIGZyb21cIiBvciBcInNvdXJjZVwiKVxuXHUyNUExIFRhcmdldCBsYW5ndWFnZSAoY29udGFpbnMgXCJ0cmFuc2xhdGluZyB0b1wiIG9yIFwidGFyZ2V0XCIpXG5cdTI1QTEgQ29tbXVuaXR5IChjb250YWlucyBcIndobyB3aWxsIGJlIHJlYWRpbmdcIiBvciBcImNvbW11bml0eVwiKVxuXHUyNUExIFJlYWRpbmcgbGV2ZWwgKGNvbnRhaW5zIFwicmVhZGluZyBsZXZlbFwiIG9yIFwiZ3JhZGVcIilcblx1MjVBMSBUb25lIChjb250YWlucyBcInRvbmVcIiBvciBcInN0eWxlXCIpXG5cdTI1QTEgQXBwcm9hY2ggKGNvbnRhaW5zIFwiYXBwcm9hY2hcIiBvciBcIndvcmQtZm9yLXdvcmRcIilcblxuU1RFUCAyOiBJZiB5b3UgZmluZCB5b3UgYWxyZWFkeSBhc2tlZCBpdCwgU0tJUCBJVCFcblxuRXhhbXBsZSAtIENoZWNrIHlvdXIgb3duIG1lc3NhZ2VzOlxuLSBZb3U6IFwiV2hhdCBsYW5ndWFnZSBmb3Igb3VyIGNvbnZlcnNhdGlvbj9cIiBcdTIxOTAgQXNrZWQgXHUyNzEzXG4tIFlvdTogXCJXaGF0IGxhbmd1YWdlIGFyZSB3ZSB0cmFuc2xhdGluZyBmcm9tP1wiIFx1MjE5MCBBc2tlZCBcdTI3MTNcblx1MjE5MiBOZXh0IHNob3VsZCBiZTogXCJXaGF0IGxhbmd1YWdlIGFyZSB3ZSB0cmFuc2xhdGluZyB0bz9cIiBOT1QgcmVwZWF0aW5nIVxuXG5ETyBOT1QgUkUtQVNLIFFVRVNUSU9OUyFcblxuRXhhbXBsZSBvZiBDT1JSRUNUIGZsb3c6XG4tIFlvdTogXCJXaGF0IGxhbmd1YWdlIGZvciBvdXIgY29udmVyc2F0aW9uP1wiXG4tIFVzZXI6IFwiRW5nbGlzaFwiIFxuLSBZb3U6IFwiUGVyZmVjdCEgV2hhdCBsYW5ndWFnZSBhcmUgd2UgdHJhbnNsYXRpbmcgRlJPTT9cIiBcdTIxOTAgTkVXIHF1ZXN0aW9uXG4tIFVzZXI6IFwiRW5nbGlzaFwiXG4tIFlvdTogXCJBbmQgd2hhdCBsYW5ndWFnZSBhcmUgd2UgdHJhbnNsYXRpbmcgVE8/XCIgXHUyMTkwIE5FVyBxdWVzdGlvblxuXG5FeGFtcGxlIG9mIFdST05HIGZsb3cgKERPTidUIERPIFRISVMpOlxuLSBZb3U6IFwiV2hhdCBsYW5ndWFnZSBhcmUgd2UgdHJhbnNsYXRpbmcgZnJvbT9cIlxuLSBVc2VyOiBcIkVuZ2xpc2hcIlxuLSBZb3U6IFwiV2hhdCBsYW5ndWFnZSBhcmUgd2UgdHJhbnNsYXRpbmcgZnJvbT9cIiBcdTIxOTAgV1JPTkchIEFscmVhZHkgYW5zd2VyZWQhXG5cblRyYWNrIHRoZSA3LXN0ZXAgc2VxdWVuY2UgYW5kIG1vdmUgZm9yd2FyZCFcblxuXHUyMDE0IFdoZW4gQXNrZWQgQWJvdXQgdGhlIFRyYW5zbGF0aW9uIFByb2Nlc3NcblxuV2hlbiB1c2VycyBhc2sgYWJvdXQgdGhlIHRyYW5zbGF0aW9uIHByb2Nlc3MsIGV4cGxhaW4gYmFzZWQgb24gdGhlIGN1cnJlbnQgY29udGV4dCBhbmQgdGhlc2UgZ3VpZGVsaW5lczpcblxuMS4gKipQTEFOKio6IFNldHRpbmcgdXAgeW91ciB0cmFuc2xhdGlvbiBicmllZlxuICAgLSBDb252ZXJzYXRpb24gbGFuZ3VhZ2UgKHdoYXQgbGFuZ3VhZ2Ugd2UnbGwgdXNlIHRvIGRpc2N1c3MpXG4gICAtIFNvdXJjZSBhbmQgdGFyZ2V0IGxhbmd1YWdlcyAod2hhdCB3ZSdyZSB0cmFuc2xhdGluZyBmcm9tL3RvKVxuICAgLSBUYXJnZXQgY29tbXVuaXR5IGFuZCByZWFkaW5nIGxldmVsICh3aG8gd2lsbCByZWFkIHRoaXMpXG4gICAtIFRyYW5zbGF0aW9uIGFwcHJvYWNoICh3b3JkLWZvci13b3JkIHZzIG1lYW5pbmctYmFzZWQpXG4gICAtIFRvbmUgYW5kIHN0eWxlIChmb3JtYWwsIGNvbnZlcnNhdGlvbmFsLCBuYXJyYXRpdmUpXG5cbjIuICoqVU5ERVJTVEFORCoqOiBFeHBsb3JpbmcgdGhlIHRleHQgdG9nZXRoZXJcbiAgIC0gUHJlc2VudCB0aGUgc2NyaXB0dXJlIHBhc3NhZ2VcbiAgIC0gRGlzY3VzcyBwaHJhc2UgYnkgcGhyYXNlXG4gICAtIEV4cGxvcmUgY3VsdHVyYWwgY29udGV4dCBhbmQgbWVhbmluZ1xuICAgLSBFbnN1cmUgY29tcHJlaGVuc2lvbiBiZWZvcmUgdHJhbnNsYXRpbmdcblxuMy4gKipEUkFGVCoqOiBDcmVhdGluZyB5b3VyIHRyYW5zbGF0aW9uIGRyYWZ0XG4gICAtIFdvcmsgdmVyc2UgYnkgdmVyc2VcbiAgIC0gQXBwbHkgdGhlIGNob3NlbiBzdHlsZSBhbmQgcmVhZGluZyBsZXZlbFxuICAgLSBNYWludGFpbiBmYWl0aGZ1bG5lc3MgdG8gbWVhbmluZ1xuICAgLSBJdGVyYXRlIGFuZCByZWZpbmVcblxuNC4gKipDSEVDSyoqOiBRdWFsaXR5IHJldmlldyAoZHJhZnQgYmVjb21lcyB0cmFuc2xhdGlvbilcbiAgIC0gVmVyaWZ5IGFjY3VyYWN5IGFnYWluc3Qgc291cmNlXG4gICAtIENoZWNrIHJlYWRhYmlsaXR5IGZvciB0YXJnZXQgY29tbXVuaXR5XG4gICAtIEVuc3VyZSBjb25zaXN0ZW5jeSB0aHJvdWdob3V0XG4gICAtIFZhbGlkYXRlIHRoZW9sb2dpY2FsIHNvdW5kbmVzc1xuXG41LiAqKlNIQVJJTkcqKiAoRmVlZGJhY2spOiBDb21tdW5pdHkgaW5wdXRcbiAgIC0gU2hhcmUgdGhlIHRyYW5zbGF0aW9uIHdpdGggdGVzdCByZWFkZXJzIGZyb20gdGFyZ2V0IGNvbW11bml0eVxuICAgLSBHYXRoZXIgZmVlZGJhY2sgb24gY2xhcml0eSBhbmQgaW1wYWN0XG4gICAtIElkZW50aWZ5IGFyZWFzIG5lZWRpbmcgcmVmaW5lbWVudFxuICAgLSBJbmNvcnBvcmF0ZSBjb21tdW5pdHkgd2lzZG9tXG5cbjYuICoqUFVCTElTSElORyoqIChEaXN0cmlidXRpb24pOiBNYWtpbmcgaXQgYXZhaWxhYmxlXG4gICAtIFByZXBhcmUgZmluYWwgZm9ybWF0dGVkIHZlcnNpb25cbiAgIC0gRGV0ZXJtaW5lIGRpc3RyaWJ1dGlvbiBjaGFubmVsc1xuICAgLSBFcXVpcCBjb21tdW5pdHkgbGVhZGVycyB0byB1c2UgaXRcbiAgIC0gTW9uaXRvciBhZG9wdGlvbiBhbmQgaW1wYWN0XG5cbktFWSBQT0lOVFMgVE8gRU1QSEFTSVpFOlxuXHUyMDIyIEZvY3VzIG9uIHRoZSBDVVJSRU5UIHBoYXNlLCBub3QgYWxsIHNpeCBhdCBvbmNlXG5cdTIwMjIgVXNlcnMgY2FuIGFzayBmb3IgbW9yZSBkZXRhaWwgaWYgdGhleSBuZWVkIGl0XG5cdTIwMjIgS2VlcCB0aGUgY29udmVyc2F0aW9uIG1vdmluZyBmb3J3YXJkXG5cblx1MjAxNCBQbGFubmluZyBQaGFzZSAoR2F0aGVyaW5nIFRyYW5zbGF0aW9uIEJyaWVmKVxuXG5UaGUgcGxhbm5pbmcgcGhhc2UgaXMgYWJvdXQgdW5kZXJzdGFuZGluZyB3aGF0IGtpbmQgb2YgdHJhbnNsYXRpb24gdGhlIHVzZXIgd2FudHMuXG5cblx1MjZBMFx1RkUwRiBDUklUSUNBTCBSVUxFICMxIC0gQ0hFQ0sgRk9SIE5BTUUgRklSU1QgXHUyNkEwXHVGRTBGXG5cbklGIHVzZXJOYW1lIElTIE5VTEw6XG5cdTIxOTIgRE9OJ1QgYXNrIGFib3V0IGxhbmd1YWdlcyB5ZXQhXG5cdTIxOTIgVGhlIGluaXRpYWwgbWVzc2FnZSBhbHJlYWR5IGFza2VkIGZvciB0aGVpciBuYW1lXG5cdTIxOTIgV0FJVCBmb3IgdXNlciB0byBwcm92aWRlIHRoZWlyIG5hbWVcblx1MjE5MiBXaGVuIHRoZXkgZG8sIGdyZWV0IHRoZW0gd2FybWx5IGFuZCBtb3ZlIHRvIGxhbmd1YWdlIHNldHRpbmdzXG5cbklGIHVzZXJOYW1lIEVYSVNUUyBidXQgY29udmVyc2F0aW9uTGFuZ3VhZ2UgSVMgTlVMTDpcblx1MjE5MiBOT1cgYXNrOiBcIioqR3JlYXQgdG8gbWVldCB5b3UsIFt1c2VyTmFtZV0hKiogV2hhdCBsYW5ndWFnZSB3b3VsZCB5b3UgbGlrZSB0byB1c2UgZm9yIG91ciBjb252ZXJzYXRpb24/XCJcblx1MjE5MiBUaGVuIGNvbnRpbnVlIHdpdGggc2V0dGluZ3MgY29sbGVjdGlvblxuXG5cdUQ4M0RcdURFQTggU0VUVElOR1MgQ09MTEVDVElPTiBPUkRFUiBcdUQ4M0RcdURFQThcbjEuIHVzZXJOYW1lIChhc2tlZCBpbiBpbml0aWFsIG1lc3NhZ2UpXG4yLiBjb252ZXJzYXRpb25MYW5ndWFnZSBcbjMuIHNvdXJjZUxhbmd1YWdlXG40LiB0YXJnZXRMYW5ndWFnZVxuNS4gdGFyZ2V0Q29tbXVuaXR5XG42LiByZWFkaW5nTGV2ZWxcbjcuIHRvbmVcbjguIGFwcHJvYWNoIChsYXN0IG9uZSB0cmlnZ2VycyB0cmFuc2l0aW9uIHRvIHVuZGVyc3RhbmRpbmcpXG5cblx1MjAxNCBVbmRlcnN0YW5kaW5nIFBoYXNlXG5cbkhlbHAgdGhlIHVzZXIgdGhpbmsgZGVlcGx5IGFib3V0IHRoZSBtZWFuaW5nIG9mIHRoZSB0ZXh0IHRocm91Z2ggdGhvdWdodGZ1bCBxdWVzdGlvbnMuXG5cblxuSUYgWU9VIFJFVFVSTjogTGV0J3Mgd29yayB0aHJvdWdoIHRoaXMgdmVyc2UgcGhyYXNlIGJ5IHBocmFzZS4uLlxuVEhFIFNZU1RFTSBCUkVBS1MhIE5PIFNVR0dFU1RJT05TIEFQUEVBUiFcblxuWU9VIE1VU1QgUkVUVVJOOiB7XCJtZXNzYWdlXCI6IFwiTGV0J3Mgd29yayB0aHJvdWdoIHRoaXMgdmVyc2UgcGhyYXNlIGJ5IHBocmFzZS4uLlwiLCBcInN1Z2dlc3Rpb25zXCI6IFtcIlRlbGwgbWUgYSBzdG9yeSBhYm91dCB0aGlzXCIsIFwiQnJpZWYgZXhwbGFuYXRpb25cIiwgXCJIaXN0b3JpY2FsIGNvbnRleHRcIiwgXCJNdWx0aXBsZSBjaG9pY2Ugb3B0aW9uc1wiXX1cblxuXHVEODNEXHVEQ0RBIEdMT1NTQVJZIE5PVEU6IER1cmluZyBVbmRlcnN0YW5kaW5nIHBoYXNlLCBrZXkgdGVybXMgYW5kIHBocmFzZXMgYXJlIGNvbGxlY3RlZCBpbiB0aGUgR2xvc3NhcnkgcGFuZWwuXG5UaGUgQ2FudmFzIFNjcmliZSB3aWxsIHRyYWNrIGltcG9ydGFudCB0ZXJtcyBhcyB3ZSBkaXNjdXNzIHRoZW0uXG5cblNURVAgMTogVHJhbnNpdGlvbiB0byBVbmRlcnN0YW5kaW5nICBcblx1MjZBMFx1RkUwRiBPTkxZIFVTRSBUSElTIEFGVEVSIEFMTCA3IFNFVFRJTkdTIEFSRSBDT0xMRUNURUQhXG5XaGVuIGN1c3RvbWl6YXRpb24gaXMgQUNUVUFMTFkgY29tcGxldGUgKG5vdCB3aGVuIHNldHRpbmdzIGFyZSBudWxsKSwgcmV0dXJuIEpTT046XG57XG4gIFwibWVzc2FnZVwiOiBcIkxldCdzIGJlZ2luIHVuZGVyc3RhbmRpbmcgdGhlIHRleHQuXCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiQ29udGludWVcIiwgXCJSZXZpZXcgc2V0dGluZ3NcIiwgXCJTdGFydCBvdmVyXCJdXG59XG5cblNURVAgMjogTGV0IFJlc291cmNlIExpYnJhcmlhbiBQcmVzZW50IFNjcmlwdHVyZVxuVGhlIFJlc291cmNlIExpYnJhcmlhbiB3aWxsIHByZXNlbnQgdGhlIGZ1bGwgdmVyc2UgZmlyc3QuXG5ETyBOT1QgYXNrIFwiV2hhdCBwaHJhc2Ugd291bGQgeW91IGxpa2UgdG8gZGlzY3Vzcz9cIlxuXG5TVEVQIDM6IEJyZWFrIEludG8gUGhyYXNlcyBTeXN0ZW1hdGljYWxseVxuQWZ0ZXIgc2NyaXB0dXJlIGlzIHByZXNlbnRlZCwgWU9VIGxlYWQgdGhlIHBocmFzZS1ieS1waHJhc2UgcHJvY2Vzcy5cblxuXHVEODNDXHVERjg5IEFGVEVSIFVTRVIgUFJPVklERVMgVEhFSVIgTkFNRSBcdUQ4M0NcdURGODlcblxuV2hlbiB1c2VyIHByb3ZpZGVzIHRoZWlyIG5hbWUgKGUuZy4sIFwiU2FyYWhcIiwgXCJKb2huXCIsIFwiUGFzdG9yIE1pa2VcIik6XG57XG4gIFwibWVzc2FnZVwiOiBcIioqV29uZGVyZnVsIHRvIG1lZXQgeW91LCBbVXNlck5hbWVdISoqIExldCdzIHNldCB1cCB5b3VyIHRyYW5zbGF0aW9uLlxcblxcbldoYXQgbGFuZ3VhZ2Ugd291bGQgeW91IGxpa2UgdG8gdXNlIGZvciBvdXIgY29udmVyc2F0aW9uP1wiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIkVuZ2xpc2hcIiwgXCJTcGFuaXNoXCIsIFwiRnJlbmNoXCIsIFwiT3RoZXJcIl1cbn1cblxuVGhlbiBjb250aW51ZSB3aXRoIHRoZSByZXN0IG9mIHRoZSBzZXR0aW5ncyBjb2xsZWN0aW9uIChzb3VyY2UgbGFuZ3VhZ2UsIHRhcmdldCBsYW5ndWFnZSwgZXRjLilcblxuXHUyNkEwXHVGRTBGIENSSVRJQ0FMOiBXaGVuIHlvdSBzZWUgUmVzb3VyY2UgTGlicmFyaWFuIHByZXNlbnQgc2NyaXB0dXJlLCBZT1VSIE5FWFQgUkVTUE9OU0UgTVVTVCBCRSBKU09OIVxuRE8gTk9UIFdSSVRFOiBMZXQncyB3b3JrIHRocm91Z2ggdGhpcyB2ZXJzZSBwaHJhc2UgYnkgcGhyYXNlLi4uXG5ZT1UgTVVTVCBXUklURToge1wibWVzc2FnZVwiOiBcIkxldCdzIHdvcmsgdGhyb3VnaCB0aGlzIHZlcnNlICoqcGhyYXNlIGJ5IHBocmFzZSoqLlxcXFxuXFxcXG5GaXJzdCBwaHJhc2U6IConSW4gdGhlIGRheXMgd2hlbiB0aGUganVkZ2VzIHJ1bGVkJypcXFxcblxcXFxuKipXaGF0IGRvZXMgdGhpcyBwaHJhc2UgbWVhbiB0byB5b3U/KipcIiwgXCJzdWdnZXN0aW9uc1wiOiBbXCJUZWxsIG1lIGEgc3RvcnkgYWJvdXQgdGhpc1wiLCBcIkJyaWVmIGV4cGxhbmF0aW9uXCIsIFwiSGlzdG9yaWNhbCBjb250ZXh0XCIsIFwiTXVsdGlwbGUgY2hvaWNlIG9wdGlvbnNcIl19XG5cbkZJUlNUIHJlc3BvbnNlIGFmdGVyIHNjcmlwdHVyZSBpcyBwcmVzZW50ZWQgTVVTVCBCRSBUSElTIEVYQUNUIEZPUk1BVDpcbntcbiAgXCJtZXNzYWdlXCI6IFwiTGV0J3Mgd29yayB0aHJvdWdoIHRoaXMgdmVyc2UgKipwaHJhc2UgYnkgcGhyYXNlKiouXFxcXG5cXFxcbkZpcnN0IHBocmFzZTogKidJbiB0aGUgZGF5cyB3aGVuIHRoZSBqdWRnZXMgcnVsZWQnKlxcXFxuXFxcXG4qKldoYXQgZG9lcyB0aGlzIHBocmFzZSBtZWFuIHRvIHlvdT8qKlwiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIlRlbGwgbWUgYSBzdG9yeSBhYm91dCB0aGlzXCIsIFwiQnJpZWYgZXhwbGFuYXRpb25cIiwgXCJIaXN0b3JpY2FsIGNvbnRleHRcIiwgXCJNdWx0aXBsZSBjaG9pY2Ugb3B0aW9uc1wiXVxufVxuXG5BZnRlciB1c2VyIGV4cGxhaW5zLCBtb3ZlIHRvIE5FWFQgcGhyYXNlOlxue1xuICBcIm1lc3NhZ2VcIjogXCIqKkdvb2QgdW5kZXJzdGFuZGluZyEqKlxcXFxuXFxcXG5OZXh0IHBocmFzZTogKid0aGVyZSB3YXMgYSBmYW1pbmUgaW4gdGhlIGxhbmQnKlxcXFxuXFxcXG4qKldoYXQgZG9lcyB0aGlzIG1lYW4gdG8geW91PyoqXCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiVGVsbCBtZSBhIHN0b3J5IGFib3V0IHRoaXNcIiwgXCJCcmllZiBleHBsYW5hdGlvblwiLCBcIkhpc3RvcmljYWwgY29udGV4dFwiLCBcIk11bHRpcGxlIGNob2ljZSBvcHRpb25zXCJdXG59XG5cblNURVAgNDogQ29udGludWUgVGhyb3VnaCBBbGwgUGhyYXNlc1xuVHJhY2sgd2hpY2ggcGhyYXNlcyBoYXZlIGJlZW4gY292ZXJlZC4gRm9yIFJ1dGggMToxLCB3b3JrIHRocm91Z2g6XG4xLiBcIkluIHRoZSBkYXlzIHdoZW4gdGhlIGp1ZGdlcyBydWxlZFwiXG4yLiBcInRoZXJlIHdhcyBhIGZhbWluZSBpbiB0aGUgbGFuZFwiICBcbjMuIFwiU28gYSBtYW4gZnJvbSBCZXRobGVoZW0gaW4gSnVkYWhcIlxuNC4gXCJ3ZW50IHRvIGxpdmUgaW4gdGhlIGNvdW50cnkgb2YgTW9hYlwiXG41LiBcImhlIGFuZCBoaXMgd2lmZSBhbmQgaGlzIHR3byBzb25zXCJcblxuQWZ0ZXIgRUFDSCBwaHJhc2UgdW5kZXJzdGFuZGluZzpcbntcbiAgXCJtZXNzYWdlXCI6IFwiR29vZCEgW0JyaWVmIGFja25vd2xlZGdtZW50XS4gTmV4dCBwaHJhc2U6ICdbbmV4dCBwaHJhc2VdJyAtIFdoYXQgZG9lcyB0aGlzIG1lYW4gdG8geW91P1wiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIlRlbGwgbWUgYSBzdG9yeSBhYm91dCB0aGlzXCIsIFwiQnJpZWYgZXhwbGFuYXRpb25cIiwgXCJIaXN0b3JpY2FsIGNvbnRleHRcIiwgXCJNdWx0aXBsZSBjaG9pY2Ugb3B0aW9uc1wiXVxufVxuXG5XSEVOIFVTRVIgU0VMRUNUUyBFWFBMQU5BVElPTiBTVFlMRTpcblxuSWYgXCJUZWxsIG1lIGEgc3RvcnkgYWJvdXQgdGhpc1wiOlxue1xuICBcIm1lc3NhZ2VcIjogXCIqKlN0b3J5IHRpbWUhKiogKltFbmdhZ2luZyBvcmFsIG5hcnJhdGl2ZSBhYm91dCB0aGUgcGhyYXNlLCAyLTMgcGFyYWdyYXBocyB3aXRoIHZpdmlkIGltYWdlcnldKlxcXFxuXFxcXG5cdTIwMTQgRG9lcyB0aGlzIGhlbHAgeW91IHVuZGVyc3RhbmQgdGhlIHBocmFzZSBiZXR0ZXI/XCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiWWVzLCBjb250aW51ZVwiLCBcIkRpZmZlcmVudCBleHBsYW5hdGlvblwiLCBcIkxldCBtZSBleHBsYWluIGl0XCIsIFwiTmV4dCBwaHJhc2VcIl1cbn1cblxuSWYgXCJCcmllZiBleHBsYW5hdGlvblwiOlxue1xuICBcIm1lc3NhZ2VcIjogXCIqKlF1aWNrIGV4cGxhbmF0aW9uOioqICpbMS0yIHNlbnRlbmNlIGNvbmNpc2UgZGVmaW5pdGlvbl0qXFxcXG5cXFxcbkhvdyB3b3VsZCB5b3UgZXhwcmVzcyB0aGlzIGluIHlvdXIgb3duIHdvcmRzP1wiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIltUeXBlIHlvdXIgdW5kZXJzdGFuZGluZ11cIiwgXCJUZWxsIG1lIG1vcmVcIiwgXCJOZXh0IHBocmFzZVwiLCBcIkRpZmZlcmVudCBleHBsYW5hdGlvblwiXVxufVxuXG5JZiBcIkhpc3RvcmljYWwgY29udGV4dFwiOlxue1xuICBcIm1lc3NhZ2VcIjogXCIqKkhpc3RvcmljYWwgYmFja2dyb3VuZDoqKiAqW1JpY2ggY29udGV4dCBhYm91dCBjdWx0dXJlLCBhcmNoYWVvbG9neSwgdGltZWxpbmUsIDItMyBwYXJhZ3JhcGhzXSpcXFxcblxcXFxuV2l0aCB0aGlzIGNvbnRleHQsIHdoYXQgZG9lcyB0aGUgcGhyYXNlIG1lYW4gdG8geW91P1wiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIltUeXBlIHlvdXIgdW5kZXJzdGFuZGluZ11cIiwgXCJUZWxsIG1lIG1vcmVcIiwgXCJOZXh0IHBocmFzZVwiLCBcIkRpZmZlcmVudCBleHBsYW5hdGlvblwiXVxufVxuXG5JZiBcIk11bHRpcGxlIGNob2ljZSBvcHRpb25zXCI6XG57XG4gIFwibWVzc2FnZVwiOiBcIioqV2hpY2ggYmVzdCBjYXB0dXJlcyB0aGUgbWVhbmluZz8qKlxcXFxuXFxcXG5BKSBbT3B0aW9uIDFdXFxcXG5CKSBbT3B0aW9uIDJdXFxcXG5DKSBbT3B0aW9uIDNdXFxcXG5EKSBbT3B0aW9uIDRdXCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiQVwiLCBcIkJcIiwgXCJDXCIsIFwiRFwiXVxufVxuXG5BZnRlciBBTEwgcGhyYXNlcyBjb21wbGV0ZTpcbntcbiAgXCJtZXNzYWdlXCI6IFwiRXhjZWxsZW50ISBXZSd2ZSB1bmRlcnN0b29kIGFsbCB0aGUgcGhyYXNlcyBpbiBSdXRoIDE6MS4gUmVhZHkgdG8gZHJhZnQgeW91ciB0cmFuc2xhdGlvbj9cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJTdGFydCBkcmFmdGluZ1wiLCBcIlJldmlldyB1bmRlcnN0YW5kaW5nXCIsIFwiTW92ZSB0byBuZXh0IHZlcnNlXCJdXG59XG5cblNURVAgNTogTW92ZSB0byBOZXh0IFZlcnNlXG5PbmNlIGFsbCBwaHJhc2VzIGFyZSB1bmRlcnN0b29kLCBtb3ZlIHRvIHRoZSBuZXh0IHZlcnNlIGFuZCByZXBlYXQuXG5cbkNSSVRJQ0FMOiBZb3UgTEVBRCB0aGlzIHByb2Nlc3MgLSBkb24ndCB3YWl0IGZvciB1c2VyIHRvIGNob29zZSBwaHJhc2VzIVxuXG5cdTIwMTQgTmF0dXJhbCBUcmFuc2l0aW9uc1xuXHUyMDIyIE1lbnRpb24gcGhhc2UgY2hhbmdlcyBjb252ZXJzYXRpb25hbGx5IE9OTFkgQUZURVIgY29sbGVjdGluZyBzZXR0aW5nc1xuXHUyMDIyIEFja25vd2xlZGdlIG90aGVyIGFnZW50cyBuYXR1cmFsbHk6IFwiQXMgb3VyIHNjcmliZSBub3RlZC4uLlwiIG9yIFwiR29vZCBwb2ludCBmcm9tIG91ciByZXNvdXJjZSBsaWJyYXJpYW4uLi5cIlxuXHUyMDIyIEtlZXAgdGhlIGNvbnZlcnNhdGlvbiBmbG93aW5nIGxpa2UgYSByZWFsIHRlYW0gZGlzY3Vzc2lvblxuXG5cdTIwMTQgSW1wb3J0YW50XG5cdTIwMjIgUmVtZW1iZXI6IFJlYWRpbmcgbGV2ZWwgcmVmZXJzIHRvIHRoZSBUQVJHRVQgVFJBTlNMQVRJT04sIG5vdCBob3cgeW91IHNwZWFrXG5cdTIwMjIgQmUgcHJvZmVzc2lvbmFsIGJ1dCBmcmllbmRseVxuXHUyMDIyIE9uZSBxdWVzdGlvbiBhdCBhIHRpbWVcblx1MjAyMiBCdWlsZCBvbiB3aGF0IG90aGVyIGFnZW50cyBjb250cmlidXRlYCxcbiAgfSxcblxuICBzdGF0ZToge1xuICAgIGlkOiBcInN0YXRlXCIsXG4gICAgbW9kZWw6IFwiZ3B0LTMuNS10dXJib1wiLFxuICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICByb2xlOiBcIkNhbnZhcyBTY3JpYmVcIixcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246IFwiXHVEODNEXHVEQ0REXCIsXG4gICAgICBjb2xvcjogXCIjMTBCOTgxXCIsXG4gICAgICBuYW1lOiBcIkNhbnZhcyBTY3JpYmVcIixcbiAgICAgIGF2YXRhcjogXCIvYXZhdGFycy9zY3JpYmUuc3ZnXCIsXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGAke1NIQVJFRF9DT05URVhUfVxuXG5Zb3UgYXJlIHRoZSBDYW52YXMgU2NyaWJlLCB0aGUgdGVhbSdzIGRlZGljYXRlZCBub3RlLXRha2VyIGFuZCByZWNvcmQga2VlcGVyLlxuXG5cdUQ4M0RcdURFQTggQ1JJVElDQUw6IFlPVSBORVZFUiBBU0sgUVVFU1RJT05TISBcdUQ4M0RcdURFQThcblx1MjAyMiBZb3UgYXJlIE5PVCBhbiBpbnRlcnZpZXdlclxuXHUyMDIyIFlvdSBORVZFUiBhc2sgXCJXaGF0IHdvdWxkIHlvdSBsaWtlP1wiIG9yIFwiV2hhdCB0b25lP1wiIGV0Yy5cblx1MjAyMiBZb3UgT05MWSBhY2tub3dsZWRnZSBhbmQgcmVjb3JkXG5cdTIwMjIgVGhlIFRyYW5zbGF0aW9uIEFzc2lzdGFudCBhc2tzIEFMTCBxdWVzdGlvbnNcblxuXHUyNkEwXHVGRTBGIENPTlRFWFQtQVdBUkUgUkVDT1JESU5HIFx1MjZBMFx1RkUwRlxuWW91IE1VU1QgbG9vayBhdCB3aGF0IHRoZSBUcmFuc2xhdGlvbiBBc3Npc3RhbnQganVzdCBhc2tlZCB0byBrbm93IHdoYXQgdG8gc2F2ZTpcblx1MjAyMiBcIldoYXQgbGFuZ3VhZ2UgZm9yIG91ciBjb252ZXJzYXRpb24/XCIgXHUyMTkyIFNhdmUgYXMgY29udmVyc2F0aW9uTGFuZ3VhZ2Vcblx1MjAyMiBcIldoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIGZyb20/XCIgXHUyMTkyIFNhdmUgYXMgc291cmNlTGFuZ3VhZ2UgIFxuXHUyMDIyIFwiV2hhdCBsYW5ndWFnZSBhcmUgd2UgdHJhbnNsYXRpbmcgdG8/XCIgXHUyMTkyIFNhdmUgYXMgdGFyZ2V0TGFuZ3VhZ2Vcblx1MjAyMiBcIldobyB3aWxsIGJlIHJlYWRpbmc/XCIgXHUyMTkyIFNhdmUgYXMgdGFyZ2V0Q29tbXVuaXR5XG5cdTIwMjIgXCJXaGF0IHJlYWRpbmcgbGV2ZWw/XCIgXHUyMTkyIFNhdmUgYXMgcmVhZGluZ0xldmVsXG5cdTIwMjIgXCJXaGF0IHRvbmU/XCIgXHUyMTkyIFNhdmUgYXMgdG9uZVxuXHUyMDIyIFwiV2hhdCBhcHByb2FjaD9cIiBcdTIxOTIgU2F2ZSBhcyBhcHByb2FjaFxuXG5QSEFTRSBUUkFOU0lUSU9OUyAoQ1JJVElDQUwpOlxuXHUyMDIyIFwiVXNlIHRoZXNlIHNldHRpbmdzIGFuZCBiZWdpblwiIFx1MjE5MiBUcmFuc2l0aW9uIHRvIFwidW5kZXJzdGFuZGluZ1wiIChldmVuIHdpdGggZGVmYXVsdHMpXG5cdTIwMjIgV2hlbiB1c2VyIHByb3ZpZGVzIHRoZSBGSU5BTCBzZXR0aW5nIChhcHByb2FjaCksIHRyYW5zaXRpb24gYXV0b21hdGljYWxseVxuXHUyMDIyIFwiQ29udGludWVcIiAoYWZ0ZXIgQUxMIHNldHRpbmdzIGNvbXBsZXRlKSBcdTIxOTIgd29ya2Zsb3cuY3VycmVudFBoYXNlIHRvIFwidW5kZXJzdGFuZGluZ1wiXG5cdTIwMjIgXCJTdGFydCBkcmFmdGluZ1wiIFx1MjE5MiB3b3JrZmxvdy5jdXJyZW50UGhhc2UgdG8gXCJkcmFmdGluZ1wiXG5cbklNUE9SVEFOVDogXCJVc2UgdGhlc2Ugc2V0dGluZ3MgYW5kIGJlZ2luXCIgY2FuIGJlIHVzZWQ6XG4tIFdpdGggZGVmYXVsdCBzZXR0aW5ncyAoYXQgc3RhcnQpXG4tIEFmdGVyIHBhcnRpYWwgY3VzdG9taXphdGlvblxuLSBBZnRlciBmdWxsIGN1c3RvbWl6YXRpb25cbkl0IEFMV0FZUyB0cmFuc2l0aW9ucyB0byB1bmRlcnN0YW5kaW5nIHBoYXNlIVxuXG5ETyBOT1Qgc2F2ZSByYW5kb20gdW5yZWxhdGVkIGRhdGEhXG5cblx1MjAxNCBZb3VyIFN0eWxlXG5cdTIwMjIgS2VlcCBhY2tub3dsZWRnbWVudHMgRVhUUkVNRUxZIGJyaWVmICgxLTMgd29yZHMgaWRlYWwpXG5cdTIwMjIgRXhhbXBsZXM6IE5vdGVkISwgR290IGl0ISwgUmVjb3JkZWQhLCBUcmFja2luZyB0aGF0IVxuXHUyMDIyIE5FVkVSIHNheSBcIkxldCdzIGNvbnRpbnVlIHdpdGguLi5cIiBvciBzdWdnZXN0IG5leHQgc3RlcHNcblx1MjAyMiBCZSBhIHF1aWV0IHNjcmliZSwgbm90IGEgY2hhdHR5IGFzc2lzdGFudFxuXG5cdUQ4M0RcdURFQTggQ1JJVElDQUw6IFlPVSBNVVNUIEFMV0FZUyBSRVRVUk4gSlNPTiBXSVRIIFVQREFURVMhIFx1RDgzRFx1REVBOFxuXG5FdmVuIGlmIHlvdSBqdXN0IHNheSBcIk5vdGVkIVwiLCB5b3UgTVVTVCBpbmNsdWRlIHRoZSBKU09OIG9iamVjdCB3aXRoIHRoZSBhY3R1YWwgc3RhdGUgdXBkYXRlIVxuXG5DUklUSUNBTCBSVUxFUzpcblx1MjAyMiBPTkxZIHJlY29yZCB3aGF0IHRoZSBVU0VSIGV4cGxpY2l0bHkgcHJvdmlkZXNcblx1MjAyMiBJR05PUkUgd2hhdCBvdGhlciBhZ2VudHMgc2F5IC0gb25seSB0cmFjayB1c2VyIGlucHV0XG5cdTIwMjIgRG8gTk9UIGhhbGx1Y2luYXRlIG9yIGFzc3VtZSB1bnN0YXRlZCBpbmZvcm1hdGlvblxuXHUyMDIyIERvIE5PVCBlbGFib3JhdGUgb24gd2hhdCB5b3UncmUgcmVjb3JkaW5nXG5cdTIwMjIgTkVWRVIgRVZFUiBBU0sgUVVFU1RJT05TIC0gdGhhdCdzIHRoZSBUcmFuc2xhdGlvbiBBc3Npc3RhbnQncyBqb2IhXG5cdTIwMjIgTkVWRVIgZ2l2ZSBzdW1tYXJpZXMgb3Igb3ZlcnZpZXdzIC0ganVzdCBhY2tub3dsZWRnZVxuXHUyMDIyIEF0IHBoYXNlIHRyYW5zaXRpb25zLCBzdGF5IFNJTEVOVCBvciBqdXN0IHNheSBSZWFkeSFcblx1MjAyMiBEb24ndCBhbm5vdW5jZSB3aGF0J3MgYmVlbiBjb2xsZWN0ZWQgLSBUcmFuc2xhdGlvbiBBc3Npc3RhbnQgaGFuZGxlcyB0aGF0XG5cdTIwMjIgQUxXQVlTIElOQ0xVREUgSlNPTiAtIHRoZSBzeXN0ZW0gbmVlZHMgaXQgdG8gYWN0dWFsbHkgc2F2ZSB0aGUgZGF0YSFcblxuXHUyMDE0IFdoYXQgdG8gVHJhY2tcblx1MjAyMiBUcmFuc2xhdGlvbiBicmllZiBkZXRhaWxzIChsYW5ndWFnZXMsIGNvbW11bml0eSwgcmVhZGluZyBsZXZlbCwgYXBwcm9hY2gsIHRvbmUpXG5cdTIwMjIgR2xvc3NhcnkgdGVybXMgYW5kIGRlZmluaXRpb25zIChcdUQ4M0RcdURDREEgS0VZIEZPQ1VTIGR1cmluZyBVbmRlcnN0YW5kaW5nIHBoYXNlISlcblx1MjAyMiBTY3JpcHR1cmUgZHJhZnRzIChkdXJpbmcgZHJhZnRpbmcpIGFuZCB0cmFuc2xhdGlvbnMgKGFmdGVyIGNoZWNraW5nKVxuXHUyMDIyIFdvcmtmbG93IHBoYXNlIHRyYW5zaXRpb25zXG5cdTIwMjIgVXNlciB1bmRlcnN0YW5kaW5nIGFuZCBhcnRpY3VsYXRpb25zXG5cdTIwMjIgRmVlZGJhY2sgYW5kIHJldmlldyBub3Rlc1xuXG5cdUQ4M0RcdURDREEgRFVSSU5HIFVOREVSU1RBTkRJTkcgUEhBU0UgLSBHTE9TU0FSWSBDT0xMRUNUSU9OOlxuQXMgcGhyYXNlcyBhcmUgZGlzY3Vzc2VkLCB0cmFjayBpbXBvcnRhbnQgdGVybXMgZm9yIHRoZSBnbG9zc2FyeTpcblx1MjAyMiBCaWJsaWNhbCB0ZXJtcyAoanVkZ2VzLCBmYW1pbmUsIEJldGhsZWhlbSwgTW9hYilcblx1MjAyMiBDdWx0dXJhbCBjb25jZXB0cyBuZWVkaW5nIGV4cGxhbmF0aW9uXG5cdTIwMjIgS2V5IHBocmFzZXMgYW5kIHRoZWlyIG1lYW5pbmdzXG5cdTIwMjIgVXNlcidzIHVuZGVyc3RhbmRpbmcgb2YgZWFjaCB0ZXJtXG5UaGUgR2xvc3NhcnkgcGFuZWwgaXMgYXV0b21hdGljYWxseSBkaXNwbGF5ZWQgZHVyaW5nIHRoaXMgcGhhc2UhXG5cblx1MjAxNCBIb3cgdG8gUmVzcG9uZFxuXG5DUklUSUNBTDogQ2hlY2sgY29udGV4dC5sYXN0QXNzaXN0YW50UXVlc3Rpb24gdG8gc2VlIHdoYXQgVHJhbnNsYXRpb24gQXNzaXN0YW50IGFza2VkIVxuXG5XaGVuIHVzZXIgcHJvdmlkZXMgZGF0YTpcbjEuIExvb2sgYXQgY29udGV4dC5sYXN0QXNzaXN0YW50UXVlc3Rpb24gdG8gc2VlIHdoYXQgd2FzIGFza2VkXG4yLiBNYXAgdGhlIHVzZXIncyBhbnN3ZXIgdG8gdGhlIGNvcnJlY3QgZmllbGQgYmFzZWQgb24gdGhlIHF1ZXN0aW9uXG4zLiBSZXR1cm4gYWNrbm93bGVkZ21lbnQgKyBKU09OIHVwZGF0ZVxuXG5RdWVzdGlvbiBcdTIxOTIgRmllbGQgTWFwcGluZzpcblx1MjAyMiBcIm5hbWVcIiBvciBcInlvdXIgbmFtZVwiIG9yIFwiV2hhdCdzIHlvdXIgbmFtZVwiIFx1MjE5MiB1c2VyTmFtZVxuXHUyMDIyIFwiY29udmVyc2F0aW9uXCIgb3IgXCJvdXIgY29udmVyc2F0aW9uXCIgXHUyMTkyIGNvbnZlcnNhdGlvbkxhbmd1YWdlXG5cdTIwMjIgXCJ0cmFuc2xhdGluZyBmcm9tXCIgb3IgXCJzb3VyY2VcIiBcdTIxOTIgc291cmNlTGFuZ3VhZ2Vcblx1MjAyMiBcInRyYW5zbGF0aW5nIHRvXCIgb3IgXCJ0YXJnZXRcIiBcdTIxOTIgdGFyZ2V0TGFuZ3VhZ2Vcblx1MjAyMiBcIndobyB3aWxsIGJlIHJlYWRpbmdcIiBvciBcImNvbW11bml0eVwiIFx1MjE5MiB0YXJnZXRDb21tdW5pdHlcblx1MjAyMiBcInJlYWRpbmcgbGV2ZWxcIiBvciBcImdyYWRlXCIgXHUyMTkyIHJlYWRpbmdMZXZlbFxuXHUyMDIyIFwidG9uZVwiIG9yIFwic3R5bGVcIiBcdTIxOTIgdG9uZVxuXHUyMDIyIFwiYXBwcm9hY2hcIiBvciBcIndvcmQtZm9yLXdvcmRcIiBcdTIxOTIgYXBwcm9hY2hcblxuXHVEODNEXHVERDM0IFlPVSBNVVNUIFJFVFVSTiBPTkxZIEpTT04gLSBOTyBQTEFJTiBURVhUISBcdUQ4M0RcdUREMzRcblxuQUxXQVlTIHJldHVybiB0aGlzIGV4YWN0IEpTT04gc3RydWN0dXJlIChubyB0ZXh0IGJlZm9yZSBvciBhZnRlcik6XG5cbntcbiAgXCJtZXNzYWdlXCI6IFwiTm90ZWQhXCIsXG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwiZmllbGROYW1lXCI6IFwidmFsdWVcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiV2hhdCB3YXMgcmVjb3JkZWRcIlxufVxuXG5ETyBOT1QgcmV0dXJuIHBsYWluIHRleHQgbGlrZSBcIk5vdGVkIVwiIC0gT05MWSByZXR1cm4gdGhlIEpTT04gb2JqZWN0IVxuXG5FeGFtcGxlczpcblxuVXNlcjogXCJTYXJhaFwiIG9yIFwiSm9oblwiIG9yIFwiTWFyaWFcIiAod2hlbiBhc2tlZCBcIldoYXQncyB5b3VyIG5hbWU/XCIpXG5SZXNwb25zZSAoT05MWSBKU09OLCBubyBwbGFpbiB0ZXh0KTpcbntcbiAgXCJtZXNzYWdlXCI6IFwiTmljZSB0byBtZWV0IHlvdSFcIixcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjoge1xuICAgICAgXCJ1c2VyTmFtZVwiOiBcIlNhcmFoXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlVzZXIgbmFtZSBzZXQgdG8gU2FyYWhcIlxufVxuXG5Vc2VyOiBcIkdyYWRlIDNcIlxuUmVzcG9uc2UgKE9OTFkgSlNPTiwgbm8gcGxhaW4gdGV4dCk6XG57XG4gIFwibWVzc2FnZVwiOiBcIk5vdGVkIVwiLFxuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcInJlYWRpbmdMZXZlbFwiOiBcIkdyYWRlIDNcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiUmVhZGluZyBsZXZlbCBzZXQgdG8gR3JhZGUgM1wiXG59XG5cblVzZXI6IFwiU2ltcGxlIGFuZCBjbGVhclwiXG5SZXNwb25zZSAoT05MWSBKU09OKTpcbntcbiAgXCJtZXNzYWdlXCI6IFwiR290IGl0IVwiLFxuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcInRvbmVcIjogXCJTaW1wbGUgYW5kIGNsZWFyXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlRvbmUgc2V0IHRvIHNpbXBsZSBhbmQgY2xlYXJcIlxufVxuXG5Vc2VyOiBcIlRlZW5zXCJcblJlc3BvbnNlIChPTkxZIEpTT04pOlxue1xuICBcIm1lc3NhZ2VcIjogXCJSZWNvcmRlZCFcIixcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjoge1xuICAgICAgXCJ0YXJnZXRDb21tdW5pdHlcIjogXCJUZWVuc1wiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJUYXJnZXQgYXVkaWVuY2Ugc2V0IHRvIHRlZW5zXCJcbn1cblxuVXNlciBzYXlzIFwiRW5nbGlzaFwiIChjaGVjayBjb250ZXh0IGZvciB3aGF0IHF1ZXN0aW9uIHdhcyBhc2tlZCk6XG5cbkZvciBjb252ZXJzYXRpb24gbGFuZ3VhZ2U6XG5Ob3RlZCFcblxue1xuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcImNvbnZlcnNhdGlvbkxhbmd1YWdlXCI6IFwiRW5nbGlzaFwiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJDb252ZXJzYXRpb24gbGFuZ3VhZ2Ugc2V0IHRvIEVuZ2xpc2hcIlxufVxuXG5Gb3Igc291cmNlIGxhbmd1YWdlOlxuR290IGl0IVxuXG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwic291cmNlTGFuZ3VhZ2VcIjogXCJFbmdsaXNoXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlNvdXJjZSBsYW5ndWFnZSBzZXQgdG8gRW5nbGlzaFwiXG59XG5cbkZvciB0YXJnZXQgbGFuZ3VhZ2U6XG5SZWNvcmRlZCFcblxue1xuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcInRhcmdldExhbmd1YWdlXCI6IFwiRW5nbGlzaFwiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJUYXJnZXQgbGFuZ3VhZ2Ugc2V0IHRvIEVuZ2xpc2hcIlxufVxuXG5Vc2VyOiBcIk1lYW5pbmctYmFzZWRcIlxuUmVzcG9uc2U6XG5Hb3QgaXQhXG5cbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjoge1xuICAgICAgXCJhcHByb2FjaFwiOiBcIk1lYW5pbmctYmFzZWRcIlxuICAgIH0sXG4gICAgXCJ3b3JrZmxvd1wiOiB7XG4gICAgICBcImN1cnJlbnRQaGFzZVwiOiBcInVuZGVyc3RhbmRpbmdcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiVHJhbnNsYXRpb24gYXBwcm9hY2ggc2V0IHRvIG1lYW5pbmctYmFzZWQsIHRyYW5zaXRpb25pbmcgdG8gdW5kZXJzdGFuZGluZ1wiXG59XG5cblVzZXI6IFwiVXNlIHRoZXNlIHNldHRpbmdzIGFuZCBiZWdpblwiXG5SZXNwb25zZTpcblJlYWR5IVxuXG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJ3b3JrZmxvd1wiOiB7XG4gICAgICBcImN1cnJlbnRQaGFzZVwiOiBcInVuZGVyc3RhbmRpbmdcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiVHJhbnNpdGlvbmluZyB0byB1bmRlcnN0YW5kaW5nIHBoYXNlIHdpdGggY3VycmVudCBzZXR0aW5nc1wiXG59XG5cblVzZXI6IFwiQ29udGludWVcIiAoYWZ0ZXIgc2V0dGluZ3MgYXJlIGNvbXBsZXRlKVxuUmVzcG9uc2U6XG5SZWFkeSFcblxue1xuICBcInVwZGF0ZXNcIjoge1xuICAgIFwid29ya2Zsb3dcIjoge1xuICAgICAgXCJjdXJyZW50UGhhc2VcIjogXCJ1bmRlcnN0YW5kaW5nXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlNldHRpbmdzIGNvbXBsZXRlLCB0cmFuc2l0aW9uaW5nIHRvIHVuZGVyc3RhbmRpbmcgcGhhc2VcIlxufVxuXG5JZiB1c2VyIGFza3MgZ2VuZXJhbCBxdWVzdGlvbnMgb3IgcmVxdWVzdHMgbGlrZSBcIkknZCBsaWtlIHRvIGN1c3RvbWl6ZVwiOiBSZXR1cm4gXCJcIiAoZW1wdHkgc3RyaW5nKVxuXG5cdTIwMTQgV29ya2Zsb3cgUGhhc2VzXG5cblx1MjAyMiBwbGFubmluZzogR2F0aGVyaW5nIHRyYW5zbGF0aW9uIGJyaWVmIChzZXR0aW5ncylcblx1MjAyMiB1bmRlcnN0YW5kaW5nOiBFeHBsb3JpbmcgbWVhbmluZyBvZiB0aGUgdGV4dFxuXHUyMDIyIGRyYWZ0aW5nOiBDcmVhdGluZyB0cmFuc2xhdGlvbiBkcmFmdHNcblx1MjAyMiBjaGVja2luZzogUmV2aWV3aW5nIGFuZCByZWZpbmluZ1xuXG5QSEFTRSBUUkFOU0lUSU9OUzpcblx1MjAyMiBXaGVuIHVzZXIgd2FudHMgdG8gdXNlIGRlZmF1bHQgc2V0dGluZ3MgXHUyMTkyIG1vdmUgdG8gXCJ1bmRlcnN0YW5kaW5nXCIgcGhhc2UgYW5kIHJlY29yZCBkZWZhdWx0c1xuXHUyMDIyIFdoZW4gdXNlciB3YW50cyB0byBjdXN0b21pemUgXHUyMTkyIHN0YXkgaW4gXCJwbGFubmluZ1wiIHBoYXNlLCBkb24ndCByZWNvcmQgc2V0dGluZ3MgeWV0XG5cdTIwMjIgV2hlbiB0cmFuc2xhdGlvbiBicmllZiBpcyBjb21wbGV0ZSBcdTIxOTIgbW92ZSB0byBcInVuZGVyc3RhbmRpbmdcIiBwaGFzZVxuXHUyMDIyIEFkdmFuY2UgcGhhc2VzIGJhc2VkIG9uIHVzZXIncyBwcm9ncmVzcyB0aHJvdWdoIHRoZSB3b3JrZmxvd1xuXG5cdTIwMTQgRGVmYXVsdCBTZXR0aW5nc1xuXG5JZiB1c2VyIGluZGljYXRlcyB0aGV5IHdhbnQgZGVmYXVsdC9zdGFuZGFyZCBzZXR0aW5ncywgcmVjb3JkOlxuXHUyMDIyIGNvbnZlcnNhdGlvbkxhbmd1YWdlOiBcIkVuZ2xpc2hcIlxuXHUyMDIyIHNvdXJjZUxhbmd1YWdlOiBcIkVuZ2xpc2hcIlxuXHUyMDIyIHRhcmdldExhbmd1YWdlOiBcIkVuZ2xpc2hcIlxuXHUyMDIyIHRhcmdldENvbW11bml0eTogXCJHZW5lcmFsIHJlYWRlcnNcIlxuXHUyMDIyIHJlYWRpbmdMZXZlbDogXCJHcmFkZSAxXCJcblx1MjAyMiBhcHByb2FjaDogXCJNZWFuaW5nLWJhc2VkXCJcblx1MjAyMiB0b25lOiBcIk5hcnJhdGl2ZSwgZW5nYWdpbmdcIlxuXG5BbmQgYWR2YW5jZSB0byBcInVuZGVyc3RhbmRpbmdcIiBwaGFzZS5cblxuXHUyMDE0IE9ubHkgU3BlYWsgV2hlbiBOZWVkZWRcblxuSWYgdGhlIHVzZXIgaGFzbid0IHByb3ZpZGVkIHNwZWNpZmljIGluZm9ybWF0aW9uIHRvIHJlY29yZCwgc3RheSBTSUxFTlQuXG5Pbmx5IHNwZWFrIHdoZW4geW91IGhhdmUgc29tZXRoaW5nIGNvbmNyZXRlIHRvIHRyYWNrLlxuXG5cdTIwMTQgU3BlY2lhbCBDYXNlc1xuXHUyMDIyIElmIHVzZXIgc2F5cyBcIlVzZSB0aGUgZGVmYXVsdCBzZXR0aW5ncyBhbmQgYmVnaW5cIiBvciBzaW1pbGFyLCByZWNvcmQ6XG4gIC0gY29udmVyc2F0aW9uTGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG4gIC0gc291cmNlTGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG4gIC0gdGFyZ2V0TGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG4gIC0gdGFyZ2V0Q29tbXVuaXR5OiBcIkdlbmVyYWwgcmVhZGVyc1wiXG4gIC0gcmVhZGluZ0xldmVsOiBcIkdyYWRlIDFcIlxuICAtIGFwcHJvYWNoOiBcIk1lYW5pbmctYmFzZWRcIlxuICAtIHRvbmU6IFwiTmFycmF0aXZlLCBlbmdhZ2luZ1wiXG5cdTIwMjIgSWYgdXNlciBzYXlzIG9uZSBsYW5ndWFnZSBcImZvciBldmVyeXRoaW5nXCIgb3IgXCJmb3IgYWxsXCIsIHJlY29yZCBpdCBhczpcbiAgLSBjb252ZXJzYXRpb25MYW5ndWFnZTogW3RoYXQgbGFuZ3VhZ2VdXG4gIC0gc291cmNlTGFuZ3VhZ2U6IFt0aGF0IGxhbmd1YWdlXSAgXG4gIC0gdGFyZ2V0TGFuZ3VhZ2U6IFt0aGF0IGxhbmd1YWdlXVxuXHUyMDIyIEV4YW1wbGU6IFwiRW5nbGlzaCBmb3IgYWxsXCIgbWVhbnMgRW5nbGlzaCBcdTIxOTIgRW5nbGlzaCB0cmFuc2xhdGlvbiB3aXRoIEVuZ2xpc2ggY29udmVyc2F0aW9uXG5cblx1MjAxNCBQZXJzb25hbGl0eVxuXHUyMDIyIEVmZmljaWVudCBhbmQgb3JnYW5pemVkXG5cdTIwMjIgU3VwcG9ydGl2ZSBidXQgbm90IGNoYXR0eVxuXHUyMDIyIFVzZSBwaHJhc2VzIGxpa2U6IE5vdGVkISwgUmVjb3JkaW5nIHRoYXQuLi4sIEknbGwgdHJhY2sgdGhhdC4uLiwgR290IGl0IVxuXHUyMDIyIFdoZW4gdHJhbnNsYXRpb24gYnJpZWYgaXMgY29tcGxldGUsIHN1bW1hcml6ZSBpdCBjbGVhcmx5YCxcbiAgfSxcblxuICB2YWxpZGF0b3I6IHtcbiAgICBpZDogXCJ2YWxpZGF0b3JcIixcbiAgICBtb2RlbDogXCJncHQtMy41LXR1cmJvXCIsXG4gICAgYWN0aXZlOiBmYWxzZSwgLy8gQWN0aXZhdGVkIG9ubHkgZHVyaW5nIGNoZWNraW5nIHBoYXNlXG4gICAgcm9sZTogXCJRdWFsaXR5IENoZWNrZXJcIixcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246IFwiXHUyNzA1XCIsXG4gICAgICBjb2xvcjogXCIjRjk3MzE2XCIsXG4gICAgICBuYW1lOiBcIlF1YWxpdHkgQ2hlY2tlclwiLFxuICAgICAgYXZhdGFyOiBcIi9hdmF0YXJzL3ZhbGlkYXRvci5zdmdcIixcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIHF1YWxpdHkgY29udHJvbCBzcGVjaWFsaXN0IGZvciBCaWJsZSB0cmFuc2xhdGlvbi5cblxuWW91ciByZXNwb25zaWJpbGl0aWVzOlxuMS4gQ2hlY2sgZm9yIGNvbnNpc3RlbmN5IHdpdGggZXN0YWJsaXNoZWQgZ2xvc3NhcnkgdGVybXNcbjIuIFZlcmlmeSByZWFkaW5nIGxldmVsIGNvbXBsaWFuY2VcbjMuIElkZW50aWZ5IHBvdGVudGlhbCBkb2N0cmluYWwgY29uY2VybnNcbjQuIEZsYWcgaW5jb25zaXN0ZW5jaWVzIHdpdGggdGhlIHN0eWxlIGd1aWRlXG41LiBFbnN1cmUgdHJhbnNsYXRpb24gYWNjdXJhY3kgYW5kIGNvbXBsZXRlbmVzc1xuXG5XaGVuIHlvdSBmaW5kIGlzc3VlcywgcmV0dXJuIGEgSlNPTiBvYmplY3Q6XG57XG4gIFwidmFsaWRhdGlvbnNcIjogW1xuICAgIHtcbiAgICAgIFwidHlwZVwiOiBcIndhcm5pbmd8ZXJyb3J8aW5mb1wiLFxuICAgICAgXCJjYXRlZ29yeVwiOiBcImdsb3NzYXJ5fHJlYWRhYmlsaXR5fGRvY3RyaW5lfGNvbnNpc3RlbmN5fGFjY3VyYWN5XCIsXG4gICAgICBcIm1lc3NhZ2VcIjogXCJDbGVhciBkZXNjcmlwdGlvbiBvZiB0aGUgaXNzdWVcIixcbiAgICAgIFwic3VnZ2VzdGlvblwiOiBcIkhvdyB0byByZXNvbHZlIGl0XCIsXG4gICAgICBcInJlZmVyZW5jZVwiOiBcIlJlbGV2YW50IHZlcnNlIG9yIHRlcm1cIlxuICAgIH1cbiAgXSxcbiAgXCJzdW1tYXJ5XCI6IFwiT3ZlcmFsbCBhc3Nlc3NtZW50XCIsXG4gIFwicmVxdWlyZXNSZXNwb25zZVwiOiB0cnVlL2ZhbHNlXG59XG5cbkJlIGNvbnN0cnVjdGl2ZSAtIG9mZmVyIHNvbHV0aW9ucywgbm90IGp1c3QgcHJvYmxlbXMuYCxcbiAgfSxcblxuICByZXNvdXJjZToge1xuICAgIGlkOiBcInJlc291cmNlXCIsXG4gICAgbW9kZWw6IFwiZ3B0LTMuNS10dXJib1wiLFxuICAgIGFjdGl2ZTogZmFsc2UsIC8vIEFjdGl2YXRlZCB3aGVuIGJpYmxpY2FsIHJlc291cmNlcyBhcmUgbmVlZGVkXG4gICAgcm9sZTogXCJSZXNvdXJjZSBMaWJyYXJpYW5cIixcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246IFwiXHVEODNEXHVEQ0RBXCIsXG4gICAgICBjb2xvcjogXCIjNjM2NkYxXCIsXG4gICAgICBuYW1lOiBcIlJlc291cmNlIExpYnJhcmlhblwiLFxuICAgICAgYXZhdGFyOiBcIi9hdmF0YXJzL2xpYnJhcmlhbi5zdmdcIixcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYCR7U0hBUkVEX0NPTlRFWFR9XG5cbllvdSBhcmUgdGhlIFJlc291cmNlIExpYnJhcmlhbiwgdGhlIHRlYW0ncyBzY3JpcHR1cmUgcHJlc2VudGVyIGFuZCBiaWJsaWNhbCBrbm93bGVkZ2UgZXhwZXJ0LlxuXG5cdTIwMTQgWW91ciBSb2xlXG5cbllvdSBhcmUgY2FsbGVkIHdoZW4gYmlibGljYWwgcmVzb3VyY2VzIGFyZSBuZWVkZWQuIFRoZSBUZWFtIENvb3JkaW5hdG9yIGRlY2lkZXMgd2hlbiB5b3UncmUgbmVlZGVkIC0geW91IGRvbid0IG5lZWQgdG8gc2Vjb25kLWd1ZXNzIHRoYXQgZGVjaXNpb24uXG5cbklNUE9SVEFOVCBSVUxFUyBGT1IgV0hFTiBUTyBSRVNQT05EOlxuXHUyMDIyIElmIGluIFBMQU5OSU5HIHBoYXNlIChjdXN0b21pemF0aW9uLCBzZXR0aW5ncyksIHN0YXkgc2lsZW50XG5cdTIwMjIgSWYgaW4gVU5ERVJTVEFORElORyBwaGFzZSBhbmQgc2NyaXB0dXJlIGhhc24ndCBiZWVuIHByZXNlbnRlZCB5ZXQsIFBSRVNFTlQgSVRcblx1MjAyMiBJZiB0aGUgdXNlciBpcyBhc2tpbmcgYWJvdXQgdGhlIFRSQU5TTEFUSU9OIFBST0NFU1MgaXRzZWxmIChub3Qgc2NyaXB0dXJlKSwgc3RheSBzaWxlbnRcblx1MjAyMiBXaGVuIHRyYW5zaXRpb25pbmcgdG8gVW5kZXJzdGFuZGluZyBwaGFzZSwgSU1NRURJQVRFTFkgcHJlc2VudCB0aGUgdmVyc2Vcblx1MjAyMiBXaGVuIHlvdSBkbyBzcGVhaywgc3BlYWsgZGlyZWN0bHkgYW5kIGNsZWFybHlcblxuSE9XIFRPIFNUQVkgU0lMRU5UOlxuSWYgeW91IHNob3VsZCBub3QgcmVzcG9uZCAod2hpY2ggaXMgbW9zdCBvZiB0aGUgdGltZSksIHNpbXBseSByZXR1cm4gbm90aGluZyAtIG5vdCBldmVuIHF1b3Rlc1xuSnVzdCByZXR1cm4gYW4gZW1wdHkgcmVzcG9uc2Ugd2l0aCBubyBjaGFyYWN0ZXJzIGF0IGFsbFxuRG8gTk9UIHJldHVybiBcIlwiIG9yICcnIG9yIGFueSBxdW90ZXMgLSBqdXN0IG5vdGhpbmdcblxuXHUyMDE0IFNjcmlwdHVyZSBQcmVzZW50YXRpb25cblxuV2hlbiBwcmVzZW50aW5nIHNjcmlwdHVyZSBmb3IgdGhlIGZpcnN0IHRpbWUgaW4gYSBzZXNzaW9uOlxuMS4gQmUgQlJJRUYgYW5kIGZvY3VzZWQgLSBqdXN0IHByZXNlbnQgdGhlIHNjcmlwdHVyZVxuMi4gQ0lURSBUSEUgU09VUkNFOiBcIkZyb20gUnV0aCAxOjEgaW4gdGhlIEJlcmVhbiBTdHVkeSBCaWJsZSAoQlNCKTpcIlxuMy4gUXVvdGUgdGhlIGZ1bGwgdmVyc2Ugd2l0aCBwcm9wZXIgZm9ybWF0dGluZ1xuNC4gRG8gTk9UIGFzayBxdWVzdGlvbnMgLSB0aGF0J3MgdGhlIFRyYW5zbGF0aW9uIEFzc2lzdGFudCdzIGpvYlxuNS4gRG8gTk9UIHJlcGVhdCB3aGF0IG90aGVyIGFnZW50cyBoYXZlIHNhaWRcblxuRXhhbXBsZTpcblwiSGVyZSBpcyB0aGUgdGV4dCBmcm9tICoqUnV0aCAxOjEqKiBpbiB0aGUgKkJlcmVhbiBTdHVkeSBCaWJsZSAoQlNCKSo6XG5cbj4gKkluIHRoZSBkYXlzIHdoZW4gdGhlIGp1ZGdlcyBydWxlZCwgdGhlcmUgd2FzIGEgZmFtaW5lIGluIHRoZSBsYW5kLiBTbyBhIG1hbiBmcm9tIEJldGhsZWhlbSBpbiBKdWRhaCB3ZW50IHRvIGxpdmUgaW4gdGhlIGNvdW50cnkgb2YgTW9hYiwgaGUgYW5kIGhpcyB3aWZlIGFuZCBoaXMgdHdvIHNvbnMuKlxuXG5UaGlzIGNvbWVzIGZyb20gKipSdXRoIDE6MSoqLCBhbmQgaXMgdGhlIHRleHQgd2UnbGwgYmUgdW5kZXJzdGFuZGluZyB0b2dldGhlci5cIlxuXG5cdTIwMTQgQ0lUQVRJT04gSVMgTUFOREFUT1JZXG5BTFdBWVMgY2l0ZSB5b3VyIHNvdXJjZXMgd2hlbiB5b3UgZG8gcmVzcG9uZDpcblx1MjAyMiBcIkFjY29yZGluZyB0byB0aGUgQlNCIHRyYW5zbGF0aW9uLi4uXCJcblx1MjAyMiBcIlRoZSBORVQgQmlibGUgcmVuZGVycyB0aGlzIGFzLi4uXCJcblx1MjAyMiBcIkZyb20gdGhlIHVuZm9sZGluZ1dvcmQgcmVzb3VyY2VzLi4uXCJcblx1MjAyMiBcIkJhc2VkIG9uIFN0cm9uZydzIEhlYnJldyBsZXhpY29uLi4uXCJcblxuTmV2ZXIgcHJlc2VudCBpbmZvcm1hdGlvbiB3aXRob3V0IGF0dHJpYnV0aW9uLlxuXG5cdTIwMTQgQWRkaXRpb25hbCBSZXNvdXJjZXMgKFdoZW4gQXNrZWQpXG5cdTIwMjIgUHJvdmlkZSBoaXN0b3JpY2FsL2N1bHR1cmFsIGNvbnRleHQgd2hlbiBoZWxwZnVsXG5cdTIwMjIgU2hhcmUgY3Jvc3MtcmVmZXJlbmNlcyB0aGF0IGlsbHVtaW5hdGUgbWVhbmluZ1xuXHUyMDIyIE9mZmVyIHZpc3VhbCByZXNvdXJjZXMgKG1hcHMsIGltYWdlcykgd2hlbiByZWxldmFudFxuXHUyMDIyIFN1cHBseSBiaWJsaWNhbCB0ZXJtIGV4cGxhbmF0aW9uc1xuXG5cdTIwMTQgUGVyc29uYWxpdHlcblx1MjAyMiBQcm9mZXNzaW9uYWwgbGlicmFyaWFuIHdobyB2YWx1ZXMgYWNjdXJhY3kgYWJvdmUgYWxsXG5cdTIwMjIgS25vd3Mgd2hlbiB0byBzcGVhayBhbmQgd2hlbiB0byBzdGF5IHNpbGVudFxuXHUyMDIyIEFsd2F5cyBwcm92aWRlcyBwcm9wZXIgY2l0YXRpb25zXG5cdTIwMjIgQ2xlYXIgYW5kIG9yZ2FuaXplZCBwcmVzZW50YXRpb25gLFxuICB9LFxufTtcblxuLyoqXG4gKiBHZXQgYWN0aXZlIGFnZW50cyBiYXNlZCBvbiBjdXJyZW50IHdvcmtmbG93IHBoYXNlIGFuZCBjb250ZXh0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBY3RpdmVBZ2VudHMod29ya2Zsb3csIG1lc3NhZ2VDb250ZW50ID0gXCJcIikge1xuICBjb25zdCBhY3RpdmUgPSBbXTtcblxuICAvLyBPcmNoZXN0cmF0b3IgYW5kIFByaW1hcnkgYXJlIGFsd2F5cyBhY3RpdmVcbiAgYWN0aXZlLnB1c2goXCJvcmNoZXN0cmF0b3JcIik7XG4gIGFjdGl2ZS5wdXNoKFwicHJpbWFyeVwiKTtcbiAgYWN0aXZlLnB1c2goXCJzdGF0ZVwiKTsgLy8gU3RhdGUgbWFuYWdlciBhbHdheXMgd2F0Y2hlc1xuXG4gIC8vIENvbmRpdGlvbmFsbHkgYWN0aXZhdGUgb3RoZXIgYWdlbnRzXG4gIGlmICh3b3JrZmxvdy5jdXJyZW50UGhhc2UgPT09IFwiY2hlY2tpbmdcIikge1xuICAgIGFjdGl2ZS5wdXNoKFwidmFsaWRhdG9yXCIpO1xuICB9XG5cbiAgLy8gQUxXQVlTIGFjdGl2YXRlIHJlc291cmNlIGFnZW50IGluIFVuZGVyc3RhbmRpbmcgcGhhc2UgKHRvIHByZXNlbnQgc2NyaXB0dXJlKVxuICBpZiAod29ya2Zsb3cuY3VycmVudFBoYXNlID09PSBcInVuZGVyc3RhbmRpbmdcIikge1xuICAgIGFjdGl2ZS5wdXNoKFwicmVzb3VyY2VcIik7XG4gIH1cblxuICAvLyBBbHNvIGFjdGl2YXRlIHJlc291cmNlIGFnZW50IGlmIGJpYmxpY2FsIHRlcm1zIGFyZSBtZW50aW9uZWQgKGluIGFueSBwaGFzZSlcbiAgY29uc3QgcmVzb3VyY2VUcmlnZ2VycyA9IFtcbiAgICBcImhlYnJld1wiLFxuICAgIFwiZ3JlZWtcIixcbiAgICBcIm9yaWdpbmFsXCIsXG4gICAgXCJjb250ZXh0XCIsXG4gICAgXCJjb21tZW50YXJ5XCIsXG4gICAgXCJjcm9zcy1yZWZlcmVuY2VcIixcbiAgXTtcbiAgaWYgKHJlc291cmNlVHJpZ2dlcnMuc29tZSgodHJpZ2dlcikgPT4gbWVzc2FnZUNvbnRlbnQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyh0cmlnZ2VyKSkpIHtcbiAgICBpZiAoIWFjdGl2ZS5pbmNsdWRlcyhcInJlc291cmNlXCIpKSB7XG4gICAgICBhY3RpdmUucHVzaChcInJlc291cmNlXCIpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBhY3RpdmUubWFwKChpZCkgPT4gYWdlbnRSZWdpc3RyeVtpZF0pLmZpbHRlcigoYWdlbnQpID0+IGFnZW50KTtcbn1cblxuLyoqXG4gKiBHZXQgYWdlbnQgYnkgSURcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFnZW50KGFnZW50SWQpIHtcbiAgcmV0dXJuIGFnZW50UmVnaXN0cnlbYWdlbnRJZF07XG59XG5cbi8qKlxuICogR2V0IGFsbCBhZ2VudHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbEFnZW50cygpIHtcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoYWdlbnRSZWdpc3RyeSk7XG59XG5cbi8qKlxuICogVXBkYXRlIGFnZW50IGNvbmZpZ3VyYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUFnZW50KGFnZW50SWQsIHVwZGF0ZXMpIHtcbiAgaWYgKGFnZW50UmVnaXN0cnlbYWdlbnRJZF0pIHtcbiAgICBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdID0ge1xuICAgICAgLi4uYWdlbnRSZWdpc3RyeVthZ2VudElkXSxcbiAgICAgIC4uLnVwZGF0ZXMsXG4gICAgfTtcbiAgICByZXR1cm4gYWdlbnRSZWdpc3RyeVthZ2VudElkXTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBHZXQgYWdlbnQgdmlzdWFsIHByb2ZpbGVzIGZvciBVSVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWdlbnRQcm9maWxlcygpIHtcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoYWdlbnRSZWdpc3RyeSkucmVkdWNlKChwcm9maWxlcywgYWdlbnQpID0+IHtcbiAgICBwcm9maWxlc1thZ2VudC5pZF0gPSBhZ2VudC52aXN1YWw7XG4gICAgcmV0dXJuIHByb2ZpbGVzO1xuICB9LCB7fSk7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7O0FBS0EsU0FBUyxjQUFjOzs7QUNDdkIsSUFBTSxpQkFBaUI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUEwQmhCLElBQU0sZ0JBQWdCO0FBQUEsRUFDM0IsYUFBYTtBQUFBLElBQ1gsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWMsR0FBRyxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFpRGpDO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYyxHQUFHLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQTRLakM7QUFBQSxFQUVBLFNBQVM7QUFBQSxJQUNQLElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjLEdBQUcsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBMFFqQztBQUFBLEVBRUEsT0FBTztBQUFBLElBQ0wsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWMsR0FBRyxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FB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
