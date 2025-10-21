/**
 * Intelligent Conversation Tester for Bible Translation Assistant
 *
 * This AI-powered tester acts as a workshop attendee and naturally
 * converses with the translation assistant to test the full flow.
 */

import fetch from "node-fetch";

class IntelligentWorkshopAttendee {
  constructor(baseUrl = "http://localhost:9999", persona = "curious_beginner") {
    this.baseUrl = baseUrl;
    this.sessionId = `workshop_${persona}_${Date.now()}`;
    this.conversationHistory = [];
    this.currentState = {};
    this.persona = persona;
    this.testLog = [];

    // Define different personas for varied testing
    this.personas = {
      curious_beginner: {
        name: "Maria",
        background: "First-time Bible translator, Spanish speaker",
        style: "asks questions, sometimes needs clarification",
        preferences: {
          conversationLanguage: "English",
          sourceLanguage: "Hebrew",
          targetLanguage: "Spanish",
          community: "teenagers in my youth group",
          readingLevel: "Grade 8",
          tone: "friendly and modern",
          approach: "meaning-based",
        },
      },
      experienced_translator: {
        name: "John",
        background: "Has done translation before, knows what he wants",
        style: "direct, uses suggestions often",
        preferences: {
          conversationLanguage: "English",
          sourceLanguage: "Greek",
          targetLanguage: "French",
          community: "educated adults",
          readingLevel: "Grade 12",
          tone: "formal and reverent",
          approach: "word-for-word",
        },
      },
      confused_user: {
        name: "Sarah",
        background: "Not sure about the process, needs guidance",
        style: "uncertain, asks for help, changes mind",
        preferences: {
          conversationLanguage: "English",
          sourceLanguage: "English",
          targetLanguage: "Simple English",
          community: "young children",
          readingLevel: "Grade 2",
          tone: "simple and clear",
          approach: "meaning-based",
        },
      },
      children_minister: {
        name: "Pastor Amy",
        background: "Children's ministry leader simplifying for kids",
        style: "enthusiastic, clear about needs",
        preferences: {
          conversationLanguage: "English",
          sourceLanguage: "English",
          targetLanguage: "Simple English",
          community: "elementary school children",
          readingLevel: "Grade 1",
          tone: "fun and engaging",
          approach: "meaning-based",
        },
      },
      esl_teacher: {
        name: "Ms. Chen",
        background: "ESL teacher needing simplified text for adult learners",
        style: "methodical, explains context",
        preferences: {
          conversationLanguage: "English",
          sourceLanguage: "English",
          targetLanguage: "Simple English",
          community: "adult English learners",
          readingLevel: "Grade 4",
          tone: "clear and respectful",
          approach: "meaning-based",
        },
      },
      youth_pastor: {
        name: "Jake",
        background: "Youth pastor modernizing scripture for teens",
        style: "casual, uses slang occasionally",
        preferences: {
          conversationLanguage: "English",
          sourceLanguage: "English",
          targetLanguage: "Modern English",
          community: "high school students",
          readingLevel: "Grade 10",
          tone: "relatable and authentic",
          approach: "meaning-based",
        },
      },
      senior_ministry: {
        name: "Reverend Thomas",
        background: "Senior ministry leader, wants traditional but clear",
        style: "formal, traditional",
        preferences: {
          conversationLanguage: "English",
          sourceLanguage: "English",
          targetLanguage: "Clear English",
          community: "senior adults",
          readingLevel: "Grade 8",
          tone: "dignified and clear",
          approach: "word-for-word",
        },
      },
      prison_chaplain: {
        name: "Chaplain Mike",
        background: "Prison chaplain needing accessible version",
        style: "direct, practical",
        preferences: {
          conversationLanguage: "English",
          sourceLanguage: "English",
          targetLanguage: "Plain English",
          community: "incarcerated individuals",
          readingLevel: "Grade 6",
          tone: "straightforward and hopeful",
          approach: "balanced",
        },
      },
    };

    this.currentPersona = this.personas[persona] || this.personas.curious_beginner;
  }

