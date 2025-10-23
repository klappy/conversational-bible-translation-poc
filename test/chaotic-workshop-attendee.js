#!/usr/bin/env node

/**
 * CHAOTIC WORKSHOP ATTENDEE TEST
 * 
 * This test simulates REAL human behavior in workshops:
 * - Random curiosity and questions
 * - Going backwards and forwards between phases
 * - Clicking random buttons
 * - Natural confusion
 * - Interruptions and tangents
 * - Skipping things
 * - Non-linear navigation
 * 
 * HYBRID APPROACH:
 * - 60% probabilistic pools (fast, cheap)
 * - 40% LLM-generated responses (natural, expensive)
 * 
 * Run with: node test/chaotic-workshop-attendee.js
 * Or: npm run test:chaotic
 */

import http from "http";
import process from "process";
import { config } from "dotenv";
import OpenAI from "openai";

// Load environment variables
config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BASE_URL = "http://localhost:8888";

// Random pool of names (no hardcoding a specific persona)
const POSSIBLE_NAMES = [
  "Maria", "John", "Sarah", "David", "Ruth", "Paul", "Esther", "James",
  "Deborah", "Peter", "Hannah", "Andrew", "Lydia", "Thomas", "Priscilla"
];

// Random pool of natural responses for settings
const LANGUAGE_OPTIONS = [
  "English", "Spanish", "French", "Portuguese", "Swahili", "Korean"
];

const READING_LEVELS = [
  "Grade 1", "Grade 3", "Grade 6", "Grade 8", "Grade 10", "Adult"
];

const TONES = [
  "Friendly and warm", "Casual and fun", "Respectful and clear", 
  "Reverent and formal", "Straightforward", "Engaging and modern"
];

const APPROACHES = [
  "Word-for-word", "Meaning-based", "Dynamic", "Balanced"
];

// Random questions a confused user might ask
const CONFUSION_QUESTIONS = [
  "Wait, what are we doing again?",
  "Can you explain that differently?",
  "I'm not sure I understand",
  "What happens next?",
  "Can I go back?",
  "Do I have to do this part?",
  "What if I skip this?",
  "Is this the right answer?",
  "Can you show me an example?",
  "How much longer will this take?",
  "What do these buttons do?",
  "I changed my mind about that last answer"
];

// Random affirmative responses (not hardcoded phrases)
const AFFIRMATIONS = [
  "okay", "sure", "yes", "got it", "alright", "sounds good",
  "let's do it", "yep", "makes sense", "continue", "next"
];

// Probability weights for different behaviors
const BEHAVIOR_PROBABILITIES = {
  USE_SUGGESTION: 0.4,           // 40% chance to click a suggestion
  TYPE_OWN_RESPONSE: 0.3,        // 30% chance to type something
  ASK_QUESTION: 0.15,            // 15% chance to ask a confused question
  GO_BACKWARDS: 0.05,            // 5% chance to try going back
  SKIP_ATTEMPT: 0.05,            // 5% chance to try skipping
  RANDOM_CLICK: 0.05             // 5% chance to click something random
};

// LLM usage probability
const USE_LLM_PROBABILITY = 0.4;  // 40% of responses use LLM

