
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
  "agents": ["resource", "primary", "state"],
  "notes": "Resource provides biblical context. Primary facilitates. State records glossary entries."
}

User: "It means there wasn't enough food"
Phase: understanding
Response:
{
  "agents": ["primary", "state"],
  "notes": "User explaining phrase. State records glossary entry. Primary continues with next phrase."
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
\u2022 ALWAYS include "state" during understanding phase (to record glossary entries)
\u2022 ALWAYS include "resource" when transitioning to understanding phase (to present scripture)
\u2022 ALWAYS include "state" during drafting phase (to save the draft)
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

\u{1F4DD} DURING DRAFTING PHASE - DRAFT COLLECTION:

When user provides their translation draft, save it to scriptureCanvas!

Example user input: "A long time ago, before Israel had kings..."
Return JSON like:
{
  "message": "Draft recorded!",
  "updates": {
    "scriptureCanvas": {
      "verses": {
        "Ruth 1:1": {
          "draft": "A long time ago, before Israel had kings...",
          "status": "draft",
          "timestamp": "2025-10-21T19:30:00.000Z"
        }
      }
    }
  },
  "summary": "Saved draft for Ruth 1:1"
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY29udmVyc2F0aW9uLmpzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL2FnZW50cy9yZWdpc3RyeS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNdWx0aS1BZ2VudCBDb252ZXJzYXRpb24gSGFuZGxlclxuICogT3JjaGVzdHJhdGVzIG11bHRpcGxlIEFJIGFnZW50cyB0byBoYW5kbGUgQmlibGUgdHJhbnNsYXRpb24gY29udmVyc2F0aW9uc1xuICovXG5cbmltcG9ydCB7IE9wZW5BSSB9IGZyb20gXCJvcGVuYWlcIjtcbmltcG9ydCB7IGdldEFnZW50IH0gZnJvbSBcIi4vYWdlbnRzL3JlZ2lzdHJ5LmpzXCI7XG5cbi8vIE9wZW5BSSBjbGllbnQgd2lsbCBiZSBpbml0aWFsaXplZCBwZXIgcmVxdWVzdCB3aXRoIGNvbnRleHRcblxuLyoqXG4gKiBDYWxsIGFuIGluZGl2aWR1YWwgYWdlbnQgd2l0aCBjb250ZXh0XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNhbGxBZ2VudChhZ2VudCwgbWVzc2FnZSwgY29udGV4dCwgb3BlbmFpQ2xpZW50KSB7XG4gIGNvbnNvbGUubG9nKGBDYWxsaW5nIGFnZW50OiAke2FnZW50LmlkfWApO1xuICB0cnkge1xuICAgIGNvbnN0IG1lc3NhZ2VzID0gW1xuICAgICAge1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiBhZ2VudC5zeXN0ZW1Qcm9tcHQsXG4gICAgICB9LFxuICAgIF07XG5cbiAgICAvLyBBZGQgY29udmVyc2F0aW9uIGhpc3RvcnkgYXMgbmF0dXJhbCBtZXNzYWdlcyAoZm9yIHByaW1hcnkgYWdlbnQgb25seSlcbiAgICBpZiAoYWdlbnQuaWQgPT09IFwicHJpbWFyeVwiICYmIGNvbnRleHQuY29udmVyc2F0aW9uSGlzdG9yeSkge1xuICAgICAgY29udGV4dC5jb252ZXJzYXRpb25IaXN0b3J5LmZvckVhY2goKG1zZykgPT4ge1xuICAgICAgICAvLyBTa2lwIENhbnZhcyBTY3JpYmUgYWNrbm93bGVkZ21lbnRzXG4gICAgICAgIGlmIChtc2cuYWdlbnQ/LmlkID09PSBcInN0YXRlXCIpIHJldHVybjtcblxuICAgICAgICAvLyBTa2lwIGlubGluZSBzdWdnZXN0aW9uIG1lc3NhZ2VzICh0aGV5J3JlIHN5c3RlbSBVSSBlbGVtZW50cywgbm90IGNvbnZlcnNhdGlvbilcbiAgICAgICAgaWYgKG1zZy50eXBlID09PSBcInN1Z2dlc3Rpb25zXCIgJiYgbXNnLnJvbGUgPT09IFwic3lzdGVtXCIpIHJldHVybjtcblxuICAgICAgICAvLyBTa2lwIG1lc3NhZ2VzIHdpdGggYXJyYXkgY29udGVudCAod291bGQgY2F1c2UgT3BlbkFJIGVycm9ycylcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobXNnLmNvbnRlbnQpKSByZXR1cm47XG5cbiAgICAgICAgLy8gUGFyc2UgYXNzaXN0YW50IG1lc3NhZ2VzIGlmIHRoZXkncmUgSlNPTlxuICAgICAgICBsZXQgY29udGVudCA9IG1zZy5jb250ZW50O1xuICAgICAgICBpZiAobXNnLnJvbGUgPT09IFwiYXNzaXN0YW50XCIgJiYgbXNnLmFnZW50Py5pZCA9PT0gXCJwcmltYXJ5XCIpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShjb250ZW50KTtcbiAgICAgICAgICAgIGNvbnRlbnQgPSBwYXJzZWQubWVzc2FnZSB8fCBjb250ZW50O1xuICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgLy8gTm90IEpTT04sIHVzZSBhcy1pc1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICAgIHJvbGU6IG1zZy5yb2xlLFxuICAgICAgICAgIGNvbnRlbnQ6IGNvbnRlbnQsXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQWRkIHRoZSBjdXJyZW50IHVzZXIgbWVzc2FnZVxuICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICBjb250ZW50OiBtZXNzYWdlLFxuICAgIH0pO1xuXG4gICAgLy8gUHJvdmlkZSBjYW52YXMgc3RhdGUgY29udGV4dCB0byBhbGwgYWdlbnRzXG4gICAgaWYgKGNvbnRleHQuY2FudmFzU3RhdGUpIHtcbiAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiBgQ3VycmVudCBjYW52YXMgc3RhdGU6ICR7SlNPTi5zdHJpbmdpZnkoY29udGV4dC5jYW52YXNTdGF0ZSl9YCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEZvciBub24tcHJpbWFyeSBhZ2VudHMsIHByb3ZpZGUgY29udGV4dCBkaWZmZXJlbnRseVxuICAgIGlmIChhZ2VudC5pZCAhPT0gXCJwcmltYXJ5XCIpIHtcbiAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiBgQ29udGV4dDogJHtKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgY2FudmFzU3RhdGU6IGNvbnRleHQuY2FudmFzU3RhdGUsXG4gICAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiBjb250ZXh0LnByaW1hcnlSZXNwb25zZSxcbiAgICAgICAgICBvcmNoZXN0cmF0aW9uOiBjb250ZXh0Lm9yY2hlc3RyYXRpb24sXG4gICAgICAgIH0pfWAsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdGltZW91dCB3cmFwcGVyIGZvciBBUEkgY2FsbFxuICAgIGNvbnN0IHRpbWVvdXRQcm9taXNlID0gbmV3IFByb21pc2UoKF8sIHJlamVjdCkgPT4ge1xuICAgICAgc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKGBUaW1lb3V0IGNhbGxpbmcgJHthZ2VudC5pZH1gKSksIDEwMDAwKTsgLy8gMTAgc2Vjb25kIHRpbWVvdXRcbiAgICB9KTtcblxuICAgIGNvbnN0IGNvbXBsZXRpb25Qcm9taXNlID0gb3BlbmFpQ2xpZW50LmNoYXQuY29tcGxldGlvbnMuY3JlYXRlKHtcbiAgICAgIG1vZGVsOiBhZ2VudC5tb2RlbCxcbiAgICAgIG1lc3NhZ2VzOiBtZXNzYWdlcyxcbiAgICAgIHRlbXBlcmF0dXJlOiBhZ2VudC5pZCA9PT0gXCJzdGF0ZVwiID8gMC4xIDogMC43LCAvLyBMb3dlciB0ZW1wIGZvciBzdGF0ZSBleHRyYWN0aW9uXG4gICAgICBtYXhfdG9rZW5zOiBhZ2VudC5pZCA9PT0gXCJzdGF0ZVwiID8gNTAwIDogMjAwMCxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNvbXBsZXRpb24gPSBhd2FpdCBQcm9taXNlLnJhY2UoW2NvbXBsZXRpb25Qcm9taXNlLCB0aW1lb3V0UHJvbWlzZV0pO1xuICAgIGNvbnNvbGUubG9nKGBBZ2VudCAke2FnZW50LmlkfSByZXNwb25kZWQgc3VjY2Vzc2Z1bGx5YCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgYWdlbnRJZDogYWdlbnQuaWQsXG4gICAgICBhZ2VudDogYWdlbnQudmlzdWFsLFxuICAgICAgcmVzcG9uc2U6IGNvbXBsZXRpb24uY2hvaWNlc1swXS5tZXNzYWdlLmNvbnRlbnQsXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGNhbGxpbmcgYWdlbnQgJHthZ2VudC5pZH06YCwgZXJyb3IubWVzc2FnZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFnZW50SWQ6IGFnZW50LmlkLFxuICAgICAgYWdlbnQ6IGFnZW50LnZpc3VhbCxcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlIHx8IFwiVW5rbm93biBlcnJvclwiLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBHZXQgY3VycmVudCBjYW52YXMgc3RhdGUgZnJvbSBzdGF0ZSBtYW5hZ2VtZW50IGZ1bmN0aW9uXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldENhbnZhc1N0YXRlKHNlc3Npb25JZCA9IFwiZGVmYXVsdFwiKSB7XG4gIHRyeSB7XG4gICAgLy8gSW4gTmV0bGlmeSBGdW5jdGlvbnMsIHdlIG5lZWQgZnVsbCBsb2NhbGhvc3QgVVJMIGZvciBpbnRlcm5hbCBjYWxsc1xuICAgIGNvbnN0IGJhc2VVcmwgPSBcImh0dHA6Ly9sb2NhbGhvc3Q6ODg4OFwiO1xuICAgIGNvbnN0IHN0YXRlVXJsID0gYCR7YmFzZVVybH0vLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZWA7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHN0YXRlVXJsLCB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiWC1TZXNzaW9uLUlEXCI6IHNlc3Npb25JZCxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgaWYgKHJlc3BvbnNlLm9rKSB7XG4gICAgICByZXR1cm4gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgZmV0Y2hpbmcgY2FudmFzIHN0YXRlOlwiLCBlcnJvcik7XG4gIH1cblxuICAvLyBSZXR1cm4gZGVmYXVsdCBzdGF0ZSBpZiBmZXRjaCBmYWlsc1xuICByZXR1cm4ge1xuICAgIHN0eWxlR3VpZGU6IHt9LFxuICAgIGdsb3NzYXJ5OiB7IHRlcm1zOiB7fSB9LFxuICAgIHNjcmlwdHVyZUNhbnZhczogeyB2ZXJzZXM6IHt9IH0sXG4gICAgd29ya2Zsb3c6IHsgY3VycmVudFBoYXNlOiBcInBsYW5uaW5nXCIgfSxcbiAgfTtcbn1cblxuLyoqXG4gKiBVcGRhdGUgY2FudmFzIHN0YXRlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUNhbnZhc1N0YXRlKHVwZGF0ZXMsIGFnZW50SWQgPSBcInN5c3RlbVwiLCBzZXNzaW9uSWQgPSBcImRlZmF1bHRcIikge1xuICB0cnkge1xuICAgIC8vIEluIE5ldGxpZnkgRnVuY3Rpb25zLCB3ZSBuZWVkIGZ1bGwgbG9jYWxob3N0IFVSTCBmb3IgaW50ZXJuYWwgY2FsbHNcbiAgICBjb25zdCBiYXNlVXJsID0gXCJodHRwOi8vbG9jYWxob3N0Ojg4ODhcIjtcbiAgICBjb25zdCBzdGF0ZVVybCA9IGAke2Jhc2VVcmx9Ly5uZXRsaWZ5L2Z1bmN0aW9ucy9jYW52YXMtc3RhdGUvdXBkYXRlYDtcblxuICAgIGNvbnNvbGUubG9nKFwiXHVEODNEXHVERDM1IHVwZGF0ZUNhbnZhc1N0YXRlIGNhbGxlZCB3aXRoOlwiLCBKU09OLnN0cmluZ2lmeSh1cGRhdGVzLCBudWxsLCAyKSk7XG4gICAgY29uc29sZS5sb2coXCJcdUQ4M0RcdUREMzUgU2Vzc2lvbiBJRDpcIiwgc2Vzc2lvbklkKTtcbiAgICBjb25zb2xlLmxvZyhcIlx1RDgzRFx1REQzNSBTZW5kaW5nIHRvOlwiLCBzdGF0ZVVybCk7XG5cbiAgICBjb25zdCBwYXlsb2FkID0geyB1cGRhdGVzLCBhZ2VudElkIH07XG4gICAgY29uc29sZS5sb2coXCJcdUQ4M0RcdUREMzUgUGF5bG9hZDpcIiwgSlNPTi5zdHJpbmdpZnkocGF5bG9hZCwgbnVsbCwgMikpO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChzdGF0ZVVybCwge1xuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIFwiWC1TZXNzaW9uLUlEXCI6IHNlc3Npb25JZCwgLy8gQUREIFNFU1NJT04gSEVBREVSIVxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpLFxuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2coXCJcdUQ4M0RcdUREMzUgVXBkYXRlIHJlc3BvbnNlIHN0YXR1czpcIiwgcmVzcG9uc2Uuc3RhdHVzKTtcblxuICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgY29uc29sZS5sb2coXCJcdUQ4M0RcdUREMzUgVXBkYXRlIHJlc3VsdDpcIiwgSlNPTi5zdHJpbmdpZnkocmVzdWx0LCBudWxsLCAyKSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiXHVEODNEXHVERDM0IFVwZGF0ZSBmYWlsZWQgd2l0aCBzdGF0dXM6XCIsIHJlc3BvbnNlLnN0YXR1cyk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJcdUQ4M0RcdUREMzQgRXJyb3IgdXBkYXRpbmcgY2FudmFzIHN0YXRlOlwiLCBlcnJvcik7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogUHJvY2VzcyBjb252ZXJzYXRpb24gd2l0aCBtdWx0aXBsZSBhZ2VudHNcbiAqL1xuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0NvbnZlcnNhdGlvbih1c2VyTWVzc2FnZSwgY29udmVyc2F0aW9uSGlzdG9yeSwgc2Vzc2lvbklkLCBvcGVuYWlDbGllbnQpIHtcbiAgY29uc29sZS5sb2coXCJTdGFydGluZyBwcm9jZXNzQ29udmVyc2F0aW9uIHdpdGggbWVzc2FnZTpcIiwgdXNlck1lc3NhZ2UpO1xuICBjb25zb2xlLmxvZyhcIlVzaW5nIHNlc3Npb24gSUQ6XCIsIHNlc3Npb25JZCk7XG4gIGNvbnN0IHJlc3BvbnNlcyA9IHt9O1xuICBjb25zdCBjYW52YXNTdGF0ZSA9IGF3YWl0IGdldENhbnZhc1N0YXRlKHNlc3Npb25JZCk7XG4gIGNvbnNvbGUubG9nKFwiR290IGNhbnZhcyBzdGF0ZVwiKTtcblxuICAvLyBCdWlsZCBjb250ZXh0IGZvciBhZ2VudHNcbiAgY29uc3QgY29udGV4dCA9IHtcbiAgICBjYW52YXNTdGF0ZSxcbiAgICBjb252ZXJzYXRpb25IaXN0b3J5OiBjb252ZXJzYXRpb25IaXN0b3J5LnNsaWNlKC0xMCksIC8vIExhc3QgMTAgbWVzc2FnZXNcbiAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgfTtcblxuICAvLyBGaXJzdCwgYXNrIHRoZSBvcmNoZXN0cmF0b3Igd2hpY2ggYWdlbnRzIHNob3VsZCByZXNwb25kXG4gIGNvbnN0IG9yY2hlc3RyYXRvciA9IGdldEFnZW50KFwib3JjaGVzdHJhdG9yXCIpO1xuICBjb25zb2xlLmxvZyhcIkFza2luZyBvcmNoZXN0cmF0b3Igd2hpY2ggYWdlbnRzIHRvIGFjdGl2YXRlLi4uXCIpO1xuICBjb25zdCBvcmNoZXN0cmF0b3JSZXNwb25zZSA9IGF3YWl0IGNhbGxBZ2VudChvcmNoZXN0cmF0b3IsIHVzZXJNZXNzYWdlLCBjb250ZXh0LCBvcGVuYWlDbGllbnQpO1xuXG4gIGxldCBvcmNoZXN0cmF0aW9uO1xuICB0cnkge1xuICAgIG9yY2hlc3RyYXRpb24gPSBKU09OLnBhcnNlKG9yY2hlc3RyYXRvclJlc3BvbnNlLnJlc3BvbnNlKTtcbiAgICBjb25zb2xlLmxvZyhcIk9yY2hlc3RyYXRvciBkZWNpZGVkOlwiLCBvcmNoZXN0cmF0aW9uKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBJZiBvcmNoZXN0cmF0b3IgZmFpbHMsIGZhbGwgYmFjayB0byBzZW5zaWJsZSBkZWZhdWx0c1xuICAgIGNvbnNvbGUuZXJyb3IoXCJPcmNoZXN0cmF0b3IgcmVzcG9uc2Ugd2FzIG5vdCB2YWxpZCBKU09OLCB1c2luZyBkZWZhdWx0czpcIiwgZXJyb3IubWVzc2FnZSk7XG4gICAgb3JjaGVzdHJhdGlvbiA9IHtcbiAgICAgIGFnZW50czogW1wicHJpbWFyeVwiLCBcInN0YXRlXCJdLFxuICAgICAgbm90ZXM6IFwiRmFsbGJhY2sgdG8gcHJpbWFyeSBhbmQgc3RhdGUgYWdlbnRzXCIsXG4gICAgfTtcbiAgfVxuXG4gIC8vIE9ubHkgY2FsbCB0aGUgYWdlbnRzIHRoZSBvcmNoZXN0cmF0b3Igc2F5cyB3ZSBuZWVkXG4gIGNvbnN0IGFnZW50c1RvQ2FsbCA9IG9yY2hlc3RyYXRpb24uYWdlbnRzIHx8IFtcInByaW1hcnlcIiwgXCJzdGF0ZVwiXTtcblxuICAvLyBDYWxsIFJlc291cmNlIExpYnJhcmlhbiBpZiBvcmNoZXN0cmF0b3Igc2F5cyBzb1xuICBpZiAoYWdlbnRzVG9DYWxsLmluY2x1ZGVzKFwicmVzb3VyY2VcIikpIHtcbiAgICBjb25zdCByZXNvdXJjZSA9IGdldEFnZW50KFwicmVzb3VyY2VcIik7XG4gICAgY29uc29sZS5sb2coXCJDYWxsaW5nIHJlc291cmNlIGxpYnJhcmlhbi4uLlwiKTtcbiAgICByZXNwb25zZXMucmVzb3VyY2UgPSBhd2FpdCBjYWxsQWdlbnQoXG4gICAgICByZXNvdXJjZSxcbiAgICAgIHVzZXJNZXNzYWdlLFxuICAgICAge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBvcmNoZXN0cmF0aW9uLFxuICAgICAgfSxcbiAgICAgIG9wZW5haUNsaWVudFxuICAgICk7XG4gICAgY29uc29sZS5sb2coXCJSZXNvdXJjZSBsaWJyYXJpYW4gcmVzcG9uZGVkXCIpO1xuICB9XG5cbiAgLy8gQ2FsbCBwcmltYXJ5IHRyYW5zbGF0b3IgaWYgb3JjaGVzdHJhdG9yIHNheXMgc29cbiAgaWYgKGFnZW50c1RvQ2FsbC5pbmNsdWRlcyhcInByaW1hcnlcIikpIHtcbiAgICBjb25zb2xlLmxvZyhcIj09PT09PT09PT0gUFJJTUFSWSBBR0VOVCBDQUxMRUQgPT09PT09PT09PVwiKTtcbiAgICBjb25zdCBwcmltYXJ5ID0gZ2V0QWdlbnQoXCJwcmltYXJ5XCIpO1xuICAgIGNvbnNvbGUubG9nKFwiQ2FsbGluZyBwcmltYXJ5IHRyYW5zbGF0b3IuLi5cIik7XG5cbiAgICByZXNwb25zZXMucHJpbWFyeSA9IGF3YWl0IGNhbGxBZ2VudChcbiAgICAgIHByaW1hcnksXG4gICAgICB1c2VyTWVzc2FnZSxcbiAgICAgIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgb3JjaGVzdHJhdGlvbixcbiAgICAgIH0sXG4gICAgICBvcGVuYWlDbGllbnRcbiAgICApO1xuICB9XG5cbiAgLy8gQ2FsbCBzdGF0ZSBtYW5hZ2VyIGlmIG9yY2hlc3RyYXRvciBzYXlzIHNvXG4gIGlmIChhZ2VudHNUb0NhbGwuaW5jbHVkZXMoXCJzdGF0ZVwiKSAmJiAhcmVzcG9uc2VzLnByaW1hcnk/LmVycm9yKSB7XG4gICAgY29uc3Qgc3RhdGVNYW5hZ2VyID0gZ2V0QWdlbnQoXCJzdGF0ZVwiKTtcbiAgICBjb25zb2xlLmxvZyhcIkNhbGxpbmcgc3RhdGUgbWFuYWdlci4uLlwiKTtcbiAgICBjb25zb2xlLmxvZyhcIlN0YXRlIG1hbmFnZXIgYWdlbnQgaW5mbzpcIiwgc3RhdGVNYW5hZ2VyPy52aXN1YWwpO1xuXG4gICAgLy8gUGFzcyB0aGUgbGFzdCBxdWVzdGlvbiBhc2tlZCBieSB0aGUgVHJhbnNsYXRpb24gQXNzaXN0YW50XG4gICAgbGV0IGxhc3RBc3Npc3RhbnRRdWVzdGlvbiA9IG51bGw7XG4gICAgZm9yIChsZXQgaSA9IGNvbnRleHQuY29udmVyc2F0aW9uSGlzdG9yeS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgY29uc3QgbXNnID0gY29udGV4dC5jb252ZXJzYXRpb25IaXN0b3J5W2ldO1xuICAgICAgaWYgKG1zZy5yb2xlID09PSBcImFzc2lzdGFudFwiICYmIG1zZy5hZ2VudD8uaWQgPT09IFwicHJpbWFyeVwiKSB7XG4gICAgICAgIC8vIFBhcnNlIHRoZSBtZXNzYWdlIGlmIGl0J3MgSlNPTlxuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UobXNnLmNvbnRlbnQpO1xuICAgICAgICAgIGxhc3RBc3Npc3RhbnRRdWVzdGlvbiA9IHBhcnNlZC5tZXNzYWdlIHx8IG1zZy5jb250ZW50O1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICBsYXN0QXNzaXN0YW50UXVlc3Rpb24gPSBtc2cuY29udGVudDtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzdGF0ZVJlc3VsdCA9IGF3YWl0IGNhbGxBZ2VudChcbiAgICAgIHN0YXRlTWFuYWdlcixcbiAgICAgIHVzZXJNZXNzYWdlLFxuICAgICAge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICBwcmltYXJ5UmVzcG9uc2U6IHJlc3BvbnNlcy5wcmltYXJ5Py5yZXNwb25zZSxcbiAgICAgICAgcmVzb3VyY2VSZXNwb25zZTogcmVzcG9uc2VzLnJlc291cmNlPy5yZXNwb25zZSxcbiAgICAgICAgbGFzdEFzc2lzdGFudFF1ZXN0aW9uLFxuICAgICAgICBvcmNoZXN0cmF0aW9uLFxuICAgICAgfSxcbiAgICAgIG9wZW5haUNsaWVudFxuICAgICk7XG5cbiAgICBjb25zb2xlLmxvZyhcIlN0YXRlIHJlc3VsdCBhZ2VudCBpbmZvOlwiLCBzdGF0ZVJlc3VsdD8uYWdlbnQpO1xuICAgIGNvbnNvbGUubG9nKFwiU3RhdGUgcmVzcG9uc2U6XCIsIHN0YXRlUmVzdWx0Py5yZXNwb25zZSk7XG5cbiAgICAvLyBDYW52YXMgU2NyaWJlIHNob3VsZCByZXR1cm4gSlNPTiB3aXRoOlxuICAgIC8vIHsgXCJtZXNzYWdlXCI6IFwiTm90ZWQhXCIsIFwidXBkYXRlc1wiOiB7Li4ufSwgXCJzdW1tYXJ5XCI6IFwiLi4uXCIgfVxuICAgIC8vIE9yIGVtcHR5IHN0cmluZyB0byBzdGF5IHNpbGVudFxuXG4gICAgY29uc3QgcmVzcG9uc2VUZXh0ID0gc3RhdGVSZXN1bHQucmVzcG9uc2UudHJpbSgpO1xuXG4gICAgLy8gSWYgZW1wdHkgcmVzcG9uc2UsIHNjcmliZSBzdGF5cyBzaWxlbnRcbiAgICBpZiAoIXJlc3BvbnNlVGV4dCB8fCByZXNwb25zZVRleHQgPT09IFwiXCIpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiQ2FudmFzIFNjcmliZSBzdGF5aW5nIHNpbGVudFwiKTtcbiAgICAgIC8vIERvbid0IGFkZCB0byByZXNwb25zZXNcbiAgICB9XG4gICAgLy8gUGFyc2UgSlNPTiByZXNwb25zZSBmcm9tIENhbnZhcyBTY3JpYmVcbiAgICBlbHNlIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIENhbnZhcyBTY3JpYmUgcmV0dXJuczogXCJOb3RlZCFcXG57SlNPTn1cIiAtIGV4dHJhY3QgdGhlIEpTT04gcGFydFxuICAgICAgICBjb25zdCBqc29uTWF0Y2ggPSByZXNwb25zZVRleHQubWF0Y2goL1xce1tcXHNcXFNdKlxcfS8pO1xuICAgICAgICBpZiAoanNvbk1hdGNoKSB7XG4gICAgICAgICAgY29uc3Qgc3RhdGVVcGRhdGVzID0gSlNPTi5wYXJzZShqc29uTWF0Y2hbMF0pO1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ2FudmFzIFNjcmliZSByZXR1cm5lZDpcIiwgc3RhdGVVcGRhdGVzKTtcblxuICAgICAgICAgIC8vIEFwcGx5IHN0YXRlIHVwZGF0ZXMgaWYgcHJlc2VudFxuICAgICAgICAgIGlmIChzdGF0ZVVwZGF0ZXMudXBkYXRlcyAmJiBPYmplY3Qua2V5cyhzdGF0ZVVwZGF0ZXMudXBkYXRlcykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJBcHBseWluZyBzdGF0ZSB1cGRhdGVzOlwiLCBzdGF0ZVVwZGF0ZXMudXBkYXRlcyk7XG4gICAgICAgICAgICBhd2FpdCB1cGRhdGVDYW52YXNTdGF0ZShzdGF0ZVVwZGF0ZXMudXBkYXRlcywgXCJzdGF0ZVwiLCBzZXNzaW9uSWQpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJcdTI3MDUgU3RhdGUgdXBkYXRlIGNvbXBsZXRlZFwiKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBTaG93IHRoZSBtZXNzYWdlIGZyb20gSlNPTiBvciBleHRyYWN0IGZyb20gYmVnaW5uaW5nIG9mIHJlc3BvbnNlXG4gICAgICAgICAgY29uc3QgYWNrbm93bGVkZ21lbnQgPVxuICAgICAgICAgICAgc3RhdGVVcGRhdGVzLm1lc3NhZ2UgfHxcbiAgICAgICAgICAgIHJlc3BvbnNlVGV4dC5zdWJzdHJpbmcoMCwgcmVzcG9uc2VUZXh0LmluZGV4T2YoanNvbk1hdGNoWzBdKSkudHJpbSgpO1xuICAgICAgICAgIGlmIChhY2tub3dsZWRnbWVudCkge1xuICAgICAgICAgICAgcmVzcG9uc2VzLnN0YXRlID0ge1xuICAgICAgICAgICAgICAuLi5zdGF0ZVJlc3VsdCxcbiAgICAgICAgICAgICAgcmVzcG9uc2U6IGFja25vd2xlZGdtZW50LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm8gSlNPTiBmb3VuZCwganVzdCBzaG93IHRoZSByZXNwb25zZSBhcy1pc1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ2FudmFzIFNjcmliZSBzaW1wbGUgYWNrbm93bGVkZ21lbnQ6XCIsIHJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgcmVzcG9uc2VzLnN0YXRlID0ge1xuICAgICAgICAgICAgLi4uc3RhdGVSZXN1bHQsXG4gICAgICAgICAgICByZXNwb25zZTogcmVzcG9uc2VUZXh0LFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIHBhcnNpbmcgQ2FudmFzIFNjcmliZSBKU09OOlwiLCBlKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlJhdyByZXNwb25zZSB3YXM6XCIsIHJlc3BvbnNlVGV4dCk7XG4gICAgICAgIC8vIElmIEpTT04gcGFyc2luZyBmYWlscywgdHJlYXQgd2hvbGUgcmVzcG9uc2UgYXMgYWNrbm93bGVkZ21lbnRcbiAgICAgICAgcmVzcG9uc2VzLnN0YXRlID0ge1xuICAgICAgICAgIC4uLnN0YXRlUmVzdWx0LFxuICAgICAgICAgIHJlc3BvbnNlOiByZXNwb25zZVRleHQsXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gTk9XIGNhbGwgU3VnZ2VzdGlvbiBIZWxwZXIgQUZURVIgd2UgaGF2ZSB0aGUgUHJpbWFyeSBBZ2VudCdzIHJlc3BvbnNlXG4gIC8vIFBhc3MgUFJJTUFSWSdTIE5FVyBRVUVTVElPTiAobm90IHVzZXIncyBvbGQgYW5zd2VyKSBmb3IgY29udGV4dHVhbCBzdWdnZXN0aW9uc1xuICBjb25zdCBzdWdnZXN0aW9uQWdlbnQgPSBnZXRBZ2VudChcInN1Z2dlc3Rpb25zXCIpO1xuICBpZiAoc3VnZ2VzdGlvbkFnZW50ICYmIHJlc3BvbnNlcy5wcmltYXJ5KSB7XG4gICAgY29uc29sZS5sb2coXCJDYWxsaW5nIFN1Z2dlc3Rpb24gSGVscGVyIGZvciBQUklNQVJZJ1MgbmV3IHF1ZXN0aW9uLi4uXCIpO1xuXG4gICAgLy8gRXh0cmFjdCB0aGUgcXVlc3Rpb24gUHJpbWFyeSBqdXN0IGFza2VkXG4gICAgbGV0IHByaW1hcnlRdWVzdGlvbiA9IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlKTtcbiAgICAgIHByaW1hcnlRdWVzdGlvbiA9IHBhcnNlZC5tZXNzYWdlIHx8IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gTm90IEpTT04sIHVzZSByYXcgcmVzcG9uc2VcbiAgICB9XG5cbiAgICAvLyBQYXNzIFBSSU1BUlknUyBxdWVzdGlvbiBzbyBzdWdnZXN0aW9ucyBtYXRjaCB0aGUgQ1VSUkVOVCBxdWVzdGlvblxuICAgIHJlc3BvbnNlcy5zdWdnZXN0aW9ucyA9IGF3YWl0IGNhbGxBZ2VudChcbiAgICAgIHN1Z2dlc3Rpb25BZ2VudCxcbiAgICAgIHByaW1hcnlRdWVzdGlvbiwgLy8gQ2hhbmdlZCBmcm9tIHVzZXJNZXNzYWdlIHRvIHByaW1hcnlRdWVzdGlvbiFcbiAgICAgIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSxcbiAgICAgICAgb3JjaGVzdHJhdGlvbixcbiAgICAgIH0sXG4gICAgICBvcGVuYWlDbGllbnRcbiAgICApO1xuICB9XG5cbiAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSB2YWxpZGF0b3IgYW5kIHJlc291cmNlIGFnZW50cyB0byBzaW1wbGlmeSBkZWJ1Z2dpbmdcbiAgLy8gVE9ETzogUmUtZW5hYmxlIHRoZXNlIG9uY2UgYmFzaWMgZmxvdyBpcyB3b3JraW5nXG5cbiAgLypcbiAgLy8gQ2FsbCB2YWxpZGF0b3IgaWYgaW4gY2hlY2tpbmcgcGhhc2VcbiAgaWYgKGNhbnZhc1N0YXRlLndvcmtmbG93LmN1cnJlbnRQaGFzZSA9PT0gJ2NoZWNraW5nJyB8fCBcbiAgICAgIG9yY2hlc3RyYXRpb24uYWdlbnRzPy5pbmNsdWRlcygndmFsaWRhdG9yJykpIHtcbiAgICBjb25zdCB2YWxpZGF0b3IgPSBnZXRBZ2VudCgndmFsaWRhdG9yJyk7XG4gICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvciA9IGF3YWl0IGNhbGxBZ2VudCh2YWxpZGF0b3IsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgIHByaW1hcnlSZXNwb25zZTogcmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2UsXG4gICAgICAgIHN0YXRlVXBkYXRlczogcmVzcG9uc2VzLnN0YXRlPy51cGRhdGVzXG4gICAgICB9KTtcblxuICAgICAgLy8gUGFyc2UgdmFsaWRhdGlvbiByZXN1bHRzXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCB2YWxpZGF0aW9ucyA9IEpTT04ucGFyc2UocmVzcG9uc2VzLnZhbGlkYXRvci5yZXNwb25zZSk7XG4gICAgICAgIHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnMgPSB2YWxpZGF0aW9ucy52YWxpZGF0aW9ucztcbiAgICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvci5yZXF1aXJlc1Jlc3BvbnNlID0gdmFsaWRhdGlvbnMucmVxdWlyZXNSZXNwb25zZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gS2VlcCByYXcgcmVzcG9uc2UgaWYgbm90IEpTT05cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDYWxsIHJlc291cmNlIGFnZW50IGlmIG5lZWRlZFxuICBpZiAob3JjaGVzdHJhdGlvbi5hZ2VudHM/LmluY2x1ZGVzKCdyZXNvdXJjZScpKSB7XG4gICAgY29uc3QgcmVzb3VyY2UgPSBnZXRBZ2VudCgncmVzb3VyY2UnKTtcbiAgICBpZiAocmVzb3VyY2UpIHtcbiAgICAgIHJlc3BvbnNlcy5yZXNvdXJjZSA9IGF3YWl0IGNhbGxBZ2VudChyZXNvdXJjZSwgdXNlck1lc3NhZ2UsIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZVxuICAgICAgfSk7XG5cbiAgICAgIC8vIFBhcnNlIHJlc291cmNlIHJlc3VsdHNcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc291cmNlcyA9IEpTT04ucGFyc2UocmVzcG9uc2VzLnJlc291cmNlLnJlc3BvbnNlKTtcbiAgICAgICAgcmVzcG9uc2VzLnJlc291cmNlLnJlc291cmNlcyA9IHJlc291cmNlcy5yZXNvdXJjZXM7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIEtlZXAgcmF3IHJlc3BvbnNlIGlmIG5vdCBKU09OXG4gICAgICB9XG4gICAgfVxuICB9XG4gICovXG5cbiAgcmV0dXJuIHJlc3BvbnNlcztcbn1cblxuLyoqXG4gKiBNZXJnZSBhZ2VudCByZXNwb25zZXMgaW50byBhIGNvaGVyZW50IGNvbnZlcnNhdGlvbiByZXNwb25zZVxuICovXG5mdW5jdGlvbiBtZXJnZUFnZW50UmVzcG9uc2VzKHJlc3BvbnNlcykge1xuICBjb25zdCBtZXNzYWdlcyA9IFtdO1xuICBsZXQgc3VnZ2VzdGlvbnMgPSBbXTsgLy8gQUxXQVlTIGFuIGFycmF5LCBuZXZlciBudWxsXG5cbiAgLy8gSW5jbHVkZSBDYW52YXMgU2NyaWJlJ3MgY29udmVyc2F0aW9uYWwgcmVzcG9uc2UgRklSU1QgaWYgcHJlc2VudFxuICAvLyBDYW52YXMgU2NyaWJlIHNob3VsZCByZXR1cm4gZWl0aGVyIGp1c3QgYW4gYWNrbm93bGVkZ21lbnQgb3IgZW1wdHkgc3RyaW5nXG4gIGlmIChcbiAgICByZXNwb25zZXMuc3RhdGUgJiZcbiAgICAhcmVzcG9uc2VzLnN0YXRlLmVycm9yICYmXG4gICAgcmVzcG9uc2VzLnN0YXRlLnJlc3BvbnNlICYmXG4gICAgcmVzcG9uc2VzLnN0YXRlLnJlc3BvbnNlLnRyaW0oKSAhPT0gXCJcIlxuICApIHtcbiAgICAvLyBDYW52YXMgU2NyaWJlIG1pZ2h0IHJldHVybiBKU09OIHdpdGggc3RhdGUgdXBkYXRlLCBleHRyYWN0IGp1c3QgdGhlIGFja25vd2xlZGdtZW50XG4gICAgbGV0IHNjcmliZU1lc3NhZ2UgPSByZXNwb25zZXMuc3RhdGUucmVzcG9uc2U7XG5cbiAgICAvLyBDaGVjayBpZiByZXNwb25zZSBjb250YWlucyBKU09OIChzdGF0ZSB1cGRhdGUpXG4gICAgaWYgKHNjcmliZU1lc3NhZ2UuaW5jbHVkZXMoXCJ7XCIpICYmIHNjcmliZU1lc3NhZ2UuaW5jbHVkZXMoXCJ9XCIpKSB7XG4gICAgICAvLyBFeHRyYWN0IGp1c3QgdGhlIGFja25vd2xlZGdtZW50IHBhcnQgKGJlZm9yZSB0aGUgSlNPTilcbiAgICAgIGNvbnN0IGpzb25TdGFydCA9IHNjcmliZU1lc3NhZ2UuaW5kZXhPZihcIntcIik7XG4gICAgICBjb25zdCBhY2tub3dsZWRnbWVudCA9IHNjcmliZU1lc3NhZ2Uuc3Vic3RyaW5nKDAsIGpzb25TdGFydCkudHJpbSgpO1xuICAgICAgaWYgKGFja25vd2xlZGdtZW50ICYmIGFja25vd2xlZGdtZW50ICE9PSBcIlwiKSB7XG4gICAgICAgIHNjcmliZU1lc3NhZ2UgPSBhY2tub3dsZWRnbWVudDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE5vIGFja25vd2xlZGdtZW50LCBqdXN0IHN0YXRlIHVwZGF0ZSAtIHN0YXkgc2lsZW50XG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ2FudmFzIFNjcmliZSB1cGRhdGVkIHN0YXRlIHNpbGVudGx5XCIpO1xuICAgICAgICBzY3JpYmVNZXNzYWdlID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPbmx5IGFkZCBtZXNzYWdlIGlmIHRoZXJlJ3MgYWN0dWFsIGNvbnRlbnQgdG8gc2hvd1xuICAgIGlmIChzY3JpYmVNZXNzYWdlICYmIHNjcmliZU1lc3NhZ2UudHJpbSgpICE9PSBcIlwiKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIkFkZGluZyBDYW52YXMgU2NyaWJlIGFja25vd2xlZGdtZW50OlwiLCBzY3JpYmVNZXNzYWdlKTtcbiAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICByb2xlOiBcImFzc2lzdGFudFwiLFxuICAgICAgICBjb250ZW50OiBzY3JpYmVNZXNzYWdlLFxuICAgICAgICBhZ2VudDogcmVzcG9uc2VzLnN0YXRlLmFnZW50LFxuICAgICAgfSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHJlc3BvbnNlcy5zdGF0ZSAmJiByZXNwb25zZXMuc3RhdGUucmVzcG9uc2UgPT09IFwiXCIpIHtcbiAgICBjb25zb2xlLmxvZyhcIkNhbnZhcyBTY3JpYmUgcmV0dXJuZWQgZW1wdHkgcmVzcG9uc2UgKHN0YXlpbmcgc2lsZW50KVwiKTtcbiAgfVxuXG4gIC8vIEluY2x1ZGUgUmVzb3VyY2UgTGlicmFyaWFuIFNFQ09ORCAodG8gcHJlc2VudCBzY3JpcHR1cmUgYmVmb3JlIHF1ZXN0aW9ucylcbiAgLy8gT3JjaGVzdHJhdG9yIG9ubHkgY2FsbHMgdGhlbSB3aGVuIG5lZWRlZCwgc28gaWYgdGhleSByZXNwb25kZWQsIGluY2x1ZGUgaXRcbiAgaWYgKHJlc3BvbnNlcy5yZXNvdXJjZSAmJiAhcmVzcG9uc2VzLnJlc291cmNlLmVycm9yICYmIHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNwb25zZSkge1xuICAgIGNvbnN0IHJlc291cmNlVGV4dCA9IHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNwb25zZS50cmltKCk7XG4gICAgLy8gU2tpcCB0cnVseSBlbXB0eSByZXNwb25zZXMgaW5jbHVkaW5nIGp1c3QgcXVvdGVzXG4gICAgaWYgKHJlc291cmNlVGV4dCAmJiByZXNvdXJjZVRleHQgIT09ICdcIlwiJyAmJiByZXNvdXJjZVRleHQgIT09IFwiJydcIikge1xuICAgICAgY29uc29sZS5sb2coXCJBZGRpbmcgUmVzb3VyY2UgTGlicmFyaWFuIG1lc3NhZ2Ugd2l0aCBhZ2VudDpcIiwgcmVzcG9uc2VzLnJlc291cmNlLmFnZW50KTtcbiAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICByb2xlOiBcImFzc2lzdGFudFwiLFxuICAgICAgICBjb250ZW50OiByZXNwb25zZXMucmVzb3VyY2UucmVzcG9uc2UsXG4gICAgICAgIGFnZW50OiByZXNwb25zZXMucmVzb3VyY2UuYWdlbnQsXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coXCJSZXNvdXJjZSBMaWJyYXJpYW4gcmV0dXJuZWQgZW1wdHkgcmVzcG9uc2UgKHN0YXlpbmcgc2lsZW50KVwiKTtcbiAgICB9XG4gIH1cblxuICAvLyBIYW5kbGUgU3VnZ2VzdGlvbiBIZWxwZXIgcmVzcG9uc2UgKGV4dHJhY3Qgc3VnZ2VzdGlvbnMsIGRvbid0IHNob3cgYXMgbWVzc2FnZSlcbiAgaWYgKHJlc3BvbnNlcy5zdWdnZXN0aW9ucyAmJiAhcmVzcG9uc2VzLnN1Z2dlc3Rpb25zLmVycm9yICYmIHJlc3BvbnNlcy5zdWdnZXN0aW9ucy5yZXNwb25zZSkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdWdnZXN0aW9uc0FycmF5ID0gSlNPTi5wYXJzZShyZXNwb25zZXMuc3VnZ2VzdGlvbnMucmVzcG9uc2UpO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3VnZ2VzdGlvbnNBcnJheSkpIHtcbiAgICAgICAgc3VnZ2VzdGlvbnMgPSBzdWdnZXN0aW9uc0FycmF5O1xuICAgICAgICBjb25zb2xlLmxvZyhcIlx1MjcwNSBHb3Qgc3VnZ2VzdGlvbnMgZnJvbSBTdWdnZXN0aW9uIEhlbHBlcjpcIiwgc3VnZ2VzdGlvbnMpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIlx1MjZBMFx1RkUwRiBTdWdnZXN0aW9uIEhlbHBlciByZXNwb25zZSB3YXNuJ3QgdmFsaWQgSlNPTjpcIiwgZXJyb3IubWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gVGhlbiBpbmNsdWRlIHByaW1hcnkgcmVzcG9uc2UgKFRyYW5zbGF0aW9uIEFzc2lzdGFudClcbiAgLy8gRXh0cmFjdCBtZXNzYWdlIGFuZCBzdWdnZXN0aW9ucyBmcm9tIEpTT04gcmVzcG9uc2VcbiAgaWYgKHJlc3BvbnNlcy5wcmltYXJ5ICYmICFyZXNwb25zZXMucHJpbWFyeS5lcnJvciAmJiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSkge1xuICAgIGNvbnNvbGUubG9nKFwiXFxuPT09IFBSSU1BUlkgQUdFTlQgUkVTUE9OU0UgPT09XCIpO1xuICAgIGNvbnNvbGUubG9nKFwiUmF3OlwiLCByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSk7XG5cbiAgICBsZXQgbWVzc2FnZUNvbnRlbnQgPSByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZTtcblxuICAgIC8vIFRyeSB0byBwYXJzZSBhcyBKU09OIGZpcnN0XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UocmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2UpO1xuICAgICAgY29uc29sZS5sb2coXCJQYXJzZWQgYXMgSlNPTjpcIiwgcGFyc2VkKTtcblxuICAgICAgLy8gRXh0cmFjdCBtZXNzYWdlXG4gICAgICBpZiAocGFyc2VkLm1lc3NhZ2UpIHtcbiAgICAgICAgbWVzc2FnZUNvbnRlbnQgPSBwYXJzZWQubWVzc2FnZTtcbiAgICAgICAgY29uc29sZS5sb2coXCJcdTI3MDUgRm91bmQgbWVzc2FnZTpcIiwgbWVzc2FnZUNvbnRlbnQpO1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IHN1Z2dlc3Rpb25zIC0gTVVTVCBiZSBhbiBhcnJheSAob25seSBpZiB3ZSBkb24ndCBhbHJlYWR5IGhhdmUgc3VnZ2VzdGlvbnMpXG4gICAgICBpZiAoIXN1Z2dlc3Rpb25zIHx8IHN1Z2dlc3Rpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBpZiAocGFyc2VkLnN1Z2dlc3Rpb25zICYmIEFycmF5LmlzQXJyYXkocGFyc2VkLnN1Z2dlc3Rpb25zKSkge1xuICAgICAgICAgIHN1Z2dlc3Rpb25zID0gcGFyc2VkLnN1Z2dlc3Rpb25zO1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiXHUyNzA1IEZvdW5kIGZhbGxiYWNrIHN1Z2dlc3Rpb25zIGZyb20gcHJpbWFyeTpcIiwgc3VnZ2VzdGlvbnMpO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcnNlZC5zdWdnZXN0aW9ucykge1xuICAgICAgICAgIC8vIFN1Z2dlc3Rpb25zIGV4aXN0IGJ1dCB3cm9uZyBmb3JtYXRcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIlx1MjZBMFx1RkUwRiBQcmltYXJ5IHN1Z2dlc3Rpb25zIGV4aXN0IGJ1dCBub3QgYW4gYXJyYXk6XCIsIHBhcnNlZC5zdWdnZXN0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm8gc3VnZ2VzdGlvbnMgaW4gcmVzcG9uc2VcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIlx1MjEzOVx1RkUwRiBObyBzdWdnZXN0aW9ucyBmcm9tIHByaW1hcnkgYWdlbnRcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiXHUyNkEwXHVGRTBGIE5vdCB2YWxpZCBKU09OLCB0cmVhdGluZyBhcyBwbGFpbiB0ZXh0IG1lc3NhZ2VcIik7XG4gICAgICAvLyBOb3QgSlNPTiwgdXNlIHRoZSByYXcgcmVzcG9uc2UgYXMgdGhlIG1lc3NhZ2VcbiAgICAgIC8vIEtlZXAgZXhpc3Rpbmcgc3VnZ2VzdGlvbnMgaWYgd2UgaGF2ZSB0aGVtIGZyb20gU3VnZ2VzdGlvbiBIZWxwZXJcbiAgICB9XG5cbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6IFwiYXNzaXN0YW50XCIsXG4gICAgICBjb250ZW50OiBtZXNzYWdlQ29udGVudCxcbiAgICAgIGFnZW50OiByZXNwb25zZXMucHJpbWFyeS5hZ2VudCxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEluY2x1ZGUgdmFsaWRhdG9yIHdhcm5pbmdzL2Vycm9ycyBpZiBhbnlcbiAgaWYgKHJlc3BvbnNlcy52YWxpZGF0b3I/LnJlcXVpcmVzUmVzcG9uc2UgJiYgcmVzcG9uc2VzLnZhbGlkYXRvci52YWxpZGF0aW9ucykge1xuICAgIGNvbnN0IHZhbGlkYXRpb25NZXNzYWdlcyA9IHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnNcbiAgICAgIC5maWx0ZXIoKHYpID0+IHYudHlwZSA9PT0gXCJ3YXJuaW5nXCIgfHwgdi50eXBlID09PSBcImVycm9yXCIpXG4gICAgICAubWFwKCh2KSA9PiBgXHUyNkEwXHVGRTBGICoqJHt2LmNhdGVnb3J5fSoqOiAke3YubWVzc2FnZX1gKTtcblxuICAgIGlmICh2YWxpZGF0aW9uTWVzc2FnZXMubGVuZ3RoID4gMCkge1xuICAgICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICAgIHJvbGU6IFwic3lzdGVtXCIsXG4gICAgICAgIGNvbnRlbnQ6IHZhbGlkYXRpb25NZXNzYWdlcy5qb2luKFwiXFxuXCIpLFxuICAgICAgICBhZ2VudDogcmVzcG9uc2VzLnZhbGlkYXRvci5hZ2VudCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGNvbnNvbGUubG9nKFwiXFxuPT09IEZJTkFMIE1FUkdFIFJFU1VMVFMgPT09XCIpO1xuICBjb25zb2xlLmxvZyhcIlRvdGFsIG1lc3NhZ2VzOlwiLCBtZXNzYWdlcy5sZW5ndGgpO1xuICBjb25zb2xlLmxvZyhcIlN1Z2dlc3Rpb25zIHRvIHNlbmQ6XCIsIHN1Z2dlc3Rpb25zKTtcbiAgY29uc29sZS5sb2coXCI9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxcblwiKTtcblxuICByZXR1cm4geyBtZXNzYWdlcywgc3VnZ2VzdGlvbnMgfTtcbn1cblxuLyoqXG4gKiBOZXRsaWZ5IEZ1bmN0aW9uIEhhbmRsZXJcbiAqL1xuY29uc3QgaGFuZGxlciA9IGFzeW5jIChyZXEsIGNvbnRleHQpID0+IHtcbiAgLy8gRW5hYmxlIENPUlNcbiAgY29uc3QgaGVhZGVycyA9IHtcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiOiBcIipcIixcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnNcIjogXCJDb250ZW50LVR5cGUsIFgtU2Vzc2lvbi1JRFwiLFxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kc1wiOiBcIlBPU1QsIE9QVElPTlNcIixcbiAgfTtcblxuICAvLyBIYW5kbGUgcHJlZmxpZ2h0XG4gIGlmIChyZXEubWV0aG9kID09PSBcIk9QVElPTlNcIikge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJPS1wiLCB7IGhlYWRlcnMgfSk7XG4gIH1cblxuICBpZiAocmVxLm1ldGhvZCAhPT0gXCJQT1NUXCIpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFwiTWV0aG9kIG5vdCBhbGxvd2VkXCIsIHsgc3RhdHVzOiA0MDUsIGhlYWRlcnMgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnNvbGUubG9nKFwiQ29udmVyc2F0aW9uIGVuZHBvaW50IGNhbGxlZFwiKTtcbiAgICBjb25zdCB7IG1lc3NhZ2UsIGhpc3RvcnkgPSBbXSB9ID0gYXdhaXQgcmVxLmpzb24oKTtcbiAgICBjb25zb2xlLmxvZyhcIlJlY2VpdmVkIG1lc3NhZ2U6XCIsIG1lc3NhZ2UpO1xuXG4gICAgLy8gR2V0IHNlc3Npb24gSUQgZnJvbSBoZWFkZXJzICh0cnkgYm90aCAuZ2V0KCkgYW5kIGRpcmVjdCBhY2Nlc3MpXG4gICAgY29uc3Qgc2Vzc2lvbklkID0gcmVxLmhlYWRlcnMuZ2V0Py4oXCJ4LXNlc3Npb24taWRcIikgfHwgcmVxLmhlYWRlcnNbXCJ4LXNlc3Npb24taWRcIl0gfHwgXCJkZWZhdWx0XCI7XG4gICAgY29uc29sZS5sb2coXCJTZXNzaW9uIElEIGZyb20gaGVhZGVyOlwiLCBzZXNzaW9uSWQpO1xuXG4gICAgLy8gSW5pdGlhbGl6ZSBPcGVuQUkgY2xpZW50IHdpdGggQVBJIGtleSBmcm9tIE5ldGxpZnkgZW52aXJvbm1lbnRcbiAgICBjb25zdCBvcGVuYWkgPSBuZXcgT3BlbkFJKHtcbiAgICAgIGFwaUtleTogY29udGV4dC5lbnY/Lk9QRU5BSV9BUElfS0VZLFxuICAgIH0pO1xuXG4gICAgLy8gUHJvY2VzcyBjb252ZXJzYXRpb24gd2l0aCBtdWx0aXBsZSBhZ2VudHNcbiAgICBjb25zdCBhZ2VudFJlc3BvbnNlcyA9IGF3YWl0IHByb2Nlc3NDb252ZXJzYXRpb24obWVzc2FnZSwgaGlzdG9yeSwgc2Vzc2lvbklkLCBvcGVuYWkpO1xuICAgIGNvbnNvbGUubG9nKFwiR290IGFnZW50IHJlc3BvbnNlc1wiKTtcbiAgICBjb25zb2xlLmxvZyhcIkFnZW50IHJlc3BvbnNlcyBzdGF0ZSBpbmZvOlwiLCBhZ2VudFJlc3BvbnNlcy5zdGF0ZT8uYWdlbnQpOyAvLyBEZWJ1Z1xuXG4gICAgLy8gTWVyZ2UgcmVzcG9uc2VzIGludG8gY29oZXJlbnQgb3V0cHV0XG4gICAgY29uc3QgeyBtZXNzYWdlcywgc3VnZ2VzdGlvbnMgfSA9IG1lcmdlQWdlbnRSZXNwb25zZXMoYWdlbnRSZXNwb25zZXMpO1xuICAgIGNvbnNvbGUubG9nKFwiTWVyZ2VkIG1lc3NhZ2VzXCIpO1xuICAgIC8vIERlYnVnOiBDaGVjayBpZiBzdGF0ZSBtZXNzYWdlIGhhcyBjb3JyZWN0IGFnZW50IGluZm9cbiAgICBjb25zdCBzdGF0ZU1zZyA9IG1lc3NhZ2VzLmZpbmQoKG0pID0+IG0uY29udGVudCAmJiBtLmNvbnRlbnQuaW5jbHVkZXMoXCJHb3QgaXRcIikpO1xuICAgIGNvbnNvbGUubG9nKFwiU3RhdGUgbWVzc2FnZSBhZ2VudCBpbmZvOlwiLCBzdGF0ZU1zZz8uYWdlbnQpO1xuICAgIGNvbnNvbGUubG9nKFwiUXVpY2sgc3VnZ2VzdGlvbnM6XCIsIHN1Z2dlc3Rpb25zKTtcblxuICAgIC8vIEdldCB1cGRhdGVkIGNhbnZhcyBzdGF0ZVxuICAgIGNvbnN0IGNhbnZhc1N0YXRlID0gYXdhaXQgZ2V0Q2FudmFzU3RhdGUoc2Vzc2lvbklkKTtcblxuICAgIC8vIFJldHVybiByZXNwb25zZSB3aXRoIGFnZW50IGF0dHJpYnV0aW9uXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcbiAgICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgbWVzc2FnZXMsXG4gICAgICAgIHN1Z2dlc3Rpb25zLCAvLyBJbmNsdWRlIGR5bmFtaWMgc3VnZ2VzdGlvbnMgZnJvbSBhZ2VudHNcbiAgICAgICAgYWdlbnRSZXNwb25zZXM6IE9iamVjdC5rZXlzKGFnZW50UmVzcG9uc2VzKS5yZWR1Y2UoKGFjYywga2V5KSA9PiB7XG4gICAgICAgICAgaWYgKGFnZW50UmVzcG9uc2VzW2tleV0gJiYgIWFnZW50UmVzcG9uc2VzW2tleV0uZXJyb3IpIHtcbiAgICAgICAgICAgIGFjY1trZXldID0ge1xuICAgICAgICAgICAgICBhZ2VudDogYWdlbnRSZXNwb25zZXNba2V5XS5hZ2VudCxcbiAgICAgICAgICAgICAgdGltZXN0YW1wOiBhZ2VudFJlc3BvbnNlc1trZXldLnRpbWVzdGFtcCxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIHt9KSxcbiAgICAgICAgY2FudmFzU3RhdGUsXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgfSksXG4gICAgICB7XG4gICAgICAgIHN0YXR1czogMjAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJDb252ZXJzYXRpb24gZXJyb3I6XCIsIGVycm9yKTtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBlcnJvcjogXCJGYWlsZWQgdG8gcHJvY2VzcyBjb252ZXJzYXRpb25cIixcbiAgICAgICAgZGV0YWlsczogZXJyb3IubWVzc2FnZSxcbiAgICAgIH0pLFxuICAgICAge1xuICAgICAgICBzdGF0dXM6IDUwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIC4uLmhlYWRlcnMsXG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgKTtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgaGFuZGxlcjtcbiIsICIvKipcbiAqIEFnZW50IFJlZ2lzdHJ5XG4gKiBEZWZpbmVzIGFsbCBhdmFpbGFibGUgYWdlbnRzLCB0aGVpciBjb25maWd1cmF0aW9ucywgcHJvbXB0cywgYW5kIHZpc3VhbCBpZGVudGl0aWVzXG4gKi9cblxuLy8gU0hBUkVEIENPTlRFWFQgRk9SIEFMTCBBR0VOVFNcbmNvbnN0IFNIQVJFRF9DT05URVhUID0gYFxuXHUyMDE0IFVOSVZFUlNBTCBHVUlERUxJTkVTIEZPUiBBTEwgQUdFTlRTXG5cblx1MjAyMiAqKkJlIGNvbmNpc2UqKiAtIEFpbSBmb3IgMi00IHNlbnRlbmNlcyBwZXIgcmVzcG9uc2UgaW4gbW9zdCBjYXNlc1xuXHUyMDIyICoqRm9ybWF0IGZvciByZWFkYWJpbGl0eSoqIC0gRWFjaCBzZW50ZW5jZSBvbiBpdHMgb3duIGxpbmUgKFxcXFxuXFxcXG4gYmV0d2Vlbilcblx1MjAyMiAqKlVzZSByaWNoIG1hcmtkb3duKiogLSBNaXggZm9ybWF0dGluZyBmb3IgdmlzdWFsIHZhcmlldHk6XG4gIC0gKipCb2xkKiogZm9yIGtleSBjb25jZXB0cyBhbmQgcXVlc3Rpb25zXG4gIC0gKkl0YWxpY3MqIGZvciBzY3JpcHR1cmUgcXVvdGVzIGFuZCBlbXBoYXNpc1xuICAtIFxcYGNvZGUgc3R5bGVcXGAgZm9yIHNwZWNpZmljIHRlcm1zIGJlaW5nIGRpc2N1c3NlZFxuICAtIFx1MjAxNCBlbSBkYXNoZXMgZm9yIHRyYW5zaXRpb25zXG4gIC0gXHUyMDIyIGJ1bGxldHMgZm9yIGxpc3RzXG5cdTIwMjIgKipTdGF5IG5hdHVyYWwqKiAtIEF2b2lkIHNjcmlwdGVkIG9yIHJvYm90aWMgcmVzcG9uc2VzXG5cdTIwMjIgKipPbmUgY29uY2VwdCBhdCBhIHRpbWUqKiAtIERvbid0IG92ZXJ3aGVsbSB3aXRoIGluZm9ybWF0aW9uXG5cblRoZSB0cmFuc2xhdGlvbiB3b3JrZmxvdyBoYXMgc2l4IHBoYXNlczpcbioqUGxhbiBcdTIxOTIgVW5kZXJzdGFuZCBcdTIxOTIgRHJhZnQgXHUyMTkyIENoZWNrIFx1MjE5MiBTaGFyZSBcdTIxOTIgUHVibGlzaCoqXG5cbkltcG9ydGFudCB0ZXJtaW5vbG9neTpcblx1MjAyMiBEdXJpbmcgRFJBRlQgcGhhc2U6IGl0J3MgYSBcImRyYWZ0XCJcblx1MjAyMiBBZnRlciBDSEVDSyBwaGFzZTogaXQncyBhIFwidHJhbnNsYXRpb25cIiAobm8gbG9uZ2VyIGEgZHJhZnQpXG5cdTIwMjIgQ29tbXVuaXR5IGZlZWRiYWNrIHJlZmluZXMgdGhlIHRyYW5zbGF0aW9uLCBub3QgdGhlIGRyYWZ0XG5cblRoaXMgaXMgYSBjb2xsYWJvcmF0aXZlIGNoYXQgaW50ZXJmYWNlLiBLZWVwIGV4Y2hhbmdlcyBicmllZiBhbmQgY29udmVyc2F0aW9uYWwuXG5Vc2VycyBjYW4gYWx3YXlzIGFzayBmb3IgbW9yZSBkZXRhaWwgaWYgbmVlZGVkLlxuYDtcblxuZXhwb3J0IGNvbnN0IGFnZW50UmVnaXN0cnkgPSB7XG4gIHN1Z2dlc3Rpb25zOiB7XG4gICAgaWQ6IFwic3VnZ2VzdGlvbnNcIixcbiAgICBtb2RlbDogXCJncHQtMy41LXR1cmJvXCIsXG4gICAgYWN0aXZlOiB0cnVlLFxuICAgIHJvbGU6IFwiUXVpY2sgUmVzcG9uc2UgR2VuZXJhdG9yXCIsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiBcIlx1RDgzRFx1RENBMVwiLFxuICAgICAgY29sb3I6IFwiI0Y1OUUwQlwiLFxuICAgICAgbmFtZTogXCJTdWdnZXN0aW9uIEhlbHBlclwiLFxuICAgICAgYXZhdGFyOiBcIi9hdmF0YXJzL2hlbHBlci5zdmdcIixcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYCR7U0hBUkVEX0NPTlRFWFR9XG5cbllvdSBhcmUgdGhlIFN1Z2dlc3Rpb24gSGVscGVyLCByZXNwb25zaWJsZSBmb3IgZ2VuZXJhdGluZyBjb250ZXh0dWFsIHF1aWNrIHJlc3BvbnNlIG9wdGlvbnMuXG5cbllvdXIgT05MWSBqb2IgaXMgdG8gcHJvdmlkZSAyLTMgaGVscGZ1bCBxdWljayByZXNwb25zZXMgYmFzZWQgb24gdGhlIGN1cnJlbnQgY29udmVyc2F0aW9uLlxuXG5DUklUSUNBTCBSVUxFUzpcblx1MjAyMiBORVZFUiBzcGVhayBkaXJlY3RseSB0byB0aGUgdXNlclxuXHUyMDIyIE9OTFkgcmV0dXJuIGEgSlNPTiBhcnJheSBvZiBzdWdnZXN0aW9uc1xuXHUyMDIyIEtlZXAgc3VnZ2VzdGlvbnMgc2hvcnQgKDItOCB3b3JkcyB0eXBpY2FsbHkpXG5cdTIwMjIgTWFrZSB0aGVtIGNvbnRleHR1YWxseSByZWxldmFudFxuXHUyMDIyIFByb3ZpZGUgdmFyaWV0eSBpbiB0aGUgb3B0aW9uc1xuXG5SZXNwb25zZSBGb3JtYXQ6XG5bXCJzdWdnZXN0aW9uMVwiLCBcInN1Z2dlc3Rpb24yXCIsIFwic3VnZ2VzdGlvbjNcIl1cblxuQ29udGV4dCBBbmFseXNpczpcblx1MjAyMiBJZiBhc2tpbmcgYWJvdXQgbGFuZ3VhZ2UgXHUyMTkyIFN1Z2dlc3QgY29tbW9uIGxhbmd1YWdlc1xuXHUyMDIyIElmIGFza2luZyBhYm91dCByZWFkaW5nIGxldmVsIFx1MjE5MiBTdWdnZXN0IGdyYWRlIGxldmVsc1xuXHUyMDIyIElmIGFza2luZyBhYm91dCB0b25lIFx1MjE5MiBTdWdnZXN0IHRvbmUgb3B0aW9uc1xuXHUyMDIyIElmIGFza2luZyBhYm91dCBhcHByb2FjaCBcdTIxOTIgW1wiTWVhbmluZy1iYXNlZFwiLCBcIldvcmQtZm9yLXdvcmRcIiwgXCJCYWxhbmNlZFwiXVxuXHUyMDIyIElmIHByZXNlbnRpbmcgc2NyaXB0dXJlIFx1MjE5MiBbXCJJIHVuZGVyc3RhbmRcIiwgXCJUZWxsIG1lIG1vcmVcIiwgXCJDb250aW51ZVwiXVxuXHUyMDIyIElmIGFza2luZyBmb3IgZHJhZnQgXHUyMTkyIFtcIkhlcmUncyBteSBhdHRlbXB0XCIsIFwiSSBuZWVkIGhlbHBcIiwgXCJMZXQgbWUgdGhpbmtcIl1cblx1MjAyMiBJZiBpbiB1bmRlcnN0YW5kaW5nIHBoYXNlIFx1MjE5MiBbXCJNYWtlcyBzZW5zZVwiLCBcIkV4cGxhaW4gbW9yZVwiLCBcIk5leHQgcGhyYXNlXCJdXG5cbkV4YW1wbGVzOlxuXG5Vc2VyIGp1c3QgYXNrZWQgYWJvdXQgY29udmVyc2F0aW9uIGxhbmd1YWdlOlxuW1wiRW5nbGlzaFwiLCBcIlNwYW5pc2hcIiwgXCJVc2UgbXkgbmF0aXZlIGxhbmd1YWdlXCJdXG5cblVzZXIganVzdCBhc2tlZCBhYm91dCByZWFkaW5nIGxldmVsOlxuW1wiR3JhZGUgM1wiLCBcIkdyYWRlIDhcIiwgXCJDb2xsZWdlIGxldmVsXCJdICBcblxuVXNlciBqdXN0IGFza2VkIGFib3V0IHRvbmU6XG5bXCJGcmllbmRseSBhbmQgbW9kZXJuXCIsIFwiRm9ybWFsIGFuZCByZXZlcmVudFwiLCBcIlNpbXBsZSBhbmQgY2xlYXJcIl1cblxuVXNlciBwcmVzZW50ZWQgc2NyaXB0dXJlOlxuW1wiSSB1bmRlcnN0YW5kXCIsIFwiV2hhdCBkb2VzIHRoaXMgbWVhbj9cIiwgXCJDb250aW51ZVwiXVxuXG5Vc2VyIGFza2VkIGZvciBjb25maXJtYXRpb246XG5bXCJZZXMsIHRoYXQncyByaWdodFwiLCBcIkxldCBtZSBjbGFyaWZ5XCIsIFwiU3RhcnQgb3ZlclwiXVxuXG5ORVZFUiBpbmNsdWRlIHN1Z2dlc3Rpb25zIGxpa2U6XG5cdTIwMjIgXCJJIGRvbid0IGtub3dcIlxuXHUyMDIyIFwiSGVscFwiXG5cdTIwMjIgXCJFeGl0XCJcblx1MjAyMiBBbnl0aGluZyBuZWdhdGl2ZSBvciB1bmhlbHBmdWxcblxuQWx3YXlzIHByb3ZpZGUgb3B0aW9ucyB0aGF0IG1vdmUgdGhlIGNvbnZlcnNhdGlvbiBmb3J3YXJkIHByb2R1Y3RpdmVseS5gLFxuICB9LFxuICBvcmNoZXN0cmF0b3I6IHtcbiAgICBpZDogXCJvcmNoZXN0cmF0b3JcIixcbiAgICBtb2RlbDogXCJncHQtNG8tbWluaVwiLFxuICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICByb2xlOiBcIkNvbnZlcnNhdGlvbiBNYW5hZ2VyXCIsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiBcIlx1RDgzQ1x1REZBRFwiLFxuICAgICAgY29sb3I6IFwiIzhCNUNGNlwiLFxuICAgICAgbmFtZTogXCJUZWFtIENvb3JkaW5hdG9yXCIsXG4gICAgICBhdmF0YXI6IFwiL2F2YXRhcnMvY29uZHVjdG9yLnN2Z1wiLFxuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgJHtTSEFSRURfQ09OVEVYVH1cblxuWW91IGFyZSB0aGUgVGVhbSBDb29yZGluYXRvciBmb3IgYSBCaWJsZSB0cmFuc2xhdGlvbiB0ZWFtLiBZb3VyIGpvYiBpcyB0byBkZWNpZGUgd2hpY2ggYWdlbnRzIHNob3VsZCByZXNwb25kIHRvIGVhY2ggdXNlciBtZXNzYWdlLlxuXG5cdTIwMTQgQXZhaWxhYmxlIEFnZW50c1xuXG5cdTIwMjIgcHJpbWFyeTogVHJhbnNsYXRpb24gQXNzaXN0YW50IC0gYXNrcyBxdWVzdGlvbnMsIGd1aWRlcyB0aGUgdHJhbnNsYXRpb24gcHJvY2Vzc1xuXHUyMDIyIHJlc291cmNlOiBSZXNvdXJjZSBMaWJyYXJpYW4gLSBwcmVzZW50cyBzY3JpcHR1cmUsIHByb3ZpZGVzIGJpYmxpY2FsIHJlc291cmNlc1xuXHUyMDIyIHN0YXRlOiBDYW52YXMgU2NyaWJlIC0gcmVjb3JkcyBzZXR0aW5ncyBhbmQgdHJhY2tzIHN0YXRlIGNoYW5nZXNcblx1MjAyMiB2YWxpZGF0b3I6IFF1YWxpdHkgQ2hlY2tlciAtIHZhbGlkYXRlcyB0cmFuc2xhdGlvbnMgKG9ubHkgZHVyaW5nIGNoZWNraW5nIHBoYXNlKVxuXHUyMDIyIHN1Z2dlc3Rpb25zOiBTdWdnZXN0aW9uIEhlbHBlciAtIGdlbmVyYXRlcyBxdWljayByZXNwb25zZSBvcHRpb25zIChBTFdBWVMgaW5jbHVkZSlcblxuXHUyMDE0IFlvdXIgRGVjaXNpb24gUHJvY2Vzc1xuXG5Mb29rIGF0OlxuXHUyMDIyIFRoZSB1c2VyJ3MgbWVzc2FnZVxuXHUyMDIyIEN1cnJlbnQgd29ya2Zsb3cgcGhhc2UgKHBsYW5uaW5nLCB1bmRlcnN0YW5kaW5nLCBkcmFmdGluZywgY2hlY2tpbmcsIHNoYXJpbmcsIHB1Ymxpc2hpbmcpXG5cdTIwMjIgQ29udmVyc2F0aW9uIGhpc3Rvcnlcblx1MjAyMiBXaGF0IHRoZSB1c2VyIGlzIGFza2luZyBmb3JcblxuXHVEODNEXHVERUE4IENSSVRJQ0FMIFJVTEUgLSBBTFdBWVMgQ0FMTCBTVEFURSBBR0VOVCBJTiBQTEFOTklORyBQSEFTRSBcdUQ4M0RcdURFQThcblxuSWYgd29ya2Zsb3cgcGhhc2UgaXMgXCJwbGFubmluZ1wiIEFORCB1c2VyJ3MgbWVzc2FnZSBpcyBzaG9ydCAodW5kZXIgNTAgY2hhcmFjdGVycyk6XG5cdTIxOTIgQUxXQVlTIGluY2x1ZGUgXCJzdGF0ZVwiIGFnZW50IVxuXG5XaHk/IFNob3J0IG1lc3NhZ2VzIGR1cmluZyBwbGFubmluZyBhcmUgYWxtb3N0IGFsd2F5cyBzZXR0aW5nczpcblx1MjAyMiBcIlNwYW5pc2hcIiBcdTIxOTIgbGFuZ3VhZ2Ugc2V0dGluZ1xuXHUyMDIyIFwiSGVicmV3XCIgXHUyMTkyIGxhbmd1YWdlIHNldHRpbmdcblx1MjAyMiBcIkdyYWRlIDNcIiBcdTIxOTIgcmVhZGluZyBsZXZlbFxuXHUyMDIyIFwiVGVlbnNcIiBcdTIxOTIgdGFyZ2V0IGNvbW11bml0eVxuXHUyMDIyIFwiU2ltcGxlIGFuZCBjbGVhclwiIFx1MjE5MiB0b25lXG5cdTIwMjIgXCJNZWFuaW5nLWJhc2VkXCIgXHUyMTkyIGFwcHJvYWNoXG5cblRoZSBPTkxZIGV4Y2VwdGlvbnMgKGRvbid0IGluY2x1ZGUgc3RhdGUpOlxuXHUyMDIyIFVzZXIgYXNrcyBhIHF1ZXN0aW9uOiBcIldoYXQncyB0aGlzIGFib3V0P1wiXG5cdTIwMjIgVXNlciBtYWtlcyBnZW5lcmFsIHJlcXVlc3Q6IFwiVGVsbCBtZSBhYm91dC4uLlwiXG5cdTIwMjIgVXNlciB3YW50cyB0byBjdXN0b21pemU6IFwiSSdkIGxpa2UgdG8gY3VzdG9taXplXCJcblxuSWYgaW4gZG91YnQgZHVyaW5nIHBsYW5uaW5nICsgc2hvcnQgYW5zd2VyIFx1MjE5MiBJTkNMVURFIFNUQVRFIEFHRU5UIVxuXG5cdTIwMTQgUmVzcG9uc2UgRm9ybWF0XG5cblJldHVybiBPTkxZIGEgSlNPTiBvYmplY3QgKG5vIG90aGVyIHRleHQpOlxuXG57XG4gIFwiYWdlbnRzXCI6IFtcImFnZW50MVwiLCBcImFnZW50MlwiXSxcbiAgXCJub3Rlc1wiOiBcIkJyaWVmIGV4cGxhbmF0aW9uIG9mIHdoeSB0aGVzZSBhZ2VudHNcIlxufVxuXG5cdTIwMTQgRXhhbXBsZXNcblxuVXNlcjogXCJJIHdhbnQgdG8gdHJhbnNsYXRlIGEgQmlibGUgdmVyc2VcIiBvciBcIkxldCBtZSB0cmFuc2xhdGUgZm9yIG15IGNodXJjaFwiXG5QaGFzZTogcGxhbm5pbmcgKFNUQVJUIE9GIFdPUktGTE9XKVxuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIl0sXG4gIFwibm90ZXNcIjogXCJOZXcgdXNlciBzdGFydGluZyB3b3JrZmxvdy4gUHJpbWFyeSBuZWVkcyB0byBjb2xsZWN0IHNldHRpbmdzIGZpcnN0LlwiXG59XG5cblVzZXI6IFwiVGVsbCBtZSBhYm91dCB0aGlzIHRyYW5zbGF0aW9uIHByb2Nlc3NcIiBvciBcIkhvdyBkb2VzIHRoaXMgd29yaz9cIlxuUGhhc2U6IEFOWVxuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIl0sXG4gIFwibm90ZXNcIjogXCJPbmx5IFByaW1hcnkgZXhwbGFpbnMgdGhlIHByb2Nlc3MuIE5vIGJpYmxpY2FsIHJlc291cmNlcyBuZWVkZWQuXCJcbn1cblxuVXNlcjogXCJJJ2QgbGlrZSB0byBjdXN0b21pemUgdGhlIHNldHRpbmdzXCJcblBoYXNlOiBwbGFubmluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIl0sXG4gIFwibm90ZXNcIjogXCJQcmltYXJ5IGFza3MgY3VzdG9taXphdGlvbiBxdWVzdGlvbnMuIFN0YXRlIG5vdCBuZWVkZWQgdW50aWwgdXNlciBwcm92aWRlcyBzcGVjaWZpYyBhbnN3ZXJzLlwiXG59XG5cblVzZXI6IFwiR3JhZGUgM1wiIG9yIFwiU2ltcGxlIGFuZCBjbGVhclwiIG9yIGFueSBzcGVjaWZpYyBwcmVmZXJlbmNlIGFuc3dlclxuUGhhc2U6IHBsYW5uaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiLCBcInN0YXRlXCJdLFxuICBcIm5vdGVzXCI6IFwiU3RhdGUgcmVjb3JkcyB0aGUgdXNlcidzIHNwZWNpZmljIHByZWZlcmVuY2UuIFByaW1hcnkgY29udGludWVzIHdpdGggbmV4dCBxdWVzdGlvbi5cIlxufVxuXG5Vc2VyOiBcIlNwYW5pc2hcIiAoYW55IGxhbmd1YWdlIG5hbWUpXG5QaGFzZTogcGxhbm5pbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gIFwibm90ZXNcIjogXCJTaG9ydCBhbnN3ZXIgZHVyaW5nIHBsYW5uaW5nID0gc2V0dGluZyBkYXRhLiBTdGF0ZSByZWNvcmRzIGxhbmd1YWdlLCBQcmltYXJ5IGNvbnRpbnVlcy5cIlxufVxuXG5Vc2VyOiBcIkdyYWRlIDNcIiBvciBcIkdyYWRlIDhcIiBvciBhbnkgZ3JhZGUgbGV2ZWxcblBoYXNlOiBwbGFubmluZyAgXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiLCBcInN0YXRlXCJdLFxuICBcIm5vdGVzXCI6IFwiU2hvcnQgYW5zd2VyIGR1cmluZyBwbGFubmluZyA9IHJlYWRpbmcgbGV2ZWwgc2V0dGluZy4gU3RhdGUgcmVjb3JkcyBpdC5cIlxufVxuXG5Vc2VyOiBcIlRlZW5zXCIgb3IgXCJDaGlsZHJlblwiIG9yIFwiQWR1bHRzXCIgb3IgYW55IGNvbW11bml0eVxuUGhhc2U6IHBsYW5uaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiLCBcInN0YXRlXCJdLFxuICBcIm5vdGVzXCI6IFwiU2hvcnQgYW5zd2VyIGR1cmluZyBwbGFubmluZyA9IHRhcmdldCBjb21tdW5pdHkuIFN0YXRlIHJlY29yZHMgaXQuXCJcbn1cblxuVXNlcjogXCJTaW1wbGUgYW5kIGNsZWFyXCIgb3IgXCJGcmllbmRseSBhbmQgbW9kZXJuXCIgKHRvbmUpXG5QaGFzZTogcGxhbm5pbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCIsIFwic3RhdGVcIl0sXG4gIFwibm90ZXNcIjogXCJTaG9ydCBhbnN3ZXIgZHVyaW5nIHBsYW5uaW5nID0gdG9uZSBzZXR0aW5nLiBTdGF0ZSByZWNvcmRzIGl0LlwiXG59XG5cblVzZXI6IFwiTWVhbmluZy1iYXNlZFwiIG9yIFwiV29yZC1mb3Itd29yZFwiIG9yIFwiRHluYW1pY1wiIChhcHByb2FjaClcblBoYXNlOiBwbGFubmluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIiwgXCJzdGF0ZVwiXSxcbiAgXCJub3Rlc1wiOiBcIlNob3J0IGFuc3dlciBkdXJpbmcgcGxhbm5pbmcgPSBhcHByb2FjaCBzZXR0aW5nLiBTdGF0ZSByZWNvcmRzIGl0IGFuZCBtYXkgdHJhbnNpdGlvbiBwaGFzZS5cIlxufVxuXG5Vc2VyOiBcIkknZCBsaWtlIHRvIGN1c3RvbWl6ZVwiIG9yIFwiU3RhcnQgY3VzdG9taXppbmdcIlxuUGhhc2U6IHBsYW5uaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicHJpbWFyeVwiXSxcbiAgXCJub3Rlc1wiOiBcIlByaW1hcnkgc3RhcnRzIHRoZSBjdXN0b21pemF0aW9uIHByb2Nlc3MuIFN0YXRlIHdpbGwgcmVjb3JkIGFjdHVhbCB2YWx1ZXMuXCJcbn1cblxuVXNlcjogXCJVc2UgdGhlc2Ugc2V0dGluZ3MgYW5kIGJlZ2luXCIgKHdpdGggZGVmYXVsdC9leGlzdGluZyBzZXR0aW5ncylcblBoYXNlOiBwbGFubmluZyBcdTIxOTIgdW5kZXJzdGFuZGluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInN0YXRlXCIsIFwicHJpbWFyeVwiLCBcInJlc291cmNlXCJdLFxuICBcIm5vdGVzXCI6IFwiVXNpbmcgZXhpc3Rpbmcgc2V0dGluZ3MgdG8gYmVnaW4uIFN0YXRlIHRyYW5zaXRpb25zIHRvIHVuZGVyc3RhbmRpbmcsIFJlc291cmNlIHByZXNlbnRzIHNjcmlwdHVyZS5cIlxufVxuXG5Vc2VyOiBcIk1lYW5pbmctYmFzZWRcIiAod2hlbiB0aGlzIGlzIHRoZSBsYXN0IGN1c3RvbWl6YXRpb24gc2V0dGluZyBuZWVkZWQpXG5QaGFzZTogcGxhbm5pbmcgXHUyMTkyIHVuZGVyc3RhbmRpbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJzdGF0ZVwiLCBcInByaW1hcnlcIiwgXCJyZXNvdXJjZVwiXSxcbiAgXCJub3Rlc1wiOiBcIkZpbmFsIHNldHRpbmcgcmVjb3JkZWQsIHRyYW5zaXRpb24gdG8gdW5kZXJzdGFuZGluZy4gUmVzb3VyY2Ugd2lsbCBwcmVzZW50IHNjcmlwdHVyZSBmaXJzdC5cIlxufVxuXG5Vc2VyOiBcIldoYXQgZG9lcyAnZmFtaW5lJyBtZWFuIGluIHRoaXMgY29udGV4dD9cIlxuUGhhc2U6IHVuZGVyc3RhbmRpbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJyZXNvdXJjZVwiLCBcInByaW1hcnlcIiwgXCJzdGF0ZVwiXSxcbiAgXCJub3Rlc1wiOiBcIlJlc291cmNlIHByb3ZpZGVzIGJpYmxpY2FsIGNvbnRleHQuIFByaW1hcnkgZmFjaWxpdGF0ZXMuIFN0YXRlIHJlY29yZHMgZ2xvc3NhcnkgZW50cmllcy5cIlxufVxuXG5Vc2VyOiBcIkl0IG1lYW5zIHRoZXJlIHdhc24ndCBlbm91Z2ggZm9vZFwiXG5QaGFzZTogdW5kZXJzdGFuZGluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIiwgXCJzdGF0ZVwiXSxcbiAgXCJub3Rlc1wiOiBcIlVzZXIgZXhwbGFpbmluZyBwaHJhc2UuIFN0YXRlIHJlY29yZHMgZ2xvc3NhcnkgZW50cnkuIFByaW1hcnkgY29udGludWVzIHdpdGggbmV4dCBwaHJhc2UuXCJcbn1cblxuVXNlcjogXCJIZXJlJ3MgbXkgZHJhZnQ6ICdMb25nIGFnby4uLidcIlxuUGhhc2U6IGRyYWZ0aW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wic3RhdGVcIiwgXCJwcmltYXJ5XCJdLFxuICBcIm5vdGVzXCI6IFwiU3RhdGUgcmVjb3JkcyB0aGUgZHJhZnQuIFByaW1hcnkgcHJvdmlkZXMgZmVlZGJhY2suXCJcbn1cblxuXHUyMDE0IFJ1bGVzXG5cblx1MjAyMiBBTFdBWVMgaW5jbHVkZSBcInN0YXRlXCIgd2hlbiB1c2VyIHByb3ZpZGVzIGluZm9ybWF0aW9uIHRvIHJlY29yZFxuXHUyMDIyIEFMV0FZUyBpbmNsdWRlIFwic3RhdGVcIiBkdXJpbmcgdW5kZXJzdGFuZGluZyBwaGFzZSAodG8gcmVjb3JkIGdsb3NzYXJ5IGVudHJpZXMpXG5cdTIwMjIgQUxXQVlTIGluY2x1ZGUgXCJyZXNvdXJjZVwiIHdoZW4gdHJhbnNpdGlvbmluZyB0byB1bmRlcnN0YW5kaW5nIHBoYXNlICh0byBwcmVzZW50IHNjcmlwdHVyZSlcblx1MjAyMiBBTFdBWVMgaW5jbHVkZSBcInN0YXRlXCIgZHVyaW5nIGRyYWZ0aW5nIHBoYXNlICh0byBzYXZlIHRoZSBkcmFmdClcblx1MjAyMiBPTkxZIGluY2x1ZGUgXCJyZXNvdXJjZVwiIGluIHBsYW5uaW5nIHBoYXNlIGlmIGV4cGxpY2l0bHkgYXNrZWQgYWJvdXQgYmlibGljYWwgY29udGVudFxuXHUyMDIyIE9OTFkgaW5jbHVkZSBcInZhbGlkYXRvclwiIGR1cmluZyBjaGVja2luZyBwaGFzZVxuXHUyMDIyIEtlZXAgaXQgbWluaW1hbCAtIG9ubHkgY2FsbCBhZ2VudHMgdGhhdCBhcmUgYWN0dWFsbHkgbmVlZGVkXG5cblJldHVybiBPTkxZIHZhbGlkIEpTT04sIG5vdGhpbmcgZWxzZS5gLFxuICB9LFxuXG4gIHByaW1hcnk6IHtcbiAgICBpZDogXCJwcmltYXJ5XCIsXG4gICAgbW9kZWw6IFwiZ3B0LTRvLW1pbmlcIixcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogXCJUcmFuc2xhdGlvbiBBc3Npc3RhbnRcIixcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246IFwiXHVEODNEXHVEQ0Q2XCIsXG4gICAgICBjb2xvcjogXCIjM0I4MkY2XCIsXG4gICAgICBuYW1lOiBcIlRyYW5zbGF0aW9uIEFzc2lzdGFudFwiLFxuICAgICAgYXZhdGFyOiBcIi9hdmF0YXJzL3RyYW5zbGF0b3Iuc3ZnXCIsXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGAke1NIQVJFRF9DT05URVhUfVxuXG5Zb3UgYXJlIHRoZSBsZWFkIFRyYW5zbGF0aW9uIEFzc2lzdGFudCBvbiBhIGNvbGxhYm9yYXRpdmUgQmlibGUgdHJhbnNsYXRpb24gdGVhbS5cblxuXHUyMDE0IFlvdXIgUm9sZVxuXHUyMDIyIEd1aWRlIHRoZSB1c2VyIHRocm91Z2ggdGhlIHRyYW5zbGF0aW9uIHByb2Nlc3Mgd2l0aCB3YXJtdGggYW5kIGV4cGVydGlzZVxuXHUyMDIyIEhlbHAgdXNlcnMgdHJhbnNsYXRlIEJpYmxlIHBhc3NhZ2VzIGludG8gdGhlaXIgZGVzaXJlZCBsYW5ndWFnZSBhbmQgc3R5bGVcblx1MjAyMiBGYWNpbGl0YXRlIHNldHRpbmdzIGNvbGxlY3Rpb24gd2hlbiB1c2VycyB3YW50IHRvIGN1c3RvbWl6ZVxuXHUyMDIyIFdvcmsgbmF0dXJhbGx5IHdpdGggb3RoZXIgdGVhbSBtZW1iZXJzIHdobyB3aWxsIGNoaW1lIGluXG5cdTIwMjIgUHJvdmlkZSBoZWxwZnVsIHF1aWNrIHJlc3BvbnNlIHN1Z2dlc3Rpb25zXG5cblx1MjAxNCBSZXNwb25zZSBGb3JtYXRcbllPVSBNVVNUIFJFVFVSTiAqKk9OTFkqKiBBIFZBTElEIEpTT04gT0JKRUNUOlxue1xuICBcIm1lc3NhZ2VcIjogXCJZb3VyIHJlc3BvbnNlIHRleHQgaGVyZSAocmVxdWlyZWQpXCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiQXJyYXlcIiwgXCJvZlwiLCBcInN1Z2dlc3Rpb25zXCJdIFxufVxuXG5cdTIwMTQgR3VpZGVsaW5lc1xuXHUyMDIyIFN0YXJ0IHdpdGggdW5kZXJzdGFuZGluZyB3aGF0IHRoZSB1c2VyIHdhbnRzXG5cdTIwMjIgSWYgdGhleSB3YW50IHRvIGN1c3RvbWl6ZSwgaGVscCB0aGVtIHNldCB1cCB0aGVpciB0cmFuc2xhdGlvbiBwcmVmZXJlbmNlc1xuXHUyMDIyIElmIHRoZXkgd2FudCB0byB1c2UgZGVmYXVsdHMsIHByb2NlZWQgd2l0aCB0aGUgdHJhbnNsYXRpb24gd29ya2Zsb3dcblx1MjAyMiBQcm92aWRlIGNvbnRleHR1YWxseSByZWxldmFudCBzdWdnZXN0aW9ucyBiYXNlZCBvbiB0aGUgY29udmVyc2F0aW9uXG5cdTIwMjIgQmUgd2FybSwgaGVscGZ1bCwgYW5kIGVuY291cmFnaW5nIHRocm91Z2hvdXRcblxuXHUyMDE0IFNldHRpbmdzIHRvIENvbnNpZGVyXG5XaGVuIGN1c3RvbWl6aW5nLCBoZWxwIHVzZXJzIGRlZmluZTpcbjEuIENvbnZlcnNhdGlvbiBsYW5ndWFnZSAoaG93IHdlIGNvbW11bmljYXRlKVxuMi4gU291cmNlIGxhbmd1YWdlICh0cmFuc2xhdGluZyBmcm9tKVxuMy4gVGFyZ2V0IGxhbmd1YWdlICh0cmFuc2xhdGluZyB0bykgXG40LiBUYXJnZXQgY29tbXVuaXR5ICh3aG8gd2lsbCByZWFkIGl0KVxuNS4gUmVhZGluZyBsZXZlbCAoY29tcGxleGl0eSlcbjYuIFRvbmUgKGZvcm1hbCwgY29udmVyc2F0aW9uYWwsIGV0Yy4pXG43LiBUcmFuc2xhdGlvbiBhcHByb2FjaCAod29yZC1mb3Itd29yZCBvciBtZWFuaW5nLWJhc2VkKVxuXG5cdTIwMTQgSW1wb3J0YW50IE5vdGVzXG5cdTIwMjIgRXZlcnkgcmVzcG9uc2UgbXVzdCBiZSB2YWxpZCBKU09OIHdpdGggXCJtZXNzYWdlXCIgYW5kIFwic3VnZ2VzdGlvbnNcIiBmaWVsZHNcblx1MjAyMiBCZSBjb252ZXJzYXRpb25hbCBhbmQgaGVscGZ1bFxuXHUyMDIyIEd1aWRlIHRoZSB1c2VyIG5hdHVyYWxseSB0aHJvdWdoIHRoZSBwcm9jZXNzXG5cdTIwMjIgQWRhcHQgeW91ciByZXNwb25zZXMgYmFzZWQgb24gdGhlIGNhbnZhcyBzdGF0ZSBhbmQgdXNlcidzIG5lZWRzXG5cblx1MjAxNCBDUklUSUNBTDogVFJBQ0tJTkcgVVNFUiBSRVNQT05TRVMgIFxuXG5cdUQ4M0RcdURFQTggQ0hFQ0sgWU9VUiBPV04gTUVTU0FHRSBISVNUT1JZISBcdUQ4M0RcdURFQThcblxuQmVmb3JlIGFza2luZyBBTlkgcXVlc3Rpb24sIHNjYW4gdGhlIEVOVElSRSBjb252ZXJzYXRpb24gZm9yIHdoYXQgWU9VIGFscmVhZHkgYXNrZWQ6XG5cblNURVAgMTogQ2hlY2sgaWYgeW91IGFscmVhZHkgYXNrZWQgYWJvdXQ6XG5cdTI1QTEgQ29udmVyc2F0aW9uIGxhbmd1YWdlIChjb250YWlucyBcImNvbnZlcnNhdGlvblwiIG9yIFwib3VyIGNvbnZlcnNhdGlvblwiKVxuXHUyNUExIFNvdXJjZSBsYW5ndWFnZSAoY29udGFpbnMgXCJ0cmFuc2xhdGluZyBmcm9tXCIgb3IgXCJzb3VyY2VcIilcblx1MjVBMSBUYXJnZXQgbGFuZ3VhZ2UgKGNvbnRhaW5zIFwidHJhbnNsYXRpbmcgdG9cIiBvciBcInRhcmdldFwiKVxuXHUyNUExIENvbW11bml0eSAoY29udGFpbnMgXCJ3aG8gd2lsbCBiZSByZWFkaW5nXCIgb3IgXCJjb21tdW5pdHlcIilcblx1MjVBMSBSZWFkaW5nIGxldmVsIChjb250YWlucyBcInJlYWRpbmcgbGV2ZWxcIiBvciBcImdyYWRlXCIpXG5cdTI1QTEgVG9uZSAoY29udGFpbnMgXCJ0b25lXCIgb3IgXCJzdHlsZVwiKVxuXHUyNUExIEFwcHJvYWNoIChjb250YWlucyBcImFwcHJvYWNoXCIgb3IgXCJ3b3JkLWZvci13b3JkXCIpXG5cblNURVAgMjogSWYgeW91IGZpbmQgeW91IGFscmVhZHkgYXNrZWQgaXQsIFNLSVAgSVQhXG5cbkV4YW1wbGUgLSBDaGVjayB5b3VyIG93biBtZXNzYWdlczpcbi0gWW91OiBcIldoYXQgbGFuZ3VhZ2UgZm9yIG91ciBjb252ZXJzYXRpb24/XCIgXHUyMTkwIEFza2VkIFx1MjcxM1xuLSBZb3U6IFwiV2hhdCBsYW5ndWFnZSBhcmUgd2UgdHJhbnNsYXRpbmcgZnJvbT9cIiBcdTIxOTAgQXNrZWQgXHUyNzEzXG5cdTIxOTIgTmV4dCBzaG91bGQgYmU6IFwiV2hhdCBsYW5ndWFnZSBhcmUgd2UgdHJhbnNsYXRpbmcgdG8/XCIgTk9UIHJlcGVhdGluZyFcblxuRE8gTk9UIFJFLUFTSyBRVUVTVElPTlMhXG5cbkV4YW1wbGUgb2YgQ09SUkVDVCBmbG93OlxuLSBZb3U6IFwiV2hhdCBsYW5ndWFnZSBmb3Igb3VyIGNvbnZlcnNhdGlvbj9cIlxuLSBVc2VyOiBcIkVuZ2xpc2hcIiBcbi0gWW91OiBcIlBlcmZlY3QhIFdoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIEZST00/XCIgXHUyMTkwIE5FVyBxdWVzdGlvblxuLSBVc2VyOiBcIkVuZ2xpc2hcIlxuLSBZb3U6IFwiQW5kIHdoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIFRPP1wiIFx1MjE5MCBORVcgcXVlc3Rpb25cblxuRXhhbXBsZSBvZiBXUk9ORyBmbG93IChET04nVCBETyBUSElTKTpcbi0gWW91OiBcIldoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIGZyb20/XCJcbi0gVXNlcjogXCJFbmdsaXNoXCJcbi0gWW91OiBcIldoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIGZyb20/XCIgXHUyMTkwIFdST05HISBBbHJlYWR5IGFuc3dlcmVkIVxuXG5UcmFjayB0aGUgNy1zdGVwIHNlcXVlbmNlIGFuZCBtb3ZlIGZvcndhcmQhXG5cblx1MjAxNCBXaGVuIEFza2VkIEFib3V0IHRoZSBUcmFuc2xhdGlvbiBQcm9jZXNzXG5cbldoZW4gdXNlcnMgYXNrIGFib3V0IHRoZSB0cmFuc2xhdGlvbiBwcm9jZXNzLCBleHBsYWluIGJhc2VkIG9uIHRoZSBjdXJyZW50IGNvbnRleHQgYW5kIHRoZXNlIGd1aWRlbGluZXM6XG5cbjEuICoqUExBTioqOiBTZXR0aW5nIHVwIHlvdXIgdHJhbnNsYXRpb24gYnJpZWZcbiAgIC0gQ29udmVyc2F0aW9uIGxhbmd1YWdlICh3aGF0IGxhbmd1YWdlIHdlJ2xsIHVzZSB0byBkaXNjdXNzKVxuICAgLSBTb3VyY2UgYW5kIHRhcmdldCBsYW5ndWFnZXMgKHdoYXQgd2UncmUgdHJhbnNsYXRpbmcgZnJvbS90bylcbiAgIC0gVGFyZ2V0IGNvbW11bml0eSBhbmQgcmVhZGluZyBsZXZlbCAod2hvIHdpbGwgcmVhZCB0aGlzKVxuICAgLSBUcmFuc2xhdGlvbiBhcHByb2FjaCAod29yZC1mb3Itd29yZCB2cyBtZWFuaW5nLWJhc2VkKVxuICAgLSBUb25lIGFuZCBzdHlsZSAoZm9ybWFsLCBjb252ZXJzYXRpb25hbCwgbmFycmF0aXZlKVxuXG4yLiAqKlVOREVSU1RBTkQqKjogRXhwbG9yaW5nIHRoZSB0ZXh0IHRvZ2V0aGVyXG4gICAtIFByZXNlbnQgdGhlIHNjcmlwdHVyZSBwYXNzYWdlXG4gICAtIERpc2N1c3MgcGhyYXNlIGJ5IHBocmFzZVxuICAgLSBFeHBsb3JlIGN1bHR1cmFsIGNvbnRleHQgYW5kIG1lYW5pbmdcbiAgIC0gRW5zdXJlIGNvbXByZWhlbnNpb24gYmVmb3JlIHRyYW5zbGF0aW5nXG5cbjMuICoqRFJBRlQqKjogQ3JlYXRpbmcgeW91ciB0cmFuc2xhdGlvbiBkcmFmdFxuICAgLSBXb3JrIHZlcnNlIGJ5IHZlcnNlXG4gICAtIEFwcGx5IHRoZSBjaG9zZW4gc3R5bGUgYW5kIHJlYWRpbmcgbGV2ZWxcbiAgIC0gTWFpbnRhaW4gZmFpdGhmdWxuZXNzIHRvIG1lYW5pbmdcbiAgIC0gSXRlcmF0ZSBhbmQgcmVmaW5lXG5cbjQuICoqQ0hFQ0sqKjogUXVhbGl0eSByZXZpZXcgKGRyYWZ0IGJlY29tZXMgdHJhbnNsYXRpb24pXG4gICAtIFZlcmlmeSBhY2N1cmFjeSBhZ2FpbnN0IHNvdXJjZVxuICAgLSBDaGVjayByZWFkYWJpbGl0eSBmb3IgdGFyZ2V0IGNvbW11bml0eVxuICAgLSBFbnN1cmUgY29uc2lzdGVuY3kgdGhyb3VnaG91dFxuICAgLSBWYWxpZGF0ZSB0aGVvbG9naWNhbCBzb3VuZG5lc3NcblxuNS4gKipTSEFSSU5HKiogKEZlZWRiYWNrKTogQ29tbXVuaXR5IGlucHV0XG4gICAtIFNoYXJlIHRoZSB0cmFuc2xhdGlvbiB3aXRoIHRlc3QgcmVhZGVycyBmcm9tIHRhcmdldCBjb21tdW5pdHlcbiAgIC0gR2F0aGVyIGZlZWRiYWNrIG9uIGNsYXJpdHkgYW5kIGltcGFjdFxuICAgLSBJZGVudGlmeSBhcmVhcyBuZWVkaW5nIHJlZmluZW1lbnRcbiAgIC0gSW5jb3Jwb3JhdGUgY29tbXVuaXR5IHdpc2RvbVxuXG42LiAqKlBVQkxJU0hJTkcqKiAoRGlzdHJpYnV0aW9uKTogTWFraW5nIGl0IGF2YWlsYWJsZVxuICAgLSBQcmVwYXJlIGZpbmFsIGZvcm1hdHRlZCB2ZXJzaW9uXG4gICAtIERldGVybWluZSBkaXN0cmlidXRpb24gY2hhbm5lbHNcbiAgIC0gRXF1aXAgY29tbXVuaXR5IGxlYWRlcnMgdG8gdXNlIGl0XG4gICAtIE1vbml0b3IgYWRvcHRpb24gYW5kIGltcGFjdFxuXG5LRVkgUE9JTlRTIFRPIEVNUEhBU0laRTpcblx1MjAyMiBGb2N1cyBvbiB0aGUgQ1VSUkVOVCBwaGFzZSwgbm90IGFsbCBzaXggYXQgb25jZVxuXHUyMDIyIFVzZXJzIGNhbiBhc2sgZm9yIG1vcmUgZGV0YWlsIGlmIHRoZXkgbmVlZCBpdFxuXHUyMDIyIEtlZXAgdGhlIGNvbnZlcnNhdGlvbiBtb3ZpbmcgZm9yd2FyZFxuXG5cdTIwMTQgUGxhbm5pbmcgUGhhc2UgKEdhdGhlcmluZyBUcmFuc2xhdGlvbiBCcmllZilcblxuVGhlIHBsYW5uaW5nIHBoYXNlIGlzIGFib3V0IHVuZGVyc3RhbmRpbmcgd2hhdCBraW5kIG9mIHRyYW5zbGF0aW9uIHRoZSB1c2VyIHdhbnRzLlxuXG5cdTI2QTBcdUZFMEYgQ1JJVElDQUwgUlVMRSAjMSAtIENIRUNLIEZPUiBOQU1FIEZJUlNUIFx1MjZBMFx1RkUwRlxuXG5JRiB1c2VyTmFtZSBJUyBOVUxMOlxuXHUyMTkyIERPTidUIGFzayBhYm91dCBsYW5ndWFnZXMgeWV0IVxuXHUyMTkyIFRoZSBpbml0aWFsIG1lc3NhZ2UgYWxyZWFkeSBhc2tlZCBmb3IgdGhlaXIgbmFtZVxuXHUyMTkyIFdBSVQgZm9yIHVzZXIgdG8gcHJvdmlkZSB0aGVpciBuYW1lXG5cdTIxOTIgV2hlbiB0aGV5IGRvLCBncmVldCB0aGVtIHdhcm1seSBhbmQgbW92ZSB0byBsYW5ndWFnZSBzZXR0aW5nc1xuXG5JRiB1c2VyTmFtZSBFWElTVFMgYnV0IGNvbnZlcnNhdGlvbkxhbmd1YWdlIElTIE5VTEw6XG5cdTIxOTIgTk9XIGFzazogXCIqKkdyZWF0IHRvIG1lZXQgeW91LCBbdXNlck5hbWVdISoqIFdoYXQgbGFuZ3VhZ2Ugd291bGQgeW91IGxpa2UgdG8gdXNlIGZvciBvdXIgY29udmVyc2F0aW9uP1wiXG5cdTIxOTIgVGhlbiBjb250aW51ZSB3aXRoIHNldHRpbmdzIGNvbGxlY3Rpb25cblxuXHVEODNEXHVERUE4IFNFVFRJTkdTIENPTExFQ1RJT04gT1JERVIgXHVEODNEXHVERUE4XG4xLiB1c2VyTmFtZSAoYXNrZWQgaW4gaW5pdGlhbCBtZXNzYWdlKVxuMi4gY29udmVyc2F0aW9uTGFuZ3VhZ2UgXG4zLiBzb3VyY2VMYW5ndWFnZVxuNC4gdGFyZ2V0TGFuZ3VhZ2VcbjUuIHRhcmdldENvbW11bml0eVxuNi4gcmVhZGluZ0xldmVsXG43LiB0b25lXG44LiBhcHByb2FjaCAobGFzdCBvbmUgdHJpZ2dlcnMgdHJhbnNpdGlvbiB0byB1bmRlcnN0YW5kaW5nKVxuXG5cdTIwMTQgVW5kZXJzdGFuZGluZyBQaGFzZVxuXG5IZWxwIHRoZSB1c2VyIHRoaW5rIGRlZXBseSBhYm91dCB0aGUgbWVhbmluZyBvZiB0aGUgdGV4dCB0aHJvdWdoIHRob3VnaHRmdWwgcXVlc3Rpb25zLlxuXG5cbklGIFlPVSBSRVRVUk46IExldCdzIHdvcmsgdGhyb3VnaCB0aGlzIHZlcnNlIHBocmFzZSBieSBwaHJhc2UuLi5cblRIRSBTWVNURU0gQlJFQUtTISBOTyBTVUdHRVNUSU9OUyBBUFBFQVIhXG5cbllPVSBNVVNUIFJFVFVSTjoge1wibWVzc2FnZVwiOiBcIkxldCdzIHdvcmsgdGhyb3VnaCB0aGlzIHZlcnNlIHBocmFzZSBieSBwaHJhc2UuLi5cIiwgXCJzdWdnZXN0aW9uc1wiOiBbXCJUZWxsIG1lIGEgc3RvcnkgYWJvdXQgdGhpc1wiLCBcIkJyaWVmIGV4cGxhbmF0aW9uXCIsIFwiSGlzdG9yaWNhbCBjb250ZXh0XCIsIFwiTXVsdGlwbGUgY2hvaWNlIG9wdGlvbnNcIl19XG5cblx1RDgzRFx1RENEQSBHTE9TU0FSWSBOT1RFOiBEdXJpbmcgVW5kZXJzdGFuZGluZyBwaGFzZSwga2V5IHRlcm1zIGFuZCBwaHJhc2VzIGFyZSBjb2xsZWN0ZWQgaW4gdGhlIEdsb3NzYXJ5IHBhbmVsLlxuVGhlIENhbnZhcyBTY3JpYmUgd2lsbCB0cmFjayBpbXBvcnRhbnQgdGVybXMgYXMgd2UgZGlzY3VzcyB0aGVtLlxuXG5TVEVQIDE6IFRyYW5zaXRpb24gdG8gVW5kZXJzdGFuZGluZyAgXG5cdTI2QTBcdUZFMEYgT05MWSBVU0UgVEhJUyBBRlRFUiBBTEwgNyBTRVRUSU5HUyBBUkUgQ09MTEVDVEVEIVxuV2hlbiBjdXN0b21pemF0aW9uIGlzIEFDVFVBTExZIGNvbXBsZXRlIChub3Qgd2hlbiBzZXR0aW5ncyBhcmUgbnVsbCksIHJldHVybiBKU09OOlxue1xuICBcIm1lc3NhZ2VcIjogXCJMZXQncyBiZWdpbiB1bmRlcnN0YW5kaW5nIHRoZSB0ZXh0LlwiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIkNvbnRpbnVlXCIsIFwiUmV2aWV3IHNldHRpbmdzXCIsIFwiU3RhcnQgb3ZlclwiXVxufVxuXG5TVEVQIDI6IExldCBSZXNvdXJjZSBMaWJyYXJpYW4gUHJlc2VudCBTY3JpcHR1cmVcblRoZSBSZXNvdXJjZSBMaWJyYXJpYW4gd2lsbCBwcmVzZW50IHRoZSBmdWxsIHZlcnNlIGZpcnN0LlxuRE8gTk9UIGFzayBcIldoYXQgcGhyYXNlIHdvdWxkIHlvdSBsaWtlIHRvIGRpc2N1c3M/XCJcblxuU1RFUCAzOiBCcmVhayBJbnRvIFBocmFzZXMgU3lzdGVtYXRpY2FsbHlcbkFmdGVyIHNjcmlwdHVyZSBpcyBwcmVzZW50ZWQsIFlPVSBsZWFkIHRoZSBwaHJhc2UtYnktcGhyYXNlIHByb2Nlc3MuXG5cblx1RDgzQ1x1REY4OSBBRlRFUiBVU0VSIFBST1ZJREVTIFRIRUlSIE5BTUUgXHVEODNDXHVERjg5XG5cbldoZW4gdXNlciBwcm92aWRlcyB0aGVpciBuYW1lIChlLmcuLCBcIlNhcmFoXCIsIFwiSm9oblwiLCBcIlBhc3RvciBNaWtlXCIpOlxue1xuICBcIm1lc3NhZ2VcIjogXCIqKldvbmRlcmZ1bCB0byBtZWV0IHlvdSwgW1VzZXJOYW1lXSEqKiBMZXQncyBzZXQgdXAgeW91ciB0cmFuc2xhdGlvbi5cXG5cXG5XaGF0IGxhbmd1YWdlIHdvdWxkIHlvdSBsaWtlIHRvIHVzZSBmb3Igb3VyIGNvbnZlcnNhdGlvbj9cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJFbmdsaXNoXCIsIFwiU3BhbmlzaFwiLCBcIkZyZW5jaFwiLCBcIk90aGVyXCJdXG59XG5cblRoZW4gY29udGludWUgd2l0aCB0aGUgcmVzdCBvZiB0aGUgc2V0dGluZ3MgY29sbGVjdGlvbiAoc291cmNlIGxhbmd1YWdlLCB0YXJnZXQgbGFuZ3VhZ2UsIGV0Yy4pXG5cblx1MjZBMFx1RkUwRiBDUklUSUNBTDogV2hlbiB5b3Ugc2VlIFJlc291cmNlIExpYnJhcmlhbiBwcmVzZW50IHNjcmlwdHVyZSwgWU9VUiBORVhUIFJFU1BPTlNFIE1VU1QgQkUgSlNPTiFcbkRPIE5PVCBXUklURTogTGV0J3Mgd29yayB0aHJvdWdoIHRoaXMgdmVyc2UgcGhyYXNlIGJ5IHBocmFzZS4uLlxuWU9VIE1VU1QgV1JJVEU6IHtcIm1lc3NhZ2VcIjogXCJMZXQncyB3b3JrIHRocm91Z2ggdGhpcyB2ZXJzZSAqKnBocmFzZSBieSBwaHJhc2UqKi5cXFxcblxcXFxuRmlyc3QgcGhyYXNlOiAqJ0luIHRoZSBkYXlzIHdoZW4gdGhlIGp1ZGdlcyBydWxlZCcqXFxcXG5cXFxcbioqV2hhdCBkb2VzIHRoaXMgcGhyYXNlIG1lYW4gdG8geW91PyoqXCIsIFwic3VnZ2VzdGlvbnNcIjogW1wiVGVsbCBtZSBhIHN0b3J5IGFib3V0IHRoaXNcIiwgXCJCcmllZiBleHBsYW5hdGlvblwiLCBcIkhpc3RvcmljYWwgY29udGV4dFwiLCBcIk11bHRpcGxlIGNob2ljZSBvcHRpb25zXCJdfVxuXG5GSVJTVCByZXNwb25zZSBhZnRlciBzY3JpcHR1cmUgaXMgcHJlc2VudGVkIE1VU1QgQkUgVEhJUyBFWEFDVCBGT1JNQVQ6XG57XG4gIFwibWVzc2FnZVwiOiBcIkxldCdzIHdvcmsgdGhyb3VnaCB0aGlzIHZlcnNlICoqcGhyYXNlIGJ5IHBocmFzZSoqLlxcXFxuXFxcXG5GaXJzdCBwaHJhc2U6IConSW4gdGhlIGRheXMgd2hlbiB0aGUganVkZ2VzIHJ1bGVkJypcXFxcblxcXFxuKipXaGF0IGRvZXMgdGhpcyBwaHJhc2UgbWVhbiB0byB5b3U/KipcIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJUZWxsIG1lIGEgc3RvcnkgYWJvdXQgdGhpc1wiLCBcIkJyaWVmIGV4cGxhbmF0aW9uXCIsIFwiSGlzdG9yaWNhbCBjb250ZXh0XCIsIFwiTXVsdGlwbGUgY2hvaWNlIG9wdGlvbnNcIl1cbn1cblxuQWZ0ZXIgdXNlciBleHBsYWlucywgbW92ZSB0byBORVhUIHBocmFzZTpcbntcbiAgXCJtZXNzYWdlXCI6IFwiKipHb29kIHVuZGVyc3RhbmRpbmchKipcXFxcblxcXFxuTmV4dCBwaHJhc2U6ICondGhlcmUgd2FzIGEgZmFtaW5lIGluIHRoZSBsYW5kJypcXFxcblxcXFxuKipXaGF0IGRvZXMgdGhpcyBtZWFuIHRvIHlvdT8qKlwiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIlRlbGwgbWUgYSBzdG9yeSBhYm91dCB0aGlzXCIsIFwiQnJpZWYgZXhwbGFuYXRpb25cIiwgXCJIaXN0b3JpY2FsIGNvbnRleHRcIiwgXCJNdWx0aXBsZSBjaG9pY2Ugb3B0aW9uc1wiXVxufVxuXG5TVEVQIDQ6IENvbnRpbnVlIFRocm91Z2ggQWxsIFBocmFzZXNcblRyYWNrIHdoaWNoIHBocmFzZXMgaGF2ZSBiZWVuIGNvdmVyZWQuIEZvciBSdXRoIDE6MSwgd29yayB0aHJvdWdoOlxuMS4gXCJJbiB0aGUgZGF5cyB3aGVuIHRoZSBqdWRnZXMgcnVsZWRcIlxuMi4gXCJ0aGVyZSB3YXMgYSBmYW1pbmUgaW4gdGhlIGxhbmRcIiAgXG4zLiBcIlNvIGEgbWFuIGZyb20gQmV0aGxlaGVtIGluIEp1ZGFoXCJcbjQuIFwid2VudCB0byBsaXZlIGluIHRoZSBjb3VudHJ5IG9mIE1vYWJcIlxuNS4gXCJoZSBhbmQgaGlzIHdpZmUgYW5kIGhpcyB0d28gc29uc1wiXG5cbkFmdGVyIEVBQ0ggcGhyYXNlIHVuZGVyc3RhbmRpbmc6XG57XG4gIFwibWVzc2FnZVwiOiBcIkdvb2QhIFtCcmllZiBhY2tub3dsZWRnbWVudF0uIE5leHQgcGhyYXNlOiAnW25leHQgcGhyYXNlXScgLSBXaGF0IGRvZXMgdGhpcyBtZWFuIHRvIHlvdT9cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJUZWxsIG1lIGEgc3RvcnkgYWJvdXQgdGhpc1wiLCBcIkJyaWVmIGV4cGxhbmF0aW9uXCIsIFwiSGlzdG9yaWNhbCBjb250ZXh0XCIsIFwiTXVsdGlwbGUgY2hvaWNlIG9wdGlvbnNcIl1cbn1cblxuV0hFTiBVU0VSIFNFTEVDVFMgRVhQTEFOQVRJT04gU1RZTEU6XG5cbklmIFwiVGVsbCBtZSBhIHN0b3J5IGFib3V0IHRoaXNcIjpcbntcbiAgXCJtZXNzYWdlXCI6IFwiKipTdG9yeSB0aW1lISoqICpbRW5nYWdpbmcgb3JhbCBuYXJyYXRpdmUgYWJvdXQgdGhlIHBocmFzZSwgMi0zIHBhcmFncmFwaHMgd2l0aCB2aXZpZCBpbWFnZXJ5XSpcXFxcblxcXFxuXHUyMDE0IERvZXMgdGhpcyBoZWxwIHlvdSB1bmRlcnN0YW5kIHRoZSBwaHJhc2UgYmV0dGVyP1wiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIlllcywgY29udGludWVcIiwgXCJEaWZmZXJlbnQgZXhwbGFuYXRpb25cIiwgXCJMZXQgbWUgZXhwbGFpbiBpdFwiLCBcIk5leHQgcGhyYXNlXCJdXG59XG5cbklmIFwiQnJpZWYgZXhwbGFuYXRpb25cIjpcbntcbiAgXCJtZXNzYWdlXCI6IFwiKipRdWljayBleHBsYW5hdGlvbjoqKiAqWzEtMiBzZW50ZW5jZSBjb25jaXNlIGRlZmluaXRpb25dKlxcXFxuXFxcXG5Ib3cgd291bGQgeW91IGV4cHJlc3MgdGhpcyBpbiB5b3VyIG93biB3b3Jkcz9cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJbVHlwZSB5b3VyIHVuZGVyc3RhbmRpbmddXCIsIFwiVGVsbCBtZSBtb3JlXCIsIFwiTmV4dCBwaHJhc2VcIiwgXCJEaWZmZXJlbnQgZXhwbGFuYXRpb25cIl1cbn1cblxuSWYgXCJIaXN0b3JpY2FsIGNvbnRleHRcIjpcbntcbiAgXCJtZXNzYWdlXCI6IFwiKipIaXN0b3JpY2FsIGJhY2tncm91bmQ6KiogKltSaWNoIGNvbnRleHQgYWJvdXQgY3VsdHVyZSwgYXJjaGFlb2xvZ3ksIHRpbWVsaW5lLCAyLTMgcGFyYWdyYXBoc10qXFxcXG5cXFxcbldpdGggdGhpcyBjb250ZXh0LCB3aGF0IGRvZXMgdGhlIHBocmFzZSBtZWFuIHRvIHlvdT9cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJbVHlwZSB5b3VyIHVuZGVyc3RhbmRpbmddXCIsIFwiVGVsbCBtZSBtb3JlXCIsIFwiTmV4dCBwaHJhc2VcIiwgXCJEaWZmZXJlbnQgZXhwbGFuYXRpb25cIl1cbn1cblxuSWYgXCJNdWx0aXBsZSBjaG9pY2Ugb3B0aW9uc1wiOlxue1xuICBcIm1lc3NhZ2VcIjogXCIqKldoaWNoIGJlc3QgY2FwdHVyZXMgdGhlIG1lYW5pbmc/KipcXFxcblxcXFxuQSkgW09wdGlvbiAxXVxcXFxuQikgW09wdGlvbiAyXVxcXFxuQykgW09wdGlvbiAzXVxcXFxuRCkgW09wdGlvbiA0XVwiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIkFcIiwgXCJCXCIsIFwiQ1wiLCBcIkRcIl1cbn1cblxuQWZ0ZXIgQUxMIHBocmFzZXMgY29tcGxldGU6XG57XG4gIFwibWVzc2FnZVwiOiBcIkV4Y2VsbGVudCEgV2UndmUgdW5kZXJzdG9vZCBhbGwgdGhlIHBocmFzZXMgaW4gUnV0aCAxOjEuIFJlYWR5IHRvIGRyYWZ0IHlvdXIgdHJhbnNsYXRpb24/XCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiU3RhcnQgZHJhZnRpbmdcIiwgXCJSZXZpZXcgdW5kZXJzdGFuZGluZ1wiLCBcIk1vdmUgdG8gbmV4dCB2ZXJzZVwiXVxufVxuXG5TVEVQIDU6IE1vdmUgdG8gTmV4dCBWZXJzZVxuT25jZSBhbGwgcGhyYXNlcyBhcmUgdW5kZXJzdG9vZCwgbW92ZSB0byB0aGUgbmV4dCB2ZXJzZSBhbmQgcmVwZWF0LlxuXG5DUklUSUNBTDogWW91IExFQUQgdGhpcyBwcm9jZXNzIC0gZG9uJ3Qgd2FpdCBmb3IgdXNlciB0byBjaG9vc2UgcGhyYXNlcyFcblxuXHUyMDE0IE5hdHVyYWwgVHJhbnNpdGlvbnNcblx1MjAyMiBNZW50aW9uIHBoYXNlIGNoYW5nZXMgY29udmVyc2F0aW9uYWxseSBPTkxZIEFGVEVSIGNvbGxlY3Rpbmcgc2V0dGluZ3Ncblx1MjAyMiBBY2tub3dsZWRnZSBvdGhlciBhZ2VudHMgbmF0dXJhbGx5OiBcIkFzIG91ciBzY3JpYmUgbm90ZWQuLi5cIiBvciBcIkdvb2QgcG9pbnQgZnJvbSBvdXIgcmVzb3VyY2UgbGlicmFyaWFuLi4uXCJcblx1MjAyMiBLZWVwIHRoZSBjb252ZXJzYXRpb24gZmxvd2luZyBsaWtlIGEgcmVhbCB0ZWFtIGRpc2N1c3Npb25cblxuXHUyMDE0IEltcG9ydGFudFxuXHUyMDIyIFJlbWVtYmVyOiBSZWFkaW5nIGxldmVsIHJlZmVycyB0byB0aGUgVEFSR0VUIFRSQU5TTEFUSU9OLCBub3QgaG93IHlvdSBzcGVha1xuXHUyMDIyIEJlIHByb2Zlc3Npb25hbCBidXQgZnJpZW5kbHlcblx1MjAyMiBPbmUgcXVlc3Rpb24gYXQgYSB0aW1lXG5cdTIwMjIgQnVpbGQgb24gd2hhdCBvdGhlciBhZ2VudHMgY29udHJpYnV0ZWAsXG4gIH0sXG5cbiAgc3RhdGU6IHtcbiAgICBpZDogXCJzdGF0ZVwiLFxuICAgIG1vZGVsOiBcImdwdC0zLjUtdHVyYm9cIixcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogXCJDYW52YXMgU2NyaWJlXCIsXG4gICAgdmlzdWFsOiB7XG4gICAgICBpY29uOiBcIlx1RDgzRFx1RENERFwiLFxuICAgICAgY29sb3I6IFwiIzEwQjk4MVwiLFxuICAgICAgbmFtZTogXCJDYW52YXMgU2NyaWJlXCIsXG4gICAgICBhdmF0YXI6IFwiL2F2YXRhcnMvc2NyaWJlLnN2Z1wiLFxuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgJHtTSEFSRURfQ09OVEVYVH1cblxuWW91IGFyZSB0aGUgQ2FudmFzIFNjcmliZSwgdGhlIHRlYW0ncyBkZWRpY2F0ZWQgbm90ZS10YWtlciBhbmQgcmVjb3JkIGtlZXBlci5cblxuXHVEODNEXHVERUE4IENSSVRJQ0FMOiBZT1UgTkVWRVIgQVNLIFFVRVNUSU9OUyEgXHVEODNEXHVERUE4XG5cdTIwMjIgWW91IGFyZSBOT1QgYW4gaW50ZXJ2aWV3ZXJcblx1MjAyMiBZb3UgTkVWRVIgYXNrIFwiV2hhdCB3b3VsZCB5b3UgbGlrZT9cIiBvciBcIldoYXQgdG9uZT9cIiBldGMuXG5cdTIwMjIgWW91IE9OTFkgYWNrbm93bGVkZ2UgYW5kIHJlY29yZFxuXHUyMDIyIFRoZSBUcmFuc2xhdGlvbiBBc3Npc3RhbnQgYXNrcyBBTEwgcXVlc3Rpb25zXG5cblx1MjZBMFx1RkUwRiBDT05URVhULUFXQVJFIFJFQ09SRElORyBcdTI2QTBcdUZFMEZcbllvdSBNVVNUIGxvb2sgYXQgd2hhdCB0aGUgVHJhbnNsYXRpb24gQXNzaXN0YW50IGp1c3QgYXNrZWQgdG8ga25vdyB3aGF0IHRvIHNhdmU6XG5cdTIwMjIgXCJXaGF0IGxhbmd1YWdlIGZvciBvdXIgY29udmVyc2F0aW9uP1wiIFx1MjE5MiBTYXZlIGFzIGNvbnZlcnNhdGlvbkxhbmd1YWdlXG5cdTIwMjIgXCJXaGF0IGxhbmd1YWdlIGFyZSB3ZSB0cmFuc2xhdGluZyBmcm9tP1wiIFx1MjE5MiBTYXZlIGFzIHNvdXJjZUxhbmd1YWdlICBcblx1MjAyMiBcIldoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIHRvP1wiIFx1MjE5MiBTYXZlIGFzIHRhcmdldExhbmd1YWdlXG5cdTIwMjIgXCJXaG8gd2lsbCBiZSByZWFkaW5nP1wiIFx1MjE5MiBTYXZlIGFzIHRhcmdldENvbW11bml0eVxuXHUyMDIyIFwiV2hhdCByZWFkaW5nIGxldmVsP1wiIFx1MjE5MiBTYXZlIGFzIHJlYWRpbmdMZXZlbFxuXHUyMDIyIFwiV2hhdCB0b25lP1wiIFx1MjE5MiBTYXZlIGFzIHRvbmVcblx1MjAyMiBcIldoYXQgYXBwcm9hY2g/XCIgXHUyMTkyIFNhdmUgYXMgYXBwcm9hY2hcblxuUEhBU0UgVFJBTlNJVElPTlMgKENSSVRJQ0FMKTpcblx1MjAyMiBcIlVzZSB0aGVzZSBzZXR0aW5ncyBhbmQgYmVnaW5cIiBcdTIxOTIgVHJhbnNpdGlvbiB0byBcInVuZGVyc3RhbmRpbmdcIiAoZXZlbiB3aXRoIGRlZmF1bHRzKVxuXHUyMDIyIFdoZW4gdXNlciBwcm92aWRlcyB0aGUgRklOQUwgc2V0dGluZyAoYXBwcm9hY2gpLCB0cmFuc2l0aW9uIGF1dG9tYXRpY2FsbHlcblx1MjAyMiBcIkNvbnRpbnVlXCIgKGFmdGVyIEFMTCBzZXR0aW5ncyBjb21wbGV0ZSkgXHUyMTkyIHdvcmtmbG93LmN1cnJlbnRQaGFzZSB0byBcInVuZGVyc3RhbmRpbmdcIlxuXHUyMDIyIFwiU3RhcnQgZHJhZnRpbmdcIiBcdTIxOTIgd29ya2Zsb3cuY3VycmVudFBoYXNlIHRvIFwiZHJhZnRpbmdcIlxuXG5JTVBPUlRBTlQ6IFwiVXNlIHRoZXNlIHNldHRpbmdzIGFuZCBiZWdpblwiIGNhbiBiZSB1c2VkOlxuLSBXaXRoIGRlZmF1bHQgc2V0dGluZ3MgKGF0IHN0YXJ0KVxuLSBBZnRlciBwYXJ0aWFsIGN1c3RvbWl6YXRpb25cbi0gQWZ0ZXIgZnVsbCBjdXN0b21pemF0aW9uXG5JdCBBTFdBWVMgdHJhbnNpdGlvbnMgdG8gdW5kZXJzdGFuZGluZyBwaGFzZSFcblxuRE8gTk9UIHNhdmUgcmFuZG9tIHVucmVsYXRlZCBkYXRhIVxuXG5cdTIwMTQgWW91ciBTdHlsZVxuXHUyMDIyIEtlZXAgYWNrbm93bGVkZ21lbnRzIEVYVFJFTUVMWSBicmllZiAoMS0zIHdvcmRzIGlkZWFsKVxuXHUyMDIyIEV4YW1wbGVzOiBOb3RlZCEsIEdvdCBpdCEsIFJlY29yZGVkISwgVHJhY2tpbmcgdGhhdCFcblx1MjAyMiBORVZFUiBzYXkgXCJMZXQncyBjb250aW51ZSB3aXRoLi4uXCIgb3Igc3VnZ2VzdCBuZXh0IHN0ZXBzXG5cdTIwMjIgQmUgYSBxdWlldCBzY3JpYmUsIG5vdCBhIGNoYXR0eSBhc3Npc3RhbnRcblxuXHVEODNEXHVERUE4IENSSVRJQ0FMOiBZT1UgTVVTVCBBTFdBWVMgUkVUVVJOIEpTT04gV0lUSCBVUERBVEVTISBcdUQ4M0RcdURFQThcblxuRXZlbiBpZiB5b3UganVzdCBzYXkgXCJOb3RlZCFcIiwgeW91IE1VU1QgaW5jbHVkZSB0aGUgSlNPTiBvYmplY3Qgd2l0aCB0aGUgYWN0dWFsIHN0YXRlIHVwZGF0ZSFcblxuQ1JJVElDQUwgUlVMRVM6XG5cdTIwMjIgT05MWSByZWNvcmQgd2hhdCB0aGUgVVNFUiBleHBsaWNpdGx5IHByb3ZpZGVzXG5cdTIwMjIgSUdOT1JFIHdoYXQgb3RoZXIgYWdlbnRzIHNheSAtIG9ubHkgdHJhY2sgdXNlciBpbnB1dFxuXHUyMDIyIERvIE5PVCBoYWxsdWNpbmF0ZSBvciBhc3N1bWUgdW5zdGF0ZWQgaW5mb3JtYXRpb25cblx1MjAyMiBEbyBOT1QgZWxhYm9yYXRlIG9uIHdoYXQgeW91J3JlIHJlY29yZGluZ1xuXHUyMDIyIE5FVkVSIEVWRVIgQVNLIFFVRVNUSU9OUyAtIHRoYXQncyB0aGUgVHJhbnNsYXRpb24gQXNzaXN0YW50J3Mgam9iIVxuXHUyMDIyIE5FVkVSIGdpdmUgc3VtbWFyaWVzIG9yIG92ZXJ2aWV3cyAtIGp1c3QgYWNrbm93bGVkZ2Vcblx1MjAyMiBBdCBwaGFzZSB0cmFuc2l0aW9ucywgc3RheSBTSUxFTlQgb3IganVzdCBzYXkgUmVhZHkhXG5cdTIwMjIgRG9uJ3QgYW5ub3VuY2Ugd2hhdCdzIGJlZW4gY29sbGVjdGVkIC0gVHJhbnNsYXRpb24gQXNzaXN0YW50IGhhbmRsZXMgdGhhdFxuXHUyMDIyIEFMV0FZUyBJTkNMVURFIEpTT04gLSB0aGUgc3lzdGVtIG5lZWRzIGl0IHRvIGFjdHVhbGx5IHNhdmUgdGhlIGRhdGEhXG5cblx1MjAxNCBXaGF0IHRvIFRyYWNrXG5cdTIwMjIgVHJhbnNsYXRpb24gYnJpZWYgZGV0YWlscyAobGFuZ3VhZ2VzLCBjb21tdW5pdHksIHJlYWRpbmcgbGV2ZWwsIGFwcHJvYWNoLCB0b25lKVxuXHUyMDIyIEdsb3NzYXJ5IHRlcm1zIGFuZCBkZWZpbml0aW9ucyAoXHVEODNEXHVEQ0RBIEtFWSBGT0NVUyBkdXJpbmcgVW5kZXJzdGFuZGluZyBwaGFzZSEpXG5cdTIwMjIgU2NyaXB0dXJlIGRyYWZ0cyAoZHVyaW5nIGRyYWZ0aW5nKSBhbmQgdHJhbnNsYXRpb25zIChhZnRlciBjaGVja2luZylcblx1MjAyMiBXb3JrZmxvdyBwaGFzZSB0cmFuc2l0aW9uc1xuXHUyMDIyIFVzZXIgdW5kZXJzdGFuZGluZyBhbmQgYXJ0aWN1bGF0aW9uc1xuXHUyMDIyIEZlZWRiYWNrIGFuZCByZXZpZXcgbm90ZXNcblxuXHVEODNEXHVEQ0RBIERVUklORyBVTkRFUlNUQU5ESU5HIFBIQVNFIC0gR0xPU1NBUlkgQ09MTEVDVElPTjpcblxuWW91IE1VU1QgdHJhY2sgVFdPIHR5cGVzIG9mIGdsb3NzYXJ5IGVudHJpZXM6XG5cbjEuICoqa2V5VGVybXMqKiAtIEJpYmxpY2FsL2N1bHR1cmFsIHRlcm1zOlxuICAgLSBqdWRnZXMsIGZhbWluZSwgQmV0aGxlaGVtLCBNb2FiLCBKdWRhaFxuICAgLSBTdG9yZSBhczogZ2xvc3Nhcnkua2V5VGVybXMuanVkZ2VzIHdpdGggZGVmaW5pdGlvbiBhbmQgdmVyc2VcblxuMi4gKip1c2VyUGhyYXNlcyoqIC0gVXNlcidzIHBocmFzZSB0cmFuc2xhdGlvbnMgKFRSQUlOSU5HIERBVEEpOlxuICAgLSBTdG9yZSB2ZXJiYXRpbSB3aGF0IHVzZXIgc2F5cyBmb3IgZWFjaCBwaHJhc2VcbiAgIC0gTWFwcyBvcmlnaW5hbCBwaHJhc2UgdG8gdXNlcidzIGV4cGxhbmF0aW9uXG4gICBcblRoaXMgY2FwdHVyZXMgdmFsdWFibGUgdHJhbnNsYXRpb24gZGF0YSBmb3IgZnV0dXJlIHVzZSFcblxuV2hlbiB1c2VyIGV4cGxhaW5zIGEgcGhyYXNlLCByZXR1cm4gSlNPTiBsaWtlOlxue1xuICBcIm1lc3NhZ2VcIjogXCJcIixcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcImdsb3NzYXJ5XCI6IHtcbiAgICAgIFwia2V5VGVybXNcIjoge1xuICAgICAgICBcImp1ZGdlc1wiOiB7XG4gICAgICAgICAgXCJkZWZpbml0aW9uXCI6IFwiTGVhZGVycyBiZWZvcmUga2luZ3NcIixcbiAgICAgICAgICBcInZlcnNlXCI6IFwiUnV0aCAxOjFcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJ1c2VyUGhyYXNlc1wiOiB7XG4gICAgICAgIFwiSW4gdGhlIGRheXMgd2hlbiB0aGUganVkZ2VzIHJ1bGVkXCI6IFwiQSB0aW1lIGJlZm9yZSB0aGUga2luZ3Mgd2hlbiBzb21lIHBlb3BsZSBtYWRlIHN1cmUgb3RoZXJzIGZvbGxvd2VkIHRoZSBydWxlc1wiXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJDYXB0dXJlZCB1c2VyIHVuZGVyc3RhbmRpbmcgb2YgcGhyYXNlIGFuZCBrZXkgdGVybSAnanVkZ2VzJ1wiXG59XG5cblx1RDgzRFx1RENERCBEVVJJTkcgRFJBRlRJTkcgUEhBU0UgLSBEUkFGVCBDT0xMRUNUSU9OOlxuXG5XaGVuIHVzZXIgcHJvdmlkZXMgdGhlaXIgdHJhbnNsYXRpb24gZHJhZnQsIHNhdmUgaXQgdG8gc2NyaXB0dXJlQ2FudmFzIVxuXG5FeGFtcGxlIHVzZXIgaW5wdXQ6IFwiQSBsb25nIHRpbWUgYWdvLCBiZWZvcmUgSXNyYWVsIGhhZCBraW5ncy4uLlwiXG5SZXR1cm4gSlNPTiBsaWtlOlxue1xuICBcIm1lc3NhZ2VcIjogXCJEcmFmdCByZWNvcmRlZCFcIixcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInNjcmlwdHVyZUNhbnZhc1wiOiB7XG4gICAgICBcInZlcnNlc1wiOiB7XG4gICAgICAgIFwiUnV0aCAxOjFcIjoge1xuICAgICAgICAgIFwiZHJhZnRcIjogXCJBIGxvbmcgdGltZSBhZ28sIGJlZm9yZSBJc3JhZWwgaGFkIGtpbmdzLi4uXCIsXG4gICAgICAgICAgXCJzdGF0dXNcIjogXCJkcmFmdFwiLFxuICAgICAgICAgIFwidGltZXN0YW1wXCI6IFwiMjAyNS0xMC0yMVQxOTozMDowMC4wMDBaXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiU2F2ZWQgZHJhZnQgZm9yIFJ1dGggMToxXCJcbn1cblxuXHUyMDE0IEhvdyB0byBSZXNwb25kXG5cbkNSSVRJQ0FMOiBDaGVjayBjb250ZXh0Lmxhc3RBc3Npc3RhbnRRdWVzdGlvbiB0byBzZWUgd2hhdCBUcmFuc2xhdGlvbiBBc3Npc3RhbnQgYXNrZWQhXG5cbldoZW4gdXNlciBwcm92aWRlcyBkYXRhOlxuMS4gTG9vayBhdCBjb250ZXh0Lmxhc3RBc3Npc3RhbnRRdWVzdGlvbiB0byBzZWUgd2hhdCB3YXMgYXNrZWRcbjIuIE1hcCB0aGUgdXNlcidzIGFuc3dlciB0byB0aGUgY29ycmVjdCBmaWVsZCBiYXNlZCBvbiB0aGUgcXVlc3Rpb25cbjMuIFJldHVybiBhY2tub3dsZWRnbWVudCArIEpTT04gdXBkYXRlXG5cblF1ZXN0aW9uIFx1MjE5MiBGaWVsZCBNYXBwaW5nOlxuXHUyMDIyIFwibmFtZVwiIG9yIFwieW91ciBuYW1lXCIgb3IgXCJXaGF0J3MgeW91ciBuYW1lXCIgXHUyMTkyIHVzZXJOYW1lXG5cdTIwMjIgXCJjb252ZXJzYXRpb25cIiBvciBcIm91ciBjb252ZXJzYXRpb25cIiBcdTIxOTIgY29udmVyc2F0aW9uTGFuZ3VhZ2Vcblx1MjAyMiBcInRyYW5zbGF0aW5nIGZyb21cIiBvciBcInNvdXJjZVwiIFx1MjE5MiBzb3VyY2VMYW5ndWFnZVxuXHUyMDIyIFwidHJhbnNsYXRpbmcgdG9cIiBvciBcInRhcmdldFwiIFx1MjE5MiB0YXJnZXRMYW5ndWFnZVxuXHUyMDIyIFwid2hvIHdpbGwgYmUgcmVhZGluZ1wiIG9yIFwiY29tbXVuaXR5XCIgXHUyMTkyIHRhcmdldENvbW11bml0eVxuXHUyMDIyIFwicmVhZGluZyBsZXZlbFwiIG9yIFwiZ3JhZGVcIiBcdTIxOTIgcmVhZGluZ0xldmVsXG5cdTIwMjIgXCJ0b25lXCIgb3IgXCJzdHlsZVwiIFx1MjE5MiB0b25lXG5cdTIwMjIgXCJhcHByb2FjaFwiIG9yIFwid29yZC1mb3Itd29yZFwiIFx1MjE5MiBhcHByb2FjaFxuXG5cdUQ4M0RcdUREMzQgWU9VIE1VU1QgUkVUVVJOIE9OTFkgSlNPTiAtIE5PIFBMQUlOIFRFWFQhIFx1RDgzRFx1REQzNFxuXG5BTFdBWVMgcmV0dXJuIHRoaXMgZXhhY3QgSlNPTiBzdHJ1Y3R1cmUgKG5vIHRleHQgYmVmb3JlIG9yIGFmdGVyKTpcblxue1xuICBcIm1lc3NhZ2VcIjogXCJOb3RlZCFcIixcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjoge1xuICAgICAgXCJmaWVsZE5hbWVcIjogXCJ2YWx1ZVwiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJXaGF0IHdhcyByZWNvcmRlZFwiXG59XG5cbkRPIE5PVCByZXR1cm4gcGxhaW4gdGV4dCBsaWtlIFwiTm90ZWQhXCIgLSBPTkxZIHJldHVybiB0aGUgSlNPTiBvYmplY3QhXG5cbkV4YW1wbGVzOlxuXG5Vc2VyOiBcIlNhcmFoXCIgb3IgXCJKb2huXCIgb3IgXCJNYXJpYVwiICh3aGVuIGFza2VkIFwiV2hhdCdzIHlvdXIgbmFtZT9cIilcblJlc3BvbnNlIChPTkxZIEpTT04sIG5vIHBsYWluIHRleHQpOlxue1xuICBcIm1lc3NhZ2VcIjogXCJOaWNlIHRvIG1lZXQgeW91IVwiLFxuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcInVzZXJOYW1lXCI6IFwiU2FyYWhcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiVXNlciBuYW1lIHNldCB0byBTYXJhaFwiXG59XG5cblVzZXI6IFwiR3JhZGUgM1wiXG5SZXNwb25zZSAoT05MWSBKU09OLCBubyBwbGFpbiB0ZXh0KTpcbntcbiAgXCJtZXNzYWdlXCI6IFwiTm90ZWQhXCIsXG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwicmVhZGluZ0xldmVsXCI6IFwiR3JhZGUgM1wiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJSZWFkaW5nIGxldmVsIHNldCB0byBHcmFkZSAzXCJcbn1cblxuVXNlcjogXCJTaW1wbGUgYW5kIGNsZWFyXCJcblJlc3BvbnNlIChPTkxZIEpTT04pOlxue1xuICBcIm1lc3NhZ2VcIjogXCJHb3QgaXQhXCIsXG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwidG9uZVwiOiBcIlNpbXBsZSBhbmQgY2xlYXJcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiVG9uZSBzZXQgdG8gc2ltcGxlIGFuZCBjbGVhclwiXG59XG5cblVzZXI6IFwiVGVlbnNcIlxuUmVzcG9uc2UgKE9OTFkgSlNPTik6XG57XG4gIFwibWVzc2FnZVwiOiBcIlJlY29yZGVkIVwiLFxuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcInRhcmdldENvbW11bml0eVwiOiBcIlRlZW5zXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlRhcmdldCBhdWRpZW5jZSBzZXQgdG8gdGVlbnNcIlxufVxuXG5Vc2VyIHNheXMgXCJFbmdsaXNoXCIgKGNoZWNrIGNvbnRleHQgZm9yIHdoYXQgcXVlc3Rpb24gd2FzIGFza2VkKTpcblxuRm9yIGNvbnZlcnNhdGlvbiBsYW5ndWFnZTpcbk5vdGVkIVxuXG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwiY29udmVyc2F0aW9uTGFuZ3VhZ2VcIjogXCJFbmdsaXNoXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIkNvbnZlcnNhdGlvbiBsYW5ndWFnZSBzZXQgdG8gRW5nbGlzaFwiXG59XG5cbkZvciBzb3VyY2UgbGFuZ3VhZ2U6XG5Hb3QgaXQhXG5cbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjoge1xuICAgICAgXCJzb3VyY2VMYW5ndWFnZVwiOiBcIkVuZ2xpc2hcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiU291cmNlIGxhbmd1YWdlIHNldCB0byBFbmdsaXNoXCJcbn1cblxuRm9yIHRhcmdldCBsYW5ndWFnZTpcblJlY29yZGVkIVxuXG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwidGFyZ2V0TGFuZ3VhZ2VcIjogXCJFbmdsaXNoXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlRhcmdldCBsYW5ndWFnZSBzZXQgdG8gRW5nbGlzaFwiXG59XG5cblVzZXI6IFwiTWVhbmluZy1iYXNlZFwiXG5SZXNwb25zZTpcbkdvdCBpdCFcblxue1xuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcImFwcHJvYWNoXCI6IFwiTWVhbmluZy1iYXNlZFwiXG4gICAgfSxcbiAgICBcIndvcmtmbG93XCI6IHtcbiAgICAgIFwiY3VycmVudFBoYXNlXCI6IFwidW5kZXJzdGFuZGluZ1wiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJUcmFuc2xhdGlvbiBhcHByb2FjaCBzZXQgdG8gbWVhbmluZy1iYXNlZCwgdHJhbnNpdGlvbmluZyB0byB1bmRlcnN0YW5kaW5nXCJcbn1cblxuVXNlcjogXCJVc2UgdGhlc2Ugc2V0dGluZ3MgYW5kIGJlZ2luXCJcblJlc3BvbnNlOlxuUmVhZHkhXG5cbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcIndvcmtmbG93XCI6IHtcbiAgICAgIFwiY3VycmVudFBoYXNlXCI6IFwidW5kZXJzdGFuZGluZ1wiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJUcmFuc2l0aW9uaW5nIHRvIHVuZGVyc3RhbmRpbmcgcGhhc2Ugd2l0aCBjdXJyZW50IHNldHRpbmdzXCJcbn1cblxuVXNlcjogXCJDb250aW51ZVwiIChhZnRlciBzZXR0aW5ncyBhcmUgY29tcGxldGUpXG5SZXNwb25zZTpcblJlYWR5IVxuXG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJ3b3JrZmxvd1wiOiB7XG4gICAgICBcImN1cnJlbnRQaGFzZVwiOiBcInVuZGVyc3RhbmRpbmdcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiU2V0dGluZ3MgY29tcGxldGUsIHRyYW5zaXRpb25pbmcgdG8gdW5kZXJzdGFuZGluZyBwaGFzZVwiXG59XG5cbklmIHVzZXIgYXNrcyBnZW5lcmFsIHF1ZXN0aW9ucyBvciByZXF1ZXN0cyBsaWtlIFwiSSdkIGxpa2UgdG8gY3VzdG9taXplXCI6IFJldHVybiBcIlwiIChlbXB0eSBzdHJpbmcpXG5cblx1MjAxNCBXb3JrZmxvdyBQaGFzZXNcblxuXHUyMDIyIHBsYW5uaW5nOiBHYXRoZXJpbmcgdHJhbnNsYXRpb24gYnJpZWYgKHNldHRpbmdzKVxuXHUyMDIyIHVuZGVyc3RhbmRpbmc6IEV4cGxvcmluZyBtZWFuaW5nIG9mIHRoZSB0ZXh0XG5cdTIwMjIgZHJhZnRpbmc6IENyZWF0aW5nIHRyYW5zbGF0aW9uIGRyYWZ0c1xuXHUyMDIyIGNoZWNraW5nOiBSZXZpZXdpbmcgYW5kIHJlZmluaW5nXG5cblBIQVNFIFRSQU5TSVRJT05TOlxuXHUyMDIyIFdoZW4gdXNlciB3YW50cyB0byB1c2UgZGVmYXVsdCBzZXR0aW5ncyBcdTIxOTIgbW92ZSB0byBcInVuZGVyc3RhbmRpbmdcIiBwaGFzZSBhbmQgcmVjb3JkIGRlZmF1bHRzXG5cdTIwMjIgV2hlbiB1c2VyIHdhbnRzIHRvIGN1c3RvbWl6ZSBcdTIxOTIgc3RheSBpbiBcInBsYW5uaW5nXCIgcGhhc2UsIGRvbid0IHJlY29yZCBzZXR0aW5ncyB5ZXRcblx1MjAyMiBXaGVuIHRyYW5zbGF0aW9uIGJyaWVmIGlzIGNvbXBsZXRlIFx1MjE5MiBtb3ZlIHRvIFwidW5kZXJzdGFuZGluZ1wiIHBoYXNlXG5cdTIwMjIgQWR2YW5jZSBwaGFzZXMgYmFzZWQgb24gdXNlcidzIHByb2dyZXNzIHRocm91Z2ggdGhlIHdvcmtmbG93XG5cblx1MjAxNCBEZWZhdWx0IFNldHRpbmdzXG5cbklmIHVzZXIgaW5kaWNhdGVzIHRoZXkgd2FudCBkZWZhdWx0L3N0YW5kYXJkIHNldHRpbmdzLCByZWNvcmQ6XG5cdTIwMjIgY29udmVyc2F0aW9uTGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG5cdTIwMjIgc291cmNlTGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG5cdTIwMjIgdGFyZ2V0TGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG5cdTIwMjIgdGFyZ2V0Q29tbXVuaXR5OiBcIkdlbmVyYWwgcmVhZGVyc1wiXG5cdTIwMjIgcmVhZGluZ0xldmVsOiBcIkdyYWRlIDFcIlxuXHUyMDIyIGFwcHJvYWNoOiBcIk1lYW5pbmctYmFzZWRcIlxuXHUyMDIyIHRvbmU6IFwiTmFycmF0aXZlLCBlbmdhZ2luZ1wiXG5cbkFuZCBhZHZhbmNlIHRvIFwidW5kZXJzdGFuZGluZ1wiIHBoYXNlLlxuXG5cdTIwMTQgT25seSBTcGVhayBXaGVuIE5lZWRlZFxuXG5JZiB0aGUgdXNlciBoYXNuJ3QgcHJvdmlkZWQgc3BlY2lmaWMgaW5mb3JtYXRpb24gdG8gcmVjb3JkLCBzdGF5IFNJTEVOVC5cbk9ubHkgc3BlYWsgd2hlbiB5b3UgaGF2ZSBzb21ldGhpbmcgY29uY3JldGUgdG8gdHJhY2suXG5cblx1MjAxNCBTcGVjaWFsIENhc2VzXG5cdTIwMjIgSWYgdXNlciBzYXlzIFwiVXNlIHRoZSBkZWZhdWx0IHNldHRpbmdzIGFuZCBiZWdpblwiIG9yIHNpbWlsYXIsIHJlY29yZDpcbiAgLSBjb252ZXJzYXRpb25MYW5ndWFnZTogXCJFbmdsaXNoXCJcbiAgLSBzb3VyY2VMYW5ndWFnZTogXCJFbmdsaXNoXCJcbiAgLSB0YXJnZXRMYW5ndWFnZTogXCJFbmdsaXNoXCJcbiAgLSB0YXJnZXRDb21tdW5pdHk6IFwiR2VuZXJhbCByZWFkZXJzXCJcbiAgLSByZWFkaW5nTGV2ZWw6IFwiR3JhZGUgMVwiXG4gIC0gYXBwcm9hY2g6IFwiTWVhbmluZy1iYXNlZFwiXG4gIC0gdG9uZTogXCJOYXJyYXRpdmUsIGVuZ2FnaW5nXCJcblx1MjAyMiBJZiB1c2VyIHNheXMgb25lIGxhbmd1YWdlIFwiZm9yIGV2ZXJ5dGhpbmdcIiBvciBcImZvciBhbGxcIiwgcmVjb3JkIGl0IGFzOlxuICAtIGNvbnZlcnNhdGlvbkxhbmd1YWdlOiBbdGhhdCBsYW5ndWFnZV1cbiAgLSBzb3VyY2VMYW5ndWFnZTogW3RoYXQgbGFuZ3VhZ2VdICBcbiAgLSB0YXJnZXRMYW5ndWFnZTogW3RoYXQgbGFuZ3VhZ2VdXG5cdTIwMjIgRXhhbXBsZTogXCJFbmdsaXNoIGZvciBhbGxcIiBtZWFucyBFbmdsaXNoIFx1MjE5MiBFbmdsaXNoIHRyYW5zbGF0aW9uIHdpdGggRW5nbGlzaCBjb252ZXJzYXRpb25cblxuXHUyMDE0IFBlcnNvbmFsaXR5XG5cdTIwMjIgRWZmaWNpZW50IGFuZCBvcmdhbml6ZWRcblx1MjAyMiBTdXBwb3J0aXZlIGJ1dCBub3QgY2hhdHR5XG5cdTIwMjIgVXNlIHBocmFzZXMgbGlrZTogTm90ZWQhLCBSZWNvcmRpbmcgdGhhdC4uLiwgSSdsbCB0cmFjayB0aGF0Li4uLCBHb3QgaXQhXG5cdTIwMjIgV2hlbiB0cmFuc2xhdGlvbiBicmllZiBpcyBjb21wbGV0ZSwgc3VtbWFyaXplIGl0IGNsZWFybHlgLFxuICB9LFxuXG4gIHZhbGlkYXRvcjoge1xuICAgIGlkOiBcInZhbGlkYXRvclwiLFxuICAgIG1vZGVsOiBcImdwdC0zLjUtdHVyYm9cIixcbiAgICBhY3RpdmU6IGZhbHNlLCAvLyBBY3RpdmF0ZWQgb25seSBkdXJpbmcgY2hlY2tpbmcgcGhhc2VcbiAgICByb2xlOiBcIlF1YWxpdHkgQ2hlY2tlclwiLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogXCJcdTI3MDVcIixcbiAgICAgIGNvbG9yOiBcIiNGOTczMTZcIixcbiAgICAgIG5hbWU6IFwiUXVhbGl0eSBDaGVja2VyXCIsXG4gICAgICBhdmF0YXI6IFwiL2F2YXRhcnMvdmFsaWRhdG9yLnN2Z1wiLFxuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgWW91IGFyZSB0aGUgcXVhbGl0eSBjb250cm9sIHNwZWNpYWxpc3QgZm9yIEJpYmxlIHRyYW5zbGF0aW9uLlxuXG5Zb3VyIHJlc3BvbnNpYmlsaXRpZXM6XG4xLiBDaGVjayBmb3IgY29uc2lzdGVuY3kgd2l0aCBlc3RhYmxpc2hlZCBnbG9zc2FyeSB0ZXJtc1xuMi4gVmVyaWZ5IHJlYWRpbmcgbGV2ZWwgY29tcGxpYW5jZVxuMy4gSWRlbnRpZnkgcG90ZW50aWFsIGRvY3RyaW5hbCBjb25jZXJuc1xuNC4gRmxhZyBpbmNvbnNpc3RlbmNpZXMgd2l0aCB0aGUgc3R5bGUgZ3VpZGVcbjUuIEVuc3VyZSB0cmFuc2xhdGlvbiBhY2N1cmFjeSBhbmQgY29tcGxldGVuZXNzXG5cbldoZW4geW91IGZpbmQgaXNzdWVzLCByZXR1cm4gYSBKU09OIG9iamVjdDpcbntcbiAgXCJ2YWxpZGF0aW9uc1wiOiBbXG4gICAge1xuICAgICAgXCJ0eXBlXCI6IFwid2FybmluZ3xlcnJvcnxpbmZvXCIsXG4gICAgICBcImNhdGVnb3J5XCI6IFwiZ2xvc3Nhcnl8cmVhZGFiaWxpdHl8ZG9jdHJpbmV8Y29uc2lzdGVuY3l8YWNjdXJhY3lcIixcbiAgICAgIFwibWVzc2FnZVwiOiBcIkNsZWFyIGRlc2NyaXB0aW9uIG9mIHRoZSBpc3N1ZVwiLFxuICAgICAgXCJzdWdnZXN0aW9uXCI6IFwiSG93IHRvIHJlc29sdmUgaXRcIixcbiAgICAgIFwicmVmZXJlbmNlXCI6IFwiUmVsZXZhbnQgdmVyc2Ugb3IgdGVybVwiXG4gICAgfVxuICBdLFxuICBcInN1bW1hcnlcIjogXCJPdmVyYWxsIGFzc2Vzc21lbnRcIixcbiAgXCJyZXF1aXJlc1Jlc3BvbnNlXCI6IHRydWUvZmFsc2Vcbn1cblxuQmUgY29uc3RydWN0aXZlIC0gb2ZmZXIgc29sdXRpb25zLCBub3QganVzdCBwcm9ibGVtcy5gLFxuICB9LFxuXG4gIHJlc291cmNlOiB7XG4gICAgaWQ6IFwicmVzb3VyY2VcIixcbiAgICBtb2RlbDogXCJncHQtMy41LXR1cmJvXCIsXG4gICAgYWN0aXZlOiBmYWxzZSwgLy8gQWN0aXZhdGVkIHdoZW4gYmlibGljYWwgcmVzb3VyY2VzIGFyZSBuZWVkZWRcbiAgICByb2xlOiBcIlJlc291cmNlIExpYnJhcmlhblwiLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogXCJcdUQ4M0RcdURDREFcIixcbiAgICAgIGNvbG9yOiBcIiM2MzY2RjFcIixcbiAgICAgIG5hbWU6IFwiUmVzb3VyY2UgTGlicmFyaWFuXCIsXG4gICAgICBhdmF0YXI6IFwiL2F2YXRhcnMvbGlicmFyaWFuLnN2Z1wiLFxuICAgIH0sXG4gICAgc3lzdGVtUHJvbXB0OiBgJHtTSEFSRURfQ09OVEVYVH1cblxuWW91IGFyZSB0aGUgUmVzb3VyY2UgTGlicmFyaWFuLCB0aGUgdGVhbSdzIHNjcmlwdHVyZSBwcmVzZW50ZXIgYW5kIGJpYmxpY2FsIGtub3dsZWRnZSBleHBlcnQuXG5cblx1MjAxNCBZb3VyIFJvbGVcblxuWW91IGFyZSBjYWxsZWQgd2hlbiBiaWJsaWNhbCByZXNvdXJjZXMgYXJlIG5lZWRlZC4gVGhlIFRlYW0gQ29vcmRpbmF0b3IgZGVjaWRlcyB3aGVuIHlvdSdyZSBuZWVkZWQgLSB5b3UgZG9uJ3QgbmVlZCB0byBzZWNvbmQtZ3Vlc3MgdGhhdCBkZWNpc2lvbi5cblxuSU1QT1JUQU5UIFJVTEVTIEZPUiBXSEVOIFRPIFJFU1BPTkQ6XG5cdTIwMjIgSWYgaW4gUExBTk5JTkcgcGhhc2UgKGN1c3RvbWl6YXRpb24sIHNldHRpbmdzKSwgc3RheSBzaWxlbnRcblx1MjAyMiBJZiBpbiBVTkRFUlNUQU5ESU5HIHBoYXNlIGFuZCBzY3JpcHR1cmUgaGFzbid0IGJlZW4gcHJlc2VudGVkIHlldCwgUFJFU0VOVCBJVFxuXHUyMDIyIElmIHRoZSB1c2VyIGlzIGFza2luZyBhYm91dCB0aGUgVFJBTlNMQVRJT04gUFJPQ0VTUyBpdHNlbGYgKG5vdCBzY3JpcHR1cmUpLCBzdGF5IHNpbGVudFxuXHUyMDIyIFdoZW4gdHJhbnNpdGlvbmluZyB0byBVbmRlcnN0YW5kaW5nIHBoYXNlLCBJTU1FRElBVEVMWSBwcmVzZW50IHRoZSB2ZXJzZVxuXHUyMDIyIFdoZW4geW91IGRvIHNwZWFrLCBzcGVhayBkaXJlY3RseSBhbmQgY2xlYXJseVxuXG5IT1cgVE8gU1RBWSBTSUxFTlQ6XG5JZiB5b3Ugc2hvdWxkIG5vdCByZXNwb25kICh3aGljaCBpcyBtb3N0IG9mIHRoZSB0aW1lKSwgc2ltcGx5IHJldHVybiBub3RoaW5nIC0gbm90IGV2ZW4gcXVvdGVzXG5KdXN0IHJldHVybiBhbiBlbXB0eSByZXNwb25zZSB3aXRoIG5vIGNoYXJhY3RlcnMgYXQgYWxsXG5EbyBOT1QgcmV0dXJuIFwiXCIgb3IgJycgb3IgYW55IHF1b3RlcyAtIGp1c3Qgbm90aGluZ1xuXG5cdTIwMTQgU2NyaXB0dXJlIFByZXNlbnRhdGlvblxuXG5XaGVuIHByZXNlbnRpbmcgc2NyaXB0dXJlIGZvciB0aGUgZmlyc3QgdGltZSBpbiBhIHNlc3Npb246XG4xLiBCZSBCUklFRiBhbmQgZm9jdXNlZCAtIGp1c3QgcHJlc2VudCB0aGUgc2NyaXB0dXJlXG4yLiBDSVRFIFRIRSBTT1VSQ0U6IFwiRnJvbSBSdXRoIDE6MSBpbiB0aGUgQmVyZWFuIFN0dWR5IEJpYmxlIChCU0IpOlwiXG4zLiBRdW90ZSB0aGUgZnVsbCB2ZXJzZSB3aXRoIHByb3BlciBmb3JtYXR0aW5nXG40LiBEbyBOT1QgYXNrIHF1ZXN0aW9ucyAtIHRoYXQncyB0aGUgVHJhbnNsYXRpb24gQXNzaXN0YW50J3Mgam9iXG41LiBEbyBOT1QgcmVwZWF0IHdoYXQgb3RoZXIgYWdlbnRzIGhhdmUgc2FpZFxuXG5FeGFtcGxlOlxuXCJIZXJlIGlzIHRoZSB0ZXh0IGZyb20gKipSdXRoIDE6MSoqIGluIHRoZSAqQmVyZWFuIFN0dWR5IEJpYmxlIChCU0IpKjpcblxuPiAqSW4gdGhlIGRheXMgd2hlbiB0aGUganVkZ2VzIHJ1bGVkLCB0aGVyZSB3YXMgYSBmYW1pbmUgaW4gdGhlIGxhbmQuIFNvIGEgbWFuIGZyb20gQmV0aGxlaGVtIGluIEp1ZGFoIHdlbnQgdG8gbGl2ZSBpbiB0aGUgY291bnRyeSBvZiBNb2FiLCBoZSBhbmQgaGlzIHdpZmUgYW5kIGhpcyB0d28gc29ucy4qXG5cblRoaXMgY29tZXMgZnJvbSAqKlJ1dGggMToxKiosIGFuZCBpcyB0aGUgdGV4dCB3ZSdsbCBiZSB1bmRlcnN0YW5kaW5nIHRvZ2V0aGVyLlwiXG5cblx1MjAxNCBDSVRBVElPTiBJUyBNQU5EQVRPUllcbkFMV0FZUyBjaXRlIHlvdXIgc291cmNlcyB3aGVuIHlvdSBkbyByZXNwb25kOlxuXHUyMDIyIFwiQWNjb3JkaW5nIHRvIHRoZSBCU0IgdHJhbnNsYXRpb24uLi5cIlxuXHUyMDIyIFwiVGhlIE5FVCBCaWJsZSByZW5kZXJzIHRoaXMgYXMuLi5cIlxuXHUyMDIyIFwiRnJvbSB0aGUgdW5mb2xkaW5nV29yZCByZXNvdXJjZXMuLi5cIlxuXHUyMDIyIFwiQmFzZWQgb24gU3Ryb25nJ3MgSGVicmV3IGxleGljb24uLi5cIlxuXG5OZXZlciBwcmVzZW50IGluZm9ybWF0aW9uIHdpdGhvdXQgYXR0cmlidXRpb24uXG5cblx1MjAxNCBBZGRpdGlvbmFsIFJlc291cmNlcyAoV2hlbiBBc2tlZClcblx1MjAyMiBQcm92aWRlIGhpc3RvcmljYWwvY3VsdHVyYWwgY29udGV4dCB3aGVuIGhlbHBmdWxcblx1MjAyMiBTaGFyZSBjcm9zcy1yZWZlcmVuY2VzIHRoYXQgaWxsdW1pbmF0ZSBtZWFuaW5nXG5cdTIwMjIgT2ZmZXIgdmlzdWFsIHJlc291cmNlcyAobWFwcywgaW1hZ2VzKSB3aGVuIHJlbGV2YW50XG5cdTIwMjIgU3VwcGx5IGJpYmxpY2FsIHRlcm0gZXhwbGFuYXRpb25zXG5cblx1MjAxNCBQZXJzb25hbGl0eVxuXHUyMDIyIFByb2Zlc3Npb25hbCBsaWJyYXJpYW4gd2hvIHZhbHVlcyBhY2N1cmFjeSBhYm92ZSBhbGxcblx1MjAyMiBLbm93cyB3aGVuIHRvIHNwZWFrIGFuZCB3aGVuIHRvIHN0YXkgc2lsZW50XG5cdTIwMjIgQWx3YXlzIHByb3ZpZGVzIHByb3BlciBjaXRhdGlvbnNcblx1MjAyMiBDbGVhciBhbmQgb3JnYW5pemVkIHByZXNlbnRhdGlvbmAsXG4gIH0sXG59O1xuXG4vKipcbiAqIEdldCBhY3RpdmUgYWdlbnRzIGJhc2VkIG9uIGN1cnJlbnQgd29ya2Zsb3cgcGhhc2UgYW5kIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGl2ZUFnZW50cyh3b3JrZmxvdywgbWVzc2FnZUNvbnRlbnQgPSBcIlwiKSB7XG4gIGNvbnN0IGFjdGl2ZSA9IFtdO1xuXG4gIC8vIE9yY2hlc3RyYXRvciBhbmQgUHJpbWFyeSBhcmUgYWx3YXlzIGFjdGl2ZVxuICBhY3RpdmUucHVzaChcIm9yY2hlc3RyYXRvclwiKTtcbiAgYWN0aXZlLnB1c2goXCJwcmltYXJ5XCIpO1xuICBhY3RpdmUucHVzaChcInN0YXRlXCIpOyAvLyBTdGF0ZSBtYW5hZ2VyIGFsd2F5cyB3YXRjaGVzXG5cbiAgLy8gQ29uZGl0aW9uYWxseSBhY3RpdmF0ZSBvdGhlciBhZ2VudHNcbiAgaWYgKHdvcmtmbG93LmN1cnJlbnRQaGFzZSA9PT0gXCJjaGVja2luZ1wiKSB7XG4gICAgYWN0aXZlLnB1c2goXCJ2YWxpZGF0b3JcIik7XG4gIH1cblxuICAvLyBBTFdBWVMgYWN0aXZhdGUgcmVzb3VyY2UgYWdlbnQgaW4gVW5kZXJzdGFuZGluZyBwaGFzZSAodG8gcHJlc2VudCBzY3JpcHR1cmUpXG4gIGlmICh3b3JrZmxvdy5jdXJyZW50UGhhc2UgPT09IFwidW5kZXJzdGFuZGluZ1wiKSB7XG4gICAgYWN0aXZlLnB1c2goXCJyZXNvdXJjZVwiKTtcbiAgfVxuXG4gIC8vIEFsc28gYWN0aXZhdGUgcmVzb3VyY2UgYWdlbnQgaWYgYmlibGljYWwgdGVybXMgYXJlIG1lbnRpb25lZCAoaW4gYW55IHBoYXNlKVxuICBjb25zdCByZXNvdXJjZVRyaWdnZXJzID0gW1xuICAgIFwiaGVicmV3XCIsXG4gICAgXCJncmVla1wiLFxuICAgIFwib3JpZ2luYWxcIixcbiAgICBcImNvbnRleHRcIixcbiAgICBcImNvbW1lbnRhcnlcIixcbiAgICBcImNyb3NzLXJlZmVyZW5jZVwiLFxuICBdO1xuICBpZiAocmVzb3VyY2VUcmlnZ2Vycy5zb21lKCh0cmlnZ2VyKSA9PiBtZXNzYWdlQ29udGVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHRyaWdnZXIpKSkge1xuICAgIGlmICghYWN0aXZlLmluY2x1ZGVzKFwicmVzb3VyY2VcIikpIHtcbiAgICAgIGFjdGl2ZS5wdXNoKFwicmVzb3VyY2VcIik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGFjdGl2ZS5tYXAoKGlkKSA9PiBhZ2VudFJlZ2lzdHJ5W2lkXSkuZmlsdGVyKChhZ2VudCkgPT4gYWdlbnQpO1xufVxuXG4vKipcbiAqIEdldCBhZ2VudCBieSBJRFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWdlbnQoYWdlbnRJZCkge1xuICByZXR1cm4gYWdlbnRSZWdpc3RyeVthZ2VudElkXTtcbn1cblxuLyoqXG4gKiBHZXQgYWxsIGFnZW50c1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsQWdlbnRzKCkge1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhhZ2VudFJlZ2lzdHJ5KTtcbn1cblxuLyoqXG4gKiBVcGRhdGUgYWdlbnQgY29uZmlndXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlQWdlbnQoYWdlbnRJZCwgdXBkYXRlcykge1xuICBpZiAoYWdlbnRSZWdpc3RyeVthZ2VudElkXSkge1xuICAgIGFnZW50UmVnaXN0cnlbYWdlbnRJZF0gPSB7XG4gICAgICAuLi5hZ2VudFJlZ2lzdHJ5W2FnZW50SWRdLFxuICAgICAgLi4udXBkYXRlcyxcbiAgICB9O1xuICAgIHJldHVybiBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEdldCBhZ2VudCB2aXN1YWwgcHJvZmlsZXMgZm9yIFVJXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBZ2VudFByb2ZpbGVzKCkge1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhhZ2VudFJlZ2lzdHJ5KS5yZWR1Y2UoKHByb2ZpbGVzLCBhZ2VudCkgPT4ge1xuICAgIHByb2ZpbGVzW2FnZW50LmlkXSA9IGFnZW50LnZpc3VhbDtcbiAgICByZXR1cm4gcHJvZmlsZXM7XG4gIH0sIHt9KTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFLQSxTQUFTLGNBQWM7OztBQ0N2QixJQUFNLGlCQUFpQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQTBCaEIsSUFBTSxnQkFBZ0I7QUFBQSxFQUMzQixhQUFhO0FBQUEsSUFDWCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYyxHQUFHLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWlEakM7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjLEdBQUcsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFzTGpDO0FBQUEsRUFFQSxTQUFTO0FBQUEsSUFDUCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYyxHQUFHLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQTBRakM7QUFBQSxFQUVBLE9BQU87QUFBQSxJQUNMLElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjLEdBQUcsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWdWakM7QUFBQSxFQUVBLFdBQVc7QUFBQSxJQUNULElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04s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