  /**
   * Start a conversation with the AI
   */
  async startConversation() {
    console.log(`\n🎭 Workshop Attendee: ${this.currentPersona.name}`);
    console.log(`📝 Background: ${this.currentPersona.background}\n`);
    console.log("=".repeat(60));

    // Start with a greeting
    const greeting = this.generateGreeting();
    await this.sendMessage(greeting);

    // Continue the conversation naturally
    let conversationComplete = false;
    let turnCount = 0;
    const maxTurns = 30; // Prevent infinite loops

    while (!conversationComplete && turnCount < maxTurns) {
      turnCount++;

      // Analyze the last response and decide what to say
      const nextMessage = await this.generateNextResponse();

      if (!nextMessage) {
        console.log("\n✅ Conversation complete!");
        conversationComplete = true;
        break;
      }

      // Send the message
      await this.sendMessage(nextMessage);

      // Check if we've reached a good stopping point
      if (this.isConversationComplete()) {
        conversationComplete = true;
      }

      // Add a small delay to simulate human typing
      await this.delay(1000);
    }

    return this.generateTestReport();
  }

  /**
   * Generate a natural greeting based on persona
   */
  generateGreeting() {
    const greetings = {
      curious_beginner: [
        "Hello! I'm interested in translating the Bible for my youth group",
        "Hi there! I'd like to learn about Bible translation",
        "Hello, can you help me translate scripture?",
      ],
      experienced_translator: [
        "Hello, I need to set up a translation project",
        "Hi, let's get started with translation",
        "Good day, I'm ready to begin translating",
      ],
      confused_user: [
        "Um, hello? Is this where I can get help with translation?",
        "Hi... I'm not sure how this works",
        "Hello? Can someone help me?",
      ],
      children_minister: [
        "Hi! I need to make the Bible understandable for kids",
        "Hello! I'm preparing scripture for our children's program",
        "Hey there! Can you help me simplify Bible passages for kids?",
      ],
      esl_teacher: [
        "Hello, I teach English as a second language and need simplified texts",
        "Hi, I need help adapting scripture for English learners",
        "Good morning, I'm looking to create accessible Bible texts for my ESL students",
      ],
      youth_pastor: [
        "Hey! I want to make the Bible more relatable for teens",
        "What's up! Need help modernizing scripture for high schoolers",
        "Hi there! Looking to translate Bible passages for youth group",
      ],
      senior_ministry: [
        "Good day, I need clear scripture for our senior congregation",
        "Hello, I'm looking for traditional but accessible translations",
        "Greetings, I minister to seniors and need clear Bible texts",
      ],
      prison_chaplain: [
        "Hello, I'm a chaplain and need accessible scripture",
        "Hi, I work in corrections and need plain language Bible texts",
        "Good day, I need to prepare understandable scripture for my ministry",
      ],
    };

    const options = greetings[this.persona] || greetings.curious_beginner;
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Analyze the conversation and generate an appropriate response
   */
  async generateNextResponse() {
    const lastMessage = this.getLastAssistantMessage();
    if (!lastMessage) return null;

    const content = lastMessage.content.toLowerCase();
    const suggestions = this.getLastSuggestions();

    // Detect what the AI is asking for
    if (content.includes("language") && content.includes("conversation")) {
      return this.respondToLanguageQuestion("conversation");
    }

    if (content.includes("translating from") || content.includes("source language")) {
      return this.respondToLanguageQuestion("source");
    }

    if (
      content.includes("translating to") ||
      content.includes("translating into") ||
      content.includes("target language")
    ) {
      return this.respondToLanguageQuestion("target");
    }

    if (
      content.includes("who will be reading") ||
      content.includes("audience") ||
      content.includes("community")
    ) {
      return this.respondToCommunityQuestion();
    }

    if (content.includes("reading level") || content.includes("grade")) {
      return this.respondToReadingLevelQuestion();
    }

    if (content.includes("tone") || content.includes("style")) {
      return this.respondToToneQuestion();
    }

    if (
      content.includes("approach") ||
      content.includes("word-for-word") ||
      content.includes("meaning-based")
    ) {
      return this.respondToApproachQuestion();
    }

    // Understanding phase
    if (
      content.includes("ruth 1:1") ||
      content.includes("first verse") ||
      content.includes("here is the text")
    ) {
      return this.respondToScripturePresentation();
    }

    if (
      content.includes("understand") ||
      content.includes("make sense") ||
      content.includes("clear")
    ) {
      return this.respondToUnderstandingCheck();
    }

    // If asked about understanding a phrase
    if (
      content.includes("phrase") &&
      (content.includes("understand") || content.includes("mean"))
    ) {
      return "Yes, I understand that phrase. Let's continue.";
    }

    // Drafting phase - be more aggressive about providing drafts
    if (
      content.includes("draft") ||
      content.includes("translate") ||
      content.includes("try writing") ||
      content.includes("your version") ||
      content.includes("ready to draft") ||
      content.includes("start drafting")
    ) {
      return this.provideDraft();
    }

    // If we've understood all phrases, offer to draft
    if (content.includes("understood all") || content.includes("ready to draft")) {
      return this.provideDraft();
    }

    // Use suggestions sometimes, especially "Start drafting"
    if (suggestions && suggestions.length > 0) {
      // Always pick drafting-related suggestions
      const draftSuggestion = suggestions.find(
        (s) =>
          s.toLowerCase().includes("draft") ||
          s.toLowerCase().includes("start") ||
          s.toLowerCase().includes("yes")
      );
      if (draftSuggestion) {
        return draftSuggestion;
      }
      // Otherwise use suggestions randomly
      if (Math.random() > 0.3) {
        return this.selectFromSuggestions(suggestions);
      }
    }

    // Default confused response
    if (this.persona === "confused_user") {
      return "I'm not sure what you're asking. Can you explain?";
    }

    return null;
  }

  /**
   * Respond to language questions based on persona
   */
  respondToLanguageQuestion(type) {
    const pref = this.currentPersona.preferences;

    switch (type) {
      case "conversation":
        if (this.persona === "confused_user" && Math.random() > 0.5) {
          return "Um, English I guess? Is that okay?";
        }
        return pref.conversationLanguage;

      case "source":
        if (this.persona === "curious_beginner") {
          return `${pref.sourceLanguage}. I want to work from the original text.`;
        }
        return pref.sourceLanguage;

      case "target":
        if (this.persona === "experienced_translator") {
          return `${pref.targetLanguage}, specifically Parisian French.`;
        }
        return pref.targetLanguage;
    }
  }

  /**
   * Respond about target community
   */
  respondToCommunityQuestion() {
    const pref = this.currentPersona.preferences;

    if (this.persona === "curious_beginner") {
      return `I'm working with ${pref.community}. They're really engaged but need something they can understand.`;
    }

    if (this.persona === "confused_user") {
      return `Um, ${pref.community}? Is that what you mean?`;
    }

    return pref.community;
  }

  /**
   * Respond about reading level
   */
  respondToReadingLevelQuestion() {
    const pref = this.currentPersona.preferences;

    if (this.persona === "experienced_translator") {
      return pref.readingLevel;
    }

    if (this.persona === "confused_user") {
      return `Maybe ${pref.readingLevel}? They're pretty young...`;
    }

    return `I think ${pref.readingLevel} would be appropriate`;
  }

  /**
   * Respond about tone
   */
  respondToToneQuestion() {
    const pref = this.currentPersona.preferences;

    if (this.persona === "curious_beginner") {
      return `Something ${pref.tone}. I want them to connect with it.`;
    }

    return pref.tone;
  }

  /**
   * Respond about translation approach
   */
  respondToApproachQuestion() {
    const pref = this.currentPersona.preferences;

    if (this.persona === "experienced_translator") {
      return `${pref.approach}. I prefer precision.`;
    }

    if (this.persona === "confused_user") {
      return `I don't really know the difference... maybe ${pref.approach}?`;
    }

    return pref.approach;
  }

  /**
   * Respond to scripture presentation
   */
  respondToScripturePresentation() {
    const responses = {
      curious_beginner:
        "Oh interesting! So this is talking about the time of the judges and a famine. What does Moab represent here?",
      experienced_translator:
        "Yes, I understand. The temporal setting and geographical movement are key. Let's continue.",
      confused_user: "I think I understand - there was a famine and someone went to Moab?",
      children_minister:
        "OK, so this is about a family that had to move because there was no food. How should I explain this to kids?",
      esl_teacher:
        "I see - a time period, a problem (famine), and a solution (migration). Let me work through this for my students.",
      youth_pastor:
        "Got it - tough times, family has to relocate. How can I make this relatable for teens?",
      senior_ministry:
        "I understand - the time of judges, famine in the land, journey to Moab. Let's proceed with clarity.",
      prison_chaplain:
        "A story about hardship and having to leave home. This will resonate. Let's continue.",
    };

    return responses[this.persona] || responses.confused_user;
  }

  /**
   * Respond to understanding check
   */
  respondToUnderstandingCheck() {
    if (this.persona === "confused_user") {
      return "I think so? Can you explain it once more?";
    }

    return "Yes, I understand. Let's move on to drafting.";
  }

  /**
   * Provide a translation draft
   */
  provideDraft() {
    const drafts = {
      curious_beginner:
        "Here's my attempt: 'Back when the judges were in charge, there wasn't enough food in the land. So a man from Bethlehem in Judah went to live in Moab country with his wife and two sons.'",

      experienced_translator:
        "In the days when the judges governed, a famine occurred in the land. A certain man from Bethlehem of Judah went to sojourn in the fields of Moab—he, his wife, and his two sons.",

      confused_user:
        "During the time of the judges, there was no food. A man from Bethlehem went to Moab with his family.",

      children_minister:
        "Long ago when special leaders called judges were in charge, there was no food to eat. A man from a town called Bethlehem had to take his wife and two boys to live in another place called Moab.",

      esl_teacher:
        "When the judges ruled Israel, there was a time with no food. A man from Bethlehem took his wife and two sons. They went to live in the country of Moab.",

      youth_pastor:
        "So back in the day when judges ran things, there was this massive food shortage. This guy from Bethlehem packed up his family—his wife and two sons—and moved to Moab to survive.",

      senior_ministry:
        "In the time when judges ruled Israel, a famine came upon the land. A man from Bethlehem in Judah took his wife and his two sons and went to live in the country of Moab.",

      prison_chaplain:
        "When judges led Israel, food ran out in the land. A man from Bethlehem had to leave with his wife and two sons. They went to Moab to find food and survive.",
    };

    return drafts[this.persona] || drafts.confused_user;
  }

  /**
   * Sometimes select from provided suggestions
   */
  selectFromSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) return null;

