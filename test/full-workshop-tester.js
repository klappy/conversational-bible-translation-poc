/**
 * Intelligent Full Workshop Tester
 *
 * Uses AI to naturally complete the entire workshop journey
 * NOT hardcoded responses - the AI agent has goals and context
 */

import fetch from "node-fetch";
import { promises as fs } from "fs";

class IntelligentWorkshopCompleter {
  constructor(baseUrl = "http://localhost:9999", persona = "dedicated_translator") {
    this.baseUrl = baseUrl;
    this.sessionId = `workshop_full_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.conversationHistory = [];
    this.apiKey = process.env.OPENAI_API_KEY;

    // Define personas with goals and context
    this.personas = {
      dedicated_translator: {
        name: "Samuel",
        role: "A dedicated workshop attendee who wants to complete a full Bible translation",
        background: "Seminary student passionate about making scripture accessible",
        goal: "Complete the entire translation workshop from start to finish, including planning, understanding, drafting, checking with community, and publishing",
        personality: "Thorough, patient, asks clarifying questions when needed",
        preferences: {
          language: "English",
          targetAudience: "young adults in urban churches",
          approach: "meaning-based but respectful of the original",
        },
      },
      community_leader: {
        name: "Pastor Ruth",
        role: "Church leader focused on community engagement",
        background: "20 years leading a diverse congregation",
        goal: "Create a translation that the whole community can use and share",
        personality: "Collaborative, seeks feedback, values community input",
        preferences: {
          language: "English",
          targetAudience: "multigenerational congregation",
          approach: "clear and accessible",
        },
      },
      efficiency_focused: {
        name: "Dr. Chen",
        role: "Linguistics professor testing the system",
        background: "Academic with translation expertise",
        goal: "Complete the workshop efficiently while maintaining quality",
        personality: "Direct, efficient, knowledgeable about translation theory",
        preferences: {
          language: "English",
          targetAudience: "academic study groups",
          approach: "balanced between literal and dynamic",
        },
      },
    };

    this.currentPersona = this.personas[persona] || this.personas.dedicated_translator;
    this.workshopPhases = [];
    this.currentState = null;
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
   * Use OpenAI to generate intelligent responses based on persona and context
   */
  async generateIntelligentResponse() {
    if (!this.apiKey) {
      console.error("❌ No OpenAI API key found");
      return "Continue";
    }

    // Get the last few messages for context
    const recentHistory = this.conversationHistory.slice(-6);
    const currentPhase = this.currentState?.workflow?.currentPhase || "unknown";

    // Build context for the AI
    const systemPrompt = `You are ${this.currentPersona.name}, ${this.currentPersona.role}.
Background: ${this.currentPersona.background}
Your goal: ${this.currentPersona.goal}
Personality: ${this.currentPersona.personality}

You are participating in a Bible translation workshop. The workshop has these phases:
1. Planning - Setting up translation parameters
2. Understanding - Learning about the scripture
3. Drafting - Creating your translation
4. Checking - Reviewing the translation quality
5. Sharing - Distributing to community
6. Publishing - Finalizing the translation

Current phase: ${currentPhase}
Phases completed so far: ${this.workshopPhases.join(", ") || "none"}

Your preferences:
- Language: ${this.currentPersona.preferences.language}
- Target audience: ${this.currentPersona.preferences.targetAudience}
- Approach: ${this.currentPersona.preferences.approach}

IMPORTANT INSTRUCTIONS:
- Respond naturally as ${this.currentPersona.name} would
- Your goal is to complete the ENTIRE workshop, reaching the publishing phase
- If given suggestions/options, choose one that moves you forward
- When asked for settings, provide them based on your preferences
- When asked to draft, provide an actual translation attempt
- When in checking phase, engage with the quality review process
- Continue until you reach publishing
- Be concise but natural - respond as a real person would
- If something seems stuck, politely ask how to proceed

Generate a natural response to continue the workshop.`;

    const userPrompt = `Recent conversation:
${recentHistory
  .map(
    (m) =>
      `${m.role === "user" ? this.currentPersona.name : "System"}: ${m.content.substring(0, 500)}`
  )
  .join("\n\n")}

The system just provided these quick response options: ${
      this.lastSuggestions ? JSON.stringify(this.lastSuggestions) : "none"
    }

What would ${
      this.currentPersona.name
    } naturally say next to progress toward completing the workshop?
Consider: Are you providing settings? Understanding scripture? Drafting? Checking? 
Respond in character, keeping in mind your goal to complete the entire workshop.`;

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
      console.error("Error generating response:", error);
    }

    // Fallback to simple responses if AI fails
    if (this.lastSuggestions && this.lastSuggestions.length > 0) {
      return this.lastSuggestions[0];
    }
    return "Please continue";
  }

  /**
   * Run the complete workshop
   */
  async runWorkshop() {
    console.log(`\n🎭 Starting Workshop with ${this.currentPersona.name}`);
    console.log(`Role: ${this.currentPersona.role}`);
    console.log(`Goal: ${this.currentPersona.goal}`);
    console.log("=".repeat(70) + "\n");

    // Reset session
    await this.resetSession();

    // Start conversation
    const greeting = `Hello! I'm ${this.currentPersona.name}, and I'm here to complete a Bible translation workshop.`;
    console.log(`👤 ${this.currentPersona.name}: "${greeting}"`);

    let response = await this.sendMessage(greeting);

    if (response) {
      this.conversationHistory.push({ role: "user", content: greeting });
      this.processResponse(response);
    }

    // Continue conversation until workshop is complete
    let exchanges = 0;
    const maxExchanges = 60; // Allow longer conversations for full workshop

    while (exchanges < maxExchanges) {
      // Check current state
      await this.getCanvasState();
      const currentPhase = this.currentState?.workflow?.currentPhase;

      // Track phase progression
      if (currentPhase && !this.workshopPhases.includes(currentPhase)) {
        this.workshopPhases.push(currentPhase);
        console.log(`\n📍 Entered phase: ${currentPhase}`);
      }

      // Check if workshop is complete
      if (currentPhase === "publishing" || this.workshopPhases.includes("publishing")) {
        console.log("\n🎉 Workshop completed - reached publishing phase!");
        break;
      }

      // Generate next response using AI
      const nextMessage = await this.generateIntelligentResponse();

      if (!nextMessage) {
        console.log("\n⚠️ Could not generate response");
        break;
      }

      console.log(`\n👤 ${this.currentPersona.name}: "${nextMessage}"`);

      // Send message
      response = await this.sendMessage(nextMessage);

      if (response) {
        this.conversationHistory.push({ role: "user", content: nextMessage });
        this.processResponse(response);
      } else {
        console.log("⚠️ No response received");
        break;
      }

      exchanges++;

      // Brief pause to avoid overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Generate report
    return this.generateReport(exchanges);
  }

  /**
   * Process response from the system
   */
  processResponse(response) {
    if (response.messages && response.messages.length > 0) {
      response.messages.forEach((msg) => {
        const agent = msg.agent?.name || "System";
        const preview = msg.content.substring(0, 100) + (msg.content.length > 100 ? "..." : "");
        console.log(`\n📝 ${agent}: "${preview}"`);
        this.conversationHistory.push({
          role: "assistant",
          content: msg.content,
          agent: msg.agent,
        });
      });
    }

    // Store suggestions for next response
    this.lastSuggestions = response.suggestions || [];
    if (this.lastSuggestions.length > 0) {
      console.log(`   💡 Options: ${JSON.stringify(this.lastSuggestions)}`);
    }
  }

  /**
   * Generate completion report
   */
  generateReport(exchanges) {
    const report = {
      persona: this.currentPersona.name,
      role: this.currentPersona.role,
      exchanges: exchanges,
      phasesCompleted: this.workshopPhases,
      reachedPublishing: this.workshopPhases.includes("publishing"),
      reachedSharing: this.workshopPhases.includes("sharing"),
      reachedChecking: this.workshopPhases.includes("checking"),
      hasDraft: this.conversationHistory.some(
        (m) =>
          m.role === "user" &&
          (m.content.includes("When the judges") ||
            m.content.includes("During the time") ||
            m.content.includes("In the days"))
      ),
      success: this.workshopPhases.length >= 4, // At least reached checking
    };

    console.log("\n" + "=".repeat(70));
    console.log("📊 WORKSHOP COMPLETION REPORT");
    console.log("=".repeat(70));
    console.log(`Persona: ${report.persona} (${report.role})`);
    console.log(`Exchanges: ${report.exchanges}`);
    console.log(`Phases Completed: ${report.phasesCompleted.join(" → ") || "none"}`);
    console.log(`Phase Coverage: ${report.phasesCompleted.length}/6`);
    console.log(`Translation Drafted: ${report.hasDraft ? "✅" : "❌"}`);
    console.log(`Reached Checking: ${report.reachedChecking ? "✅" : "❌"}`);
    console.log(`Reached Sharing: ${report.reachedSharing ? "✅" : "❌"}`);
    console.log(`Reached Publishing: ${report.reachedPublishing ? "✅" : "❌"}`);
    console.log(`Overall Success: ${report.success ? "✅ YES" : "❌ NO"}`);

    if (!report.success) {
      console.log(
        `\n⚠️ Workshop incomplete. Last phase: ${
          this.workshopPhases[this.workshopPhases.length - 1] || "none"
        }`
      );
    }

    return report;
  }
}

/**
 * Run workshop with specific persona
 */
export async function runWorkshopWithPersona(
  persona = "dedicated_translator",
  baseUrl = "http://localhost:9999"
) {
  const tester = new IntelligentWorkshopCompleter(baseUrl, persona);
  return await tester.runWorkshop();
}

/**
 * Run workshop suite with all personas
 */
export async function runFullWorkshopSuite(baseUrl = "http://localhost:9999") {
  console.log("\n🎬 RUNNING FULL WORKSHOP SUITE");
  console.log("Testing complete workshop flow with intelligent agents");
  console.log("=".repeat(70));

  const personas = ["dedicated_translator", "community_leader", "efficiency_focused"];
  const results = [];

  for (const persona of personas) {
    console.log(`\n\n🔄 Testing with ${persona} persona...`);
    const result = await runWorkshopWithPersona(persona, baseUrl);
    results.push(result);

    // Pause between tests
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  // Summary
  console.log("\n\n" + "=".repeat(70));
  console.log("🏁 SUITE SUMMARY");
  console.log("=".repeat(70));

  const successCount = results.filter((r) => r.success).length;
  const publishCount = results.filter((r) => r.reachedPublishing).length;

  results.forEach((r) => {
    console.log(`\n${r.persona}:`);
    console.log(`  Phases: ${r.phasesCompleted.join(" → ") || "none"}`);
    console.log(`  Success: ${r.success ? "✅" : "❌"}`);
  });

  console.log(`\nOverall Success Rate: ${((successCount / results.length) * 100).toFixed(0)}%`);
  console.log(`Publishing Rate: ${((publishCount / results.length) * 100).toFixed(0)}%`);

  return results;
}

// Command line interface
const isMainModule =
  process.argv[1] === import.meta.url || process.argv[1]?.endsWith("/full-workshop-tester.js");

if (isMainModule) {
  const mode = process.argv[2] || "single";
  const baseUrl = process.argv[3] || "http://localhost:9999";

  // Ensure API key is set
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Please set OPENAI_API_KEY environment variable");
    console.log("This test uses AI to intelligently complete the workshop");
    process.exit(1);
  }

  switch (mode) {
    case "single":
      runWorkshopWithPersona("dedicated_translator", baseUrl).then((report) => {
        process.exit(report.success ? 0 : 1);
      });
      break;

    case "suite":
      runFullWorkshopSuite(baseUrl).then((results) => {
        const failures = results.filter((r) => !r.success).length;
        process.exit(failures === 0 ? 0 : 1);
      });
      break;

    case "community":
      runWorkshopWithPersona("community_leader", baseUrl).then((report) => {
        process.exit(report.success ? 0 : 1);
      });
      break;

    case "efficient":
      runWorkshopWithPersona("efficiency_focused", baseUrl).then((report) => {
        process.exit(report.success ? 0 : 1);
      });
      break;

    default:
      console.log(
        "Usage: node full-workshop-tester.js [single|suite|community|efficient] [baseUrl]"
      );
      console.log("  single    - Run with dedicated translator persona");
      console.log("  suite     - Run with all personas");
      console.log("  community - Run with community leader persona");
      console.log("  efficient - Run with efficiency-focused persona");
      process.exit(1);
  }
}

export default IntelligentWorkshopCompleter;
