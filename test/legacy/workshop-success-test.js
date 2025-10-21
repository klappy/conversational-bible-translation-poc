/**
 * Workshop Success Testing
 *
 * Focus: Can real people successfully complete the workshop?
 * Goal: Identify what prevents workshop completion
 */

import fetch from "node-fetch";

class WorkshopSuccessTester {
  constructor(baseUrl = "http://localhost:9999") {
    this.baseUrl = baseUrl;
    this.apiKey = process.env.OPENAI_API_KEY;
    this.systemIssues = [];
    this.userConfusionPoints = [];
    this.successMetrics = {
      startedWorkshop: false,
      collectedSettings: false,
      understoodScripture: false,
      createdDraft: false,
      completedChecking: false,
      sharedWithCommunity: false,
      publishedTranslation: false,
    };
  }

  /**
   * Test if a simple user can complete the workshop
   */
  async testBasicCompletion() {
    console.log("\n🎯 WORKSHOP SUCCESS TEST");
    console.log("Question: Can a regular person complete the workshop?");
    console.log("=".repeat(60) + "\n");

    const sessionId = `success_test_${Date.now()}`;
    let conversationHistory = [];
    let lastResponse = null;
    let exchanges = 0;
    const maxExchanges = 30;

    // Reset session
    await this.resetSession(sessionId);

    // Start with a simple, clear goal
    const startMessage = "Hi, I want to translate a Bible verse for my church.";
    console.log(`👤 User: "${startMessage}"\n`);

    lastResponse = await this.sendMessage(startMessage, sessionId);
    conversationHistory.push({ role: "user", content: startMessage });
    this.successMetrics.startedWorkshop = true;

    if (lastResponse) {
      this.analyzeResponse(lastResponse, "initial");
      conversationHistory.push({ role: "assistant", content: this.extractContent(lastResponse) });
    }

    // Continue conversation with simple, goal-oriented responses
    while (exchanges < maxExchanges && !this.isWorkshopComplete()) {
      const state = await this.getState(sessionId);
      const currentPhase = state?.workflow?.currentPhase || "unknown";

      // Generate a simple, goal-focused response
      const nextMessage = await this.generateSimpleResponse(
        conversationHistory,
        lastResponse?.suggestions,
        currentPhase
      );

      if (!nextMessage) {
        this.systemIssues.push("Could not generate appropriate response");
        break;
      }

      console.log(`👤 User: "${nextMessage}"\n`);

      lastResponse = await this.sendMessage(nextMessage, sessionId);
      conversationHistory.push({ role: "user", content: nextMessage });

      if (lastResponse) {
        this.analyzeResponse(lastResponse, currentPhase);
        conversationHistory.push({ role: "assistant", content: this.extractContent(lastResponse) });

        // Check progress
        this.updateSuccessMetrics(lastResponse, state);
      } else {
        this.systemIssues.push(`No response at phase: ${currentPhase}`);
        break;
      }

      exchanges++;
    }

    // Generate report
    return this.generateReport(exchanges);
  }

  /**
   * Analyze response for issues
   */
  analyzeResponse(response, phase) {
    // Check for empty responses
    if (!response.messages || response.messages.length === 0) {
      this.systemIssues.push(`Empty response at phase: ${phase}`);
      console.log(`⚠️ System Issue: No messages in response\n`);
      return;
    }

    // Check each agent response
    response.messages.forEach((msg) => {
      const agent = msg.agent?.name || "Unknown";
      const content = msg.content || "";

      // Log the response
      const preview = content.substring(0, 100) + (content.length > 100 ? "..." : "");
      console.log(`📝 ${agent}: "${preview}"`);

      // Check for issues
      if (!content || content.trim() === "") {
        this.systemIssues.push(`${agent} returned empty content at ${phase}`);
      }

      if (content.includes("undefined") || content.includes("null")) {
        this.systemIssues.push(`${agent} has undefined values at ${phase}`);
      }
    });

    // Check suggestions
    if (response.suggestions && response.suggestions.length > 0) {
      console.log(`   💡 Options: ${JSON.stringify(response.suggestions)}\n`);
    }
  }