    // Experienced users use suggestions more often
    if (this.persona === "experienced_translator") {
      return suggestions[0];
    }

    // Confused users might pick randomly
    if (this.persona === "confused_user") {
      return suggestions[Math.floor(Math.random() * suggestions.length)];
    }

    // Curious beginners might pick thoughtfully
    const index = Math.min(1, suggestions.length - 1);
    return suggestions[index];
  }

  /**
   * Send a message to the API
   */
  async sendMessage(message) {
    console.log(`\n👤 ${this.currentPersona.name}: "${message}"`);
    this.testLog.push({ role: "user", content: message, timestamp: new Date() });

    try {
      const response = await fetch(`${this.baseUrl}/.netlify/functions/conversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": this.sessionId,
        },
        body: JSON.stringify({
          message,
          history: this.conversationHistory,
        }),
      });

      const result = await response.json();

      // Add to conversation history
      this.conversationHistory.push({ role: "user", content: message });

      if (result.messages) {
        result.messages.forEach((msg) => {
          this.conversationHistory.push(msg);
          console.log(
            `\n${msg.agent?.icon || "🤖"} ${msg.agent?.name || "AI"}: "${this.truncateMessage(
              msg.content
            )}"`
          );
          this.testLog.push({
            role: "assistant",
            agent: msg.agent?.name,
            content: msg.content,
            timestamp: new Date(),
          });
        });
      }

      if (result.suggestions && result.suggestions.length > 0) {
        console.log(`   💡 Suggestions: [${result.suggestions.join(", ")}]`);
      }

      this.currentState = result.canvasState || {};

      return result;
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      this.testLog.push({ role: "error", content: error.message, timestamp: new Date() });
      throw error;
    }
  }

  /**
   * Get the last assistant message
   */
  getLastAssistantMessage() {
    for (let i = this.conversationHistory.length - 1; i >= 0; i--) {
      if (this.conversationHistory[i].role === "assistant") {
        return this.conversationHistory[i];
      }
    }
    return null;
  }

  /**
   * Get the last suggestions
   */
  getLastSuggestions() {
    // Look for suggestions in recent history
    for (let i = this.conversationHistory.length - 1; i >= 0; i--) {
      const msg = this.conversationHistory[i];
      if (msg.type === "suggestions" || msg.suggestions) {
        return msg.content || msg.suggestions;
      }
    }
    return null;
  }

  /**
   * Check if the conversation has reached a natural end
   */
  isConversationComplete() {
    // Check if we've completed a draft
    const hasDraft = this.currentState?.scriptureCanvas?.verses?.["Ruth 1:1"]?.draft;

    // Check if we're in checking or later phase
    const phase = this.currentState?.workflow?.currentPhase;
    const isAdvancedPhase = ["checking", "sharing", "publishing"].includes(phase);

    // Check if we've had enough meaningful exchanges
    const meaningfulExchanges = this.conversationHistory.filter(
      (msg) => msg.role === "user" && msg.content.length > 10
    ).length;

    return hasDraft || isAdvancedPhase || meaningfulExchanges > 20;
  }

  /**
   * Helper to truncate long messages for display
   */
  truncateMessage(message, maxLength = 100) {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
  }

  /**
   * Add a delay to simulate human typing
   */
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate a test report
   */
  generateTestReport() {
    const report = {
      persona: this.currentPersona.name,
      sessionId: this.sessionId,
      exchanges: this.conversationHistory.filter((m) => m.role === "user").length,
      finalPhase: this.currentState?.workflow?.currentPhase,
      styleGuideComplete: this.isStyleGuideComplete(),
      hasDraft: !!this.currentState?.scriptureCanvas?.verses?.["Ruth 1:1"]?.draft,
      success: this.isConversationComplete(),
      log: this.testLog,
    };

    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST REPORT");
    console.log("=".repeat(60));
    console.log(`Persona: ${report.persona}`);
    console.log(`Exchanges: ${report.exchanges}`);
    console.log(`Final Phase: ${report.finalPhase}`);
    console.log(`Style Guide Complete: ${report.styleGuideComplete}`);
    console.log(`Has Draft: ${report.hasDraft}`);
    console.log(`Success: ${report.success ? "✅" : "❌"}`);

    if (this.currentState?.styleGuide) {
      console.log("\nCollected Settings:");
      Object.entries(this.currentState.styleGuide).forEach(([key, value]) => {
        if (value) console.log(`  ${key}: ${value}`);
      });
    }

    return report;
  }

  /**
   * Check if style guide is complete
   */
  isStyleGuideComplete() {
    const guide = this.currentState?.styleGuide || {};
    return !!(
      guide.conversationLanguage &&
      guide.sourceLanguage &&
      guide.targetLanguage &&
      guide.targetCommunity &&
      guide.readingLevel &&
      guide.tone &&
      guide.approach
    );
  }
}