class ChaoticWorkshopAttendee {
  constructor(personaNumber) {
    this.personaNumber = personaNumber;
    this.sessionId = `test_chaotic_${personaNumber}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    this.conversationHistory = [];
    this.currentPhase = "planning";
    this.name = this.randomChoice(POSSIBLE_NAMES);
    this.messagesExchanged = 0;
    this.questionsAsked = 0;
    this.backwardsMoves = 0;
    this.settingsGiven = 0;
    this.conversationContext = [];
    
    // Track what we've done (for analysis, not for scripting)
    this.actions = [];
    this.llmCallsMade = 0;
    this.poolResponsesUsed = 0;
  }

  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  randomFloat() {
    return Math.random();
  }

  async makeRequest(path, data = null) {
    return new Promise((resolve, reject) => {
      let netlifyPath = path;
      if (path.startsWith("/api/")) {
        netlifyPath = path.replace("/api/", "/.netlify/functions/");
      } else if (!path.startsWith("/.netlify/functions/")) {
        netlifyPath = `/.netlify/functions${path}`;
      }

      const headers = { "Content-Type": "application/json" };
      if (this.sessionId) {
        headers["X-Session-ID"] = this.sessionId;
      }

      const options = {
        hostname: "localhost",
        port: 8888,
        path: netlifyPath,
        method: data ? "POST" : "GET",
        headers,
      };

      const req = http.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch {
            resolve({ error: "Failed to parse response" });
          }
        });
      });

      req.on("error", reject);
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  async sendMessage(message) {
    console.log(`\n👤 ${this.name}: "${message}"`);
    this.messagesExchanged++;
    
    const response = await this.makeRequest("/api/conversation", {
      message,
      sessionId: this.sessionId,
    });

    if (response && response.messages) {
      response.messages.forEach((msg) => {
        if (msg.role === "assistant" && msg.content) {
          console.log(`🤖 ${msg.agent?.name || "System"}: ${msg.content.substring(0, 100)}...`);
        }
      });
    }

    return response;
  }

  async getCanvasState() {
    return await this.makeRequest(`/api/canvas-state`);
  }

  // Decide what to do next based on AI response and current context
  async decideNextAction(lastResponse) {
    const roll = this.randomFloat();
    
    // Check if there are suggestions available
    const hasSuggestions = lastResponse.suggestions && lastResponse.suggestions.length > 0;
    
    // Randomly decide what kind of action to take
    if (roll < BEHAVIOR_PROBABILITIES.ASK_QUESTION) {
      // Ask a confused question
      this.questionsAsked++;
      this.actions.push("asked_question");
      return this.randomChoice(CONFUSION_QUESTIONS);
    } 
    else if (roll < BEHAVIOR_PROBABILITIES.ASK_QUESTION + BEHAVIOR_PROBABILITIES.GO_BACKWARDS) {
      // Try to go backwards
      this.backwardsMoves++;
      this.actions.push("went_backwards");
      return this.randomChoice([
        "Can I go back to the previous step?",
        "I want to change something",
        "Let's go back",
        "Can we redo that?"
      ]);
    }
    else if (roll < BEHAVIOR_PROBABILITIES.ASK_QUESTION + BEHAVIOR_PROBABILITIES.GO_BACKWARDS + BEHAVIOR_PROBABILITIES.SKIP_ATTEMPT) {
      // Try to skip
      this.actions.push("tried_skip");
      return this.randomChoice([
        "Can I skip this?",
        "Do I have to do this part?",
        "Let's move on",
        "I'll come back to this later"
      ]);
    }
    else if (roll < BEHAVIOR_PROBABILITIES.ASK_QUESTION + BEHAVIOR_PROBABILITIES.GO_BACKWARDS + BEHAVIOR_PROBABILITIES.SKIP_ATTEMPT + BEHAVIOR_PROBABILITIES.RANDOM_CLICK) {
      // Random click/action
      this.actions.push("random_click");
      return this.randomChoice([
        "What does this button do?",
        "Let me try this",
        "Hmm...",
        "Interesting"
      ]);
    }
    else if (hasSuggestions && roll < BEHAVIOR_PROBABILITIES.ASK_QUESTION + BEHAVIOR_PROBABILITIES.GO_BACKWARDS + BEHAVIOR_PROBABILITIES.SKIP_ATTEMPT + BEHAVIOR_PROBABILITIES.RANDOM_CLICK + BEHAVIOR_PROBABILITIES.USE_SUGGESTION) {
      // Click a random suggestion
      this.actions.push("clicked_suggestion");
      return this.randomChoice(lastResponse.suggestions);
    }
    else {
      // Type their own response (generate contextually)
      this.actions.push("typed_own");
      return await this.generateContextualResponse(lastResponse);
    }
  }

  // Generate a response based on what the AI just asked
  async generateContextualResponse(lastResponse) {
    const content = lastResponse.messages?.[0]?.content?.toLowerCase() || "";
    
    // 40% of the time, use LLM for natural responses
    const useLLM = this.randomFloat() < USE_LLM_PROBABILITY && process.env.OPENAI_API_KEY;
    
    if (useLLM) {
      return await this.generateLLMResponse(lastResponse);
    }
    
    // Otherwise use probabilistic pools (60% of the time)
    this.poolResponsesUsed++;
    
    // Detect what's being asked and respond appropriately (but randomly)
    if (content.includes("name") && !this.settingsGiven) {
      return this.name;
    }
    else if (content.includes("language") && content.includes("conversation")) {
      this.settingsGiven++;
      return this.randomChoice(LANGUAGE_OPTIONS);
    }
    else if (content.includes("language") && content.includes("source")) {
      this.settingsGiven++;
      return this.randomChoice(LANGUAGE_OPTIONS);
    }
    else if (content.includes("language") && content.includes("target")) {
      this.settingsGiven++;
      return this.randomChoice(LANGUAGE_OPTIONS);
    }
    else if (content.includes("reading level")) {
      this.settingsGiven++;
      return this.randomChoice(READING_LEVELS);
    }
    else if (content.includes("tone")) {
      this.settingsGiven++;
      return this.randomChoice(TONES);
    }
    else if (content.includes("approach") || content.includes("philosophy")) {
      this.settingsGiven++;
      return this.randomChoice(APPROACHES);
    }
    else if (content.includes("community") || content.includes("audience")) {
      this.settingsGiven++;
      return this.randomChoice([
        "Youth group", "Children", "Adults", "Seniors", "ESL learners", "Prison ministry"
      ]);
    }
    else if (content.includes("phrase") || content.includes("understand") || content.includes("explain")) {
      // In understanding phase, give natural explanations (not hardcoded)
      return this.randomChoice([
        "It means when something happened a long time ago",
        "I think this is about people not having enough food",
        "This is describing someone traveling to another place",
        "It's talking about a person and their family",
        "I'm not totally sure but maybe it means...",
        "Could this be about leaders or judges?",
        "I think it's describing a difficult time"
      ]);
    }
    else if (content.includes("draft") || content.includes("translation")) {
      // In drafting phase, create a simple draft (not hardcoded)
      return "A long time ago when judges were leaders, there was no food. A man took his family to another country.";
    }
    else {
      // Generic affirmation or continuation
      return this.randomChoice(AFFIRMATIONS);
    }
  }

  // Use LLM to generate a natural response
  async generateLLMResponse(lastResponse) {
    this.llmCallsMade++;
    this.actions.push("used_llm");

    try {
      const aiMessage = lastResponse.messages?.[0]?.content || "";
      
      // Build context from recent conversation
      const recentContext = this.conversationContext.slice(-5).map(msg => {
        return `${msg.role === 'user' ? 'Me' : 'Assistant'}: ${msg.content.substring(0, 150)}`;
      }).join("\n");

      const prompt = `You are ${this.name}, a somewhat confused but earnest workshop attendee learning to translate scripture. You're not an expert - you ask questions, sometimes misunderstand, and respond naturally like a real person would.

Recent conversation:
${recentContext}

The assistant just said: "${aiMessage.substring(0, 300)}"

Respond naturally as ${this.name}. Be brief (1-2 sentences). You might:
- Answer the question if you understand it
- Ask for clarification if confused
- Show curiosity or uncertainty
- Give a simple, natural response

Your response:`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 100,
      });

      const response = completion.choices[0]?.message?.content?.trim() || "okay";
      console.log(`  [LLM Generated: "${response}"]`);
      return response;
    } catch (error) {
      console.error(`  [LLM Error: ${error.message}, falling back to pool]`);
      this.poolResponsesUsed++;
      return this.randomChoice(AFFIRMATIONS);
    }
  }

  async runChaoticWorkshop() {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🎭 CHAOTIC WORKSHOP ATTENDEE #${this.personaNumber}: ${this.name}`);
    console.log(`${"=".repeat(60)}`);

