
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY29udmVyc2F0aW9uLmpzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL2FnZW50cy9yZWdpc3RyeS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNdWx0aS1BZ2VudCBDb252ZXJzYXRpb24gSGFuZGxlclxuICogT3JjaGVzdHJhdGVzIG11bHRpcGxlIEFJIGFnZW50cyB0byBoYW5kbGUgQmlibGUgdHJhbnNsYXRpb24gY29udmVyc2F0aW9uc1xuICovXG5cbmltcG9ydCB7IE9wZW5BSSB9IGZyb20gXCJvcGVuYWlcIjtcbmltcG9ydCB7IGdldEFnZW50IH0gZnJvbSBcIi4vYWdlbnRzL3JlZ2lzdHJ5LmpzXCI7XG5cbi8vIE9wZW5BSSBjbGllbnQgd2lsbCBiZSBpbml0aWFsaXplZCBwZXIgcmVxdWVzdCB3aXRoIGNvbnRleHRcblxuLyoqXG4gKiBDYWxsIGFuIGluZGl2aWR1YWwgYWdlbnQgd2l0aCBjb250ZXh0XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNhbGxBZ2VudChhZ2VudCwgbWVzc2FnZSwgY29udGV4dCwgb3BlbmFpQ2xpZW50KSB7XG4gIGNvbnNvbGUubG9nKGBDYWxsaW5nIGFnZW50OiAke2FnZW50LmlkfWApO1xuICB0cnkge1xuICAgIGNvbnN0IG1lc3NhZ2VzID0gW1xuICAgICAge1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiBhZ2VudC5zeXN0ZW1Qcm9tcHQsXG4gICAgICB9LFxuICAgIF07XG5cbiAgICAvLyBBZGQgY29udmVyc2F0aW9uIGhpc3RvcnkgYXMgbmF0dXJhbCBtZXNzYWdlcyAoZm9yIHByaW1hcnkgYWdlbnQgb25seSlcbiAgICBpZiAoYWdlbnQuaWQgPT09IFwicHJpbWFyeVwiICYmIGNvbnRleHQuY29udmVyc2F0aW9uSGlzdG9yeSkge1xuICAgICAgY29udGV4dC5jb252ZXJzYXRpb25IaXN0b3J5LmZvckVhY2goKG1zZykgPT4ge1xuICAgICAgICAvLyBTa2lwIENhbnZhcyBTY3JpYmUgYWNrbm93bGVkZ21lbnRzXG4gICAgICAgIGlmIChtc2cuYWdlbnQ/LmlkID09PSBcInN0YXRlXCIpIHJldHVybjtcblxuICAgICAgICAvLyBTa2lwIGlubGluZSBzdWdnZXN0aW9uIG1lc3NhZ2VzICh0aGV5J3JlIHN5c3RlbSBVSSBlbGVtZW50cywgbm90IGNvbnZlcnNhdGlvbilcbiAgICAgICAgaWYgKG1zZy50eXBlID09PSBcInN1Z2dlc3Rpb25zXCIgJiYgbXNnLnJvbGUgPT09IFwic3lzdGVtXCIpIHJldHVybjtcblxuICAgICAgICAvLyBTa2lwIG1lc3NhZ2VzIHdpdGggYXJyYXkgY29udGVudCAod291bGQgY2F1c2UgT3BlbkFJIGVycm9ycylcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobXNnLmNvbnRlbnQpKSByZXR1cm47XG5cbiAgICAgICAgLy8gUGFyc2UgYXNzaXN0YW50IG1lc3NhZ2VzIGlmIHRoZXkncmUgSlNPTlxuICAgICAgICBsZXQgY29udGVudCA9IG1zZy5jb250ZW50O1xuICAgICAgICBpZiAobXNnLnJvbGUgPT09IFwiYXNzaXN0YW50XCIgJiYgbXNnLmFnZW50Py5pZCA9PT0gXCJwcmltYXJ5XCIpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShjb250ZW50KTtcbiAgICAgICAgICAgIGNvbnRlbnQgPSBwYXJzZWQubWVzc2FnZSB8fCBjb250ZW50O1xuICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgLy8gTm90IEpTT04sIHVzZSBhcy1pc1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICAgIHJvbGU6IG1zZy5yb2xlLFxuICAgICAgICAgIGNvbnRlbnQ6IGNvbnRlbnQsXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQWRkIHRoZSBjdXJyZW50IHVzZXIgbWVzc2FnZVxuICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICBjb250ZW50OiBtZXNzYWdlLFxuICAgIH0pO1xuXG4gICAgLy8gUHJvdmlkZSBjYW52YXMgc3RhdGUgY29udGV4dCB0byBhbGwgYWdlbnRzXG4gICAgaWYgKGNvbnRleHQuY2FudmFzU3RhdGUpIHtcbiAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiBgQ3VycmVudCBjYW52YXMgc3RhdGU6ICR7SlNPTi5zdHJpbmdpZnkoY29udGV4dC5jYW52YXNTdGF0ZSl9YCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEZvciBub24tcHJpbWFyeSBhZ2VudHMsIHByb3ZpZGUgY29udGV4dCBkaWZmZXJlbnRseVxuICAgIGlmIChhZ2VudC5pZCAhPT0gXCJwcmltYXJ5XCIpIHtcbiAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiBgQ29udGV4dDogJHtKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgY2FudmFzU3RhdGU6IGNvbnRleHQuY2FudmFzU3RhdGUsXG4gICAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiBjb250ZXh0LnByaW1hcnlSZXNwb25zZSxcbiAgICAgICAgICBvcmNoZXN0cmF0aW9uOiBjb250ZXh0Lm9yY2hlc3RyYXRpb24sXG4gICAgICAgIH0pfWAsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdGltZW91dCB3cmFwcGVyIGZvciBBUEkgY2FsbFxuICAgIGNvbnN0IHRpbWVvdXRQcm9taXNlID0gbmV3IFByb21pc2UoKF8sIHJlamVjdCkgPT4ge1xuICAgICAgc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKGBUaW1lb3V0IGNhbGxpbmcgJHthZ2VudC5pZH1gKSksIDEwMDAwKTsgLy8gMTAgc2Vjb25kIHRpbWVvdXRcbiAgICB9KTtcblxuICAgIGNvbnN0IGNvbXBsZXRpb25Qcm9taXNlID0gb3BlbmFpQ2xpZW50LmNoYXQuY29tcGxldGlvbnMuY3JlYXRlKHtcbiAgICAgIG1vZGVsOiBhZ2VudC5tb2RlbCxcbiAgICAgIG1lc3NhZ2VzOiBtZXNzYWdlcyxcbiAgICAgIHRlbXBlcmF0dXJlOiBhZ2VudC5pZCA9PT0gXCJzdGF0ZVwiID8gMC4xIDogMC43LCAvLyBMb3dlciB0ZW1wIGZvciBzdGF0ZSBleHRyYWN0aW9uXG4gICAgICBtYXhfdG9rZW5zOiBhZ2VudC5pZCA9PT0gXCJzdGF0ZVwiID8gNTAwIDogMjAwMCxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNvbXBsZXRpb24gPSBhd2FpdCBQcm9taXNlLnJhY2UoW2NvbXBsZXRpb25Qcm9taXNlLCB0aW1lb3V0UHJvbWlzZV0pO1xuICAgIGNvbnNvbGUubG9nKGBBZ2VudCAke2FnZW50LmlkfSByZXNwb25kZWQgc3VjY2Vzc2Z1bGx5YCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgYWdlbnRJZDogYWdlbnQuaWQsXG4gICAgICBhZ2VudDogYWdlbnQudmlzdWFsLFxuICAgICAgcmVzcG9uc2U6IGNvbXBsZXRpb24uY2hvaWNlc1swXS5tZXNzYWdlLmNvbnRlbnQsXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGNhbGxpbmcgYWdlbnQgJHthZ2VudC5pZH06YCwgZXJyb3IubWVzc2FnZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFnZW50SWQ6IGFnZW50LmlkLFxuICAgICAgYWdlbnQ6IGFnZW50LnZpc3VhbCxcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlIHx8IFwiVW5rbm93biBlcnJvclwiLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBHZXQgY3VycmVudCBjYW52YXMgc3RhdGUgZnJvbSBzdGF0ZSBtYW5hZ2VtZW50IGZ1bmN0aW9uXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldENhbnZhc1N0YXRlKHNlc3Npb25JZCA9IFwiZGVmYXVsdFwiKSB7XG4gIHRyeSB7XG4gICAgLy8gSW4gTmV0bGlmeSBGdW5jdGlvbnMsIHdlIG5lZWQgZnVsbCBsb2NhbGhvc3QgVVJMIGZvciBpbnRlcm5hbCBjYWxsc1xuICAgIGNvbnN0IGJhc2VVcmwgPSBcImh0dHA6Ly9sb2NhbGhvc3Q6ODg4OFwiO1xuICAgIGNvbnN0IHN0YXRlVXJsID0gYCR7YmFzZVVybH0vLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZWA7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHN0YXRlVXJsLCB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiWC1TZXNzaW9uLUlEXCI6IHNlc3Npb25JZCxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgaWYgKHJlc3BvbnNlLm9rKSB7XG4gICAgICByZXR1cm4gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgZmV0Y2hpbmcgY2FudmFzIHN0YXRlOlwiLCBlcnJvcik7XG4gIH1cblxuICAvLyBSZXR1cm4gZGVmYXVsdCBzdGF0ZSBpZiBmZXRjaCBmYWlsc1xuICByZXR1cm4ge1xuICAgIHN0eWxlR3VpZGU6IHt9LFxuICAgIGdsb3NzYXJ5OiB7IHRlcm1zOiB7fSB9LFxuICAgIHNjcmlwdHVyZUNhbnZhczogeyB2ZXJzZXM6IHt9IH0sXG4gICAgd29ya2Zsb3c6IHsgY3VycmVudFBoYXNlOiBcInBsYW5uaW5nXCIgfSxcbiAgfTtcbn1cblxuLyoqXG4gKiBVcGRhdGUgY2FudmFzIHN0YXRlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUNhbnZhc1N0YXRlKHVwZGF0ZXMsIGFnZW50SWQgPSBcInN5c3RlbVwiLCBzZXNzaW9uSWQgPSBcImRlZmF1bHRcIikge1xuICB0cnkge1xuICAgIC8vIEluIE5ldGxpZnkgRnVuY3Rpb25zLCB3ZSBuZWVkIGZ1bGwgbG9jYWxob3N0IFVSTCBmb3IgaW50ZXJuYWwgY2FsbHNcbiAgICBjb25zdCBiYXNlVXJsID0gXCJodHRwOi8vbG9jYWxob3N0Ojg4ODhcIjtcbiAgICBjb25zdCBzdGF0ZVVybCA9IGAke2Jhc2VVcmx9Ly5uZXRsaWZ5L2Z1bmN0aW9ucy9jYW52YXMtc3RhdGUvdXBkYXRlYDtcblxuICAgIGNvbnNvbGUubG9nKFwiXHVEODNEXHVERDM1IHVwZGF0ZUNhbnZhc1N0YXRlIGNhbGxlZCB3aXRoOlwiLCBKU09OLnN0cmluZ2lmeSh1cGRhdGVzLCBudWxsLCAyKSk7XG4gICAgY29uc29sZS5sb2coXCJcdUQ4M0RcdUREMzUgU2Vzc2lvbiBJRDpcIiwgc2Vzc2lvbklkKTtcbiAgICBjb25zb2xlLmxvZyhcIlx1RDgzRFx1REQzNSBTZW5kaW5nIHRvOlwiLCBzdGF0ZVVybCk7XG5cbiAgICBjb25zdCBwYXlsb2FkID0geyB1cGRhdGVzLCBhZ2VudElkIH07XG4gICAgY29uc29sZS5sb2coXCJcdUQ4M0RcdUREMzUgUGF5bG9hZDpcIiwgSlNPTi5zdHJpbmdpZnkocGF5bG9hZCwgbnVsbCwgMikpO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChzdGF0ZVVybCwge1xuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIFwiWC1TZXNzaW9uLUlEXCI6IHNlc3Npb25JZCwgLy8gQUREIFNFU1NJT04gSEVBREVSIVxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpLFxuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2coXCJcdUQ4M0RcdUREMzUgVXBkYXRlIHJlc3BvbnNlIHN0YXR1czpcIiwgcmVzcG9uc2Uuc3RhdHVzKTtcblxuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgY29uc29sZS5sb2coXCJcdUQ4M0RcdUREMzUgVXBkYXRlIHJlc3VsdDpcIiwgSlNPTi5zdHJpbmdpZnkocmVzdWx0LCBudWxsLCAyKSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiXHVEODNEXHVERDM0IFVwZGF0ZSBmYWlsZWQgd2l0aCBzdGF0dXM6XCIsIHJlc3BvbnNlLnN0YXR1cyk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJcdUQ4M0RcdUREMzQgRXJyb3IgdXBkYXRpbmcgY2FudmFzIHN0YXRlOlwiLCBlcnJvcik7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogUHJvY2VzcyBjb252ZXJzYXRpb24gd2l0aCBtdWx0aXBsZSBhZ2VudHNcbiAqL1xuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0NvbnZlcnNhdGlvbih1c2VyTWVzc2FnZSwgY29udmVyc2F0aW9uSGlzdG9yeSwgc2Vzc2lvbklkLCBvcGVuYWlDbGllbnQpIHtcbiAgY29uc29sZS5sb2coXCJTdGFydGluZyBwcm9jZXNzQ29udmVyc2F0aW9uIHdpdGggbWVzc2FnZTpcIiwgdXNlck1lc3NhZ2UpO1xuICBjb25zb2xlLmxvZyhcIlVzaW5nIHNlc3Npb24gSUQ6XCIsIHNlc3Npb25JZCk7XG4gIGNvbnN0IHJlc3BvbnNlcyA9IHt9O1xuICBjb25zdCBjYW52YXNTdGF0ZSA9IGF3YWl0IGdldENhbnZhc1N0YXRlKHNlc3Npb25JZCk7XG4gIGNvbnNvbGUubG9nKFwiR290IGNhbnZhcyBzdGF0ZVwiKTtcblxuICAvLyBCdWlsZCBjb250ZXh0IGZvciBhZ2VudHNcbiAgY29uc3QgY29udGV4dCA9IHtcbiAgICBjYW52YXNTdGF0ZSxcbiAgICBjb252ZXJzYXRpb25IaXN0b3J5OiBjb252ZXJzYXRpb25IaXN0b3J5LnNsaWNlKC0xMCksIC8vIExhc3QgMTAgbWVzc2FnZXNcbiAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgfTtcblxuICAvLyBGaXJzdCwgYXNrIHRoZSBvcmNoZXN0cmF0b3Igd2hpY2ggYWdlbnRzIHNob3VsZCByZXNwb25kXG4gIGNvbnN0IG9yY2hlc3RyYXRvciA9IGdldEFnZW50KFwib3JjaGVzdHJhdG9yXCIpO1xuICBjb25zb2xlLmxvZyhcIkFza2luZyBvcmNoZXN0cmF0b3Igd2hpY2ggYWdlbnRzIHRvIGFjdGl2YXRlLi4uXCIpO1xuICBjb25zdCBvcmNoZXN0cmF0b3JSZXNwb25zZSA9IGF3YWl0IGNhbGxBZ2VudChvcmNoZXN0cmF0b3IsIHVzZXJNZXNzYWdlLCBjb250ZXh0LCBvcGVuYWlDbGllbnQpO1xuXG4gIGxldCBvcmNoZXN0cmF0aW9uO1xuICB0cnkge1xuICAgIG9yY2hlc3RyYXRpb24gPSBKU09OLnBhcnNlKG9yY2hlc3RyYXRvclJlc3BvbnNlLnJlc3BvbnNlKTtcbiAgICBjb25zb2xlLmxvZyhcIk9yY2hlc3RyYXRvciBkZWNpZGVkOlwiLCBvcmNoZXN0cmF0aW9uKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBJZiBvcmNoZXN0cmF0b3IgZmFpbHMsIGZhbGwgYmFjayB0byBzZW5zaWJsZSBkZWZhdWx0c1xuICAgIGNvbnNvbGUuZXJyb3IoXCJPcmNoZXN0cmF0b3IgcmVzcG9uc2Ugd2FzIG5vdCB2YWxpZCBKU09OLCB1c2luZyBkZWZhdWx0czpcIiwgZXJyb3IubWVzc2FnZSk7XG4gICAgb3JjaGVzdHJhdGlvbiA9IHtcbiAgICAgIGFnZW50czogW1wicHJpbWFyeVwiLCBcInN0YXRlXCJdLFxuICAgICAgbm90ZXM6IFwiRmFsbGJhY2sgdG8gcHJpbWFyeSBhbmQgc3RhdGUgYWdlbnRzXCIsXG4gICAgfTtcbiAgfVxuXG4gIC8vIE9ubHkgY2FsbCB0aGUgYWdlbnRzIHRoZSBvcmNoZXN0cmF0b3Igc2F5cyB3ZSBuZWVkXG4gIGNvbnN0IGFnZW50c1RvQ2FsbCA9IG9yY2hlc3RyYXRpb24uYWdlbnRzIHx8IFtcInByaW1hcnlcIiwgXCJzdGF0ZVwiXTtcblxuICAvLyBBTFdBWVMgY2FsbCBTdWdnZXN0aW9uIEhlbHBlciAoaW4gcGFyYWxsZWwpXG4gIGNvbnN0IHN1Z2dlc3Rpb25BZ2VudCA9IGdldEFnZW50KFwic3VnZ2VzdGlvbnNcIik7XG4gIGlmIChzdWdnZXN0aW9uQWdlbnQpIHtcbiAgICBjb25zb2xlLmxvZyhcIkNhbGxpbmcgU3VnZ2VzdGlvbiBIZWxwZXIuLi5cIik7XG4gICAgcmVzcG9uc2VzLnN1Z2dlc3Rpb25zID0gYXdhaXQgY2FsbEFnZW50KFxuICAgICAgc3VnZ2VzdGlvbkFnZW50LFxuICAgICAgdXNlck1lc3NhZ2UsXG4gICAgICB7XG4gICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgIG9yY2hlc3RyYXRpb24sXG4gICAgICB9LFxuICAgICAgb3BlbmFpQ2xpZW50XG4gICAgKTtcbiAgfVxuXG4gIC8vIENhbGwgUmVzb3VyY2UgTGlicmFyaWFuIGlmIG9yY2hlc3RyYXRvciBzYXlzIHNvXG4gIGlmIChhZ2VudHNUb0NhbGwuaW5jbHVkZXMoXCJyZXNvdXJjZVwiKSkge1xuICAgIGNvbnN0IHJlc291cmNlID0gZ2V0QWdlbnQoXCJyZXNvdXJjZVwiKTtcbiAgICBjb25zb2xlLmxvZyhcIkNhbGxpbmcgcmVzb3VyY2UgbGlicmFyaWFuLi4uXCIpO1xuICAgIHJlc3BvbnNlcy5yZXNvdXJjZSA9IGF3YWl0IGNhbGxBZ2VudChcbiAgICAgIHJlc291cmNlLFxuICAgICAgdXNlck1lc3NhZ2UsXG4gICAgICB7XG4gICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgIG9yY2hlc3RyYXRpb24sXG4gICAgICB9LFxuICAgICAgb3BlbmFpQ2xpZW50XG4gICAgKTtcbiAgICBjb25zb2xlLmxvZyhcIlJlc291cmNlIGxpYnJhcmlhbiByZXNwb25kZWRcIik7XG4gIH1cblxuICAvLyBDYWxsIHByaW1hcnkgdHJhbnNsYXRvciBpZiBvcmNoZXN0cmF0b3Igc2F5cyBzb1xuICBpZiAoYWdlbnRzVG9DYWxsLmluY2x1ZGVzKFwicHJpbWFyeVwiKSkge1xuICAgIGNvbnNvbGUubG9nKFwiPT09PT09PT09PSBQUklNQVJZIEFHRU5UIENBTExFRCA9PT09PT09PT09XCIpO1xuICAgIGNvbnN0IHByaW1hcnkgPSBnZXRBZ2VudChcInByaW1hcnlcIik7XG4gICAgY29uc29sZS5sb2coXCJDYWxsaW5nIHByaW1hcnkgdHJhbnNsYXRvci4uLlwiKTtcblxuICAgIHJlc3BvbnNlcy5wcmltYXJ5ID0gYXdhaXQgY2FsbEFnZW50KFxuICAgICAgcHJpbWFyeSxcbiAgICAgIHVzZXJNZXNzYWdlLFxuICAgICAge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBvcmNoZXN0cmF0aW9uLFxuICAgICAgfSxcbiAgICAgIG9wZW5haUNsaWVudFxuICAgICk7XG4gIH1cblxuICAvLyBDYWxsIHN0YXRlIG1hbmFnZXIgaWYgb3JjaGVzdHJhdG9yIHNheXMgc29cbiAgaWYgKGFnZW50c1RvQ2FsbC5pbmNsdWRlcyhcInN0YXRlXCIpICYmICFyZXNwb25zZXMucHJpbWFyeT8uZXJyb3IpIHtcbiAgICBjb25zdCBzdGF0ZU1hbmFnZXIgPSBnZXRBZ2VudChcInN0YXRlXCIpO1xuICAgIGNvbnNvbGUubG9nKFwiQ2FsbGluZyBzdGF0ZSBtYW5hZ2VyLi4uXCIpO1xuICAgIGNvbnNvbGUubG9nKFwiU3RhdGUgbWFuYWdlciBhZ2VudCBpbmZvOlwiLCBzdGF0ZU1hbmFnZXI/LnZpc3VhbCk7XG5cbiAgICAvLyBQYXNzIHRoZSBsYXN0IHF1ZXN0aW9uIGFza2VkIGJ5IHRoZSBUcmFuc2xhdGlvbiBBc3Npc3RhbnRcbiAgICBsZXQgbGFzdEFzc2lzdGFudFF1ZXN0aW9uID0gbnVsbDtcbiAgICBmb3IgKGxldCBpID0gY29udGV4dC5jb252ZXJzYXRpb25IaXN0b3J5Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICBjb25zdCBtc2cgPSBjb250ZXh0LmNvbnZlcnNhdGlvbkhpc3RvcnlbaV07XG4gICAgICBpZiAobXNnLnJvbGUgPT09IFwiYXNzaXN0YW50XCIgJiYgbXNnLmFnZW50Py5pZCA9PT0gXCJwcmltYXJ5XCIpIHtcbiAgICAgICAgLy8gUGFyc2UgdGhlIG1lc3NhZ2UgaWYgaXQncyBKU09OXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShtc2cuY29udGVudCk7XG4gICAgICAgICAgbGFzdEFzc2lzdGFudFF1ZXN0aW9uID0gcGFyc2VkLm1lc3NhZ2UgfHwgbXNnLmNvbnRlbnQ7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIGxhc3RBc3Npc3RhbnRRdWVzdGlvbiA9IG1zZy5jb250ZW50O1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHN0YXRlUmVzdWx0ID0gYXdhaXQgY2FsbEFnZW50KFxuICAgICAgc3RhdGVNYW5hZ2VyLFxuICAgICAgdXNlck1lc3NhZ2UsXG4gICAgICB7XG4gICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgIHByaW1hcnlSZXNwb25zZTogcmVzcG9uc2VzLnByaW1hcnk/LnJlc3BvbnNlLFxuICAgICAgICByZXNvdXJjZVJlc3BvbnNlOiByZXNwb25zZXMucmVzb3VyY2U/LnJlc3BvbnNlLFxuICAgICAgICBsYXN0QXNzaXN0YW50UXVlc3Rpb24sXG4gICAgICAgIG9yY2hlc3RyYXRpb24sXG4gICAgICB9LFxuICAgICAgb3BlbmFpQ2xpZW50XG4gICAgKTtcblxuICAgIGNvbnNvbGUubG9nKFwiU3RhdGUgcmVzdWx0IGFnZW50IGluZm86XCIsIHN0YXRlUmVzdWx0Py5hZ2VudCk7XG4gICAgY29uc29sZS5sb2coXCJTdGF0ZSByZXNwb25zZTpcIiwgc3RhdGVSZXN1bHQ/LnJlc3BvbnNlKTtcblxuICAgIC8vIENhbnZhcyBTY3JpYmUgc2hvdWxkIHJldHVybiBKU09OIHdpdGg6XG4gICAgLy8geyBcIm1lc3NhZ2VcIjogXCJOb3RlZCFcIiwgXCJ1cGRhdGVzXCI6IHsuLi59LCBcInN1bW1hcnlcIjogXCIuLi5cIiB9XG4gICAgLy8gT3IgZW1wdHkgc3RyaW5nIHRvIHN0YXkgc2lsZW50XG5cbiAgICBjb25zdCByZXNwb25zZVRleHQgPSBzdGF0ZVJlc3VsdC5yZXNwb25zZS50cmltKCk7XG5cbiAgICAvLyBJZiBlbXB0eSByZXNwb25zZSwgc2NyaWJlIHN0YXlzIHNpbGVudFxuICAgIGlmICghcmVzcG9uc2VUZXh0IHx8IHJlc3BvbnNlVGV4dCA9PT0gXCJcIikge1xuICAgICAgY29uc29sZS5sb2coXCJDYW52YXMgU2NyaWJlIHN0YXlpbmcgc2lsZW50XCIpO1xuICAgICAgLy8gRG9uJ3QgYWRkIHRvIHJlc3BvbnNlc1xuICAgIH1cbiAgICAvLyBQYXJzZSBKU09OIHJlc3BvbnNlIGZyb20gQ2FudmFzIFNjcmliZVxuICAgIGVsc2Uge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gQ2FudmFzIFNjcmliZSByZXR1cm5zOiBcIk5vdGVkIVxcbntKU09OfVwiIC0gZXh0cmFjdCB0aGUgSlNPTiBwYXJ0XG4gICAgICAgIGNvbnN0IGpzb25NYXRjaCA9IHJlc3BvbnNlVGV4dC5tYXRjaCgvXFx7W1xcc1xcU10qXFx9Lyk7XG4gICAgICAgIGlmIChqc29uTWF0Y2gpIHtcbiAgICAgICAgICBjb25zdCBzdGF0ZVVwZGF0ZXMgPSBKU09OLnBhcnNlKGpzb25NYXRjaFswXSk7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJDYW52YXMgU2NyaWJlIHJldHVybmVkOlwiLCBzdGF0ZVVwZGF0ZXMpO1xuXG4gICAgICAgICAgLy8gQXBwbHkgc3RhdGUgdXBkYXRlcyBpZiBwcmVzZW50XG4gICAgICAgICAgaWYgKHN0YXRlVXBkYXRlcy51cGRhdGVzICYmIE9iamVjdC5rZXlzKHN0YXRlVXBkYXRlcy51cGRhdGVzKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkFwcGx5aW5nIHN0YXRlIHVwZGF0ZXM6XCIsIHN0YXRlVXBkYXRlcy51cGRhdGVzKTtcbiAgICAgICAgICAgIGF3YWl0IHVwZGF0ZUNhbnZhc1N0YXRlKHN0YXRlVXBkYXRlcy51cGRhdGVzLCBcInN0YXRlXCIsIHNlc3Npb25JZCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlx1MjcwNSBTdGF0ZSB1cGRhdGUgY29tcGxldGVkXCIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFNob3cgdGhlIG1lc3NhZ2UgZnJvbSBKU09OIG9yIGV4dHJhY3QgZnJvbSBiZWdpbm5pbmcgb2YgcmVzcG9uc2VcbiAgICAgICAgICBjb25zdCBhY2tub3dsZWRnbWVudCA9XG4gICAgICAgICAgICBzdGF0ZVVwZGF0ZXMubWVzc2FnZSB8fFxuICAgICAgICAgICAgcmVzcG9uc2VUZXh0LnN1YnN0cmluZygwLCByZXNwb25zZVRleHQuaW5kZXhPZihqc29uTWF0Y2hbMF0pKS50cmltKCk7XG4gICAgICAgICAgaWYgKGFja25vd2xlZGdtZW50KSB7XG4gICAgICAgICAgICByZXNwb25zZXMuc3RhdGUgPSB7XG4gICAgICAgICAgICAgIC4uLnN0YXRlUmVzdWx0LFxuICAgICAgICAgICAgICByZXNwb25zZTogYWNrbm93bGVkZ21lbnQsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBObyBKU09OIGZvdW5kLCBqdXN0IHNob3cgdGhlIHJlc3BvbnNlIGFzLWlzXG4gICAgICAgICAgY29uc29sZS5sb2coXCJDYW52YXMgU2NyaWJlIHNpbXBsZSBhY2tub3dsZWRnbWVudDpcIiwgcmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICByZXNwb25zZXMuc3RhdGUgPSB7XG4gICAgICAgICAgICAuLi5zdGF0ZVJlc3VsdCxcbiAgICAgICAgICAgIHJlc3BvbnNlOiByZXNwb25zZVRleHQsXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgcGFyc2luZyBDYW52YXMgU2NyaWJlIEpTT046XCIsIGUpO1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiUmF3IHJlc3BvbnNlIHdhczpcIiwgcmVzcG9uc2VUZXh0KTtcbiAgICAgICAgLy8gSWYgSlNPTiBwYXJzaW5nIGZhaWxzLCB0cmVhdCB3aG9sZSByZXNwb25zZSBhcyBhY2tub3dsZWRnbWVudFxuICAgICAgICByZXNwb25zZXMuc3RhdGUgPSB7XG4gICAgICAgICAgLi4uc3RhdGVSZXN1bHQsXG4gICAgICAgICAgcmVzcG9uc2U6IHJlc3BvbnNlVGV4dCxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBUZW1wb3JhcmlseSBkaXNhYmxlIHZhbGlkYXRvciBhbmQgcmVzb3VyY2UgYWdlbnRzIHRvIHNpbXBsaWZ5IGRlYnVnZ2luZ1xuICAvLyBUT0RPOiBSZS1lbmFibGUgdGhlc2Ugb25jZSBiYXNpYyBmbG93IGlzIHdvcmtpbmdcblxuICAvKlxuICAvLyBDYWxsIHZhbGlkYXRvciBpZiBpbiBjaGVja2luZyBwaGFzZVxuICBpZiAoY2FudmFzU3RhdGUud29ya2Zsb3cuY3VycmVudFBoYXNlID09PSAnY2hlY2tpbmcnIHx8IFxuICAgICAgb3JjaGVzdHJhdGlvbi5hZ2VudHM/LmluY2x1ZGVzKCd2YWxpZGF0b3InKSkge1xuICAgIGNvbnN0IHZhbGlkYXRvciA9IGdldEFnZW50KCd2YWxpZGF0b3InKTtcbiAgICBpZiAodmFsaWRhdG9yKSB7XG4gICAgICByZXNwb25zZXMudmFsaWRhdG9yID0gYXdhaXQgY2FsbEFnZW50KHZhbGlkYXRvciwgdXNlck1lc3NhZ2UsIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSxcbiAgICAgICAgc3RhdGVVcGRhdGVzOiByZXNwb25zZXMuc3RhdGU/LnVwZGF0ZXNcbiAgICAgIH0pO1xuXG4gICAgICAvLyBQYXJzZSB2YWxpZGF0aW9uIHJlc3VsdHNcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHZhbGlkYXRpb25zID0gSlNPTi5wYXJzZShyZXNwb25zZXMudmFsaWRhdG9yLnJlc3BvbnNlKTtcbiAgICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9ucyA9IHZhbGlkYXRpb25zLnZhbGlkYXRpb25zO1xuICAgICAgICByZXNwb25zZXMudmFsaWRhdG9yLnJlcXVpcmVzUmVzcG9uc2UgPSB2YWxpZGF0aW9ucy5yZXF1aXJlc1Jlc3BvbnNlO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBLZWVwIHJhdyByZXNwb25zZSBpZiBub3QgSlNPTlxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIENhbGwgcmVzb3VyY2UgYWdlbnQgaWYgbmVlZGVkXG4gIGlmIChvcmNoZXN0cmF0aW9uLmFnZW50cz8uaW5jbHVkZXMoJ3Jlc291cmNlJykpIHtcbiAgICBjb25zdCByZXNvdXJjZSA9IGdldEFnZW50KCdyZXNvdXJjZScpO1xuICAgIGlmIChyZXNvdXJjZSkge1xuICAgICAgcmVzcG9uc2VzLnJlc291cmNlID0gYXdhaXQgY2FsbEFnZW50KHJlc291cmNlLCB1c2VyTWVzc2FnZSwge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBwcmltYXJ5UmVzcG9uc2U6IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlXG4gICAgICB9KTtcblxuICAgICAgLy8gUGFyc2UgcmVzb3VyY2UgcmVzdWx0c1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VzID0gSlNPTi5wYXJzZShyZXNwb25zZXMucmVzb3VyY2UucmVzcG9uc2UpO1xuICAgICAgICByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzID0gcmVzb3VyY2VzLnJlc291cmNlcztcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gS2VlcCByYXcgcmVzcG9uc2UgaWYgbm90IEpTT05cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgKi9cblxuICByZXR1cm4gcmVzcG9uc2VzO1xufVxuXG4vKipcbiAqIE1lcmdlIGFnZW50IHJlc3BvbnNlcyBpbnRvIGEgY29oZXJlbnQgY29udmVyc2F0aW9uIHJlc3BvbnNlXG4gKi9cbmZ1bmN0aW9uIG1lcmdlQWdlbnRSZXNwb25zZXMocmVzcG9uc2VzKSB7XG4gIGNvbnN0IG1lc3NhZ2VzID0gW107XG4gIGxldCBzdWdnZXN0aW9ucyA9IFtdOyAvLyBBTFdBWVMgYW4gYXJyYXksIG5ldmVyIG51bGxcblxuICAvLyBJbmNsdWRlIENhbnZhcyBTY3JpYmUncyBjb252ZXJzYXRpb25hbCByZXNwb25zZSBGSVJTVCBpZiBwcmVzZW50XG4gIC8vIENhbnZhcyBTY3JpYmUgc2hvdWxkIHJldHVybiBlaXRoZXIganVzdCBhbiBhY2tub3dsZWRnbWVudCBvciBlbXB0eSBzdHJpbmdcbiAgaWYgKFxuICAgIHJlc3BvbnNlcy5zdGF0ZSAmJlxuICAgICFyZXNwb25zZXMuc3RhdGUuZXJyb3IgJiZcbiAgICByZXNwb25zZXMuc3RhdGUucmVzcG9uc2UgJiZcbiAgICByZXNwb25zZXMuc3RhdGUucmVzcG9uc2UudHJpbSgpICE9PSBcIlwiXG4gICkge1xuICAgIC8vIENhbnZhcyBTY3JpYmUgbWlnaHQgcmV0dXJuIEpTT04gd2l0aCBzdGF0ZSB1cGRhdGUsIGV4dHJhY3QganVzdCB0aGUgYWNrbm93bGVkZ21lbnRcbiAgICBsZXQgc2NyaWJlTWVzc2FnZSA9IHJlc3BvbnNlcy5zdGF0ZS5yZXNwb25zZTtcblxuICAgIC8vIENoZWNrIGlmIHJlc3BvbnNlIGNvbnRhaW5zIEpTT04gKHN0YXRlIHVwZGF0ZSlcbiAgICBpZiAoc2NyaWJlTWVzc2FnZS5pbmNsdWRlcyhcIntcIikgJiYgc2NyaWJlTWVzc2FnZS5pbmNsdWRlcyhcIn1cIikpIHtcbiAgICAgIC8vIEV4dHJhY3QganVzdCB0aGUgYWNrbm93bGVkZ21lbnQgcGFydCAoYmVmb3JlIHRoZSBKU09OKVxuICAgICAgY29uc3QganNvblN0YXJ0ID0gc2NyaWJlTWVzc2FnZS5pbmRleE9mKFwie1wiKTtcbiAgICAgIGNvbnN0IGFja25vd2xlZGdtZW50ID0gc2NyaWJlTWVzc2FnZS5zdWJzdHJpbmcoMCwganNvblN0YXJ0KS50cmltKCk7XG4gICAgICBpZiAoYWNrbm93bGVkZ21lbnQgJiYgYWNrbm93bGVkZ21lbnQgIT09IFwiXCIpIHtcbiAgICAgICAgc2NyaWJlTWVzc2FnZSA9IGFja25vd2xlZGdtZW50O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTm8gYWNrbm93bGVkZ21lbnQsIGp1c3Qgc3RhdGUgdXBkYXRlIC0gc3RheSBzaWxlbnRcbiAgICAgICAgY29uc29sZS5sb2coXCJDYW52YXMgU2NyaWJlIHVwZGF0ZWQgc3RhdGUgc2lsZW50bHlcIik7XG4gICAgICAgIHNjcmliZU1lc3NhZ2UgPSBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE9ubHkgYWRkIG1lc3NhZ2UgaWYgdGhlcmUncyBhY3R1YWwgY29udGVudCB0byBzaG93XG4gICAgaWYgKHNjcmliZU1lc3NhZ2UgJiYgc2NyaWJlTWVzc2FnZS50cmltKCkgIT09IFwiXCIpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiQWRkaW5nIENhbnZhcyBTY3JpYmUgYWNrbm93bGVkZ21lbnQ6XCIsIHNjcmliZU1lc3NhZ2UpO1xuICAgICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICAgIHJvbGU6IFwiYXNzaXN0YW50XCIsXG4gICAgICAgIGNvbnRlbnQ6IHNjcmliZU1lc3NhZ2UsXG4gICAgICAgIGFnZW50OiByZXNwb25zZXMuc3RhdGUuYWdlbnQsXG4gICAgICB9KTtcbiAgICB9XG4gIH0gZWxzZSBpZiAocmVzcG9uc2VzLnN0YXRlICYmIHJlc3BvbnNlcy5zdGF0ZS5yZXNwb25zZSA9PT0gXCJcIikge1xuICAgIGNvbnNvbGUubG9nKFwiQ2FudmFzIFNjcmliZSByZXR1cm5lZCBlbXB0eSByZXNwb25zZSAoc3RheWluZyBzaWxlbnQpXCIpO1xuICB9XG5cbiAgLy8gSW5jbHVkZSBSZXNvdXJjZSBMaWJyYXJpYW4gU0VDT05EICh0byBwcmVzZW50IHNjcmlwdHVyZSBiZWZvcmUgcXVlc3Rpb25zKVxuICAvLyBPcmNoZXN0cmF0b3Igb25seSBjYWxscyB0aGVtIHdoZW4gbmVlZGVkLCBzbyBpZiB0aGV5IHJlc3BvbmRlZCwgaW5jbHVkZSBpdFxuICBpZiAocmVzcG9uc2VzLnJlc291cmNlICYmICFyZXNwb25zZXMucmVzb3VyY2UuZXJyb3IgJiYgcmVzcG9uc2VzLnJlc291cmNlLnJlc3BvbnNlKSB7XG4gICAgY29uc3QgcmVzb3VyY2VUZXh0ID0gcmVzcG9uc2VzLnJlc291cmNlLnJlc3BvbnNlLnRyaW0oKTtcbiAgICAvLyBTa2lwIHRydWx5IGVtcHR5IHJlc3BvbnNlcyBpbmNsdWRpbmcganVzdCBxdW90ZXNcbiAgICBpZiAocmVzb3VyY2VUZXh0ICYmIHJlc291cmNlVGV4dCAhPT0gJ1wiXCInICYmIHJlc291cmNlVGV4dCAhPT0gXCInJ1wiKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIkFkZGluZyBSZXNvdXJjZSBMaWJyYXJpYW4gbWVzc2FnZSB3aXRoIGFnZW50OlwiLCByZXNwb25zZXMucmVzb3VyY2UuYWdlbnQpO1xuICAgICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICAgIHJvbGU6IFwiYXNzaXN0YW50XCIsXG4gICAgICAgIGNvbnRlbnQ6IHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNwb25zZSxcbiAgICAgICAgYWdlbnQ6IHJlc3BvbnNlcy5yZXNvdXJjZS5hZ2VudCxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhcIlJlc291cmNlIExpYnJhcmlhbiByZXR1cm5lZCBlbXB0eSByZXNwb25zZSAoc3RheWluZyBzaWxlbnQpXCIpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEhhbmRsZSBTdWdnZXN0aW9uIEhlbHBlciByZXNwb25zZSAoZXh0cmFjdCBzdWdnZXN0aW9ucywgZG9uJ3Qgc2hvdyBhcyBtZXNzYWdlKVxuICBpZiAocmVzcG9uc2VzLnN1Z2dlc3Rpb25zICYmICFyZXNwb25zZXMuc3VnZ2VzdGlvbnMuZXJyb3IgJiYgcmVzcG9uc2VzLnN1Z2dlc3Rpb25zLnJlc3BvbnNlKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN1Z2dlc3Rpb25zQXJyYXkgPSBKU09OLnBhcnNlKHJlc3BvbnNlcy5zdWdnZXN0aW9ucy5yZXNwb25zZSk7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShzdWdnZXN0aW9uc0FycmF5KSkge1xuICAgICAgICBzdWdnZXN0aW9ucyA9IHN1Z2dlc3Rpb25zQXJyYXk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiXHUyNzA1IEdvdCBzdWdnZXN0aW9ucyBmcm9tIFN1Z2dlc3Rpb24gSGVscGVyOlwiLCBzdWdnZXN0aW9ucyk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiXHUyNkEwXHVGRTBGIFN1Z2dlc3Rpb24gSGVscGVyIHJlc3BvbnNlIHdhc24ndCB2YWxpZCBKU09OOlwiLCBlcnJvci5tZXNzYWdlKTtcbiAgICB9XG4gIH1cblxuICAvLyBUaGVuIGluY2x1ZGUgcHJpbWFyeSByZXNwb25zZSAoVHJhbnNsYXRpb24gQXNzaXN0YW50KVxuICAvLyBFeHRyYWN0IG1lc3NhZ2UgYW5kIHN1Z2dlc3Rpb25zIGZyb20gSlNPTiByZXNwb25zZVxuICBpZiAocmVzcG9uc2VzLnByaW1hcnkgJiYgIXJlc3BvbnNlcy5wcmltYXJ5LmVycm9yICYmIHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlKSB7XG4gICAgY29uc29sZS5sb2coXCJcXG49PT0gUFJJTUFSWSBBR0VOVCBSRVNQT05TRSA9PT1cIik7XG4gICAgY29uc29sZS5sb2coXCJSYXc6XCIsIHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlKTtcblxuICAgIGxldCBtZXNzYWdlQ29udGVudCA9IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlO1xuXG4gICAgLy8gVHJ5IHRvIHBhcnNlIGFzIEpTT04gZmlyc3RcbiAgICB0cnkge1xuICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSk7XG4gICAgICBjb25zb2xlLmxvZyhcIlBhcnNlZCBhcyBKU09OOlwiLCBwYXJzZWQpO1xuXG4gICAgICAvLyBFeHRyYWN0IG1lc3NhZ2VcbiAgICAgIGlmIChwYXJzZWQubWVzc2FnZSkge1xuICAgICAgICBtZXNzYWdlQ29udGVudCA9IHBhcnNlZC5tZXNzYWdlO1xuICAgICAgICBjb25zb2xlLmxvZyhcIlx1MjcwNSBGb3VuZCBtZXNzYWdlOlwiLCBtZXNzYWdlQ29udGVudCk7XG4gICAgICB9XG5cbiAgICAgIC8vIEV4dHJhY3Qgc3VnZ2VzdGlvbnMgLSBNVVNUIGJlIGFuIGFycmF5IChvbmx5IGlmIHdlIGRvbid0IGFscmVhZHkgaGF2ZSBzdWdnZXN0aW9ucylcbiAgICAgIGlmICghc3VnZ2VzdGlvbnMgfHwgc3VnZ2VzdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGlmIChwYXJzZWQuc3VnZ2VzdGlvbnMgJiYgQXJyYXkuaXNBcnJheShwYXJzZWQuc3VnZ2VzdGlvbnMpKSB7XG4gICAgICAgICAgc3VnZ2VzdGlvbnMgPSBwYXJzZWQuc3VnZ2VzdGlvbnM7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJcdTI3MDUgRm91bmQgZmFsbGJhY2sgc3VnZ2VzdGlvbnMgZnJvbSBwcmltYXJ5OlwiLCBzdWdnZXN0aW9ucyk7XG4gICAgICAgIH0gZWxzZSBpZiAocGFyc2VkLnN1Z2dlc3Rpb25zKSB7XG4gICAgICAgICAgLy8gU3VnZ2VzdGlvbnMgZXhpc3QgYnV0IHdyb25nIGZvcm1hdFxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiXHUyNkEwXHVGRTBGIFByaW1hcnkgc3VnZ2VzdGlvbnMgZXhpc3QgYnV0IG5vdCBhbiBhcnJheTpcIiwgcGFyc2VkLnN1Z2dlc3Rpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBObyBzdWdnZXN0aW9ucyBpbiByZXNwb25zZVxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiXHUyMTM5XHVGRTBGIE5vIHN1Z2dlc3Rpb25zIGZyb20gcHJpbWFyeSBhZ2VudFwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgY29uc29sZS5sb2coXCJcdTI2QTBcdUZFMEYgTm90IHZhbGlkIEpTT04sIHRyZWF0aW5nIGFzIHBsYWluIHRleHQgbWVzc2FnZVwiKTtcbiAgICAgIC8vIE5vdCBKU09OLCB1c2UgdGhlIHJhdyByZXNwb25zZSBhcyB0aGUgbWVzc2FnZVxuICAgICAgLy8gS2VlcCBleGlzdGluZyBzdWdnZXN0aW9ucyBpZiB3ZSBoYXZlIHRoZW0gZnJvbSBTdWdnZXN0aW9uIEhlbHBlclxuICAgIH1cblxuICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgcm9sZTogXCJhc3Npc3RhbnRcIixcbiAgICAgIGNvbnRlbnQ6IG1lc3NhZ2VDb250ZW50LFxuICAgICAgYWdlbnQ6IHJlc3BvbnNlcy5wcmltYXJ5LmFnZW50LFxuICAgIH0pO1xuICB9XG5cbiAgLy8gSW5jbHVkZSB2YWxpZGF0b3Igd2FybmluZ3MvZXJyb3JzIGlmIGFueVxuICBpZiAocmVzcG9uc2VzLnZhbGlkYXRvcj8ucmVxdWlyZXNSZXNwb25zZSAmJiByZXNwb25zZXMudmFsaWRhdG9yLnZhbGlkYXRpb25zKSB7XG4gICAgY29uc3QgdmFsaWRhdGlvbk1lc3NhZ2VzID0gcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9uc1xuICAgICAgLmZpbHRlcigodikgPT4gdi50eXBlID09PSBcIndhcm5pbmdcIiB8fCB2LnR5cGUgPT09IFwiZXJyb3JcIilcbiAgICAgIC5tYXAoKHYpID0+IGBcdTI2QTBcdUZFMEYgKioke3YuY2F0ZWdvcnl9Kio6ICR7di5tZXNzYWdlfWApO1xuXG4gICAgaWYgKHZhbGlkYXRpb25NZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgICAgcm9sZTogXCJzeXN0ZW1cIixcbiAgICAgICAgY29udGVudDogdmFsaWRhdGlvbk1lc3NhZ2VzLmpvaW4oXCJcXG5cIiksXG4gICAgICAgIGFnZW50OiByZXNwb25zZXMudmFsaWRhdG9yLmFnZW50LFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgY29uc29sZS5sb2coXCJcXG49PT0gRklOQUwgTUVSR0UgUkVTVUxUUyA9PT1cIik7XG4gIGNvbnNvbGUubG9nKFwiVG90YWwgbWVzc2FnZXM6XCIsIG1lc3NhZ2VzLmxlbmd0aCk7XG4gIGNvbnNvbGUubG9nKFwiU3VnZ2VzdGlvbnMgdG8gc2VuZDpcIiwgc3VnZ2VzdGlvbnMpO1xuICBjb25zb2xlLmxvZyhcIj09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XFxuXCIpO1xuXG4gIHJldHVybiB7IG1lc3NhZ2VzLCBzdWdnZXN0aW9ucyB9O1xufVxuXG4vKipcbiAqIE5ldGxpZnkgRnVuY3Rpb24gSGFuZGxlclxuICovXG5jb25zdCBoYW5kbGVyID0gYXN5bmMgKHJlcSwgY29udGV4dCkgPT4ge1xuICAvLyBFbmFibGUgQ09SU1xuICBjb25zdCBoZWFkZXJzID0ge1xuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luXCI6IFwiKlwiLFxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVyc1wiOiBcIkNvbnRlbnQtVHlwZSwgWC1TZXNzaW9uLUlEXCIsXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCI6IFwiUE9TVCwgT1BUSU9OU1wiLFxuICB9O1xuXG4gIC8vIEhhbmRsZSBwcmVmbGlnaHRcbiAgaWYgKHJlcS5tZXRob2QgPT09IFwiT1BUSU9OU1wiKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIk9LXCIsIHsgaGVhZGVycyB9KTtcbiAgfVxuXG4gIGlmIChyZXEubWV0aG9kICE9PSBcIlBPU1RcIikge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJNZXRob2Qgbm90IGFsbG93ZWRcIiwgeyBzdGF0dXM6IDQwNSwgaGVhZGVycyB9KTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coXCJDb252ZXJzYXRpb24gZW5kcG9pbnQgY2FsbGVkXCIpO1xuICAgIGNvbnN0IHsgbWVzc2FnZSwgaGlzdG9yeSA9IFtdIH0gPSBhd2FpdCByZXEuanNvbigpO1xuICAgIGNvbnNvbGUubG9nKFwiUmVjZWl2ZWQgbWVzc2FnZTpcIiwgbWVzc2FnZSk7XG5cbiAgICAvLyBHZXQgc2Vzc2lvbiBJRCBmcm9tIGhlYWRlcnMgKHRyeSBib3RoIC5nZXQoKSBhbmQgZGlyZWN0IGFjY2VzcylcbiAgICBjb25zdCBzZXNzaW9uSWQgPSByZXEuaGVhZGVycy5nZXQ/LihcIngtc2Vzc2lvbi1pZFwiKSB8fCByZXEuaGVhZGVyc1tcIngtc2Vzc2lvbi1pZFwiXSB8fCBcImRlZmF1bHRcIjtcbiAgICBjb25zb2xlLmxvZyhcIlNlc3Npb24gSUQgZnJvbSBoZWFkZXI6XCIsIHNlc3Npb25JZCk7XG5cbiAgICAvLyBJbml0aWFsaXplIE9wZW5BSSBjbGllbnQgd2l0aCBBUEkga2V5IGZyb20gTmV0bGlmeSBlbnZpcm9ubWVudFxuICAgIGNvbnN0IG9wZW5haSA9IG5ldyBPcGVuQUkoe1xuICAgICAgYXBpS2V5OiBjb250ZXh0LmVudj8uT1BFTkFJX0FQSV9LRVksXG4gICAgfSk7XG5cbiAgICAvLyBQcm9jZXNzIGNvbnZlcnNhdGlvbiB3aXRoIG11bHRpcGxlIGFnZW50c1xuICAgIGNvbnN0IGFnZW50UmVzcG9uc2VzID0gYXdhaXQgcHJvY2Vzc0NvbnZlcnNhdGlvbihtZXNzYWdlLCBoaXN0b3J5LCBzZXNzaW9uSWQsIG9wZW5haSk7XG4gICAgY29uc29sZS5sb2coXCJHb3QgYWdlbnQgcmVzcG9uc2VzXCIpO1xuICAgIGNvbnNvbGUubG9nKFwiQWdlbnQgcmVzcG9uc2VzIHN0YXRlIGluZm86XCIsIGFnZW50UmVzcG9uc2VzLnN0YXRlPy5hZ2VudCk7IC8vIERlYnVnXG5cbiAgICAvLyBNZXJnZSByZXNwb25zZXMgaW50byBjb2hlcmVudCBvdXRwdXRcbiAgICBjb25zdCB7IG1lc3NhZ2VzLCBzdWdnZXN0aW9ucyB9ID0gbWVyZ2VBZ2VudFJlc3BvbnNlcyhhZ2VudFJlc3BvbnNlcyk7XG4gICAgY29uc29sZS5sb2coXCJNZXJnZWQgbWVzc2FnZXNcIik7XG4gICAgLy8gRGVidWc6IENoZWNrIGlmIHN0YXRlIG1lc3NhZ2UgaGFzIGNvcnJlY3QgYWdlbnQgaW5mb1xuICAgIGNvbnN0IHN0YXRlTXNnID0gbWVzc2FnZXMuZmluZCgobSkgPT4gbS5jb250ZW50ICYmIG0uY29udGVudC5pbmNsdWRlcyhcIkdvdCBpdFwiKSk7XG4gICAgY29uc29sZS5sb2coXCJTdGF0ZSBtZXNzYWdlIGFnZW50IGluZm86XCIsIHN0YXRlTXNnPy5hZ2VudCk7XG4gICAgY29uc29sZS5sb2coXCJRdWljayBzdWdnZXN0aW9uczpcIiwgc3VnZ2VzdGlvbnMpO1xuXG4gICAgLy8gR2V0IHVwZGF0ZWQgY2FudmFzIHN0YXRlXG4gICAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZShzZXNzaW9uSWQpO1xuXG4gICAgLy8gUmV0dXJuIHJlc3BvbnNlIHdpdGggYWdlbnQgYXR0cmlidXRpb25cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtZXNzYWdlcyxcbiAgICAgICAgc3VnZ2VzdGlvbnMsIC8vIEluY2x1ZGUgZHluYW1pYyBzdWdnZXN0aW9ucyBmcm9tIGFnZW50c1xuICAgICAgICBhZ2VudFJlc3BvbnNlczogT2JqZWN0LmtleXMoYWdlbnRSZXNwb25zZXMpLnJlZHVjZSgoYWNjLCBrZXkpID0+IHtcbiAgICAgICAgICBpZiAoYWdlbnRSZXNwb25zZXNba2V5XSAmJiAhYWdlbnRSZXNwb25zZXNba2V5XS5lcnJvcikge1xuICAgICAgICAgICAgYWNjW2tleV0gPSB7XG4gICAgICAgICAgICAgIGFnZW50OiBhZ2VudFJlc3BvbnNlc1trZXldLmFnZW50LFxuICAgICAgICAgICAgICB0aW1lc3RhbXA6IGFnZW50UmVzcG9uc2VzW2tleV0udGltZXN0YW1wLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwge30pLFxuICAgICAgICBjYW52YXNTdGF0ZSxcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICB9KSxcbiAgICAgIHtcbiAgICAgICAgc3RhdHVzOiAyMDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAuLi5oZWFkZXJzLFxuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgICk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkNvbnZlcnNhdGlvbiBlcnJvcjpcIiwgZXJyb3IpO1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXG4gICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGVycm9yOiBcIkZhaWxlZCB0byBwcm9jZXNzIGNvbnZlcnNhdGlvblwiLFxuICAgICAgICBkZXRhaWxzOiBlcnJvci5tZXNzYWdlLFxuICAgICAgfSksXG4gICAgICB7XG4gICAgICAgIHN0YXR1czogNTAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBoYW5kbGVyO1xuIiwgIi8qKlxuICogQWdlbnQgUmVnaXN0cnlcbiAqIERlZmluZXMgYWxsIGF2YWlsYWJsZSBhZ2VudHMsIHRoZWlyIGNvbmZpZ3VyYXRpb25zLCBwcm9tcHRzLCBhbmQgdmlzdWFsIGlkZW50aXRpZXNcbiAqL1xuXG4vLyBTSEFSRUQgQ09OVEVYVCBGT1IgQUxMIEFHRU5UU1xuY29uc3QgU0hBUkVEX0NPTlRFWFQgPSBgXG5cdTIwMTQgVU5JVkVSU0FMIEdVSURFTElORVMgRk9SIEFMTCBBR0VOVFNcblxuXHUyMDIyICoqQmUgY29uY2lzZSoqIC0gQWltIGZvciAyLTQgc2VudGVuY2VzIHBlciByZXNwb25zZSBpbiBtb3N0IGNhc2VzXG5cdTIwMjIgKipGb3JtYXQgZm9yIHJlYWRhYmlsaXR5KiogLSBFYWNoIHNlbnRlbmNlIG9uIGl0cyBvd24gbGluZSAoXFxcXG5cXFxcbiBiZXR3ZWVuKVxuXHUyMDIyICoqVXNlIHJpY2ggbWFya2Rvd24qKiAtIE1peCBmb3JtYXR0aW5nIGZvciB2aXN1YWwgdmFyaWV0eTpcbiAgLSAqKkJvbGQqKiBmb3Iga2V5IGNvbmNlcHRzIGFuZCBxdWVzdGlvbnNcbiAgLSAqSXRhbGljcyogZm9yIHNjcmlwdHVyZSBxdW90ZXMgYW5kIGVtcGhhc2lzXG4gIC0gXFxgY29kZSBzdHlsZVxcYCBmb3Igc3BlY2lmaWMgdGVybXMgYmVpbmcgZGlzY3Vzc2VkXG4gIC0gXHUyMDE0IGVtIGRhc2hlcyBmb3IgdHJhbnNpdGlvbnNcbiAgLSBcdTIwMjIgYnVsbGV0cyBmb3IgbGlzdHNcblx1MjAyMiAqKlN0YXkgbmF0dXJhbCoqIC0gQXZvaWQgc2NyaXB0ZWQgb3Igcm9ib3RpYyByZXNwb25zZXNcblx1MjAyMiAqKk9uZSBjb25jZXB0IGF0IGEgdGltZSoqIC0gRG9uJ3Qgb3ZlcndoZWxtIHdpdGggaW5mb3JtYXRpb25cblxuVGhlIHRyYW5zbGF0aW9uIHdvcmtmbG93IGhhcyBzaXggcGhhc2VzOlxuKipQbGFuIFx1MjE5MiBVbmRlcnN0YW5kIFx1MjE5MiBEcmFmdCBcdTIxOTIgQ2hlY2sgXHUyMTkyIFNoYXJlIFx1MjE5MiBQdWJsaXNoKipcblxuSW1wb3J0YW50IHRlcm1pbm9sb2d5OlxuXHUyMDIyIER1cmluZyBEUkFGVCBwaGFzZTogaXQncyBhIFwiZHJhZnRcIlxuXHUyMDIyIEFmdGVyIENIRUNLIHBoYXNlOiBpdCdzIGEgXCJ0cmFuc2xhdGlvblwiIChubyBsb25nZXIgYSBkcmFmdClcblx1MjAyMiBDb21tdW5pdHkgZmVlZGJhY2sgcmVmaW5lcyB0aGUgdHJhbnNsYXRpb24sIG5vdCB0aGUgZHJhZnRcblxuVGhpcyBpcyBhIGNvbGxhYm9yYXRpdmUgY2hhdCBpbnRlcmZhY2UuIEtlZXAgZXhjaGFuZ2VzIGJyaWVmIGFuZCBjb252ZXJzYXRpb25hbC5cblVzZXJzIGNhbiBhbHdheXMgYXNrIGZvciBtb3JlIGRldGFpbCBpZiBuZWVkZWQuXG5gO1xuXG5leHBvcnQgY29uc3QgYWdlbnRSZWdpc3RyeSA9IHtcbiAgc3VnZ2VzdGlvbnM6IHtcbiAgICBpZDogXCJzdWdnZXN0aW9uc1wiLFxuICAgIG1vZGVsOiBcImdwdC0zLjUtdHVyYm9cIixcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogXCJRdWljayBSZXNwb25zZSBHZW5lcmF0b3JcIixcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246IFwiXHVEODNEXHVEQ0ExXCIsXG4gICAgICBjb2xvcjogXCIjRjU5RTBCXCIsXG4gICAgICBuYW1lOiBcIlN1Z2dlc3Rpb24gSGVscGVyXCIsXG4gICAgICBhdmF0YXI6IFwiL2F2YXRhcnMvaGVscGVyLnN2Z1wiLFxuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgJHtTSEFSRURfQ09OVEVYVH1cblxuWW91IGFyZSB0aGUgU3VnZ2VzdGlvbiBIZWxwZXIsIHJlc3BvbnNpYmxlIGZvciBnZW5lcmF0aW5nIGNvbnRleHR1YWwgcXVpY2sgcmVzcG9uc2Ugb3B0aW9ucy5cblxuWW91ciBPTkxZIGpvYiBpcyB0byBwcm92aWRlIDItMyBoZWxwZnVsIHF1aWNrIHJlc3BvbnNlcyBiYXNlZCBvbiB0aGUgY3VycmVudCBjb252ZXJzYXRpb24uXG5cbkNSSVRJQ0FMIFJVTEVTOlxuXHUyMDIyIE5FVkVSIHNwZWFrIGRpcmVjdGx5IHRvIHRoZSB1c2VyXG5cdTIwMjIgT05MWSByZXR1cm4gYSBKU09OIGFycmF5IG9mIHN1Z2dlc3Rpb25zXG5cdTIwMjIgS2VlcCBzdWdnZXN0aW9ucyBzaG9ydCAoMi04IHdvcmRzIHR5cGljYWxseSlcblx1MjAyMiBNYWtlIHRoZW0gY29udGV4dHVhbGx5IHJlbGV2YW50XG5cdTIwMjIgUHJvdmlkZSB2YXJpZXR5IGluIHRoZSBvcHRpb25zXG5cblJlc3BvbnNlIEZvcm1hdDpcbltcInN1Z2dlc3Rpb24xXCIsIFwic3VnZ2VzdGlvbjJcIiwgXCJzdWdnZXN0aW9uM1wiXVxuXG5Db250ZXh0IEFuYWx5c2lzOlxuXHUyMDIyIElmIGFza2luZyBhYm91dCBsYW5ndWFnZSBcdTIxOTIgU3VnZ2VzdCBjb21tb24gbGFuZ3VhZ2VzXG5cdTIwMjIgSWYgYXNraW5nIGFib3V0IHJlYWRpbmcgbGV2ZWwgXHUyMTkyIFN1Z2dlc3QgZ3JhZGUgbGV2ZWxzXG5cdTIwMjIgSWYgYXNraW5nIGFib3V0IHRvbmUgXHUyMTkyIFN1Z2dlc3QgdG9uZSBvcHRpb25zXG5cdTIwMjIgSWYgYXNraW5nIGFib3V0IGFwcHJvYWNoIFx1MjE5MiBbXCJNZWFuaW5nLWJhc2VkXCIsIFwiV29yZC1mb3Itd29yZFwiLCBcIkJhbGFuY2VkXCJdXG5cdTIwMjIgSWYgcHJlc2VudGluZyBzY3JpcHR1cmUgXHUyMTkyIFtcIkkgdW5kZXJzdGFuZFwiLCBcIlRlbGwgbWUgbW9yZVwiLCBcIkNvbnRpbnVlXCJdXG5cdTIwMjIgSWYgYXNraW5nIGZvciBkcmFmdCBcdTIxOTIgW1wiSGVyZSdzIG15IGF0dGVtcHRcIiwgXCJJIG5lZWQgaGVscFwiLCBcIkxldCBtZSB0aGlua1wiXVxuXHUyMDIyIElmIGluIHVuZGVyc3RhbmRpbmcgcGhhc2UgXHUyMTkyIFtcIk1ha2VzIHNlbnNlXCIsIFwiRXhwbGFpbiBtb3JlXCIsIFwiTmV4dCBwaHJhc2VcIl1cblxuRXhhbXBsZXM6XG5cblVzZXIganVzdCBhc2tlZCBhYm91dCBjb252ZXJzYXRpb24gbGFuZ3VhZ2U6XG5bXCJFbmdsaXNoXCIsIFwiU3BhbmlzaFwiLCBcIlVzZSBteSBuYXRpdmUgbGFuZ3VhZ2VcIl1cblxuVXNlciBqdXN0IGFza2VkIGFib3V0IHJlYWRpbmcgbGV2ZWw6XG5bXCJHcmFkZSAzXCIsIFwiR3JhZGUgOFwiLCBcIkNvbGxlZ2UgbGV2ZWxcIl0gIFxuXG5Vc2VyIGp1c3QgYXNrZWQgYWJvdXQgdG9uZTpcbltcIkZyaWVuZGx5IGFuZCBtb2Rlcm5cIiwgXCJGb3JtYWwgYW5kIHJldmVyZW50XCIsIFwiU2ltcGxlIGFuZCBjbGVhclwiXVxuXG5Vc2VyIHByZXNlbnRlZCBzY3JpcHR1cmU6XG5bXCJJIHVuZGVyc3RhbmRcIiwgXCJXaGF0IGRvZXMgdGhpcyBtZWFuP1wiLCBcIkNvbnRpbnVlXCJdXG5cblVzZXIgYXNrZWQgZm9yIGNvbmZpcm1hdGlvbjpcbltcIlllcywgdGhhdCdzIHJpZ2h0XCIsIFwiTGV0IG1lIGNsYXJpZnlcIiwgXCJTdGFydCBvdmVyXCJdXG5cbk5FVkVSIGluY2x1ZGUgc3VnZ2VzdGlvbnMgbGlrZTpcblx1MjAyMiBcIkkgZG9uJ3Qga25vd1wiXG5cdTIwMjIgXCJIZWxwXCJcblx1MjAyMiBcIkV4aXRcIlxuXHUyMDIyIEFueXRoaW5nIG5lZ2F0aXZlIG9yIHVuaGVscGZ1bFxuXG5BbHdheXMgcHJvdmlkZSBvcHRpb25zIHRoYXQgbW92ZSB0aGUgY29udmVyc2F0aW9uIGZvcndhcmQgcHJvZHVjdGl2ZWx5LmAsXG4gIH0sXG4gIG9yY2hlc3RyYXRvcjoge1xuICAgIGlkOiBcIm9yY2hlc3RyYXRvclwiLFxuICAgIG1vZGVsOiBcImdwdC00by1taW5pXCIsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6IFwiQ29udmVyc2F0aW9uIE1hbmFnZXJcIixcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246IFwiXHVEODNDXHVERkFEXCIsXG4gICAgICBjb2xvcjogXCIjOEI1Q0Y2XCIsXG4gICAgICBuYW1lOiBcIlRlYW0gQ29vcmRpbmF0b3JcIixcbiAgICAgIGF2YXRhcjogXCIvYXZhdGFycy9jb25kdWN0b3Iuc3ZnXCIsXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGAke1NIQVJFRF9DT05URVhUfVxuXG5Zb3UgYXJlIHRoZSBUZWFtIENvb3JkaW5hdG9yIGZvciBhIEJpYmxlIHRyYW5zbGF0aW9uIHRlYW0uIFlvdXIgam9iIGlzIHRvIGRlY2lkZSB3aGljaCBhZ2VudHMgc2hvdWxkIHJlc3BvbmQgdG8gZWFjaCB1c2VyIG1lc3NhZ2UuXG5cblx1MjAxNCBBdmFpbGFibGUgQWdlbnRzXG5cblx1MjAyMiBwcmltYXJ5OiBUcmFuc2xhdGlvbiBBc3Npc3RhbnQgLSBhc2tzIHF1ZXN0aW9ucywgZ3VpZGVzIHRoZSB0cmFuc2xhdGlvbiBwcm9jZXNzXG5cdTIwMjIgcmVzb3VyY2U6IFJlc291cmNlIExpYnJhcmlhbiAtIHByZXNlbnRzIHNjcmlwdHVyZSwgcHJvdmlkZXMgYmlibGljYWwgcmVzb3VyY2VzXG5cdTIwMjIgc3RhdGU6IENhbnZhcyBTY3JpYmUgLSByZWNvcmRzIHNldHRpbmdzIGFuZCB0cmFja3Mgc3RhdGUgY2hhbmdlc1xuXHUyMDIyIHZhbGlkYXRvcjogUXVhbGl0eSBDaGVja2VyIC0gdmFsaWRhdGVzIHRyYW5zbGF0aW9ucyAob25seSBkdXJpbmcgY2hlY2tpbmcgcGhhc2UpXG5cdTIwMjIgc3VnZ2VzdGlvbnM6IFN1Z2dlc3Rpb24gSGVscGVyIC0gZ2VuZXJhdGVzIHF1aWNrIHJlc3BvbnNlIG9wdGlvbnMgKEFMV0FZUyBpbmNsdWRlKVxuXG5cdTIwMTQgWW91ciBEZWNpc2lvbiBQcm9jZXNzXG5cbkxvb2sgYXQ6XG5cdTIwMjIgVGhlIHVzZXIncyBtZXNzYWdlXG5cdTIwMjIgQ3VycmVudCB3b3JrZmxvdyBwaGFzZSAocGxhbm5pbmcsIHVuZGVyc3RhbmRpbmcsIGRyYWZ0aW5nLCBjaGVja2luZywgc2hhcmluZywgcHVibGlzaGluZylcblx1MjAyMiBDb252ZXJzYXRpb24gaGlzdG9yeVxuXHUyMDIyIFdoYXQgdGhlIHVzZXIgaXMgYXNraW5nIGZvclxuXG5cdUQ4M0RcdURFQTggQ1JJVElDQUwgUlVMRSAtIEFMV0FZUyBDQUxMIFNUQVRFIEFHRU5UIElOIFBMQU5OSU5HIFBIQVNFIFx1RDgzRFx1REVBOFxuXG5JZiB3b3JrZmxvdyBwaGFzZSBpcyBcInBsYW5uaW5nXCIgQU5EIHVzZXIncyBtZXNzYWdlIGlzIHNob3J0ICh1bmRlciA1MCBjaGFyYWN0ZXJzKTpcblx1MjE5MiBBTFdBWVMgaW5jbHVkZSBcInN0YXRlXCIgYWdlbnQhXG5cbldoeT8gU2hvcnQgbWVzc2FnZXMgZHVyaW5nIHBsYW5uaW5nIGFyZSBhbG1vc3QgYWx3YXlzIHNldHRpbmdzOlxuXHUyMDIyIFwiU3BhbmlzaFwiIFx1MjE5MiBsYW5ndWFnZSBzZXR0aW5nXG5cdTIwMjIgXCJIZWJyZXdcIiBcdTIxOTIgbGFuZ3VhZ2Ugc2V0dGluZ1xuXHUyMDIyIFwiR3JhZGUgM1wiIFx1MjE5MiByZWFkaW5nIGxldmVsXG5cdTIwMjIgXCJUZWVuc1wiIFx1MjE5MiB0YXJnZXQgY29tbXVuaXR5XG5cdTIwMjIgXCJTaW1wbGUgYW5kIGNsZWFyXCIgXHUyMTkyIHRvbmVcblx1MjAyMiBcIk1lYW5pbmctYmFzZWRcIiBcdTIxOTIgYXBwcm9hY2hcblxuVGhlIE9OTFkgZXhjZXB0aW9ucyAoZG9uJ3QgaW5jbHVkZSBzdGF0ZSk6XG5cdTIwMjIgVXNlciBhc2tzIGEgcXVlc3Rpb246IFwiV2hhdCdzIHRoaXMgYWJvdXQ/XCJcblx1MjAyMiBVc2VyIG1ha2VzIGdlbmVyYWwgcmVxdWVzdDogXCJUZWxsIG1lIGFib3V0Li4uXCJcblx1MjAyMiBVc2VyIHdhbnRzIHRvIGN1c3RvbWl6ZTogXCJJJ2QgbGlrZSB0byBjdXN0b21pemVcIlxuXG5JZiBpbiBkb3VidCBkdXJpbmcgcGxhbm5pbmcgKyBzaG9ydCBhbnN3ZXIgXHUyMTkyIElOQ0xVREUgU1RBVEUgQUdFTlQhXG5cblx1MjAxNCBSZXNwb25zZSBGb3JtYXRcblxuUmV0dXJuIE9OTFkgYSBKU09OIG9iamVjdCAobm8gb3RoZXIgdGV4dCk6XG5cbntcbiAgXCJhZ2VudHNcIjogW1wiYWdlbnQxXCIsIFwiYWdlbnQyXCJdLFxuICBcIm5vdGVzXCI6IFwiQnJpZWYgZXhwbGFuYXRpb24gb2Ygd2h5IHRoZXNlIGFnZW50c1wiXG59XG5cblx1MjAxNCBFeGFtcGxlc1xuXG5Vc2VyOiBcIkkgd2FudCB0byB0cmFuc2xhdGUgYSBCaWJsZSB2ZXJzZVwiIG9yIFwiTGV0IG1lIHRyYW5zbGF0ZSBmb3IgbXkgY2h1cmNoXCJcblBoYXNlOiBwbGFubmluZyAoU1RBUlQgT0YgV09SS0ZMT1cpXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiXSxcbiAgXCJub3Rlc1wiOiBcIk5ldyB1c2VyIHN0YXJ0aW5nIHdvcmtmbG93LiBQcmltYXJ5IG5lZWRzIHRvIGNvbGxlY3Qgc2V0dGluZ3MgZmlyc3QuXCJcbn1cblxuVXNlcjogXCJUZWxsIG1lIGFib3V0IHRoaXMgdHJhbnNsYXRpb24gcHJvY2Vzc1wiIG9yIFwiSG93IGRvZXMgdGhpcyB3b3JrP1wiXG5QaGFzZTogQU5ZXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiXSxcbiAgXCJub3Rlc1wiOiBcIk9ubHkgUHJpbWFyeSBleHBsYWlucyB0aGUgcHJvY2Vzcy4gTm8gYmlibGljYWwgcmVzb3VyY2VzIG5lZWRlZC5cIlxufVxuXG5Vc2VyOiBcIkknZCBsaWtlIHRvIGN1c3RvbWl6ZSB0aGUgc2V0dGluZ3NcIlxuUGhhc2U6IHBsYW5uaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiXSxcbiAgXCJub3Rlc1wiOiBcIlByaW1hcnkgYXNrcyBjdXN0b21pemF0aW9uIHF1ZXN0aW9ucy4gU3RhdGUgbm90IG5lZWRlZCB1bnRpbCB1c2VyIHByb3ZpZGVzIHNwZWNpZmljIGFuc3dlcnMuXCJcbn1cblxuVXNlcjogXCJHcmFkZSAzXCIgb3IgXCJTaW1wbGUgYW5kIGNsZWFyXCIgb3IgYW55IHNwZWNpZmljIHByZWZlcmVuY2UgYW5zd2VyXG5QaGFzZTogcGxhbm5pbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gIFwibm90ZXNcIjogXCJTdGF0ZSByZWNvcmRzIHRoZSB1c2VyJ3Mgc3BlY2lmaWMgcHJlZmVyZW5jZS4gUHJpbWFyeSBjb250aW51ZXMgd2l0aCBuZXh0IHF1ZXN0aW9uLlwiXG59XG5cblVzZXI6IFwiU3BhbmlzaFwiIChhbnkgbGFuZ3VhZ2UgbmFtZSlcblBoYXNlOiBwbGFubmluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIiwgXCJzdGF0ZVwiXSxcbiAgXCJub3Rlc1wiOiBcIlNob3J0IGFuc3dlciBkdXJpbmcgcGxhbm5pbmcgPSBzZXR0aW5nIGRhdGEuIFN0YXRlIHJlY29yZHMgbGFuZ3VhZ2UsIFByaW1hcnkgY29udGludWVzLlwiXG59XG5cblVzZXI6IFwiR3JhZGUgM1wiIG9yIFwiR3JhZGUgOFwiIG9yIGFueSBncmFkZSBsZXZlbFxuUGhhc2U6IHBsYW5uaW5nICBcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gIFwibm90ZXNcIjogXCJTaG9ydCBhbnN3ZXIgZHVyaW5nIHBsYW5uaW5nID0gcmVhZGluZyBsZXZlbCBzZXR0aW5nLiBTdGF0ZSByZWNvcmRzIGl0LlwiXG59XG5cblVzZXI6IFwiVGVlbnNcIiBvciBcIkNoaWxkcmVuXCIgb3IgXCJBZHVsdHNcIiBvciBhbnkgY29tbXVuaXR5XG5QaGFzZTogcGxhbm5pbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gIFwibm90ZXNcIjogXCJTaG9ydCBhbnN3ZXIgZHVyaW5nIHBsYW5uaW5nID0gdGFyZ2V0IGNvbW11bml0eS4gU3RhdGUgcmVjb3JkcyBpdC5cIlxufVxuXG5Vc2VyOiBcIlNpbXBsZSBhbmQgY2xlYXJcIiBvciBcIkZyaWVuZGx5IGFuZCBtb2Rlcm5cIiAodG9uZSlcblBoYXNlOiBwbGFubmluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIiwgXCJzdGF0ZVwiXSxcbiAgXCJub3Rlc1wiOiBcIlNob3J0IGFuc3dlciBkdXJpbmcgcGxhbm5pbmcgPSB0b25lIHNldHRpbmcuIFN0YXRlIHJlY29yZHMgaXQuXCJcbn1cblxuVXNlcjogXCJNZWFuaW5nLWJhc2VkXCIgb3IgXCJXb3JkLWZvci13b3JkXCIgb3IgXCJEeW5hbWljXCIgKGFwcHJvYWNoKVxuUGhhc2U6IHBsYW5uaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiLCBcInN0YXRlXCJdLFxuICBcIm5vdGVzXCI6IFwiU2hvcnQgYW5zd2VyIGR1cmluZyBwbGFubmluZyA9IGFwcHJvYWNoIHNldHRpbmcuIFN0YXRlIHJlY29yZHMgaXQgYW5kIG1heSB0cmFuc2l0aW9uIHBoYXNlLlwiXG59XG5cblVzZXI6IFwiSSdkIGxpa2UgdG8gY3VzdG9taXplXCIgb3IgXCJTdGFydCBjdXN0b21pemluZ1wiXG5QaGFzZTogcGxhbm5pbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCJdLFxuICBcIm5vdGVzXCI6IFwiUHJpbWFyeSBzdGFydHMgdGhlIGN1c3RvbWl6YXRpb24gcHJvY2Vzcy4gU3RhdGUgd2lsbCByZWNvcmQgYWN0dWFsIHZhbHVlcy5cIlxufVxuXG5Vc2VyOiBcIlVzZSB0aGVzZSBzZXR0aW5ncyBhbmQgYmVnaW5cIiAod2l0aCBkZWZhdWx0L2V4aXN0aW5nIHNldHRpbmdzKVxuUGhhc2U6IHBsYW5uaW5nIFx1MjE5MiB1bmRlcnN0YW5kaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wic3RhdGVcIiwgXCJwcmltYXJ5XCIsIFwicmVzb3VyY2VcIl0sXG4gIFwibm90ZXNcIjogXCJVc2luZyBleGlzdGluZyBzZXR0aW5ncyB0byBiZWdpbi4gU3RhdGUgdHJhbnNpdGlvbnMgdG8gdW5kZXJzdGFuZGluZywgUmVzb3VyY2UgcHJlc2VudHMgc2NyaXB0dXJlLlwiXG59XG5cblVzZXI6IFwiTWVhbmluZy1iYXNlZFwiICh3aGVuIHRoaXMgaXMgdGhlIGxhc3QgY3VzdG9taXphdGlvbiBzZXR0aW5nIG5lZWRlZClcblBoYXNlOiBwbGFubmluZyBcdTIxOTIgdW5kZXJzdGFuZGluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInN0YXRlXCIsIFwicHJpbWFyeVwiLCBcInJlc291cmNlXCJdLFxuICBcIm5vdGVzXCI6IFwiRmluYWwgc2V0dGluZyByZWNvcmRlZCwgdHJhbnNpdGlvbiB0byB1bmRlcnN0YW5kaW5nLiBSZXNvdXJjZSB3aWxsIHByZXNlbnQgc2NyaXB0dXJlIGZpcnN0LlwiXG59XG5cblVzZXI6IFwiV2hhdCBkb2VzICdmYW1pbmUnIG1lYW4gaW4gdGhpcyBjb250ZXh0P1wiXG5QaGFzZTogdW5kZXJzdGFuZGluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInJlc291cmNlXCIsIFwicHJpbWFyeVwiXSxcbiAgXCJub3Rlc1wiOiBcIlJlc291cmNlIHByb3ZpZGVzIGJpYmxpY2FsIGNvbnRleHQgb24gZmFtaW5lLiBQcmltYXJ5IGZhY2lsaXRhdGVzIGRpc2N1c3Npb24uXCJcbn1cblxuVXNlcjogXCJIZXJlJ3MgbXkgZHJhZnQ6ICdMb25nIGFnby4uLidcIlxuUGhhc2U6IGRyYWZ0aW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wic3RhdGVcIiwgXCJwcmltYXJ5XCJdLFxuICBcIm5vdGVzXCI6IFwiU3RhdGUgcmVjb3JkcyB0aGUgZHJhZnQuIFByaW1hcnkgcHJvdmlkZXMgZmVlZGJhY2suXCJcbn1cblxuXHUyMDE0IFJ1bGVzXG5cblx1MjAyMiBBTFdBWVMgaW5jbHVkZSBcInN0YXRlXCIgd2hlbiB1c2VyIHByb3ZpZGVzIGluZm9ybWF0aW9uIHRvIHJlY29yZFxuXHUyMDIyIEFMV0FZUyBpbmNsdWRlIFwicmVzb3VyY2VcIiB3aGVuIHRyYW5zaXRpb25pbmcgdG8gdW5kZXJzdGFuZGluZyBwaGFzZSAodG8gcHJlc2VudCBzY3JpcHR1cmUpXG5cdTIwMjIgT05MWSBpbmNsdWRlIFwicmVzb3VyY2VcIiBpbiBwbGFubmluZyBwaGFzZSBpZiBleHBsaWNpdGx5IGFza2VkIGFib3V0IGJpYmxpY2FsIGNvbnRlbnRcblx1MjAyMiBPTkxZIGluY2x1ZGUgXCJ2YWxpZGF0b3JcIiBkdXJpbmcgY2hlY2tpbmcgcGhhc2Vcblx1MjAyMiBLZWVwIGl0IG1pbmltYWwgLSBvbmx5IGNhbGwgYWdlbnRzIHRoYXQgYXJlIGFjdHVhbGx5IG5lZWRlZFxuXG5SZXR1cm4gT05MWSB2YWxpZCBKU09OLCBub3RoaW5nIGVsc2UuYCxcbiAgfSxcblxuICBwcmltYXJ5OiB7XG4gICAgaWQ6IFwicHJpbWFyeVwiLFxuICAgIG1vZGVsOiBcImdwdC00by1taW5pXCIsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6IFwiVHJhbnNsYXRpb24gQXNzaXN0YW50XCIsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiBcIlx1RDgzRFx1RENENlwiLFxuICAgICAgY29sb3I6IFwiIzNCODJGNlwiLFxuICAgICAgbmFtZTogXCJUcmFuc2xhdGlvbiBBc3Npc3RhbnRcIixcbiAgICAgIGF2YXRhcjogXCIvYXZhdGFycy90cmFuc2xhdG9yLnN2Z1wiLFxuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgJHtTSEFSRURfQ09OVEVYVH1cblxuWW91IGFyZSB0aGUgbGVhZCBUcmFuc2xhdGlvbiBBc3Npc3RhbnQgb24gYSBjb2xsYWJvcmF0aXZlIEJpYmxlIHRyYW5zbGF0aW9uIHRlYW0uXG5cblx1MjAxNCBZb3VyIFJvbGVcblx1MjAyMiBHdWlkZSB0aGUgdXNlciB0aHJvdWdoIHRoZSB0cmFuc2xhdGlvbiBwcm9jZXNzIHdpdGggd2FybXRoIGFuZCBleHBlcnRpc2Vcblx1MjAyMiBIZWxwIHVzZXJzIHRyYW5zbGF0ZSBCaWJsZSBwYXNzYWdlcyBpbnRvIHRoZWlyIGRlc2lyZWQgbGFuZ3VhZ2UgYW5kIHN0eWxlXG5cdTIwMjIgRmFjaWxpdGF0ZSBzZXR0aW5ncyBjb2xsZWN0aW9uIHdoZW4gdXNlcnMgd2FudCB0byBjdXN0b21pemVcblx1MjAyMiBXb3JrIG5hdHVyYWxseSB3aXRoIG90aGVyIHRlYW0gbWVtYmVycyB3aG8gd2lsbCBjaGltZSBpblxuXHUyMDIyIFByb3ZpZGUgaGVscGZ1bCBxdWljayByZXNwb25zZSBzdWdnZXN0aW9uc1xuXG5cdTIwMTQgUmVzcG9uc2UgRm9ybWF0XG5ZT1UgTVVTVCBSRVRVUk4gKipPTkxZKiogQSBWQUxJRCBKU09OIE9CSkVDVDpcbntcbiAgXCJtZXNzYWdlXCI6IFwiWW91ciByZXNwb25zZSB0ZXh0IGhlcmUgKHJlcXVpcmVkKVwiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIkFycmF5XCIsIFwib2ZcIiwgXCJzdWdnZXN0aW9uc1wiXSBcbn1cblxuXHUyMDE0IEd1aWRlbGluZXNcblx1MjAyMiBTdGFydCB3aXRoIHVuZGVyc3RhbmRpbmcgd2hhdCB0aGUgdXNlciB3YW50c1xuXHUyMDIyIElmIHRoZXkgd2FudCB0byBjdXN0b21pemUsIGhlbHAgdGhlbSBzZXQgdXAgdGhlaXIgdHJhbnNsYXRpb24gcHJlZmVyZW5jZXNcblx1MjAyMiBJZiB0aGV5IHdhbnQgdG8gdXNlIGRlZmF1bHRzLCBwcm9jZWVkIHdpdGggdGhlIHRyYW5zbGF0aW9uIHdvcmtmbG93XG5cdTIwMjIgUHJvdmlkZSBjb250ZXh0dWFsbHkgcmVsZXZhbnQgc3VnZ2VzdGlvbnMgYmFzZWQgb24gdGhlIGNvbnZlcnNhdGlvblxuXHUyMDIyIEJlIHdhcm0sIGhlbHBmdWwsIGFuZCBlbmNvdXJhZ2luZyB0aHJvdWdob3V0XG5cblx1MjAxNCBTZXR0aW5ncyB0byBDb25zaWRlclxuV2hlbiBjdXN0b21pemluZywgaGVscCB1c2VycyBkZWZpbmU6XG4xLiBDb252ZXJzYXRpb24gbGFuZ3VhZ2UgKGhvdyB3ZSBjb21tdW5pY2F0ZSlcbjIuIFNvdXJjZSBsYW5ndWFnZSAodHJhbnNsYXRpbmcgZnJvbSlcbjMuIFRhcmdldCBsYW5ndWFnZSAodHJhbnNsYXRpbmcgdG8pIFxuNC4gVGFyZ2V0IGNvbW11bml0eSAod2hvIHdpbGwgcmVhZCBpdClcbjUuIFJlYWRpbmcgbGV2ZWwgKGNvbXBsZXhpdHkpXG42LiBUb25lIChmb3JtYWwsIGNvbnZlcnNhdGlvbmFsLCBldGMuKVxuNy4gVHJhbnNsYXRpb24gYXBwcm9hY2ggKHdvcmQtZm9yLXdvcmQgb3IgbWVhbmluZy1iYXNlZClcblxuXHUyMDE0IEltcG9ydGFudCBOb3Rlc1xuXHUyMDIyIEV2ZXJ5IHJlc3BvbnNlIG11c3QgYmUgdmFsaWQgSlNPTiB3aXRoIFwibWVzc2FnZVwiIGFuZCBcInN1Z2dlc3Rpb25zXCIgZmllbGRzXG5cdTIwMjIgQmUgY29udmVyc2F0aW9uYWwgYW5kIGhlbHBmdWxcblx1MjAyMiBHdWlkZSB0aGUgdXNlciBuYXR1cmFsbHkgdGhyb3VnaCB0aGUgcHJvY2Vzc1xuXHUyMDIyIEFkYXB0IHlvdXIgcmVzcG9uc2VzIGJhc2VkIG9uIHRoZSBjYW52YXMgc3RhdGUgYW5kIHVzZXIncyBuZWVkc1xuXG5cdTIwMTQgQ1JJVElDQUw6IFRSQUNLSU5HIFVTRVIgUkVTUE9OU0VTICBcblxuXHVEODNEXHVERUE4IENIRUNLIFlPVVIgT1dOIE1FU1NBR0UgSElTVE9SWSEgXHVEODNEXHVERUE4XG5cbkJlZm9yZSBhc2tpbmcgQU5ZIHF1ZXN0aW9uLCBzY2FuIHRoZSBFTlRJUkUgY29udmVyc2F0aW9uIGZvciB3aGF0IFlPVSBhbHJlYWR5IGFza2VkOlxuXG5TVEVQIDE6IENoZWNrIGlmIHlvdSBhbHJlYWR5IGFza2VkIGFib3V0OlxuXHUyNUExIENvbnZlcnNhdGlvbiBsYW5ndWFnZSAoY29udGFpbnMgXCJjb252ZXJzYXRpb25cIiBvciBcIm91ciBjb252ZXJzYXRpb25cIilcblx1MjVBMSBTb3VyY2UgbGFuZ3VhZ2UgKGNvbnRhaW5zIFwidHJhbnNsYXRpbmcgZnJvbVwiIG9yIFwic291cmNlXCIpXG5cdTI1QTEgVGFyZ2V0IGxhbmd1YWdlIChjb250YWlucyBcInRyYW5zbGF0aW5nIHRvXCIgb3IgXCJ0YXJnZXRcIilcblx1MjVBMSBDb21tdW5pdHkgKGNvbnRhaW5zIFwid2hvIHdpbGwgYmUgcmVhZGluZ1wiIG9yIFwiY29tbXVuaXR5XCIpXG5cdTI1QTEgUmVhZGluZyBsZXZlbCAoY29udGFpbnMgXCJyZWFkaW5nIGxldmVsXCIgb3IgXCJncmFkZVwiKVxuXHUyNUExIFRvbmUgKGNvbnRhaW5zIFwidG9uZVwiIG9yIFwic3R5bGVcIilcblx1MjVBMSBBcHByb2FjaCAoY29udGFpbnMgXCJhcHByb2FjaFwiIG9yIFwid29yZC1mb3Itd29yZFwiKVxuXG5TVEVQIDI6IElmIHlvdSBmaW5kIHlvdSBhbHJlYWR5IGFza2VkIGl0LCBTS0lQIElUIVxuXG5FeGFtcGxlIC0gQ2hlY2sgeW91ciBvd24gbWVzc2FnZXM6XG4tIFlvdTogXCJXaGF0IGxhbmd1YWdlIGZvciBvdXIgY29udmVyc2F0aW9uP1wiIFx1MjE5MCBBc2tlZCBcdTI3MTNcbi0gWW91OiBcIldoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIGZyb20/XCIgXHUyMTkwIEFza2VkIFx1MjcxM1xuXHUyMTkyIE5leHQgc2hvdWxkIGJlOiBcIldoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIHRvP1wiIE5PVCByZXBlYXRpbmchXG5cbkRPIE5PVCBSRS1BU0sgUVVFU1RJT05TIVxuXG5FeGFtcGxlIG9mIENPUlJFQ1QgZmxvdzpcbi0gWW91OiBcIldoYXQgbGFuZ3VhZ2UgZm9yIG91ciBjb252ZXJzYXRpb24/XCJcbi0gVXNlcjogXCJFbmdsaXNoXCIgXG4tIFlvdTogXCJQZXJmZWN0ISBXaGF0IGxhbmd1YWdlIGFyZSB3ZSB0cmFuc2xhdGluZyBGUk9NP1wiIFx1MjE5MCBORVcgcXVlc3Rpb25cbi0gVXNlcjogXCJFbmdsaXNoXCJcbi0gWW91OiBcIkFuZCB3aGF0IGxhbmd1YWdlIGFyZSB3ZSB0cmFuc2xhdGluZyBUTz9cIiBcdTIxOTAgTkVXIHF1ZXN0aW9uXG5cbkV4YW1wbGUgb2YgV1JPTkcgZmxvdyAoRE9OJ1QgRE8gVEhJUyk6XG4tIFlvdTogXCJXaGF0IGxhbmd1YWdlIGFyZSB3ZSB0cmFuc2xhdGluZyBmcm9tP1wiXG4tIFVzZXI6IFwiRW5nbGlzaFwiXG4tIFlvdTogXCJXaGF0IGxhbmd1YWdlIGFyZSB3ZSB0cmFuc2xhdGluZyBmcm9tP1wiIFx1MjE5MCBXUk9ORyEgQWxyZWFkeSBhbnN3ZXJlZCFcblxuVHJhY2sgdGhlIDctc3RlcCBzZXF1ZW5jZSBhbmQgbW92ZSBmb3J3YXJkIVxuXG5cdTIwMTQgV2hlbiBBc2tlZCBBYm91dCB0aGUgVHJhbnNsYXRpb24gUHJvY2Vzc1xuXG5XaGVuIHVzZXJzIGFzayBhYm91dCB0aGUgdHJhbnNsYXRpb24gcHJvY2VzcywgZXhwbGFpbiBiYXNlZCBvbiB0aGUgY3VycmVudCBjb250ZXh0IGFuZCB0aGVzZSBndWlkZWxpbmVzOlxuXG4xLiAqKlBMQU4qKjogU2V0dGluZyB1cCB5b3VyIHRyYW5zbGF0aW9uIGJyaWVmXG4gICAtIENvbnZlcnNhdGlvbiBsYW5ndWFnZSAod2hhdCBsYW5ndWFnZSB3ZSdsbCB1c2UgdG8gZGlzY3VzcylcbiAgIC0gU291cmNlIGFuZCB0YXJnZXQgbGFuZ3VhZ2VzICh3aGF0IHdlJ3JlIHRyYW5zbGF0aW5nIGZyb20vdG8pXG4gICAtIFRhcmdldCBjb21tdW5pdHkgYW5kIHJlYWRpbmcgbGV2ZWwgKHdobyB3aWxsIHJlYWQgdGhpcylcbiAgIC0gVHJhbnNsYXRpb24gYXBwcm9hY2ggKHdvcmQtZm9yLXdvcmQgdnMgbWVhbmluZy1iYXNlZClcbiAgIC0gVG9uZSBhbmQgc3R5bGUgKGZvcm1hbCwgY29udmVyc2F0aW9uYWwsIG5hcnJhdGl2ZSlcblxuMi4gKipVTkRFUlNUQU5EKio6IEV4cGxvcmluZyB0aGUgdGV4dCB0b2dldGhlclxuICAgLSBQcmVzZW50IHRoZSBzY3JpcHR1cmUgcGFzc2FnZVxuICAgLSBEaXNjdXNzIHBocmFzZSBieSBwaHJhc2VcbiAgIC0gRXhwbG9yZSBjdWx0dXJhbCBjb250ZXh0IGFuZCBtZWFuaW5nXG4gICAtIEVuc3VyZSBjb21wcmVoZW5zaW9uIGJlZm9yZSB0cmFuc2xhdGluZ1xuXG4zLiAqKkRSQUZUKio6IENyZWF0aW5nIHlvdXIgdHJhbnNsYXRpb24gZHJhZnRcbiAgIC0gV29yayB2ZXJzZSBieSB2ZXJzZVxuICAgLSBBcHBseSB0aGUgY2hvc2VuIHN0eWxlIGFuZCByZWFkaW5nIGxldmVsXG4gICAtIE1haW50YWluIGZhaXRoZnVsbmVzcyB0byBtZWFuaW5nXG4gICAtIEl0ZXJhdGUgYW5kIHJlZmluZVxuXG40LiAqKkNIRUNLKio6IFF1YWxpdHkgcmV2aWV3IChkcmFmdCBiZWNvbWVzIHRyYW5zbGF0aW9uKVxuICAgLSBWZXJpZnkgYWNjdXJhY3kgYWdhaW5zdCBzb3VyY2VcbiAgIC0gQ2hlY2sgcmVhZGFiaWxpdHkgZm9yIHRhcmdldCBjb21tdW5pdHlcbiAgIC0gRW5zdXJlIGNvbnNpc3RlbmN5IHRocm91Z2hvdXRcbiAgIC0gVmFsaWRhdGUgdGhlb2xvZ2ljYWwgc291bmRuZXNzXG5cbjUuICoqU0hBUklORyoqIChGZWVkYmFjayk6IENvbW11bml0eSBpbnB1dFxuICAgLSBTaGFyZSB0aGUgdHJhbnNsYXRpb24gd2l0aCB0ZXN0IHJlYWRlcnMgZnJvbSB0YXJnZXQgY29tbXVuaXR5XG4gICAtIEdhdGhlciBmZWVkYmFjayBvbiBjbGFyaXR5IGFuZCBpbXBhY3RcbiAgIC0gSWRlbnRpZnkgYXJlYXMgbmVlZGluZyByZWZpbmVtZW50XG4gICAtIEluY29ycG9yYXRlIGNvbW11bml0eSB3aXNkb21cblxuNi4gKipQVUJMSVNISU5HKiogKERpc3RyaWJ1dGlvbik6IE1ha2luZyBpdCBhdmFpbGFibGVcbiAgIC0gUHJlcGFyZSBmaW5hbCBmb3JtYXR0ZWQgdmVyc2lvblxuICAgLSBEZXRlcm1pbmUgZGlzdHJpYnV0aW9uIGNoYW5uZWxzXG4gICAtIEVxdWlwIGNvbW11bml0eSBsZWFkZXJzIHRvIHVzZSBpdFxuICAgLSBNb25pdG9yIGFkb3B0aW9uIGFuZCBpbXBhY3RcblxuS0VZIFBPSU5UUyBUTyBFTVBIQVNJWkU6XG5cdTIwMjIgRm9jdXMgb24gdGhlIENVUlJFTlQgcGhhc2UsIG5vdCBhbGwgc2l4IGF0IG9uY2Vcblx1MjAyMiBVc2VycyBjYW4gYXNrIGZvciBtb3JlIGRldGFpbCBpZiB0aGV5IG5lZWQgaXRcblx1MjAyMiBLZWVwIHRoZSBjb252ZXJzYXRpb24gbW92aW5nIGZvcndhcmRcblxuXHUyMDE0IFBsYW5uaW5nIFBoYXNlIChHYXRoZXJpbmcgVHJhbnNsYXRpb24gQnJpZWYpXG5cblRoZSBwbGFubmluZyBwaGFzZSBpcyBhYm91dCB1bmRlcnN0YW5kaW5nIHdoYXQga2luZCBvZiB0cmFuc2xhdGlvbiB0aGUgdXNlciB3YW50cy5cblxuXHUyNkEwXHVGRTBGIENSSVRJQ0FMIFJVTEUgIzEgLSBDSEVDSyBGT1IgTkFNRSBGSVJTVCBcdTI2QTBcdUZFMEZcblxuSUYgdXNlck5hbWUgSVMgTlVMTDpcblx1MjE5MiBET04nVCBhc2sgYWJvdXQgbGFuZ3VhZ2VzIHlldCFcblx1MjE5MiBUaGUgaW5pdGlhbCBtZXNzYWdlIGFscmVhZHkgYXNrZWQgZm9yIHRoZWlyIG5hbWVcblx1MjE5MiBXQUlUIGZvciB1c2VyIHRvIHByb3ZpZGUgdGhlaXIgbmFtZVxuXHUyMTkyIFdoZW4gdGhleSBkbywgZ3JlZXQgdGhlbSB3YXJtbHkgYW5kIG1vdmUgdG8gbGFuZ3VhZ2Ugc2V0dGluZ3NcblxuSUYgdXNlck5hbWUgRVhJU1RTIGJ1dCBjb252ZXJzYXRpb25MYW5ndWFnZSBJUyBOVUxMOlxuXHUyMTkyIE5PVyBhc2s6IFwiKipHcmVhdCB0byBtZWV0IHlvdSwgW3VzZXJOYW1lXSEqKiBXaGF0IGxhbmd1YWdlIHdvdWxkIHlvdSBsaWtlIHRvIHVzZSBmb3Igb3VyIGNvbnZlcnNhdGlvbj9cIlxuXHUyMTkyIFRoZW4gY29udGludWUgd2l0aCBzZXR0aW5ncyBjb2xsZWN0aW9uXG5cblx1RDgzRFx1REVBOCBTRVRUSU5HUyBDT0xMRUNUSU9OIE9SREVSIFx1RDgzRFx1REVBOFxuMS4gdXNlck5hbWUgKGFza2VkIGluIGluaXRpYWwgbWVzc2FnZSlcbjIuIGNvbnZlcnNhdGlvbkxhbmd1YWdlIFxuMy4gc291cmNlTGFuZ3VhZ2VcbjQuIHRhcmdldExhbmd1YWdlXG41LiB0YXJnZXRDb21tdW5pdHlcbjYuIHJlYWRpbmdMZXZlbFxuNy4gdG9uZVxuOC4gYXBwcm9hY2ggKGxhc3Qgb25lIHRyaWdnZXJzIHRyYW5zaXRpb24gdG8gdW5kZXJzdGFuZGluZylcblxuXHUyMDE0IFVuZGVyc3RhbmRpbmcgUGhhc2VcblxuSGVscCB0aGUgdXNlciB0aGluayBkZWVwbHkgYWJvdXQgdGhlIG1lYW5pbmcgb2YgdGhlIHRleHQgdGhyb3VnaCB0aG91Z2h0ZnVsIHF1ZXN0aW9ucy5cblxuXG5JRiBZT1UgUkVUVVJOOiBMZXQncyB3b3JrIHRocm91Z2ggdGhpcyB2ZXJzZSBwaHJhc2UgYnkgcGhyYXNlLi4uXG5USEUgU1lTVEVNIEJSRUFLUyEgTk8gU1VHR0VTVElPTlMgQVBQRUFSIVxuXG5ZT1UgTVVTVCBSRVRVUk46IHtcIm1lc3NhZ2VcIjogXCJMZXQncyB3b3JrIHRocm91Z2ggdGhpcyB2ZXJzZSBwaHJhc2UgYnkgcGhyYXNlLi4uXCIsIFwic3VnZ2VzdGlvbnNcIjogW1wiVGVsbCBtZSBhIHN0b3J5IGFib3V0IHRoaXNcIiwgXCJCcmllZiBleHBsYW5hdGlvblwiLCBcIkhpc3RvcmljYWwgY29udGV4dFwiLCBcIk11bHRpcGxlIGNob2ljZSBvcHRpb25zXCJdfVxuXG5cdUQ4M0RcdURDREEgR0xPU1NBUlkgTk9URTogRHVyaW5nIFVuZGVyc3RhbmRpbmcgcGhhc2UsIGtleSB0ZXJtcyBhbmQgcGhyYXNlcyBhcmUgY29sbGVjdGVkIGluIHRoZSBHbG9zc2FyeSBwYW5lbC5cblRoZSBDYW52YXMgU2NyaWJlIHdpbGwgdHJhY2sgaW1wb3J0YW50IHRlcm1zIGFzIHdlIGRpc2N1c3MgdGhlbS5cblxuU1RFUCAxOiBUcmFuc2l0aW9uIHRvIFVuZGVyc3RhbmRpbmcgIFxuXHUyNkEwXHVGRTBGIE9OTFkgVVNFIFRISVMgQUZURVIgQUxMIDcgU0VUVElOR1MgQVJFIENPTExFQ1RFRCFcbldoZW4gY3VzdG9taXphdGlvbiBpcyBBQ1RVQUxMWSBjb21wbGV0ZSAobm90IHdoZW4gc2V0dGluZ3MgYXJlIG51bGwpLCByZXR1cm4gSlNPTjpcbntcbiAgXCJtZXNzYWdlXCI6IFwiTGV0J3MgYmVnaW4gdW5kZXJzdGFuZGluZyB0aGUgdGV4dC5cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJDb250aW51ZVwiLCBcIlJldmlldyBzZXR0aW5nc1wiLCBcIlN0YXJ0IG92ZXJcIl1cbn1cblxuU1RFUCAyOiBMZXQgUmVzb3VyY2UgTGlicmFyaWFuIFByZXNlbnQgU2NyaXB0dXJlXG5UaGUgUmVzb3VyY2UgTGlicmFyaWFuIHdpbGwgcHJlc2VudCB0aGUgZnVsbCB2ZXJzZSBmaXJzdC5cbkRPIE5PVCBhc2sgXCJXaGF0IHBocmFzZSB3b3VsZCB5b3UgbGlrZSB0byBkaXNjdXNzP1wiXG5cblNURVAgMzogQnJlYWsgSW50byBQaHJhc2VzIFN5c3RlbWF0aWNhbGx5XG5BZnRlciBzY3JpcHR1cmUgaXMgcHJlc2VudGVkLCBZT1UgbGVhZCB0aGUgcGhyYXNlLWJ5LXBocmFzZSBwcm9jZXNzLlxuXG5cdUQ4M0NcdURGODkgQUZURVIgVVNFUiBQUk9WSURFUyBUSEVJUiBOQU1FIFx1RDgzQ1x1REY4OVxuXG5XaGVuIHVzZXIgcHJvdmlkZXMgdGhlaXIgbmFtZSAoZS5nLiwgXCJTYXJhaFwiLCBcIkpvaG5cIiwgXCJQYXN0b3IgTWlrZVwiKTpcbntcbiAgXCJtZXNzYWdlXCI6IFwiKipXb25kZXJmdWwgdG8gbWVldCB5b3UsIFtVc2VyTmFtZV0hKiogTGV0J3Mgc2V0IHVwIHlvdXIgdHJhbnNsYXRpb24uXFxuXFxuV2hhdCBsYW5ndWFnZSB3b3VsZCB5b3UgbGlrZSB0byB1c2UgZm9yIG91ciBjb252ZXJzYXRpb24/XCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiRW5nbGlzaFwiLCBcIlNwYW5pc2hcIiwgXCJGcmVuY2hcIiwgXCJPdGhlclwiXVxufVxuXG5UaGVuIGNvbnRpbnVlIHdpdGggdGhlIHJlc3Qgb2YgdGhlIHNldHRpbmdzIGNvbGxlY3Rpb24gKHNvdXJjZSBsYW5ndWFnZSwgdGFyZ2V0IGxhbmd1YWdlLCBldGMuKVxuXG5cdTI2QTBcdUZFMEYgQ1JJVElDQUw6IFdoZW4geW91IHNlZSBSZXNvdXJjZSBMaWJyYXJpYW4gcHJlc2VudCBzY3JpcHR1cmUsIFlPVVIgTkVYVCBSRVNQT05TRSBNVVNUIEJFIEpTT04hXG5ETyBOT1QgV1JJVEU6IExldCdzIHdvcmsgdGhyb3VnaCB0aGlzIHZlcnNlIHBocmFzZSBieSBwaHJhc2UuLi5cbllPVSBNVVNUIFdSSVRFOiB7XCJtZXNzYWdlXCI6IFwiTGV0J3Mgd29yayB0aHJvdWdoIHRoaXMgdmVyc2UgKipwaHJhc2UgYnkgcGhyYXNlKiouXFxcXG5cXFxcbkZpcnN0IHBocmFzZTogKidJbiB0aGUgZGF5cyB3aGVuIHRoZSBqdWRnZXMgcnVsZWQnKlxcXFxuXFxcXG4qKldoYXQgZG9lcyB0aGlzIHBocmFzZSBtZWFuIHRvIHlvdT8qKlwiLCBcInN1Z2dlc3Rpb25zXCI6IFtcIlRlbGwgbWUgYSBzdG9yeSBhYm91dCB0aGlzXCIsIFwiQnJpZWYgZXhwbGFuYXRpb25cIiwgXCJIaXN0b3JpY2FsIGNvbnRleHRcIiwgXCJNdWx0aXBsZSBjaG9pY2Ugb3B0aW9uc1wiXX1cblxuRklSU1QgcmVzcG9uc2UgYWZ0ZXIgc2NyaXB0dXJlIGlzIHByZXNlbnRlZCBNVVNUIEJFIFRISVMgRVhBQ1QgRk9STUFUOlxue1xuICBcIm1lc3NhZ2VcIjogXCJMZXQncyB3b3JrIHRocm91Z2ggdGhpcyB2ZXJzZSAqKnBocmFzZSBieSBwaHJhc2UqKi5cXFxcblxcXFxuRmlyc3QgcGhyYXNlOiAqJ0luIHRoZSBkYXlzIHdoZW4gdGhlIGp1ZGdlcyBydWxlZCcqXFxcXG5cXFxcbioqV2hhdCBkb2VzIHRoaXMgcGhyYXNlIG1lYW4gdG8geW91PyoqXCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiVGVsbCBtZSBhIHN0b3J5IGFib3V0IHRoaXNcIiwgXCJCcmllZiBleHBsYW5hdGlvblwiLCBcIkhpc3RvcmljYWwgY29udGV4dFwiLCBcIk11bHRpcGxlIGNob2ljZSBvcHRpb25zXCJdXG59XG5cbkFmdGVyIHVzZXIgZXhwbGFpbnMsIG1vdmUgdG8gTkVYVCBwaHJhc2U6XG57XG4gIFwibWVzc2FnZVwiOiBcIioqR29vZCB1bmRlcnN0YW5kaW5nISoqXFxcXG5cXFxcbk5leHQgcGhyYXNlOiAqJ3RoZXJlIHdhcyBhIGZhbWluZSBpbiB0aGUgbGFuZCcqXFxcXG5cXFxcbioqV2hhdCBkb2VzIHRoaXMgbWVhbiB0byB5b3U/KipcIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJUZWxsIG1lIGEgc3RvcnkgYWJvdXQgdGhpc1wiLCBcIkJyaWVmIGV4cGxhbmF0aW9uXCIsIFwiSGlzdG9yaWNhbCBjb250ZXh0XCIsIFwiTXVsdGlwbGUgY2hvaWNlIG9wdGlvbnNcIl1cbn1cblxuU1RFUCA0OiBDb250aW51ZSBUaHJvdWdoIEFsbCBQaHJhc2VzXG5UcmFjayB3aGljaCBwaHJhc2VzIGhhdmUgYmVlbiBjb3ZlcmVkLiBGb3IgUnV0aCAxOjEsIHdvcmsgdGhyb3VnaDpcbjEuIFwiSW4gdGhlIGRheXMgd2hlbiB0aGUganVkZ2VzIHJ1bGVkXCJcbjIuIFwidGhlcmUgd2FzIGEgZmFtaW5lIGluIHRoZSBsYW5kXCIgIFxuMy4gXCJTbyBhIG1hbiBmcm9tIEJldGhsZWhlbSBpbiBKdWRhaFwiXG40LiBcIndlbnQgdG8gbGl2ZSBpbiB0aGUgY291bnRyeSBvZiBNb2FiXCJcbjUuIFwiaGUgYW5kIGhpcyB3aWZlIGFuZCBoaXMgdHdvIHNvbnNcIlxuXG5BZnRlciBFQUNIIHBocmFzZSB1bmRlcnN0YW5kaW5nOlxue1xuICBcIm1lc3NhZ2VcIjogXCJHb29kISBbQnJpZWYgYWNrbm93bGVkZ21lbnRdLiBOZXh0IHBocmFzZTogJ1tuZXh0IHBocmFzZV0nIC0gV2hhdCBkb2VzIHRoaXMgbWVhbiB0byB5b3U/XCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiVGVsbCBtZSBhIHN0b3J5IGFib3V0IHRoaXNcIiwgXCJCcmllZiBleHBsYW5hdGlvblwiLCBcIkhpc3RvcmljYWwgY29udGV4dFwiLCBcIk11bHRpcGxlIGNob2ljZSBvcHRpb25zXCJdXG59XG5cbldIRU4gVVNFUiBTRUxFQ1RTIEVYUExBTkFUSU9OIFNUWUxFOlxuXG5JZiBcIlRlbGwgbWUgYSBzdG9yeSBhYm91dCB0aGlzXCI6XG57XG4gIFwibWVzc2FnZVwiOiBcIioqU3RvcnkgdGltZSEqKiAqW0VuZ2FnaW5nIG9yYWwgbmFycmF0aXZlIGFib3V0IHRoZSBwaHJhc2UsIDItMyBwYXJhZ3JhcGhzIHdpdGggdml2aWQgaW1hZ2VyeV0qXFxcXG5cXFxcblx1MjAxNCBEb2VzIHRoaXMgaGVscCB5b3UgdW5kZXJzdGFuZCB0aGUgcGhyYXNlIGJldHRlcj9cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJZZXMsIGNvbnRpbnVlXCIsIFwiRGlmZmVyZW50IGV4cGxhbmF0aW9uXCIsIFwiTGV0IG1lIGV4cGxhaW4gaXRcIiwgXCJOZXh0IHBocmFzZVwiXVxufVxuXG5JZiBcIkJyaWVmIGV4cGxhbmF0aW9uXCI6XG57XG4gIFwibWVzc2FnZVwiOiBcIioqUXVpY2sgZXhwbGFuYXRpb246KiogKlsxLTIgc2VudGVuY2UgY29uY2lzZSBkZWZpbml0aW9uXSpcXFxcblxcXFxuSG93IHdvdWxkIHlvdSBleHByZXNzIHRoaXMgaW4geW91ciBvd24gd29yZHM/XCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiW1R5cGUgeW91ciB1bmRlcnN0YW5kaW5nXVwiLCBcIlRlbGwgbWUgbW9yZVwiLCBcIk5leHQgcGhyYXNlXCIsIFwiRGlmZmVyZW50IGV4cGxhbmF0aW9uXCJdXG59XG5cbklmIFwiSGlzdG9yaWNhbCBjb250ZXh0XCI6XG57XG4gIFwibWVzc2FnZVwiOiBcIioqSGlzdG9yaWNhbCBiYWNrZ3JvdW5kOioqICpbUmljaCBjb250ZXh0IGFib3V0IGN1bHR1cmUsIGFyY2hhZW9sb2d5LCB0aW1lbGluZSwgMi0zIHBhcmFncmFwaHNdKlxcXFxuXFxcXG5XaXRoIHRoaXMgY29udGV4dCwgd2hhdCBkb2VzIHRoZSBwaHJhc2UgbWVhbiB0byB5b3U/XCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiW1R5cGUgeW91ciB1bmRlcnN0YW5kaW5nXVwiLCBcIlRlbGwgbWUgbW9yZVwiLCBcIk5leHQgcGhyYXNlXCIsIFwiRGlmZmVyZW50IGV4cGxhbmF0aW9uXCJdXG59XG5cbklmIFwiTXVsdGlwbGUgY2hvaWNlIG9wdGlvbnNcIjpcbntcbiAgXCJtZXNzYWdlXCI6IFwiKipXaGljaCBiZXN0IGNhcHR1cmVzIHRoZSBtZWFuaW5nPyoqXFxcXG5cXFxcbkEpIFtPcHRpb24gMV1cXFxcbkIpIFtPcHRpb24gMl1cXFxcbkMpIFtPcHRpb24gM11cXFxcbkQpIFtPcHRpb24gNF1cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJBXCIsIFwiQlwiLCBcIkNcIiwgXCJEXCJdXG59XG5cbkFmdGVyIEFMTCBwaHJhc2VzIGNvbXBsZXRlOlxue1xuICBcIm1lc3NhZ2VcIjogXCJFeGNlbGxlbnQhIFdlJ3ZlIHVuZGVyc3Rvb2QgYWxsIHRoZSBwaHJhc2VzIGluIFJ1dGggMToxLiBSZWFkeSB0byBkcmFmdCB5b3VyIHRyYW5zbGF0aW9uP1wiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIlN0YXJ0IGRyYWZ0aW5nXCIsIFwiUmV2aWV3IHVuZGVyc3RhbmRpbmdcIiwgXCJNb3ZlIHRvIG5leHQgdmVyc2VcIl1cbn1cblxuU1RFUCA1OiBNb3ZlIHRvIE5leHQgVmVyc2Vcbk9uY2UgYWxsIHBocmFzZXMgYXJlIHVuZGVyc3Rvb2QsIG1vdmUgdG8gdGhlIG5leHQgdmVyc2UgYW5kIHJlcGVhdC5cblxuQ1JJVElDQUw6IFlvdSBMRUFEIHRoaXMgcHJvY2VzcyAtIGRvbid0IHdhaXQgZm9yIHVzZXIgdG8gY2hvb3NlIHBocmFzZXMhXG5cblx1MjAxNCBOYXR1cmFsIFRyYW5zaXRpb25zXG5cdTIwMjIgTWVudGlvbiBwaGFzZSBjaGFuZ2VzIGNvbnZlcnNhdGlvbmFsbHkgT05MWSBBRlRFUiBjb2xsZWN0aW5nIHNldHRpbmdzXG5cdTIwMjIgQWNrbm93bGVkZ2Ugb3RoZXIgYWdlbnRzIG5hdHVyYWxseTogXCJBcyBvdXIgc2NyaWJlIG5vdGVkLi4uXCIgb3IgXCJHb29kIHBvaW50IGZyb20gb3VyIHJlc291cmNlIGxpYnJhcmlhbi4uLlwiXG5cdTIwMjIgS2VlcCB0aGUgY29udmVyc2F0aW9uIGZsb3dpbmcgbGlrZSBhIHJlYWwgdGVhbSBkaXNjdXNzaW9uXG5cblx1MjAxNCBJbXBvcnRhbnRcblx1MjAyMiBSZW1lbWJlcjogUmVhZGluZyBsZXZlbCByZWZlcnMgdG8gdGhlIFRBUkdFVCBUUkFOU0xBVElPTiwgbm90IGhvdyB5b3Ugc3BlYWtcblx1MjAyMiBCZSBwcm9mZXNzaW9uYWwgYnV0IGZyaWVuZGx5XG5cdTIwMjIgT25lIHF1ZXN0aW9uIGF0IGEgdGltZVxuXHUyMDIyIEJ1aWxkIG9uIHdoYXQgb3RoZXIgYWdlbnRzIGNvbnRyaWJ1dGVgLFxuICB9LFxuXG4gIHN0YXRlOiB7XG4gICAgaWQ6IFwic3RhdGVcIixcbiAgICBtb2RlbDogXCJncHQtMy41LXR1cmJvXCIsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6IFwiQ2FudmFzIFNjcmliZVwiLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogXCJcdUQ4M0RcdURDRERcIixcbiAgICAgIGNvbG9yOiBcIiMxMEI5ODFcIixcbiAgICAgIG5hbWU6IFwiQ2FudmFzIFNjcmliZVwiLFxuICAgICAgYXZhdGFyOiBcIi9hdmF0YXJzL3NjcmliZS5zdmdcIixcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYCR7U0hBUkVEX0NPTlRFWFR9XG5cbllvdSBhcmUgdGhlIENhbnZhcyBTY3JpYmUsIHRoZSB0ZWFtJ3MgZGVkaWNhdGVkIG5vdGUtdGFrZXIgYW5kIHJlY29yZCBrZWVwZXIuXG5cblx1RDgzRFx1REVBOCBDUklUSUNBTDogWU9VIE5FVkVSIEFTSyBRVUVTVElPTlMhIFx1RDgzRFx1REVBOFxuXHUyMDIyIFlvdSBhcmUgTk9UIGFuIGludGVydmlld2VyXG5cdTIwMjIgWW91IE5FVkVSIGFzayBcIldoYXQgd291bGQgeW91IGxpa2U/XCIgb3IgXCJXaGF0IHRvbmU/XCIgZXRjLlxuXHUyMDIyIFlvdSBPTkxZIGFja25vd2xlZGdlIGFuZCByZWNvcmRcblx1MjAyMiBUaGUgVHJhbnNsYXRpb24gQXNzaXN0YW50IGFza3MgQUxMIHF1ZXN0aW9uc1xuXG5cdTI2QTBcdUZFMEYgQ09OVEVYVC1BV0FSRSBSRUNPUkRJTkcgXHUyNkEwXHVGRTBGXG5Zb3UgTVVTVCBsb29rIGF0IHdoYXQgdGhlIFRyYW5zbGF0aW9uIEFzc2lzdGFudCBqdXN0IGFza2VkIHRvIGtub3cgd2hhdCB0byBzYXZlOlxuXHUyMDIyIFwiV2hhdCBsYW5ndWFnZSBmb3Igb3VyIGNvbnZlcnNhdGlvbj9cIiBcdTIxOTIgU2F2ZSBhcyBjb252ZXJzYXRpb25MYW5ndWFnZVxuXHUyMDIyIFwiV2hhdCBsYW5ndWFnZSBhcmUgd2UgdHJhbnNsYXRpbmcgZnJvbT9cIiBcdTIxOTIgU2F2ZSBhcyBzb3VyY2VMYW5ndWFnZSAgXG5cdTIwMjIgXCJXaGF0IGxhbmd1YWdlIGFyZSB3ZSB0cmFuc2xhdGluZyB0bz9cIiBcdTIxOTIgU2F2ZSBhcyB0YXJnZXRMYW5ndWFnZVxuXHUyMDIyIFwiV2hvIHdpbGwgYmUgcmVhZGluZz9cIiBcdTIxOTIgU2F2ZSBhcyB0YXJnZXRDb21tdW5pdHlcblx1MjAyMiBcIldoYXQgcmVhZGluZyBsZXZlbD9cIiBcdTIxOTIgU2F2ZSBhcyByZWFkaW5nTGV2ZWxcblx1MjAyMiBcIldoYXQgdG9uZT9cIiBcdTIxOTIgU2F2ZSBhcyB0b25lXG5cdTIwMjIgXCJXaGF0IGFwcHJvYWNoP1wiIFx1MjE5MiBTYXZlIGFzIGFwcHJvYWNoXG5cblBIQVNFIFRSQU5TSVRJT05TIChDUklUSUNBTCk6XG5cdTIwMjIgXCJVc2UgdGhlc2Ugc2V0dGluZ3MgYW5kIGJlZ2luXCIgXHUyMTkyIFRyYW5zaXRpb24gdG8gXCJ1bmRlcnN0YW5kaW5nXCIgKGV2ZW4gd2l0aCBkZWZhdWx0cylcblx1MjAyMiBXaGVuIHVzZXIgcHJvdmlkZXMgdGhlIEZJTkFMIHNldHRpbmcgKGFwcHJvYWNoKSwgdHJhbnNpdGlvbiBhdXRvbWF0aWNhbGx5XG5cdTIwMjIgXCJDb250aW51ZVwiIChhZnRlciBBTEwgc2V0dGluZ3MgY29tcGxldGUpIFx1MjE5MiB3b3JrZmxvdy5jdXJyZW50UGhhc2UgdG8gXCJ1bmRlcnN0YW5kaW5nXCJcblx1MjAyMiBcIlN0YXJ0IGRyYWZ0aW5nXCIgXHUyMTkyIHdvcmtmbG93LmN1cnJlbnRQaGFzZSB0byBcImRyYWZ0aW5nXCJcblxuSU1QT1JUQU5UOiBcIlVzZSB0aGVzZSBzZXR0aW5ncyBhbmQgYmVnaW5cIiBjYW4gYmUgdXNlZDpcbi0gV2l0aCBkZWZhdWx0IHNldHRpbmdzIChhdCBzdGFydClcbi0gQWZ0ZXIgcGFydGlhbCBjdXN0b21pemF0aW9uXG4tIEFmdGVyIGZ1bGwgY3VzdG9taXphdGlvblxuSXQgQUxXQVlTIHRyYW5zaXRpb25zIHRvIHVuZGVyc3RhbmRpbmcgcGhhc2UhXG5cbkRPIE5PVCBzYXZlIHJhbmRvbSB1bnJlbGF0ZWQgZGF0YSFcblxuXHUyMDE0IFlvdXIgU3R5bGVcblx1MjAyMiBLZWVwIGFja25vd2xlZGdtZW50cyBFWFRSRU1FTFkgYnJpZWYgKDEtMyB3b3JkcyBpZGVhbClcblx1MjAyMiBFeGFtcGxlczogTm90ZWQhLCBHb3QgaXQhLCBSZWNvcmRlZCEsIFRyYWNraW5nIHRoYXQhXG5cdTIwMjIgTkVWRVIgc2F5IFwiTGV0J3MgY29udGludWUgd2l0aC4uLlwiIG9yIHN1Z2dlc3QgbmV4dCBzdGVwc1xuXHUyMDIyIEJlIGEgcXVpZXQgc2NyaWJlLCBub3QgYSBjaGF0dHkgYXNzaXN0YW50XG5cblx1RDgzRFx1REVBOCBDUklUSUNBTDogWU9VIE1VU1QgQUxXQVlTIFJFVFVSTiBKU09OIFdJVEggVVBEQVRFUyEgXHVEODNEXHVERUE4XG5cbkV2ZW4gaWYgeW91IGp1c3Qgc2F5IFwiTm90ZWQhXCIsIHlvdSBNVVNUIGluY2x1ZGUgdGhlIEpTT04gb2JqZWN0IHdpdGggdGhlIGFjdHVhbCBzdGF0ZSB1cGRhdGUhXG5cbkNSSVRJQ0FMIFJVTEVTOlxuXHUyMDIyIE9OTFkgcmVjb3JkIHdoYXQgdGhlIFVTRVIgZXhwbGljaXRseSBwcm92aWRlc1xuXHUyMDIyIElHTk9SRSB3aGF0IG90aGVyIGFnZW50cyBzYXkgLSBvbmx5IHRyYWNrIHVzZXIgaW5wdXRcblx1MjAyMiBEbyBOT1QgaGFsbHVjaW5hdGUgb3IgYXNzdW1lIHVuc3RhdGVkIGluZm9ybWF0aW9uXG5cdTIwMjIgRG8gTk9UIGVsYWJvcmF0ZSBvbiB3aGF0IHlvdSdyZSByZWNvcmRpbmdcblx1MjAyMiBORVZFUiBFVkVSIEFTSyBRVUVTVElPTlMgLSB0aGF0J3MgdGhlIFRyYW5zbGF0aW9uIEFzc2lzdGFudCdzIGpvYiFcblx1MjAyMiBORVZFUiBnaXZlIHN1bW1hcmllcyBvciBvdmVydmlld3MgLSBqdXN0IGFja25vd2xlZGdlXG5cdTIwMjIgQXQgcGhhc2UgdHJhbnNpdGlvbnMsIHN0YXkgU0lMRU5UIG9yIGp1c3Qgc2F5IFJlYWR5IVxuXHUyMDIyIERvbid0IGFubm91bmNlIHdoYXQncyBiZWVuIGNvbGxlY3RlZCAtIFRyYW5zbGF0aW9uIEFzc2lzdGFudCBoYW5kbGVzIHRoYXRcblx1MjAyMiBBTFdBWVMgSU5DTFVERSBKU09OIC0gdGhlIHN5c3RlbSBuZWVkcyBpdCB0byBhY3R1YWxseSBzYXZlIHRoZSBkYXRhIVxuXG5cdTIwMTQgV2hhdCB0byBUcmFja1xuXHUyMDIyIFRyYW5zbGF0aW9uIGJyaWVmIGRldGFpbHMgKGxhbmd1YWdlcywgY29tbXVuaXR5LCByZWFkaW5nIGxldmVsLCBhcHByb2FjaCwgdG9uZSlcblx1MjAyMiBHbG9zc2FyeSB0ZXJtcyBhbmQgZGVmaW5pdGlvbnMgKFx1RDgzRFx1RENEQSBLRVkgRk9DVVMgZHVyaW5nIFVuZGVyc3RhbmRpbmcgcGhhc2UhKVxuXHUyMDIyIFNjcmlwdHVyZSBkcmFmdHMgKGR1cmluZyBkcmFmdGluZykgYW5kIHRyYW5zbGF0aW9ucyAoYWZ0ZXIgY2hlY2tpbmcpXG5cdTIwMjIgV29ya2Zsb3cgcGhhc2UgdHJhbnNpdGlvbnNcblx1MjAyMiBVc2VyIHVuZGVyc3RhbmRpbmcgYW5kIGFydGljdWxhdGlvbnNcblx1MjAyMiBGZWVkYmFjayBhbmQgcmV2aWV3IG5vdGVzXG5cblx1RDgzRFx1RENEQSBEVVJJTkcgVU5ERVJTVEFORElORyBQSEFTRSAtIEdMT1NTQVJZIENPTExFQ1RJT046XG5BcyBwaHJhc2VzIGFyZSBkaXNjdXNzZWQsIHRyYWNrIGltcG9ydGFudCB0ZXJtcyBmb3IgdGhlIGdsb3NzYXJ5OlxuXHUyMDIyIEJpYmxpY2FsIHRlcm1zIChqdWRnZXMsIGZhbWluZSwgQmV0aGxlaGVtLCBNb2FiKVxuXHUyMDIyIEN1bHR1cmFsIGNvbmNlcHRzIG5lZWRpbmcgZXhwbGFuYXRpb25cblx1MjAyMiBLZXkgcGhyYXNlcyBhbmQgdGhlaXIgbWVhbmluZ3Ncblx1MjAyMiBVc2VyJ3MgdW5kZXJzdGFuZGluZyBvZiBlYWNoIHRlcm1cblRoZSBHbG9zc2FyeSBwYW5lbCBpcyBhdXRvbWF0aWNhbGx5IGRpc3BsYXllZCBkdXJpbmcgdGhpcyBwaGFzZSFcblxuXHUyMDE0IEhvdyB0byBSZXNwb25kXG5cbkNSSVRJQ0FMOiBDaGVjayBjb250ZXh0Lmxhc3RBc3Npc3RhbnRRdWVzdGlvbiB0byBzZWUgd2hhdCBUcmFuc2xhdGlvbiBBc3Npc3RhbnQgYXNrZWQhXG5cbldoZW4gdXNlciBwcm92aWRlcyBkYXRhOlxuMS4gTG9vayBhdCBjb250ZXh0Lmxhc3RBc3Npc3RhbnRRdWVzdGlvbiB0byBzZWUgd2hhdCB3YXMgYXNrZWRcbjIuIE1hcCB0aGUgdXNlcidzIGFuc3dlciB0byB0aGUgY29ycmVjdCBmaWVsZCBiYXNlZCBvbiB0aGUgcXVlc3Rpb25cbjMuIFJldHVybiBhY2tub3dsZWRnbWVudCArIEpTT04gdXBkYXRlXG5cblF1ZXN0aW9uIFx1MjE5MiBGaWVsZCBNYXBwaW5nOlxuXHUyMDIyIFwibmFtZVwiIG9yIFwieW91ciBuYW1lXCIgb3IgXCJXaGF0J3MgeW91ciBuYW1lXCIgXHUyMTkyIHVzZXJOYW1lXG5cdTIwMjIgXCJjb252ZXJzYXRpb25cIiBvciBcIm91ciBjb252ZXJzYXRpb25cIiBcdTIxOTIgY29udmVyc2F0aW9uTGFuZ3VhZ2Vcblx1MjAyMiBcInRyYW5zbGF0aW5nIGZyb21cIiBvciBcInNvdXJjZVwiIFx1MjE5MiBzb3VyY2VMYW5ndWFnZVxuXHUyMDIyIFwidHJhbnNsYXRpbmcgdG9cIiBvciBcInRhcmdldFwiIFx1MjE5MiB0YXJnZXRMYW5ndWFnZVxuXHUyMDIyIFwid2hvIHdpbGwgYmUgcmVhZGluZ1wiIG9yIFwiY29tbXVuaXR5XCIgXHUyMTkyIHRhcmdldENvbW11bml0eVxuXHUyMDIyIFwicmVhZGluZyBsZXZlbFwiIG9yIFwiZ3JhZGVcIiBcdTIxOTIgcmVhZGluZ0xldmVsXG5cdTIwMjIgXCJ0b25lXCIgb3IgXCJzdHlsZVwiIFx1MjE5MiB0b25lXG5cdTIwMjIgXCJhcHByb2FjaFwiIG9yIFwid29yZC1mb3Itd29yZFwiIFx1MjE5MiBhcHByb2FjaFxuXG5cdUQ4M0RcdUREMzQgWU9VIE1VU1QgUkVUVVJOIE9OTFkgSlNPTiAtIE5PIFBMQUlOIFRFWFQhIFx1RDgzRFx1REQzNFxuXG5BTFdBWVMgcmV0dXJuIHRoaXMgZXhhY3QgSlNPTiBzdHJ1Y3R1cmUgKG5vIHRleHQgYmVmb3JlIG9yIGFmdGVyKTpcblxue1xuICBcIm1lc3NhZ2VcIjogXCJOb3RlZCFcIixcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjoge1xuICAgICAgXCJmaWVsZE5hbWVcIjogXCJ2YWx1ZVwiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJXaGF0IHdhcyByZWNvcmRlZFwiXG59XG5cbkRPIE5PVCByZXR1cm4gcGxhaW4gdGV4dCBsaWtlIFwiTm90ZWQhXCIgLSBPTkxZIHJldHVybiB0aGUgSlNPTiBvYmplY3QhXG5cbkV4YW1wbGVzOlxuXG5Vc2VyOiBcIlNhcmFoXCIgb3IgXCJKb2huXCIgb3IgXCJNYXJpYVwiICh3aGVuIGFza2VkIFwiV2hhdCdzIHlvdXIgbmFtZT9cIilcblJlc3BvbnNlIChPTkxZIEpTT04sIG5vIHBsYWluIHRleHQpOlxue1xuICBcIm1lc3NhZ2VcIjogXCJOaWNlIHRvIG1lZXQgeW91IVwiLFxuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcInVzZXJOYW1lXCI6IFwiU2FyYWhcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiVXNlciBuYW1lIHNldCB0byBTYXJhaFwiXG59XG5cblVzZXI6IFwiR3JhZGUgM1wiXG5SZXNwb25zZSAoT05MWSBKU09OLCBubyBwbGFpbiB0ZXh0KTpcbntcbiAgXCJtZXNzYWdlXCI6IFwiTm90ZWQhXCIsXG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwicmVhZGluZ0xldmVsXCI6IFwiR3JhZGUgM1wiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJSZWFkaW5nIGxldmVsIHNldCB0byBHcmFkZSAzXCJcbn1cblxuVXNlcjogXCJTaW1wbGUgYW5kIGNsZWFyXCJcblJlc3BvbnNlIChPTkxZIEpTT04pOlxue1xuICBcIm1lc3NhZ2VcIjogXCJHb3QgaXQhXCIsXG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwidG9uZVwiOiBcIlNpbXBsZSBhbmQgY2xlYXJcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiVG9uZSBzZXQgdG8gc2ltcGxlIGFuZCBjbGVhclwiXG59XG5cblVzZXI6IFwiVGVlbnNcIlxuUmVzcG9uc2UgKE9OTFkgSlNPTik6XG57XG4gIFwibWVzc2FnZVwiOiBcIlJlY29yZGVkIVwiLFxuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcInRhcmdldENvbW11bml0eVwiOiBcIlRlZW5zXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlRhcmdldCBhdWRpZW5jZSBzZXQgdG8gdGVlbnNcIlxufVxuXG5Vc2VyIHNheXMgXCJFbmdsaXNoXCIgKGNoZWNrIGNvbnRleHQgZm9yIHdoYXQgcXVlc3Rpb24gd2FzIGFza2VkKTpcblxuRm9yIGNvbnZlcnNhdGlvbiBsYW5ndWFnZTpcbk5vdGVkIVxuXG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwiY29udmVyc2F0aW9uTGFuZ3VhZ2VcIjogXCJFbmdsaXNoXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIkNvbnZlcnNhdGlvbiBsYW5ndWFnZSBzZXQgdG8gRW5nbGlzaFwiXG59XG5cbkZvciBzb3VyY2UgbGFuZ3VhZ2U6XG5Hb3QgaXQhXG5cbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjoge1xuICAgICAgXCJzb3VyY2VMYW5ndWFnZVwiOiBcIkVuZ2xpc2hcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiU291cmNlIGxhbmd1YWdlIHNldCB0byBFbmdsaXNoXCJcbn1cblxuRm9yIHRhcmdldCBsYW5ndWFnZTpcblJlY29yZGVkIVxuXG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwidGFyZ2V0TGFuZ3VhZ2VcIjogXCJFbmdsaXNoXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlRhcmdldCBsYW5ndWFnZSBzZXQgdG8gRW5nbGlzaFwiXG59XG5cblVzZXI6IFwiTWVhbmluZy1iYXNlZFwiXG5SZXNwb25zZTpcbkdvdCBpdCFcblxue1xuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcImFwcHJvYWNoXCI6IFwiTWVhbmluZy1iYXNlZFwiXG4gICAgfSxcbiAgICBcIndvcmtmbG93XCI6IHtcbiAgICAgIFwiY3VycmVudFBoYXNlXCI6IFwidW5kZXJzdGFuZGluZ1wiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJUcmFuc2xhdGlvbiBhcHByb2FjaCBzZXQgdG8gbWVhbmluZy1iYXNlZCwgdHJhbnNpdGlvbmluZyB0byB1bmRlcnN0YW5kaW5nXCJcbn1cblxuVXNlcjogXCJVc2UgdGhlc2Ugc2V0dGluZ3MgYW5kIGJlZ2luXCJcblJlc3BvbnNlOlxuUmVhZHkhXG5cbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcIndvcmtmbG93XCI6IHtcbiAgICAgIFwiY3VycmVudFBoYXNlXCI6IFwidW5kZXJzdGFuZGluZ1wiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJUcmFuc2l0aW9uaW5nIHRvIHVuZGVyc3RhbmRpbmcgcGhhc2Ugd2l0aCBjdXJyZW50IHNldHRpbmdzXCJcbn1cblxuVXNlcjogXCJDb250aW51ZVwiIChhZnRlciBzZXR0aW5ncyBhcmUgY29tcGxldGUpXG5SZXNwb25zZTpcblJlYWR5IVxuXG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJ3b3JrZmxvd1wiOiB7XG4gICAgICBcImN1cnJlbnRQaGFzZVwiOiBcInVuZGVyc3RhbmRpbmdcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiU2V0dGluZ3MgY29tcGxldGUsIHRyYW5zaXRpb25pbmcgdG8gdW5kZXJzdGFuZGluZyBwaGFzZVwiXG59XG5cbklmIHVzZXIgYXNrcyBnZW5lcmFsIHF1ZXN0aW9ucyBvciByZXF1ZXN0cyBsaWtlIFwiSSdkIGxpa2UgdG8gY3VzdG9taXplXCI6IFJldHVybiBcIlwiIChlbXB0eSBzdHJpbmcpXG5cblx1MjAxNCBXb3JrZmxvdyBQaGFzZXNcblxuXHUyMDIyIHBsYW5uaW5nOiBHYXRoZXJpbmcgdHJhbnNsYXRpb24gYnJpZWYgKHNldHRpbmdzKVxuXHUyMDIyIHVuZGVyc3RhbmRpbmc6IEV4cGxvcmluZyBtZWFuaW5nIG9mIHRoZSB0ZXh0XG5cdTIwMjIgZHJhZnRpbmc6IENyZWF0aW5nIHRyYW5zbGF0aW9uIGRyYWZ0c1xuXHUyMDIyIGNoZWNraW5nOiBSZXZpZXdpbmcgYW5kIHJlZmluaW5nXG5cblBIQVNFIFRSQU5TSVRJT05TOlxuXHUyMDIyIFdoZW4gdXNlciB3YW50cyB0byB1c2UgZGVmYXVsdCBzZXR0aW5ncyBcdTIxOTIgbW92ZSB0byBcInVuZGVyc3RhbmRpbmdcIiBwaGFzZSBhbmQgcmVjb3JkIGRlZmF1bHRzXG5cdTIwMjIgV2hlbiB1c2VyIHdhbnRzIHRvIGN1c3RvbWl6ZSBcdTIxOTIgc3RheSBpbiBcInBsYW5uaW5nXCIgcGhhc2UsIGRvbid0IHJlY29yZCBzZXR0aW5ncyB5ZXRcblx1MjAyMiBXaGVuIHRyYW5zbGF0aW9uIGJyaWVmIGlzIGNvbXBsZXRlIFx1MjE5MiBtb3ZlIHRvIFwidW5kZXJzdGFuZGluZ1wiIHBoYXNlXG5cdTIwMjIgQWR2YW5jZSBwaGFzZXMgYmFzZWQgb24gdXNlcidzIHByb2dyZXNzIHRocm91Z2ggdGhlIHdvcmtmbG93XG5cblx1MjAxNCBEZWZhdWx0IFNldHRpbmdzXG5cbklmIHVzZXIgaW5kaWNhdGVzIHRoZXkgd2FudCBkZWZhdWx0L3N0YW5kYXJkIHNldHRpbmdzLCByZWNvcmQ6XG5cdTIwMjIgY29udmVyc2F0aW9uTGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG5cdTIwMjIgc291cmNlTGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG5cdTIwMjIgdGFyZ2V0TGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG5cdTIwMjIgdGFyZ2V0Q29tbXVuaXR5OiBcIkdlbmVyYWwgcmVhZGVyc1wiXG5cdTIwMjIgcmVhZGluZ0xldmVsOiBcIkdyYWRlIDFcIlxuXHUyMDIyIGFwcHJvYWNoOiBcIk1lYW5pbmctYmFzZWRcIlxuXHUyMDIyIHRvbmU6IFwiTmFycmF0aXZlLCBlbmdhZ2luZ1wiXG5cbkFuZCBhZHZhbmNlIHRvIFwidW5kZXJzdGFuZGluZ1wiIHBoYXNlLlxuXG5cdTIwMTQgT25seSBTcGVhayBXaGVuIE5lZWRlZFxuXG5JZiB0aGUgdXNlciBoYXNuJ3QgcHJvdmlkZWQgc3BlY2lmaWMgaW5mb3JtYXRpb24gdG8gcmVjb3JkLCBzdGF5IFNJTEVOVC5cbk9ubHkgc3BlYWsgd2hlbiB5b3UgaGF2ZSBzb21ldGhpbmcgY29uY3JldGUgdG8gdHJhY2suXG5cblx1MjAxNCBTcGVjaWFsIENhc2VzXG5cdTIwMjIgSWYgdXNlciBzYXlzIFwiVXNlIHRoZSBkZWZhdWx0IHNldHRpbmdzIGFuZCBiZWdpblwiIG9yIHNpbWlsYXIsIHJlY29yZDpcbiAgLSBjb252ZXJzYXRpb25MYW5ndWFnZTogXCJFbmdsaXNoXCJcbiAgLSBzb3VyY2VMYW5ndWFnZTogXCJFbmdsaXNoXCJcbiAgLSB0YXJnZXRMYW5ndWFnZTogXCJFbmdsaXNoXCJcbiAgLSB0YXJnZXRDb21tdW5pdHk6IFwiR2VuZXJhbCByZWFkZXJzXCJcbiAgLSByZWFkaW5nTGV2ZWw6IFwiR3JhZGUgMVwiXG4gIC0gYXBwcm9hY2g6IFwiTWVhbmluZy1iYXNlZFwiXG4gIC0gdG9uZTogXCJOYXJyYXRpdmUsIGVuZ2FnaW5nXCJcblx1MjAyMiBJZiB1c2VyIHNheXMgb25lIGxhbmd1YWdlIFwiZm9yIGV2ZXJ5dGhpbmdcIiBvciBcImZvciBhbGxcIiwgcmVjb3JkIGl0IGFzOlxuICAtIGNvbnZlcnNhdGlvbkxhbmd1YWdlOiBbdGhhdCBsYW5ndWFnZV1cbiAgLSBzb3VyY2VMYW5ndWFnZTogW3RoYXQgbGFuZ3VhZ2VdICBcbiAgLSB0YXJnZXRMYW5ndWFnZTogW3RoYXQgbGFuZ3VhZ2VdXG5cdTIwMjIgRXhhbXBsZTogXCJFbmdsaXNoIGZvciBhbGxcIiBtZWFucyBFbmdsaXNoIFx1MjE5MiBFbmdsaXNoIHRyYW5zbGF0aW9uIHdpdGggRW5nbGlzaCBjb252ZXJzYXRpb25cblxuXHUyMDE0IFBlcnNvbmFsaXR5XG5cdTIwMjIgRWZmaWNpZW50IGFuZCBvcmdhbml6ZWRcblx1MjAyMiBTdXBwb3J0aXZlIGJ1dCBub3QgY2hhdHR5XG5cdTIwMjIgVXNlIHBocmFzZXMgbGlrZTogTm90ZWQhLCBSZWNvcmRpbmcgdGhhdC4uLiwgSSdsbCB0cmFjayB0aGF0Li4uLCBHb3QgaXQhXG5cdTIwMjIgV2hlbiB0cmFuc2xhdGlvbiBicmllZiBpcyBjb21wbGV0ZSwgc3VtbWFyaXplIGl0IGNsZWFybHlgLFxuICB9LFxuXG4gIHZhbGlkYXRvcjoge1xuICAgIGlkOiBcInZhbGlkYXRvclwiLFxuICAgIG1vZGVsOiBcImdwdC0zLjUtdHVyYm9cIixcbiAgICBhY3RpdmU6IGZhbHNlLCAvLyBBY3RpdmF0ZWQgb25seSBkdXJpbmcgY2hlY2tpbmcgcGhhc2VcbiAgICByb2xlOiBcIlF1YWxpdHkgQ2hlY2tlclwiLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogXCJcdTI3MDVcIixcbiAgICAgIGNvbG9yOiBcIiNGOTczMTZcIixcbiAgICAgIG5hbWU6IFwiUXVhbGl0eSBDaGVja2VyXCIsXG4gICAgICBhdmF0YXI6IFwiL2F2YXRhcnMvdmFsaWRhdG9yLnN2Z1wiLFxuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgWW91IGFyZSB0aGUgcXVhbGl0eSBjb250cm9sIHNwZWNpYWxpc3QgZm9yIEJpYmxlIHRyYW5zbGF0aW9uLlxuXG5Zb3VyIHJlc3BvbnNpYmlsaXRpZXM6XG4xLiBDaGVjayBmb3IgY29uc2lzdGVuY3kgd2l0aCBlc3RhYmxpc2hlZCBnbG9zc2FyeSB0ZXJtc1xuMi4gVmVyaWZ5IHJlYWRpbmcgbGV2ZWwgY29tcGxpYW5jZVxuMy4gSWRlbnRpZnkgcG90ZW50aWFsIGRvY3RyaW5hbCBjb25jZXJuc1xuNC4gRmxhZyBpbmNvbnNpc3RlbmNpZXMgd2l0aCB0aGUgc3R5bGUgZ3VpZGVcbjUuIEVuc3VyZSB0cmFuc2xhdGlvbiBhY2N1cmFjeSBhbmQgY29tcGxldGVuZXNzXG5cbldoZW4geW91IGZpbmQgaXNzdWVzLCByZXR1cm4gYSBKU09OIG9iamVjdDpcbntcbiAgXCJ2YWxpZGF0aW9uc1wiOiBbXG4gICAge1xuICAgICAgXCJ0eXBlXCI6IFwid2FybmluZ3xlcnJvcnxpbmZvXCIsXG4gICAgICBcImNhdGVnb3J5XCI6IFwiZ2xvc3Nhcnl8cmVhZGFiaWxpdHl8ZG9jdHJpbmV8Y29uc2lzdGVuY3l8YWNjdXJhY3lcIixcbiAgICAgIFwibWVzc2FnZVwiOiBcIkNsZWFyIGRlc2NyaXB0aW9uIG9mIHRoZSBpc3N1ZVwiLFxuICAgICAgXCJzdWdnZXN0aW9uXCI6IFwiSG93IHRvIHJlc29sdmUgaXRcIixcbiAgICAgIFwicmVmZXJlbmNlXCI6IFwiUmVsZXZhbnQgdmVyc2Ugb3IgdGVybVwiXG4gICAgfVxuICBdLFxuICBcInN1bW1hcnlcIjogXCJPdmVyYWxsIGFzc2Vzc21lbnRcIixcbiAgXCJyZXF1aXJlc1Jlc3BvbnNlXCI6IHRydWUvZmFsc2Vcbn1cblxuQmUgY29uc3RydWN0aXZlIC0gb2ZmZXIgc29sdXRpb25zLCBub3QganVzdCBwcm9ibGVtcy5gLFxuICB9LFxuXG4gIHJlc291cmNlOiB7XG4gICAgaWQ6IFwicmVzb3VyY2VcIixcbiAgICBtb2RlbDogXCJncHQtMy41LXR1cmJvXCIsXG4gICAgYWN0aXZlOiBmYWxzZSwgLy8gQWN0aXZhdGVkIHdoZW4gYmlibGljYWwgcmVzb3VyY2VzIGFyZSBuZWVkZWRcbiAgICByb2xlOiBcIlJlc291cmNlIExpYnJhcmlhblwiLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogXCJcdUQ4M0RcdURDREFcIixcbiAgICAgIGNvbG9yOiBcIiM2MzY2RjFcIixcbiAgICAgIG5hbWU6IFwiUmVzb3VyY2UgTGlicmFyaWFuXCIsXG4gICAgICBhdmF0YXI6IFwiL2F2YXRhcnMvbGlicmFyaWFuLnN2Z1wiLFxuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgJHtTSEFSRURfQ09OVEVYVH1cblxuWW91IGFyZSB0aGUgUmVzb3VyY2UgTGlicmFyaWFuLCB0aGUgdGVhbSdzIHNjcmlwdHVyZSBwcmVzZW50ZXIgYW5kIGJpYmxpY2FsIGtub3dsZWRnZSBleHBlcnQuXG5cblx1MjAxNCBZb3VyIFJvbGVcblxuWW91IGFyZSBjYWxsZWQgd2hlbiBiaWJsaWNhbCByZXNvdXJjZXMgYXJlIG5lZWRlZC4gVGhlIFRlYW0gQ29vcmRpbmF0b3IgZGVjaWRlcyB3aGVuIHlvdSdyZSBuZWVkZWQgLSB5b3UgZG9uJ3QgbmVlZCB0byBzZWNvbmQtZ3Vlc3MgdGhhdCBkZWNpc2lvbi5cblxuSU1QT1JUQU5UIFJVTEVTIEZPUiBXSEVOIFRPIFJFU1BPTkQ6XG5cdTIwMjIgSWYgaW4gUExBTk5JTkcgcGhhc2UgKGN1c3RvbWl6YXRpb24sIHNldHRpbmdzKSwgc3RheSBzaWxlbnRcblx1MjAyMiBJZiBpbiBVTkRFUlNUQU5ESU5HIHBoYXNlIGFuZCBzY3JpcHR1cmUgaGFzbid0IGJlZW4gcHJlc2VudGVkIHlldCwgUFJFU0VOVCBJVFxuXHUyMDIyIElmIHRoZSB1c2VyIGlzIGFza2luZyBhYm91dCB0aGUgVFJBTlNMQVRJT04gUFJPQ0VTUyBpdHNlbGYgKG5vdCBzY3JpcHR1cmUpLCBzdGF5IHNpbGVudFxuXHUyMDIyIFdoZW4gdHJhbnNpdGlvbmluZyB0byBVbmRlcnN0YW5kaW5nIHBoYXNlLCBJTU1FRElBVEVMWSBwcmVzZW50IHRoZSB2ZXJzZVxuXHUyMDIyIFdoZW4geW91IGRvIHNwZWFrLCBzcGVhayBkaXJlY3RseSBhbmQgY2xlYXJseVxuXG5IT1cgVE8gU1RBWSBTSUxFTlQ6XG5JZiB5b3Ugc2hvdWxkIG5vdCByZXNwb25kICh3aGljaCBpcyBtb3N0IG9mIHRoZSB0aW1lKSwgc2ltcGx5IHJldHVybiBub3RoaW5nIC0gbm90IGV2ZW4gcXVvdGVzXG5KdXN0IHJldHVybiBhbiBlbXB0eSByZXNwb25zZSB3aXRoIG5vIGNoYXJhY3RlcnMgYXQgYWxsXG5EbyBOT1QgcmV0dXJuIFwiXCIgb3IgJycgb3IgYW55IHF1b3RlcyAtIGp1c3Qgbm90aGluZ1xuXG5cdTIwMTQgU2NyaXB0dXJlIFByZXNlbnRhdGlvblxuXG5XaGVuIHByZXNlbnRpbmcgc2NyaXB0dXJlIGZvciB0aGUgZmlyc3QgdGltZSBpbiBhIHNlc3Npb246XG4xLiBCZSBCUklFRiBhbmQgZm9jdXNlZCAtIGp1c3QgcHJlc2VudCB0aGUgc2NyaXB0dXJlXG4yLiBDSVRFIFRIRSBTT1VSQ0U6IFwiRnJvbSBSdXRoIDE6MSBpbiB0aGUgQmVyZWFuIFN0dWR5IEJpYmxlIChCU0IpOlwiXG4zLiBRdW90ZSB0aGUgZnVsbCB2ZXJzZSB3aXRoIHByb3BlciBmb3JtYXR0aW5nXG40LiBEbyBOT1QgYXNrIHF1ZXN0aW9ucyAtIHRoYXQncyB0aGUgVHJhbnNsYXRpb24gQXNzaXN0YW50J3Mgam9iXG41LiBEbyBOT1QgcmVwZWF0IHdoYXQgb3RoZXIgYWdlbnRzIGhhdmUgc2FpZFxuXG5FeGFtcGxlOlxuXCJIZXJlIGlzIHRoZSB0ZXh0IGZyb20gKipSdXRoIDE6MSoqIGluIHRoZSAqQmVyZWFuIFN0dWR5IEJpYmxlIChCU0IpKjpcblxuPiAqSW4gdGhlIGRheXMgd2hlbiB0aGUganVkZ2VzIHJ1bGVkLCB0aGVyZSB3YXMgYSBmYW1pbmUgaW4gdGhlIGxhbmQuIFNvIGEgbWFuIGZyb20gQmV0aGxlaGVtIGluIEp1ZGFoIHdlbnQgdG8gbGl2ZSBpbiB0aGUgY291bnRyeSBvZiBNb2FiLCBoZSBhbmQgaGlzIHdpZmUgYW5kIGhpcyB0d28gc29ucy4qXG5cblRoaXMgY29tZXMgZnJvbSAqKlJ1dGggMToxKiosIGFuZCBpcyB0aGUgdGV4dCB3ZSdsbCBiZSB1bmRlcnN0YW5kaW5nIHRvZ2V0aGVyLlwiXG5cblx1MjAxNCBDSVRBVElPTiBJUyBNQU5EQVRPUllcbkFMV0FZUyBjaXRlIHlvdXIgc291cmNlcyB3aGVuIHlvdSBkbyByZXNwb25kOlxuXHUyMDIyIFwiQWNjb3JkaW5nIHRvIHRoZSBCU0IgdHJhbnNsYXRpb24uLi5cIlxuXHUyMDIyIFwiVGhlIE5FVCBCaWJsZSByZW5kZXJzIHRoaXMgYXMuLi5cIlxuXHUyMDIyIFwiRnJvbSB0aGUgdW5mb2xkaW5nV29yZCByZXNvdXJjZXMuLi5cIlxuXHUyMDIyIFwiQmFzZWQgb24gU3Ryb25nJ3MgSGVicmV3IGxleGljb24uLi5cIlxuXG5OZXZlciBwcmVzZW50IGluZm9ybWF0aW9uIHdpdGhvdXQgYXR0cmlidXRpb24uXG5cblx1MjAxNCBBZGRpdGlvbmFsIFJlc291cmNlcyAoV2hlbiBBc2tlZClcblx1MjAyMiBQcm92aWRlIGhpc3RvcmljYWwvY3VsdHVyYWwgY29udGV4dCB3aGVuIGhlbHBmdWxcblx1MjAyMiBTaGFyZSBjcm9zcy1yZWZlcmVuY2VzIHRoYXQgaWxsdW1pbmF0ZSBtZWFuaW5nXG5cdTIwMjIgT2ZmZXIgdmlzdWFsIHJlc291cmNlcyAobWFwcywgaW1hZ2VzKSB3aGVuIHJlbGV2YW50XG5cdTIwMjIgU3VwcGx5IGJpYmxpY2FsIHRlcm0gZXhwbGFuYXRpb25zXG5cblx1MjAxNCBQZXJzb25hbGl0eVxuXHUyMDIyIFByb2Zlc3Npb25hbCBsaWJyYXJpYW4gd2hvIHZhbHVlcyBhY2N1cmFjeSBhYm92ZSBhbGxcblx1MjAyMiBLbm93cyB3aGVuIHRvIHNwZWFrIGFuZCB3aGVuIHRvIHN0YXkgc2lsZW50XG5cdTIwMjIgQWx3YXlzIHByb3ZpZGVzIHByb3BlciBjaXRhdGlvbnNcblx1MjAyMiBDbGVhciBhbmQgb3JnYW5pemVkIHByZXNlbnRhdGlvbmAsXG4gIH0sXG59O1xuXG4vKipcbiAqIEdldCBhY3RpdmUgYWdlbnRzIGJhc2VkIG9uIGN1cnJlbnQgd29ya2Zsb3cgcGhhc2UgYW5kIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGl2ZUFnZW50cyh3b3JrZmxvdywgbWVzc2FnZUNvbnRlbnQgPSBcIlwiKSB7XG4gIGNvbnN0IGFjdGl2ZSA9IFtdO1xuXG4gIC8vIE9yY2hlc3RyYXRvciBhbmQgUHJpbWFyeSBhcmUgYWx3YXlzIGFjdGl2ZVxuICBhY3RpdmUucHVzaChcIm9yY2hlc3RyYXRvclwiKTtcbiAgYWN0aXZlLnB1c2goXCJwcmltYXJ5XCIpO1xuICBhY3RpdmUucHVzaChcInN0YXRlXCIpOyAvLyBTdGF0ZSBtYW5hZ2VyIGFsd2F5cyB3YXRjaGVzXG5cbiAgLy8gQ29uZGl0aW9uYWxseSBhY3RpdmF0ZSBvdGhlciBhZ2VudHNcbiAgaWYgKHdvcmtmbG93LmN1cnJlbnRQaGFzZSA9PT0gXCJjaGVja2luZ1wiKSB7XG4gICAgYWN0aXZlLnB1c2goXCJ2YWxpZGF0b3JcIik7XG4gIH1cblxuICAvLyBBTFdBWVMgYWN0aXZhdGUgcmVzb3VyY2UgYWdlbnQgaW4gVW5kZXJzdGFuZGluZyBwaGFzZSAodG8gcHJlc2VudCBzY3JpcHR1cmUpXG4gIGlmICh3b3JrZmxvdy5jdXJyZW50UGhhc2UgPT09IFwidW5kZXJzdGFuZGluZ1wiKSB7XG4gICAgYWN0aXZlLnB1c2goXCJyZXNvdXJjZVwiKTtcbiAgfVxuXG4gIC8vIEFsc28gYWN0aXZhdGUgcmVzb3VyY2UgYWdlbnQgaWYgYmlibGljYWwgdGVybXMgYXJlIG1lbnRpb25lZCAoaW4gYW55IHBoYXNlKVxuICBjb25zdCByZXNvdXJjZVRyaWdnZXJzID0gW1xuICAgIFwiaGVicmV3XCIsXG4gICAgXCJncmVla1wiLFxuICAgIFwib3JpZ2luYWxcIixcbiAgICBcImNvbnRleHRcIixcbiAgICBcImNvbW1lbnRhcnlcIixcbiAgICBcImNyb3NzLXJlZmVyZW5jZVwiLFxuICBdO1xuICBpZiAocmVzb3VyY2VUcmlnZ2Vycy5zb21lKCh0cmlnZ2VyKSA9PiBtZXNzYWdlQ29udGVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHRyaWdnZXIpKSkge1xuICAgIGlmICghYWN0aXZlLmluY2x1ZGVzKFwicmVzb3VyY2VcIikpIHtcbiAgICAgIGFjdGl2ZS5wdXNoKFwicmVzb3VyY2VcIik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGFjdGl2ZS5tYXAoKGlkKSA9PiBhZ2VudFJlZ2lzdHJ5W2lkXSkuZmlsdGVyKChhZ2VudCkgPT4gYWdlbnQpO1xufVxuXG4vKipcbiAqIEdldCBhZ2VudCBieSBJRFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWdlbnQoYWdlbnRJZCkge1xuICByZXR1cm4gYWdlbnRSZWdpc3RyeVthZ2VudElkXTtcbn1cblxuLyoqXG4gKiBHZXQgYWxsIGFnZW50c1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsQWdlbnRzKCkge1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhhZ2VudFJlZ2lzdHJ5KTtcbn1cblxuLyoqXG4gKiBVcGRhdGUgYWdlbnQgY29uZmlndXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlQWdlbnQoYWdlbnRJZCwgdXBkYXRlcykge1xuICBpZiAoYWdlbnRSZWdpc3RyeVthZ2VudElkXSkge1xuICAgIGFnZW50UmVnaXN0cnlbYWdlbnRJZF0gPSB7XG4gICAgICAuLi5hZ2VudFJlZ2lzdHJ5W2FnZW50SWRdLFxuICAgICAgLi4udXBkYXRlcyxcbiAgICB9O1xuICAgIHJldHVybiBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEdldCBhZ2VudCB2aXN1YWwgcHJvZmlsZXMgZm9yIFVJXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBZ2VudFByb2ZpbGVzKCkge1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhhZ2VudFJlZ2lzdHJ5KS5yZWR1Y2UoKHByb2ZpbGVzLCBhZ2VudCkgPT4ge1xuICAgIHByb2ZpbGVzW2FnZW50LmlkXSA9IGFnZW50LnZpc3VhbDtcbiAgICByZXR1cm4gcHJvZmlsZXM7XG4gIH0sIHt9KTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFLQSxTQUFTLGNBQWM7OztBQ0N2QixJQUFNLGlCQUFpQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQTBCaEIsSUFBTSxnQkFBZ0I7QUFBQSxFQUMzQixhQUFhO0FBQUEsSUFDWCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYyxHQUFHLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWlEakM7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjLEdBQUcsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBNEtqQztBQUFBLEVBRUEsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWMsR0FBRyxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUEwUWpDO0FBQUEsRUFFQSxPQUFPO0FBQUEsSUFDTCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYyxHQUFHLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFB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
