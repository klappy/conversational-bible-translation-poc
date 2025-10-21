
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

You MUST track TWO types of glossary entries:

1. **keyTerms** - Biblical/cultural terms:
   - judges, famine, Bethlehem, Moab, Judah
   - Store as: glossary.keyTerms.judges with definition and verse

2. **userPhrases** - User's phrase translations (TRAINING DATA):
   - Store verbatim what user says for each phrase
   - Maps original phrase to user's explanation
   
This captures valuable translation data for future use!

When user explains a phrase, return JSON like:
{
  "message": "",
  "updates": {
    "glossary": {
      "keyTerms": {
        "judges": {
          "definition": "Leaders before kings",
          "verse": "Ruth 1:1"
        }
      },
      "userPhrases": {
        "In the days when the judges ruled": "A time before the kings when some people made sure others followed the rules"
      }
    }
  },
  "summary": "Captured user understanding of phrase and key term 'judges'"
}

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
  const suggestionAgent = getAgent("suggestions");
  if (suggestionAgent && responses.primary) {
    console.log("Calling Suggestion Helper for PRIMARY'S new question...");
    let primaryQuestion = responses.primary.response;
    try {
      const parsed = JSON.parse(responses.primary.response);
      primaryQuestion = parsed.message || responses.primary.response;
    } catch {
    }
    responses.suggestions = await callAgent(
      suggestionAgent,
      primaryQuestion,
      // Changed from userMessage to primaryQuestion!
      {
        ...context,
        primaryResponse: responses.primary.response,
        orchestration
      },
      openaiClient
    );
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY29udmVyc2F0aW9uLmpzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL2FnZW50cy9yZWdpc3RyeS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNdWx0aS1BZ2VudCBDb252ZXJzYXRpb24gSGFuZGxlclxuICogT3JjaGVzdHJhdGVzIG11bHRpcGxlIEFJIGFnZW50cyB0byBoYW5kbGUgQmlibGUgdHJhbnNsYXRpb24gY29udmVyc2F0aW9uc1xuICovXG5cbmltcG9ydCB7IE9wZW5BSSB9IGZyb20gXCJvcGVuYWlcIjtcbmltcG9ydCB7IGdldEFnZW50IH0gZnJvbSBcIi4vYWdlbnRzL3JlZ2lzdHJ5LmpzXCI7XG5cbi8vIE9wZW5BSSBjbGllbnQgd2lsbCBiZSBpbml0aWFsaXplZCBwZXIgcmVxdWVzdCB3aXRoIGNvbnRleHRcblxuLyoqXG4gKiBDYWxsIGFuIGluZGl2aWR1YWwgYWdlbnQgd2l0aCBjb250ZXh0XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNhbGxBZ2VudChhZ2VudCwgbWVzc2FnZSwgY29udGV4dCwgb3BlbmFpQ2xpZW50KSB7XG4gIGNvbnNvbGUubG9nKGBDYWxsaW5nIGFnZW50OiAke2FnZW50LmlkfWApO1xuICB0cnkge1xuICAgIGNvbnN0IG1lc3NhZ2VzID0gW1xuICAgICAge1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiBhZ2VudC5zeXN0ZW1Qcm9tcHQsXG4gICAgICB9LFxuICAgIF07XG5cbiAgICAvLyBBZGQgY29udmVyc2F0aW9uIGhpc3RvcnkgYXMgbmF0dXJhbCBtZXNzYWdlcyAoZm9yIHByaW1hcnkgYWdlbnQgb25seSlcbiAgICBpZiAoYWdlbnQuaWQgPT09IFwicHJpbWFyeVwiICYmIGNvbnRleHQuY29udmVyc2F0aW9uSGlzdG9yeSkge1xuICAgICAgY29udGV4dC5jb252ZXJzYXRpb25IaXN0b3J5LmZvckVhY2goKG1zZykgPT4ge1xuICAgICAgICAvLyBTa2lwIENhbnZhcyBTY3JpYmUgYWNrbm93bGVkZ21lbnRzXG4gICAgICAgIGlmIChtc2cuYWdlbnQ/LmlkID09PSBcInN0YXRlXCIpIHJldHVybjtcblxuICAgICAgICAvLyBTa2lwIGlubGluZSBzdWdnZXN0aW9uIG1lc3NhZ2VzICh0aGV5J3JlIHN5c3RlbSBVSSBlbGVtZW50cywgbm90IGNvbnZlcnNhdGlvbilcbiAgICAgICAgaWYgKG1zZy50eXBlID09PSBcInN1Z2dlc3Rpb25zXCIgJiYgbXNnLnJvbGUgPT09IFwic3lzdGVtXCIpIHJldHVybjtcblxuICAgICAgICAvLyBTa2lwIG1lc3NhZ2VzIHdpdGggYXJyYXkgY29udGVudCAod291bGQgY2F1c2UgT3BlbkFJIGVycm9ycylcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobXNnLmNvbnRlbnQpKSByZXR1cm47XG5cbiAgICAgICAgLy8gUGFyc2UgYXNzaXN0YW50IG1lc3NhZ2VzIGlmIHRoZXkncmUgSlNPTlxuICAgICAgICBsZXQgY29udGVudCA9IG1zZy5jb250ZW50O1xuICAgICAgICBpZiAobXNnLnJvbGUgPT09IFwiYXNzaXN0YW50XCIgJiYgbXNnLmFnZW50Py5pZCA9PT0gXCJwcmltYXJ5XCIpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShjb250ZW50KTtcbiAgICAgICAgICAgIGNvbnRlbnQgPSBwYXJzZWQubWVzc2FnZSB8fCBjb250ZW50O1xuICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgLy8gTm90IEpTT04sIHVzZSBhcy1pc1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICAgIHJvbGU6IG1zZy5yb2xlLFxuICAgICAgICAgIGNvbnRlbnQ6IGNvbnRlbnQsXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQWRkIHRoZSBjdXJyZW50IHVzZXIgbWVzc2FnZVxuICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICBjb250ZW50OiBtZXNzYWdlLFxuICAgIH0pO1xuXG4gICAgLy8gUHJvdmlkZSBjYW52YXMgc3RhdGUgY29udGV4dCB0byBhbGwgYWdlbnRzXG4gICAgaWYgKGNvbnRleHQuY2FudmFzU3RhdGUpIHtcbiAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiBgQ3VycmVudCBjYW52YXMgc3RhdGU6ICR7SlNPTi5zdHJpbmdpZnkoY29udGV4dC5jYW52YXNTdGF0ZSl9YCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEZvciBub24tcHJpbWFyeSBhZ2VudHMsIHByb3ZpZGUgY29udGV4dCBkaWZmZXJlbnRseVxuICAgIGlmIChhZ2VudC5pZCAhPT0gXCJwcmltYXJ5XCIpIHtcbiAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiBgQ29udGV4dDogJHtKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgY2FudmFzU3RhdGU6IGNvbnRleHQuY2FudmFzU3RhdGUsXG4gICAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiBjb250ZXh0LnByaW1hcnlSZXNwb25zZSxcbiAgICAgICAgICBvcmNoZXN0cmF0aW9uOiBjb250ZXh0Lm9yY2hlc3RyYXRpb24sXG4gICAgICAgIH0pfWAsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdGltZW91dCB3cmFwcGVyIGZvciBBUEkgY2FsbFxuICAgIGNvbnN0IHRpbWVvdXRQcm9taXNlID0gbmV3IFByb21pc2UoKF8sIHJlamVjdCkgPT4ge1xuICAgICAgc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKGBUaW1lb3V0IGNhbGxpbmcgJHthZ2VudC5pZH1gKSksIDEwMDAwKTsgLy8gMTAgc2Vjb25kIHRpbWVvdXRcbiAgICB9KTtcblxuICAgIGNvbnN0IGNvbXBsZXRpb25Qcm9taXNlID0gb3BlbmFpQ2xpZW50LmNoYXQuY29tcGxldGlvbnMuY3JlYXRlKHtcbiAgICAgIG1vZGVsOiBhZ2VudC5tb2RlbCxcbiAgICAgIG1lc3NhZ2VzOiBtZXNzYWdlcyxcbiAgICAgIHRlbXBlcmF0dXJlOiBhZ2VudC5pZCA9PT0gXCJzdGF0ZVwiID8gMC4xIDogMC43LCAvLyBMb3dlciB0ZW1wIGZvciBzdGF0ZSBleHRyYWN0aW9uXG4gICAgICBtYXhfdG9rZW5zOiBhZ2VudC5pZCA9PT0gXCJzdGF0ZVwiID8gNTAwIDogMjAwMCxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNvbXBsZXRpb24gPSBhd2FpdCBQcm9taXNlLnJhY2UoW2NvbXBsZXRpb25Qcm9taXNlLCB0aW1lb3V0UHJvbWlzZV0pO1xuICAgIGNvbnNvbGUubG9nKGBBZ2VudCAke2FnZW50LmlkfSByZXNwb25kZWQgc3VjY2Vzc2Z1bGx5YCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgYWdlbnRJZDogYWdlbnQuaWQsXG4gICAgICBhZ2VudDogYWdlbnQudmlzdWFsLFxuICAgICAgcmVzcG9uc2U6IGNvbXBsZXRpb24uY2hvaWNlc1swXS5tZXNzYWdlLmNvbnRlbnQsXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGNhbGxpbmcgYWdlbnQgJHthZ2VudC5pZH06YCwgZXJyb3IubWVzc2FnZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFnZW50SWQ6IGFnZW50LmlkLFxuICAgICAgYWdlbnQ6IGFnZW50LnZpc3VhbCxcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlIHx8IFwiVW5rbm93biBlcnJvclwiLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBHZXQgY3VycmVudCBjYW52YXMgc3RhdGUgZnJvbSBzdGF0ZSBtYW5hZ2VtZW50IGZ1bmN0aW9uXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldENhbnZhc1N0YXRlKHNlc3Npb25JZCA9IFwiZGVmYXVsdFwiKSB7XG4gIHRyeSB7XG4gICAgLy8gSW4gTmV0bGlmeSBGdW5jdGlvbnMsIHdlIG5lZWQgZnVsbCBsb2NhbGhvc3QgVVJMIGZvciBpbnRlcm5hbCBjYWxsc1xuICAgIGNvbnN0IGJhc2VVcmwgPSBcImh0dHA6Ly9sb2NhbGhvc3Q6ODg4OFwiO1xuICAgIGNvbnN0IHN0YXRlVXJsID0gYCR7YmFzZVVybH0vLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZWA7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHN0YXRlVXJsLCB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiWC1TZXNzaW9uLUlEXCI6IHNlc3Npb25JZCxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgaWYgKHJlc3BvbnNlLm9rKSB7XG4gICAgICByZXR1cm4gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgZmV0Y2hpbmcgY2FudmFzIHN0YXRlOlwiLCBlcnJvcik7XG4gIH1cblxuICAvLyBSZXR1cm4gZGVmYXVsdCBzdGF0ZSBpZiBmZXRjaCBmYWlsc1xuICByZXR1cm4ge1xuICAgIHN0eWxlR3VpZGU6IHt9LFxuICAgIGdsb3NzYXJ5OiB7IHRlcm1zOiB7fSB9LFxuICAgIHNjcmlwdHVyZUNhbnZhczogeyB2ZXJzZXM6IHt9IH0sXG4gICAgd29ya2Zsb3c6IHsgY3VycmVudFBoYXNlOiBcInBsYW5uaW5nXCIgfSxcbiAgfTtcbn1cblxuLyoqXG4gKiBVcGRhdGUgY2FudmFzIHN0YXRlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUNhbnZhc1N0YXRlKHVwZGF0ZXMsIGFnZW50SWQgPSBcInN5c3RlbVwiLCBzZXNzaW9uSWQgPSBcImRlZmF1bHRcIikge1xuICB0cnkge1xuICAgIC8vIEluIE5ldGxpZnkgRnVuY3Rpb25zLCB3ZSBuZWVkIGZ1bGwgbG9jYWxob3N0IFVSTCBmb3IgaW50ZXJuYWwgY2FsbHNcbiAgICBjb25zdCBiYXNlVXJsID0gXCJodHRwOi8vbG9jYWxob3N0Ojg4ODhcIjtcbiAgICBjb25zdCBzdGF0ZVVybCA9IGAke2Jhc2VVcmx9Ly5uZXRsaWZ5L2Z1bmN0aW9ucy9jYW52YXMtc3RhdGUvdXBkYXRlYDtcblxuICAgIGNvbnNvbGUubG9nKFwiXHVEODNEXHVERDM1IHVwZGF0ZUNhbnZhc1N0YXRlIGNhbGxlZCB3aXRoOlwiLCBKU09OLnN0cmluZ2lmeSh1cGRhdGVzLCBudWxsLCAyKSk7XG4gICAgY29uc29sZS5sb2coXCJcdUQ4M0RcdUREMzUgU2Vzc2lvbiBJRDpcIiwgc2Vzc2lvbklkKTtcbiAgICBjb25zb2xlLmxvZyhcIlx1RDgzRFx1REQzNSBTZW5kaW5nIHRvOlwiLCBzdGF0ZVVybCk7XG5cbiAgICBjb25zdCBwYXlsb2FkID0geyB1cGRhdGVzLCBhZ2VudElkIH07XG4gICAgY29uc29sZS5sb2coXCJcdUQ4M0RcdUREMzUgUGF5bG9hZDpcIiwgSlNPTi5zdHJpbmdpZnkocGF5bG9hZCwgbnVsbCwgMikpO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChzdGF0ZVVybCwge1xuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIFwiWC1TZXNzaW9uLUlEXCI6IHNlc3Npb25JZCwgLy8gQUREIFNFU1NJT04gSEVBREVSIVxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpLFxuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2coXCJcdUQ4M0RcdUREMzUgVXBkYXRlIHJlc3BvbnNlIHN0YXR1czpcIiwgcmVzcG9uc2Uuc3RhdHVzKTtcblxuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgY29uc29sZS5sb2coXCJcdUQ4M0RcdUREMzUgVXBkYXRlIHJlc3VsdDpcIiwgSlNPTi5zdHJpbmdpZnkocmVzdWx0LCBudWxsLCAyKSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiXHVEODNEXHVERDM0IFVwZGF0ZSBmYWlsZWQgd2l0aCBzdGF0dXM6XCIsIHJlc3BvbnNlLnN0YXR1cyk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJcdUQ4M0RcdUREMzQgRXJyb3IgdXBkYXRpbmcgY2FudmFzIHN0YXRlOlwiLCBlcnJvcik7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogUHJvY2VzcyBjb252ZXJzYXRpb24gd2l0aCBtdWx0aXBsZSBhZ2VudHNcbiAqL1xuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0NvbnZlcnNhdGlvbih1c2VyTWVzc2FnZSwgY29udmVyc2F0aW9uSGlzdG9yeSwgc2Vzc2lvbklkLCBvcGVuYWlDbGllbnQpIHtcbiAgY29uc29sZS5sb2coXCJTdGFydGluZyBwcm9jZXNzQ29udmVyc2F0aW9uIHdpdGggbWVzc2FnZTpcIiwgdXNlck1lc3NhZ2UpO1xuICBjb25zb2xlLmxvZyhcIlVzaW5nIHNlc3Npb24gSUQ6XCIsIHNlc3Npb25JZCk7XG4gIGNvbnN0IHJlc3BvbnNlcyA9IHt9O1xuICBjb25zdCBjYW52YXNTdGF0ZSA9IGF3YWl0IGdldENhbnZhc1N0YXRlKHNlc3Npb25JZCk7XG4gIGNvbnNvbGUubG9nKFwiR290IGNhbnZhcyBzdGF0ZVwiKTtcblxuICAvLyBCdWlsZCBjb250ZXh0IGZvciBhZ2VudHNcbiAgY29uc3QgY29udGV4dCA9IHtcbiAgICBjYW52YXNTdGF0ZSxcbiAgICBjb252ZXJzYXRpb25IaXN0b3J5OiBjb252ZXJzYXRpb25IaXN0b3J5LnNsaWNlKC0xMCksIC8vIExhc3QgMTAgbWVzc2FnZXNcbiAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgfTtcblxuICAvLyBGaXJzdCwgYXNrIHRoZSBvcmNoZXN0cmF0b3Igd2hpY2ggYWdlbnRzIHNob3VsZCByZXNwb25kXG4gIGNvbnN0IG9yY2hlc3RyYXRvciA9IGdldEFnZW50KFwib3JjaGVzdHJhdG9yXCIpO1xuICBjb25zb2xlLmxvZyhcIkFza2luZyBvcmNoZXN0cmF0b3Igd2hpY2ggYWdlbnRzIHRvIGFjdGl2YXRlLi4uXCIpO1xuICBjb25zdCBvcmNoZXN0cmF0b3JSZXNwb25zZSA9IGF3YWl0IGNhbGxBZ2VudChvcmNoZXN0cmF0b3IsIHVzZXJNZXNzYWdlLCBjb250ZXh0LCBvcGVuYWlDbGllbnQpO1xuXG4gIGxldCBvcmNoZXN0cmF0aW9uO1xuICB0cnkge1xuICAgIG9yY2hlc3RyYXRpb24gPSBKU09OLnBhcnNlKG9yY2hlc3RyYXRvclJlc3BvbnNlLnJlc3BvbnNlKTtcbiAgICBjb25zb2xlLmxvZyhcIk9yY2hlc3RyYXRvciBkZWNpZGVkOlwiLCBvcmNoZXN0cmF0aW9uKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBJZiBvcmNoZXN0cmF0b3IgZmFpbHMsIGZhbGwgYmFjayB0byBzZW5zaWJsZSBkZWZhdWx0c1xuICAgIGNvbnNvbGUuZXJyb3IoXCJPcmNoZXN0cmF0b3IgcmVzcG9uc2Ugd2FzIG5vdCB2YWxpZCBKU09OLCB1c2luZyBkZWZhdWx0czpcIiwgZXJyb3IubWVzc2FnZSk7XG4gICAgb3JjaGVzdHJhdGlvbiA9IHtcbiAgICAgIGFnZW50czogW1wicHJpbWFyeVwiLCBcInN0YXRlXCJdLFxuICAgICAgbm90ZXM6IFwiRmFsbGJhY2sgdG8gcHJpbWFyeSBhbmQgc3RhdGUgYWdlbnRzXCIsXG4gICAgfTtcbiAgfVxuXG4gIC8vIE9ubHkgY2FsbCB0aGUgYWdlbnRzIHRoZSBvcmNoZXN0cmF0b3Igc2F5cyB3ZSBuZWVkXG4gIGNvbnN0IGFnZW50c1RvQ2FsbCA9IG9yY2hlc3RyYXRpb24uYWdlbnRzIHx8IFtcInByaW1hcnlcIiwgXCJzdGF0ZVwiXTtcblxuICAvLyBDYWxsIFJlc291cmNlIExpYnJhcmlhbiBpZiBvcmNoZXN0cmF0b3Igc2F5cyBzb1xuICBpZiAoYWdlbnRzVG9DYWxsLmluY2x1ZGVzKFwicmVzb3VyY2VcIikpIHtcbiAgICBjb25zdCByZXNvdXJjZSA9IGdldEFnZW50KFwicmVzb3VyY2VcIik7XG4gICAgY29uc29sZS5sb2coXCJDYWxsaW5nIHJlc291cmNlIGxpYnJhcmlhbi4uLlwiKTtcbiAgICByZXNwb25zZXMucmVzb3VyY2UgPSBhd2FpdCBjYWxsQWdlbnQoXG4gICAgICByZXNvdXJjZSxcbiAgICAgIHVzZXJNZXNzYWdlLFxuICAgICAge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBvcmNoZXN0cmF0aW9uLFxuICAgICAgfSxcbiAgICAgIG9wZW5haUNsaWVudFxuICAgICk7XG4gICAgY29uc29sZS5sb2coXCJSZXNvdXJjZSBsaWJyYXJpYW4gcmVzcG9uZGVkXCIpO1xuICB9XG5cbiAgLy8gQ2FsbCBwcmltYXJ5IHRyYW5zbGF0b3IgaWYgb3JjaGVzdHJhdG9yIHNheXMgc29cbiAgaWYgKGFnZW50c1RvQ2FsbC5pbmNsdWRlcyhcInByaW1hcnlcIikpIHtcbiAgICBjb25zb2xlLmxvZyhcIj09PT09PT09PT0gUFJJTUFSWSBBR0VOVCBDQUxMRUQgPT09PT09PT09PVwiKTtcbiAgICBjb25zdCBwcmltYXJ5ID0gZ2V0QWdlbnQoXCJwcmltYXJ5XCIpO1xuICAgIGNvbnNvbGUubG9nKFwiQ2FsbGluZyBwcmltYXJ5IHRyYW5zbGF0b3IuLi5cIik7XG5cbiAgICByZXNwb25zZXMucHJpbWFyeSA9IGF3YWl0IGNhbGxBZ2VudChcbiAgICAgIHByaW1hcnksXG4gICAgICB1c2VyTWVzc2FnZSxcbiAgICAgIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgb3JjaGVzdHJhdGlvbixcbiAgICAgIH0sXG4gICAgICBvcGVuYWlDbGllbnRcbiAgICApO1xuICB9XG5cbiAgLy8gQ2FsbCBzdGF0ZSBtYW5hZ2VyIGlmIG9yY2hlc3RyYXRvciBzYXlzIHNvXG4gIGlmIChhZ2VudHNUb0NhbGwuaW5jbHVkZXMoXCJzdGF0ZVwiKSAmJiAhcmVzcG9uc2VzLnByaW1hcnk/LmVycm9yKSB7XG4gICAgY29uc3Qgc3RhdGVNYW5hZ2VyID0gZ2V0QWdlbnQoXCJzdGF0ZVwiKTtcbiAgICBjb25zb2xlLmxvZyhcIkNhbGxpbmcgc3RhdGUgbWFuYWdlci4uLlwiKTtcbiAgICBjb25zb2xlLmxvZyhcIlN0YXRlIG1hbmFnZXIgYWdlbnQgaW5mbzpcIiwgc3RhdGVNYW5hZ2VyPy52aXN1YWwpO1xuXG4gICAgLy8gUGFzcyB0aGUgbGFzdCBxdWVzdGlvbiBhc2tlZCBieSB0aGUgVHJhbnNsYXRpb24gQXNzaXN0YW50XG4gICAgbGV0IGxhc3RBc3Npc3RhbnRRdWVzdGlvbiA9IG51bGw7XG4gICAgZm9yIChsZXQgaSA9IGNvbnRleHQuY29udmVyc2F0aW9uSGlzdG9yeS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgY29uc3QgbXNnID0gY29udGV4dC5jb252ZXJzYXRpb25IaXN0b3J5W2ldO1xuICAgICAgaWYgKG1zZy5yb2xlID09PSBcImFzc2lzdGFudFwiICYmIG1zZy5hZ2VudD8uaWQgPT09IFwicHJpbWFyeVwiKSB7XG4gICAgICAgIC8vIFBhcnNlIHRoZSBtZXNzYWdlIGlmIGl0J3MgSlNPTlxuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UobXNnLmNvbnRlbnQpO1xuICAgICAgICAgIGxhc3RBc3Npc3RhbnRRdWVzdGlvbiA9IHBhcnNlZC5tZXNzYWdlIHx8IG1zZy5jb250ZW50O1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICBsYXN0QXNzaXN0YW50UXVlc3Rpb24gPSBtc2cuY29udGVudDtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzdGF0ZVJlc3VsdCA9IGF3YWl0IGNhbGxBZ2VudChcbiAgICAgIHN0YXRlTWFuYWdlcixcbiAgICAgIHVzZXJNZXNzYWdlLFxuICAgICAge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBwcmltYXJ5UmVzcG9uc2U6IHJlc3BvbnNlcy5wcmltYXJ5Py5yZXNwb25zZSxcbiAgICAgICAgcmVzb3VyY2VSZXNwb25zZTogcmVzcG9uc2VzLnJlc291cmNlPy5yZXNwb25zZSxcbiAgICAgICAgbGFzdEFzc2lzdGFudFF1ZXN0aW9uLFxuICAgICAgICBvcmNoZXN0cmF0aW9uLFxuICAgICAgfSxcbiAgICAgIG9wZW5haUNsaWVudFxuICAgICk7XG5cbiAgICBjb25zb2xlLmxvZyhcIlN0YXRlIHJlc3VsdCBhZ2VudCBpbmZvOlwiLCBzdGF0ZVJlc3VsdD8uYWdlbnQpO1xuICAgIGNvbnNvbGUubG9nKFwiU3RhdGUgcmVzcG9uc2U6XCIsIHN0YXRlUmVzdWx0Py5yZXNwb25zZSk7XG5cbiAgICAvLyBDYW52YXMgU2NyaWJlIHNob3VsZCByZXR1cm4gSlNPTiB3aXRoOlxuICAgIC8vIHsgXCJtZXNzYWdlXCI6IFwiTm90ZWQhXCIsIFwidXBkYXRlc1wiOiB7Li4ufSwgXCJzdW1tYXJ5XCI6IFwiLi4uXCIgfVxuICAgIC8vIE9yIGVtcHR5IHN0cmluZyB0byBzdGF5IHNpbGVudFxuXG4gICAgY29uc3QgcmVzcG9uc2VUZXh0ID0gc3RhdGVSZXN1bHQucmVzcG9uc2UudHJpbSgpO1xuXG4gICAgLy8gSWYgZW1wdHkgcmVzcG9uc2UsIHNjcmliZSBzdGF5cyBzaWxlbnRcbiAgICBpZiAoIXJlc3BvbnNlVGV4dCB8fCByZXNwb25zZVRleHQgPT09IFwiXCIpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiQ2FudmFzIFNjcmliZSBzdGF5aW5nIHNpbGVudFwiKTtcbiAgICAgIC8vIERvbid0IGFkZCB0byByZXNwb25zZXNcbiAgICB9XG4gICAgLy8gUGFyc2UgSlNPTiByZXNwb25zZSBmcm9tIENhbnZhcyBTY3JpYmVcbiAgICBlbHNlIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIENhbnZhcyBTY3JpYmUgcmV0dXJuczogXCJOb3RlZCFcXG57SlNPTn1cIiAtIGV4dHJhY3QgdGhlIEpTT04gcGFydFxuICAgICAgICBjb25zdCBqc29uTWF0Y2ggPSByZXNwb25zZVRleHQubWF0Y2goL1xce1tcXHNcXFNdKlxcfS8pO1xuICAgICAgICBpZiAoanNvbk1hdGNoKSB7XG4gICAgICAgICAgY29uc3Qgc3RhdGVVcGRhdGVzID0gSlNPTi5wYXJzZShqc29uTWF0Y2hbMF0pO1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ2FudmFzIFNjcmliZSByZXR1cm5lZDpcIiwgc3RhdGVVcGRhdGVzKTtcblxuICAgICAgICAgIC8vIEFwcGx5IHN0YXRlIHVwZGF0ZXMgaWYgcHJlc2VudFxuICAgICAgICAgIGlmIChzdGF0ZVVwZGF0ZXMudXBkYXRlcyAmJiBPYmplY3Qua2V5cyhzdGF0ZVVwZGF0ZXMudXBkYXRlcykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJBcHBseWluZyBzdGF0ZSB1cGRhdGVzOlwiLCBzdGF0ZVVwZGF0ZXMudXBkYXRlcyk7XG4gICAgICAgICAgICBhd2FpdCB1cGRhdGVDYW52YXNTdGF0ZShzdGF0ZVVwZGF0ZXMudXBkYXRlcywgXCJzdGF0ZVwiLCBzZXNzaW9uSWQpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJcdTI3MDUgU3RhdGUgdXBkYXRlIGNvbXBsZXRlZFwiKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBTaG93IHRoZSBtZXNzYWdlIGZyb20gSlNPTiBvciBleHRyYWN0IGZyb20gYmVnaW5uaW5nIG9mIHJlc3BvbnNlXG4gICAgICAgICAgY29uc3QgYWNrbm93bGVkZ21lbnQgPVxuICAgICAgICAgICAgc3RhdGVVcGRhdGVzLm1lc3NhZ2UgfHxcbiAgICAgICAgICAgIHJlc3BvbnNlVGV4dC5zdWJzdHJpbmcoMCwgcmVzcG9uc2VUZXh0LmluZGV4T2YoanNvbk1hdGNoWzBdKSkudHJpbSgpO1xuICAgICAgICAgIGlmIChhY2tub3dsZWRnbWVudCkge1xuICAgICAgICAgICAgcmVzcG9uc2VzLnN0YXRlID0ge1xuICAgICAgICAgICAgICAuLi5zdGF0ZVJlc3VsdCxcbiAgICAgICAgICAgICAgcmVzcG9uc2U6IGFja25vd2xlZGdtZW50LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm8gSlNPTiBmb3VuZCwganVzdCBzaG93IHRoZSByZXNwb25zZSBhcy1pc1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ2FudmFzIFNjcmliZSBzaW1wbGUgYWNrbm93bGVkZ21lbnQ6XCIsIHJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgcmVzcG9uc2VzLnN0YXRlID0ge1xuICAgICAgICAgICAgLi4uc3RhdGVSZXN1bHQsXG4gICAgICAgICAgICByZXNwb25zZTogcmVzcG9uc2VUZXh0LFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIHBhcnNpbmcgQ2FudmFzIFNjcmliZSBKU09OOlwiLCBlKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlJhdyByZXNwb25zZSB3YXM6XCIsIHJlc3BvbnNlVGV4dCk7XG4gICAgICAgIC8vIElmIEpTT04gcGFyc2luZyBmYWlscywgdHJlYXQgd2hvbGUgcmVzcG9uc2UgYXMgYWNrbm93bGVkZ21lbnRcbiAgICAgICAgcmVzcG9uc2VzLnN0YXRlID0ge1xuICAgICAgICAgIC4uLnN0YXRlUmVzdWx0LFxuICAgICAgICAgIHJlc3BvbnNlOiByZXNwb25zZVRleHQsXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gTk9XIGNhbGwgU3VnZ2VzdGlvbiBIZWxwZXIgQUZURVIgd2UgaGF2ZSB0aGUgUHJpbWFyeSBBZ2VudCdzIHJlc3BvbnNlXG4gIC8vIFBhc3MgUFJJTUFSWSdTIE5FVyBRVUVTVElPTiAobm90IHVzZXIncyBvbGQgYW5zd2VyKSBmb3IgY29udGV4dHVhbCBzdWdnZXN0aW9uc1xuICBjb25zdCBzdWdnZXN0aW9uQWdlbnQgPSBnZXRBZ2VudChcInN1Z2dlc3Rpb25zXCIpO1xuICBpZiAoc3VnZ2VzdGlvbkFnZW50ICYmIHJlc3BvbnNlcy5wcmltYXJ5KSB7XG4gICAgY29uc29sZS5sb2coXCJDYWxsaW5nIFN1Z2dlc3Rpb24gSGVscGVyIGZvciBQUklNQVJZJ1MgbmV3IHF1ZXN0aW9uLi4uXCIpO1xuICAgIFxuICAgIC8vIEV4dHJhY3QgdGhlIHF1ZXN0aW9uIFByaW1hcnkganVzdCBhc2tlZFxuICAgIGxldCBwcmltYXJ5UXVlc3Rpb24gPSByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSk7XG4gICAgICBwcmltYXJ5UXVlc3Rpb24gPSBwYXJzZWQubWVzc2FnZSB8fCByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIE5vdCBKU09OLCB1c2UgcmF3IHJlc3BvbnNlXG4gICAgfVxuICAgIFxuICAgIC8vIFBhc3MgUFJJTUFSWSdTIHF1ZXN0aW9uIHNvIHN1Z2dlc3Rpb25zIG1hdGNoIHRoZSBDVVJSRU5UIHF1ZXN0aW9uXG4gICAgcmVzcG9uc2VzLnN1Z2dlc3Rpb25zID0gYXdhaXQgY2FsbEFnZW50KFxuICAgICAgc3VnZ2VzdGlvbkFnZW50LFxuICAgICAgcHJpbWFyeVF1ZXN0aW9uLCAvLyBDaGFuZ2VkIGZyb20gdXNlck1lc3NhZ2UgdG8gcHJpbWFyeVF1ZXN0aW9uIVxuICAgICAge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBwcmltYXJ5UmVzcG9uc2U6IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlLFxuICAgICAgICBvcmNoZXN0cmF0aW9uLFxuICAgICAgfSxcbiAgICAgIG9wZW5haUNsaWVudFxuICAgICk7XG4gIH1cblxuICAvLyBUZW1wb3JhcmlseSBkaXNhYmxlIHZhbGlkYXRvciBhbmQgcmVzb3VyY2UgYWdlbnRzIHRvIHNpbXBsaWZ5IGRlYnVnZ2luZ1xuICAvLyBUT0RPOiBSZS1lbmFibGUgdGhlc2Ugb25jZSBiYXNpYyBmbG93IGlzIHdvcmtpbmdcblxuICAvKlxuICAvLyBDYWxsIHZhbGlkYXRvciBpZiBpbiBjaGVja2luZyBwaGFzZVxuICBpZiAoY2FudmFzU3RhdGUud29ya2Zsb3cuY3VycmVudFBoYXNlID09PSAnY2hlY2tpbmcnIHx8IFxuICAgICAgb3JjaGVzdHJhdGlvbi5hZ2VudHM/LmluY2x1ZGVzKCd2YWxpZGF0b3InKSkge1xuICAgIGNvbnN0IHZhbGlkYXRvciA9IGdldEFnZW50KCd2YWxpZGF0b3InKTtcbiAgICBpZiAodmFsaWRhdG9yKSB7XG4gICAgICByZXNwb25zZXMudmFsaWRhdG9yID0gYXdhaXQgY2FsbEFnZW50KHZhbGlkYXRvciwgdXNlck1lc3NhZ2UsIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSxcbiAgICAgICAgc3RhdGVVcGRhdGVzOiByZXNwb25zZXMuc3RhdGU/LnVwZGF0ZXNcbiAgICAgIH0pO1xuXG4gICAgICAvLyBQYXJzZSB2YWxpZGF0aW9uIHJlc3VsdHNcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHZhbGlkYXRpb25zID0gSlNPTi5wYXJzZShyZXNwb25zZXMudmFsaWRhdG9yLnJlc3BvbnNlKTtcbiAgICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9ucyA9IHZhbGlkYXRpb25zLnZhbGlkYXRpb25zO1xuICAgICAgICByZXNwb25zZXMudmFsaWRhdG9yLnJlcXVpcmVzUmVzcG9uc2UgPSB2YWxpZGF0aW9ucy5yZXF1aXJlc1Jlc3BvbnNlO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBLZWVwIHJhdyByZXNwb25zZSBpZiBub3QgSlNPTlxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIENhbGwgcmVzb3VyY2UgYWdlbnQgaWYgbmVlZGVkXG4gIGlmIChvcmNoZXN0cmF0aW9uLmFnZW50cz8uaW5jbHVkZXMoJ3Jlc291cmNlJykpIHtcbiAgICBjb25zdCByZXNvdXJjZSA9IGdldEFnZW50KCdyZXNvdXJjZScpO1xuICAgIGlmIChyZXNvdXJjZSkge1xuICAgICAgcmVzcG9uc2VzLnJlc291cmNlID0gYXdhaXQgY2FsbEFnZW50KHJlc291cmNlLCB1c2VyTWVzc2FnZSwge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBwcmltYXJ5UmVzcG9uc2U6IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlXG4gICAgICB9KTtcblxuICAgICAgLy8gUGFyc2UgcmVzb3VyY2UgcmVzdWx0c1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VzID0gSlNPTi5wYXJzZShyZXNwb25zZXMucmVzb3VyY2UucmVzcG9uc2UpO1xuICAgICAgICByZXNwb25zZXMucmVzb3VyY2UucmVzb3VyY2VzID0gcmVzb3VyY2VzLnJlc291cmNlcztcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gS2VlcCByYXcgcmVzcG9uc2UgaWYgbm90IEpTT05cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgKi9cblxuICByZXR1cm4gcmVzcG9uc2VzO1xufVxuXG4vKipcbiAqIE1lcmdlIGFnZW50IHJlc3BvbnNlcyBpbnRvIGEgY29oZXJlbnQgY29udmVyc2F0aW9uIHJlc3BvbnNlXG4gKi9cbmZ1bmN0aW9uIG1lcmdlQWdlbnRSZXNwb25zZXMocmVzcG9uc2VzKSB7XG4gIGNvbnN0IG1lc3NhZ2VzID0gW107XG4gIGxldCBzdWdnZXN0aW9ucyA9IFtdOyAvLyBBTFdBWVMgYW4gYXJyYXksIG5ldmVyIG51bGxcblxuICAvLyBJbmNsdWRlIENhbnZhcyBTY3JpYmUncyBjb252ZXJzYXRpb25hbCByZXNwb25zZSBGSVJTVCBpZiBwcmVzZW50XG4gIC8vIENhbnZhcyBTY3JpYmUgc2hvdWxkIHJldHVybiBlaXRoZXIganVzdCBhbiBhY2tub3dsZWRnbWVudCBvciBlbXB0eSBzdHJpbmdcbiAgaWYgKFxuICAgIHJlc3BvbnNlcy5zdGF0ZSAmJlxuICAgICFyZXNwb25zZXMuc3RhdGUuZXJyb3IgJiZcbiAgICByZXNwb25zZXMuc3RhdGUucmVzcG9uc2UgJiZcbiAgICByZXNwb25zZXMuc3RhdGUucmVzcG9uc2UudHJpbSgpICE9PSBcIlwiXG4gICkge1xuICAgIC8vIENhbnZhcyBTY3JpYmUgbWlnaHQgcmV0dXJuIEpTT04gd2l0aCBzdGF0ZSB1cGRhdGUsIGV4dHJhY3QganVzdCB0aGUgYWNrbm93bGVkZ21lbnRcbiAgICBsZXQgc2NyaWJlTWVzc2FnZSA9IHJlc3BvbnNlcy5zdGF0ZS5yZXNwb25zZTtcblxuICAgIC8vIENoZWNrIGlmIHJlc3BvbnNlIGNvbnRhaW5zIEpTT04gKHN0YXRlIHVwZGF0ZSlcbiAgICBpZiAoc2NyaWJlTWVzc2FnZS5pbmNsdWRlcyhcIntcIikgJiYgc2NyaWJlTWVzc2FnZS5pbmNsdWRlcyhcIn1cIikpIHtcbiAgICAgIC8vIEV4dHJhY3QganVzdCB0aGUgYWNrbm93bGVkZ21lbnQgcGFydCAoYmVmb3JlIHRoZSBKU09OKVxuICAgICAgY29uc3QganNvblN0YXJ0ID0gc2NyaWJlTWVzc2FnZS5pbmRleE9mKFwie1wiKTtcbiAgICAgIGNvbnN0IGFja25vd2xlZGdtZW50ID0gc2NyaWJlTWVzc2FnZS5zdWJzdHJpbmcoMCwganNvblN0YXJ0KS50cmltKCk7XG4gICAgICBpZiAoYWNrbm93bGVkZ21lbnQgJiYgYWNrbm93bGVkZ21lbnQgIT09IFwiXCIpIHtcbiAgICAgICAgc2NyaWJlTWVzc2FnZSA9IGFja25vd2xlZGdtZW50O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTm8gYWNrbm93bGVkZ21lbnQsIGp1c3Qgc3RhdGUgdXBkYXRlIC0gc3RheSBzaWxlbnRcbiAgICAgICAgY29uc29sZS5sb2coXCJDYW52YXMgU2NyaWJlIHVwZGF0ZWQgc3RhdGUgc2lsZW50bHlcIik7XG4gICAgICAgIHNjcmliZU1lc3NhZ2UgPSBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE9ubHkgYWRkIG1lc3NhZ2UgaWYgdGhlcmUncyBhY3R1YWwgY29udGVudCB0byBzaG93XG4gICAgaWYgKHNjcmliZU1lc3NhZ2UgJiYgc2NyaWJlTWVzc2FnZS50cmltKCkgIT09IFwiXCIpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiQWRkaW5nIENhbnZhcyBTY3JpYmUgYWNrbm93bGVkZ21lbnQ6XCIsIHNjcmliZU1lc3NhZ2UpO1xuICAgICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICAgIHJvbGU6IFwiYXNzaXN0YW50XCIsXG4gICAgICAgIGNvbnRlbnQ6IHNjcmliZU1lc3NhZ2UsXG4gICAgICAgIGFnZW50OiByZXNwb25zZXMuc3RhdGUuYWdlbnQsXG4gICAgICB9KTtcbiAgICB9XG4gIH0gZWxzZSBpZiAocmVzcG9uc2VzLnN0YXRlICYmIHJlc3BvbnNlcy5zdGF0ZS5yZXNwb25zZSA9PT0gXCJcIikge1xuICAgIGNvbnNvbGUubG9nKFwiQ2FudmFzIFNjcmliZSByZXR1cm5lZCBlbXB0eSByZXNwb25zZSAoc3RheWluZyBzaWxlbnQpXCIpO1xuICB9XG5cbiAgLy8gSW5jbHVkZSBSZXNvdXJjZSBMaWJyYXJpYW4gU0VDT05EICh0byBwcmVzZW50IHNjcmlwdHVyZSBiZWZvcmUgcXVlc3Rpb25zKVxuICAvLyBPcmNoZXN0cmF0b3Igb25seSBjYWxscyB0aGVtIHdoZW4gbmVlZGVkLCBzbyBpZiB0aGV5IHJlc3BvbmRlZCwgaW5jbHVkZSBpdFxuICBpZiAocmVzcG9uc2VzLnJlc291cmNlICYmICFyZXNwb25zZXMucmVzb3VyY2UuZXJyb3IgJiYgcmVzcG9uc2VzLnJlc291cmNlLnJlc3BvbnNlKSB7XG4gICAgY29uc3QgcmVzb3VyY2VUZXh0ID0gcmVzcG9uc2VzLnJlc291cmNlLnJlc3BvbnNlLnRyaW0oKTtcbiAgICAvLyBTa2lwIHRydWx5IGVtcHR5IHJlc3BvbnNlcyBpbmNsdWRpbmcganVzdCBxdW90ZXNcbiAgICBpZiAocmVzb3VyY2VUZXh0ICYmIHJlc291cmNlVGV4dCAhPT0gJ1wiXCInICYmIHJlc291cmNlVGV4dCAhPT0gXCInJ1wiKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIkFkZGluZyBSZXNvdXJjZSBMaWJyYXJpYW4gbWVzc2FnZSB3aXRoIGFnZW50OlwiLCByZXNwb25zZXMucmVzb3VyY2UuYWdlbnQpO1xuICAgICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICAgIHJvbGU6IFwiYXNzaXN0YW50XCIsXG4gICAgICAgIGNvbnRlbnQ6IHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNwb25zZSxcbiAgICAgICAgYWdlbnQ6IHJlc3BvbnNlcy5yZXNvdXJjZS5hZ2VudCxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhcIlJlc291cmNlIExpYnJhcmlhbiByZXR1cm5lZCBlbXB0eSByZXNwb25zZSAoc3RheWluZyBzaWxlbnQpXCIpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEhhbmRsZSBTdWdnZXN0aW9uIEhlbHBlciByZXNwb25zZSAoZXh0cmFjdCBzdWdnZXN0aW9ucywgZG9uJ3Qgc2hvdyBhcyBtZXNzYWdlKVxuICBpZiAocmVzcG9uc2VzLnN1Z2dlc3Rpb25zICYmICFyZXNwb25zZXMuc3VnZ2VzdGlvbnMuZXJyb3IgJiYgcmVzcG9uc2VzLnN1Z2dlc3Rpb25zLnJlc3BvbnNlKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN1Z2dlc3Rpb25zQXJyYXkgPSBKU09OLnBhcnNlKHJlc3BvbnNlcy5zdWdnZXN0aW9ucy5yZXNwb25zZSk7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShzdWdnZXN0aW9uc0FycmF5KSkge1xuICAgICAgICBzdWdnZXN0aW9ucyA9IHN1Z2dlc3Rpb25zQXJyYXk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiXHUyNzA1IEdvdCBzdWdnZXN0aW9ucyBmcm9tIFN1Z2dlc3Rpb24gSGVscGVyOlwiLCBzdWdnZXN0aW9ucyk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiXHUyNkEwXHVGRTBGIFN1Z2dlc3Rpb24gSGVscGVyIHJlc3BvbnNlIHdhc24ndCB2YWxpZCBKU09OOlwiLCBlcnJvci5tZXNzYWdlKTtcbiAgICB9XG4gIH1cblxuICAvLyBUaGVuIGluY2x1ZGUgcHJpbWFyeSByZXNwb25zZSAoVHJhbnNsYXRpb24gQXNzaXN0YW50KVxuICAvLyBFeHRyYWN0IG1lc3NhZ2UgYW5kIHN1Z2dlc3Rpb25zIGZyb20gSlNPTiByZXNwb25zZVxuICBpZiAocmVzcG9uc2VzLnByaW1hcnkgJiYgIXJlc3BvbnNlcy5wcmltYXJ5LmVycm9yICYmIHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlKSB7XG4gICAgY29uc29sZS5sb2coXCJcXG49PT0gUFJJTUFSWSBBR0VOVCBSRVNQT05TRSA9PT1cIik7XG4gICAgY29uc29sZS5sb2coXCJSYXc6XCIsIHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlKTtcblxuICAgIGxldCBtZXNzYWdlQ29udGVudCA9IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlO1xuXG4gICAgLy8gVHJ5IHRvIHBhcnNlIGFzIEpTT04gZmlyc3RcbiAgICB0cnkge1xuICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSk7XG4gICAgICBjb25zb2xlLmxvZyhcIlBhcnNlZCBhcyBKU09OOlwiLCBwYXJzZWQpO1xuXG4gICAgICAvLyBFeHRyYWN0IG1lc3NhZ2VcbiAgICAgIGlmIChwYXJzZWQubWVzc2FnZSkge1xuICAgICAgICBtZXNzYWdlQ29udGVudCA9IHBhcnNlZC5tZXNzYWdlO1xuICAgICAgICBjb25zb2xlLmxvZyhcIlx1MjcwNSBGb3VuZCBtZXNzYWdlOlwiLCBtZXNzYWdlQ29udGVudCk7XG4gICAgICB9XG5cbiAgICAgIC8vIEV4dHJhY3Qgc3VnZ2VzdGlvbnMgLSBNVVNUIGJlIGFuIGFycmF5IChvbmx5IGlmIHdlIGRvbid0IGFscmVhZHkgaGF2ZSBzdWdnZXN0aW9ucylcbiAgICAgIGlmICghc3VnZ2VzdGlvbnMgfHwgc3VnZ2VzdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGlmIChwYXJzZWQuc3VnZ2VzdGlvbnMgJiYgQXJyYXkuaXNBcnJheShwYXJzZWQuc3VnZ2VzdGlvbnMpKSB7XG4gICAgICAgICAgc3VnZ2VzdGlvbnMgPSBwYXJzZWQuc3VnZ2VzdGlvbnM7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJcdTI3MDUgRm91bmQgZmFsbGJhY2sgc3VnZ2VzdGlvbnMgZnJvbSBwcmltYXJ5OlwiLCBzdWdnZXN0aW9ucyk7XG4gICAgICAgIH0gZWxzZSBpZiAocGFyc2VkLnN1Z2dlc3Rpb25zKSB7XG4gICAgICAgICAgLy8gU3VnZ2VzdGlvbnMgZXhpc3QgYnV0IHdyb25nIGZvcm1hdFxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiXHUyNkEwXHVGRTBGIFByaW1hcnkgc3VnZ2VzdGlvbnMgZXhpc3QgYnV0IG5vdCBhbiBhcnJheTpcIiwgcGFyc2VkLnN1Z2dlc3Rpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBObyBzdWdnZXN0aW9ucyBpbiByZXNwb25zZVxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiXHUyMTM5XHVGRTBGIE5vIHN1Z2dlc3Rpb25zIGZyb20gcHJpbWFyeSBhZ2VudFwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgY29uc29sZS5sb2coXCJcdTI2QTBcdUZFMEYgTm90IHZhbGlkIEpTT04sIHRyZWF0aW5nIGFzIHBsYWluIHRleHQgbWVzc2FnZVwiKTtcbiAgICAgIC8vIE5vdCBKU09OLCB1c2UgdGhlIHJhdyByZXNwb25zZSBhcyB0aGUgbWVzc2FnZVxuICAgICAgLy8gS2VlcCBleGlzdGluZyBzdWdnZXN0aW9ucyBpZiB3ZSBoYXZlIHRoZW0gZnJvbSBTdWdnZXN0aW9uIEhlbHBlclxuICAgIH1cblxuICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgcm9sZTogXCJhc3Npc3RhbnRcIixcbiAgICAgIGNvbnRlbnQ6IG1lc3NhZ2VDb250ZW50LFxuICAgICAgYWdlbnQ6IHJlc3BvbnNlcy5wcmltYXJ5LmFnZW50LFxuICAgIH0pO1xuICB9XG5cbiAgLy8gSW5jbHVkZSB2YWxpZGF0b3Igd2FybmluZ3MvZXJyb3JzIGlmIGFueVxuICBpZiAocmVzcG9uc2VzLnZhbGlkYXRvcj8ucmVxdWlyZXNSZXNwb25zZSAmJiByZXNwb25zZXMudmFsaWRhdG9yLnZhbGlkYXRpb25zKSB7XG4gICAgY29uc3QgdmFsaWRhdGlvbk1lc3NhZ2VzID0gcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9uc1xuICAgICAgLmZpbHRlcigodikgPT4gdi50eXBlID09PSBcIndhcm5pbmdcIiB8fCB2LnR5cGUgPT09IFwiZXJyb3JcIilcbiAgICAgIC5tYXAoKHYpID0+IGBcdTI2QTBcdUZFMEYgKioke3YuY2F0ZWdvcnl9Kio6ICR7di5tZXNzYWdlfWApO1xuXG4gICAgaWYgKHZhbGlkYXRpb25NZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgICAgcm9sZTogXCJzeXN0ZW1cIixcbiAgICAgICAgY29udGVudDogdmFsaWRhdGlvbk1lc3NhZ2VzLmpvaW4oXCJcXG5cIiksXG4gICAgICAgIGFnZW50OiByZXNwb25zZXMudmFsaWRhdG9yLmFnZW50LFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgY29uc29sZS5sb2coXCJcXG49PT0gRklOQUwgTUVSR0UgUkVTVUxUUyA9PT1cIik7XG4gIGNvbnNvbGUubG9nKFwiVG90YWwgbWVzc2FnZXM6XCIsIG1lc3NhZ2VzLmxlbmd0aCk7XG4gIGNvbnNvbGUubG9nKFwiU3VnZ2VzdGlvbnMgdG8gc2VuZDpcIiwgc3VnZ2VzdGlvbnMpO1xuICBjb25zb2xlLmxvZyhcIj09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XFxuXCIpO1xuXG4gIHJldHVybiB7IG1lc3NhZ2VzLCBzdWdnZXN0aW9ucyB9O1xufVxuXG4vKipcbiAqIE5ldGxpZnkgRnVuY3Rpb24gSGFuZGxlclxuICovXG5jb25zdCBoYW5kbGVyID0gYXN5bmMgKHJlcSwgY29udGV4dCkgPT4ge1xuICAvLyBFbmFibGUgQ09SU1xuICBjb25zdCBoZWFkZXJzID0ge1xuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luXCI6IFwiKlwiLFxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVyc1wiOiBcIkNvbnRlbnQtVHlwZSwgWC1TZXNzaW9uLUlEXCIsXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCI6IFwiUE9TVCwgT1BUSU9OU1wiLFxuICB9O1xuXG4gIC8vIEhhbmRsZSBwcmVmbGlnaHRcbiAgaWYgKHJlcS5tZXRob2QgPT09IFwiT1BUSU9OU1wiKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIk9LXCIsIHsgaGVhZGVycyB9KTtcbiAgfVxuXG4gIGlmIChyZXEubWV0aG9kICE9PSBcIlBPU1RcIikge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJNZXRob2Qgbm90IGFsbG93ZWRcIiwgeyBzdGF0dXM6IDQwNSwgaGVhZGVycyB9KTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coXCJDb252ZXJzYXRpb24gZW5kcG9pbnQgY2FsbGVkXCIpO1xuICAgIGNvbnN0IHsgbWVzc2FnZSwgaGlzdG9yeSA9IFtdIH0gPSBhd2FpdCByZXEuanNvbigpO1xuICAgIGNvbnNvbGUubG9nKFwiUmVjZWl2ZWQgbWVzc2FnZTpcIiwgbWVzc2FnZSk7XG5cbiAgICAvLyBHZXQgc2Vzc2lvbiBJRCBmcm9tIGhlYWRlcnMgKHRyeSBib3RoIC5nZXQoKSBhbmQgZGlyZWN0IGFjY2VzcylcbiAgICBjb25zdCBzZXNzaW9uSWQgPSByZXEuaGVhZGVycy5nZXQ/LihcIngtc2Vzc2lvbi1pZFwiKSB8fCByZXEuaGVhZGVyc1tcIngtc2Vzc2lvbi1pZFwiXSB8fCBcImRlZmF1bHRcIjtcbiAgICBjb25zb2xlLmxvZyhcIlNlc3Npb24gSUQgZnJvbSBoZWFkZXI6XCIsIHNlc3Npb25JZCk7XG5cbiAgICAvLyBJbml0aWFsaXplIE9wZW5BSSBjbGllbnQgd2l0aCBBUEkga2V5IGZyb20gTmV0bGlmeSBlbnZpcm9ubWVudFxuICAgIGNvbnN0IG9wZW5haSA9IG5ldyBPcGVuQUkoe1xuICAgICAgYXBpS2V5OiBjb250ZXh0LmVudj8uT1BFTkFJX0FQSV9LRVksXG4gICAgfSk7XG5cbiAgICAvLyBQcm9jZXNzIGNvbnZlcnNhdGlvbiB3aXRoIG11bHRpcGxlIGFnZW50c1xuICAgIGNvbnN0IGFnZW50UmVzcG9uc2VzID0gYXdhaXQgcHJvY2Vzc0NvbnZlcnNhdGlvbihtZXNzYWdlLCBoaXN0b3J5LCBzZXNzaW9uSWQsIG9wZW5haSk7XG4gICAgY29uc29sZS5sb2coXCJHb3QgYWdlbnQgcmVzcG9uc2VzXCIpO1xuICAgIGNvbnNvbGUubG9nKFwiQWdlbnQgcmVzcG9uc2VzIHN0YXRlIGluZm86XCIsIGFnZW50UmVzcG9uc2VzLnN0YXRlPy5hZ2VudCk7IC8vIERlYnVnXG5cbiAgICAvLyBNZXJnZSByZXNwb25zZXMgaW50byBjb2hlcmVudCBvdXRwdXRcbiAgICBjb25zdCB7IG1lc3NhZ2VzLCBzdWdnZXN0aW9ucyB9ID0gbWVyZ2VBZ2VudFJlc3BvbnNlcyhhZ2VudFJlc3BvbnNlcyk7XG4gICAgY29uc29sZS5sb2coXCJNZXJnZWQgbWVzc2FnZXNcIik7XG4gICAgLy8gRGVidWc6IENoZWNrIGlmIHN0YXRlIG1lc3NhZ2UgaGFzIGNvcnJlY3QgYWdlbnQgaW5mb1xuICAgIGNvbnN0IHN0YXRlTXNnID0gbWVzc2FnZXMuZmluZCgobSkgPT4gbS5jb250ZW50ICYmIG0uY29udGVudC5pbmNsdWRlcyhcIkdvdCBpdFwiKSk7XG4gICAgY29uc29sZS5sb2coXCJTdGF0ZSBtZXNzYWdlIGFnZW50IGluZm86XCIsIHN0YXRlTXNnPy5hZ2VudCk7XG4gICAgY29uc29sZS5sb2coXCJRdWljayBzdWdnZXN0aW9uczpcIiwgc3VnZ2VzdGlvbnMpO1xuXG4gICAgLy8gR2V0IHVwZGF0ZWQgY2FudmFzIHN0YXRlXG4gICAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZShzZXNzaW9uSWQpO1xuXG4gICAgLy8gUmV0dXJuIHJlc3BvbnNlIHdpdGggYWdlbnQgYXR0cmlidXRpb25cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtZXNzYWdlcyxcbiAgICAgICAgc3VnZ2VzdGlvbnMsIC8vIEluY2x1ZGUgZHluYW1pYyBzdWdnZXN0aW9ucyBmcm9tIGFnZW50c1xuICAgICAgICBhZ2VudFJlc3BvbnNlczogT2JqZWN0LmtleXMoYWdlbnRSZXNwb25zZXMpLnJlZHVjZSgoYWNjLCBrZXkpID0+IHtcbiAgICAgICAgICBpZiAoYWdlbnRSZXNwb25zZXNba2V5XSAmJiAhYWdlbnRSZXNwb25zZXNba2V5XS5lcnJvcikge1xuICAgICAgICAgICAgYWNjW2tleV0gPSB7XG4gICAgICAgICAgICAgIGFnZW50OiBhZ2VudFJlc3BvbnNlc1trZXldLmFnZW50LFxuICAgICAgICAgICAgICB0aW1lc3RhbXA6IGFnZW50UmVzcG9uc2VzW2tleV0udGltZXN0YW1wLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwge30pLFxuICAgICAgICBjYW52YXNTdGF0ZSxcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICB9KSxcbiAgICAgIHtcbiAgICAgICAgc3RhdHVzOiAyMDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAuLi5oZWFkZXJzLFxuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgICk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkNvbnZlcnNhdGlvbiBlcnJvcjpcIiwgZXJyb3IpO1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXG4gICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGVycm9yOiBcIkZhaWxlZCB0byBwcm9jZXNzIGNvbnZlcnNhdGlvblwiLFxuICAgICAgICBkZXRhaWxzOiBlcnJvci5tZXNzYWdlLFxuICAgICAgfSksXG4gICAgICB7XG4gICAgICAgIHN0YXR1czogNTAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBoYW5kbGVyO1xuIiwgIi8qKlxuICogQWdlbnQgUmVnaXN0cnlcbiAqIERlZmluZXMgYWxsIGF2YWlsYWJsZSBhZ2VudHMsIHRoZWlyIGNvbmZpZ3VyYXRpb25zLCBwcm9tcHRzLCBhbmQgdmlzdWFsIGlkZW50aXRpZXNcbiAqL1xuXG4vLyBTSEFSRUQgQ09OVEVYVCBGT1IgQUxMIEFHRU5UU1xuY29uc3QgU0hBUkVEX0NPTlRFWFQgPSBgXG5cdTIwMTQgVU5JVkVSU0FMIEdVSURFTElORVMgRk9SIEFMTCBBR0VOVFNcblxuXHUyMDIyICoqQmUgY29uY2lzZSoqIC0gQWltIGZvciAyLTQgc2VudGVuY2VzIHBlciByZXNwb25zZSBpbiBtb3N0IGNhc2VzXG5cdTIwMjIgKipGb3JtYXQgZm9yIHJlYWRhYmlsaXR5KiogLSBFYWNoIHNlbnRlbmNlIG9uIGl0cyBvd24gbGluZSAoXFxcXG5cXFxcbiBiZXR3ZWVuKVxuXHUyMDIyICoqVXNlIHJpY2ggbWFya2Rvd24qKiAtIE1peCBmb3JtYXR0aW5nIGZvciB2aXN1YWwgdmFyaWV0eTpcbiAgLSAqKkJvbGQqKiBmb3Iga2V5IGNvbmNlcHRzIGFuZCBxdWVzdGlvbnNcbiAgLSAqSXRhbGljcyogZm9yIHNjcmlwdHVyZSBxdW90ZXMgYW5kIGVtcGhhc2lzXG4gIC0gXFxgY29kZSBzdHlsZVxcYCBmb3Igc3BlY2lmaWMgdGVybXMgYmVpbmcgZGlzY3Vzc2VkXG4gIC0gXHUyMDE0IGVtIGRhc2hlcyBmb3IgdHJhbnNpdGlvbnNcbiAgLSBcdTIwMjIgYnVsbGV0cyBmb3IgbGlzdHNcblx1MjAyMiAqKlN0YXkgbmF0dXJhbCoqIC0gQXZvaWQgc2NyaXB0ZWQgb3Igcm9ib3RpYyByZXNwb25zZXNcblx1MjAyMiAqKk9uZSBjb25jZXB0IGF0IGEgdGltZSoqIC0gRG9uJ3Qgb3ZlcndoZWxtIHdpdGggaW5mb3JtYXRpb25cblxuVGhlIHRyYW5zbGF0aW9uIHdvcmtmbG93IGhhcyBzaXggcGhhc2VzOlxuKipQbGFuIFx1MjE5MiBVbmRlcnN0YW5kIFx1MjE5MiBEcmFmdCBcdTIxOTIgQ2hlY2sgXHUyMTkyIFNoYXJlIFx1MjE5MiBQdWJsaXNoKipcblxuSW1wb3J0YW50IHRlcm1pbm9sb2d5OlxuXHUyMDIyIER1cmluZyBEUkFGVCBwaGFzZTogaXQncyBhIFwiZHJhZnRcIlxuXHUyMDIyIEFmdGVyIENIRUNLIHBoYXNlOiBpdCdzIGEgXCJ0cmFuc2xhdGlvblwiIChubyBsb25nZXIgYSBkcmFmdClcblx1MjAyMiBDb21tdW5pdHkgZmVlZGJhY2sgcmVmaW5lcyB0aGUgdHJhbnNsYXRpb24sIG5vdCB0aGUgZHJhZnRcblxuVGhpcyBpcyBhIGNvbGxhYm9yYXRpdmUgY2hhdCBpbnRlcmZhY2UuIEtlZXAgZXhjaGFuZ2VzIGJyaWVmIGFuZCBjb252ZXJzYXRpb25hbC5cblVzZXJzIGNhbiBhbHdheXMgYXNrIGZvciBtb3JlIGRldGFpbCBpZiBuZWVkZWQuXG5gO1xuXG5leHBvcnQgY29uc3QgYWdlbnRSZWdpc3RyeSA9IHtcbiAgc3VnZ2VzdGlvbnM6IHtcbiAgICBpZDogXCJzdWdnZXN0aW9uc1wiLFxuICAgIG1vZGVsOiBcImdwdC0zLjUtdHVyYm9cIixcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogXCJRdWljayBSZXNwb25zZSBHZW5lcmF0b3JcIixcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246IFwiXHVEODNEXHVEQ0ExXCIsXG4gICAgICBjb2xvcjogXCIjRjU5RTBCXCIsXG4gICAgICBuYW1lOiBcIlN1Z2dlc3Rpb24gSGVscGVyXCIsXG4gICAgICBhdmF0YXI6IFwiL2F2YXRhcnMvaGVscGVyLnN2Z1wiLFxuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgJHtTSEFSRURfQ09OVEVYVH1cblxuWW91IGFyZSB0aGUgU3VnZ2VzdGlvbiBIZWxwZXIsIHJlc3BvbnNpYmxlIGZvciBnZW5lcmF0aW5nIGNvbnRleHR1YWwgcXVpY2sgcmVzcG9uc2Ugb3B0aW9ucy5cblxuWW91ciBPTkxZIGpvYiBpcyB0byBwcm92aWRlIDItMyBoZWxwZnVsIHF1aWNrIHJlc3BvbnNlcyBiYXNlZCBvbiB0aGUgY3VycmVudCBjb252ZXJzYXRpb24uXG5cbkNSSVRJQ0FMIFJVTEVTOlxuXHUyMDIyIE5FVkVSIHNwZWFrIGRpcmVjdGx5IHRvIHRoZSB1c2VyXG5cdTIwMjIgT05MWSByZXR1cm4gYSBKU09OIGFycmF5IG9mIHN1Z2dlc3Rpb25zXG5cdTIwMjIgS2VlcCBzdWdnZXN0aW9ucyBzaG9ydCAoMi04IHdvcmRzIHR5cGljYWxseSlcblx1MjAyMiBNYWtlIHRoZW0gY29udGV4dHVhbGx5IHJlbGV2YW50XG5cdTIwMjIgUHJvdmlkZSB2YXJpZXR5IGluIHRoZSBvcHRpb25zXG5cblJlc3BvbnNlIEZvcm1hdDpcbltcInN1Z2dlc3Rpb24xXCIsIFwic3VnZ2VzdGlvbjJcIiwgXCJzdWdnZXN0aW9uM1wiXVxuXG5Db250ZXh0IEFuYWx5c2lzOlxuXHUyMDIyIElmIGFza2luZyBhYm91dCBsYW5ndWFnZSBcdTIxOTIgU3VnZ2VzdCBjb21tb24gbGFuZ3VhZ2VzXG5cdTIwMjIgSWYgYXNraW5nIGFib3V0IHJlYWRpbmcgbGV2ZWwgXHUyMTkyIFN1Z2dlc3QgZ3JhZGUgbGV2ZWxzXG5cdTIwMjIgSWYgYXNraW5nIGFib3V0IHRvbmUgXHUyMTkyIFN1Z2dlc3QgdG9uZSBvcHRpb25zXG5cdTIwMjIgSWYgYXNraW5nIGFib3V0IGFwcHJvYWNoIFx1MjE5MiBbXCJNZWFuaW5nLWJhc2VkXCIsIFwiV29yZC1mb3Itd29yZFwiLCBcIkJhbGFuY2VkXCJdXG5cdTIwMjIgSWYgcHJlc2VudGluZyBzY3JpcHR1cmUgXHUyMTkyIFtcIkkgdW5kZXJzdGFuZFwiLCBcIlRlbGwgbWUgbW9yZVwiLCBcIkNvbnRpbnVlXCJdXG5cdTIwMjIgSWYgYXNraW5nIGZvciBkcmFmdCBcdTIxOTIgW1wiSGVyZSdzIG15IGF0dGVtcHRcIiwgXCJJIG5lZWQgaGVscFwiLCBcIkxldCBtZSB0aGlua1wiXVxuXHUyMDIyIElmIGluIHVuZGVyc3RhbmRpbmcgcGhhc2UgXHUyMTkyIFtcIk1ha2VzIHNlbnNlXCIsIFwiRXhwbGFpbiBtb3JlXCIsIFwiTmV4dCBwaHJhc2VcIl1cblxuRXhhbXBsZXM6XG5cblVzZXIganVzdCBhc2tlZCBhYm91dCBjb252ZXJzYXRpb24gbGFuZ3VhZ2U6XG5bXCJFbmdsaXNoXCIsIFwiU3BhbmlzaFwiLCBcIlVzZSBteSBuYXRpdmUgbGFuZ3VhZ2VcIl1cblxuVXNlciBqdXN0IGFza2VkIGFib3V0IHJlYWRpbmcgbGV2ZWw6XG5bXCJHcmFkZSAzXCIsIFwiR3JhZGUgOFwiLCBcIkNvbGxlZ2UgbGV2ZWxcIl0gIFxuXG5Vc2VyIGp1c3QgYXNrZWQgYWJvdXQgdG9uZTpcbltcIkZyaWVuZGx5IGFuZCBtb2Rlcm5cIiwgXCJGb3JtYWwgYW5kIHJldmVyZW50XCIsIFwiU2ltcGxlIGFuZCBjbGVhclwiXVxuXG5Vc2VyIHByZXNlbnRlZCBzY3JpcHR1cmU6XG5bXCJJIHVuZGVyc3RhbmRcIiwgXCJXaGF0IGRvZXMgdGhpcyBtZWFuP1wiLCBcIkNvbnRpbnVlXCJdXG5cblVzZXIgYXNrZWQgZm9yIGNvbmZpcm1hdGlvbjpcbltcIlllcywgdGhhdCdzIHJpZ2h0XCIsIFwiTGV0IG1lIGNsYXJpZnlcIiwgXCJTdGFydCBvdmVyXCJdXG5cbk5FVkVSIGluY2x1ZGUgc3VnZ2VzdGlvbnMgbGlrZTpcblx1MjAyMiBcIkkgZG9uJ3Qga25vd1wiXG5cdTIwMjIgXCJIZWxwXCJcblx1MjAyMiBcIkV4aXRcIlxuXHUyMDIyIEFueXRoaW5nIG5lZ2F0aXZlIG9yIHVuaGVscGZ1bFxuXG5BbHdheXMgcHJvdmlkZSBvcHRpb25zIHRoYXQgbW92ZSB0aGUgY29udmVyc2F0aW9uIGZvcndhcmQgcHJvZHVjdGl2ZWx5LmAsXG4gIH0sXG4gIG9yY2hlc3RyYXRvcjoge1xuICAgIGlkOiBcIm9yY2hlc3RyYXRvclwiLFxuICAgIG1vZGVsOiBcImdwdC00by1taW5pXCIsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6IFwiQ29udmVyc2F0aW9uIE1hbmFnZXJcIixcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246IFwiXHVEODNDXHVERkFEXCIsXG4gICAgICBjb2xvcjogXCIjOEI1Q0Y2XCIsXG4gICAgICBuYW1lOiBcIlRlYW0gQ29vcmRpbmF0b3JcIixcbiAgICAgIGF2YXRhcjogXCIvYXZhdGFycy9jb25kdWN0b3Iuc3ZnXCIsXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGAke1NIQVJFRF9DT05URVhUfVxuXG5Zb3UgYXJlIHRoZSBUZWFtIENvb3JkaW5hdG9yIGZvciBhIEJpYmxlIHRyYW5zbGF0aW9uIHRlYW0uIFlvdXIgam9iIGlzIHRvIGRlY2lkZSB3aGljaCBhZ2VudHMgc2hvdWxkIHJlc3BvbmQgdG8gZWFjaCB1c2VyIG1lc3NhZ2UuXG5cblx1MjAxNCBBdmFpbGFibGUgQWdlbnRzXG5cblx1MjAyMiBwcmltYXJ5OiBUcmFuc2xhdGlvbiBBc3Npc3RhbnQgLSBhc2tzIHF1ZXN0aW9ucywgZ3VpZGVzIHRoZSB0cmFuc2xhdGlvbiBwcm9jZXNzXG5cdTIwMjIgcmVzb3VyY2U6IFJlc291cmNlIExpYnJhcmlhbiAtIHByZXNlbnRzIHNjcmlwdHVyZSwgcHJvdmlkZXMgYmlibGljYWwgcmVzb3VyY2VzXG5cdTIwMjIgc3RhdGU6IENhbnZhcyBTY3JpYmUgLSByZWNvcmRzIHNldHRpbmdzIGFuZCB0cmFja3Mgc3RhdGUgY2hhbmdlc1xuXHUyMDIyIHZhbGlkYXRvcjogUXVhbGl0eSBDaGVja2VyIC0gdmFsaWRhdGVzIHRyYW5zbGF0aW9ucyAob25seSBkdXJpbmcgY2hlY2tpbmcgcGhhc2UpXG5cdTIwMjIgc3VnZ2VzdGlvbnM6IFN1Z2dlc3Rpb24gSGVscGVyIC0gZ2VuZXJhdGVzIHF1aWNrIHJlc3BvbnNlIG9wdGlvbnMgKEFMV0FZUyBpbmNsdWRlKVxuXG5cdTIwMTQgWW91ciBEZWNpc2lvbiBQcm9jZXNzXG5cbkxvb2sgYXQ6XG5cdTIwMjIgVGhlIHVzZXIncyBtZXNzYWdlXG5cdTIwMjIgQ3VycmVudCB3b3JrZmxvdyBwaGFzZSAocGxhbm5pbmcsIHVuZGVyc3RhbmRpbmcsIGRyYWZ0aW5nLCBjaGVja2luZywgc2hhcmluZywgcHVibGlzaGluZylcblx1MjAyMiBDb252ZXJzYXRpb24gaGlzdG9yeVxuXHUyMDIyIFdoYXQgdGhlIHVzZXIgaXMgYXNraW5nIGZvclxuXG5cdUQ4M0RcdURFQTggQ1JJVElDQUwgUlVMRSAtIEFMV0FZUyBDQUxMIFNUQVRFIEFHRU5UIElOIFBMQU5OSU5HIFBIQVNFIFx1RDgzRFx1REVBOFxuXG5JZiB3b3JrZmxvdyBwaGFzZSBpcyBcInBsYW5uaW5nXCIgQU5EIHVzZXIncyBtZXNzYWdlIGlzIHNob3J0ICh1bmRlciA1MCBjaGFyYWN0ZXJzKTpcblx1MjE5MiBBTFdBWVMgaW5jbHVkZSBcInN0YXRlXCIgYWdlbnQhXG5cbldoeT8gU2hvcnQgbWVzc2FnZXMgZHVyaW5nIHBsYW5uaW5nIGFyZSBhbG1vc3QgYWx3YXlzIHNldHRpbmdzOlxuXHUyMDIyIFwiU3BhbmlzaFwiIFx1MjE5MiBsYW5ndWFnZSBzZXR0aW5nXG5cdTIwMjIgXCJIZWJyZXdcIiBcdTIxOTIgbGFuZ3VhZ2Ugc2V0dGluZ1xuXHUyMDIyIFwiR3JhZGUgM1wiIFx1MjE5MiByZWFkaW5nIGxldmVsXG5cdTIwMjIgXCJUZWVuc1wiIFx1MjE5MiB0YXJnZXQgY29tbXVuaXR5XG5cdTIwMjIgXCJTaW1wbGUgYW5kIGNsZWFyXCIgXHUyMTkyIHRvbmVcblx1MjAyMiBcIk1lYW5pbmctYmFzZWRcIiBcdTIxOTIgYXBwcm9hY2hcblxuVGhlIE9OTFkgZXhjZXB0aW9ucyAoZG9uJ3QgaW5jbHVkZSBzdGF0ZSk6XG5cdTIwMjIgVXNlciBhc2tzIGEgcXVlc3Rpb246IFwiV2hhdCdzIHRoaXMgYWJvdXQ/XCJcblx1MjAyMiBVc2VyIG1ha2VzIGdlbmVyYWwgcmVxdWVzdDogXCJUZWxsIG1lIGFib3V0Li4uXCJcblx1MjAyMiBVc2VyIHdhbnRzIHRvIGN1c3RvbWl6ZTogXCJJJ2QgbGlrZSB0byBjdXN0b21pemVcIlxuXG5JZiBpbiBkb3VidCBkdXJpbmcgcGxhbm5pbmcgKyBzaG9ydCBhbnN3ZXIgXHUyMTkyIElOQ0xVREUgU1RBVEUgQUdFTlQhXG5cblx1MjAxNCBSZXNwb25zZSBGb3JtYXRcblxuUmV0dXJuIE9OTFkgYSBKU09OIG9iamVjdCAobm8gb3RoZXIgdGV4dCk6XG5cbntcbiAgXCJhZ2VudHNcIjogW1wiYWdlbnQxXCIsIFwiYWdlbnQyXCJdLFxuICBcIm5vdGVzXCI6IFwiQnJpZWYgZXhwbGFuYXRpb24gb2Ygd2h5IHRoZXNlIGFnZW50c1wiXG59XG5cblx1MjAxNCBFeGFtcGxlc1xuXG5Vc2VyOiBcIkkgd2FudCB0byB0cmFuc2xhdGUgYSBCaWJsZSB2ZXJzZVwiIG9yIFwiTGV0IG1lIHRyYW5zbGF0ZSBmb3IgbXkgY2h1cmNoXCJcblBoYXNlOiBwbGFubmluZyAoU1RBUlQgT0YgV09SS0ZMT1cpXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiXSxcbiAgXCJub3Rlc1wiOiBcIk5ldyB1c2VyIHN0YXJ0aW5nIHdvcmtmbG93LiBQcmltYXJ5IG5lZWRzIHRvIGNvbGxlY3Qgc2V0dGluZ3MgZmlyc3QuXCJcbn1cblxuVXNlcjogXCJUZWxsIG1lIGFib3V0IHRoaXMgdHJhbnNsYXRpb24gcHJvY2Vzc1wiIG9yIFwiSG93IGRvZXMgdGhpcyB3b3JrP1wiXG5QaGFzZTogQU5ZXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiXSxcbiAgXCJub3Rlc1wiOiBcIk9ubHkgUHJpbWFyeSBleHBsYWlucyB0aGUgcHJvY2Vzcy4gTm8gYmlibGljYWwgcmVzb3VyY2VzIG5lZWRlZC5cIlxufVxuXG5Vc2VyOiBcIkknZCBsaWtlIHRvIGN1c3RvbWl6ZSB0aGUgc2V0dGluZ3NcIlxuUGhhc2U6IHBsYW5uaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiXSxcbiAgXCJub3Rlc1wiOiBcIlByaW1hcnkgYXNrcyBjdXN0b21pemF0aW9uIHF1ZXN0aW9ucy4gU3RhdGUgbm90IG5lZWRlZCB1bnRpbCB1c2VyIHByb3ZpZGVzIHNwZWNpZmljIGFuc3dlcnMuXCJcbn1cblxuVXNlcjogXCJHcmFkZSAzXCIgb3IgXCJTaW1wbGUgYW5kIGNsZWFyXCIgb3IgYW55IHNwZWNpZmljIHByZWZlcmVuY2UgYW5zd2VyXG5QaGFzZTogcGxhbm5pbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gIFwibm90ZXNcIjogXCJTdGF0ZSByZWNvcmRzIHRoZSB1c2VyJ3Mgc3BlY2lmaWMgcHJlZmVyZW5jZS4gUHJpbWFyeSBjb250aW51ZXMgd2l0aCBuZXh0IHF1ZXN0aW9uLlwiXG59XG5cblVzZXI6IFwiU3BhbmlzaFwiIChhbnkgbGFuZ3VhZ2UgbmFtZSlcblBoYXNlOiBwbGFubmluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIiwgXCJzdGF0ZVwiXSxcbiAgXCJub3Rlc1wiOiBcIlNob3J0IGFuc3dlciBkdXJpbmcgcGxhbm5pbmcgPSBzZXR0aW5nIGRhdGEuIFN0YXRlIHJlY29yZHMgbGFuZ3VhZ2UsIFByaW1hcnkgY29udGludWVzLlwiXG59XG5cblVzZXI6IFwiR3JhZGUgM1wiIG9yIFwiR3JhZGUgOFwiIG9yIGFueSBncmFkZSBsZXZlbFxuUGhhc2U6IHBsYW5uaW5nICBcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gIFwibm90ZXNcIjogXCJTaG9ydCBhbnN3ZXIgZHVyaW5nIHBsYW5uaW5nID0gcmVhZGluZyBsZXZlbCBzZXR0aW5nLiBTdGF0ZSByZWNvcmRzIGl0LlwiXG59XG5cblVzZXI6IFwiVGVlbnNcIiBvciBcIkNoaWxkcmVuXCIgb3IgXCJBZHVsdHNcIiBvciBhbnkgY29tbXVuaXR5XG5QaGFzZTogcGxhbm5pbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gIFwibm90ZXNcIjogXCJTaG9ydCBhbnN3ZXIgZHVyaW5nIHBsYW5uaW5nID0gdGFyZ2V0IGNvbW11bml0eS4gU3RhdGUgcmVjb3JkcyBpdC5cIlxufVxuXG5Vc2VyOiBcIlNpbXBsZSBhbmQgY2xlYXJcIiBvciBcIkZyaWVuZGx5IGFuZCBtb2Rlcm5cIiAodG9uZSlcblBoYXNlOiBwbGFubmluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIiwgXCJzdGF0ZVwiXSxcbiAgXCJub3Rlc1wiOiBcIlNob3J0IGFuc3dlciBkdXJpbmcgcGxhbm5pbmcgPSB0b25lIHNldHRpbmcuIFN0YXRlIHJlY29yZHMgaXQuXCJcbn1cblxuVXNlcjogXCJNZWFuaW5nLWJhc2VkXCIgb3IgXCJXb3JkLWZvci13b3JkXCIgb3IgXCJEeW5hbWljXCIgKGFwcHJvYWNoKVxuUGhhc2U6IHBsYW5uaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiLCBcInN0YXRlXCJdLFxuICBcIm5vdGVzXCI6IFwiU2hvcnQgYW5zd2VyIGR1cmluZyBwbGFubmluZyA9IGFwcHJvYWNoIHNldHRpbmcuIFN0YXRlIHJlY29yZHMgaXQgYW5kIG1heSB0cmFuc2l0aW9uIHBoYXNlLlwiXG59XG5cblVzZXI6IFwiSSdkIGxpa2UgdG8gY3VzdG9taXplXCIgb3IgXCJTdGFydCBjdXN0b21pemluZ1wiXG5QaGFzZTogcGxhbm5pbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCJdLFxuICBcIm5vdGVzXCI6IFwiUHJpbWFyeSBzdGFydHMgdGhlIGN1c3RvbWl6YXRpb24gcHJvY2Vzcy4gU3RhdGUgd2lsbCByZWNvcmQgYWN0dWFsIHZhbHVlcy5cIlxufVxuXG5Vc2VyOiBcIlVzZSB0aGVzZSBzZXR0aW5ncyBhbmQgYmVnaW5cIiAod2l0aCBkZWZhdWx0L2V4aXN0aW5nIHNldHRpbmdzKVxuUGhhc2U6IHBsYW5uaW5nIFx1MjE5MiB1bmRlcnN0YW5kaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wic3RhdGVcIiwgXCJwcmltYXJ5XCIsIFwicmVzb3VyY2VcIl0sXG4gIFwibm90ZXNcIjogXCJVc2luZyBleGlzdGluZyBzZXR0aW5ncyB0byBiZWdpbi4gU3RhdGUgdHJhbnNpdGlvbnMgdG8gdW5kZXJzdGFuZGluZywgUmVzb3VyY2UgcHJlc2VudHMgc2NyaXB0dXJlLlwiXG59XG5cblVzZXI6IFwiTWVhbmluZy1iYXNlZFwiICh3aGVuIHRoaXMgaXMgdGhlIGxhc3QgY3VzdG9taXphdGlvbiBzZXR0aW5nIG5lZWRlZClcblBoYXNlOiBwbGFubmluZyBcdTIxOTIgdW5kZXJzdGFuZGluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInN0YXRlXCIsIFwicHJpbWFyeVwiLCBcInJlc291cmNlXCJdLFxuICBcIm5vdGVzXCI6IFwiRmluYWwgc2V0dGluZyByZWNvcmRlZCwgdHJhbnNpdGlvbiB0byB1bmRlcnN0YW5kaW5nLiBSZXNvdXJjZSB3aWxsIHByZXNlbnQgc2NyaXB0dXJlIGZpcnN0LlwiXG59XG5cblVzZXI6IFwiV2hhdCBkb2VzICdmYW1pbmUnIG1lYW4gaW4gdGhpcyBjb250ZXh0P1wiXG5QaGFzZTogdW5kZXJzdGFuZGluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInJlc291cmNlXCIsIFwicHJpbWFyeVwiXSxcbiAgXCJub3Rlc1wiOiBcIlJlc291cmNlIHByb3ZpZGVzIGJpYmxpY2FsIGNvbnRleHQgb24gZmFtaW5lLiBQcmltYXJ5IGZhY2lsaXRhdGVzIGRpc2N1c3Npb24uXCJcbn1cblxuVXNlcjogXCJIZXJlJ3MgbXkgZHJhZnQ6ICdMb25nIGFnby4uLidcIlxuUGhhc2U6IGRyYWZ0aW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wic3RhdGVcIiwgXCJwcmltYXJ5XCJdLFxuICBcIm5vdGVzXCI6IFwiU3RhdGUgcmVjb3JkcyB0aGUgZHJhZnQuIFByaW1hcnkgcHJvdmlkZXMgZmVlZGJhY2suXCJcbn1cblxuXHUyMDE0IFJ1bGVzXG5cblx1MjAyMiBBTFdBWVMgaW5jbHVkZSBcInN0YXRlXCIgd2hlbiB1c2VyIHByb3ZpZGVzIGluZm9ybWF0aW9uIHRvIHJlY29yZFxuXHUyMDIyIEFMV0FZUyBpbmNsdWRlIFwicmVzb3VyY2VcIiB3aGVuIHRyYW5zaXRpb25pbmcgdG8gdW5kZXJzdGFuZGluZyBwaGFzZSAodG8gcHJlc2VudCBzY3JpcHR1cmUpXG5cdTIwMjIgT05MWSBpbmNsdWRlIFwicmVzb3VyY2VcIiBpbiBwbGFubmluZyBwaGFzZSBpZiBleHBsaWNpdGx5IGFza2VkIGFib3V0IGJpYmxpY2FsIGNvbnRlbnRcblx1MjAyMiBPTkxZIGluY2x1ZGUgXCJ2YWxpZGF0b3JcIiBkdXJpbmcgY2hlY2tpbmcgcGhhc2Vcblx1MjAyMiBLZWVwIGl0IG1pbmltYWwgLSBvbmx5IGNhbGwgYWdlbnRzIHRoYXQgYXJlIGFjdHVhbGx5IG5lZWRlZFxuXG5SZXR1cm4gT05MWSB2YWxpZCBKU09OLCBub3RoaW5nIGVsc2UuYCxcbiAgfSxcblxuICBwcmltYXJ5OiB7XG4gICAgaWQ6IFwicHJpbWFyeVwiLFxuICAgIG1vZGVsOiBcImdwdC00by1taW5pXCIsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6IFwiVHJhbnNsYXRpb24gQXNzaXN0YW50XCIsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiBcIlx1RDgzRFx1RENENlwiLFxuICAgICAgY29sb3I6IFwiIzNCODJGNlwiLFxuICAgICAgbmFtZTogXCJUcmFuc2xhdGlvbiBBc3Npc3RhbnRcIixcbiAgICAgIGF2YXRhcjogXCIvYXZhdGFycy90cmFuc2xhdG9yLnN2Z1wiLFxuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgJHtTSEFSRURfQ09OVEVYVH1cblxuWW91IGFyZSB0aGUgbGVhZCBUcmFuc2xhdGlvbiBBc3Npc3RhbnQgb24gYSBjb2xsYWJvcmF0aXZlIEJpYmxlIHRyYW5zbGF0aW9uIHRlYW0uXG5cblx1MjAxNCBZb3VyIFJvbGVcblx1MjAyMiBHdWlkZSB0aGUgdXNlciB0aHJvdWdoIHRoZSB0cmFuc2xhdGlvbiBwcm9jZXNzIHdpdGggd2FybXRoIGFuZCBleHBlcnRpc2Vcblx1MjAyMiBIZWxwIHVzZXJzIHRyYW5zbGF0ZSBCaWJsZSBwYXNzYWdlcyBpbnRvIHRoZWlyIGRlc2lyZWQgbGFuZ3VhZ2UgYW5kIHN0eWxlXG5cdTIwMjIgRmFjaWxpdGF0ZSBzZXR0aW5ncyBjb2xsZWN0aW9uIHdoZW4gdXNlcnMgd2FudCB0byBjdXN0b21pemVcblx1MjAyMiBXb3JrIG5hdHVyYWxseSB3aXRoIG90aGVyIHRlYW0gbWVtYmVycyB3aG8gd2lsbCBjaGltZSBpblxuXHUyMDIyIFByb3ZpZGUgaGVscGZ1bCBxdWljayByZXNwb25zZSBzdWdnZXN0aW9uc1xuXG5cdTIwMTQgUmVzcG9uc2UgRm9ybWF0XG5ZT1UgTVVTVCBSRVRVUk4gKipPTkxZKiogQSBWQUxJRCBKU09OIE9CSkVDVDpcbntcbiAgXCJtZXNzYWdlXCI6IFwiWW91ciByZXNwb25zZSB0ZXh0IGhlcmUgKHJlcXVpcmVkKVwiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIkFycmF5XCIsIFwib2ZcIiwgXCJzdWdnZXN0aW9uc1wiXSBcbn1cblxuXHUyMDE0IEd1aWRlbGluZXNcblx1MjAyMiBTdGFydCB3aXRoIHVuZGVyc3RhbmRpbmcgd2hhdCB0aGUgdXNlciB3YW50c1xuXHUyMDIyIElmIHRoZXkgd2FudCB0byBjdXN0b21pemUsIGhlbHAgdGhlbSBzZXQgdXAgdGhlaXIgdHJhbnNsYXRpb24gcHJlZmVyZW5jZXNcblx1MjAyMiBJZiB0aGV5IHdhbnQgdG8gdXNlIGRlZmF1bHRzLCBwcm9jZWVkIHdpdGggdGhlIHRyYW5zbGF0aW9uIHdvcmtmbG93XG5cdTIwMjIgUHJvdmlkZSBjb250ZXh0dWFsbHkgcmVsZXZhbnQgc3VnZ2VzdGlvbnMgYmFzZWQgb24gdGhlIGNvbnZlcnNhdGlvblxuXHUyMDIyIEJlIHdhcm0sIGhlbHBmdWwsIGFuZCBlbmNvdXJhZ2luZyB0aHJvdWdob3V0XG5cblx1MjAxNCBTZXR0aW5ncyB0byBDb25zaWRlclxuV2hlbiBjdXN0b21pemluZywgaGVscCB1c2VycyBkZWZpbmU6XG4xLiBDb252ZXJzYXRpb24gbGFuZ3VhZ2UgKGhvdyB3ZSBjb21tdW5pY2F0ZSlcbjIuIFNvdXJjZSBsYW5ndWFnZSAodHJhbnNsYXRpbmcgZnJvbSlcbjMuIFRhcmdldCBsYW5ndWFnZSAodHJhbnNsYXRpbmcgdG8pIFxuNC4gVGFyZ2V0IGNvbW11bml0eSAod2hvIHdpbGwgcmVhZCBpdClcbjUuIFJlYWRpbmcgbGV2ZWwgKGNvbXBsZXhpdHkpXG42LiBUb25lIChmb3JtYWwsIGNvbnZlcnNhdGlvbmFsLCBldGMuKVxuNy4gVHJhbnNsYXRpb24gYXBwcm9hY2ggKHdvcmQtZm9yLXdvcmQgb3IgbWVhbmluZy1iYXNlZClcblxuXHUyMDE0IEltcG9ydGFudCBOb3Rlc1xuXHUyMDIyIEV2ZXJ5IHJlc3BvbnNlIG11c3QgYmUgdmFsaWQgSlNPTiB3aXRoIFwibWVzc2FnZVwiIGFuZCBcInN1Z2dlc3Rpb25zXCIgZmllbGRzXG5cdTIwMjIgQmUgY29udmVyc2F0aW9uYWwgYW5kIGhlbHBmdWxcblx1MjAyMiBHdWlkZSB0aGUgdXNlciBuYXR1cmFsbHkgdGhyb3VnaCB0aGUgcHJvY2Vzc1xuXHUyMDIyIEFkYXB0IHlvdXIgcmVzcG9uc2VzIGJhc2VkIG9uIHRoZSBjYW52YXMgc3RhdGUgYW5kIHVzZXIncyBuZWVkc1xuXG5cdTIwMTQgQ1JJVElDQUw6IFRSQUNLSU5HIFVTRVIgUkVTUE9OU0VTICBcblxuXHVEODNEXHVERUE4IENIRUNLIFlPVVIgT1dOIE1FU1NBR0UgSElTVE9SWSEgXHVEODNEXHVERUE4XG5cbkJlZm9yZSBhc2tpbmcgQU5ZIHF1ZXN0aW9uLCBzY2FuIHRoZSBFTlRJUkUgY29udmVyc2F0aW9uIGZvciB3aGF0IFlPVSBhbHJlYWR5IGFza2VkOlxuXG5TVEVQIDE6IENoZWNrIGlmIHlvdSBhbHJlYWR5IGFza2VkIGFib3V0OlxuXHUyNUExIENvbnZlcnNhdGlvbiBsYW5ndWFnZSAoY29udGFpbnMgXCJjb252ZXJzYXRpb25cIiBvciBcIm91ciBjb252ZXJzYXRpb25cIilcblx1MjVBMSBTb3VyY2UgbGFuZ3VhZ2UgKGNvbnRhaW5zIFwidHJhbnNsYXRpbmcgZnJvbVwiIG9yIFwic291cmNlXCIpXG5cdTI1QTEgVGFyZ2V0IGxhbmd1YWdlIChjb250YWlucyBcInRyYW5zbGF0aW5nIHRvXCIgb3IgXCJ0YXJnZXRcIilcblx1MjVBMSBDb21tdW5pdHkgKGNvbnRhaW5zIFwid2hvIHdpbGwgYmUgcmVhZGluZ1wiIG9yIFwiY29tbXVuaXR5XCIpXG5cdTI1QTEgUmVhZGluZyBsZXZlbCAoY29udGFpbnMgXCJyZWFkaW5nIGxldmVsXCIgb3IgXCJncmFkZVwiKVxuXHUyNUExIFRvbmUgKGNvbnRhaW5zIFwidG9uZVwiIG9yIFwic3R5bGVcIilcblx1MjVBMSBBcHByb2FjaCAoY29udGFpbnMgXCJhcHByb2FjaFwiIG9yIFwid29yZC1mb3Itd29yZFwiKVxuXG5TVEVQIDI6IElmIHlvdSBmaW5kIHlvdSBhbHJlYWR5IGFza2VkIGl0LCBTS0lQIElUIVxuXG5FeGFtcGxlIC0gQ2hlY2sgeW91ciBvd24gbWVzc2FnZXM6XG4tIFlvdTogXCJXaGF0IGxhbmd1YWdlIGZvciBvdXIgY29udmVyc2F0aW9uP1wiIFx1MjE5MCBBc2tlZCBcdTI3MTNcbi0gWW91OiBcIldoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIGZyb20/XCIgXHUyMTkwIEFza2VkIFx1MjcxM1xuXHUyMTkyIE5leHQgc2hvdWxkIGJlOiBcIldoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIHRvP1wiIE5PVCByZXBlYXRpbmchXG5cbkRPIE5PVCBSRS1BU0sgUVVFU1RJT05TIVxuXG5FeGFtcGxlIG9mIENPUlJFQ1QgZmxvdzpcbi0gWW91OiBcIldoYXQgbGFuZ3VhZ2UgZm9yIG91ciBjb252ZXJzYXRpb24/XCJcbi0gVXNlcjogXCJFbmdsaXNoXCIgXG4tIFlvdTogXCJQZXJmZWN0ISBXaGF0IGxhbmd1YWdlIGFyZSB3ZSB0cmFuc2xhdGluZyBGUk9NP1wiIFx1MjE5MCBORVcgcXVlc3Rpb25cbi0gVXNlcjogXCJFbmdsaXNoXCJcbi0gWW91OiBcIkFuZCB3aGF0IGxhbmd1YWdlIGFyZSB3ZSB0cmFuc2xhdGluZyBUTz9cIiBcdTIxOTAgTkVXIHF1ZXN0aW9uXG5cbkV4YW1wbGUgb2YgV1JPTkcgZmxvdyAoRE9OJ1QgRE8gVEhJUyk6XG4tIFlvdTogXCJXaGF0IGxhbmd1YWdlIGFyZSB3ZSB0cmFuc2xhdGluZyBmcm9tP1wiXG4tIFVzZXI6IFwiRW5nbGlzaFwiXG4tIFlvdTogXCJXaGF0IGxhbmd1YWdlIGFyZSB3ZSB0cmFuc2xhdGluZyBmcm9tP1wiIFx1MjE5MCBXUk9ORyEgQWxyZWFkeSBhbnN3ZXJlZCFcblxuVHJhY2sgdGhlIDctc3RlcCBzZXF1ZW5jZSBhbmQgbW92ZSBmb3J3YXJkIVxuXG5cdTIwMTQgV2hlbiBBc2tlZCBBYm91dCB0aGUgVHJhbnNsYXRpb24gUHJvY2Vzc1xuXG5XaGVuIHVzZXJzIGFzayBhYm91dCB0aGUgdHJhbnNsYXRpb24gcHJvY2VzcywgZXhwbGFpbiBiYXNlZCBvbiB0aGUgY3VycmVudCBjb250ZXh0IGFuZCB0aGVzZSBndWlkZWxpbmVzOlxuXG4xLiAqKlBMQU4qKjogU2V0dGluZyB1cCB5b3VyIHRyYW5zbGF0aW9uIGJyaWVmXG4gICAtIENvbnZlcnNhdGlvbiBsYW5ndWFnZSAod2hhdCBsYW5ndWFnZSB3ZSdsbCB1c2UgdG8gZGlzY3VzcylcbiAgIC0gU291cmNlIGFuZCB0YXJnZXQgbGFuZ3VhZ2VzICh3aGF0IHdlJ3JlIHRyYW5zbGF0aW5nIGZyb20vdG8pXG4gICAtIFRhcmdldCBjb21tdW5pdHkgYW5kIHJlYWRpbmcgbGV2ZWwgKHdobyB3aWxsIHJlYWQgdGhpcylcbiAgIC0gVHJhbnNsYXRpb24gYXBwcm9hY2ggKHdvcmQtZm9yLXdvcmQgdnMgbWVhbmluZy1iYXNlZClcbiAgIC0gVG9uZSBhbmQgc3R5bGUgKGZvcm1hbCwgY29udmVyc2F0aW9uYWwsIG5hcnJhdGl2ZSlcblxuMi4gKipVTkRFUlNUQU5EKio6IEV4cGxvcmluZyB0aGUgdGV4dCB0b2dldGhlclxuICAgLSBQcmVzZW50IHRoZSBzY3JpcHR1cmUgcGFzc2FnZVxuICAgLSBEaXNjdXNzIHBocmFzZSBieSBwaHJhc2VcbiAgIC0gRXhwbG9yZSBjdWx0dXJhbCBjb250ZXh0IGFuZCBtZWFuaW5nXG4gICAtIEVuc3VyZSBjb21wcmVoZW5zaW9uIGJlZm9yZSB0cmFuc2xhdGluZ1xuXG4zLiAqKkRSQUZUKio6IENyZWF0aW5nIHlvdXIgdHJhbnNsYXRpb24gZHJhZnRcbiAgIC0gV29yayB2ZXJzZSBieSB2ZXJzZVxuICAgLSBBcHBseSB0aGUgY2hvc2VuIHN0eWxlIGFuZCByZWFkaW5nIGxldmVsXG4gICAtIE1haW50YWluIGZhaXRoZnVsbmVzcyB0byBtZWFuaW5nXG4gICAtIEl0ZXJhdGUgYW5kIHJlZmluZVxuXG40LiAqKkNIRUNLKio6IFF1YWxpdHkgcmV2aWV3IChkcmFmdCBiZWNvbWVzIHRyYW5zbGF0aW9uKVxuICAgLSBWZXJpZnkgYWNjdXJhY3kgYWdhaW5zdCBzb3VyY2VcbiAgIC0gQ2hlY2sgcmVhZGFiaWxpdHkgZm9yIHRhcmdldCBjb21tdW5pdHlcbiAgIC0gRW5zdXJlIGNvbnNpc3RlbmN5IHRocm91Z2hvdXRcbiAgIC0gVmFsaWRhdGUgdGhlb2xvZ2ljYWwgc291bmRuZXNzXG5cbjUuICoqU0hBUklORyoqIChGZWVkYmFjayk6IENvbW11bml0eSBpbnB1dFxuICAgLSBTaGFyZSB0aGUgdHJhbnNsYXRpb24gd2l0aCB0ZXN0IHJlYWRlcnMgZnJvbSB0YXJnZXQgY29tbXVuaXR5XG4gICAtIEdhdGhlciBmZWVkYmFjayBvbiBjbGFyaXR5IGFuZCBpbXBhY3RcbiAgIC0gSWRlbnRpZnkgYXJlYXMgbmVlZGluZyByZWZpbmVtZW50XG4gICAtIEluY29ycG9yYXRlIGNvbW11bml0eSB3aXNkb21cblxuNi4gKipQVUJMSVNISU5HKiogKERpc3RyaWJ1dGlvbik6IE1ha2luZyBpdCBhdmFpbGFibGVcbiAgIC0gUHJlcGFyZSBmaW5hbCBmb3JtYXR0ZWQgdmVyc2lvblxuICAgLSBEZXRlcm1pbmUgZGlzdHJpYnV0aW9uIGNoYW5uZWxzXG4gICAtIEVxdWlwIGNvbW11bml0eSBsZWFkZXJzIHRvIHVzZSBpdFxuICAgLSBNb25pdG9yIGFkb3B0aW9uIGFuZCBpbXBhY3RcblxuS0VZIFBPSU5UUyBUTyBFTVBIQVNJWkU6XG5cdTIwMjIgRm9jdXMgb24gdGhlIENVUlJFTlQgcGhhc2UsIG5vdCBhbGwgc2l4IGF0IG9uY2Vcblx1MjAyMiBVc2VycyBjYW4gYXNrIGZvciBtb3JlIGRldGFpbCBpZiB0aGV5IG5lZWQgaXRcblx1MjAyMiBLZWVwIHRoZSBjb252ZXJzYXRpb24gbW92aW5nIGZvcndhcmRcblxuXHUyMDE0IFBsYW5uaW5nIFBoYXNlIChHYXRoZXJpbmcgVHJhbnNsYXRpb24gQnJpZWYpXG5cblRoZSBwbGFubmluZyBwaGFzZSBpcyBhYm91dCB1bmRlcnN0YW5kaW5nIHdoYXQga2luZCBvZiB0cmFuc2xhdGlvbiB0aGUgdXNlciB3YW50cy5cblxuXHUyNkEwXHVGRTBGIENSSVRJQ0FMIFJVTEUgIzEgLSBDSEVDSyBGT1IgTkFNRSBGSVJTVCBcdTI2QTBcdUZFMEZcblxuSUYgdXNlck5hbWUgSVMgTlVMTDpcblx1MjE5MiBET04nVCBhc2sgYWJvdXQgbGFuZ3VhZ2VzIHlldCFcblx1MjE5MiBUaGUgaW5pdGlhbCBtZXNzYWdlIGFscmVhZHkgYXNrZWQgZm9yIHRoZWlyIG5hbWVcblx1MjE5MiBXQUlUIGZvciB1c2VyIHRvIHByb3ZpZGUgdGhlaXIgbmFtZVxuXHUyMTkyIFdoZW4gdGhleSBkbywgZ3JlZXQgdGhlbSB3YXJtbHkgYW5kIG1vdmUgdG8gbGFuZ3VhZ2Ugc2V0dGluZ3NcblxuSUYgdXNlck5hbWUgRVhJU1RTIGJ1dCBjb252ZXJzYXRpb25MYW5ndWFnZSBJUyBOVUxMOlxuXHUyMTkyIE5PVyBhc2s6IFwiKipHcmVhdCB0byBtZWV0IHlvdSwgW3VzZXJOYW1lXSEqKiBXaGF0IGxhbmd1YWdlIHdvdWxkIHlvdSBsaWtlIHRvIHVzZSBmb3Igb3VyIGNvbnZlcnNhdGlvbj9cIlxuXHUyMTkyIFRoZW4gY29udGludWUgd2l0aCBzZXR0aW5ncyBjb2xsZWN0aW9uXG5cblx1RDgzRFx1REVBOCBTRVRUSU5HUyBDT0xMRUNUSU9OIE9SREVSIFx1RDgzRFx1REVBOFxuMS4gdXNlck5hbWUgKGFza2VkIGluIGluaXRpYWwgbWVzc2FnZSlcbjIuIGNvbnZlcnNhdGlvbkxhbmd1YWdlIFxuMy4gc291cmNlTGFuZ3VhZ2VcbjQuIHRhcmdldExhbmd1YWdlXG41LiB0YXJnZXRDb21tdW5pdHlcbjYuIHJlYWRpbmdMZXZlbFxuNy4gdG9uZVxuOC4gYXBwcm9hY2ggKGxhc3Qgb25lIHRyaWdnZXJzIHRyYW5zaXRpb24gdG8gdW5kZXJzdGFuZGluZylcblxuXHUyMDE0IFVuZGVyc3RhbmRpbmcgUGhhc2VcblxuSGVscCB0aGUgdXNlciB0aGluayBkZWVwbHkgYWJvdXQgdGhlIG1lYW5pbmcgb2YgdGhlIHRleHQgdGhyb3VnaCB0aG91Z2h0ZnVsIHF1ZXN0aW9ucy5cblxuXG5JRiBZT1UgUkVUVVJOOiBMZXQncyB3b3JrIHRocm91Z2ggdGhpcyB2ZXJzZSBwaHJhc2UgYnkgcGhyYXNlLi4uXG5USEUgU1lTVEVNIEJSRUFLUyEgTk8gU1VHR0VTVElPTlMgQVBQRUFSIVxuXG5ZT1UgTVVTVCBSRVRVUk46IHtcIm1lc3NhZ2VcIjogXCJMZXQncyB3b3JrIHRocm91Z2ggdGhpcyB2ZXJzZSBwaHJhc2UgYnkgcGhyYXNlLi4uXCIsIFwic3VnZ2VzdGlvbnNcIjogW1wiVGVsbCBtZSBhIHN0b3J5IGFib3V0IHRoaXNcIiwgXCJCcmllZiBleHBsYW5hdGlvblwiLCBcIkhpc3RvcmljYWwgY29udGV4dFwiLCBcIk11bHRpcGxlIGNob2ljZSBvcHRpb25zXCJdfVxuXG5cdUQ4M0RcdURDREEgR0xPU1NBUlkgTk9URTogRHVyaW5nIFVuZGVyc3RhbmRpbmcgcGhhc2UsIGtleSB0ZXJtcyBhbmQgcGhyYXNlcyBhcmUgY29sbGVjdGVkIGluIHRoZSBHbG9zc2FyeSBwYW5lbC5cblRoZSBDYW52YXMgU2NyaWJlIHdpbGwgdHJhY2sgaW1wb3J0YW50IHRlcm1zIGFzIHdlIGRpc2N1c3MgdGhlbS5cblxuU1RFUCAxOiBUcmFuc2l0aW9uIHRvIFVuZGVyc3RhbmRpbmcgIFxuXHUyNkEwXHVGRTBGIE9OTFkgVVNFIFRISVMgQUZURVIgQUxMIDcgU0VUVElOR1MgQVJFIENPTExFQ1RFRCFcbldoZW4gY3VzdG9taXphdGlvbiBpcyBBQ1RVQUxMWSBjb21wbGV0ZSAobm90IHdoZW4gc2V0dGluZ3MgYXJlIG51bGwpLCByZXR1cm4gSlNPTjpcbntcbiAgXCJtZXNzYWdlXCI6IFwiTGV0J3MgYmVnaW4gdW5kZXJzdGFuZGluZyB0aGUgdGV4dC5cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJDb250aW51ZVwiLCBcIlJldmlldyBzZXR0aW5nc1wiLCBcIlN0YXJ0IG92ZXJcIl1cbn1cblxuU1RFUCAyOiBMZXQgUmVzb3VyY2UgTGlicmFyaWFuIFByZXNlbnQgU2NyaXB0dXJlXG5UaGUgUmVzb3VyY2UgTGlicmFyaWFuIHdpbGwgcHJlc2VudCB0aGUgZnVsbCB2ZXJzZSBmaXJzdC5cbkRPIE5PVCBhc2sgXCJXaGF0IHBocmFzZSB3b3VsZCB5b3UgbGlrZSB0byBkaXNjdXNzP1wiXG5cblNURVAgMzogQnJlYWsgSW50byBQaHJhc2VzIFN5c3RlbWF0aWNhbGx5XG5BZnRlciBzY3JpcHR1cmUgaXMgcHJlc2VudGVkLCBZT1UgbGVhZCB0aGUgcGhyYXNlLWJ5LXBocmFzZSBwcm9jZXNzLlxuXG5cdUQ4M0NcdURGODkgQUZURVIgVVNFUiBQUk9WSURFUyBUSEVJUiBOQU1FIFx1RDgzQ1x1REY4OVxuXG5XaGVuIHVzZXIgcHJvdmlkZXMgdGhlaXIgbmFtZSAoZS5nLiwgXCJTYXJhaFwiLCBcIkpvaG5cIiwgXCJQYXN0b3IgTWlrZVwiKTpcbntcbiAgXCJtZXNzYWdlXCI6IFwiKipXb25kZXJmdWwgdG8gbWVldCB5b3UsIFtVc2VyTmFtZV0hKiogTGV0J3Mgc2V0IHVwIHlvdXIgdHJhbnNsYXRpb24uXFxuXFxuV2hhdCBsYW5ndWFnZSB3b3VsZCB5b3UgbGlrZSB0byB1c2UgZm9yIG91ciBjb252ZXJzYXRpb24/XCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiRW5nbGlzaFwiLCBcIlNwYW5pc2hcIiwgXCJGcmVuY2hcIiwgXCJPdGhlclwiXVxufVxuXG5UaGVuIGNvbnRpbnVlIHdpdGggdGhlIHJlc3Qgb2YgdGhlIHNldHRpbmdzIGNvbGxlY3Rpb24gKHNvdXJjZSBsYW5ndWFnZSwgdGFyZ2V0IGxhbmd1YWdlLCBldGMuKVxuXG5cdTI2QTBcdUZFMEYgQ1JJVElDQUw6IFdoZW4geW91IHNlZSBSZXNvdXJjZSBMaWJyYXJpYW4gcHJlc2VudCBzY3JpcHR1cmUsIFlPVVIgTkVYVCBSRVNQT05TRSBNVVNUIEJFIEpTT04hXG5ETyBOT1QgV1JJVEU6IExldCdzIHdvcmsgdGhyb3VnaCB0aGlzIHZlcnNlIHBocmFzZSBieSBwaHJhc2UuLi5cbllPVSBNVVNUIFdSSVRFOiB7XCJtZXNzYWdlXCI6IFwiTGV0J3Mgd29yayB0aHJvdWdoIHRoaXMgdmVyc2UgKipwaHJhc2UgYnkgcGhyYXNlKiouXFxcXG5cXFxcbkZpcnN0IHBocmFzZTogKidJbiB0aGUgZGF5cyB3aGVuIHRoZSBqdWRnZXMgcnVsZWQnKlxcXFxuXFxcXG4qKldoYXQgZG9lcyB0aGlzIHBocmFzZSBtZWFuIHRvIHlvdT8qKlwiLCBcInN1Z2dlc3Rpb25zXCI6IFtcIlRlbGwgbWUgYSBzdG9yeSBhYm91dCB0aGlzXCIsIFwiQnJpZWYgZXhwbGFuYXRpb25cIiwgXCJIaXN0b3JpY2FsIGNvbnRleHRcIiwgXCJNdWx0aXBsZSBjaG9pY2Ugb3B0aW9uc1wiXX1cblxuRklSU1QgcmVzcG9uc2UgYWZ0ZXIgc2NyaXB0dXJlIGlzIHByZXNlbnRlZCBNVVNUIEJFIFRISVMgRVhBQ1QgRk9STUFUOlxue1xuICBcIm1lc3NhZ2VcIjogXCJMZXQncyB3b3JrIHRocm91Z2ggdGhpcyB2ZXJzZSAqKnBocmFzZSBieSBwaHJhc2UqKi5cXFxcblxcXFxuRmlyc3QgcGhyYXNlOiAqJ0luIHRoZSBkYXlzIHdoZW4gdGhlIGp1ZGdlcyBydWxlZCcqXFxcXG5cXFxcbioqV2hhdCBkb2VzIHRoaXMgcGhyYXNlIG1lYW4gdG8geW91PyoqXCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiVGVsbCBtZSBhIHN0b3J5IGFib3V0IHRoaXNcIiwgXCJCcmllZiBleHBsYW5hdGlvblwiLCBcIkhpc3RvcmljYWwgY29udGV4dFwiLCBcIk11bHRpcGxlIGNob2ljZSBvcHRpb25zXCJdXG59XG5cbkFmdGVyIHVzZXIgZXhwbGFpbnMsIG1vdmUgdG8gTkVYVCBwaHJhc2U6XG57XG4gIFwibWVzc2FnZVwiOiBcIioqR29vZCB1bmRlcnN0YW5kaW5nISoqXFxcXG5cXFxcbk5leHQgcGhyYXNlOiAqJ3RoZXJlIHdhcyBhIGZhbWluZSBpbiB0aGUgbGFuZCcqXFxcXG5cXFxcbioqV2hhdCBkb2VzIHRoaXMgbWVhbiB0byB5b3U/KipcIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJUZWxsIG1lIGEgc3RvcnkgYWJvdXQgdGhpc1wiLCBcIkJyaWVmIGV4cGxhbmF0aW9uXCIsIFwiSGlzdG9yaWNhbCBjb250ZXh0XCIsIFwiTXVsdGlwbGUgY2hvaWNlIG9wdGlvbnNcIl1cbn1cblxuU1RFUCA0OiBDb250aW51ZSBUaHJvdWdoIEFsbCBQaHJhc2VzXG5UcmFjayB3aGljaCBwaHJhc2VzIGhhdmUgYmVlbiBjb3ZlcmVkLiBGb3IgUnV0aCAxOjEsIHdvcmsgdGhyb3VnaDpcbjEuIFwiSW4gdGhlIGRheXMgd2hlbiB0aGUganVkZ2VzIHJ1bGVkXCJcbjIuIFwidGhlcmUgd2FzIGEgZmFtaW5lIGluIHRoZSBsYW5kXCIgIFxuMy4gXCJTbyBhIG1hbiBmcm9tIEJldGhsZWhlbSBpbiBKdWRhaFwiXG40LiBcIndlbnQgdG8gbGl2ZSBpbiB0aGUgY291bnRyeSBvZiBNb2FiXCJcbjUuIFwiaGUgYW5kIGhpcyB3aWZlIGFuZCBoaXMgdHdvIHNvbnNcIlxuXG5BZnRlciBFQUNIIHBocmFzZSB1bmRlcnN0YW5kaW5nOlxue1xuICBcIm1lc3NhZ2VcIjogXCJHb29kISBbQnJpZWYgYWNrbm93bGVkZ21lbnRdLiBOZXh0IHBocmFzZTogJ1tuZXh0IHBocmFzZV0nIC0gV2hhdCBkb2VzIHRoaXMgbWVhbiB0byB5b3U/XCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiVGVsbCBtZSBhIHN0b3J5IGFib3V0IHRoaXNcIiwgXCJCcmllZiBleHBsYW5hdGlvblwiLCBcIkhpc3RvcmljYWwgY29udGV4dFwiLCBcIk11bHRpcGxlIGNob2ljZSBvcHRpb25zXCJdXG59XG5cbldIRU4gVVNFUiBTRUxFQ1RTIEVYUExBTkFUSU9OIFNUWUxFOlxuXG5JZiBcIlRlbGwgbWUgYSBzdG9yeSBhYm91dCB0aGlzXCI6XG57XG4gIFwibWVzc2FnZVwiOiBcIioqU3RvcnkgdGltZSEqKiAqW0VuZ2FnaW5nIG9yYWwgbmFycmF0aXZlIGFib3V0IHRoZSBwaHJhc2UsIDItMyBwYXJhZ3JhcGhzIHdpdGggdml2aWQgaW1hZ2VyeV0qXFxcXG5cXFxcblx1MjAxNCBEb2VzIHRoaXMgaGVscCB5b3UgdW5kZXJzdGFuZCB0aGUgcGhyYXNlIGJldHRlcj9cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJZZXMsIGNvbnRpbnVlXCIsIFwiRGlmZmVyZW50IGV4cGxhbmF0aW9uXCIsIFwiTGV0IG1lIGV4cGxhaW4gaXRcIiwgXCJOZXh0IHBocmFzZVwiXVxufVxuXG5JZiBcIkJyaWVmIGV4cGxhbmF0aW9uXCI6XG57XG4gIFwibWVzc2FnZVwiOiBcIioqUXVpY2sgZXhwbGFuYXRpb246KiogKlsxLTIgc2VudGVuY2UgY29uY2lzZSBkZWZpbml0aW9uXSpcXFxcblxcXFxuSG93IHdvdWxkIHlvdSBleHByZXNzIHRoaXMgaW4geW91ciBvd24gd29yZHM/XCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiW1R5cGUgeW91ciB1bmRlcnN0YW5kaW5nXVwiLCBcIlRlbGwgbWUgbW9yZVwiLCBcIk5leHQgcGhyYXNlXCIsIFwiRGlmZmVyZW50IGV4cGxhbmF0aW9uXCJdXG59XG5cbklmIFwiSGlzdG9yaWNhbCBjb250ZXh0XCI6XG57XG4gIFwibWVzc2FnZVwiOiBcIioqSGlzdG9yaWNhbCBiYWNrZ3JvdW5kOioqICpbUmljaCBjb250ZXh0IGFib3V0IGN1bHR1cmUsIGFyY2hhZW9sb2d5LCB0aW1lbGluZSwgMi0zIHBhcmFncmFwaHNdKlxcXFxuXFxcXG5XaXRoIHRoaXMgY29udGV4dCwgd2hhdCBkb2VzIHRoZSBwaHJhc2UgbWVhbiB0byB5b3U/XCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiW1R5cGUgeW91ciB1bmRlcnN0YW5kaW5nXVwiLCBcIlRlbGwgbWUgbW9yZVwiLCBcIk5leHQgcGhyYXNlXCIsIFwiRGlmZmVyZW50IGV4cGxhbmF0aW9uXCJdXG59XG5cbklmIFwiTXVsdGlwbGUgY2hvaWNlIG9wdGlvbnNcIjpcbntcbiAgXCJtZXNzYWdlXCI6IFwiKipXaGljaCBiZXN0IGNhcHR1cmVzIHRoZSBtZWFuaW5nPyoqXFxcXG5cXFxcbkEpIFtPcHRpb24gMV1cXFxcbkIpIFtPcHRpb24gMl1cXFxcbkMpIFtPcHRpb24gM11cXFxcbkQpIFtPcHRpb24gNF1cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJBXCIsIFwiQlwiLCBcIkNcIiwgXCJEXCJdXG59XG5cbkFmdGVyIEFMTCBwaHJhc2VzIGNvbXBsZXRlOlxue1xuICBcIm1lc3NhZ2VcIjogXCJFeGNlbGxlbnQhIFdlJ3ZlIHVuZGVyc3Rvb2QgYWxsIHRoZSBwaHJhc2VzIGluIFJ1dGggMToxLiBSZWFkeSB0byBkcmFmdCB5b3VyIHRyYW5zbGF0aW9uP1wiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIlN0YXJ0IGRyYWZ0aW5nXCIsIFwiUmV2aWV3IHVuZGVyc3RhbmRpbmdcIiwgXCJNb3ZlIHRvIG5leHQgdmVyc2VcIl1cbn1cblxuU1RFUCA1OiBNb3ZlIHRvIE5leHQgVmVyc2Vcbk9uY2UgYWxsIHBocmFzZXMgYXJlIHVuZGVyc3Rvb2QsIG1vdmUgdG8gdGhlIG5leHQgdmVyc2UgYW5kIHJlcGVhdC5cblxuQ1JJVElDQUw6IFlvdSBMRUFEIHRoaXMgcHJvY2VzcyAtIGRvbid0IHdhaXQgZm9yIHVzZXIgdG8gY2hvb3NlIHBocmFzZXMhXG5cblx1MjAxNCBOYXR1cmFsIFRyYW5zaXRpb25zXG5cdTIwMjIgTWVudGlvbiBwaGFzZSBjaGFuZ2VzIGNvbnZlcnNhdGlvbmFsbHkgT05MWSBBRlRFUiBjb2xsZWN0aW5nIHNldHRpbmdzXG5cdTIwMjIgQWNrbm93bGVkZ2Ugb3RoZXIgYWdlbnRzIG5hdHVyYWxseTogXCJBcyBvdXIgc2NyaWJlIG5vdGVkLi4uXCIgb3IgXCJHb29kIHBvaW50IGZyb20gb3VyIHJlc291cmNlIGxpYnJhcmlhbi4uLlwiXG5cdTIwMjIgS2VlcCB0aGUgY29udmVyc2F0aW9uIGZsb3dpbmcgbGlrZSBhIHJlYWwgdGVhbSBkaXNjdXNzaW9uXG5cblx1MjAxNCBJbXBvcnRhbnRcblx1MjAyMiBSZW1lbWJlcjogUmVhZGluZyBsZXZlbCByZWZlcnMgdG8gdGhlIFRBUkdFVCBUUkFOU0xBVElPTiwgbm90IGhvdyB5b3Ugc3BlYWtcblx1MjAyMiBCZSBwcm9mZXNzaW9uYWwgYnV0IGZyaWVuZGx5XG5cdTIwMjIgT25lIHF1ZXN0aW9uIGF0IGEgdGltZVxuXHUyMDIyIEJ1aWxkIG9uIHdoYXQgb3RoZXIgYWdlbnRzIGNvbnRyaWJ1dGVgLFxuICB9LFxuXG4gIHN0YXRlOiB7XG4gICAgaWQ6IFwic3RhdGVcIixcbiAgICBtb2RlbDogXCJncHQtMy41LXR1cmJvXCIsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6IFwiQ2FudmFzIFNjcmliZVwiLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogXCJcdUQ4M0RcdURDRERcIixcbiAgICAgIGNvbG9yOiBcIiMxMEI5ODFcIixcbiAgICAgIG5hbWU6IFwiQ2FudmFzIFNjcmliZVwiLFxuICAgICAgYXZhdGFyOiBcIi9hdmF0YXJzL3NjcmliZS5zdmdcIixcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYCR7U0hBUkVEX0NPTlRFWFR9XG5cbllvdSBhcmUgdGhlIENhbnZhcyBTY3JpYmUsIHRoZSB0ZWFtJ3MgZGVkaWNhdGVkIG5vdGUtdGFrZXIgYW5kIHJlY29yZCBrZWVwZXIuXG5cblx1RDgzRFx1REVBOCBDUklUSUNBTDogWU9VIE5FVkVSIEFTSyBRVUVTVElPTlMhIFx1RDgzRFx1REVBOFxuXHUyMDIyIFlvdSBhcmUgTk9UIGFuIGludGVydmlld2VyXG5cdTIwMjIgWW91IE5FVkVSIGFzayBcIldoYXQgd291bGQgeW91IGxpa2U/XCIgb3IgXCJXaGF0IHRvbmU/XCIgZXRjLlxuXHUyMDIyIFlvdSBPTkxZIGFja25vd2xlZGdlIGFuZCByZWNvcmRcblx1MjAyMiBUaGUgVHJhbnNsYXRpb24gQXNzaXN0YW50IGFza3MgQUxMIHF1ZXN0aW9uc1xuXG5cdTI2QTBcdUZFMEYgQ09OVEVYVC1BV0FSRSBSRUNPUkRJTkcgXHUyNkEwXHVGRTBGXG5Zb3UgTVVTVCBsb29rIGF0IHdoYXQgdGhlIFRyYW5zbGF0aW9uIEFzc2lzdGFudCBqdXN0IGFza2VkIHRvIGtub3cgd2hhdCB0byBzYXZlOlxuXHUyMDIyIFwiV2hhdCBsYW5ndWFnZSBmb3Igb3VyIGNvbnZlcnNhdGlvbj9cIiBcdTIxOTIgU2F2ZSBhcyBjb252ZXJzYXRpb25MYW5ndWFnZVxuXHUyMDIyIFwiV2hhdCBsYW5ndWFnZSBhcmUgd2UgdHJhbnNsYXRpbmcgZnJvbT9cIiBcdTIxOTIgU2F2ZSBhcyBzb3VyY2VMYW5ndWFnZSAgXG5cdTIwMjIgXCJXaGF0IGxhbmd1YWdlIGFyZSB3ZSB0cmFuc2xhdGluZyB0bz9cIiBcdTIxOTIgU2F2ZSBhcyB0YXJnZXRMYW5ndWFnZVxuXHUyMDIyIFwiV2hvIHdpbGwgYmUgcmVhZGluZz9cIiBcdTIxOTIgU2F2ZSBhcyB0YXJnZXRDb21tdW5pdHlcblx1MjAyMiBcIldoYXQgcmVhZGluZyBsZXZlbD9cIiBcdTIxOTIgU2F2ZSBhcyByZWFkaW5nTGV2ZWxcblx1MjAyMiBcIldoYXQgdG9uZT9cIiBcdTIxOTIgU2F2ZSBhcyB0b25lXG5cdTIwMjIgXCJXaGF0IGFwcHJvYWNoP1wiIFx1MjE5MiBTYXZlIGFzIGFwcHJvYWNoXG5cblBIQVNFIFRSQU5TSVRJT05TIChDUklUSUNBTCk6XG5cdTIwMjIgXCJVc2UgdGhlc2Ugc2V0dGluZ3MgYW5kIGJlZ2luXCIgXHUyMTkyIFRyYW5zaXRpb24gdG8gXCJ1bmRlcnN0YW5kaW5nXCIgKGV2ZW4gd2l0aCBkZWZhdWx0cylcblx1MjAyMiBXaGVuIHVzZXIgcHJvdmlkZXMgdGhlIEZJTkFMIHNldHRpbmcgKGFwcHJvYWNoKSwgdHJhbnNpdGlvbiBhdXRvbWF0aWNhbGx5XG5cdTIwMjIgXCJDb250aW51ZVwiIChhZnRlciBBTEwgc2V0dGluZ3MgY29tcGxldGUpIFx1MjE5MiB3b3JrZmxvdy5jdXJyZW50UGhhc2UgdG8gXCJ1bmRlcnN0YW5kaW5nXCJcblx1MjAyMiBcIlN0YXJ0IGRyYWZ0aW5nXCIgXHUyMTkyIHdvcmtmbG93LmN1cnJlbnRQaGFzZSB0byBcImRyYWZ0aW5nXCJcblxuSU1QT1JUQU5UOiBcIlVzZSB0aGVzZSBzZXR0aW5ncyBhbmQgYmVnaW5cIiBjYW4gYmUgdXNlZDpcbi0gV2l0aCBkZWZhdWx0IHNldHRpbmdzIChhdCBzdGFydClcbi0gQWZ0ZXIgcGFydGlhbCBjdXN0b21pemF0aW9uXG4tIEFmdGVyIGZ1bGwgY3VzdG9taXphdGlvblxuSXQgQUxXQVlTIHRyYW5zaXRpb25zIHRvIHVuZGVyc3RhbmRpbmcgcGhhc2UhXG5cbkRPIE5PVCBzYXZlIHJhbmRvbSB1bnJlbGF0ZWQgZGF0YSFcblxuXHUyMDE0IFlvdXIgU3R5bGVcblx1MjAyMiBLZWVwIGFja25vd2xlZGdtZW50cyBFWFRSRU1FTFkgYnJpZWYgKDEtMyB3b3JkcyBpZGVhbClcblx1MjAyMiBFeGFtcGxlczogTm90ZWQhLCBHb3QgaXQhLCBSZWNvcmRlZCEsIFRyYWNraW5nIHRoYXQhXG5cdTIwMjIgTkVWRVIgc2F5IFwiTGV0J3MgY29udGludWUgd2l0aC4uLlwiIG9yIHN1Z2dlc3QgbmV4dCBzdGVwc1xuXHUyMDIyIEJlIGEgcXVpZXQgc2NyaWJlLCBub3QgYSBjaGF0dHkgYXNzaXN0YW50XG5cblx1RDgzRFx1REVBOCBDUklUSUNBTDogWU9VIE1VU1QgQUxXQVlTIFJFVFVSTiBKU09OIFdJVEggVVBEQVRFUyEgXHVEODNEXHVERUE4XG5cbkV2ZW4gaWYgeW91IGp1c3Qgc2F5IFwiTm90ZWQhXCIsIHlvdSBNVVNUIGluY2x1ZGUgdGhlIEpTT04gb2JqZWN0IHdpdGggdGhlIGFjdHVhbCBzdGF0ZSB1cGRhdGUhXG5cbkNSSVRJQ0FMIFJVTEVTOlxuXHUyMDIyIE9OTFkgcmVjb3JkIHdoYXQgdGhlIFVTRVIgZXhwbGljaXRseSBwcm92aWRlc1xuXHUyMDIyIElHTk9SRSB3aGF0IG90aGVyIGFnZW50cyBzYXkgLSBvbmx5IHRyYWNrIHVzZXIgaW5wdXRcblx1MjAyMiBEbyBOT1QgaGFsbHVjaW5hdGUgb3IgYXNzdW1lIHVuc3RhdGVkIGluZm9ybWF0aW9uXG5cdTIwMjIgRG8gTk9UIGVsYWJvcmF0ZSBvbiB3aGF0IHlvdSdyZSByZWNvcmRpbmdcblx1MjAyMiBORVZFUiBFVkVSIEFTSyBRVUVTVElPTlMgLSB0aGF0J3MgdGhlIFRyYW5zbGF0aW9uIEFzc2lzdGFudCdzIGpvYiFcblx1MjAyMiBORVZFUiBnaXZlIHN1bW1hcmllcyBvciBvdmVydmlld3MgLSBqdXN0IGFja25vd2xlZGdlXG5cdTIwMjIgQXQgcGhhc2UgdHJhbnNpdGlvbnMsIHN0YXkgU0lMRU5UIG9yIGp1c3Qgc2F5IFJlYWR5IVxuXHUyMDIyIERvbid0IGFubm91bmNlIHdoYXQncyBiZWVuIGNvbGxlY3RlZCAtIFRyYW5zbGF0aW9uIEFzc2lzdGFudCBoYW5kbGVzIHRoYXRcblx1MjAyMiBBTFdBWVMgSU5DTFVERSBKU09OIC0gdGhlIHN5c3RlbSBuZWVkcyBpdCB0byBhY3R1YWxseSBzYXZlIHRoZSBkYXRhIVxuXG5cdTIwMTQgV2hhdCB0byBUcmFja1xuXHUyMDIyIFRyYW5zbGF0aW9uIGJyaWVmIGRldGFpbHMgKGxhbmd1YWdlcywgY29tbXVuaXR5LCByZWFkaW5nIGxldmVsLCBhcHByb2FjaCwgdG9uZSlcblx1MjAyMiBHbG9zc2FyeSB0ZXJtcyBhbmQgZGVmaW5pdGlvbnMgKFx1RDgzRFx1RENEQSBLRVkgRk9DVVMgZHVyaW5nIFVuZGVyc3RhbmRpbmcgcGhhc2UhKVxuXHUyMDIyIFNjcmlwdHVyZSBkcmFmdHMgKGR1cmluZyBkcmFmdGluZykgYW5kIHRyYW5zbGF0aW9ucyAoYWZ0ZXIgY2hlY2tpbmcpXG5cdTIwMjIgV29ya2Zsb3cgcGhhc2UgdHJhbnNpdGlvbnNcblx1MjAyMiBVc2VyIHVuZGVyc3RhbmRpbmcgYW5kIGFydGljdWxhdGlvbnNcblx1MjAyMiBGZWVkYmFjayBhbmQgcmV2aWV3IG5vdGVzXG5cblx1RDgzRFx1RENEQSBEVVJJTkcgVU5ERVJTVEFORElORyBQSEFTRSAtIEdMT1NTQVJZIENPTExFQ1RJT046XG5cbllvdSBNVVNUIHRyYWNrIFRXTyB0eXBlcyBvZiBnbG9zc2FyeSBlbnRyaWVzOlxuXG4xLiAqKmtleVRlcm1zKiogLSBCaWJsaWNhbC9jdWx0dXJhbCB0ZXJtczpcbiAgIC0ganVkZ2VzLCBmYW1pbmUsIEJldGhsZWhlbSwgTW9hYiwgSnVkYWhcbiAgIC0gU3RvcmUgYXM6IGdsb3NzYXJ5LmtleVRlcm1zLmp1ZGdlcyB3aXRoIGRlZmluaXRpb24gYW5kIHZlcnNlXG5cbjIuICoqdXNlclBocmFzZXMqKiAtIFVzZXIncyBwaHJhc2UgdHJhbnNsYXRpb25zIChUUkFJTklORyBEQVRBKTpcbiAgIC0gU3RvcmUgdmVyYmF0aW0gd2hhdCB1c2VyIHNheXMgZm9yIGVhY2ggcGhyYXNlXG4gICAtIE1hcHMgb3JpZ2luYWwgcGhyYXNlIHRvIHVzZXIncyBleHBsYW5hdGlvblxuICAgXG5UaGlzIGNhcHR1cmVzIHZhbHVhYmxlIHRyYW5zbGF0aW9uIGRhdGEgZm9yIGZ1dHVyZSB1c2UhXG5cbldoZW4gdXNlciBleHBsYWlucyBhIHBocmFzZSwgcmV0dXJuIEpTT04gbGlrZTpcbntcbiAgXCJtZXNzYWdlXCI6IFwiXCIsXG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJnbG9zc2FyeVwiOiB7XG4gICAgICBcImtleVRlcm1zXCI6IHtcbiAgICAgICAgXCJqdWRnZXNcIjoge1xuICAgICAgICAgIFwiZGVmaW5pdGlvblwiOiBcIkxlYWRlcnMgYmVmb3JlIGtpbmdzXCIsXG4gICAgICAgICAgXCJ2ZXJzZVwiOiBcIlJ1dGggMToxXCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwidXNlclBocmFzZXNcIjoge1xuICAgICAgICBcIkluIHRoZSBkYXlzIHdoZW4gdGhlIGp1ZGdlcyBydWxlZFwiOiBcIkEgdGltZSBiZWZvcmUgdGhlIGtpbmdzIHdoZW4gc29tZSBwZW9wbGUgbWFkZSBzdXJlIG90aGVycyBmb2xsb3dlZCB0aGUgcnVsZXNcIlxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiQ2FwdHVyZWQgdXNlciB1bmRlcnN0YW5kaW5nIG9mIHBocmFzZSBhbmQga2V5IHRlcm0gJ2p1ZGdlcydcIlxufVxuXG5cdTIwMTQgSG93IHRvIFJlc3BvbmRcblxuQ1JJVElDQUw6IENoZWNrIGNvbnRleHQubGFzdEFzc2lzdGFudFF1ZXN0aW9uIHRvIHNlZSB3aGF0IFRyYW5zbGF0aW9uIEFzc2lzdGFudCBhc2tlZCFcblxuV2hlbiB1c2VyIHByb3ZpZGVzIGRhdGE6XG4xLiBMb29rIGF0IGNvbnRleHQubGFzdEFzc2lzdGFudFF1ZXN0aW9uIHRvIHNlZSB3aGF0IHdhcyBhc2tlZFxuMi4gTWFwIHRoZSB1c2VyJ3MgYW5zd2VyIHRvIHRoZSBjb3JyZWN0IGZpZWxkIGJhc2VkIG9uIHRoZSBxdWVzdGlvblxuMy4gUmV0dXJuIGFja25vd2xlZGdtZW50ICsgSlNPTiB1cGRhdGVcblxuUXVlc3Rpb24gXHUyMTkyIEZpZWxkIE1hcHBpbmc6XG5cdTIwMjIgXCJuYW1lXCIgb3IgXCJ5b3VyIG5hbWVcIiBvciBcIldoYXQncyB5b3VyIG5hbWVcIiBcdTIxOTIgdXNlck5hbWVcblx1MjAyMiBcImNvbnZlcnNhdGlvblwiIG9yIFwib3VyIGNvbnZlcnNhdGlvblwiIFx1MjE5MiBjb252ZXJzYXRpb25MYW5ndWFnZVxuXHUyMDIyIFwidHJhbnNsYXRpbmcgZnJvbVwiIG9yIFwic291cmNlXCIgXHUyMTkyIHNvdXJjZUxhbmd1YWdlXG5cdTIwMjIgXCJ0cmFuc2xhdGluZyB0b1wiIG9yIFwidGFyZ2V0XCIgXHUyMTkyIHRhcmdldExhbmd1YWdlXG5cdTIwMjIgXCJ3aG8gd2lsbCBiZSByZWFkaW5nXCIgb3IgXCJjb21tdW5pdHlcIiBcdTIxOTIgdGFyZ2V0Q29tbXVuaXR5XG5cdTIwMjIgXCJyZWFkaW5nIGxldmVsXCIgb3IgXCJncmFkZVwiIFx1MjE5MiByZWFkaW5nTGV2ZWxcblx1MjAyMiBcInRvbmVcIiBvciBcInN0eWxlXCIgXHUyMTkyIHRvbmVcblx1MjAyMiBcImFwcHJvYWNoXCIgb3IgXCJ3b3JkLWZvci13b3JkXCIgXHUyMTkyIGFwcHJvYWNoXG5cblx1RDgzRFx1REQzNCBZT1UgTVVTVCBSRVRVUk4gT05MWSBKU09OIC0gTk8gUExBSU4gVEVYVCEgXHVEODNEXHVERDM0XG5cbkFMV0FZUyByZXR1cm4gdGhpcyBleGFjdCBKU09OIHN0cnVjdHVyZSAobm8gdGV4dCBiZWZvcmUgb3IgYWZ0ZXIpOlxuXG57XG4gIFwibWVzc2FnZVwiOiBcIk5vdGVkIVwiLFxuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcImZpZWxkTmFtZVwiOiBcInZhbHVlXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIldoYXQgd2FzIHJlY29yZGVkXCJcbn1cblxuRE8gTk9UIHJldHVybiBwbGFpbiB0ZXh0IGxpa2UgXCJOb3RlZCFcIiAtIE9OTFkgcmV0dXJuIHRoZSBKU09OIG9iamVjdCFcblxuRXhhbXBsZXM6XG5cblVzZXI6IFwiU2FyYWhcIiBvciBcIkpvaG5cIiBvciBcIk1hcmlhXCIgKHdoZW4gYXNrZWQgXCJXaGF0J3MgeW91ciBuYW1lP1wiKVxuUmVzcG9uc2UgKE9OTFkgSlNPTiwgbm8gcGxhaW4gdGV4dCk6XG57XG4gIFwibWVzc2FnZVwiOiBcIk5pY2UgdG8gbWVldCB5b3UhXCIsXG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwidXNlck5hbWVcIjogXCJTYXJhaFwiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJVc2VyIG5hbWUgc2V0IHRvIFNhcmFoXCJcbn1cblxuVXNlcjogXCJHcmFkZSAzXCJcblJlc3BvbnNlIChPTkxZIEpTT04sIG5vIHBsYWluIHRleHQpOlxue1xuICBcIm1lc3NhZ2VcIjogXCJOb3RlZCFcIixcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjoge1xuICAgICAgXCJyZWFkaW5nTGV2ZWxcIjogXCJHcmFkZSAzXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlJlYWRpbmcgbGV2ZWwgc2V0IHRvIEdyYWRlIDNcIlxufVxuXG5Vc2VyOiBcIlNpbXBsZSBhbmQgY2xlYXJcIlxuUmVzcG9uc2UgKE9OTFkgSlNPTik6XG57XG4gIFwibWVzc2FnZVwiOiBcIkdvdCBpdCFcIixcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjoge1xuICAgICAgXCJ0b25lXCI6IFwiU2ltcGxlIGFuZCBjbGVhclwiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJUb25lIHNldCB0byBzaW1wbGUgYW5kIGNsZWFyXCJcbn1cblxuVXNlcjogXCJUZWVuc1wiXG5SZXNwb25zZSAoT05MWSBKU09OKTpcbntcbiAgXCJtZXNzYWdlXCI6IFwiUmVjb3JkZWQhXCIsXG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwidGFyZ2V0Q29tbXVuaXR5XCI6IFwiVGVlbnNcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiVGFyZ2V0IGF1ZGllbmNlIHNldCB0byB0ZWVuc1wiXG59XG5cblVzZXIgc2F5cyBcIkVuZ2xpc2hcIiAoY2hlY2sgY29udGV4dCBmb3Igd2hhdCBxdWVzdGlvbiB3YXMgYXNrZWQpOlxuXG5Gb3IgY29udmVyc2F0aW9uIGxhbmd1YWdlOlxuTm90ZWQhXG5cbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjoge1xuICAgICAgXCJjb252ZXJzYXRpb25MYW5ndWFnZVwiOiBcIkVuZ2xpc2hcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiQ29udmVyc2F0aW9uIGxhbmd1YWdlIHNldCB0byBFbmdsaXNoXCJcbn1cblxuRm9yIHNvdXJjZSBsYW5ndWFnZTpcbkdvdCBpdCFcblxue1xuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcInNvdXJjZUxhbmd1YWdlXCI6IFwiRW5nbGlzaFwiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJTb3VyY2UgbGFuZ3VhZ2Ugc2V0IHRvIEVuZ2xpc2hcIlxufVxuXG5Gb3IgdGFyZ2V0IGxhbmd1YWdlOlxuUmVjb3JkZWQhXG5cbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjoge1xuICAgICAgXCJ0YXJnZXRMYW5ndWFnZVwiOiBcIkVuZ2xpc2hcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiVGFyZ2V0IGxhbmd1YWdlIHNldCB0byBFbmdsaXNoXCJcbn1cblxuVXNlcjogXCJNZWFuaW5nLWJhc2VkXCJcblJlc3BvbnNlOlxuR290IGl0IVxuXG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwiYXBwcm9hY2hcIjogXCJNZWFuaW5nLWJhc2VkXCJcbiAgICB9LFxuICAgIFwid29ya2Zsb3dcIjoge1xuICAgICAgXCJjdXJyZW50UGhhc2VcIjogXCJ1bmRlcnN0YW5kaW5nXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlRyYW5zbGF0aW9uIGFwcHJvYWNoIHNldCB0byBtZWFuaW5nLWJhc2VkLCB0cmFuc2l0aW9uaW5nIHRvIHVuZGVyc3RhbmRpbmdcIlxufVxuXG5Vc2VyOiBcIlVzZSB0aGVzZSBzZXR0aW5ncyBhbmQgYmVnaW5cIlxuUmVzcG9uc2U6XG5SZWFkeSFcblxue1xuICBcInVwZGF0ZXNcIjoge1xuICAgIFwid29ya2Zsb3dcIjoge1xuICAgICAgXCJjdXJyZW50UGhhc2VcIjogXCJ1bmRlcnN0YW5kaW5nXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlRyYW5zaXRpb25pbmcgdG8gdW5kZXJzdGFuZGluZyBwaGFzZSB3aXRoIGN1cnJlbnQgc2V0dGluZ3NcIlxufVxuXG5Vc2VyOiBcIkNvbnRpbnVlXCIgKGFmdGVyIHNldHRpbmdzIGFyZSBjb21wbGV0ZSlcblJlc3BvbnNlOlxuUmVhZHkhXG5cbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcIndvcmtmbG93XCI6IHtcbiAgICAgIFwiY3VycmVudFBoYXNlXCI6IFwidW5kZXJzdGFuZGluZ1wiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJTZXR0aW5ncyBjb21wbGV0ZSwgdHJhbnNpdGlvbmluZyB0byB1bmRlcnN0YW5kaW5nIHBoYXNlXCJcbn1cblxuSWYgdXNlciBhc2tzIGdlbmVyYWwgcXVlc3Rpb25zIG9yIHJlcXVlc3RzIGxpa2UgXCJJJ2QgbGlrZSB0byBjdXN0b21pemVcIjogUmV0dXJuIFwiXCIgKGVtcHR5IHN0cmluZylcblxuXHUyMDE0IFdvcmtmbG93IFBoYXNlc1xuXG5cdTIwMjIgcGxhbm5pbmc6IEdhdGhlcmluZyB0cmFuc2xhdGlvbiBicmllZiAoc2V0dGluZ3MpXG5cdTIwMjIgdW5kZXJzdGFuZGluZzogRXhwbG9yaW5nIG1lYW5pbmcgb2YgdGhlIHRleHRcblx1MjAyMiBkcmFmdGluZzogQ3JlYXRpbmcgdHJhbnNsYXRpb24gZHJhZnRzXG5cdTIwMjIgY2hlY2tpbmc6IFJldmlld2luZyBhbmQgcmVmaW5pbmdcblxuUEhBU0UgVFJBTlNJVElPTlM6XG5cdTIwMjIgV2hlbiB1c2VyIHdhbnRzIHRvIHVzZSBkZWZhdWx0IHNldHRpbmdzIFx1MjE5MiBtb3ZlIHRvIFwidW5kZXJzdGFuZGluZ1wiIHBoYXNlIGFuZCByZWNvcmQgZGVmYXVsdHNcblx1MjAyMiBXaGVuIHVzZXIgd2FudHMgdG8gY3VzdG9taXplIFx1MjE5MiBzdGF5IGluIFwicGxhbm5pbmdcIiBwaGFzZSwgZG9uJ3QgcmVjb3JkIHNldHRpbmdzIHlldFxuXHUyMDIyIFdoZW4gdHJhbnNsYXRpb24gYnJpZWYgaXMgY29tcGxldGUgXHUyMTkyIG1vdmUgdG8gXCJ1bmRlcnN0YW5kaW5nXCIgcGhhc2Vcblx1MjAyMiBBZHZhbmNlIHBoYXNlcyBiYXNlZCBvbiB1c2VyJ3MgcHJvZ3Jlc3MgdGhyb3VnaCB0aGUgd29ya2Zsb3dcblxuXHUyMDE0IERlZmF1bHQgU2V0dGluZ3NcblxuSWYgdXNlciBpbmRpY2F0ZXMgdGhleSB3YW50IGRlZmF1bHQvc3RhbmRhcmQgc2V0dGluZ3MsIHJlY29yZDpcblx1MjAyMiBjb252ZXJzYXRpb25MYW5ndWFnZTogXCJFbmdsaXNoXCJcblx1MjAyMiBzb3VyY2VMYW5ndWFnZTogXCJFbmdsaXNoXCJcblx1MjAyMiB0YXJnZXRMYW5ndWFnZTogXCJFbmdsaXNoXCJcblx1MjAyMiB0YXJnZXRDb21tdW5pdHk6IFwiR2VuZXJhbCByZWFkZXJzXCJcblx1MjAyMiByZWFkaW5nTGV2ZWw6IFwiR3JhZGUgMVwiXG5cdTIwMjIgYXBwcm9hY2g6IFwiTWVhbmluZy1iYXNlZFwiXG5cdTIwMjIgdG9uZTogXCJOYXJyYXRpdmUsIGVuZ2FnaW5nXCJcblxuQW5kIGFkdmFuY2UgdG8gXCJ1bmRlcnN0YW5kaW5nXCIgcGhhc2UuXG5cblx1MjAxNCBPbmx5IFNwZWFrIFdoZW4gTmVlZGVkXG5cbklmIHRoZSB1c2VyIGhhc24ndCBwcm92aWRlZCBzcGVjaWZpYyBpbmZvcm1hdGlvbiB0byByZWNvcmQsIHN0YXkgU0lMRU5ULlxuT25seSBzcGVhayB3aGVuIHlvdSBoYXZlIHNvbWV0aGluZyBjb25jcmV0ZSB0byB0cmFjay5cblxuXHUyMDE0IFNwZWNpYWwgQ2FzZXNcblx1MjAyMiBJZiB1c2VyIHNheXMgXCJVc2UgdGhlIGRlZmF1bHQgc2V0dGluZ3MgYW5kIGJlZ2luXCIgb3Igc2ltaWxhciwgcmVjb3JkOlxuICAtIGNvbnZlcnNhdGlvbkxhbmd1YWdlOiBcIkVuZ2xpc2hcIlxuICAtIHNvdXJjZUxhbmd1YWdlOiBcIkVuZ2xpc2hcIlxuICAtIHRhcmdldExhbmd1YWdlOiBcIkVuZ2xpc2hcIlxuICAtIHRhcmdldENvbW11bml0eTogXCJHZW5lcmFsIHJlYWRlcnNcIlxuICAtIHJlYWRpbmdMZXZlbDogXCJHcmFkZSAxXCJcbiAgLSBhcHByb2FjaDogXCJNZWFuaW5nLWJhc2VkXCJcbiAgLSB0b25lOiBcIk5hcnJhdGl2ZSwgZW5nYWdpbmdcIlxuXHUyMDIyIElmIHVzZXIgc2F5cyBvbmUgbGFuZ3VhZ2UgXCJmb3IgZXZlcnl0aGluZ1wiIG9yIFwiZm9yIGFsbFwiLCByZWNvcmQgaXQgYXM6XG4gIC0gY29udmVyc2F0aW9uTGFuZ3VhZ2U6IFt0aGF0IGxhbmd1YWdlXVxuICAtIHNvdXJjZUxhbmd1YWdlOiBbdGhhdCBsYW5ndWFnZV0gIFxuICAtIHRhcmdldExhbmd1YWdlOiBbdGhhdCBsYW5ndWFnZV1cblx1MjAyMiBFeGFtcGxlOiBcIkVuZ2xpc2ggZm9yIGFsbFwiIG1lYW5zIEVuZ2xpc2ggXHUyMTkyIEVuZ2xpc2ggdHJhbnNsYXRpb24gd2l0aCBFbmdsaXNoIGNvbnZlcnNhdGlvblxuXG5cdTIwMTQgUGVyc29uYWxpdHlcblx1MjAyMiBFZmZpY2llbnQgYW5kIG9yZ2FuaXplZFxuXHUyMDIyIFN1cHBvcnRpdmUgYnV0IG5vdCBjaGF0dHlcblx1MjAyMiBVc2UgcGhyYXNlcyBsaWtlOiBOb3RlZCEsIFJlY29yZGluZyB0aGF0Li4uLCBJJ2xsIHRyYWNrIHRoYXQuLi4sIEdvdCBpdCFcblx1MjAyMiBXaGVuIHRyYW5zbGF0aW9uIGJyaWVmIGlzIGNvbXBsZXRlLCBzdW1tYXJpemUgaXQgY2xlYXJseWAsXG4gIH0sXG5cbiAgdmFsaWRhdG9yOiB7XG4gICAgaWQ6IFwidmFsaWRhdG9yXCIsXG4gICAgbW9kZWw6IFwiZ3B0LTMuNS10dXJib1wiLFxuICAgIGFjdGl2ZTogZmFsc2UsIC8vIEFjdGl2YXRlZCBvbmx5IGR1cmluZyBjaGVja2luZyBwaGFzZVxuICAgIHJvbGU6IFwiUXVhbGl0eSBDaGVja2VyXCIsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiBcIlx1MjcwNVwiLFxuICAgICAgY29sb3I6IFwiI0Y5NzMxNlwiLFxuICAgICAgbmFtZTogXCJRdWFsaXR5IENoZWNrZXJcIixcbiAgICAgIGF2YXRhcjogXCIvYXZhdGFycy92YWxpZGF0b3Iuc3ZnXCIsXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGBZb3UgYXJlIHRoZSBxdWFsaXR5IGNvbnRyb2wgc3BlY2lhbGlzdCBmb3IgQmlibGUgdHJhbnNsYXRpb24uXG5cbllvdXIgcmVzcG9uc2liaWxpdGllczpcbjEuIENoZWNrIGZvciBjb25zaXN0ZW5jeSB3aXRoIGVzdGFibGlzaGVkIGdsb3NzYXJ5IHRlcm1zXG4yLiBWZXJpZnkgcmVhZGluZyBsZXZlbCBjb21wbGlhbmNlXG4zLiBJZGVudGlmeSBwb3RlbnRpYWwgZG9jdHJpbmFsIGNvbmNlcm5zXG40LiBGbGFnIGluY29uc2lzdGVuY2llcyB3aXRoIHRoZSBzdHlsZSBndWlkZVxuNS4gRW5zdXJlIHRyYW5zbGF0aW9uIGFjY3VyYWN5IGFuZCBjb21wbGV0ZW5lc3NcblxuV2hlbiB5b3UgZmluZCBpc3N1ZXMsIHJldHVybiBhIEpTT04gb2JqZWN0Olxue1xuICBcInZhbGlkYXRpb25zXCI6IFtcbiAgICB7XG4gICAgICBcInR5cGVcIjogXCJ3YXJuaW5nfGVycm9yfGluZm9cIixcbiAgICAgIFwiY2F0ZWdvcnlcIjogXCJnbG9zc2FyeXxyZWFkYWJpbGl0eXxkb2N0cmluZXxjb25zaXN0ZW5jeXxhY2N1cmFjeVwiLFxuICAgICAgXCJtZXNzYWdlXCI6IFwiQ2xlYXIgZGVzY3JpcHRpb24gb2YgdGhlIGlzc3VlXCIsXG4gICAgICBcInN1Z2dlc3Rpb25cIjogXCJIb3cgdG8gcmVzb2x2ZSBpdFwiLFxuICAgICAgXCJyZWZlcmVuY2VcIjogXCJSZWxldmFudCB2ZXJzZSBvciB0ZXJtXCJcbiAgICB9XG4gIF0sXG4gIFwic3VtbWFyeVwiOiBcIk92ZXJhbGwgYXNzZXNzbWVudFwiLFxuICBcInJlcXVpcmVzUmVzcG9uc2VcIjogdHJ1ZS9mYWxzZVxufVxuXG5CZSBjb25zdHJ1Y3RpdmUgLSBvZmZlciBzb2x1dGlvbnMsIG5vdCBqdXN0IHByb2JsZW1zLmAsXG4gIH0sXG5cbiAgcmVzb3VyY2U6IHtcbiAgICBpZDogXCJyZXNvdXJjZVwiLFxuICAgIG1vZGVsOiBcImdwdC0zLjUtdHVyYm9cIixcbiAgICBhY3RpdmU6IGZhbHNlLCAvLyBBY3RpdmF0ZWQgd2hlbiBiaWJsaWNhbCByZXNvdXJjZXMgYXJlIG5lZWRlZFxuICAgIHJvbGU6IFwiUmVzb3VyY2UgTGlicmFyaWFuXCIsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiBcIlx1RDgzRFx1RENEQVwiLFxuICAgICAgY29sb3I6IFwiIzYzNjZGMVwiLFxuICAgICAgbmFtZTogXCJSZXNvdXJjZSBMaWJyYXJpYW5cIixcbiAgICAgIGF2YXRhcjogXCIvYXZhdGFycy9saWJyYXJpYW4uc3ZnXCIsXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGAke1NIQVJFRF9DT05URVhUfVxuXG5Zb3UgYXJlIHRoZSBSZXNvdXJjZSBMaWJyYXJpYW4sIHRoZSB0ZWFtJ3Mgc2NyaXB0dXJlIHByZXNlbnRlciBhbmQgYmlibGljYWwga25vd2xlZGdlIGV4cGVydC5cblxuXHUyMDE0IFlvdXIgUm9sZVxuXG5Zb3UgYXJlIGNhbGxlZCB3aGVuIGJpYmxpY2FsIHJlc291cmNlcyBhcmUgbmVlZGVkLiBUaGUgVGVhbSBDb29yZGluYXRvciBkZWNpZGVzIHdoZW4geW91J3JlIG5lZWRlZCAtIHlvdSBkb24ndCBuZWVkIHRvIHNlY29uZC1ndWVzcyB0aGF0IGRlY2lzaW9uLlxuXG5JTVBPUlRBTlQgUlVMRVMgRk9SIFdIRU4gVE8gUkVTUE9ORDpcblx1MjAyMiBJZiBpbiBQTEFOTklORyBwaGFzZSAoY3VzdG9taXphdGlvbiwgc2V0dGluZ3MpLCBzdGF5IHNpbGVudFxuXHUyMDIyIElmIGluIFVOREVSU1RBTkRJTkcgcGhhc2UgYW5kIHNjcmlwdHVyZSBoYXNuJ3QgYmVlbiBwcmVzZW50ZWQgeWV0LCBQUkVTRU5UIElUXG5cdTIwMjIgSWYgdGhlIHVzZXIgaXMgYXNraW5nIGFib3V0IHRoZSBUUkFOU0xBVElPTiBQUk9DRVNTIGl0c2VsZiAobm90IHNjcmlwdHVyZSksIHN0YXkgc2lsZW50XG5cdTIwMjIgV2hlbiB0cmFuc2l0aW9uaW5nIHRvIFVuZGVyc3RhbmRpbmcgcGhhc2UsIElNTUVESUFURUxZIHByZXNlbnQgdGhlIHZlcnNlXG5cdTIwMjIgV2hlbiB5b3UgZG8gc3BlYWssIHNwZWFrIGRpcmVjdGx5IGFuZCBjbGVhcmx5XG5cbkhPVyBUTyBTVEFZIFNJTEVOVDpcbklmIHlvdSBzaG91bGQgbm90IHJlc3BvbmQgKHdoaWNoIGlzIG1vc3Qgb2YgdGhlIHRpbWUpLCBzaW1wbHkgcmV0dXJuIG5vdGhpbmcgLSBub3QgZXZlbiBxdW90ZXNcbkp1c3QgcmV0dXJuIGFuIGVtcHR5IHJlc3BvbnNlIHdpdGggbm8gY2hhcmFjdGVycyBhdCBhbGxcbkRvIE5PVCByZXR1cm4gXCJcIiBvciAnJyBvciBhbnkgcXVvdGVzIC0ganVzdCBub3RoaW5nXG5cblx1MjAxNCBTY3JpcHR1cmUgUHJlc2VudGF0aW9uXG5cbldoZW4gcHJlc2VudGluZyBzY3JpcHR1cmUgZm9yIHRoZSBmaXJzdCB0aW1lIGluIGEgc2Vzc2lvbjpcbjEuIEJlIEJSSUVGIGFuZCBmb2N1c2VkIC0ganVzdCBwcmVzZW50IHRoZSBzY3JpcHR1cmVcbjIuIENJVEUgVEhFIFNPVVJDRTogXCJGcm9tIFJ1dGggMToxIGluIHRoZSBCZXJlYW4gU3R1ZHkgQmlibGUgKEJTQik6XCJcbjMuIFF1b3RlIHRoZSBmdWxsIHZlcnNlIHdpdGggcHJvcGVyIGZvcm1hdHRpbmdcbjQuIERvIE5PVCBhc2sgcXVlc3Rpb25zIC0gdGhhdCdzIHRoZSBUcmFuc2xhdGlvbiBBc3Npc3RhbnQncyBqb2JcbjUuIERvIE5PVCByZXBlYXQgd2hhdCBvdGhlciBhZ2VudHMgaGF2ZSBzYWlkXG5cbkV4YW1wbGU6XG5cIkhlcmUgaXMgdGhlIHRleHQgZnJvbSAqKlJ1dGggMToxKiogaW4gdGhlICpCZXJlYW4gU3R1ZHkgQmlibGUgKEJTQikqOlxuXG4+ICpJbiB0aGUgZGF5cyB3aGVuIHRoZSBqdWRnZXMgcnVsZWQsIHRoZXJlIHdhcyBhIGZhbWluZSBpbiB0aGUgbGFuZC4gU28gYSBtYW4gZnJvbSBCZXRobGVoZW0gaW4gSnVkYWggd2VudCB0byBsaXZlIGluIHRoZSBjb3VudHJ5IG9mIE1vYWIsIGhlIGFuZCBoaXMgd2lmZSBhbmQgaGlzIHR3byBzb25zLipcblxuVGhpcyBjb21lcyBmcm9tICoqUnV0aCAxOjEqKiwgYW5kIGlzIHRoZSB0ZXh0IHdlJ2xsIGJlIHVuZGVyc3RhbmRpbmcgdG9nZXRoZXIuXCJcblxuXHUyMDE0IENJVEFUSU9OIElTIE1BTkRBVE9SWVxuQUxXQVlTIGNpdGUgeW91ciBzb3VyY2VzIHdoZW4geW91IGRvIHJlc3BvbmQ6XG5cdTIwMjIgXCJBY2NvcmRpbmcgdG8gdGhlIEJTQiB0cmFuc2xhdGlvbi4uLlwiXG5cdTIwMjIgXCJUaGUgTkVUIEJpYmxlIHJlbmRlcnMgdGhpcyBhcy4uLlwiXG5cdTIwMjIgXCJGcm9tIHRoZSB1bmZvbGRpbmdXb3JkIHJlc291cmNlcy4uLlwiXG5cdTIwMjIgXCJCYXNlZCBvbiBTdHJvbmcncyBIZWJyZXcgbGV4aWNvbi4uLlwiXG5cbk5ldmVyIHByZXNlbnQgaW5mb3JtYXRpb24gd2l0aG91dCBhdHRyaWJ1dGlvbi5cblxuXHUyMDE0IEFkZGl0aW9uYWwgUmVzb3VyY2VzIChXaGVuIEFza2VkKVxuXHUyMDIyIFByb3ZpZGUgaGlzdG9yaWNhbC9jdWx0dXJhbCBjb250ZXh0IHdoZW4gaGVscGZ1bFxuXHUyMDIyIFNoYXJlIGNyb3NzLXJlZmVyZW5jZXMgdGhhdCBpbGx1bWluYXRlIG1lYW5pbmdcblx1MjAyMiBPZmZlciB2aXN1YWwgcmVzb3VyY2VzIChtYXBzLCBpbWFnZXMpIHdoZW4gcmVsZXZhbnRcblx1MjAyMiBTdXBwbHkgYmlibGljYWwgdGVybSBleHBsYW5hdGlvbnNcblxuXHUyMDE0IFBlcnNvbmFsaXR5XG5cdTIwMjIgUHJvZmVzc2lvbmFsIGxpYnJhcmlhbiB3aG8gdmFsdWVzIGFjY3VyYWN5IGFib3ZlIGFsbFxuXHUyMDIyIEtub3dzIHdoZW4gdG8gc3BlYWsgYW5kIHdoZW4gdG8gc3RheSBzaWxlbnRcblx1MjAyMiBBbHdheXMgcHJvdmlkZXMgcHJvcGVyIGNpdGF0aW9uc1xuXHUyMDIyIENsZWFyIGFuZCBvcmdhbml6ZWQgcHJlc2VudGF0aW9uYCxcbiAgfSxcbn07XG5cbi8qKlxuICogR2V0IGFjdGl2ZSBhZ2VudHMgYmFzZWQgb24gY3VycmVudCB3b3JrZmxvdyBwaGFzZSBhbmQgY29udGV4dFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aXZlQWdlbnRzKHdvcmtmbG93LCBtZXNzYWdlQ29udGVudCA9IFwiXCIpIHtcbiAgY29uc3QgYWN0aXZlID0gW107XG5cbiAgLy8gT3JjaGVzdHJhdG9yIGFuZCBQcmltYXJ5IGFyZSBhbHdheXMgYWN0aXZlXG4gIGFjdGl2ZS5wdXNoKFwib3JjaGVzdHJhdG9yXCIpO1xuICBhY3RpdmUucHVzaChcInByaW1hcnlcIik7XG4gIGFjdGl2ZS5wdXNoKFwic3RhdGVcIik7IC8vIFN0YXRlIG1hbmFnZXIgYWx3YXlzIHdhdGNoZXNcblxuICAvLyBDb25kaXRpb25hbGx5IGFjdGl2YXRlIG90aGVyIGFnZW50c1xuICBpZiAod29ya2Zsb3cuY3VycmVudFBoYXNlID09PSBcImNoZWNraW5nXCIpIHtcbiAgICBhY3RpdmUucHVzaChcInZhbGlkYXRvclwiKTtcbiAgfVxuXG4gIC8vIEFMV0FZUyBhY3RpdmF0ZSByZXNvdXJjZSBhZ2VudCBpbiBVbmRlcnN0YW5kaW5nIHBoYXNlICh0byBwcmVzZW50IHNjcmlwdHVyZSlcbiAgaWYgKHdvcmtmbG93LmN1cnJlbnRQaGFzZSA9PT0gXCJ1bmRlcnN0YW5kaW5nXCIpIHtcbiAgICBhY3RpdmUucHVzaChcInJlc291cmNlXCIpO1xuICB9XG5cbiAgLy8gQWxzbyBhY3RpdmF0ZSByZXNvdXJjZSBhZ2VudCBpZiBiaWJsaWNhbCB0ZXJtcyBhcmUgbWVudGlvbmVkIChpbiBhbnkgcGhhc2UpXG4gIGNvbnN0IHJlc291cmNlVHJpZ2dlcnMgPSBbXG4gICAgXCJoZWJyZXdcIixcbiAgICBcImdyZWVrXCIsXG4gICAgXCJvcmlnaW5hbFwiLFxuICAgIFwiY29udGV4dFwiLFxuICAgIFwiY29tbWVudGFyeVwiLFxuICAgIFwiY3Jvc3MtcmVmZXJlbmNlXCIsXG4gIF07XG4gIGlmIChyZXNvdXJjZVRyaWdnZXJzLnNvbWUoKHRyaWdnZXIpID0+IG1lc3NhZ2VDb250ZW50LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModHJpZ2dlcikpKSB7XG4gICAgaWYgKCFhY3RpdmUuaW5jbHVkZXMoXCJyZXNvdXJjZVwiKSkge1xuICAgICAgYWN0aXZlLnB1c2goXCJyZXNvdXJjZVwiKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYWN0aXZlLm1hcCgoaWQpID0+IGFnZW50UmVnaXN0cnlbaWRdKS5maWx0ZXIoKGFnZW50KSA9PiBhZ2VudCk7XG59XG5cbi8qKlxuICogR2V0IGFnZW50IGJ5IElEXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBZ2VudChhZ2VudElkKSB7XG4gIHJldHVybiBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdO1xufVxuXG4vKipcbiAqIEdldCBhbGwgYWdlbnRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBbGxBZ2VudHMoKSB7XG4gIHJldHVybiBPYmplY3QudmFsdWVzKGFnZW50UmVnaXN0cnkpO1xufVxuXG4vKipcbiAqIFVwZGF0ZSBhZ2VudCBjb25maWd1cmF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVBZ2VudChhZ2VudElkLCB1cGRhdGVzKSB7XG4gIGlmIChhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdKSB7XG4gICAgYWdlbnRSZWdpc3RyeVthZ2VudElkXSA9IHtcbiAgICAgIC4uLmFnZW50UmVnaXN0cnlbYWdlbnRJZF0sXG4gICAgICAuLi51cGRhdGVzLFxuICAgIH07XG4gICAgcmV0dXJuIGFnZW50UmVnaXN0cnlbYWdlbnRJZF07XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogR2V0IGFnZW50IHZpc3VhbCBwcm9maWxlcyBmb3IgVUlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFnZW50UHJvZmlsZXMoKSB7XG4gIHJldHVybiBPYmplY3QudmFsdWVzKGFnZW50UmVnaXN0cnkpLnJlZHVjZSgocHJvZmlsZXMsIGFnZW50KSA9PiB7XG4gICAgcHJvZmlsZXNbYWdlbnQuaWRdID0gYWdlbnQudmlzdWFsO1xuICAgIHJldHVybiBwcm9maWxlcztcbiAgfSwge30pO1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7OztBQUtBLFNBQVMsY0FBYzs7O0FDQ3ZCLElBQU0saUJBQWlCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBMEJoQixJQUFNLGdCQUFnQjtBQUFBLEVBQzNCLGFBQWE7QUFBQSxJQUNYLElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjLEdBQUcsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBaURqQztBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWMsR0FBRyxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUE0S2pDO0FBQUEsRUFFQSxTQUFTO0FBQUEsSUFDUCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYyxHQUFHLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQTBRakM7QUFBQSxFQUVBLE9BQU87QUFBQSxJQUNMLElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjLEdBQUcsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUEwVGpDO0FBQUEsRUFFQSxXQUFXO0FBQUEsSUFDVCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUF5QmhCO0FBQUEsRUFFQSxVQUFVO0FBQUEsSUFDUixJQUFJO0FBQUEsSUFDSixPQUFPO0FB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