    try {
      console.log(`📱 Session ID: ${this.sessionId}`);

      // Start the conversation
      let response = await this.sendMessage("Hello!");
      
      // Continue having a chaotic conversation for a while
      const MAX_EXCHANGES = Math.floor(Math.random() * 31) + 20; // 20-50 exchanges
      
      for (let i = 0; i < MAX_EXCHANGES; i++) {
        // Track conversation context
        if (response && response.messages) {
          response.messages.forEach(msg => {
            if (msg.role === 'assistant' && msg.content) {
              this.conversationContext.push({ role: 'assistant', content: msg.content });
            }
          });
        }

        // Decide what to do next
        const nextMessage = await this.decideNextAction(response);
        
        // Send it
        response = await this.sendMessage(nextMessage);
        this.conversationContext.push({ role: 'user', content: nextMessage });
        
        // Small random delay (humans don't respond instantly)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
        
        // Check current state occasionally
        if (i % 10 === 0) {
          const state = await this.getCanvasState();
          this.currentPhase = state.workflow?.currentPhase || "unknown";
          console.log(`\n📊 [Checkpoint] Phase: ${this.currentPhase}, Messages: ${this.messagesExchanged}`);
        }
      }

      // Final state check
      return await this.analyzeExperience();

    } catch (error) {
      console.error(`❌ Workshop failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        name: this.name,
        messagesExchanged: this.messagesExchanged
      };
    }
  }

  async analyzeExperience() {
    const finalState = await this.getCanvasState();
    
    const analysis = {
      name: this.name,
      personaNumber: this.personaNumber,
      messagesExchanged: this.messagesExchanged,
      questionsAsked: this.questionsAsked,
      backwardsMoves: this.backwardsMoves,
      settingsProvided: this.settingsGiven,
      finalPhase: finalState.workflow?.currentPhase,
      hadDraft: !!finalState.scriptureCanvas?.verses?.["Ruth 1:1"]?.draft,
      glossaryTerms: Object.keys(finalState.glossary?.keyTerms || {}).length,
      glossaryPhrases: Object.keys(finalState.glossary?.userPhrases || {}).length,
      settingsCustomized: finalState.settingsCustomized,
      actions: this.actions,
      
      // Qualitative assessment
      experienceQuality: this.assessExperience(finalState)
    };

    // Print analysis
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📊 EXPERIENCE ANALYSIS - ${this.name}`);
    console.log(`${"=".repeat(60)}`);
    console.log(`Messages Exchanged: ${analysis.messagesExchanged}`);
    console.log(`Questions Asked: ${analysis.questionsAsked}`);
    console.log(`Backwards Moves: ${analysis.backwardsMoves}`);
    console.log(`Settings Provided: ${analysis.settingsProvided}/7`);
    console.log(`Final Phase: ${analysis.finalPhase}`);
    console.log(`Has Draft: ${analysis.hadDraft ? "✅" : "❌"}`);
    console.log(`Glossary Terms: ${analysis.glossaryTerms}`);
    console.log(`Glossary Phrases: ${analysis.glossaryPhrases}`);
    console.log(`Settings Customized: ${analysis.settingsCustomized ? "✅" : "❌"}`);
    console.log(`\n🎯 Experience Quality: ${analysis.experienceQuality}`);
    console.log(`\n🤖 Response Generation:`);
    console.log(`  - LLM calls: ${this.llmCallsMade}`);
    console.log(`  - Pool responses: ${this.poolResponsesUsed}`);
    console.log(`  - LLM percentage: ${Math.round((this.llmCallsMade / (this.llmCallsMade + this.poolResponsesUsed)) * 100)}%`);
    console.log(`\nAction Distribution:`);
    const actionCounts = {};
    this.actions.forEach(a => actionCounts[a] = (actionCounts[a] || 0) + 1);
    Object.entries(actionCounts).forEach(([action, count]) => {
      console.log(`  - ${action}: ${count} times`);
    });

    return analysis;
  }

