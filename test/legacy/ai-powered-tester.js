/**
 * AI-Powered Testing Framework
 *
 * Base class for all intelligent test agents using GPT-4o-mini
 * Replaces hardcoded responses with true AI understanding
 */

import fetch from "node-fetch";

/**
 * Base AI-powered workshop attendee
 */
export class AIWorkshopAttendee {
  constructor(baseUrl = "http://localhost:9999", personaType = "curious_beginner") {
    this.baseUrl = baseUrl;
    this.sessionId = `ai_test_${personaType}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    this.conversationHistory = [];
    this.apiKey = process.env.OPENAI_API_KEY;
    this.currentState = null;
    this.lastSuggestions = [];

    // Comprehensive persona definitions
    this.personas = {
      // Original workshop personas
      curious_beginner: {
        name: "Maria",
        background: "First-time Bible translator, Spanish speaker learning the process",
        personality: "Curious, eager to learn, asks clarifying questions",
        goal: "Learn how to translate Bible passages for my community",
        preferences: {
          language: "English",
          sourceLanguage: "English",
          targetLanguage: "English",
          community: "Spanish-speaking church members",
          readingLevel: "Grade 6",
          tone: "warm and accessible",
          approach: "meaning-based",
        },
      },

      experienced_translator: {
        name: "John",
        background: "Seminary graduate with Greek/Hebrew knowledge",
        personality: "Knowledgeable, precise, values accuracy",
        goal: "Create a faithful yet readable translation",
        preferences: {
          language: "English",
          sourceLanguage: "Hebrew",
          targetLanguage: "English",
          community: "educated congregation",
          readingLevel: "College level",
          tone: "formal and reverent",
          approach: "balanced",
        },
      },

      confused_user: {
        name: "Sarah",
        background: "Unclear about the process, needs guidance",
        personality: "Confused initially but willing to learn",
        goal: "Figure out this translation process step by step",
        preferences: {
          language: "English",
          sourceLanguage: "English",
          targetLanguage: "English",
          community: "local community group",
          readingLevel: "Grade 5",
          tone: "simple and clear",
          approach: "meaning-based",
        },
      },

      // English-to-English personas
      children_minister: {
        name: "Pastor Amy",
        background: "Children's ministry leader needing kid-friendly versions",
        personality: "Enthusiastic, creative, focused on engagement",
        goal: "Create Bible stories that children can understand and enjoy",
        preferences: {
          language: "English",
          sourceLanguage: "English",
          targetLanguage: "English",
          community: "elementary school children",
          readingLevel: "Grade 1",
          tone: "fun and engaging",
          approach: "meaning-based",
        },
      },

      esl_teacher: {
        name: "Ms. Chen",
        background: "ESL teacher helping adult learners",
        personality: "Patient, methodical, clear communicator",
        goal: "Simplify scripture for English language learners",
        preferences: {
          language: "English",
          sourceLanguage: "English",
          targetLanguage: "English",
          community: "adult English learners",
          readingLevel: "Grade 4",
          tone: "clear and straightforward",
          approach: "meaning-based",
        },
      },

      youth_pastor: {
        name: "Jake",
        background: "Youth pastor connecting with teenagers",
        personality: "Relatable, modern, culturally aware",
        goal: "Make scripture relevant for today's teens",
        preferences: {
          language: "English",
          sourceLanguage: "English",
          targetLanguage: "English",
          community: "high school students",
          readingLevel: "Grade 10",
          tone: "relatable and modern",
          approach: "meaning-based",
        },
      },

      senior_ministry: {
        name: "Reverend Thomas",
        background: "Senior ministry leader, values tradition with clarity",
        personality: "Respectful, dignified, clear",
        goal: "Maintain reverence while ensuring understanding",
        preferences: {
          language: "English",
          sourceLanguage: "English",
          targetLanguage: "English",
          community: "senior adults",
          readingLevel: "Grade 8",
          tone: "dignified and clear",
          approach: "balanced",
        },
      },

      prison_chaplain: {
        name: "Chaplain Mike",
        background: "Prison chaplain ministering to incarcerated individuals",
        personality: "Direct, compassionate, hopeful",
        goal: "Provide hope and clarity through accessible scripture",
        preferences: {
          language: "English",
          sourceLanguage: "English",
          targetLanguage: "English",
          community: "incarcerated individuals",
          readingLevel: "Grade 6",
          tone: "straightforward and hopeful",
          approach: "meaning-based",
        },
      },
    };

    this.currentPersona = this.personas[personaType] || this.personas.curious_beginner;
    this.interactionMode = "mixed"; // Can be: suggestions, manual, mixed
    this.maxExchanges = 50;
  }

  /**
   * Set interaction mode for testing different response patterns
   */
  setInteractionMode(mode) {
    this.interactionMode = mode;
  }

  /**
   * Reset session before starting
   */
  async resetSession() {
    try {
      const response = await fetch(`${this.baseUrl}/.netlify/functions/canvas-state?reset=true`, {
        method: "GET",
        headers: {
          "X-Session-ID": this.sessionId,
        },
      });

      if (response.ok) {
        console.log("🔄 Session reset successfully");
        return true;
      }
      return false;
    } catch (error) {
      console.warn(`⚠️ Error resetting session: ${error.message}`);
      return false;
    }
  }

  /**
   * Get current canvas state
   */
  async getCanvasState() {
    try {
      const response = await fetch(`${this.baseUrl}/.netlify/functions/canvas-state`, {
        method: "GET",
        headers: {
          "X-Session-ID": this.sessionId,
        },
      });

      if (response.ok) {
        this.currentState = await response.json();
        return this.currentState;
      }
    } catch (error) {
      console.error("Error getting canvas state:", error);
    }
    return null;
  }

  /**
   * Send message to the system
   */
  async sendMessage(message) {
    try {
      const response = await fetch(`${this.baseUrl}/.netlify/functions/conversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": this.sessionId,
        },
        body: JSON.stringify({ message }),
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
    return null;
  }

  /**
   * Generate AI response based on persona and context
   */
  async generateResponse() {
    if (!this.apiKey) {
      // Fallback to simple responses if no API key
      return this.getFallbackResponse();
    }

    const recentHistory = this.conversationHistory.slice(-6);
    const currentPhase = this.currentState?.workflow?.currentPhase || "unknown";

    // Determine if we should use suggestions
    const shouldUseSuggestion = this.shouldUseSuggestion();

    const systemPrompt = `You are ${this.currentPersona.name}.
Background: ${this.currentPersona.background}
Personality: ${this.currentPersona.personality}
Goal: ${this.currentPersona.goal}

You're in a Bible translation workshop. Current phase: ${currentPhase}

Your preferences:
- Conversation language: ${this.currentPersona.preferences.language}
- Source language: ${this.currentPersona.preferences.sourceLanguage}
- Target language: ${this.currentPersona.preferences.targetLanguage}
- Community: ${this.currentPersona.preferences.community}
- Reading level: ${this.currentPersona.preferences.readingLevel}
- Tone: ${this.currentPersona.preferences.tone}
- Approach: ${this.currentPersona.preferences.approach}

IMPORTANT:
- Respond naturally as ${this.currentPersona.name} would
- When asked for settings, provide them based on your preferences
- When asked to draft, provide a real translation attempt appropriate for your community
- Be concise (1-3 sentences usually)
${
  shouldUseSuggestion && this.lastSuggestions.length > 0
    ? `- You SHOULD pick one of these suggestions: ${JSON.stringify(this.lastSuggestions)}`
    : "- Respond naturally without using the quick suggestions"
}`;

    const userPrompt = `Recent conversation:
${recentHistory
  .map(
    (m) => `${m.role === "user" ? this.currentPersona.name : "AI"}: ${m.content.substring(0, 300)}`
  )
  .join("\n")}

What would ${this.currentPersona.name} say next?`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 150,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content.trim();
      }
    } catch (error) {
      console.error("Error generating AI response:", error);
    }

    return this.getFallbackResponse();
  }

  /**
   * Determine if we should use suggestions based on interaction mode
   */
  shouldUseSuggestion() {
    if (!this.lastSuggestions || this.lastSuggestions.length === 0) {
      return false;
    }

    switch (this.interactionMode) {
      case "suggestions":
        return true;
      case "manual":
        return false;
      case "mixed":
      default:
        return Math.random() > 0.5;
    }
  }

  /**
   * Fallback responses when AI is not available
   */
  getFallbackResponse() {
    if (this.lastSuggestions && this.lastSuggestions.length > 0 && this.shouldUseSuggestion()) {
      return this.lastSuggestions[0];
    }
    return "Please continue";
  }

  /**
   * Process response from the system
   */
  processResponse(response) {
    if (response.messages && response.messages.length > 0) {
      response.messages.forEach((msg) => {
        const agent = msg.agent?.name || "System";
        const preview = msg.content.substring(0, 80) + (msg.content.length > 80 ? "..." : "");
        console.log(`📖 ${agent}: "${preview}"`);
        this.conversationHistory.push({
          role: "assistant",
          content: msg.content,
          agent: msg.agent,
        });
      });
    }

    this.lastSuggestions = response.suggestions || [];
    if (this.lastSuggestions.length > 0) {
      console.log(`   💡 Suggestions: ${JSON.stringify(this.lastSuggestions)}`);
    }
  }

  /**
   * Run a complete conversation
   */
  async startConversation() {
    console.log(`\n🎭 Workshop Attendee: ${this.currentPersona.name}`);
    console.log(`📝 Background: ${this.currentPersona.background}`);
    console.log(`🎯 Goal: ${this.currentPersona.goal}`);
    console.log(`🔄 Mode: ${this.interactionMode}`);
    console.log("\n" + "=".repeat(60));

    // Reset session
    await this.resetSession();

    // Start conversation
    const greeting = this.generateGreeting();
    console.log(`\n👤 ${this.currentPersona.name}: "${greeting}"`);

    let response = await this.sendMessage(greeting);
    if (response) {
      this.conversationHistory.push({ role: "user", content: greeting });
      this.processResponse(response);
    }

    // Continue conversation
    let exchanges = 0;

    while (exchanges < this.maxExchanges && !this.isConversationComplete()) {
      await this.getCanvasState();

      const nextMessage = await this.generateResponse();
      if (!nextMessage) break;

      console.log(`\n👤 ${this.currentPersona.name}: "${nextMessage}"`);

      response = await this.sendMessage(nextMessage);
      if (response) {
        this.conversationHistory.push({ role: "user", content: nextMessage });
        this.processResponse(response);
      } else {
        break;
      }

      exchanges++;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return this.generateReport();
  }

  /**
   * Generate persona-appropriate greeting
   */
  generateGreeting() {
    const greetings = {
      curious_beginner:
        "Hi! I'm Maria, and I'd like to learn about Bible translation for my Spanish-speaking community.",
      experienced_translator:
        "Hello, I'm John. I have seminary training and I'm ready to create an accurate translation.",
      confused_user:
        "Um, hi... I'm Sarah. I'm not really sure how this works, but I'd like to try translating something.",
      children_minister:
        "Hi there! I'm Pastor Amy, and I need to create Bible stories that kids can understand.",
      esl_teacher:
        "Hello, I'm Ms. Chen. I teach ESL and need simplified scripture for my adult learners.",
      youth_pastor: "Hey! I'm Jake, youth pastor. Looking to make scripture relevant for teens.",
      senior_ministry:
        "Good day, I'm Reverend Thomas. I'd like to create clear yet dignified translations for our seniors.",
      prison_chaplain:
        "Hello, I'm Chaplain Mike. I need accessible scripture for the incarcerated individuals I serve.",
    };

    const personaKey = Object.keys(this.personas).find(
      (key) => this.personas[key] === this.currentPersona
    );

    return (
      greetings[personaKey] ||
      `Hello, I'm ${this.currentPersona.name} and I'd like to translate Bible passages.`
    );
  }

  /**
   * Check if conversation should end
   */
  isConversationComplete() {
    const currentPhase = this.currentState?.workflow?.currentPhase;

    // End conditions
    if (currentPhase === "publishing") return true;

    // Check for meaningful completion
    const exchanges = this.conversationHistory.filter((m) => m.role === "user").length;
    if (exchanges > 40) return true;

    // Check for stuck conversation
    const lastThree = this.conversationHistory
      .filter((m) => m.role === "user")
      .slice(-3)
      .map((m) => m.content);

    if (lastThree.length === 3 && lastThree[0] === lastThree[1] && lastThree[1] === lastThree[2]) {
      console.log("⚠️ Detected repetition, ending conversation");
      return true;
    }

    return false;
  }

  /**
   * Generate test report
   */
  generateReport() {
    const exchanges = this.conversationHistory.filter((m) => m.role === "user").length;
    const currentPhase = this.currentState?.workflow?.currentPhase || "unknown";
    const settings = this.currentState?.settings || {};

    const report = {
      persona: this.currentPersona.name,
      background: this.currentPersona.background,
      goal: this.currentPersona.goal,
      interactionMode: this.interactionMode,
      exchanges: exchanges,
      finalPhase: currentPhase,
      settingsCollected: Object.keys(settings).length > 0,
      hasDraft: this.conversationHistory.some(
        (m) =>
          m.role === "user" &&
          m.content.length > 100 &&
          (m.content.includes("judges") || m.content.includes("famine"))
      ),
      success: exchanges > 5 && Object.keys(settings).length > 3,
    };

    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST REPORT");
    console.log("=".repeat(60));
    console.log(`Persona: ${report.persona}`);
    console.log(`Mode: ${report.interactionMode}`);
    console.log(`Exchanges: ${report.exchanges}`);
    console.log(`Final Phase: ${report.finalPhase}`);
    console.log(`Settings Collected: ${report.settingsCollected ? "✅" : "❌"}`);
    console.log(`Draft Created: ${report.hasDraft ? "✅" : "❌"}`);
    console.log(`Success: ${report.success ? "✅" : "❌"}`);

    return report;
  }
}

