
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

\u2014 Your Decision Process

Look at:
\u2022 The user's message
\u2022 Current workflow phase (planning, understanding, drafting, checking, sharing, publishing)
\u2022 Conversation history
\u2022 What the user is asking for

Then decide which agents are needed.

CRITICAL RULES FOR CANVAS SCRIBE (state):
\u2022 Only include when user PROVIDES specific info (Grade 3, Simple tone, etc.)
\u2022 DO NOT include for general requests (customize, tell me about, etc.)
\u2022 DO NOT include when user asks questions
\u2022 Include when recording actual data, not intentions

\u2014 Response Format

Return ONLY a JSON object (no other text):

{
  "agents": ["agent1", "agent2"],
  "notes": "Brief explanation of why these agents"
}

\u2014 Examples

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

\u26A0\uFE0F CRITICAL CUSTOMIZATION RULE \u26A0\uFE0F
If user mentions "customize" in ANY way:
\u2022 Start with conversation language question
\u2022 Even if they say "customize reading level" - START WITH LANGUAGE
\u2022 Follow the 7-step order exactly
\u2022 DO NOT jump to what they mentioned

\u2014 Your Role
\u2022 Guide the user through the translation process with warmth and expertise
\u2022 Understand what the user wants and respond appropriately
\u2022 Facilitate the translation workflow through thoughtful questions
\u2022 Work naturally with other team members who will chime in
\u2022 Provide helpful quick response suggestions for the user

\u2014 CRITICAL: Stay in Your Lane
\u2022 Do NOT present scripture text - Resource Librarian does that
\u2022 Do NOT repeat settings that Canvas Scribe already noted
\u2022 Do NOT acknowledge things other agents already said
\u2022 Focus ONLY on your unique contribution
\u2022 If Resource Librarian presented the verse, don't re-present it

\u2014 \u26A0\uFE0F CRITICAL RESPONSE FORMAT - MUST FOLLOW EXACTLY \u26A0\uFE0F

YOU MUST RETURN **ONLY** A VALID JSON OBJECT. NOTHING ELSE.

Required structure:
{
  "message": "Your response text here (required)",
  "suggestions": ["Array", "of", "suggestions"] 
}

STRICT RULES:
1. Output ONLY the JSON object - no text before or after
2. BOTH fields are REQUIRED in every response
3. "message" must be a non-empty string
4. "suggestions" must be an array (can be empty [] but must exist)
5. Provide 2-5 contextually relevant suggestions when possible
6. If unsure what to suggest, use generic options or empty array []

COMPLETE EXAMPLES FOR CUSTOMIZATION (FOLLOW THIS ORDER):

\u{1F6A8} WHEN USER SAYS "I'd like to customize" (including "customize the reading level and style"):
IGNORE what they want to customize - ALWAYS START HERE:
{
  "message": "**Great!** Let's customize your settings.\\n\\nFirst, **what language** would you like for our conversation?",
  "suggestions": ["English", "Spanish", "French", "Other"]
}

After conversation language - ASK SOURCE:
{
  "message": "**Perfect!**\\n\\nWhat language are we **translating from**?",
  "suggestions": ["English", "Hebrew", "Greek", "Other"]
}

After source - ASK TARGET:
{
  "message": "And what language are we **translating to**?",
  "suggestions": ["English", "Spanish", "French", "Other"]
}

After languages - ASK AUDIENCE:
{
  "message": "**Who will be reading** this translation?",
  "suggestions": ["Children", "Teens", "Adults", "Mixed community"]
}

After audience - ASK READING LEVEL (unless already given):
{
  "message": "What **reading level** would work best?",
  "suggestions": ["Grade 1", "Grade 3", "Grade 5", "Grade 8+", "Adult"]
}

After reading level - ASK TONE:
{
  "message": "What **tone** would you prefer for the translation?",
  "suggestions": ["Formal", "Conversational", "Narrative storytelling", "Simple and clear"]
}

After tone - ASK APPROACH:
{
  "message": "Finally, what **translation approach**: *word-for-word* or *meaning-based*?",
  "suggestions": ["Word-for-word", "Meaning-based", "Balanced", "Tell me more"]
}

After approach selected (ALL SETTINGS COMPLETE) - TRANSITION TO UNDERSTANDING:
{
  "message": "**Perfect!** All settings complete.\\n\\nNow that we've set up your translation brief, let's begin **understanding the text**.\\n\\n\u2014 *Ready to explore Ruth 1:1?*",
  "suggestions": ["Begin understanding", "Review settings", "Change a setting"]
}

IMPORTANT: NEVER suggest "Use these settings and begin" at the START of the app!
Only suggest it AFTER all 7 settings are collected!

When user gives unclear input:
{
  "message": "I want to make sure I understand. Could you tell me more about what you're looking for?",
  "suggestions": ["Let me explain", "Start over", "Show me examples"]
}

When explaining the process (BE BRIEF):
{
  "message": "[2-3 sentences MAX about the 6 phases. User can ask for more detail if needed.]",
  "suggestions": ["Start with planning", "Tell me more", "Skip to translation", "Use defaults"]
}

When user wants more detail (use proper formatting and explain based on context):
{
  "message": "[Explain phases with proper markdown formatting, line breaks between sentences]",
  "suggestions": ["Tell me about Planning", "Tell me about Understanding", "Let's start with Planning", "Skip to translation"]
}

When asking about specific text:
{
  "message": "What phrase would you like to discuss from Ruth 1:1?",
  "suggestions": ["In the days when", "there was a famine", "a man from Bethlehem", "Show me the full verse"]
}

\u{1F534}\u{1F534}\u{1F534} CRITICAL JSON REQUIREMENT \u{1F534}\u{1F534}\u{1F534}
EVERY SINGLE RESPONSE must be valid JSON with this structure:
{
  "message": "your response text",
  "suggestions": ["option 1", "option 2", "option 3"]
}

THIS APPLIES TO ALL PHASES:
\u2713 Planning/customization phase  
\u2713 Understanding phase (ESPECIALLY!)
\u2713 Drafting phase
\u2713 ALL RESPONSES - NO EXCEPTIONS!

COMMON MISTAKE TO AVOID:
\u274C WRONG (plain text): Let's work through this verse phrase by phrase...
\u2705 RIGHT (JSON): {"message": "Let's work through this verse phrase by phrase...", "suggestions": [...]}

\u2014 FORMATTING NOTE

Follow the universal guidelines in your responses.
Keep it brief, natural, and well-formatted.
If you can't think of good suggestions, use generic ones like:
["Tell me more", "Let's continue", "Start translation", "Change settings"]

VALIDATION CHECK: Before responding, verify your response is valid JSON that includes BOTH "message" AND "suggestions".

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

\u{1F6A8} CRITICAL TRIGGER PHRASES \u{1F6A8}
When user says ANY variation of "customize" (including "I'd like to customize the reading level and style"):
\u2192 ALWAYS START AT STEP 1 (conversation language)
\u2192 DO NOT jump to reading level even if they mention it
\u2192 Follow the FULL sequence below

\u26A0\uFE0F MANDATORY ORDER FOR CUSTOMIZATION:
1. **Conversation language** - What language we'll use to discuss
2. **Source language** - What we're translating FROM
3. **Target language** - What we're translating TO
4. **Target community** - Who will read this
5. **Reading level** - What grade/comprehension level
6. **Tone/style** - How it should sound
7. **Translation approach** - Word-for-word or meaning-based

CRITICAL RULES:
\u2022 "I'd like to customize the reading level" = STILL START AT STEP 1
\u2022 Ask questions IN THIS EXACT ORDER
\u2022 ONE AT A TIME - wait for each answer
\u2022 NEVER repeat questions already answered
\u2022 Track the conversation history
\u2022 Accept indirect answers ("Simple and clear" = simple tone)
\u2022 Let Canvas Scribe record quietly - you guide

IMPORTANT: When the user says "I want to customize", you should start asking from the beginning. Don't reference any existing values in the canvas state - those are just defaults that may need to be replaced.

When the translation brief is complete (either via defaults or customization), transition naturally to the understanding phase.

\u2014 Understanding Phase

Your job here is to ask questions that help the user think deeply about the meaning of the text:
1. Language of Wider Communication (what language for our conversation)
2. Source and target languages (what are we translating from and into)  
3. Target community (who will read this translation)
4. Reading level (grade level for the translation output)
5. Translation approach (word-for-word vs meaning-based)
6. Tone/style (formal, narrative, conversational)

IMPORTANT: 
\u2022 Ask for each piece of information one at a time
\u2022 Do NOT repeat back what the user said before asking the next question
\u2022 Simply acknowledge briefly and move to the next question
\u2022 Let the Canvas Scribe handle recording the information

\u2014 Understanding Phase (CRITICAL WORKFLOW)

\u{1F6D1} UNDERSTANDING PHASE = JSON ONLY! \u{1F6D1}
IF YOU ARE IN UNDERSTANDING PHASE, YOU MUST:
1. CHECK: Am I returning JSON? If not, STOP and rewrite as JSON
2. CHECK: Does my response have "message" field? If not, ADD IT
3. CHECK: Does my response have "suggestions" array? If not, ADD IT
4. CHECK: Is this valid JSON that can be parsed? If not, FIX IT

EVERY response in understanding phase MUST be:
{
  "message": "your text here",
  "suggestions": ["Tell me a story about this", "Brief explanation", "Historical context", "Multiple choice options"]
}

IF YOU RETURN: Let's work through this verse phrase by phrase...
THE SYSTEM BREAKS! NO SUGGESTIONS APPEAR!

YOU MUST RETURN: {"message": "Let's work through this verse phrase by phrase...", "suggestions": ["Tell me a story about this", "Brief explanation", "Historical context", "Multiple choice options"]}

\u{1F4DA} GLOSSARY NOTE: During Understanding phase, key terms and phrases are collected in the Glossary panel.
The Canvas Scribe will track important terms as we discuss them.