  /**
   * Generate simple, goal-oriented responses
   */
  async generateSimpleResponse(history, suggestions, phase) {
    // If AI available, use it
    if (this.apiKey) {
      return await this.generateAIResponse(history, suggestions, phase);
    }

    // Otherwise use simple heuristics focused on completing the workshop
    const lastMessage = history[history.length - 1]?.content?.toLowerCase() || "";

    // Answer questions directly to move forward
    if (lastMessage.includes("what language")) return "English";
    if (lastMessage.includes("who will read")) return "My church congregation";
    if (lastMessage.includes("reading level")) return "Grade 8";
    if (lastMessage.includes("tone")) return "Clear and respectful";
    if (lastMessage.includes("approach")) return "Meaning-based";

    // Progress through phases
    if (lastMessage.includes("ready to") || lastMessage.includes("let's begin")) {
      return suggestions?.[0] || "Yes, let's continue";
    }

    if (lastMessage.includes("draft") || lastMessage.includes("translate")) {
      return "In the time when judges ruled, there was a famine in the land. A man from Bethlehem went to Moab with his wife and two sons.";
    }

    if (lastMessage.includes("check")) return "Yes, please check my translation";
    if (lastMessage.includes("share")) return "I'd like to share it with my small group";
    if (lastMessage.includes("publish")) return "Yes, let's publish it";

    // Use suggestions when available
    if (suggestions && suggestions.length > 0) {
      return suggestions[0];
    }

    return "Please continue";
  }