/**
 * Run tests with different personas and modes
 */
export async function runAITest(
  persona = "curious_beginner",
  mode = "mixed",
  baseUrl = "http://localhost:9999"
) {
  const tester = new AIWorkshopAttendee(baseUrl, persona);
  tester.setInteractionMode(mode);
  return await tester.startConversation();
}

/**
 * Run parallel tests
 */
export async function runParallelAITests(baseUrl = "http://localhost:9999") {
  const testConfigs = [
    { persona: "curious_beginner", mode: "suggestions" },
    { persona: "children_minister", mode: "suggestions" },
    { persona: "experienced_translator", mode: "manual" },
    { persona: "youth_pastor", mode: "manual" },
    { persona: "confused_user", mode: "mixed" },
    { persona: "prison_chaplain", mode: "mixed" },
  ];

  console.log("\n🚀 Running Parallel AI-Powered Tests");
  console.log("=".repeat(70));

  // Run in batches of 3
  const batchSize = 3;
  const results = [];

  for (let i = 0; i < testConfigs.length; i += batchSize) {
    const batch = testConfigs.slice(i, i + batchSize);
    console.log(`\n📦 Batch ${Math.floor(i / batchSize) + 1}`);

    const batchPromises = batch.map((config) => runAITest(config.persona, config.mode, baseUrl));

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Pause between batches
    if (i + batchSize < testConfigs.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("🏁 PARALLEL TEST SUMMARY");
  console.log("=".repeat(70));

  const successCount = results.filter((r) => r.success).length;
  console.log(`Success Rate: ${((successCount / results.length) * 100).toFixed(0)}%`);

  results.forEach((r) => {
    console.log(
      `${r.persona} (${r.interactionMode}): ${r.success ? "✅" : "❌"} - ${r.exchanges} exchanges`
    );
  });

  return results;
}

// Command line interface
const isMainModule =
  process.argv[1] === import.meta.url || process.argv[1]?.endsWith("/ai-powered-tester.js");

if (isMainModule) {
  const command = process.argv[2] || "single";
  const baseUrl = process.argv[3] || "http://localhost:9999";

  switch (command) {
    case "single":
      runAITest("curious_beginner", "mixed", baseUrl).then((report) => {
        process.exit(report.success ? 0 : 1);
      });
      break;

    case "parallel":
      runParallelAITests(baseUrl).then((results) => {
        const failures = results.filter((r) => !r.success).length;
        process.exit(failures === 0 ? 0 : 1);
      });
      break;

    case "suggestions":
      runAITest("children_minister", "suggestions", baseUrl).then((report) => {
        process.exit(report.success ? 0 : 1);
      });
      break;

    case "manual":
      runAITest("experienced_translator", "manual", baseUrl).then((report) => {
        process.exit(report.success ? 0 : 1);
      });
      break;

    default:
      console.log(
        "Usage: node ai-powered-tester.js [single|parallel|suggestions|manual] [baseUrl]"
      );
      process.exit(1);
  }
}

export default AIWorkshopAttendee;