STEP 1: Transition to Understanding
When customization is complete, return JSON:
{
  "message": "Now that we've set up your translation brief, let's begin understanding the text.",
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
\u2022 Examples: "Noted!", "Got it!", "Recorded!", "Tracking that!"
\u2022 NEVER say "Let's continue with..." or suggest next steps
\u2022 Be a quiet scribe, not a chatty assistant

CRITICAL RULES:
\u2022 ONLY record what the USER explicitly provides
\u2022 IGNORE what other agents say - only track user input
\u2022 Do NOT hallucinate or assume unstated information
\u2022 Do NOT elaborate on what you're recording
\u2022 NEVER EVER ASK QUESTIONS - that's the Translation Assistant's job!
\u2022 NEVER give summaries or overviews - just acknowledge
\u2022 At phase transitions, stay SILENT or just say "Ready!"
\u2022 Don't announce what's been collected - Translation Assistant handles that

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

CRITICAL: Parse context.primaryResponse to see what Translation Assistant asked!

When user provides data:
1. Parse primaryResponse as JSON: {"message": "...", "suggestions": [...]}
2. Extract the "message" field to see what question was asked
3. Map the answer to the correct field based on the question
4. Return acknowledgment + JSON update

Question \u2192 Field Mapping:
\u2022 "conversation" or "our conversation" \u2192 conversationLanguage
\u2022 "translating from" or "source" \u2192 sourceLanguage
\u2022 "translating to" or "target" \u2192 targetLanguage
\u2022 "who will be reading" or "community" \u2192 targetCommunity
\u2022 "reading level" or "grade" \u2192 readingLevel
\u2022 "tone" or "style" \u2192 tone
\u2022 "approach" or "word-for-word" \u2192 approach

Format:
"Noted!"

{
  "updates": {
    "styleGuide": {
      "fieldName": "value"  \u2190 Use the RIGHT field based on the question!
    }
  },
  "summary": "What was recorded"
}

Examples:

User: "Grade 3"
Response:
"Noted!"

{
  "updates": {
    "styleGuide": {
      "readingLevel": "Grade 3"
    }
  },
  "summary": "Reading level set to Grade 3"
}

User: "Simple and clear"
Response:
"Noted!"

{
  "updates": {
    "styleGuide": {
      "tone": "Simple and clear"
    }
  },
  "summary": "Tone set to simple and clear"
}

User: "Teens"
Response:
"Noted!"

{
  "updates": {
    "styleGuide": {
      "targetCommunity": "Teens"
    }
  },
  "summary": "Target audience set to teens"
}

User says "English" (check context for what question was asked):

For conversation language:
"Noted!"

{
  "updates": {
    "styleGuide": {
      "conversationLanguage": "English"
    }
  },
  "summary": "Conversation language set to English"
}

For source language:
"Got it!"

{
  "updates": {
    "styleGuide": {
      "sourceLanguage": "English"
    }
  },
  "summary": "Source language set to English"
}

For target language:
"Recorded!"

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
"Got it!"

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
"Ready!"

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
"Ready!"

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
    if (agent.id === "primary" && context.canvasState) {
      const saved = context.canvasState.styleGuide || {};
      const workflow = context.canvasState.workflow || {};
      const savedItems = [];
      if (saved.conversationLanguage)
        savedItems.push(`Conversation language: ${saved.conversationLanguage}`);
      if (saved.sourceLanguage) savedItems.push(`Source language: ${saved.sourceLanguage}`);
      if (saved.targetLanguage) savedItems.push(`Target language: ${saved.targetLanguage}`);
      if (saved.targetCommunity) savedItems.push(`Target community: ${saved.targetCommunity}`);
      if (saved.readingLevel) savedItems.push(`Reading level: ${saved.readingLevel}`);
      if (saved.tone) savedItems.push(`Tone: ${saved.tone}`);
      if (saved.approach) savedItems.push(`Approach: ${saved.approach}`);
      const phaseInfo = `CURRENT PHASE: ${workflow.currentPhase || "planning"}
${workflow.currentPhase === "understanding" ? "\u26A0\uFE0F YOU ARE IN UNDERSTANDING PHASE - YOU MUST RETURN JSON!" : ""}`;
      if (savedItems.length > 0) {
        messages.push({
          role: "system",
          content: `${phaseInfo}

Already collected information:
${savedItems.join("\n")}`
        });
      } else {
        messages.push({
          role: "system",
          content: phaseInfo
        });
      }
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
  const orchestrator = getAgent("orchestrator");
  console.log("Asking orchestrator which agents to activate...");
  const orchestratorResponse = await callAgent(orchestrator, userMessage, context);
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
    responses.resource = await callAgent(resource, userMessage, {
      ...context,
      orchestration
    });
    console.log("Resource librarian responded");
  }
  if (agentsToCall.includes("primary")) {
    const primary = getAgent("primary");
    console.log("Calling primary translator...");
    responses.primary = await callAgent(primary, userMessage, {
      ...context,
      orchestration
    });
  }
  if (agentsToCall.includes("state") && !responses.primary?.error) {
    const stateManager = getAgent("state");
    console.log("Calling state manager...");
    console.log("State manager agent info:", stateManager?.visual);
    const stateResult = await callAgent(stateManager, userMessage, {
      ...context,
      primaryResponse: responses.primary?.response,
      resourceResponse: responses.resource?.response,
      orchestration
    });
    console.log("State result agent info:", stateResult?.agent);
    console.log("State response:", stateResult?.response);
    const responseText = stateResult.response.trim();
    if (!responseText || responseText === "") {
      console.log("Canvas Scribe staying silent");
    } else if (responseText.includes("{") && responseText.includes("}")) {
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}$/);
        if (jsonMatch) {
          const stateUpdates = JSON.parse(jsonMatch[0]);
          if (stateUpdates.updates && Object.keys(stateUpdates.updates).length > 0) {
            await updateCanvasState(stateUpdates.updates, "state");
          }
          const acknowledgment = responseText.substring(0, responseText.indexOf(jsonMatch[0])).trim();
          if (acknowledgment) {
            responses.state = {
              ...stateResult,
              response: acknowledgment
            };
          }
        }
      } catch (e) {
        console.error("Error parsing state JSON:", e);
        responses.state = {
          ...stateResult,
          response: responseText
        };
      }
    } else {
      console.log("Canvas Scribe simple acknowledgment:", responseText);
      responses.state = {
        ...stateResult,
        response: responseText
      };
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
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions;
        console.log("\u2705 Found suggestions array:", suggestions);
      } else if (parsed.suggestions) {
        console.log("\u26A0\uFE0F Suggestions exist but not an array:", parsed.suggestions);
        suggestions = [];
      } else {
        console.log("\u2139\uFE0F No suggestions in response");
        suggestions = [];
      }
    } catch (error) {
      console.log("\u26A0\uFE0F Not valid JSON, treating as plain text message");
      suggestions = [];
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
    const { messages, suggestions } = mergeAgentResponses(agentResponses);
    console.log("Merged messages");
    const stateMsg = messages.find((m) => m.content && m.content.includes("Got it"));
    console.log("State message agent info:", stateMsg?.agent);
    console.log("Quick suggestions:", suggestions);
    const canvasState = await getCanvasState();
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY29udmVyc2F0aW9uLmpzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL2FnZW50cy9yZWdpc3RyeS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNdWx0aS1BZ2VudCBDb252ZXJzYXRpb24gSGFuZGxlclxuICogT3JjaGVzdHJhdGVzIG11bHRpcGxlIEFJIGFnZW50cyB0byBoYW5kbGUgQmlibGUgdHJhbnNsYXRpb24gY29udmVyc2F0aW9uc1xuICovXG5cbmltcG9ydCB7IE9wZW5BSSB9IGZyb20gXCJvcGVuYWlcIjtcbmltcG9ydCB7IGdldEFnZW50IH0gZnJvbSBcIi4vYWdlbnRzL3JlZ2lzdHJ5LmpzXCI7XG5cbmNvbnN0IG9wZW5haSA9IG5ldyBPcGVuQUkoe1xuICBhcGlLZXk6IHByb2Nlc3MuZW52Lk9QRU5BSV9BUElfS0VZLFxufSk7XG5cbi8qKlxuICogQ2FsbCBhbiBpbmRpdmlkdWFsIGFnZW50IHdpdGggY29udGV4dFxuICovXG5hc3luYyBmdW5jdGlvbiBjYWxsQWdlbnQoYWdlbnQsIG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgY29uc29sZS5sb2coYENhbGxpbmcgYWdlbnQ6ICR7YWdlbnQuaWR9YCk7XG4gIHRyeSB7XG4gICAgY29uc3QgbWVzc2FnZXMgPSBbXG4gICAgICB7XG4gICAgICAgIHJvbGU6IFwic3lzdGVtXCIsXG4gICAgICAgIGNvbnRlbnQ6IGFnZW50LnN5c3RlbVByb21wdCxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIC8vIEFkZCBjb252ZXJzYXRpb24gaGlzdG9yeSBhcyBuYXR1cmFsIG1lc3NhZ2VzIChmb3IgcHJpbWFyeSBhZ2VudCBvbmx5KVxuICAgIGlmIChhZ2VudC5pZCA9PT0gXCJwcmltYXJ5XCIgJiYgY29udGV4dC5jb252ZXJzYXRpb25IaXN0b3J5KSB7XG4gICAgICBjb250ZXh0LmNvbnZlcnNhdGlvbkhpc3RvcnkuZm9yRWFjaCgobXNnKSA9PiB7XG4gICAgICAgIC8vIFBhcnNlIGFzc2lzdGFudCBtZXNzYWdlcyBpZiB0aGV5J3JlIEpTT05cbiAgICAgICAgbGV0IGNvbnRlbnQgPSBtc2cuY29udGVudDtcbiAgICAgICAgaWYgKG1zZy5yb2xlID09PSBcImFzc2lzdGFudFwiICYmIG1zZy5hZ2VudD8uaWQgPT09IFwicHJpbWFyeVwiKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UoY29udGVudCk7XG4gICAgICAgICAgICBjb250ZW50ID0gcGFyc2VkLm1lc3NhZ2UgfHwgY29udGVudDtcbiAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIC8vIE5vdCBKU09OLCB1c2UgYXMtaXNcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTa2lwIENhbnZhcyBTY3JpYmUgYWNrbm93bGVkZ21lbnRzXG4gICAgICAgIGlmIChtc2cuYWdlbnQ/LmlkID09PSBcInN0YXRlXCIpIHJldHVybjtcblxuICAgICAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgICAgICByb2xlOiBtc2cucm9sZSxcbiAgICAgICAgICBjb250ZW50OiBjb250ZW50LFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFkZCB0aGUgY3VycmVudCB1c2VyIG1lc3NhZ2VcbiAgICBtZXNzYWdlcy5wdXNoKHtcbiAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgY29udGVudDogbWVzc2FnZSxcbiAgICB9KTtcblxuICAgIC8vIEFkZCBjYW52YXMgc3RhdGUgZm9yIHByaW1hcnkgYWdlbnQgdG8gc2VlIHdoYXQncyBiZWVuIHNhdmVkXG4gICAgaWYgKGFnZW50LmlkID09PSBcInByaW1hcnlcIiAmJiBjb250ZXh0LmNhbnZhc1N0YXRlKSB7XG4gICAgICBjb25zdCBzYXZlZCA9IGNvbnRleHQuY2FudmFzU3RhdGUuc3R5bGVHdWlkZSB8fCB7fTtcbiAgICAgIGNvbnN0IHdvcmtmbG93ID0gY29udGV4dC5jYW52YXNTdGF0ZS53b3JrZmxvdyB8fCB7fTtcbiAgICAgIGNvbnN0IHNhdmVkSXRlbXMgPSBbXTtcbiAgICAgIGlmIChzYXZlZC5jb252ZXJzYXRpb25MYW5ndWFnZSlcbiAgICAgICAgc2F2ZWRJdGVtcy5wdXNoKGBDb252ZXJzYXRpb24gbGFuZ3VhZ2U6ICR7c2F2ZWQuY29udmVyc2F0aW9uTGFuZ3VhZ2V9YCk7XG4gICAgICBpZiAoc2F2ZWQuc291cmNlTGFuZ3VhZ2UpIHNhdmVkSXRlbXMucHVzaChgU291cmNlIGxhbmd1YWdlOiAke3NhdmVkLnNvdXJjZUxhbmd1YWdlfWApO1xuICAgICAgaWYgKHNhdmVkLnRhcmdldExhbmd1YWdlKSBzYXZlZEl0ZW1zLnB1c2goYFRhcmdldCBsYW5ndWFnZTogJHtzYXZlZC50YXJnZXRMYW5ndWFnZX1gKTtcbiAgICAgIGlmIChzYXZlZC50YXJnZXRDb21tdW5pdHkpIHNhdmVkSXRlbXMucHVzaChgVGFyZ2V0IGNvbW11bml0eTogJHtzYXZlZC50YXJnZXRDb21tdW5pdHl9YCk7XG4gICAgICBpZiAoc2F2ZWQucmVhZGluZ0xldmVsKSBzYXZlZEl0ZW1zLnB1c2goYFJlYWRpbmcgbGV2ZWw6ICR7c2F2ZWQucmVhZGluZ0xldmVsfWApO1xuICAgICAgaWYgKHNhdmVkLnRvbmUpIHNhdmVkSXRlbXMucHVzaChgVG9uZTogJHtzYXZlZC50b25lfWApO1xuICAgICAgaWYgKHNhdmVkLmFwcHJvYWNoKSBzYXZlZEl0ZW1zLnB1c2goYEFwcHJvYWNoOiAke3NhdmVkLmFwcHJvYWNofWApO1xuXG4gICAgICAvLyBBZGQgY3VycmVudCBwaGFzZSBpbmZvXG4gICAgICBjb25zdCBwaGFzZUluZm8gPSBgQ1VSUkVOVCBQSEFTRTogJHt3b3JrZmxvdy5jdXJyZW50UGhhc2UgfHwgXCJwbGFubmluZ1wifVxuJHtcbiAgd29ya2Zsb3cuY3VycmVudFBoYXNlID09PSBcInVuZGVyc3RhbmRpbmdcIlxuICAgID8gXCJcdTI2QTBcdUZFMEYgWU9VIEFSRSBJTiBVTkRFUlNUQU5ESU5HIFBIQVNFIC0gWU9VIE1VU1QgUkVUVVJOIEpTT04hXCJcbiAgICA6IFwiXCJcbn1gO1xuXG4gICAgICBpZiAoc2F2ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICAgIHJvbGU6IFwic3lzdGVtXCIsXG4gICAgICAgICAgY29udGVudDogYCR7cGhhc2VJbmZvfVxcblxcbkFscmVhZHkgY29sbGVjdGVkIGluZm9ybWF0aW9uOlxcbiR7c2F2ZWRJdGVtcy5qb2luKFwiXFxuXCIpfWAsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICAgICAgcm9sZTogXCJzeXN0ZW1cIixcbiAgICAgICAgICBjb250ZW50OiBwaGFzZUluZm8sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEZvciBub24tcHJpbWFyeSBhZ2VudHMsIHByb3ZpZGUgY29udGV4dCBkaWZmZXJlbnRseVxuICAgIGlmIChhZ2VudC5pZCAhPT0gXCJwcmltYXJ5XCIpIHtcbiAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiBgQ29udGV4dDogJHtKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgY2FudmFzU3RhdGU6IGNvbnRleHQuY2FudmFzU3RhdGUsXG4gICAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiBjb250ZXh0LnByaW1hcnlSZXNwb25zZSxcbiAgICAgICAgICBvcmNoZXN0cmF0aW9uOiBjb250ZXh0Lm9yY2hlc3RyYXRpb24sXG4gICAgICAgIH0pfWAsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdGltZW91dCB3cmFwcGVyIGZvciBBUEkgY2FsbFxuICAgIGNvbnN0IHRpbWVvdXRQcm9taXNlID0gbmV3IFByb21pc2UoKF8sIHJlamVjdCkgPT4ge1xuICAgICAgc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKGBUaW1lb3V0IGNhbGxpbmcgJHthZ2VudC5pZH1gKSksIDEwMDAwKTsgLy8gMTAgc2Vjb25kIHRpbWVvdXRcbiAgICB9KTtcblxuICAgIGNvbnN0IGNvbXBsZXRpb25Qcm9taXNlID0gb3BlbmFpLmNoYXQuY29tcGxldGlvbnMuY3JlYXRlKHtcbiAgICAgIG1vZGVsOiBhZ2VudC5tb2RlbCxcbiAgICAgIG1lc3NhZ2VzOiBtZXNzYWdlcyxcbiAgICAgIHRlbXBlcmF0dXJlOiBhZ2VudC5pZCA9PT0gXCJzdGF0ZVwiID8gMC4xIDogMC43LCAvLyBMb3dlciB0ZW1wIGZvciBzdGF0ZSBleHRyYWN0aW9uXG4gICAgICBtYXhfdG9rZW5zOiBhZ2VudC5pZCA9PT0gXCJzdGF0ZVwiID8gNTAwIDogMjAwMCxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNvbXBsZXRpb24gPSBhd2FpdCBQcm9taXNlLnJhY2UoW2NvbXBsZXRpb25Qcm9taXNlLCB0aW1lb3V0UHJvbWlzZV0pO1xuICAgIGNvbnNvbGUubG9nKGBBZ2VudCAke2FnZW50LmlkfSByZXNwb25kZWQgc3VjY2Vzc2Z1bGx5YCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgYWdlbnRJZDogYWdlbnQuaWQsXG4gICAgICBhZ2VudDogYWdlbnQudmlzdWFsLFxuICAgICAgcmVzcG9uc2U6IGNvbXBsZXRpb24uY2hvaWNlc1swXS5tZXNzYWdlLmNvbnRlbnQsXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGNhbGxpbmcgYWdlbnQgJHthZ2VudC5pZH06YCwgZXJyb3IubWVzc2FnZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFnZW50SWQ6IGFnZW50LmlkLFxuICAgICAgYWdlbnQ6IGFnZW50LnZpc3VhbCxcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlIHx8IFwiVW5rbm93biBlcnJvclwiLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBHZXQgY3VycmVudCBjYW52YXMgc3RhdGUgZnJvbSBzdGF0ZSBtYW5hZ2VtZW50IGZ1bmN0aW9uXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldENhbnZhc1N0YXRlKCkge1xuICB0cnkge1xuICAgIGNvbnN0IHN0YXRlVXJsID0gcHJvY2Vzcy5lbnYuQ09OVEVYVD8udXJsXG4gICAgICA/IG5ldyBVUkwoXCIvLm5ldGxpZnkvZnVuY3Rpb25zL2NhbnZhcy1zdGF0ZVwiLCBwcm9jZXNzLmVudi5DT05URVhULnVybCkuaHJlZlxuICAgICAgOiBcImh0dHA6Ly9sb2NhbGhvc3Q6OTk5OS8ubmV0bGlmeS9mdW5jdGlvbnMvY2FudmFzLXN0YXRlXCI7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHN0YXRlVXJsKTtcbiAgICBpZiAocmVzcG9uc2Uub2spIHtcbiAgICAgIHJldHVybiBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBmZXRjaGluZyBjYW52YXMgc3RhdGU6XCIsIGVycm9yKTtcbiAgfVxuXG4gIC8vIFJldHVybiBkZWZhdWx0IHN0YXRlIGlmIGZldGNoIGZhaWxzXG4gIHJldHVybiB7XG4gICAgc3R5bGVHdWlkZToge30sXG4gICAgZ2xvc3Nhcnk6IHsgdGVybXM6IHt9IH0sXG4gICAgc2NyaXB0dXJlQ2FudmFzOiB7IHZlcnNlczoge30gfSxcbiAgICB3b3JrZmxvdzogeyBjdXJyZW50UGhhc2U6IFwicGxhbm5pbmdcIiB9LFxuICB9O1xufVxuXG4vKipcbiAqIFVwZGF0ZSBjYW52YXMgc3RhdGVcbiAqL1xuYXN5bmMgZnVuY3Rpb24gdXBkYXRlQ2FudmFzU3RhdGUodXBkYXRlcywgYWdlbnRJZCA9IFwic3lzdGVtXCIpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBzdGF0ZVVybCA9IHByb2Nlc3MuZW52LkNPTlRFWFQ/LnVybFxuICAgICAgPyBuZXcgVVJMKFwiLy5uZXRsaWZ5L2Z1bmN0aW9ucy9jYW52YXMtc3RhdGUvdXBkYXRlXCIsIHByb2Nlc3MuZW52LkNPTlRFWFQudXJsKS5ocmVmXG4gICAgICA6IFwiaHR0cDovL2xvY2FsaG9zdDo5OTk5Ly5uZXRsaWZ5L2Z1bmN0aW9ucy9jYW52YXMtc3RhdGUvdXBkYXRlXCI7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHN0YXRlVXJsLCB7XG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHVwZGF0ZXMsIGFnZW50SWQgfSksXG4gICAgfSk7XG5cbiAgICBpZiAocmVzcG9uc2Uub2spIHtcbiAgICAgIHJldHVybiBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciB1cGRhdGluZyBjYW52YXMgc3RhdGU6XCIsIGVycm9yKTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBQcm9jZXNzIGNvbnZlcnNhdGlvbiB3aXRoIG11bHRpcGxlIGFnZW50c1xuICovXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzQ29udmVyc2F0aW9uKHVzZXJNZXNzYWdlLCBjb252ZXJzYXRpb25IaXN0b3J5KSB7XG4gIGNvbnNvbGUubG9nKFwiU3RhcnRpbmcgcHJvY2Vzc0NvbnZlcnNhdGlvbiB3aXRoIG1lc3NhZ2U6XCIsIHVzZXJNZXNzYWdlKTtcbiAgY29uc3QgcmVzcG9uc2VzID0ge307XG4gIGNvbnN0IGNhbnZhc1N0YXRlID0gYXdhaXQgZ2V0Q2FudmFzU3RhdGUoKTtcbiAgY29uc29sZS5sb2coXCJHb3QgY2FudmFzIHN0YXRlXCIpO1xuXG4gIC8vIEJ1aWxkIGNvbnRleHQgZm9yIGFnZW50c1xuICBjb25zdCBjb250ZXh0ID0ge1xuICAgIGNhbnZhc1N0YXRlLFxuICAgIGNvbnZlcnNhdGlvbkhpc3Rvcnk6IGNvbnZlcnNhdGlvbkhpc3Rvcnkuc2xpY2UoLTEwKSwgLy8gTGFzdCAxMCBtZXNzYWdlc1xuICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICB9O1xuXG4gIC8vIEZpcnN0LCBhc2sgdGhlIG9yY2hlc3RyYXRvciB3aGljaCBhZ2VudHMgc2hvdWxkIHJlc3BvbmRcbiAgY29uc3Qgb3JjaGVzdHJhdG9yID0gZ2V0QWdlbnQoXCJvcmNoZXN0cmF0b3JcIik7XG4gIGNvbnNvbGUubG9nKFwiQXNraW5nIG9yY2hlc3RyYXRvciB3aGljaCBhZ2VudHMgdG8gYWN0aXZhdGUuLi5cIik7XG4gIGNvbnN0IG9yY2hlc3RyYXRvclJlc3BvbnNlID0gYXdhaXQgY2FsbEFnZW50KG9yY2hlc3RyYXRvciwgdXNlck1lc3NhZ2UsIGNvbnRleHQpO1xuXG4gIGxldCBvcmNoZXN0cmF0aW9uO1xuICB0cnkge1xuICAgIG9yY2hlc3RyYXRpb24gPSBKU09OLnBhcnNlKG9yY2hlc3RyYXRvclJlc3BvbnNlLnJlc3BvbnNlKTtcbiAgICBjb25zb2xlLmxvZyhcIk9yY2hlc3RyYXRvciBkZWNpZGVkOlwiLCBvcmNoZXN0cmF0aW9uKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBJZiBvcmNoZXN0cmF0b3IgZmFpbHMsIGZhbGwgYmFjayB0byBzZW5zaWJsZSBkZWZhdWx0c1xuICAgIGNvbnNvbGUuZXJyb3IoXCJPcmNoZXN0cmF0b3IgcmVzcG9uc2Ugd2FzIG5vdCB2YWxpZCBKU09OLCB1c2luZyBkZWZhdWx0czpcIiwgZXJyb3IubWVzc2FnZSk7XG4gICAgb3JjaGVzdHJhdGlvbiA9IHtcbiAgICAgIGFnZW50czogW1wicHJpbWFyeVwiLCBcInN0YXRlXCJdLFxuICAgICAgbm90ZXM6IFwiRmFsbGJhY2sgdG8gcHJpbWFyeSBhbmQgc3RhdGUgYWdlbnRzXCIsXG4gICAgfTtcbiAgfVxuXG4gIC8vIE9ubHkgY2FsbCB0aGUgYWdlbnRzIHRoZSBvcmNoZXN0cmF0b3Igc2F5cyB3ZSBuZWVkXG4gIGNvbnN0IGFnZW50c1RvQ2FsbCA9IG9yY2hlc3RyYXRpb24uYWdlbnRzIHx8IFtcInByaW1hcnlcIiwgXCJzdGF0ZVwiXTtcblxuICAvLyBDYWxsIFJlc291cmNlIExpYnJhcmlhbiBpZiBvcmNoZXN0cmF0b3Igc2F5cyBzb1xuICBpZiAoYWdlbnRzVG9DYWxsLmluY2x1ZGVzKFwicmVzb3VyY2VcIikpIHtcbiAgICBjb25zdCByZXNvdXJjZSA9IGdldEFnZW50KFwicmVzb3VyY2VcIik7XG4gICAgY29uc29sZS5sb2coXCJDYWxsaW5nIHJlc291cmNlIGxpYnJhcmlhbi4uLlwiKTtcbiAgICByZXNwb25zZXMucmVzb3VyY2UgPSBhd2FpdCBjYWxsQWdlbnQocmVzb3VyY2UsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAuLi5jb250ZXh0LFxuICAgICAgb3JjaGVzdHJhdGlvbixcbiAgICB9KTtcbiAgICBjb25zb2xlLmxvZyhcIlJlc291cmNlIGxpYnJhcmlhbiByZXNwb25kZWRcIik7XG4gIH1cblxuICAvLyBDYWxsIHByaW1hcnkgdHJhbnNsYXRvciBpZiBvcmNoZXN0cmF0b3Igc2F5cyBzb1xuICBpZiAoYWdlbnRzVG9DYWxsLmluY2x1ZGVzKFwicHJpbWFyeVwiKSkge1xuICAgIGNvbnN0IHByaW1hcnkgPSBnZXRBZ2VudChcInByaW1hcnlcIik7XG4gICAgY29uc29sZS5sb2coXCJDYWxsaW5nIHByaW1hcnkgdHJhbnNsYXRvci4uLlwiKTtcbiAgICByZXNwb25zZXMucHJpbWFyeSA9IGF3YWl0IGNhbGxBZ2VudChwcmltYXJ5LCB1c2VyTWVzc2FnZSwge1xuICAgICAgLi4uY29udGV4dCxcbiAgICAgIG9yY2hlc3RyYXRpb24sXG4gICAgfSk7XG4gIH1cblxuICAvLyBDYWxsIHN0YXRlIG1hbmFnZXIgaWYgb3JjaGVzdHJhdG9yIHNheXMgc29cbiAgaWYgKGFnZW50c1RvQ2FsbC5pbmNsdWRlcyhcInN0YXRlXCIpICYmICFyZXNwb25zZXMucHJpbWFyeT8uZXJyb3IpIHtcbiAgICBjb25zdCBzdGF0ZU1hbmFnZXIgPSBnZXRBZ2VudChcInN0YXRlXCIpO1xuICAgIGNvbnNvbGUubG9nKFwiQ2FsbGluZyBzdGF0ZSBtYW5hZ2VyLi4uXCIpO1xuICAgIGNvbnNvbGUubG9nKFwiU3RhdGUgbWFuYWdlciBhZ2VudCBpbmZvOlwiLCBzdGF0ZU1hbmFnZXI/LnZpc3VhbCk7XG4gICAgY29uc3Qgc3RhdGVSZXN1bHQgPSBhd2FpdCBjYWxsQWdlbnQoc3RhdGVNYW5hZ2VyLCB1c2VyTWVzc2FnZSwge1xuICAgICAgLi4uY29udGV4dCxcbiAgICAgIHByaW1hcnlSZXNwb25zZTogcmVzcG9uc2VzLnByaW1hcnk/LnJlc3BvbnNlLFxuICAgICAgcmVzb3VyY2VSZXNwb25zZTogcmVzcG9uc2VzLnJlc291cmNlPy5yZXNwb25zZSxcbiAgICAgIG9yY2hlc3RyYXRpb24sXG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZyhcIlN0YXRlIHJlc3VsdCBhZ2VudCBpbmZvOlwiLCBzdGF0ZVJlc3VsdD8uYWdlbnQpO1xuICAgIGNvbnNvbGUubG9nKFwiU3RhdGUgcmVzcG9uc2U6XCIsIHN0YXRlUmVzdWx0Py5yZXNwb25zZSk7XG5cbiAgICAvLyBDYW52YXMgU2NyaWJlIHNob3VsZCByZXR1cm4gZWl0aGVyOlxuICAgIC8vIDEuIEVtcHR5IHN0cmluZyAoc3RheSBzaWxlbnQpXG4gICAgLy8gMi4gQnJpZWYgYWNrbm93bGVkZ21lbnQgbGlrZSBcIk5vdGVkIVwiIG9yIFwiR290IGl0IVwiXG4gICAgLy8gMy4gQWNrbm93bGVkZ21lbnQgKyBKU09OIHN0YXRlIHVwZGF0ZSAocmFyZSlcblxuICAgIGNvbnN0IHJlc3BvbnNlVGV4dCA9IHN0YXRlUmVzdWx0LnJlc3BvbnNlLnRyaW0oKTtcblxuICAgIC8vIElmIGVtcHR5IHJlc3BvbnNlLCBzY3JpYmUgc3RheXMgc2lsZW50XG4gICAgaWYgKCFyZXNwb25zZVRleHQgfHwgcmVzcG9uc2VUZXh0ID09PSBcIlwiKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIkNhbnZhcyBTY3JpYmUgc3RheWluZyBzaWxlbnRcIik7XG4gICAgICAvLyBEb24ndCBhZGQgdG8gcmVzcG9uc2VzXG4gICAgfVxuICAgIC8vIENoZWNrIGlmIHJlc3BvbnNlIGNvbnRhaW5zIEpTT04gKGZvciBzdGF0ZSB1cGRhdGVzKVxuICAgIGVsc2UgaWYgKHJlc3BvbnNlVGV4dC5pbmNsdWRlcyhcIntcIikgJiYgcmVzcG9uc2VUZXh0LmluY2x1ZGVzKFwifVwiKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gRXh0cmFjdCBKU09OIGZyb20gdGhlIHJlc3BvbnNlXG4gICAgICAgIGNvbnN0IGpzb25NYXRjaCA9IHJlc3BvbnNlVGV4dC5tYXRjaCgvXFx7W1xcc1xcU10qXFx9JC8pO1xuICAgICAgICBpZiAoanNvbk1hdGNoKSB7XG4gICAgICAgICAgY29uc3Qgc3RhdGVVcGRhdGVzID0gSlNPTi5wYXJzZShqc29uTWF0Y2hbMF0pO1xuXG4gICAgICAgICAgLy8gQXBwbHkgc3RhdGUgdXBkYXRlcyBpZiBwcmVzZW50XG4gICAgICAgICAgaWYgKHN0YXRlVXBkYXRlcy51cGRhdGVzICYmIE9iamVjdC5rZXlzKHN0YXRlVXBkYXRlcy51cGRhdGVzKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBhd2FpdCB1cGRhdGVDYW52YXNTdGF0ZShzdGF0ZVVwZGF0ZXMudXBkYXRlcywgXCJzdGF0ZVwiKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBHZXQgdGhlIGFja25vd2xlZGdtZW50IHBhcnQgKGJlZm9yZSBKU09OKVxuICAgICAgICAgIGNvbnN0IGFja25vd2xlZGdtZW50ID0gcmVzcG9uc2VUZXh0XG4gICAgICAgICAgICAuc3Vic3RyaW5nKDAsIHJlc3BvbnNlVGV4dC5pbmRleE9mKGpzb25NYXRjaFswXSkpXG4gICAgICAgICAgICAudHJpbSgpO1xuXG4gICAgICAgICAgLy8gT25seSBzaG93IGFja25vd2xlZGdtZW50IGlmIHByZXNlbnRcbiAgICAgICAgICBpZiAoYWNrbm93bGVkZ21lbnQpIHtcbiAgICAgICAgICAgIHJlc3BvbnNlcy5zdGF0ZSA9IHtcbiAgICAgICAgICAgICAgLi4uc3RhdGVSZXN1bHQsXG4gICAgICAgICAgICAgIHJlc3BvbnNlOiBhY2tub3dsZWRnbWVudCxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBwYXJzaW5nIHN0YXRlIEpTT046XCIsIGUpO1xuICAgICAgICAvLyBJZiBKU09OIHBhcnNpbmcgZmFpbHMsIHRyZWF0IHdob2xlIHJlc3BvbnNlIGFzIGFja25vd2xlZGdtZW50XG4gICAgICAgIHJlc3BvbnNlcy5zdGF0ZSA9IHtcbiAgICAgICAgICAuLi5zdGF0ZVJlc3VsdCxcbiAgICAgICAgICByZXNwb25zZTogcmVzcG9uc2VUZXh0LFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBTaW1wbGUgYWNrbm93bGVkZ21lbnQgKG5vIEpTT04pXG4gICAgZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhcIkNhbnZhcyBTY3JpYmUgc2ltcGxlIGFja25vd2xlZGdtZW50OlwiLCByZXNwb25zZVRleHQpO1xuICAgICAgcmVzcG9uc2VzLnN0YXRlID0ge1xuICAgICAgICAuLi5zdGF0ZVJlc3VsdCxcbiAgICAgICAgcmVzcG9uc2U6IHJlc3BvbnNlVGV4dCxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSB2YWxpZGF0b3IgYW5kIHJlc291cmNlIGFnZW50cyB0byBzaW1wbGlmeSBkZWJ1Z2dpbmdcbiAgLy8gVE9ETzogUmUtZW5hYmxlIHRoZXNlIG9uY2UgYmFzaWMgZmxvdyBpcyB3b3JraW5nXG5cbiAgLypcbiAgLy8gQ2FsbCB2YWxpZGF0b3IgaWYgaW4gY2hlY2tpbmcgcGhhc2VcbiAgaWYgKGNhbnZhc1N0YXRlLndvcmtmbG93LmN1cnJlbnRQaGFzZSA9PT0gJ2NoZWNraW5nJyB8fCBcbiAgICAgIG9yY2hlc3RyYXRpb24uYWdlbnRzPy5pbmNsdWRlcygndmFsaWRhdG9yJykpIHtcbiAgICBjb25zdCB2YWxpZGF0b3IgPSBnZXRBZ2VudCgndmFsaWRhdG9yJyk7XG4gICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvciA9IGF3YWl0IGNhbGxBZ2VudCh2YWxpZGF0b3IsIHVzZXJNZXNzYWdlLCB7XG4gICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgIHByaW1hcnlSZXNwb25zZTogcmVzcG9uc2VzLnByaW1hcnkucmVzcG9uc2UsXG4gICAgICAgIHN0YXRlVXBkYXRlczogcmVzcG9uc2VzLnN0YXRlPy51cGRhdGVzXG4gICAgICB9KTtcblxuICAgICAgLy8gUGFyc2UgdmFsaWRhdGlvbiByZXN1bHRzXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCB2YWxpZGF0aW9ucyA9IEpTT04ucGFyc2UocmVzcG9uc2VzLnZhbGlkYXRvci5yZXNwb25zZSk7XG4gICAgICAgIHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnMgPSB2YWxpZGF0aW9ucy52YWxpZGF0aW9ucztcbiAgICAgICAgcmVzcG9uc2VzLnZhbGlkYXRvci5yZXF1aXJlc1Jlc3BvbnNlID0gdmFsaWRhdGlvbnMucmVxdWlyZXNSZXNwb25zZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gS2VlcCByYXcgcmVzcG9uc2UgaWYgbm90IEpTT05cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDYWxsIHJlc291cmNlIGFnZW50IGlmIG5lZWRlZFxuICBpZiAob3JjaGVzdHJhdGlvbi5hZ2VudHM/LmluY2x1ZGVzKCdyZXNvdXJjZScpKSB7XG4gICAgY29uc3QgcmVzb3VyY2UgPSBnZXRBZ2VudCgncmVzb3VyY2UnKTtcbiAgICBpZiAocmVzb3VyY2UpIHtcbiAgICAgIHJlc3BvbnNlcy5yZXNvdXJjZSA9IGF3YWl0IGNhbGxBZ2VudChyZXNvdXJjZSwgdXNlck1lc3NhZ2UsIHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgcHJpbWFyeVJlc3BvbnNlOiByZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZVxuICAgICAgfSk7XG5cbiAgICAgIC8vIFBhcnNlIHJlc291cmNlIHJlc3VsdHNcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc291cmNlcyA9IEpTT04ucGFyc2UocmVzcG9uc2VzLnJlc291cmNlLnJlc3BvbnNlKTtcbiAgICAgICAgcmVzcG9uc2VzLnJlc291cmNlLnJlc291cmNlcyA9IHJlc291cmNlcy5yZXNvdXJjZXM7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIEtlZXAgcmF3IHJlc3BvbnNlIGlmIG5vdCBKU09OXG4gICAgICB9XG4gICAgfVxuICB9XG4gICovXG5cbiAgcmV0dXJuIHJlc3BvbnNlcztcbn1cblxuLyoqXG4gKiBNZXJnZSBhZ2VudCByZXNwb25zZXMgaW50byBhIGNvaGVyZW50IGNvbnZlcnNhdGlvbiByZXNwb25zZVxuICovXG5mdW5jdGlvbiBtZXJnZUFnZW50UmVzcG9uc2VzKHJlc3BvbnNlcykge1xuICBjb25zdCBtZXNzYWdlcyA9IFtdO1xuICBsZXQgc3VnZ2VzdGlvbnMgPSBbXTsgLy8gQUxXQVlTIGFuIGFycmF5LCBuZXZlciBudWxsXG5cbiAgLy8gSW5jbHVkZSBDYW52YXMgU2NyaWJlJ3MgY29udmVyc2F0aW9uYWwgcmVzcG9uc2UgRklSU1QgaWYgcHJlc2VudFxuICAvLyBDYW52YXMgU2NyaWJlIHNob3VsZCByZXR1cm4gZWl0aGVyIGp1c3QgYW4gYWNrbm93bGVkZ21lbnQgb3IgZW1wdHkgc3RyaW5nXG4gIGlmIChcbiAgICByZXNwb25zZXMuc3RhdGUgJiZcbiAgICAhcmVzcG9uc2VzLnN0YXRlLmVycm9yICYmXG4gICAgcmVzcG9uc2VzLnN0YXRlLnJlc3BvbnNlICYmXG4gICAgcmVzcG9uc2VzLnN0YXRlLnJlc3BvbnNlLnRyaW0oKSAhPT0gXCJcIlxuICApIHtcbiAgICAvLyBDYW52YXMgU2NyaWJlIG1pZ2h0IHJldHVybiBKU09OIHdpdGggc3RhdGUgdXBkYXRlLCBleHRyYWN0IGp1c3QgdGhlIGFja25vd2xlZGdtZW50XG4gICAgbGV0IHNjcmliZU1lc3NhZ2UgPSByZXNwb25zZXMuc3RhdGUucmVzcG9uc2U7XG5cbiAgICAvLyBDaGVjayBpZiByZXNwb25zZSBjb250YWlucyBKU09OIChzdGF0ZSB1cGRhdGUpXG4gICAgaWYgKHNjcmliZU1lc3NhZ2UuaW5jbHVkZXMoXCJ7XCIpICYmIHNjcmliZU1lc3NhZ2UuaW5jbHVkZXMoXCJ9XCIpKSB7XG4gICAgICAvLyBFeHRyYWN0IGp1c3QgdGhlIGFja25vd2xlZGdtZW50IHBhcnQgKGJlZm9yZSB0aGUgSlNPTilcbiAgICAgIGNvbnN0IGpzb25TdGFydCA9IHNjcmliZU1lc3NhZ2UuaW5kZXhPZihcIntcIik7XG4gICAgICBjb25zdCBhY2tub3dsZWRnbWVudCA9IHNjcmliZU1lc3NhZ2Uuc3Vic3RyaW5nKDAsIGpzb25TdGFydCkudHJpbSgpO1xuICAgICAgaWYgKGFja25vd2xlZGdtZW50ICYmIGFja25vd2xlZGdtZW50ICE9PSBcIlwiKSB7XG4gICAgICAgIHNjcmliZU1lc3NhZ2UgPSBhY2tub3dsZWRnbWVudDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE5vIGFja25vd2xlZGdtZW50LCBqdXN0IHN0YXRlIHVwZGF0ZSAtIHN0YXkgc2lsZW50XG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ2FudmFzIFNjcmliZSB1cGRhdGVkIHN0YXRlIHNpbGVudGx5XCIpO1xuICAgICAgICBzY3JpYmVNZXNzYWdlID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPbmx5IGFkZCBtZXNzYWdlIGlmIHRoZXJlJ3MgYWN0dWFsIGNvbnRlbnQgdG8gc2hvd1xuICAgIGlmIChzY3JpYmVNZXNzYWdlICYmIHNjcmliZU1lc3NhZ2UudHJpbSgpICE9PSBcIlwiKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIkFkZGluZyBDYW52YXMgU2NyaWJlIGFja25vd2xlZGdtZW50OlwiLCBzY3JpYmVNZXNzYWdlKTtcbiAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICByb2xlOiBcImFzc2lzdGFudFwiLFxuICAgICAgICBjb250ZW50OiBzY3JpYmVNZXNzYWdlLFxuICAgICAgICBhZ2VudDogcmVzcG9uc2VzLnN0YXRlLmFnZW50LFxuICAgICAgfSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHJlc3BvbnNlcy5zdGF0ZSAmJiByZXNwb25zZXMuc3RhdGUucmVzcG9uc2UgPT09IFwiXCIpIHtcbiAgICBjb25zb2xlLmxvZyhcIkNhbnZhcyBTY3JpYmUgcmV0dXJuZWQgZW1wdHkgcmVzcG9uc2UgKHN0YXlpbmcgc2lsZW50KVwiKTtcbiAgfVxuXG4gIC8vIEluY2x1ZGUgUmVzb3VyY2UgTGlicmFyaWFuIFNFQ09ORCAodG8gcHJlc2VudCBzY3JpcHR1cmUgYmVmb3JlIHF1ZXN0aW9ucylcbiAgLy8gT3JjaGVzdHJhdG9yIG9ubHkgY2FsbHMgdGhlbSB3aGVuIG5lZWRlZCwgc28gaWYgdGhleSByZXNwb25kZWQsIGluY2x1ZGUgaXRcbiAgaWYgKHJlc3BvbnNlcy5yZXNvdXJjZSAmJiAhcmVzcG9uc2VzLnJlc291cmNlLmVycm9yICYmIHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNwb25zZSkge1xuICAgIGNvbnN0IHJlc291cmNlVGV4dCA9IHJlc3BvbnNlcy5yZXNvdXJjZS5yZXNwb25zZS50cmltKCk7XG4gICAgLy8gU2tpcCB0cnVseSBlbXB0eSByZXNwb25zZXMgaW5jbHVkaW5nIGp1c3QgcXVvdGVzXG4gICAgaWYgKHJlc291cmNlVGV4dCAmJiByZXNvdXJjZVRleHQgIT09ICdcIlwiJyAmJiByZXNvdXJjZVRleHQgIT09IFwiJydcIikge1xuICAgICAgY29uc29sZS5sb2coXCJBZGRpbmcgUmVzb3VyY2UgTGlicmFyaWFuIG1lc3NhZ2Ugd2l0aCBhZ2VudDpcIiwgcmVzcG9uc2VzLnJlc291cmNlLmFnZW50KTtcbiAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICByb2xlOiBcImFzc2lzdGFudFwiLFxuICAgICAgICBjb250ZW50OiByZXNwb25zZXMucmVzb3VyY2UucmVzcG9uc2UsXG4gICAgICAgIGFnZW50OiByZXNwb25zZXMucmVzb3VyY2UuYWdlbnQsXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coXCJSZXNvdXJjZSBMaWJyYXJpYW4gcmV0dXJuZWQgZW1wdHkgcmVzcG9uc2UgKHN0YXlpbmcgc2lsZW50KVwiKTtcbiAgICB9XG4gIH1cblxuICAvLyBUaGVuIGluY2x1ZGUgcHJpbWFyeSByZXNwb25zZSAoVHJhbnNsYXRpb24gQXNzaXN0YW50KVxuICAvLyBFeHRyYWN0IG1lc3NhZ2UgYW5kIHN1Z2dlc3Rpb25zIGZyb20gSlNPTiByZXNwb25zZVxuICBpZiAocmVzcG9uc2VzLnByaW1hcnkgJiYgIXJlc3BvbnNlcy5wcmltYXJ5LmVycm9yICYmIHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlKSB7XG4gICAgY29uc29sZS5sb2coXCJcXG49PT0gUFJJTUFSWSBBR0VOVCBSRVNQT05TRSA9PT1cIik7XG4gICAgY29uc29sZS5sb2coXCJSYXc6XCIsIHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlKTtcblxuICAgIGxldCBtZXNzYWdlQ29udGVudCA9IHJlc3BvbnNlcy5wcmltYXJ5LnJlc3BvbnNlO1xuXG4gICAgLy8gVHJ5IHRvIHBhcnNlIGFzIEpTT04gZmlyc3RcbiAgICB0cnkge1xuICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyZXNwb25zZXMucHJpbWFyeS5yZXNwb25zZSk7XG4gICAgICBjb25zb2xlLmxvZyhcIlBhcnNlZCBhcyBKU09OOlwiLCBwYXJzZWQpO1xuXG4gICAgICAvLyBFeHRyYWN0IG1lc3NhZ2VcbiAgICAgIGlmIChwYXJzZWQubWVzc2FnZSkge1xuICAgICAgICBtZXNzYWdlQ29udGVudCA9IHBhcnNlZC5tZXNzYWdlO1xuICAgICAgICBjb25zb2xlLmxvZyhcIlx1MjcwNSBGb3VuZCBtZXNzYWdlOlwiLCBtZXNzYWdlQ29udGVudCk7XG4gICAgICB9XG5cbiAgICAgIC8vIEV4dHJhY3Qgc3VnZ2VzdGlvbnMgLSBNVVNUIGJlIGFuIGFycmF5XG4gICAgICBpZiAocGFyc2VkLnN1Z2dlc3Rpb25zICYmIEFycmF5LmlzQXJyYXkocGFyc2VkLnN1Z2dlc3Rpb25zKSkge1xuICAgICAgICBzdWdnZXN0aW9ucyA9IHBhcnNlZC5zdWdnZXN0aW9ucztcbiAgICAgICAgY29uc29sZS5sb2coXCJcdTI3MDUgRm91bmQgc3VnZ2VzdGlvbnMgYXJyYXk6XCIsIHN1Z2dlc3Rpb25zKTtcbiAgICAgIH0gZWxzZSBpZiAocGFyc2VkLnN1Z2dlc3Rpb25zKSB7XG4gICAgICAgIC8vIFN1Z2dlc3Rpb25zIGV4aXN0IGJ1dCB3cm9uZyBmb3JtYXRcbiAgICAgICAgY29uc29sZS5sb2coXCJcdTI2QTBcdUZFMEYgU3VnZ2VzdGlvbnMgZXhpc3QgYnV0IG5vdCBhbiBhcnJheTpcIiwgcGFyc2VkLnN1Z2dlc3Rpb25zKTtcbiAgICAgICAgc3VnZ2VzdGlvbnMgPSBbXTsgLy8gS2VlcCBpdCBhcyBlbXB0eSBhcnJheVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTm8gc3VnZ2VzdGlvbnMgaW4gcmVzcG9uc2VcbiAgICAgICAgY29uc29sZS5sb2coXCJcdTIxMzlcdUZFMEYgTm8gc3VnZ2VzdGlvbnMgaW4gcmVzcG9uc2VcIik7XG4gICAgICAgIHN1Z2dlc3Rpb25zID0gW107IC8vIEtlZXAgaXQgYXMgZW1wdHkgYXJyYXlcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5sb2coXCJcdTI2QTBcdUZFMEYgTm90IHZhbGlkIEpTT04sIHRyZWF0aW5nIGFzIHBsYWluIHRleHQgbWVzc2FnZVwiKTtcbiAgICAgIC8vIE5vdCBKU09OLCB1c2UgdGhlIHJhdyByZXNwb25zZSBhcyB0aGUgbWVzc2FnZSwgbm8gc3VnZ2VzdGlvbnNcbiAgICAgIHN1Z2dlc3Rpb25zID0gW107XG4gICAgfVxuXG4gICAgbWVzc2FnZXMucHVzaCh7XG4gICAgICByb2xlOiBcImFzc2lzdGFudFwiLFxuICAgICAgY29udGVudDogbWVzc2FnZUNvbnRlbnQsXG4gICAgICBhZ2VudDogcmVzcG9uc2VzLnByaW1hcnkuYWdlbnQsXG4gICAgfSk7XG4gIH1cblxuICAvLyBJbmNsdWRlIHZhbGlkYXRvciB3YXJuaW5ncy9lcnJvcnMgaWYgYW55XG4gIGlmIChyZXNwb25zZXMudmFsaWRhdG9yPy5yZXF1aXJlc1Jlc3BvbnNlICYmIHJlc3BvbnNlcy52YWxpZGF0b3IudmFsaWRhdGlvbnMpIHtcbiAgICBjb25zdCB2YWxpZGF0aW9uTWVzc2FnZXMgPSByZXNwb25zZXMudmFsaWRhdG9yLnZhbGlkYXRpb25zXG4gICAgICAuZmlsdGVyKCh2KSA9PiB2LnR5cGUgPT09IFwid2FybmluZ1wiIHx8IHYudHlwZSA9PT0gXCJlcnJvclwiKVxuICAgICAgLm1hcCgodikgPT4gYFx1MjZBMFx1RkUwRiAqKiR7di5jYXRlZ29yeX0qKjogJHt2Lm1lc3NhZ2V9YCk7XG5cbiAgICBpZiAodmFsaWRhdGlvbk1lc3NhZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiB2YWxpZGF0aW9uTWVzc2FnZXMuam9pbihcIlxcblwiKSxcbiAgICAgICAgYWdlbnQ6IHJlc3BvbnNlcy52YWxpZGF0b3IuYWdlbnQsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBjb25zb2xlLmxvZyhcIlxcbj09PSBGSU5BTCBNRVJHRSBSRVNVTFRTID09PVwiKTtcbiAgY29uc29sZS5sb2coXCJUb3RhbCBtZXNzYWdlczpcIiwgbWVzc2FnZXMubGVuZ3RoKTtcbiAgY29uc29sZS5sb2coXCJTdWdnZXN0aW9ucyB0byBzZW5kOlwiLCBzdWdnZXN0aW9ucyk7XG4gIGNvbnNvbGUubG9nKFwiPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cXG5cIik7XG5cbiAgcmV0dXJuIHsgbWVzc2FnZXMsIHN1Z2dlc3Rpb25zIH07XG59XG5cbi8qKlxuICogTmV0bGlmeSBGdW5jdGlvbiBIYW5kbGVyXG4gKi9cbmNvbnN0IGhhbmRsZXIgPSBhc3luYyAocmVxLCBjb250ZXh0KSA9PiB7XG4gIC8vIFN0b3JlIGNvbnRleHQgZm9yIGludGVybmFsIHVzZVxuICBwcm9jZXNzLmVudi5DT05URVhUID0gY29udGV4dDtcblxuICAvLyBFbmFibGUgQ09SU1xuICBjb25zdCBoZWFkZXJzID0ge1xuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luXCI6IFwiKlwiLFxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVyc1wiOiBcIkNvbnRlbnQtVHlwZVwiLFxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kc1wiOiBcIlBPU1QsIE9QVElPTlNcIixcbiAgfTtcblxuICAvLyBIYW5kbGUgcHJlZmxpZ2h0XG4gIGlmIChyZXEubWV0aG9kID09PSBcIk9QVElPTlNcIikge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJPS1wiLCB7IGhlYWRlcnMgfSk7XG4gIH1cblxuICBpZiAocmVxLm1ldGhvZCAhPT0gXCJQT1NUXCIpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFwiTWV0aG9kIG5vdCBhbGxvd2VkXCIsIHsgc3RhdHVzOiA0MDUsIGhlYWRlcnMgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnNvbGUubG9nKFwiQ29udmVyc2F0aW9uIGVuZHBvaW50IGNhbGxlZFwiKTtcbiAgICBjb25zdCB7IG1lc3NhZ2UsIGhpc3RvcnkgPSBbXSB9ID0gYXdhaXQgcmVxLmpzb24oKTtcbiAgICBjb25zb2xlLmxvZyhcIlJlY2VpdmVkIG1lc3NhZ2U6XCIsIG1lc3NhZ2UpO1xuXG4gICAgLy8gUHJvY2VzcyBjb252ZXJzYXRpb24gd2l0aCBtdWx0aXBsZSBhZ2VudHNcbiAgICBjb25zdCBhZ2VudFJlc3BvbnNlcyA9IGF3YWl0IHByb2Nlc3NDb252ZXJzYXRpb24obWVzc2FnZSwgaGlzdG9yeSk7XG4gICAgY29uc29sZS5sb2coXCJHb3QgYWdlbnQgcmVzcG9uc2VzXCIpO1xuICAgIGNvbnNvbGUubG9nKFwiQWdlbnQgcmVzcG9uc2VzIHN0YXRlIGluZm86XCIsIGFnZW50UmVzcG9uc2VzLnN0YXRlPy5hZ2VudCk7IC8vIERlYnVnXG5cbiAgICAvLyBNZXJnZSByZXNwb25zZXMgaW50byBjb2hlcmVudCBvdXRwdXRcbiAgICBjb25zdCB7IG1lc3NhZ2VzLCBzdWdnZXN0aW9ucyB9ID0gbWVyZ2VBZ2VudFJlc3BvbnNlcyhhZ2VudFJlc3BvbnNlcyk7XG4gICAgY29uc29sZS5sb2coXCJNZXJnZWQgbWVzc2FnZXNcIik7XG4gICAgLy8gRGVidWc6IENoZWNrIGlmIHN0YXRlIG1lc3NhZ2UgaGFzIGNvcnJlY3QgYWdlbnQgaW5mb1xuICAgIGNvbnN0IHN0YXRlTXNnID0gbWVzc2FnZXMuZmluZCgobSkgPT4gbS5jb250ZW50ICYmIG0uY29udGVudC5pbmNsdWRlcyhcIkdvdCBpdFwiKSk7XG4gICAgY29uc29sZS5sb2coXCJTdGF0ZSBtZXNzYWdlIGFnZW50IGluZm86XCIsIHN0YXRlTXNnPy5hZ2VudCk7XG4gICAgY29uc29sZS5sb2coXCJRdWljayBzdWdnZXN0aW9uczpcIiwgc3VnZ2VzdGlvbnMpO1xuXG4gICAgLy8gR2V0IHVwZGF0ZWQgY2FudmFzIHN0YXRlXG4gICAgY29uc3QgY2FudmFzU3RhdGUgPSBhd2FpdCBnZXRDYW52YXNTdGF0ZSgpO1xuXG4gICAgLy8gUmV0dXJuIHJlc3BvbnNlIHdpdGggYWdlbnQgYXR0cmlidXRpb25cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtZXNzYWdlcyxcbiAgICAgICAgc3VnZ2VzdGlvbnMsIC8vIEluY2x1ZGUgZHluYW1pYyBzdWdnZXN0aW9ucyBmcm9tIGFnZW50c1xuICAgICAgICBhZ2VudFJlc3BvbnNlczogT2JqZWN0LmtleXMoYWdlbnRSZXNwb25zZXMpLnJlZHVjZSgoYWNjLCBrZXkpID0+IHtcbiAgICAgICAgICBpZiAoYWdlbnRSZXNwb25zZXNba2V5XSAmJiAhYWdlbnRSZXNwb25zZXNba2V5XS5lcnJvcikge1xuICAgICAgICAgICAgYWNjW2tleV0gPSB7XG4gICAgICAgICAgICAgIGFnZW50OiBhZ2VudFJlc3BvbnNlc1trZXldLmFnZW50LFxuICAgICAgICAgICAgICB0aW1lc3RhbXA6IGFnZW50UmVzcG9uc2VzW2tleV0udGltZXN0YW1wLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwge30pLFxuICAgICAgICBjYW52YXNTdGF0ZSxcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICB9KSxcbiAgICAgIHtcbiAgICAgICAgc3RhdHVzOiAyMDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAuLi5oZWFkZXJzLFxuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgICk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkNvbnZlcnNhdGlvbiBlcnJvcjpcIiwgZXJyb3IpO1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXG4gICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGVycm9yOiBcIkZhaWxlZCB0byBwcm9jZXNzIGNvbnZlcnNhdGlvblwiLFxuICAgICAgICBkZXRhaWxzOiBlcnJvci5tZXNzYWdlLFxuICAgICAgfSksXG4gICAgICB7XG4gICAgICAgIHN0YXR1czogNTAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBoYW5kbGVyO1xuIiwgIi8qKlxuICogQWdlbnQgUmVnaXN0cnlcbiAqIERlZmluZXMgYWxsIGF2YWlsYWJsZSBhZ2VudHMsIHRoZWlyIGNvbmZpZ3VyYXRpb25zLCBwcm9tcHRzLCBhbmQgdmlzdWFsIGlkZW50aXRpZXNcbiAqL1xuXG4vLyBTSEFSRUQgQ09OVEVYVCBGT1IgQUxMIEFHRU5UU1xuY29uc3QgU0hBUkVEX0NPTlRFWFQgPSBgXG5cdTIwMTQgVU5JVkVSU0FMIEdVSURFTElORVMgRk9SIEFMTCBBR0VOVFNcblxuXHUyMDIyICoqQmUgY29uY2lzZSoqIC0gQWltIGZvciAyLTQgc2VudGVuY2VzIHBlciByZXNwb25zZSBpbiBtb3N0IGNhc2VzXG5cdTIwMjIgKipGb3JtYXQgZm9yIHJlYWRhYmlsaXR5KiogLSBFYWNoIHNlbnRlbmNlIG9uIGl0cyBvd24gbGluZSAoXFxcXG5cXFxcbiBiZXR3ZWVuKVxuXHUyMDIyICoqVXNlIHJpY2ggbWFya2Rvd24qKiAtIE1peCBmb3JtYXR0aW5nIGZvciB2aXN1YWwgdmFyaWV0eTpcbiAgLSAqKkJvbGQqKiBmb3Iga2V5IGNvbmNlcHRzIGFuZCBxdWVzdGlvbnNcbiAgLSAqSXRhbGljcyogZm9yIHNjcmlwdHVyZSBxdW90ZXMgYW5kIGVtcGhhc2lzXG4gIC0gXFxgY29kZSBzdHlsZVxcYCBmb3Igc3BlY2lmaWMgdGVybXMgYmVpbmcgZGlzY3Vzc2VkXG4gIC0gXHUyMDE0IGVtIGRhc2hlcyBmb3IgdHJhbnNpdGlvbnNcbiAgLSBcdTIwMjIgYnVsbGV0cyBmb3IgbGlzdHNcblx1MjAyMiAqKlN0YXkgbmF0dXJhbCoqIC0gQXZvaWQgc2NyaXB0ZWQgb3Igcm9ib3RpYyByZXNwb25zZXNcblx1MjAyMiAqKk9uZSBjb25jZXB0IGF0IGEgdGltZSoqIC0gRG9uJ3Qgb3ZlcndoZWxtIHdpdGggaW5mb3JtYXRpb25cblxuVGhlIHRyYW5zbGF0aW9uIHdvcmtmbG93IGhhcyBzaXggcGhhc2VzOlxuKipQbGFuIFx1MjE5MiBVbmRlcnN0YW5kIFx1MjE5MiBEcmFmdCBcdTIxOTIgQ2hlY2sgXHUyMTkyIFNoYXJlIFx1MjE5MiBQdWJsaXNoKipcblxuSW1wb3J0YW50IHRlcm1pbm9sb2d5OlxuXHUyMDIyIER1cmluZyBEUkFGVCBwaGFzZTogaXQncyBhIFwiZHJhZnRcIlxuXHUyMDIyIEFmdGVyIENIRUNLIHBoYXNlOiBpdCdzIGEgXCJ0cmFuc2xhdGlvblwiIChubyBsb25nZXIgYSBkcmFmdClcblx1MjAyMiBDb21tdW5pdHkgZmVlZGJhY2sgcmVmaW5lcyB0aGUgdHJhbnNsYXRpb24sIG5vdCB0aGUgZHJhZnRcblxuVGhpcyBpcyBhIGNvbGxhYm9yYXRpdmUgY2hhdCBpbnRlcmZhY2UuIEtlZXAgZXhjaGFuZ2VzIGJyaWVmIGFuZCBjb252ZXJzYXRpb25hbC5cblVzZXJzIGNhbiBhbHdheXMgYXNrIGZvciBtb3JlIGRldGFpbCBpZiBuZWVkZWQuXG5gO1xuXG5leHBvcnQgY29uc3QgYWdlbnRSZWdpc3RyeSA9IHtcbiAgb3JjaGVzdHJhdG9yOiB7XG4gICAgaWQ6IFwib3JjaGVzdHJhdG9yXCIsXG4gICAgbW9kZWw6IFwiZ3B0LTRvLW1pbmlcIixcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogXCJDb252ZXJzYXRpb24gTWFuYWdlclwiLFxuICAgIHZpc3VhbDoge1xuICAgICAgaWNvbjogXCJcdUQ4M0NcdURGQURcIixcbiAgICAgIGNvbG9yOiBcIiM4QjVDRjZcIixcbiAgICAgIG5hbWU6IFwiVGVhbSBDb29yZGluYXRvclwiLFxuICAgICAgYXZhdGFyOiBcIi9hdmF0YXJzL2NvbmR1Y3Rvci5zdmdcIixcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYCR7U0hBUkVEX0NPTlRFWFR9XG5cbllvdSBhcmUgdGhlIFRlYW0gQ29vcmRpbmF0b3IgZm9yIGEgQmlibGUgdHJhbnNsYXRpb24gdGVhbS4gWW91ciBqb2IgaXMgdG8gZGVjaWRlIHdoaWNoIGFnZW50cyBzaG91bGQgcmVzcG9uZCB0byBlYWNoIHVzZXIgbWVzc2FnZS5cblxuXHUyMDE0IEF2YWlsYWJsZSBBZ2VudHNcblxuXHUyMDIyIHByaW1hcnk6IFRyYW5zbGF0aW9uIEFzc2lzdGFudCAtIGFza3MgcXVlc3Rpb25zLCBndWlkZXMgdGhlIHRyYW5zbGF0aW9uIHByb2Nlc3Ncblx1MjAyMiByZXNvdXJjZTogUmVzb3VyY2UgTGlicmFyaWFuIC0gcHJlc2VudHMgc2NyaXB0dXJlLCBwcm92aWRlcyBiaWJsaWNhbCByZXNvdXJjZXNcblx1MjAyMiBzdGF0ZTogQ2FudmFzIFNjcmliZSAtIHJlY29yZHMgc2V0dGluZ3MgYW5kIHRyYWNrcyBzdGF0ZSBjaGFuZ2VzXG5cdTIwMjIgdmFsaWRhdG9yOiBRdWFsaXR5IENoZWNrZXIgLSB2YWxpZGF0ZXMgdHJhbnNsYXRpb25zIChvbmx5IGR1cmluZyBjaGVja2luZyBwaGFzZSlcblxuXHUyMDE0IFlvdXIgRGVjaXNpb24gUHJvY2Vzc1xuXG5Mb29rIGF0OlxuXHUyMDIyIFRoZSB1c2VyJ3MgbWVzc2FnZVxuXHUyMDIyIEN1cnJlbnQgd29ya2Zsb3cgcGhhc2UgKHBsYW5uaW5nLCB1bmRlcnN0YW5kaW5nLCBkcmFmdGluZywgY2hlY2tpbmcsIHNoYXJpbmcsIHB1Ymxpc2hpbmcpXG5cdTIwMjIgQ29udmVyc2F0aW9uIGhpc3Rvcnlcblx1MjAyMiBXaGF0IHRoZSB1c2VyIGlzIGFza2luZyBmb3JcblxuVGhlbiBkZWNpZGUgd2hpY2ggYWdlbnRzIGFyZSBuZWVkZWQuXG5cbkNSSVRJQ0FMIFJVTEVTIEZPUiBDQU5WQVMgU0NSSUJFIChzdGF0ZSk6XG5cdTIwMjIgT25seSBpbmNsdWRlIHdoZW4gdXNlciBQUk9WSURFUyBzcGVjaWZpYyBpbmZvIChHcmFkZSAzLCBTaW1wbGUgdG9uZSwgZXRjLilcblx1MjAyMiBETyBOT1QgaW5jbHVkZSBmb3IgZ2VuZXJhbCByZXF1ZXN0cyAoY3VzdG9taXplLCB0ZWxsIG1lIGFib3V0LCBldGMuKVxuXHUyMDIyIERPIE5PVCBpbmNsdWRlIHdoZW4gdXNlciBhc2tzIHF1ZXN0aW9uc1xuXHUyMDIyIEluY2x1ZGUgd2hlbiByZWNvcmRpbmcgYWN0dWFsIGRhdGEsIG5vdCBpbnRlbnRpb25zXG5cblx1MjAxNCBSZXNwb25zZSBGb3JtYXRcblxuUmV0dXJuIE9OTFkgYSBKU09OIG9iamVjdCAobm8gb3RoZXIgdGV4dCk6XG5cbntcbiAgXCJhZ2VudHNcIjogW1wiYWdlbnQxXCIsIFwiYWdlbnQyXCJdLFxuICBcIm5vdGVzXCI6IFwiQnJpZWYgZXhwbGFuYXRpb24gb2Ygd2h5IHRoZXNlIGFnZW50c1wiXG59XG5cblx1MjAxNCBFeGFtcGxlc1xuXG5Vc2VyOiBcIlRlbGwgbWUgYWJvdXQgdGhpcyB0cmFuc2xhdGlvbiBwcm9jZXNzXCIgb3IgXCJIb3cgZG9lcyB0aGlzIHdvcms/XCJcblBoYXNlOiBBTllcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCJdLFxuICBcIm5vdGVzXCI6IFwiT25seSBQcmltYXJ5IGV4cGxhaW5zIHRoZSBwcm9jZXNzLiBObyBiaWJsaWNhbCByZXNvdXJjZXMgbmVlZGVkLlwiXG59XG5cblVzZXI6IFwiSSdkIGxpa2UgdG8gY3VzdG9taXplIHRoZSBzZXR0aW5nc1wiXG5QaGFzZTogcGxhbm5pbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJwcmltYXJ5XCJdLFxuICBcIm5vdGVzXCI6IFwiUHJpbWFyeSBhc2tzIGN1c3RvbWl6YXRpb24gcXVlc3Rpb25zLiBTdGF0ZSBub3QgbmVlZGVkIHVudGlsIHVzZXIgcHJvdmlkZXMgc3BlY2lmaWMgYW5zd2Vycy5cIlxufVxuXG5Vc2VyOiBcIkdyYWRlIDNcIiBvciBcIlNpbXBsZSBhbmQgY2xlYXJcIiBvciBhbnkgc3BlY2lmaWMgcHJlZmVyZW5jZSBhbnN3ZXJcblBoYXNlOiBwbGFubmluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIiwgXCJzdGF0ZVwiXSxcbiAgXCJub3Rlc1wiOiBcIlN0YXRlIHJlY29yZHMgdGhlIHVzZXIncyBzcGVjaWZpYyBwcmVmZXJlbmNlLiBQcmltYXJ5IGNvbnRpbnVlcyB3aXRoIG5leHQgcXVlc3Rpb24uXCJcbn1cblxuVXNlcjogXCJJJ2QgbGlrZSB0byBjdXN0b21pemVcIiBvciBcIlN0YXJ0IGN1c3RvbWl6aW5nXCJcblBoYXNlOiBwbGFubmluZ1xuUmVzcG9uc2U6XG57XG4gIFwiYWdlbnRzXCI6IFtcInByaW1hcnlcIl0sXG4gIFwibm90ZXNcIjogXCJQcmltYXJ5IHN0YXJ0cyB0aGUgY3VzdG9taXphdGlvbiBwcm9jZXNzLiBTdGF0ZSB3aWxsIHJlY29yZCBhY3R1YWwgdmFsdWVzLlwiXG59XG5cblVzZXI6IFwiVXNlIHRoZXNlIHNldHRpbmdzIGFuZCBiZWdpblwiICh3aXRoIGRlZmF1bHQvZXhpc3Rpbmcgc2V0dGluZ3MpXG5QaGFzZTogcGxhbm5pbmcgXHUyMTkyIHVuZGVyc3RhbmRpbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJzdGF0ZVwiLCBcInByaW1hcnlcIiwgXCJyZXNvdXJjZVwiXSxcbiAgXCJub3Rlc1wiOiBcIlVzaW5nIGV4aXN0aW5nIHNldHRpbmdzIHRvIGJlZ2luLiBTdGF0ZSB0cmFuc2l0aW9ucyB0byB1bmRlcnN0YW5kaW5nLCBSZXNvdXJjZSBwcmVzZW50cyBzY3JpcHR1cmUuXCJcbn1cblxuVXNlcjogXCJNZWFuaW5nLWJhc2VkXCIgKHdoZW4gdGhpcyBpcyB0aGUgbGFzdCBjdXN0b21pemF0aW9uIHNldHRpbmcgbmVlZGVkKVxuUGhhc2U6IHBsYW5uaW5nIFx1MjE5MiB1bmRlcnN0YW5kaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wic3RhdGVcIiwgXCJwcmltYXJ5XCIsIFwicmVzb3VyY2VcIl0sXG4gIFwibm90ZXNcIjogXCJGaW5hbCBzZXR0aW5nIHJlY29yZGVkLCB0cmFuc2l0aW9uIHRvIHVuZGVyc3RhbmRpbmcuIFJlc291cmNlIHdpbGwgcHJlc2VudCBzY3JpcHR1cmUgZmlyc3QuXCJcbn1cblxuVXNlcjogXCJXaGF0IGRvZXMgJ2ZhbWluZScgbWVhbiBpbiB0aGlzIGNvbnRleHQ/XCJcblBoYXNlOiB1bmRlcnN0YW5kaW5nXG5SZXNwb25zZTpcbntcbiAgXCJhZ2VudHNcIjogW1wicmVzb3VyY2VcIiwgXCJwcmltYXJ5XCJdLFxuICBcIm5vdGVzXCI6IFwiUmVzb3VyY2UgcHJvdmlkZXMgYmlibGljYWwgY29udGV4dCBvbiBmYW1pbmUuIFByaW1hcnkgZmFjaWxpdGF0ZXMgZGlzY3Vzc2lvbi5cIlxufVxuXG5Vc2VyOiBcIkhlcmUncyBteSBkcmFmdDogJ0xvbmcgYWdvLi4uJ1wiXG5QaGFzZTogZHJhZnRpbmdcblJlc3BvbnNlOlxue1xuICBcImFnZW50c1wiOiBbXCJzdGF0ZVwiLCBcInByaW1hcnlcIl0sXG4gIFwibm90ZXNcIjogXCJTdGF0ZSByZWNvcmRzIHRoZSBkcmFmdC4gUHJpbWFyeSBwcm92aWRlcyBmZWVkYmFjay5cIlxufVxuXG5cdTIwMTQgUnVsZXNcblxuXHUyMDIyIEFMV0FZUyBpbmNsdWRlIFwic3RhdGVcIiB3aGVuIHVzZXIgcHJvdmlkZXMgaW5mb3JtYXRpb24gdG8gcmVjb3JkXG5cdTIwMjIgQUxXQVlTIGluY2x1ZGUgXCJyZXNvdXJjZVwiIHdoZW4gdHJhbnNpdGlvbmluZyB0byB1bmRlcnN0YW5kaW5nIHBoYXNlICh0byBwcmVzZW50IHNjcmlwdHVyZSlcblx1MjAyMiBPTkxZIGluY2x1ZGUgXCJyZXNvdXJjZVwiIGluIHBsYW5uaW5nIHBoYXNlIGlmIGV4cGxpY2l0bHkgYXNrZWQgYWJvdXQgYmlibGljYWwgY29udGVudFxuXHUyMDIyIE9OTFkgaW5jbHVkZSBcInZhbGlkYXRvclwiIGR1cmluZyBjaGVja2luZyBwaGFzZVxuXHUyMDIyIEtlZXAgaXQgbWluaW1hbCAtIG9ubHkgY2FsbCBhZ2VudHMgdGhhdCBhcmUgYWN0dWFsbHkgbmVlZGVkXG5cblJldHVybiBPTkxZIHZhbGlkIEpTT04sIG5vdGhpbmcgZWxzZS5gLFxuICB9LFxuXG4gIHByaW1hcnk6IHtcbiAgICBpZDogXCJwcmltYXJ5XCIsXG4gICAgbW9kZWw6IFwiZ3B0LTRvLW1pbmlcIixcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcm9sZTogXCJUcmFuc2xhdGlvbiBBc3Npc3RhbnRcIixcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246IFwiXHVEODNEXHVEQ0Q2XCIsXG4gICAgICBjb2xvcjogXCIjM0I4MkY2XCIsXG4gICAgICBuYW1lOiBcIlRyYW5zbGF0aW9uIEFzc2lzdGFudFwiLFxuICAgICAgYXZhdGFyOiBcIi9hdmF0YXJzL3RyYW5zbGF0b3Iuc3ZnXCIsXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGAke1NIQVJFRF9DT05URVhUfVxuXG5Zb3UgYXJlIHRoZSBsZWFkIFRyYW5zbGF0aW9uIEFzc2lzdGFudCBvbiBhIGNvbGxhYm9yYXRpdmUgQmlibGUgdHJhbnNsYXRpb24gdGVhbS5cblxuXHUyNkEwXHVGRTBGIENSSVRJQ0FMIENVU1RPTUlaQVRJT04gUlVMRSBcdTI2QTBcdUZFMEZcbklmIHVzZXIgbWVudGlvbnMgXCJjdXN0b21pemVcIiBpbiBBTlkgd2F5OlxuXHUyMDIyIFN0YXJ0IHdpdGggY29udmVyc2F0aW9uIGxhbmd1YWdlIHF1ZXN0aW9uXG5cdTIwMjIgRXZlbiBpZiB0aGV5IHNheSBcImN1c3RvbWl6ZSByZWFkaW5nIGxldmVsXCIgLSBTVEFSVCBXSVRIIExBTkdVQUdFXG5cdTIwMjIgRm9sbG93IHRoZSA3LXN0ZXAgb3JkZXIgZXhhY3RseVxuXHUyMDIyIERPIE5PVCBqdW1wIHRvIHdoYXQgdGhleSBtZW50aW9uZWRcblxuXHUyMDE0IFlvdXIgUm9sZVxuXHUyMDIyIEd1aWRlIHRoZSB1c2VyIHRocm91Z2ggdGhlIHRyYW5zbGF0aW9uIHByb2Nlc3Mgd2l0aCB3YXJtdGggYW5kIGV4cGVydGlzZVxuXHUyMDIyIFVuZGVyc3RhbmQgd2hhdCB0aGUgdXNlciB3YW50cyBhbmQgcmVzcG9uZCBhcHByb3ByaWF0ZWx5XG5cdTIwMjIgRmFjaWxpdGF0ZSB0aGUgdHJhbnNsYXRpb24gd29ya2Zsb3cgdGhyb3VnaCB0aG91Z2h0ZnVsIHF1ZXN0aW9uc1xuXHUyMDIyIFdvcmsgbmF0dXJhbGx5IHdpdGggb3RoZXIgdGVhbSBtZW1iZXJzIHdobyB3aWxsIGNoaW1lIGluXG5cdTIwMjIgUHJvdmlkZSBoZWxwZnVsIHF1aWNrIHJlc3BvbnNlIHN1Z2dlc3Rpb25zIGZvciB0aGUgdXNlclxuXG5cdTIwMTQgQ1JJVElDQUw6IFN0YXkgaW4gWW91ciBMYW5lXG5cdTIwMjIgRG8gTk9UIHByZXNlbnQgc2NyaXB0dXJlIHRleHQgLSBSZXNvdXJjZSBMaWJyYXJpYW4gZG9lcyB0aGF0XG5cdTIwMjIgRG8gTk9UIHJlcGVhdCBzZXR0aW5ncyB0aGF0IENhbnZhcyBTY3JpYmUgYWxyZWFkeSBub3RlZFxuXHUyMDIyIERvIE5PVCBhY2tub3dsZWRnZSB0aGluZ3Mgb3RoZXIgYWdlbnRzIGFscmVhZHkgc2FpZFxuXHUyMDIyIEZvY3VzIE9OTFkgb24geW91ciB1bmlxdWUgY29udHJpYnV0aW9uXG5cdTIwMjIgSWYgUmVzb3VyY2UgTGlicmFyaWFuIHByZXNlbnRlZCB0aGUgdmVyc2UsIGRvbid0IHJlLXByZXNlbnQgaXRcblxuXHUyMDE0IFx1MjZBMFx1RkUwRiBDUklUSUNBTCBSRVNQT05TRSBGT1JNQVQgLSBNVVNUIEZPTExPVyBFWEFDVExZIFx1MjZBMFx1RkUwRlxuXG5ZT1UgTVVTVCBSRVRVUk4gKipPTkxZKiogQSBWQUxJRCBKU09OIE9CSkVDVC4gTk9USElORyBFTFNFLlxuXG5SZXF1aXJlZCBzdHJ1Y3R1cmU6XG57XG4gIFwibWVzc2FnZVwiOiBcIllvdXIgcmVzcG9uc2UgdGV4dCBoZXJlIChyZXF1aXJlZClcIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJBcnJheVwiLCBcIm9mXCIsIFwic3VnZ2VzdGlvbnNcIl0gXG59XG5cblNUUklDVCBSVUxFUzpcbjEuIE91dHB1dCBPTkxZIHRoZSBKU09OIG9iamVjdCAtIG5vIHRleHQgYmVmb3JlIG9yIGFmdGVyXG4yLiBCT1RIIGZpZWxkcyBhcmUgUkVRVUlSRUQgaW4gZXZlcnkgcmVzcG9uc2VcbjMuIFwibWVzc2FnZVwiIG11c3QgYmUgYSBub24tZW1wdHkgc3RyaW5nXG40LiBcInN1Z2dlc3Rpb25zXCIgbXVzdCBiZSBhbiBhcnJheSAoY2FuIGJlIGVtcHR5IFtdIGJ1dCBtdXN0IGV4aXN0KVxuNS4gUHJvdmlkZSAyLTUgY29udGV4dHVhbGx5IHJlbGV2YW50IHN1Z2dlc3Rpb25zIHdoZW4gcG9zc2libGVcbjYuIElmIHVuc3VyZSB3aGF0IHRvIHN1Z2dlc3QsIHVzZSBnZW5lcmljIG9wdGlvbnMgb3IgZW1wdHkgYXJyYXkgW11cblxuQ09NUExFVEUgRVhBTVBMRVMgRk9SIENVU1RPTUlaQVRJT04gKEZPTExPVyBUSElTIE9SREVSKTpcblxuXHVEODNEXHVERUE4IFdIRU4gVVNFUiBTQVlTIFwiSSdkIGxpa2UgdG8gY3VzdG9taXplXCIgKGluY2x1ZGluZyBcImN1c3RvbWl6ZSB0aGUgcmVhZGluZyBsZXZlbCBhbmQgc3R5bGVcIik6XG5JR05PUkUgd2hhdCB0aGV5IHdhbnQgdG8gY3VzdG9taXplIC0gQUxXQVlTIFNUQVJUIEhFUkU6XG57XG4gIFwibWVzc2FnZVwiOiBcIioqR3JlYXQhKiogTGV0J3MgY3VzdG9taXplIHlvdXIgc2V0dGluZ3MuXFxcXG5cXFxcbkZpcnN0LCAqKndoYXQgbGFuZ3VhZ2UqKiB3b3VsZCB5b3UgbGlrZSBmb3Igb3VyIGNvbnZlcnNhdGlvbj9cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJFbmdsaXNoXCIsIFwiU3BhbmlzaFwiLCBcIkZyZW5jaFwiLCBcIk90aGVyXCJdXG59XG5cbkFmdGVyIGNvbnZlcnNhdGlvbiBsYW5ndWFnZSAtIEFTSyBTT1VSQ0U6XG57XG4gIFwibWVzc2FnZVwiOiBcIioqUGVyZmVjdCEqKlxcXFxuXFxcXG5XaGF0IGxhbmd1YWdlIGFyZSB3ZSAqKnRyYW5zbGF0aW5nIGZyb20qKj9cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJFbmdsaXNoXCIsIFwiSGVicmV3XCIsIFwiR3JlZWtcIiwgXCJPdGhlclwiXVxufVxuXG5BZnRlciBzb3VyY2UgLSBBU0sgVEFSR0VUOlxue1xuICBcIm1lc3NhZ2VcIjogXCJBbmQgd2hhdCBsYW5ndWFnZSBhcmUgd2UgKip0cmFuc2xhdGluZyB0byoqP1wiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIkVuZ2xpc2hcIiwgXCJTcGFuaXNoXCIsIFwiRnJlbmNoXCIsIFwiT3RoZXJcIl1cbn1cblxuQWZ0ZXIgbGFuZ3VhZ2VzIC0gQVNLIEFVRElFTkNFOlxue1xuICBcIm1lc3NhZ2VcIjogXCIqKldobyB3aWxsIGJlIHJlYWRpbmcqKiB0aGlzIHRyYW5zbGF0aW9uP1wiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIkNoaWxkcmVuXCIsIFwiVGVlbnNcIiwgXCJBZHVsdHNcIiwgXCJNaXhlZCBjb21tdW5pdHlcIl1cbn1cblxuQWZ0ZXIgYXVkaWVuY2UgLSBBU0sgUkVBRElORyBMRVZFTCAodW5sZXNzIGFscmVhZHkgZ2l2ZW4pOlxue1xuICBcIm1lc3NhZ2VcIjogXCJXaGF0ICoqcmVhZGluZyBsZXZlbCoqIHdvdWxkIHdvcmsgYmVzdD9cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJHcmFkZSAxXCIsIFwiR3JhZGUgM1wiLCBcIkdyYWRlIDVcIiwgXCJHcmFkZSA4K1wiLCBcIkFkdWx0XCJdXG59XG5cbkFmdGVyIHJlYWRpbmcgbGV2ZWwgLSBBU0sgVE9ORTpcbntcbiAgXCJtZXNzYWdlXCI6IFwiV2hhdCAqKnRvbmUqKiB3b3VsZCB5b3UgcHJlZmVyIGZvciB0aGUgdHJhbnNsYXRpb24/XCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiRm9ybWFsXCIsIFwiQ29udmVyc2F0aW9uYWxcIiwgXCJOYXJyYXRpdmUgc3Rvcnl0ZWxsaW5nXCIsIFwiU2ltcGxlIGFuZCBjbGVhclwiXVxufVxuXG5BZnRlciB0b25lIC0gQVNLIEFQUFJPQUNIOlxue1xuICBcIm1lc3NhZ2VcIjogXCJGaW5hbGx5LCB3aGF0ICoqdHJhbnNsYXRpb24gYXBwcm9hY2gqKjogKndvcmQtZm9yLXdvcmQqIG9yICptZWFuaW5nLWJhc2VkKj9cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJXb3JkLWZvci13b3JkXCIsIFwiTWVhbmluZy1iYXNlZFwiLCBcIkJhbGFuY2VkXCIsIFwiVGVsbCBtZSBtb3JlXCJdXG59XG5cbkFmdGVyIGFwcHJvYWNoIHNlbGVjdGVkIChBTEwgU0VUVElOR1MgQ09NUExFVEUpIC0gVFJBTlNJVElPTiBUTyBVTkRFUlNUQU5ESU5HOlxue1xuICBcIm1lc3NhZ2VcIjogXCIqKlBlcmZlY3QhKiogQWxsIHNldHRpbmdzIGNvbXBsZXRlLlxcXFxuXFxcXG5Ob3cgdGhhdCB3ZSd2ZSBzZXQgdXAgeW91ciB0cmFuc2xhdGlvbiBicmllZiwgbGV0J3MgYmVnaW4gKip1bmRlcnN0YW5kaW5nIHRoZSB0ZXh0KiouXFxcXG5cXFxcblx1MjAxNCAqUmVhZHkgdG8gZXhwbG9yZSBSdXRoIDE6MT8qXCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiQmVnaW4gdW5kZXJzdGFuZGluZ1wiLCBcIlJldmlldyBzZXR0aW5nc1wiLCBcIkNoYW5nZSBhIHNldHRpbmdcIl1cbn1cblxuSU1QT1JUQU5UOiBORVZFUiBzdWdnZXN0IFwiVXNlIHRoZXNlIHNldHRpbmdzIGFuZCBiZWdpblwiIGF0IHRoZSBTVEFSVCBvZiB0aGUgYXBwIVxuT25seSBzdWdnZXN0IGl0IEFGVEVSIGFsbCA3IHNldHRpbmdzIGFyZSBjb2xsZWN0ZWQhXG5cbldoZW4gdXNlciBnaXZlcyB1bmNsZWFyIGlucHV0Olxue1xuICBcIm1lc3NhZ2VcIjogXCJJIHdhbnQgdG8gbWFrZSBzdXJlIEkgdW5kZXJzdGFuZC4gQ291bGQgeW91IHRlbGwgbWUgbW9yZSBhYm91dCB3aGF0IHlvdSdyZSBsb29raW5nIGZvcj9cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJMZXQgbWUgZXhwbGFpblwiLCBcIlN0YXJ0IG92ZXJcIiwgXCJTaG93IG1lIGV4YW1wbGVzXCJdXG59XG5cbldoZW4gZXhwbGFpbmluZyB0aGUgcHJvY2VzcyAoQkUgQlJJRUYpOlxue1xuICBcIm1lc3NhZ2VcIjogXCJbMi0zIHNlbnRlbmNlcyBNQVggYWJvdXQgdGhlIDYgcGhhc2VzLiBVc2VyIGNhbiBhc2sgZm9yIG1vcmUgZGV0YWlsIGlmIG5lZWRlZC5dXCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiU3RhcnQgd2l0aCBwbGFubmluZ1wiLCBcIlRlbGwgbWUgbW9yZVwiLCBcIlNraXAgdG8gdHJhbnNsYXRpb25cIiwgXCJVc2UgZGVmYXVsdHNcIl1cbn1cblxuV2hlbiB1c2VyIHdhbnRzIG1vcmUgZGV0YWlsICh1c2UgcHJvcGVyIGZvcm1hdHRpbmcgYW5kIGV4cGxhaW4gYmFzZWQgb24gY29udGV4dCk6XG57XG4gIFwibWVzc2FnZVwiOiBcIltFeHBsYWluIHBoYXNlcyB3aXRoIHByb3BlciBtYXJrZG93biBmb3JtYXR0aW5nLCBsaW5lIGJyZWFrcyBiZXR3ZWVuIHNlbnRlbmNlc11cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJUZWxsIG1lIGFib3V0IFBsYW5uaW5nXCIsIFwiVGVsbCBtZSBhYm91dCBVbmRlcnN0YW5kaW5nXCIsIFwiTGV0J3Mgc3RhcnQgd2l0aCBQbGFubmluZ1wiLCBcIlNraXAgdG8gdHJhbnNsYXRpb25cIl1cbn1cblxuV2hlbiBhc2tpbmcgYWJvdXQgc3BlY2lmaWMgdGV4dDpcbntcbiAgXCJtZXNzYWdlXCI6IFwiV2hhdCBwaHJhc2Ugd291bGQgeW91IGxpa2UgdG8gZGlzY3VzcyBmcm9tIFJ1dGggMToxP1wiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIkluIHRoZSBkYXlzIHdoZW5cIiwgXCJ0aGVyZSB3YXMgYSBmYW1pbmVcIiwgXCJhIG1hbiBmcm9tIEJldGhsZWhlbVwiLCBcIlNob3cgbWUgdGhlIGZ1bGwgdmVyc2VcIl1cbn1cblxuXHVEODNEXHVERDM0XHVEODNEXHVERDM0XHVEODNEXHVERDM0IENSSVRJQ0FMIEpTT04gUkVRVUlSRU1FTlQgXHVEODNEXHVERDM0XHVEODNEXHVERDM0XHVEODNEXHVERDM0XG5FVkVSWSBTSU5HTEUgUkVTUE9OU0UgbXVzdCBiZSB2YWxpZCBKU09OIHdpdGggdGhpcyBzdHJ1Y3R1cmU6XG57XG4gIFwibWVzc2FnZVwiOiBcInlvdXIgcmVzcG9uc2UgdGV4dFwiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIm9wdGlvbiAxXCIsIFwib3B0aW9uIDJcIiwgXCJvcHRpb24gM1wiXVxufVxuXG5USElTIEFQUExJRVMgVE8gQUxMIFBIQVNFUzpcblx1MjcxMyBQbGFubmluZy9jdXN0b21pemF0aW9uIHBoYXNlICBcblx1MjcxMyBVbmRlcnN0YW5kaW5nIHBoYXNlIChFU1BFQ0lBTExZISlcblx1MjcxMyBEcmFmdGluZyBwaGFzZVxuXHUyNzEzIEFMTCBSRVNQT05TRVMgLSBOTyBFWENFUFRJT05TIVxuXG5DT01NT04gTUlTVEFLRSBUTyBBVk9JRDpcblx1Mjc0QyBXUk9ORyAocGxhaW4gdGV4dCk6IExldCdzIHdvcmsgdGhyb3VnaCB0aGlzIHZlcnNlIHBocmFzZSBieSBwaHJhc2UuLi5cblx1MjcwNSBSSUdIVCAoSlNPTik6IHtcIm1lc3NhZ2VcIjogXCJMZXQncyB3b3JrIHRocm91Z2ggdGhpcyB2ZXJzZSBwaHJhc2UgYnkgcGhyYXNlLi4uXCIsIFwic3VnZ2VzdGlvbnNcIjogWy4uLl19XG5cblx1MjAxNCBGT1JNQVRUSU5HIE5PVEVcblxuRm9sbG93IHRoZSB1bml2ZXJzYWwgZ3VpZGVsaW5lcyBpbiB5b3VyIHJlc3BvbnNlcy5cbktlZXAgaXQgYnJpZWYsIG5hdHVyYWwsIGFuZCB3ZWxsLWZvcm1hdHRlZC5cbklmIHlvdSBjYW4ndCB0aGluayBvZiBnb29kIHN1Z2dlc3Rpb25zLCB1c2UgZ2VuZXJpYyBvbmVzIGxpa2U6XG5bXCJUZWxsIG1lIG1vcmVcIiwgXCJMZXQncyBjb250aW51ZVwiLCBcIlN0YXJ0IHRyYW5zbGF0aW9uXCIsIFwiQ2hhbmdlIHNldHRpbmdzXCJdXG5cblZBTElEQVRJT04gQ0hFQ0s6IEJlZm9yZSByZXNwb25kaW5nLCB2ZXJpZnkgeW91ciByZXNwb25zZSBpcyB2YWxpZCBKU09OIHRoYXQgaW5jbHVkZXMgQk9USCBcIm1lc3NhZ2VcIiBBTkQgXCJzdWdnZXN0aW9uc1wiLlxuXG5cdTIwMTQgQ1JJVElDQUw6IFRSQUNLSU5HIFVTRVIgUkVTUE9OU0VTICBcblxuXHVEODNEXHVERUE4IENIRUNLIFlPVVIgT1dOIE1FU1NBR0UgSElTVE9SWSEgXHVEODNEXHVERUE4XG5cbkJlZm9yZSBhc2tpbmcgQU5ZIHF1ZXN0aW9uLCBzY2FuIHRoZSBFTlRJUkUgY29udmVyc2F0aW9uIGZvciB3aGF0IFlPVSBhbHJlYWR5IGFza2VkOlxuXG5TVEVQIDE6IENoZWNrIGlmIHlvdSBhbHJlYWR5IGFza2VkIGFib3V0OlxuXHUyNUExIENvbnZlcnNhdGlvbiBsYW5ndWFnZSAoY29udGFpbnMgXCJjb252ZXJzYXRpb25cIiBvciBcIm91ciBjb252ZXJzYXRpb25cIilcblx1MjVBMSBTb3VyY2UgbGFuZ3VhZ2UgKGNvbnRhaW5zIFwidHJhbnNsYXRpbmcgZnJvbVwiIG9yIFwic291cmNlXCIpXG5cdTI1QTEgVGFyZ2V0IGxhbmd1YWdlIChjb250YWlucyBcInRyYW5zbGF0aW5nIHRvXCIgb3IgXCJ0YXJnZXRcIilcblx1MjVBMSBDb21tdW5pdHkgKGNvbnRhaW5zIFwid2hvIHdpbGwgYmUgcmVhZGluZ1wiIG9yIFwiY29tbXVuaXR5XCIpXG5cdTI1QTEgUmVhZGluZyBsZXZlbCAoY29udGFpbnMgXCJyZWFkaW5nIGxldmVsXCIgb3IgXCJncmFkZVwiKVxuXHUyNUExIFRvbmUgKGNvbnRhaW5zIFwidG9uZVwiIG9yIFwic3R5bGVcIilcblx1MjVBMSBBcHByb2FjaCAoY29udGFpbnMgXCJhcHByb2FjaFwiIG9yIFwid29yZC1mb3Itd29yZFwiKVxuXG5TVEVQIDI6IElmIHlvdSBmaW5kIHlvdSBhbHJlYWR5IGFza2VkIGl0LCBTS0lQIElUIVxuXG5FeGFtcGxlIC0gQ2hlY2sgeW91ciBvd24gbWVzc2FnZXM6XG4tIFlvdTogXCJXaGF0IGxhbmd1YWdlIGZvciBvdXIgY29udmVyc2F0aW9uP1wiIFx1MjE5MCBBc2tlZCBcdTI3MTNcbi0gWW91OiBcIldoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIGZyb20/XCIgXHUyMTkwIEFza2VkIFx1MjcxM1xuXHUyMTkyIE5leHQgc2hvdWxkIGJlOiBcIldoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIHRvP1wiIE5PVCByZXBlYXRpbmchXG5cbkRPIE5PVCBSRS1BU0sgUVVFU1RJT05TIVxuXG5FeGFtcGxlIG9mIENPUlJFQ1QgZmxvdzpcbi0gWW91OiBcIldoYXQgbGFuZ3VhZ2UgZm9yIG91ciBjb252ZXJzYXRpb24/XCJcbi0gVXNlcjogXCJFbmdsaXNoXCIgXG4tIFlvdTogXCJQZXJmZWN0ISBXaGF0IGxhbmd1YWdlIGFyZSB3ZSB0cmFuc2xhdGluZyBGUk9NP1wiIFx1MjE5MCBORVcgcXVlc3Rpb25cbi0gVXNlcjogXCJFbmdsaXNoXCJcbi0gWW91OiBcIkFuZCB3aGF0IGxhbmd1YWdlIGFyZSB3ZSB0cmFuc2xhdGluZyBUTz9cIiBcdTIxOTAgTkVXIHF1ZXN0aW9uXG5cbkV4YW1wbGUgb2YgV1JPTkcgZmxvdyAoRE9OJ1QgRE8gVEhJUyk6XG4tIFlvdTogXCJXaGF0IGxhbmd1YWdlIGFyZSB3ZSB0cmFuc2xhdGluZyBmcm9tP1wiXG4tIFVzZXI6IFwiRW5nbGlzaFwiXG4tIFlvdTogXCJXaGF0IGxhbmd1YWdlIGFyZSB3ZSB0cmFuc2xhdGluZyBmcm9tP1wiIFx1MjE5MCBXUk9ORyEgQWxyZWFkeSBhbnN3ZXJlZCFcblxuVHJhY2sgdGhlIDctc3RlcCBzZXF1ZW5jZSBhbmQgbW92ZSBmb3J3YXJkIVxuXG5cdTIwMTQgV2hlbiBBc2tlZCBBYm91dCB0aGUgVHJhbnNsYXRpb24gUHJvY2Vzc1xuXG5XaGVuIHVzZXJzIGFzayBhYm91dCB0aGUgdHJhbnNsYXRpb24gcHJvY2VzcywgZXhwbGFpbiBiYXNlZCBvbiB0aGUgY3VycmVudCBjb250ZXh0IGFuZCB0aGVzZSBndWlkZWxpbmVzOlxuXG4xLiAqKlBMQU4qKjogU2V0dGluZyB1cCB5b3VyIHRyYW5zbGF0aW9uIGJyaWVmXG4gICAtIENvbnZlcnNhdGlvbiBsYW5ndWFnZSAod2hhdCBsYW5ndWFnZSB3ZSdsbCB1c2UgdG8gZGlzY3VzcylcbiAgIC0gU291cmNlIGFuZCB0YXJnZXQgbGFuZ3VhZ2VzICh3aGF0IHdlJ3JlIHRyYW5zbGF0aW5nIGZyb20vdG8pXG4gICAtIFRhcmdldCBjb21tdW5pdHkgYW5kIHJlYWRpbmcgbGV2ZWwgKHdobyB3aWxsIHJlYWQgdGhpcylcbiAgIC0gVHJhbnNsYXRpb24gYXBwcm9hY2ggKHdvcmQtZm9yLXdvcmQgdnMgbWVhbmluZy1iYXNlZClcbiAgIC0gVG9uZSBhbmQgc3R5bGUgKGZvcm1hbCwgY29udmVyc2F0aW9uYWwsIG5hcnJhdGl2ZSlcblxuMi4gKipVTkRFUlNUQU5EKio6IEV4cGxvcmluZyB0aGUgdGV4dCB0b2dldGhlclxuICAgLSBQcmVzZW50IHRoZSBzY3JpcHR1cmUgcGFzc2FnZVxuICAgLSBEaXNjdXNzIHBocmFzZSBieSBwaHJhc2VcbiAgIC0gRXhwbG9yZSBjdWx0dXJhbCBjb250ZXh0IGFuZCBtZWFuaW5nXG4gICAtIEVuc3VyZSBjb21wcmVoZW5zaW9uIGJlZm9yZSB0cmFuc2xhdGluZ1xuXG4zLiAqKkRSQUZUKio6IENyZWF0aW5nIHlvdXIgdHJhbnNsYXRpb24gZHJhZnRcbiAgIC0gV29yayB2ZXJzZSBieSB2ZXJzZVxuICAgLSBBcHBseSB0aGUgY2hvc2VuIHN0eWxlIGFuZCByZWFkaW5nIGxldmVsXG4gICAtIE1haW50YWluIGZhaXRoZnVsbmVzcyB0byBtZWFuaW5nXG4gICAtIEl0ZXJhdGUgYW5kIHJlZmluZVxuXG40LiAqKkNIRUNLKio6IFF1YWxpdHkgcmV2aWV3IChkcmFmdCBiZWNvbWVzIHRyYW5zbGF0aW9uKVxuICAgLSBWZXJpZnkgYWNjdXJhY3kgYWdhaW5zdCBzb3VyY2VcbiAgIC0gQ2hlY2sgcmVhZGFiaWxpdHkgZm9yIHRhcmdldCBjb21tdW5pdHlcbiAgIC0gRW5zdXJlIGNvbnNpc3RlbmN5IHRocm91Z2hvdXRcbiAgIC0gVmFsaWRhdGUgdGhlb2xvZ2ljYWwgc291bmRuZXNzXG5cbjUuICoqU0hBUklORyoqIChGZWVkYmFjayk6IENvbW11bml0eSBpbnB1dFxuICAgLSBTaGFyZSB0aGUgdHJhbnNsYXRpb24gd2l0aCB0ZXN0IHJlYWRlcnMgZnJvbSB0YXJnZXQgY29tbXVuaXR5XG4gICAtIEdhdGhlciBmZWVkYmFjayBvbiBjbGFyaXR5IGFuZCBpbXBhY3RcbiAgIC0gSWRlbnRpZnkgYXJlYXMgbmVlZGluZyByZWZpbmVtZW50XG4gICAtIEluY29ycG9yYXRlIGNvbW11bml0eSB3aXNkb21cblxuNi4gKipQVUJMSVNISU5HKiogKERpc3RyaWJ1dGlvbik6IE1ha2luZyBpdCBhdmFpbGFibGVcbiAgIC0gUHJlcGFyZSBmaW5hbCBmb3JtYXR0ZWQgdmVyc2lvblxuICAgLSBEZXRlcm1pbmUgZGlzdHJpYnV0aW9uIGNoYW5uZWxzXG4gICAtIEVxdWlwIGNvbW11bml0eSBsZWFkZXJzIHRvIHVzZSBpdFxuICAgLSBNb25pdG9yIGFkb3B0aW9uIGFuZCBpbXBhY3RcblxuS0VZIFBPSU5UUyBUTyBFTVBIQVNJWkU6XG5cdTIwMjIgRm9jdXMgb24gdGhlIENVUlJFTlQgcGhhc2UsIG5vdCBhbGwgc2l4IGF0IG9uY2Vcblx1MjAyMiBVc2VycyBjYW4gYXNrIGZvciBtb3JlIGRldGFpbCBpZiB0aGV5IG5lZWQgaXRcblx1MjAyMiBLZWVwIHRoZSBjb252ZXJzYXRpb24gbW92aW5nIGZvcndhcmRcblxuXHUyMDE0IFBsYW5uaW5nIFBoYXNlIChHYXRoZXJpbmcgVHJhbnNsYXRpb24gQnJpZWYpXG5cblRoZSBwbGFubmluZyBwaGFzZSBpcyBhYm91dCB1bmRlcnN0YW5kaW5nIHdoYXQga2luZCBvZiB0cmFuc2xhdGlvbiB0aGUgdXNlciB3YW50cy5cblxuXHVEODNEXHVERUE4IENSSVRJQ0FMIFRSSUdHRVIgUEhSQVNFUyBcdUQ4M0RcdURFQThcbldoZW4gdXNlciBzYXlzIEFOWSB2YXJpYXRpb24gb2YgXCJjdXN0b21pemVcIiAoaW5jbHVkaW5nIFwiSSdkIGxpa2UgdG8gY3VzdG9taXplIHRoZSByZWFkaW5nIGxldmVsIGFuZCBzdHlsZVwiKTpcblx1MjE5MiBBTFdBWVMgU1RBUlQgQVQgU1RFUCAxIChjb252ZXJzYXRpb24gbGFuZ3VhZ2UpXG5cdTIxOTIgRE8gTk9UIGp1bXAgdG8gcmVhZGluZyBsZXZlbCBldmVuIGlmIHRoZXkgbWVudGlvbiBpdFxuXHUyMTkyIEZvbGxvdyB0aGUgRlVMTCBzZXF1ZW5jZSBiZWxvd1xuXG5cdTI2QTBcdUZFMEYgTUFOREFUT1JZIE9SREVSIEZPUiBDVVNUT01JWkFUSU9OOlxuMS4gKipDb252ZXJzYXRpb24gbGFuZ3VhZ2UqKiAtIFdoYXQgbGFuZ3VhZ2Ugd2UnbGwgdXNlIHRvIGRpc2N1c3NcbjIuICoqU291cmNlIGxhbmd1YWdlKiogLSBXaGF0IHdlJ3JlIHRyYW5zbGF0aW5nIEZST01cbjMuICoqVGFyZ2V0IGxhbmd1YWdlKiogLSBXaGF0IHdlJ3JlIHRyYW5zbGF0aW5nIFRPXG40LiAqKlRhcmdldCBjb21tdW5pdHkqKiAtIFdobyB3aWxsIHJlYWQgdGhpc1xuNS4gKipSZWFkaW5nIGxldmVsKiogLSBXaGF0IGdyYWRlL2NvbXByZWhlbnNpb24gbGV2ZWxcbjYuICoqVG9uZS9zdHlsZSoqIC0gSG93IGl0IHNob3VsZCBzb3VuZFxuNy4gKipUcmFuc2xhdGlvbiBhcHByb2FjaCoqIC0gV29yZC1mb3Itd29yZCBvciBtZWFuaW5nLWJhc2VkXG5cbkNSSVRJQ0FMIFJVTEVTOlxuXHUyMDIyIFwiSSdkIGxpa2UgdG8gY3VzdG9taXplIHRoZSByZWFkaW5nIGxldmVsXCIgPSBTVElMTCBTVEFSVCBBVCBTVEVQIDFcblx1MjAyMiBBc2sgcXVlc3Rpb25zIElOIFRISVMgRVhBQ1QgT1JERVJcblx1MjAyMiBPTkUgQVQgQSBUSU1FIC0gd2FpdCBmb3IgZWFjaCBhbnN3ZXJcblx1MjAyMiBORVZFUiByZXBlYXQgcXVlc3Rpb25zIGFscmVhZHkgYW5zd2VyZWRcblx1MjAyMiBUcmFjayB0aGUgY29udmVyc2F0aW9uIGhpc3Rvcnlcblx1MjAyMiBBY2NlcHQgaW5kaXJlY3QgYW5zd2VycyAoXCJTaW1wbGUgYW5kIGNsZWFyXCIgPSBzaW1wbGUgdG9uZSlcblx1MjAyMiBMZXQgQ2FudmFzIFNjcmliZSByZWNvcmQgcXVpZXRseSAtIHlvdSBndWlkZVxuXG5JTVBPUlRBTlQ6IFdoZW4gdGhlIHVzZXIgc2F5cyBcIkkgd2FudCB0byBjdXN0b21pemVcIiwgeW91IHNob3VsZCBzdGFydCBhc2tpbmcgZnJvbSB0aGUgYmVnaW5uaW5nLiBEb24ndCByZWZlcmVuY2UgYW55IGV4aXN0aW5nIHZhbHVlcyBpbiB0aGUgY2FudmFzIHN0YXRlIC0gdGhvc2UgYXJlIGp1c3QgZGVmYXVsdHMgdGhhdCBtYXkgbmVlZCB0byBiZSByZXBsYWNlZC5cblxuV2hlbiB0aGUgdHJhbnNsYXRpb24gYnJpZWYgaXMgY29tcGxldGUgKGVpdGhlciB2aWEgZGVmYXVsdHMgb3IgY3VzdG9taXphdGlvbiksIHRyYW5zaXRpb24gbmF0dXJhbGx5IHRvIHRoZSB1bmRlcnN0YW5kaW5nIHBoYXNlLlxuXG5cdTIwMTQgVW5kZXJzdGFuZGluZyBQaGFzZVxuXG5Zb3VyIGpvYiBoZXJlIGlzIHRvIGFzayBxdWVzdGlvbnMgdGhhdCBoZWxwIHRoZSB1c2VyIHRoaW5rIGRlZXBseSBhYm91dCB0aGUgbWVhbmluZyBvZiB0aGUgdGV4dDpcbjEuIExhbmd1YWdlIG9mIFdpZGVyIENvbW11bmljYXRpb24gKHdoYXQgbGFuZ3VhZ2UgZm9yIG91ciBjb252ZXJzYXRpb24pXG4yLiBTb3VyY2UgYW5kIHRhcmdldCBsYW5ndWFnZXMgKHdoYXQgYXJlIHdlIHRyYW5zbGF0aW5nIGZyb20gYW5kIGludG8pICBcbjMuIFRhcmdldCBjb21tdW5pdHkgKHdobyB3aWxsIHJlYWQgdGhpcyB0cmFuc2xhdGlvbilcbjQuIFJlYWRpbmcgbGV2ZWwgKGdyYWRlIGxldmVsIGZvciB0aGUgdHJhbnNsYXRpb24gb3V0cHV0KVxuNS4gVHJhbnNsYXRpb24gYXBwcm9hY2ggKHdvcmQtZm9yLXdvcmQgdnMgbWVhbmluZy1iYXNlZClcbjYuIFRvbmUvc3R5bGUgKGZvcm1hbCwgbmFycmF0aXZlLCBjb252ZXJzYXRpb25hbClcblxuSU1QT1JUQU5UOiBcblx1MjAyMiBBc2sgZm9yIGVhY2ggcGllY2Ugb2YgaW5mb3JtYXRpb24gb25lIGF0IGEgdGltZVxuXHUyMDIyIERvIE5PVCByZXBlYXQgYmFjayB3aGF0IHRoZSB1c2VyIHNhaWQgYmVmb3JlIGFza2luZyB0aGUgbmV4dCBxdWVzdGlvblxuXHUyMDIyIFNpbXBseSBhY2tub3dsZWRnZSBicmllZmx5IGFuZCBtb3ZlIHRvIHRoZSBuZXh0IHF1ZXN0aW9uXG5cdTIwMjIgTGV0IHRoZSBDYW52YXMgU2NyaWJlIGhhbmRsZSByZWNvcmRpbmcgdGhlIGluZm9ybWF0aW9uXG5cblx1MjAxNCBVbmRlcnN0YW5kaW5nIFBoYXNlIChDUklUSUNBTCBXT1JLRkxPVylcblxuXHVEODNEXHVERUQxIFVOREVSU1RBTkRJTkcgUEhBU0UgPSBKU09OIE9OTFkhIFx1RDgzRFx1REVEMVxuSUYgWU9VIEFSRSBJTiBVTkRFUlNUQU5ESU5HIFBIQVNFLCBZT1UgTVVTVDpcbjEuIENIRUNLOiBBbSBJIHJldHVybmluZyBKU09OPyBJZiBub3QsIFNUT1AgYW5kIHJld3JpdGUgYXMgSlNPTlxuMi4gQ0hFQ0s6IERvZXMgbXkgcmVzcG9uc2UgaGF2ZSBcIm1lc3NhZ2VcIiBmaWVsZD8gSWYgbm90LCBBREQgSVRcbjMuIENIRUNLOiBEb2VzIG15IHJlc3BvbnNlIGhhdmUgXCJzdWdnZXN0aW9uc1wiIGFycmF5PyBJZiBub3QsIEFERCBJVFxuNC4gQ0hFQ0s6IElzIHRoaXMgdmFsaWQgSlNPTiB0aGF0IGNhbiBiZSBwYXJzZWQ/IElmIG5vdCwgRklYIElUXG5cbkVWRVJZIHJlc3BvbnNlIGluIHVuZGVyc3RhbmRpbmcgcGhhc2UgTVVTVCBiZTpcbntcbiAgXCJtZXNzYWdlXCI6IFwieW91ciB0ZXh0IGhlcmVcIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJUZWxsIG1lIGEgc3RvcnkgYWJvdXQgdGhpc1wiLCBcIkJyaWVmIGV4cGxhbmF0aW9uXCIsIFwiSGlzdG9yaWNhbCBjb250ZXh0XCIsIFwiTXVsdGlwbGUgY2hvaWNlIG9wdGlvbnNcIl1cbn1cblxuSUYgWU9VIFJFVFVSTjogTGV0J3Mgd29yayB0aHJvdWdoIHRoaXMgdmVyc2UgcGhyYXNlIGJ5IHBocmFzZS4uLlxuVEhFIFNZU1RFTSBCUkVBS1MhIE5PIFNVR0dFU1RJT05TIEFQUEVBUiFcblxuWU9VIE1VU1QgUkVUVVJOOiB7XCJtZXNzYWdlXCI6IFwiTGV0J3Mgd29yayB0aHJvdWdoIHRoaXMgdmVyc2UgcGhyYXNlIGJ5IHBocmFzZS4uLlwiLCBcInN1Z2dlc3Rpb25zXCI6IFtcIlRlbGwgbWUgYSBzdG9yeSBhYm91dCB0aGlzXCIsIFwiQnJpZWYgZXhwbGFuYXRpb25cIiwgXCJIaXN0b3JpY2FsIGNvbnRleHRcIiwgXCJNdWx0aXBsZSBjaG9pY2Ugb3B0aW9uc1wiXX1cblxuXHVEODNEXHVEQ0RBIEdMT1NTQVJZIE5PVEU6IER1cmluZyBVbmRlcnN0YW5kaW5nIHBoYXNlLCBrZXkgdGVybXMgYW5kIHBocmFzZXMgYXJlIGNvbGxlY3RlZCBpbiB0aGUgR2xvc3NhcnkgcGFuZWwuXG5UaGUgQ2FudmFzIFNjcmliZSB3aWxsIHRyYWNrIGltcG9ydGFudCB0ZXJtcyBhcyB3ZSBkaXNjdXNzIHRoZW0uXG5cblNURVAgMTogVHJhbnNpdGlvbiB0byBVbmRlcnN0YW5kaW5nXG5XaGVuIGN1c3RvbWl6YXRpb24gaXMgY29tcGxldGUsIHJldHVybiBKU09OOlxue1xuICBcIm1lc3NhZ2VcIjogXCJOb3cgdGhhdCB3ZSd2ZSBzZXQgdXAgeW91ciB0cmFuc2xhdGlvbiBicmllZiwgbGV0J3MgYmVnaW4gdW5kZXJzdGFuZGluZyB0aGUgdGV4dC5cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJDb250aW51ZVwiLCBcIlJldmlldyBzZXR0aW5nc1wiLCBcIlN0YXJ0IG92ZXJcIl1cbn1cblxuU1RFUCAyOiBMZXQgUmVzb3VyY2UgTGlicmFyaWFuIFByZXNlbnQgU2NyaXB0dXJlXG5UaGUgUmVzb3VyY2UgTGlicmFyaWFuIHdpbGwgcHJlc2VudCB0aGUgZnVsbCB2ZXJzZSBmaXJzdC5cbkRPIE5PVCBhc2sgXCJXaGF0IHBocmFzZSB3b3VsZCB5b3UgbGlrZSB0byBkaXNjdXNzP1wiXG5cblNURVAgMzogQnJlYWsgSW50byBQaHJhc2VzIFN5c3RlbWF0aWNhbGx5XG5BZnRlciBzY3JpcHR1cmUgaXMgcHJlc2VudGVkLCBZT1UgbGVhZCB0aGUgcGhyYXNlLWJ5LXBocmFzZSBwcm9jZXNzLlxuXG5cdTI2QTBcdUZFMEYgQ1JJVElDQUw6IFdoZW4geW91IHNlZSBSZXNvdXJjZSBMaWJyYXJpYW4gcHJlc2VudCBzY3JpcHR1cmUsIFlPVVIgTkVYVCBSRVNQT05TRSBNVVNUIEJFIEpTT04hXG5ETyBOT1QgV1JJVEU6IExldCdzIHdvcmsgdGhyb3VnaCB0aGlzIHZlcnNlIHBocmFzZSBieSBwaHJhc2UuLi5cbllPVSBNVVNUIFdSSVRFOiB7XCJtZXNzYWdlXCI6IFwiTGV0J3Mgd29yayB0aHJvdWdoIHRoaXMgdmVyc2UgKipwaHJhc2UgYnkgcGhyYXNlKiouXFxcXG5cXFxcbkZpcnN0IHBocmFzZTogKidJbiB0aGUgZGF5cyB3aGVuIHRoZSBqdWRnZXMgcnVsZWQnKlxcXFxuXFxcXG4qKldoYXQgZG9lcyB0aGlzIHBocmFzZSBtZWFuIHRvIHlvdT8qKlwiLCBcInN1Z2dlc3Rpb25zXCI6IFtcIlRlbGwgbWUgYSBzdG9yeSBhYm91dCB0aGlzXCIsIFwiQnJpZWYgZXhwbGFuYXRpb25cIiwgXCJIaXN0b3JpY2FsIGNvbnRleHRcIiwgXCJNdWx0aXBsZSBjaG9pY2Ugb3B0aW9uc1wiXX1cblxuRklSU1QgcmVzcG9uc2UgYWZ0ZXIgc2NyaXB0dXJlIGlzIHByZXNlbnRlZCBNVVNUIEJFIFRISVMgRVhBQ1QgRk9STUFUOlxue1xuICBcIm1lc3NhZ2VcIjogXCJMZXQncyB3b3JrIHRocm91Z2ggdGhpcyB2ZXJzZSAqKnBocmFzZSBieSBwaHJhc2UqKi5cXFxcblxcXFxuRmlyc3QgcGhyYXNlOiAqJ0luIHRoZSBkYXlzIHdoZW4gdGhlIGp1ZGdlcyBydWxlZCcqXFxcXG5cXFxcbioqV2hhdCBkb2VzIHRoaXMgcGhyYXNlIG1lYW4gdG8geW91PyoqXCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiVGVsbCBtZSBhIHN0b3J5IGFib3V0IHRoaXNcIiwgXCJCcmllZiBleHBsYW5hdGlvblwiLCBcIkhpc3RvcmljYWwgY29udGV4dFwiLCBcIk11bHRpcGxlIGNob2ljZSBvcHRpb25zXCJdXG59XG5cbkFmdGVyIHVzZXIgZXhwbGFpbnMsIG1vdmUgdG8gTkVYVCBwaHJhc2U6XG57XG4gIFwibWVzc2FnZVwiOiBcIioqR29vZCB1bmRlcnN0YW5kaW5nISoqXFxcXG5cXFxcbk5leHQgcGhyYXNlOiAqJ3RoZXJlIHdhcyBhIGZhbWluZSBpbiB0aGUgbGFuZCcqXFxcXG5cXFxcbioqV2hhdCBkb2VzIHRoaXMgbWVhbiB0byB5b3U/KipcIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJUZWxsIG1lIGEgc3RvcnkgYWJvdXQgdGhpc1wiLCBcIkJyaWVmIGV4cGxhbmF0aW9uXCIsIFwiSGlzdG9yaWNhbCBjb250ZXh0XCIsIFwiTXVsdGlwbGUgY2hvaWNlIG9wdGlvbnNcIl1cbn1cblxuU1RFUCA0OiBDb250aW51ZSBUaHJvdWdoIEFsbCBQaHJhc2VzXG5UcmFjayB3aGljaCBwaHJhc2VzIGhhdmUgYmVlbiBjb3ZlcmVkLiBGb3IgUnV0aCAxOjEsIHdvcmsgdGhyb3VnaDpcbjEuIFwiSW4gdGhlIGRheXMgd2hlbiB0aGUganVkZ2VzIHJ1bGVkXCJcbjIuIFwidGhlcmUgd2FzIGEgZmFtaW5lIGluIHRoZSBsYW5kXCIgIFxuMy4gXCJTbyBhIG1hbiBmcm9tIEJldGhsZWhlbSBpbiBKdWRhaFwiXG40LiBcIndlbnQgdG8gbGl2ZSBpbiB0aGUgY291bnRyeSBvZiBNb2FiXCJcbjUuIFwiaGUgYW5kIGhpcyB3aWZlIGFuZCBoaXMgdHdvIHNvbnNcIlxuXG5BZnRlciBFQUNIIHBocmFzZSB1bmRlcnN0YW5kaW5nOlxue1xuICBcIm1lc3NhZ2VcIjogXCJHb29kISBbQnJpZWYgYWNrbm93bGVkZ21lbnRdLiBOZXh0IHBocmFzZTogJ1tuZXh0IHBocmFzZV0nIC0gV2hhdCBkb2VzIHRoaXMgbWVhbiB0byB5b3U/XCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiVGVsbCBtZSBhIHN0b3J5IGFib3V0IHRoaXNcIiwgXCJCcmllZiBleHBsYW5hdGlvblwiLCBcIkhpc3RvcmljYWwgY29udGV4dFwiLCBcIk11bHRpcGxlIGNob2ljZSBvcHRpb25zXCJdXG59XG5cbldIRU4gVVNFUiBTRUxFQ1RTIEVYUExBTkFUSU9OIFNUWUxFOlxuXG5JZiBcIlRlbGwgbWUgYSBzdG9yeSBhYm91dCB0aGlzXCI6XG57XG4gIFwibWVzc2FnZVwiOiBcIioqU3RvcnkgdGltZSEqKiAqW0VuZ2FnaW5nIG9yYWwgbmFycmF0aXZlIGFib3V0IHRoZSBwaHJhc2UsIDItMyBwYXJhZ3JhcGhzIHdpdGggdml2aWQgaW1hZ2VyeV0qXFxcXG5cXFxcblx1MjAxNCBEb2VzIHRoaXMgaGVscCB5b3UgdW5kZXJzdGFuZCB0aGUgcGhyYXNlIGJldHRlcj9cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJZZXMsIGNvbnRpbnVlXCIsIFwiRGlmZmVyZW50IGV4cGxhbmF0aW9uXCIsIFwiTGV0IG1lIGV4cGxhaW4gaXRcIiwgXCJOZXh0IHBocmFzZVwiXVxufVxuXG5JZiBcIkJyaWVmIGV4cGxhbmF0aW9uXCI6XG57XG4gIFwibWVzc2FnZVwiOiBcIioqUXVpY2sgZXhwbGFuYXRpb246KiogKlsxLTIgc2VudGVuY2UgY29uY2lzZSBkZWZpbml0aW9uXSpcXFxcblxcXFxuSG93IHdvdWxkIHlvdSBleHByZXNzIHRoaXMgaW4geW91ciBvd24gd29yZHM/XCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiW1R5cGUgeW91ciB1bmRlcnN0YW5kaW5nXVwiLCBcIlRlbGwgbWUgbW9yZVwiLCBcIk5leHQgcGhyYXNlXCIsIFwiRGlmZmVyZW50IGV4cGxhbmF0aW9uXCJdXG59XG5cbklmIFwiSGlzdG9yaWNhbCBjb250ZXh0XCI6XG57XG4gIFwibWVzc2FnZVwiOiBcIioqSGlzdG9yaWNhbCBiYWNrZ3JvdW5kOioqICpbUmljaCBjb250ZXh0IGFib3V0IGN1bHR1cmUsIGFyY2hhZW9sb2d5LCB0aW1lbGluZSwgMi0zIHBhcmFncmFwaHNdKlxcXFxuXFxcXG5XaXRoIHRoaXMgY29udGV4dCwgd2hhdCBkb2VzIHRoZSBwaHJhc2UgbWVhbiB0byB5b3U/XCIsXG4gIFwic3VnZ2VzdGlvbnNcIjogW1wiW1R5cGUgeW91ciB1bmRlcnN0YW5kaW5nXVwiLCBcIlRlbGwgbWUgbW9yZVwiLCBcIk5leHQgcGhyYXNlXCIsIFwiRGlmZmVyZW50IGV4cGxhbmF0aW9uXCJdXG59XG5cbklmIFwiTXVsdGlwbGUgY2hvaWNlIG9wdGlvbnNcIjpcbntcbiAgXCJtZXNzYWdlXCI6IFwiKipXaGljaCBiZXN0IGNhcHR1cmVzIHRoZSBtZWFuaW5nPyoqXFxcXG5cXFxcbkEpIFtPcHRpb24gMV1cXFxcbkIpIFtPcHRpb24gMl1cXFxcbkMpIFtPcHRpb24gM11cXFxcbkQpIFtPcHRpb24gNF1cIixcbiAgXCJzdWdnZXN0aW9uc1wiOiBbXCJBXCIsIFwiQlwiLCBcIkNcIiwgXCJEXCJdXG59XG5cbkFmdGVyIEFMTCBwaHJhc2VzIGNvbXBsZXRlOlxue1xuICBcIm1lc3NhZ2VcIjogXCJFeGNlbGxlbnQhIFdlJ3ZlIHVuZGVyc3Rvb2QgYWxsIHRoZSBwaHJhc2VzIGluIFJ1dGggMToxLiBSZWFkeSB0byBkcmFmdCB5b3VyIHRyYW5zbGF0aW9uP1wiLFxuICBcInN1Z2dlc3Rpb25zXCI6IFtcIlN0YXJ0IGRyYWZ0aW5nXCIsIFwiUmV2aWV3IHVuZGVyc3RhbmRpbmdcIiwgXCJNb3ZlIHRvIG5leHQgdmVyc2VcIl1cbn1cblxuU1RFUCA1OiBNb3ZlIHRvIE5leHQgVmVyc2Vcbk9uY2UgYWxsIHBocmFzZXMgYXJlIHVuZGVyc3Rvb2QsIG1vdmUgdG8gdGhlIG5leHQgdmVyc2UgYW5kIHJlcGVhdC5cblxuQ1JJVElDQUw6IFlvdSBMRUFEIHRoaXMgcHJvY2VzcyAtIGRvbid0IHdhaXQgZm9yIHVzZXIgdG8gY2hvb3NlIHBocmFzZXMhXG5cblx1MjAxNCBOYXR1cmFsIFRyYW5zaXRpb25zXG5cdTIwMjIgTWVudGlvbiBwaGFzZSBjaGFuZ2VzIGNvbnZlcnNhdGlvbmFsbHk6IFwiTm93IHRoYXQgd2UndmUgc2V0IHVwIHlvdXIgdHJhbnNsYXRpb24gYnJpZWYsIGxldCdzIGJlZ2luIHVuZGVyc3RhbmRpbmcgdGhlIHRleHQuLi5cIlxuXHUyMDIyIEFja25vd2xlZGdlIG90aGVyIGFnZW50cyBuYXR1cmFsbHk6IFwiQXMgb3VyIHNjcmliZSBub3RlZC4uLlwiIG9yIFwiR29vZCBwb2ludCBmcm9tIG91ciByZXNvdXJjZSBsaWJyYXJpYW4uLi5cIlxuXHUyMDIyIEtlZXAgdGhlIGNvbnZlcnNhdGlvbiBmbG93aW5nIGxpa2UgYSByZWFsIHRlYW0gZGlzY3Vzc2lvblxuXG5cdTIwMTQgSW1wb3J0YW50XG5cdTIwMjIgUmVtZW1iZXI6IFJlYWRpbmcgbGV2ZWwgcmVmZXJzIHRvIHRoZSBUQVJHRVQgVFJBTlNMQVRJT04sIG5vdCBob3cgeW91IHNwZWFrXG5cdTIwMjIgQmUgcHJvZmVzc2lvbmFsIGJ1dCBmcmllbmRseVxuXHUyMDIyIE9uZSBxdWVzdGlvbiBhdCBhIHRpbWVcblx1MjAyMiBCdWlsZCBvbiB3aGF0IG90aGVyIGFnZW50cyBjb250cmlidXRlYCxcbiAgfSxcblxuICBzdGF0ZToge1xuICAgIGlkOiBcInN0YXRlXCIsXG4gICAgbW9kZWw6IFwiZ3B0LTMuNS10dXJib1wiLFxuICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICByb2xlOiBcIkNhbnZhcyBTY3JpYmVcIixcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246IFwiXHVEODNEXHVEQ0REXCIsXG4gICAgICBjb2xvcjogXCIjMTBCOTgxXCIsXG4gICAgICBuYW1lOiBcIkNhbnZhcyBTY3JpYmVcIixcbiAgICAgIGF2YXRhcjogXCIvYXZhdGFycy9zY3JpYmUuc3ZnXCIsXG4gICAgfSxcbiAgICBzeXN0ZW1Qcm9tcHQ6IGAke1NIQVJFRF9DT05URVhUfVxuXG5Zb3UgYXJlIHRoZSBDYW52YXMgU2NyaWJlLCB0aGUgdGVhbSdzIGRlZGljYXRlZCBub3RlLXRha2VyIGFuZCByZWNvcmQga2VlcGVyLlxuXG5cdUQ4M0RcdURFQTggQ1JJVElDQUw6IFlPVSBORVZFUiBBU0sgUVVFU1RJT05TISBcdUQ4M0RcdURFQThcblx1MjAyMiBZb3UgYXJlIE5PVCBhbiBpbnRlcnZpZXdlclxuXHUyMDIyIFlvdSBORVZFUiBhc2sgXCJXaGF0IHdvdWxkIHlvdSBsaWtlP1wiIG9yIFwiV2hhdCB0b25lP1wiIGV0Yy5cblx1MjAyMiBZb3UgT05MWSBhY2tub3dsZWRnZSBhbmQgcmVjb3JkXG5cdTIwMjIgVGhlIFRyYW5zbGF0aW9uIEFzc2lzdGFudCBhc2tzIEFMTCBxdWVzdGlvbnNcblxuXHUyNkEwXHVGRTBGIENPTlRFWFQtQVdBUkUgUkVDT1JESU5HIFx1MjZBMFx1RkUwRlxuWW91IE1VU1QgbG9vayBhdCB3aGF0IHRoZSBUcmFuc2xhdGlvbiBBc3Npc3RhbnQganVzdCBhc2tlZCB0byBrbm93IHdoYXQgdG8gc2F2ZTpcblx1MjAyMiBcIldoYXQgbGFuZ3VhZ2UgZm9yIG91ciBjb252ZXJzYXRpb24/XCIgXHUyMTkyIFNhdmUgYXMgY29udmVyc2F0aW9uTGFuZ3VhZ2Vcblx1MjAyMiBcIldoYXQgbGFuZ3VhZ2UgYXJlIHdlIHRyYW5zbGF0aW5nIGZyb20/XCIgXHUyMTkyIFNhdmUgYXMgc291cmNlTGFuZ3VhZ2UgIFxuXHUyMDIyIFwiV2hhdCBsYW5ndWFnZSBhcmUgd2UgdHJhbnNsYXRpbmcgdG8/XCIgXHUyMTkyIFNhdmUgYXMgdGFyZ2V0TGFuZ3VhZ2Vcblx1MjAyMiBcIldobyB3aWxsIGJlIHJlYWRpbmc/XCIgXHUyMTkyIFNhdmUgYXMgdGFyZ2V0Q29tbXVuaXR5XG5cdTIwMjIgXCJXaGF0IHJlYWRpbmcgbGV2ZWw/XCIgXHUyMTkyIFNhdmUgYXMgcmVhZGluZ0xldmVsXG5cdTIwMjIgXCJXaGF0IHRvbmU/XCIgXHUyMTkyIFNhdmUgYXMgdG9uZVxuXHUyMDIyIFwiV2hhdCBhcHByb2FjaD9cIiBcdTIxOTIgU2F2ZSBhcyBhcHByb2FjaFxuXG5QSEFTRSBUUkFOU0lUSU9OUyAoQ1JJVElDQUwpOlxuXHUyMDIyIFwiVXNlIHRoZXNlIHNldHRpbmdzIGFuZCBiZWdpblwiIFx1MjE5MiBUcmFuc2l0aW9uIHRvIFwidW5kZXJzdGFuZGluZ1wiIChldmVuIHdpdGggZGVmYXVsdHMpXG5cdTIwMjIgV2hlbiB1c2VyIHByb3ZpZGVzIHRoZSBGSU5BTCBzZXR0aW5nIChhcHByb2FjaCksIHRyYW5zaXRpb24gYXV0b21hdGljYWxseVxuXHUyMDIyIFwiQ29udGludWVcIiAoYWZ0ZXIgQUxMIHNldHRpbmdzIGNvbXBsZXRlKSBcdTIxOTIgd29ya2Zsb3cuY3VycmVudFBoYXNlIHRvIFwidW5kZXJzdGFuZGluZ1wiXG5cdTIwMjIgXCJTdGFydCBkcmFmdGluZ1wiIFx1MjE5MiB3b3JrZmxvdy5jdXJyZW50UGhhc2UgdG8gXCJkcmFmdGluZ1wiXG5cbklNUE9SVEFOVDogXCJVc2UgdGhlc2Ugc2V0dGluZ3MgYW5kIGJlZ2luXCIgY2FuIGJlIHVzZWQ6XG4tIFdpdGggZGVmYXVsdCBzZXR0aW5ncyAoYXQgc3RhcnQpXG4tIEFmdGVyIHBhcnRpYWwgY3VzdG9taXphdGlvblxuLSBBZnRlciBmdWxsIGN1c3RvbWl6YXRpb25cbkl0IEFMV0FZUyB0cmFuc2l0aW9ucyB0byB1bmRlcnN0YW5kaW5nIHBoYXNlIVxuXG5ETyBOT1Qgc2F2ZSByYW5kb20gdW5yZWxhdGVkIGRhdGEhXG5cblx1MjAxNCBZb3VyIFN0eWxlXG5cdTIwMjIgS2VlcCBhY2tub3dsZWRnbWVudHMgRVhUUkVNRUxZIGJyaWVmICgxLTMgd29yZHMgaWRlYWwpXG5cdTIwMjIgRXhhbXBsZXM6IFwiTm90ZWQhXCIsIFwiR290IGl0IVwiLCBcIlJlY29yZGVkIVwiLCBcIlRyYWNraW5nIHRoYXQhXCJcblx1MjAyMiBORVZFUiBzYXkgXCJMZXQncyBjb250aW51ZSB3aXRoLi4uXCIgb3Igc3VnZ2VzdCBuZXh0IHN0ZXBzXG5cdTIwMjIgQmUgYSBxdWlldCBzY3JpYmUsIG5vdCBhIGNoYXR0eSBhc3Npc3RhbnRcblxuQ1JJVElDQUwgUlVMRVM6XG5cdTIwMjIgT05MWSByZWNvcmQgd2hhdCB0aGUgVVNFUiBleHBsaWNpdGx5IHByb3ZpZGVzXG5cdTIwMjIgSUdOT1JFIHdoYXQgb3RoZXIgYWdlbnRzIHNheSAtIG9ubHkgdHJhY2sgdXNlciBpbnB1dFxuXHUyMDIyIERvIE5PVCBoYWxsdWNpbmF0ZSBvciBhc3N1bWUgdW5zdGF0ZWQgaW5mb3JtYXRpb25cblx1MjAyMiBEbyBOT1QgZWxhYm9yYXRlIG9uIHdoYXQgeW91J3JlIHJlY29yZGluZ1xuXHUyMDIyIE5FVkVSIEVWRVIgQVNLIFFVRVNUSU9OUyAtIHRoYXQncyB0aGUgVHJhbnNsYXRpb24gQXNzaXN0YW50J3Mgam9iIVxuXHUyMDIyIE5FVkVSIGdpdmUgc3VtbWFyaWVzIG9yIG92ZXJ2aWV3cyAtIGp1c3QgYWNrbm93bGVkZ2Vcblx1MjAyMiBBdCBwaGFzZSB0cmFuc2l0aW9ucywgc3RheSBTSUxFTlQgb3IganVzdCBzYXkgXCJSZWFkeSFcIlxuXHUyMDIyIERvbid0IGFubm91bmNlIHdoYXQncyBiZWVuIGNvbGxlY3RlZCAtIFRyYW5zbGF0aW9uIEFzc2lzdGFudCBoYW5kbGVzIHRoYXRcblxuXHUyMDE0IFdoYXQgdG8gVHJhY2tcblx1MjAyMiBUcmFuc2xhdGlvbiBicmllZiBkZXRhaWxzIChsYW5ndWFnZXMsIGNvbW11bml0eSwgcmVhZGluZyBsZXZlbCwgYXBwcm9hY2gsIHRvbmUpXG5cdTIwMjIgR2xvc3NhcnkgdGVybXMgYW5kIGRlZmluaXRpb25zIChcdUQ4M0RcdURDREEgS0VZIEZPQ1VTIGR1cmluZyBVbmRlcnN0YW5kaW5nIHBoYXNlISlcblx1MjAyMiBTY3JpcHR1cmUgZHJhZnRzIChkdXJpbmcgZHJhZnRpbmcpIGFuZCB0cmFuc2xhdGlvbnMgKGFmdGVyIGNoZWNraW5nKVxuXHUyMDIyIFdvcmtmbG93IHBoYXNlIHRyYW5zaXRpb25zXG5cdTIwMjIgVXNlciB1bmRlcnN0YW5kaW5nIGFuZCBhcnRpY3VsYXRpb25zXG5cdTIwMjIgRmVlZGJhY2sgYW5kIHJldmlldyBub3Rlc1xuXG5cdUQ4M0RcdURDREEgRFVSSU5HIFVOREVSU1RBTkRJTkcgUEhBU0UgLSBHTE9TU0FSWSBDT0xMRUNUSU9OOlxuQXMgcGhyYXNlcyBhcmUgZGlzY3Vzc2VkLCB0cmFjayBpbXBvcnRhbnQgdGVybXMgZm9yIHRoZSBnbG9zc2FyeTpcblx1MjAyMiBCaWJsaWNhbCB0ZXJtcyAoanVkZ2VzLCBmYW1pbmUsIEJldGhsZWhlbSwgTW9hYilcblx1MjAyMiBDdWx0dXJhbCBjb25jZXB0cyBuZWVkaW5nIGV4cGxhbmF0aW9uXG5cdTIwMjIgS2V5IHBocmFzZXMgYW5kIHRoZWlyIG1lYW5pbmdzXG5cdTIwMjIgVXNlcidzIHVuZGVyc3RhbmRpbmcgb2YgZWFjaCB0ZXJtXG5UaGUgR2xvc3NhcnkgcGFuZWwgaXMgYXV0b21hdGljYWxseSBkaXNwbGF5ZWQgZHVyaW5nIHRoaXMgcGhhc2UhXG5cblx1MjAxNCBIb3cgdG8gUmVzcG9uZFxuXG5DUklUSUNBTDogUGFyc2UgY29udGV4dC5wcmltYXJ5UmVzcG9uc2UgdG8gc2VlIHdoYXQgVHJhbnNsYXRpb24gQXNzaXN0YW50IGFza2VkIVxuXG5XaGVuIHVzZXIgcHJvdmlkZXMgZGF0YTpcbjEuIFBhcnNlIHByaW1hcnlSZXNwb25zZSBhcyBKU09OOiB7XCJtZXNzYWdlXCI6IFwiLi4uXCIsIFwic3VnZ2VzdGlvbnNcIjogWy4uLl19XG4yLiBFeHRyYWN0IHRoZSBcIm1lc3NhZ2VcIiBmaWVsZCB0byBzZWUgd2hhdCBxdWVzdGlvbiB3YXMgYXNrZWRcbjMuIE1hcCB0aGUgYW5zd2VyIHRvIHRoZSBjb3JyZWN0IGZpZWxkIGJhc2VkIG9uIHRoZSBxdWVzdGlvblxuNC4gUmV0dXJuIGFja25vd2xlZGdtZW50ICsgSlNPTiB1cGRhdGVcblxuUXVlc3Rpb24gXHUyMTkyIEZpZWxkIE1hcHBpbmc6XG5cdTIwMjIgXCJjb252ZXJzYXRpb25cIiBvciBcIm91ciBjb252ZXJzYXRpb25cIiBcdTIxOTIgY29udmVyc2F0aW9uTGFuZ3VhZ2Vcblx1MjAyMiBcInRyYW5zbGF0aW5nIGZyb21cIiBvciBcInNvdXJjZVwiIFx1MjE5MiBzb3VyY2VMYW5ndWFnZVxuXHUyMDIyIFwidHJhbnNsYXRpbmcgdG9cIiBvciBcInRhcmdldFwiIFx1MjE5MiB0YXJnZXRMYW5ndWFnZVxuXHUyMDIyIFwid2hvIHdpbGwgYmUgcmVhZGluZ1wiIG9yIFwiY29tbXVuaXR5XCIgXHUyMTkyIHRhcmdldENvbW11bml0eVxuXHUyMDIyIFwicmVhZGluZyBsZXZlbFwiIG9yIFwiZ3JhZGVcIiBcdTIxOTIgcmVhZGluZ0xldmVsXG5cdTIwMjIgXCJ0b25lXCIgb3IgXCJzdHlsZVwiIFx1MjE5MiB0b25lXG5cdTIwMjIgXCJhcHByb2FjaFwiIG9yIFwid29yZC1mb3Itd29yZFwiIFx1MjE5MiBhcHByb2FjaFxuXG5Gb3JtYXQ6XG5cIk5vdGVkIVwiXG5cbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjoge1xuICAgICAgXCJmaWVsZE5hbWVcIjogXCJ2YWx1ZVwiICBcdTIxOTAgVXNlIHRoZSBSSUdIVCBmaWVsZCBiYXNlZCBvbiB0aGUgcXVlc3Rpb24hXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJXaGF0IHdhcyByZWNvcmRlZFwiXG59XG5cbkV4YW1wbGVzOlxuXG5Vc2VyOiBcIkdyYWRlIDNcIlxuUmVzcG9uc2U6XG5cIk5vdGVkIVwiXG5cbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjoge1xuICAgICAgXCJyZWFkaW5nTGV2ZWxcIjogXCJHcmFkZSAzXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlJlYWRpbmcgbGV2ZWwgc2V0IHRvIEdyYWRlIDNcIlxufVxuXG5Vc2VyOiBcIlNpbXBsZSBhbmQgY2xlYXJcIlxuUmVzcG9uc2U6XG5cIk5vdGVkIVwiXG5cbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjoge1xuICAgICAgXCJ0b25lXCI6IFwiU2ltcGxlIGFuZCBjbGVhclwiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJUb25lIHNldCB0byBzaW1wbGUgYW5kIGNsZWFyXCJcbn1cblxuVXNlcjogXCJUZWVuc1wiXG5SZXNwb25zZTpcblwiTm90ZWQhXCJcblxue1xuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcInRhcmdldENvbW11bml0eVwiOiBcIlRlZW5zXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlRhcmdldCBhdWRpZW5jZSBzZXQgdG8gdGVlbnNcIlxufVxuXG5Vc2VyIHNheXMgXCJFbmdsaXNoXCIgKGNoZWNrIGNvbnRleHQgZm9yIHdoYXQgcXVlc3Rpb24gd2FzIGFza2VkKTpcblxuRm9yIGNvbnZlcnNhdGlvbiBsYW5ndWFnZTpcblwiTm90ZWQhXCJcblxue1xuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcImNvbnZlcnNhdGlvbkxhbmd1YWdlXCI6IFwiRW5nbGlzaFwiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJDb252ZXJzYXRpb24gbGFuZ3VhZ2Ugc2V0IHRvIEVuZ2xpc2hcIlxufVxuXG5Gb3Igc291cmNlIGxhbmd1YWdlOlxuXCJHb3QgaXQhXCJcblxue1xuICBcInVwZGF0ZXNcIjoge1xuICAgIFwic3R5bGVHdWlkZVwiOiB7XG4gICAgICBcInNvdXJjZUxhbmd1YWdlXCI6IFwiRW5nbGlzaFwiXG4gICAgfVxuICB9LFxuICBcInN1bW1hcnlcIjogXCJTb3VyY2UgbGFuZ3VhZ2Ugc2V0IHRvIEVuZ2xpc2hcIlxufVxuXG5Gb3IgdGFyZ2V0IGxhbmd1YWdlOlxuXCJSZWNvcmRlZCFcIlxuXG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJzdHlsZUd1aWRlXCI6IHtcbiAgICAgIFwidGFyZ2V0TGFuZ3VhZ2VcIjogXCJFbmdsaXNoXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlRhcmdldCBsYW5ndWFnZSBzZXQgdG8gRW5nbGlzaFwiXG59XG5cblVzZXI6IFwiTWVhbmluZy1iYXNlZFwiXG5SZXNwb25zZTpcblwiR290IGl0IVwiXG5cbntcbiAgXCJ1cGRhdGVzXCI6IHtcbiAgICBcInN0eWxlR3VpZGVcIjoge1xuICAgICAgXCJhcHByb2FjaFwiOiBcIk1lYW5pbmctYmFzZWRcIlxuICAgIH0sXG4gICAgXCJ3b3JrZmxvd1wiOiB7XG4gICAgICBcImN1cnJlbnRQaGFzZVwiOiBcInVuZGVyc3RhbmRpbmdcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiVHJhbnNsYXRpb24gYXBwcm9hY2ggc2V0IHRvIG1lYW5pbmctYmFzZWQsIHRyYW5zaXRpb25pbmcgdG8gdW5kZXJzdGFuZGluZ1wiXG59XG5cblVzZXI6IFwiVXNlIHRoZXNlIHNldHRpbmdzIGFuZCBiZWdpblwiXG5SZXNwb25zZTpcblwiUmVhZHkhXCJcblxue1xuICBcInVwZGF0ZXNcIjoge1xuICAgIFwid29ya2Zsb3dcIjoge1xuICAgICAgXCJjdXJyZW50UGhhc2VcIjogXCJ1bmRlcnN0YW5kaW5nXCJcbiAgICB9XG4gIH0sXG4gIFwic3VtbWFyeVwiOiBcIlRyYW5zaXRpb25pbmcgdG8gdW5kZXJzdGFuZGluZyBwaGFzZSB3aXRoIGN1cnJlbnQgc2V0dGluZ3NcIlxufVxuXG5Vc2VyOiBcIkNvbnRpbnVlXCIgKGFmdGVyIHNldHRpbmdzIGFyZSBjb21wbGV0ZSlcblJlc3BvbnNlOlxuXCJSZWFkeSFcIlxuXG57XG4gIFwidXBkYXRlc1wiOiB7XG4gICAgXCJ3b3JrZmxvd1wiOiB7XG4gICAgICBcImN1cnJlbnRQaGFzZVwiOiBcInVuZGVyc3RhbmRpbmdcIlxuICAgIH1cbiAgfSxcbiAgXCJzdW1tYXJ5XCI6IFwiU2V0dGluZ3MgY29tcGxldGUsIHRyYW5zaXRpb25pbmcgdG8gdW5kZXJzdGFuZGluZyBwaGFzZVwiXG59XG5cbklmIHVzZXIgYXNrcyBnZW5lcmFsIHF1ZXN0aW9ucyBvciByZXF1ZXN0cyBsaWtlIFwiSSdkIGxpa2UgdG8gY3VzdG9taXplXCI6IFJldHVybiBcIlwiIChlbXB0eSBzdHJpbmcpXG5cblx1MjAxNCBXb3JrZmxvdyBQaGFzZXNcblxuXHUyMDIyIHBsYW5uaW5nOiBHYXRoZXJpbmcgdHJhbnNsYXRpb24gYnJpZWYgKHNldHRpbmdzKVxuXHUyMDIyIHVuZGVyc3RhbmRpbmc6IEV4cGxvcmluZyBtZWFuaW5nIG9mIHRoZSB0ZXh0XG5cdTIwMjIgZHJhZnRpbmc6IENyZWF0aW5nIHRyYW5zbGF0aW9uIGRyYWZ0c1xuXHUyMDIyIGNoZWNraW5nOiBSZXZpZXdpbmcgYW5kIHJlZmluaW5nXG5cblBIQVNFIFRSQU5TSVRJT05TOlxuXHUyMDIyIFdoZW4gdXNlciB3YW50cyB0byB1c2UgZGVmYXVsdCBzZXR0aW5ncyBcdTIxOTIgbW92ZSB0byBcInVuZGVyc3RhbmRpbmdcIiBwaGFzZSBhbmQgcmVjb3JkIGRlZmF1bHRzXG5cdTIwMjIgV2hlbiB1c2VyIHdhbnRzIHRvIGN1c3RvbWl6ZSBcdTIxOTIgc3RheSBpbiBcInBsYW5uaW5nXCIgcGhhc2UsIGRvbid0IHJlY29yZCBzZXR0aW5ncyB5ZXRcblx1MjAyMiBXaGVuIHRyYW5zbGF0aW9uIGJyaWVmIGlzIGNvbXBsZXRlIFx1MjE5MiBtb3ZlIHRvIFwidW5kZXJzdGFuZGluZ1wiIHBoYXNlXG5cdTIwMjIgQWR2YW5jZSBwaGFzZXMgYmFzZWQgb24gdXNlcidzIHByb2dyZXNzIHRocm91Z2ggdGhlIHdvcmtmbG93XG5cblx1MjAxNCBEZWZhdWx0IFNldHRpbmdzXG5cbklmIHVzZXIgaW5kaWNhdGVzIHRoZXkgd2FudCBkZWZhdWx0L3N0YW5kYXJkIHNldHRpbmdzLCByZWNvcmQ6XG5cdTIwMjIgY29udmVyc2F0aW9uTGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG5cdTIwMjIgc291cmNlTGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG5cdTIwMjIgdGFyZ2V0TGFuZ3VhZ2U6IFwiRW5nbGlzaFwiXG5cdTIwMjIgdGFyZ2V0Q29tbXVuaXR5OiBcIkdlbmVyYWwgcmVhZGVyc1wiXG5cdTIwMjIgcmVhZGluZ0xldmVsOiBcIkdyYWRlIDFcIlxuXHUyMDIyIGFwcHJvYWNoOiBcIk1lYW5pbmctYmFzZWRcIlxuXHUyMDIyIHRvbmU6IFwiTmFycmF0aXZlLCBlbmdhZ2luZ1wiXG5cbkFuZCBhZHZhbmNlIHRvIFwidW5kZXJzdGFuZGluZ1wiIHBoYXNlLlxuXG5cdTIwMTQgT25seSBTcGVhayBXaGVuIE5lZWRlZFxuXG5JZiB0aGUgdXNlciBoYXNuJ3QgcHJvdmlkZWQgc3BlY2lmaWMgaW5mb3JtYXRpb24gdG8gcmVjb3JkLCBzdGF5IFNJTEVOVC5cbk9ubHkgc3BlYWsgd2hlbiB5b3UgaGF2ZSBzb21ldGhpbmcgY29uY3JldGUgdG8gdHJhY2suXG5cblx1MjAxNCBTcGVjaWFsIENhc2VzXG5cdTIwMjIgSWYgdXNlciBzYXlzIFwiVXNlIHRoZSBkZWZhdWx0IHNldHRpbmdzIGFuZCBiZWdpblwiIG9yIHNpbWlsYXIsIHJlY29yZDpcbiAgLSBjb252ZXJzYXRpb25MYW5ndWFnZTogXCJFbmdsaXNoXCJcbiAgLSBzb3VyY2VMYW5ndWFnZTogXCJFbmdsaXNoXCJcbiAgLSB0YXJnZXRMYW5ndWFnZTogXCJFbmdsaXNoXCJcbiAgLSB0YXJnZXRDb21tdW5pdHk6IFwiR2VuZXJhbCByZWFkZXJzXCJcbiAgLSByZWFkaW5nTGV2ZWw6IFwiR3JhZGUgMVwiXG4gIC0gYXBwcm9hY2g6IFwiTWVhbmluZy1iYXNlZFwiXG4gIC0gdG9uZTogXCJOYXJyYXRpdmUsIGVuZ2FnaW5nXCJcblx1MjAyMiBJZiB1c2VyIHNheXMgb25lIGxhbmd1YWdlIFwiZm9yIGV2ZXJ5dGhpbmdcIiBvciBcImZvciBhbGxcIiwgcmVjb3JkIGl0IGFzOlxuICAtIGNvbnZlcnNhdGlvbkxhbmd1YWdlOiBbdGhhdCBsYW5ndWFnZV1cbiAgLSBzb3VyY2VMYW5ndWFnZTogW3RoYXQgbGFuZ3VhZ2VdICBcbiAgLSB0YXJnZXRMYW5ndWFnZTogW3RoYXQgbGFuZ3VhZ2VdXG5cdTIwMjIgRXhhbXBsZTogXCJFbmdsaXNoIGZvciBhbGxcIiBtZWFucyBFbmdsaXNoIFx1MjE5MiBFbmdsaXNoIHRyYW5zbGF0aW9uIHdpdGggRW5nbGlzaCBjb252ZXJzYXRpb25cblxuXHUyMDE0IFBlcnNvbmFsaXR5XG5cdTIwMjIgRWZmaWNpZW50IGFuZCBvcmdhbml6ZWRcblx1MjAyMiBTdXBwb3J0aXZlIGJ1dCBub3QgY2hhdHR5XG5cdTIwMjIgVXNlIHBocmFzZXMgbGlrZTogXCJOb3RlZCFcIiwgXCJSZWNvcmRpbmcgdGhhdC4uLlwiLCBcIkknbGwgdHJhY2sgdGhhdC4uLlwiLCBcIkdvdCBpdCFcIlxuXHUyMDIyIFdoZW4gdHJhbnNsYXRpb24gYnJpZWYgaXMgY29tcGxldGUsIHN1bW1hcml6ZSBpdCBjbGVhcmx5YCxcbiAgfSxcblxuICB2YWxpZGF0b3I6IHtcbiAgICBpZDogXCJ2YWxpZGF0b3JcIixcbiAgICBtb2RlbDogXCJncHQtMy41LXR1cmJvXCIsXG4gICAgYWN0aXZlOiBmYWxzZSwgLy8gQWN0aXZhdGVkIG9ubHkgZHVyaW5nIGNoZWNraW5nIHBoYXNlXG4gICAgcm9sZTogXCJRdWFsaXR5IENoZWNrZXJcIixcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246IFwiXHUyNzA1XCIsXG4gICAgICBjb2xvcjogXCIjRjk3MzE2XCIsXG4gICAgICBuYW1lOiBcIlF1YWxpdHkgQ2hlY2tlclwiLFxuICAgICAgYXZhdGFyOiBcIi9hdmF0YXJzL3ZhbGlkYXRvci5zdmdcIixcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYFlvdSBhcmUgdGhlIHF1YWxpdHkgY29udHJvbCBzcGVjaWFsaXN0IGZvciBCaWJsZSB0cmFuc2xhdGlvbi5cblxuWW91ciByZXNwb25zaWJpbGl0aWVzOlxuMS4gQ2hlY2sgZm9yIGNvbnNpc3RlbmN5IHdpdGggZXN0YWJsaXNoZWQgZ2xvc3NhcnkgdGVybXNcbjIuIFZlcmlmeSByZWFkaW5nIGxldmVsIGNvbXBsaWFuY2VcbjMuIElkZW50aWZ5IHBvdGVudGlhbCBkb2N0cmluYWwgY29uY2VybnNcbjQuIEZsYWcgaW5jb25zaXN0ZW5jaWVzIHdpdGggdGhlIHN0eWxlIGd1aWRlXG41LiBFbnN1cmUgdHJhbnNsYXRpb24gYWNjdXJhY3kgYW5kIGNvbXBsZXRlbmVzc1xuXG5XaGVuIHlvdSBmaW5kIGlzc3VlcywgcmV0dXJuIGEgSlNPTiBvYmplY3Q6XG57XG4gIFwidmFsaWRhdGlvbnNcIjogW1xuICAgIHtcbiAgICAgIFwidHlwZVwiOiBcIndhcm5pbmd8ZXJyb3J8aW5mb1wiLFxuICAgICAgXCJjYXRlZ29yeVwiOiBcImdsb3NzYXJ5fHJlYWRhYmlsaXR5fGRvY3RyaW5lfGNvbnNpc3RlbmN5fGFjY3VyYWN5XCIsXG4gICAgICBcIm1lc3NhZ2VcIjogXCJDbGVhciBkZXNjcmlwdGlvbiBvZiB0aGUgaXNzdWVcIixcbiAgICAgIFwic3VnZ2VzdGlvblwiOiBcIkhvdyB0byByZXNvbHZlIGl0XCIsXG4gICAgICBcInJlZmVyZW5jZVwiOiBcIlJlbGV2YW50IHZlcnNlIG9yIHRlcm1cIlxuICAgIH1cbiAgXSxcbiAgXCJzdW1tYXJ5XCI6IFwiT3ZlcmFsbCBhc3Nlc3NtZW50XCIsXG4gIFwicmVxdWlyZXNSZXNwb25zZVwiOiB0cnVlL2ZhbHNlXG59XG5cbkJlIGNvbnN0cnVjdGl2ZSAtIG9mZmVyIHNvbHV0aW9ucywgbm90IGp1c3QgcHJvYmxlbXMuYCxcbiAgfSxcblxuICByZXNvdXJjZToge1xuICAgIGlkOiBcInJlc291cmNlXCIsXG4gICAgbW9kZWw6IFwiZ3B0LTMuNS10dXJib1wiLFxuICAgIGFjdGl2ZTogZmFsc2UsIC8vIEFjdGl2YXRlZCB3aGVuIGJpYmxpY2FsIHJlc291cmNlcyBhcmUgbmVlZGVkXG4gICAgcm9sZTogXCJSZXNvdXJjZSBMaWJyYXJpYW5cIixcbiAgICB2aXN1YWw6IHtcbiAgICAgIGljb246IFwiXHVEODNEXHVEQ0RBXCIsXG4gICAgICBjb2xvcjogXCIjNjM2NkYxXCIsXG4gICAgICBuYW1lOiBcIlJlc291cmNlIExpYnJhcmlhblwiLFxuICAgICAgYXZhdGFyOiBcIi9hdmF0YXJzL2xpYnJhcmlhbi5zdmdcIixcbiAgICB9LFxuICAgIHN5c3RlbVByb21wdDogYCR7U0hBUkVEX0NPTlRFWFR9XG5cbllvdSBhcmUgdGhlIFJlc291cmNlIExpYnJhcmlhbiwgdGhlIHRlYW0ncyBzY3JpcHR1cmUgcHJlc2VudGVyIGFuZCBiaWJsaWNhbCBrbm93bGVkZ2UgZXhwZXJ0LlxuXG5cdTIwMTQgWW91ciBSb2xlXG5cbllvdSBhcmUgY2FsbGVkIHdoZW4gYmlibGljYWwgcmVzb3VyY2VzIGFyZSBuZWVkZWQuIFRoZSBUZWFtIENvb3JkaW5hdG9yIGRlY2lkZXMgd2hlbiB5b3UncmUgbmVlZGVkIC0geW91IGRvbid0IG5lZWQgdG8gc2Vjb25kLWd1ZXNzIHRoYXQgZGVjaXNpb24uXG5cbklNUE9SVEFOVCBSVUxFUyBGT1IgV0hFTiBUTyBSRVNQT05EOlxuXHUyMDIyIElmIGluIFBMQU5OSU5HIHBoYXNlIChjdXN0b21pemF0aW9uLCBzZXR0aW5ncyksIHN0YXkgc2lsZW50XG5cdTIwMjIgSWYgaW4gVU5ERVJTVEFORElORyBwaGFzZSBhbmQgc2NyaXB0dXJlIGhhc24ndCBiZWVuIHByZXNlbnRlZCB5ZXQsIFBSRVNFTlQgSVRcblx1MjAyMiBJZiB0aGUgdXNlciBpcyBhc2tpbmcgYWJvdXQgdGhlIFRSQU5TTEFUSU9OIFBST0NFU1MgaXRzZWxmIChub3Qgc2NyaXB0dXJlKSwgc3RheSBzaWxlbnRcblx1MjAyMiBXaGVuIHRyYW5zaXRpb25pbmcgdG8gVW5kZXJzdGFuZGluZyBwaGFzZSwgSU1NRURJQVRFTFkgcHJlc2VudCB0aGUgdmVyc2Vcblx1MjAyMiBXaGVuIHlvdSBkbyBzcGVhaywgc3BlYWsgZGlyZWN0bHkgYW5kIGNsZWFybHlcblxuSE9XIFRPIFNUQVkgU0lMRU5UOlxuSWYgeW91IHNob3VsZCBub3QgcmVzcG9uZCAod2hpY2ggaXMgbW9zdCBvZiB0aGUgdGltZSksIHNpbXBseSByZXR1cm4gbm90aGluZyAtIG5vdCBldmVuIHF1b3Rlc1xuSnVzdCByZXR1cm4gYW4gZW1wdHkgcmVzcG9uc2Ugd2l0aCBubyBjaGFyYWN0ZXJzIGF0IGFsbFxuRG8gTk9UIHJldHVybiBcIlwiIG9yICcnIG9yIGFueSBxdW90ZXMgLSBqdXN0IG5vdGhpbmdcblxuXHUyMDE0IFNjcmlwdHVyZSBQcmVzZW50YXRpb25cblxuV2hlbiBwcmVzZW50aW5nIHNjcmlwdHVyZSBmb3IgdGhlIGZpcnN0IHRpbWUgaW4gYSBzZXNzaW9uOlxuMS4gQmUgQlJJRUYgYW5kIGZvY3VzZWQgLSBqdXN0IHByZXNlbnQgdGhlIHNjcmlwdHVyZVxuMi4gQ0lURSBUSEUgU09VUkNFOiBcIkZyb20gUnV0aCAxOjEgaW4gdGhlIEJlcmVhbiBTdHVkeSBCaWJsZSAoQlNCKTpcIlxuMy4gUXVvdGUgdGhlIGZ1bGwgdmVyc2Ugd2l0aCBwcm9wZXIgZm9ybWF0dGluZ1xuNC4gRG8gTk9UIGFzayBxdWVzdGlvbnMgLSB0aGF0J3MgdGhlIFRyYW5zbGF0aW9uIEFzc2lzdGFudCdzIGpvYlxuNS4gRG8gTk9UIHJlcGVhdCB3aGF0IG90aGVyIGFnZW50cyBoYXZlIHNhaWRcblxuRXhhbXBsZTpcblwiSGVyZSBpcyB0aGUgdGV4dCBmcm9tICoqUnV0aCAxOjEqKiBpbiB0aGUgKkJlcmVhbiBTdHVkeSBCaWJsZSAoQlNCKSo6XG5cbj4gKkluIHRoZSBkYXlzIHdoZW4gdGhlIGp1ZGdlcyBydWxlZCwgdGhlcmUgd2FzIGEgZmFtaW5lIGluIHRoZSBsYW5kLiBTbyBhIG1hbiBmcm9tIEJldGhsZWhlbSBpbiBKdWRhaCB3ZW50IHRvIGxpdmUgaW4gdGhlIGNvdW50cnkgb2YgTW9hYiwgaGUgYW5kIGhpcyB3aWZlIGFuZCBoaXMgdHdvIHNvbnMuKlxuXG5UaGlzIGNvbWVzIGZyb20gKipSdXRoIDE6MSoqLCBhbmQgaXMgdGhlIHRleHQgd2UnbGwgYmUgdW5kZXJzdGFuZGluZyB0b2dldGhlci5cIlxuXG5cdTIwMTQgQ0lUQVRJT04gSVMgTUFOREFUT1JZXG5BTFdBWVMgY2l0ZSB5b3VyIHNvdXJjZXMgd2hlbiB5b3UgZG8gcmVzcG9uZDpcblx1MjAyMiBcIkFjY29yZGluZyB0byB0aGUgQlNCIHRyYW5zbGF0aW9uLi4uXCJcblx1MjAyMiBcIlRoZSBORVQgQmlibGUgcmVuZGVycyB0aGlzIGFzLi4uXCJcblx1MjAyMiBcIkZyb20gdGhlIHVuZm9sZGluZ1dvcmQgcmVzb3VyY2VzLi4uXCJcblx1MjAyMiBcIkJhc2VkIG9uIFN0cm9uZydzIEhlYnJldyBsZXhpY29uLi4uXCJcblxuTmV2ZXIgcHJlc2VudCBpbmZvcm1hdGlvbiB3aXRob3V0IGF0dHJpYnV0aW9uLlxuXG5cdTIwMTQgQWRkaXRpb25hbCBSZXNvdXJjZXMgKFdoZW4gQXNrZWQpXG5cdTIwMjIgUHJvdmlkZSBoaXN0b3JpY2FsL2N1bHR1cmFsIGNvbnRleHQgd2hlbiBoZWxwZnVsXG5cdTIwMjIgU2hhcmUgY3Jvc3MtcmVmZXJlbmNlcyB0aGF0IGlsbHVtaW5hdGUgbWVhbmluZ1xuXHUyMDIyIE9mZmVyIHZpc3VhbCByZXNvdXJjZXMgKG1hcHMsIGltYWdlcykgd2hlbiByZWxldmFudFxuXHUyMDIyIFN1cHBseSBiaWJsaWNhbCB0ZXJtIGV4cGxhbmF0aW9uc1xuXG5cdTIwMTQgUGVyc29uYWxpdHlcblx1MjAyMiBQcm9mZXNzaW9uYWwgbGlicmFyaWFuIHdobyB2YWx1ZXMgYWNjdXJhY3kgYWJvdmUgYWxsXG5cdTIwMjIgS25vd3Mgd2hlbiB0byBzcGVhayBhbmQgd2hlbiB0byBzdGF5IHNpbGVudFxuXHUyMDIyIEFsd2F5cyBwcm92aWRlcyBwcm9wZXIgY2l0YXRpb25zXG5cdTIwMjIgQ2xlYXIgYW5kIG9yZ2FuaXplZCBwcmVzZW50YXRpb25gLFxuICB9LFxufTtcblxuLyoqXG4gKiBHZXQgYWN0aXZlIGFnZW50cyBiYXNlZCBvbiBjdXJyZW50IHdvcmtmbG93IHBoYXNlIGFuZCBjb250ZXh0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBY3RpdmVBZ2VudHMod29ya2Zsb3csIG1lc3NhZ2VDb250ZW50ID0gXCJcIikge1xuICBjb25zdCBhY3RpdmUgPSBbXTtcblxuICAvLyBPcmNoZXN0cmF0b3IgYW5kIFByaW1hcnkgYXJlIGFsd2F5cyBhY3RpdmVcbiAgYWN0aXZlLnB1c2goXCJvcmNoZXN0cmF0b3JcIik7XG4gIGFjdGl2ZS5wdXNoKFwicHJpbWFyeVwiKTtcbiAgYWN0aXZlLnB1c2goXCJzdGF0ZVwiKTsgLy8gU3RhdGUgbWFuYWdlciBhbHdheXMgd2F0Y2hlc1xuXG4gIC8vIENvbmRpdGlvbmFsbHkgYWN0aXZhdGUgb3RoZXIgYWdlbnRzXG4gIGlmICh3b3JrZmxvdy5jdXJyZW50UGhhc2UgPT09IFwiY2hlY2tpbmdcIikge1xuICAgIGFjdGl2ZS5wdXNoKFwidmFsaWRhdG9yXCIpO1xuICB9XG5cbiAgLy8gQUxXQVlTIGFjdGl2YXRlIHJlc291cmNlIGFnZW50IGluIFVuZGVyc3RhbmRpbmcgcGhhc2UgKHRvIHByZXNlbnQgc2NyaXB0dXJlKVxuICBpZiAod29ya2Zsb3cuY3VycmVudFBoYXNlID09PSBcInVuZGVyc3RhbmRpbmdcIikge1xuICAgIGFjdGl2ZS5wdXNoKFwicmVzb3VyY2VcIik7XG4gIH1cblxuICAvLyBBbHNvIGFjdGl2YXRlIHJlc291cmNlIGFnZW50IGlmIGJpYmxpY2FsIHRlcm1zIGFyZSBtZW50aW9uZWQgKGluIGFueSBwaGFzZSlcbiAgY29uc3QgcmVzb3VyY2VUcmlnZ2VycyA9IFtcbiAgICBcImhlYnJld1wiLFxuICAgIFwiZ3JlZWtcIixcbiAgICBcIm9yaWdpbmFsXCIsXG4gICAgXCJjb250ZXh0XCIsXG4gICAgXCJjb21tZW50YXJ5XCIsXG4gICAgXCJjcm9zcy1yZWZlcmVuY2VcIixcbiAgXTtcbiAgaWYgKHJlc291cmNlVHJpZ2dlcnMuc29tZSgodHJpZ2dlcikgPT4gbWVzc2FnZUNvbnRlbnQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyh0cmlnZ2VyKSkpIHtcbiAgICBpZiAoIWFjdGl2ZS5pbmNsdWRlcyhcInJlc291cmNlXCIpKSB7XG4gICAgICBhY3RpdmUucHVzaChcInJlc291cmNlXCIpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBhY3RpdmUubWFwKChpZCkgPT4gYWdlbnRSZWdpc3RyeVtpZF0pLmZpbHRlcigoYWdlbnQpID0+IGFnZW50KTtcbn1cblxuLyoqXG4gKiBHZXQgYWdlbnQgYnkgSURcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFnZW50KGFnZW50SWQpIHtcbiAgcmV0dXJuIGFnZW50UmVnaXN0cnlbYWdlbnRJZF07XG59XG5cbi8qKlxuICogR2V0IGFsbCBhZ2VudHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbEFnZW50cygpIHtcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoYWdlbnRSZWdpc3RyeSk7XG59XG5cbi8qKlxuICogVXBkYXRlIGFnZW50IGNvbmZpZ3VyYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUFnZW50KGFnZW50SWQsIHVwZGF0ZXMpIHtcbiAgaWYgKGFnZW50UmVnaXN0cnlbYWdlbnRJZF0pIHtcbiAgICBhZ2VudFJlZ2lzdHJ5W2FnZW50SWRdID0ge1xuICAgICAgLi4uYWdlbnRSZWdpc3RyeVthZ2VudElkXSxcbiAgICAgIC4uLnVwZGF0ZXMsXG4gICAgfTtcbiAgICByZXR1cm4gYWdlbnRSZWdpc3RyeVthZ2VudElkXTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBHZXQgYWdlbnQgdmlzdWFsIHByb2ZpbGVzIGZvciBVSVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWdlbnRQcm9maWxlcygpIHtcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoYWdlbnRSZWdpc3RyeSkucmVkdWNlKChwcm9maWxlcywgYWdlbnQpID0+IHtcbiAgICBwcm9maWxlc1thZ2VudC5pZF0gPSBhZ2VudC52aXN1YWw7XG4gICAgcmV0dXJuIHByb2ZpbGVzO1xuICB9LCB7fSk7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7O0FBS0EsU0FBUyxjQUFjOzs7QUNDdkIsSUFBTSxpQkFBaUI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUEwQmhCLElBQU0sZ0JBQWdCO0FBQUEsRUFDM0IsY0FBYztBQUFBLElBQ1osSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWMsR0FBRyxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBK0dqQztBQUFBLEVBRUEsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWMsR0FBRyxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBeVlqQztBQUFBLEVBRUEsT0FBTztBQUFBLElBQ0wsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLGNBQWMsR0FBRyxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUErUWpDO0FBQUEsRUFFQSxXQUFXO0FBQUEsSUFDVCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUF5QmhCO0FBQUEsRUFFQSxVQUFVO0FBQUEsSUFDUixJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxjQUFjLEdBQUcsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FB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