/**
 * Run tests with multiple personas
 */
export async function runWorkshopSimulation(baseUrl = "http://localhost:9999", group = "all") {
  console.log("\n🎬 Starting Workshop Simulation\n");
  console.log("This will simulate multiple workshop attendees having");
  console.log("natural conversations with the Bible Translation Assistant.\n");

  const results = [];
  let personas = [];

  if (group === "english-group") {
    // Just the English-to-English personas
    personas = [
      "children_minister",
      "esl_teacher",
      "youth_pastor",
      "senior_ministry",
      "prison_chaplain",
    ];
    console.log("Testing English-to-English translation personas only\n");
  } else if (group === "all") {
    // All personas
    personas = [
      "curious_beginner",
      "experienced_translator",
      "confused_user",
      "children_minister",
      "esl_teacher",
      "youth_pastor",
      "senior_ministry",
      "prison_chaplain",
    ];
  } else {
    // Custom list could be added here
    personas = ["curious_beginner", "experienced_translator", "confused_user"];
  }

  for (const persona of personas) {
    console.log("\n" + "🌟".repeat(30) + "\n");

    const attendee = new IntelligentWorkshopAttendee(baseUrl, persona);

    try {
      const report = await attendee.startConversation();
      results.push(report);

      // Wait between personas
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`\nPersona ${persona} failed: ${error.message}`);
      results.push({
        persona,
        success: false,
        error: error.message,
      });
    }
  }

  // Generate final summary
  console.log("\n" + "=".repeat(60));
  console.log("🏁 WORKSHOP SIMULATION COMPLETE");
  console.log("=".repeat(60));

  const successful = results.filter((r) => r.success).length;
  console.log(`\nSuccess Rate: ${successful}/${results.length}`);

  results.forEach((r) => {
    console.log(`\n${r.persona}: ${r.success ? "✅ Success" : "❌ Failed"}`);
    if (!r.success && r.error) {
      console.log(`  Error: ${r.error}`);
    }
  });

  return results;
}

/**
 * Run a single persona test
 */
export async function testPersona(persona = "curious_beginner", baseUrl = "http://localhost:9999") {
  const attendee = new IntelligentWorkshopAttendee(baseUrl, persona);
  return await attendee.startConversation();
}

// Allow running from command line
if (process.argv[1] === import.meta.url) {
  const persona = process.argv[2] || "all";
  const baseUrl = process.argv[3] || "http://localhost:9999";

  if (persona === "all" || persona === "english-group") {
    runWorkshopSimulation(baseUrl, persona).then((results) => {
      const failures = results.filter((r) => !r.success).length;
      process.exit(failures > 0 ? 1 : 0);
    });
  } else {
    testPersona(persona, baseUrl).then((report) => {
      process.exit(report.success ? 0 : 1);
    });
  }
}