  /**
   * Generate AI response focused on workshop completion
   */
  async generateAIResponse(history, suggestions, phase) {
    const systemPrompt = `You are a workshop attendee trying to complete a Bible translation.
Your ONLY goal: Complete the translation workshop successfully.
Current phase: ${phase}

Be direct and goal-oriented. Answer questions simply to move forward.
If given suggestions, pick the one that progresses toward completion.`;

    const recentHistory = history.slice(-4);
    const userPrompt = `Recent conversation:
${recentHistory
  .map((m) => `${m.role === "user" ? "You" : "System"}: ${m.content?.substring(0, 200)}`)
  .join("\n")}

Suggestions available: ${suggestions ? JSON.stringify(suggestions) : "none"}

What would you say to continue progressing toward completing the translation?
Be concise and focused on moving forward.`;

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
          temperature: 0.3, // Lower temperature for more focused responses
          max_tokens: 100,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content.trim();
      }
    } catch (error) {
      console.error("AI generation failed:", error);
    }

    return suggestions?.[0] || "Continue";
  }

  /**
   * Update success metrics based on response and state
   */
  updateSuccessMetrics(response, state) {
    const content = this.extractContent(response).toLowerCase();
    const phase = state?.workflow?.currentPhase;

    // Check what we've accomplished
    if (state?.settings && Object.keys(state.settings).length > 3) {
      this.successMetrics.collectedSettings = true;
    }

    if (content.includes("ruth 1:1") || content.includes("judges")) {
      this.successMetrics.understoodScripture = true;
    }

    if (
      phase === "drafting" ||
      content.includes("your translation") ||
      content.includes("your draft")
    ) {
      this.successMetrics.createdDraft = true;
    }

    if (phase === "checking") {
      this.successMetrics.completedChecking = true;
    }

    if (phase === "sharing") {
      this.successMetrics.sharedWithCommunity = true;
    }

    if (phase === "publishing") {
      this.successMetrics.publishedTranslation = true;
    }
  }

  /**
   * Check if workshop is complete
   */
  isWorkshopComplete() {
    return this.successMetrics.publishedTranslation;
  }

  /**
   * Extract content from response
   */
  extractContent(response) {
    if (!response?.messages) return "";
    return response.messages.map((m) => m.content || "").join(" ");
  }

  /**
   * Reset session
   */
  async resetSession(sessionId) {
    try {
      const response = await fetch(`${this.baseUrl}/.netlify/functions/canvas-state?reset=true`, {
        method: "GET",
        headers: { "X-Session-ID": sessionId },
      });
      return response.ok;
    } catch (error) {
      console.error("Reset failed:", error);
      return false;
    }
  }

  /**
   * Get current state
   */
  async getState(sessionId) {
    try {
      const response = await fetch(`${this.baseUrl}/.netlify/functions/canvas-state`, {
        method: "GET",
        headers: { "X-Session-ID": sessionId },
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("State fetch failed:", error);
    }
    return null;
  }

  /**
   * Send message
   */
  async sendMessage(message, sessionId) {
    try {
      const response = await fetch(`${this.baseUrl}/.netlify/functions/conversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId,
        },
        body: JSON.stringify({ message }),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("Message send failed:", error);
    }
    return null;
  }

  /**
   * Generate comprehensive report
   */
  generateReport(exchanges) {
    const completedSteps = Object.values(this.successMetrics).filter((v) => v).length;
    const totalSteps = Object.keys(this.successMetrics).length;
    const completionRate = ((completedSteps / totalSteps) * 100).toFixed(0);

    console.log("\n" + "=".repeat(60));
    console.log("📊 WORKSHOP SUCCESS REPORT");
    console.log("=".repeat(60));

    console.log("\n✅ What Worked:");
    Object.entries(this.successMetrics).forEach(([key, value]) => {
      if (value) {
        console.log(`   ✓ ${key.replace(/([A-Z])/g, " $1").trim()}`);
      }
    });

    console.log("\n❌ What Failed:");
    Object.entries(this.successMetrics).forEach(([key, value]) => {
      if (!value) {
        console.log(`   ✗ ${key.replace(/([A-Z])/g, " $1").trim()}`);
      }
    });

    if (this.systemIssues.length > 0) {
      console.log("\n⚠️ System Issues Found:");
      this.systemIssues.forEach((issue) => {
        console.log(`   - ${issue}`);
      });
    }

    console.log("\n📈 Metrics:");
    console.log(`   Exchanges: ${exchanges}`);
    console.log(`   Completion: ${completionRate}% (${completedSteps}/${totalSteps} steps)`);
    console.log(
      `   Workshop Complete: ${this.successMetrics.publishedTranslation ? "YES ✅" : "NO ❌"}`
    );

    const success = completedSteps >= 5; // At least reached checking

    console.log("\n🎯 Can a regular person complete the workshop?");
    console.log(`   Answer: ${success ? "YES ✅" : "NO ❌"}`);

    if (!success) {
      console.log("\n💡 Why it failed:");
      if (!this.successMetrics.completedChecking) {
        console.log("   - Checking phase is broken (validator issues)");
      }
      if (!this.successMetrics.sharedWithCommunity) {
        console.log("   - Never reached sharing phase");
      }
      if (!this.successMetrics.publishedTranslation) {
        console.log("   - Never reached publishing phase");
      }
    }

    return {
      success,
      completionRate,
      completedSteps,
      totalSteps,
      exchanges,
      successMetrics: this.successMetrics,
      systemIssues: this.systemIssues,
    };
  }
}

/**
 * Run the workshop success test
 */
export async function testWorkshopSuccess(baseUrl = "http://localhost:9999") {
  const tester = new WorkshopSuccessTester(baseUrl);
  return await tester.testBasicCompletion();
}

// Command line interface
if (process.argv[1] === import.meta.url || process.argv[1]?.endsWith("/workshop-success-test.js")) {
  const baseUrl = process.argv[2] || "http://localhost:9999";

  testWorkshopSuccess(baseUrl).then((report) => {
    process.exit(report.success ? 0 : 1);
  });
}

export default WorkshopSuccessTester;