  assessExperience(state) {
    // Qualitative assessment based on what got accomplished
    const scores = [];
    
    if (state.settingsCustomized) scores.push("Settings Complete");
    if (state.workflow?.currentPhase !== "planning") scores.push("Progressed Beyond Planning");
    if (state.scriptureCanvas?.verses?.["Ruth 1:1"]?.draft) scores.push("Draft Created");
    if (Object.keys(state.glossary?.userPhrases || {}).length > 3) scores.push("Good Glossary");
    
    if (scores.length === 0) return "❌ FRUSTRATED - Made little progress";
    if (scores.length <= 1) return "⚠️ CONFUSED - Some progress but struggled";
    if (scores.length <= 2) return "😐 MIXED - Accomplished some goals";
    if (scores.length <= 3) return "🙂 DECENT - Good progress made";
    return "✅ SUCCESS - Accomplished goals naturally";
  }
}

// Run multiple chaotic attendees in parallel
async function main() {
  const numAttendees = parseInt(process.argv[2]) || 5; // Default 5, can pass number as arg
  
  console.log("\n🎪 CHAOTIC WORKSHOP SIMULATION");
  console.log(`Simulating ${numAttendees} workshop attendees with natural, unpredictable behavior`);
  console.log("No scripts. No hardcoded responses. Just chaos and probability.\n");

  const results = [];
  
  // Run attendees sequentially (parallel would overwhelm the server)
  for (let i = 1; i <= numAttendees; i++) {
    const attendee = new ChaoticWorkshopAttendee(i);
    const result = await attendee.runChaoticWorkshop();
    results.push(result);
    
    // Small delay between attendees
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Aggregate analysis
  console.log("\n\n" + "=".repeat(80));
  console.log("📊 AGGREGATE ANALYSIS - ALL ATTENDEES");
  console.log("=".repeat(80));

  const successful = results.filter(r => r.experienceQuality?.includes("SUCCESS")).length;
  const decent = results.filter(r => r.experienceQuality?.includes("DECENT")).length;
  const mixed = results.filter(r => r.experienceQuality?.includes("MIXED")).length;
  const confused = results.filter(r => r.experienceQuality?.includes("CONFUSED")).length;
  const frustrated = results.filter(r => r.experienceQuality?.includes("FRUSTRATED")).length;

  console.log(`\nExperience Distribution:`);
  console.log(`  ✅ Success: ${successful}/${numAttendees} (${Math.round(successful/numAttendees*100)}%)`);
  console.log(`  🙂 Decent: ${decent}/${numAttendees} (${Math.round(decent/numAttendees*100)}%)`);
  console.log(`  😐 Mixed: ${mixed}/${numAttendees} (${Math.round(mixed/numAttendees*100)}%)`);
  console.log(`  ⚠️ Confused: ${confused}/${numAttendees} (${Math.round(confused/numAttendees*100)}%)`);
  console.log(`  ❌ Frustrated: ${frustrated}/${numAttendees} (${Math.round(frustrated/numAttendees*100)}%)`);

  const avgMessages = results.reduce((sum, r) => sum + r.messagesExchanged, 0) / numAttendees;
  const avgQuestions = results.reduce((sum, r) => sum + r.questionsAsked, 0) / numAttendees;
  const avgBackwards = results.reduce((sum, r) => sum + r.backwardsMoves, 0) / numAttendees;

  console.log(`\nBehavior Averages:`);
  console.log(`  Messages per person: ${avgMessages.toFixed(1)}`);
  console.log(`  Questions asked: ${avgQuestions.toFixed(1)}`);
  console.log(`  Backwards moves: ${avgBackwards.toFixed(1)}`);

  const withDrafts = results.filter(r => r.hadDraft).length;
  const customizedSettings = results.filter(r => r.settingsCustomized).length;

  console.log(`\nGoals Accomplished:`);
  console.log(`  Settings customized: ${customizedSettings}/${numAttendees} (${Math.round(customizedSettings/numAttendees*100)}%)`);
  console.log(`  Draft created: ${withDrafts}/${numAttendees} (${Math.round(withDrafts/numAttendees*100)}%)`);

  // Success criteria: At least 70% had decent or better experience
  const successRate = (successful + decent) / numAttendees;
  const passed = successRate >= 0.7;

  console.log(`\n${"=".repeat(80)}`);
  if (passed) {
    console.log(`✅ WORKSHOP PASSES: ${Math.round(successRate * 100)}% had decent or better experience`);
    console.log(`The system handles chaotic, natural user behavior well!`);
  } else {
    console.log(`⚠️ WORKSHOP NEEDS WORK: Only ${Math.round(successRate * 100)}% had decent or better experience`);
    console.log(`The system struggles with natural, unpredictable user behavior.`);
  }
  console.log(`${"=".repeat(80)}\n`);

  process.exit(passed ? 0 : 1);
}

main().catch(console.error);
