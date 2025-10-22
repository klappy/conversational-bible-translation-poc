#!/usr/bin/env node

import http from "http";
import process from "process";

const BASE_URL = "http://localhost:8888";

// Pools of random options - no hardcoded scripts
const NAME_POOL = [
  "Sarah",
  "John",
  "Maria",
  "David",
  "Emma",
  "Michael",
  "Lisa",
  "James",
  "Ana",
  "Robert",
  "Grace",
  "Daniel",
  "Rachel",
  "Paul",
  "Hannah",
  "Mark",
  "Rebecca",
  "Luke",
  "Esther",
  "Peter",
];

const LANGUAGE_POOL = ["English", "Spanish", "French", "Portuguese"];

const READING_LEVEL_POOL = [
  "Grade 2",
  "Grade 3",
  "Grade 5",
  "Grade 8",
  "Adult",
  "Simple",
];

const TONE_POOL = [
  "Friendly and warm",
  "Casual and fun",
  "Reverent and formal",
  "Modern and relatable",
  "Simple and clear",
  "Conversational",
];

const PHILOSOPHY_POOL = [
  "Meaning-based",
  "Word-for-word",
  "Dynamic",
  "Balance between literal and meaning",
];

const CONFUSED_QUESTIONS = [
  "Wait, what am I supposed to do again?",
  "Can you explain this part?",
  "I'm not sure I understand",
  "What does this mean?",
  "Can we skip this?",
  "Do I have to do all of this?",
  "Is this required?",
  "How much longer will this take?",
  "Can you help me with this?",
  "I don't get it",
];

const SKIP_ATTEMPTS = [
  "Can we skip to the next part?",
  "Let's move on",
  "Skip this",
  "Next",
  "Can we do this later?",
  "I'll come back to this",
];

const BACK_ATTEMPTS = [
  "Wait, can I go back?",
  "Let me change that",
  "Go back to the previous step",
  "I want to edit something",
  "Can I redo that?",
];

// Simple explanation pools for understanding phase
const SIMPLE_EXPLANATIONS = [
  "It means things were tough back then",
  "People were having a hard time",
  "Times were difficult",
  "Things weren't going well",
  "It was a challenging period",
];

const SIMPLE_DRAFTS = [
  "A long time ago when there wasn't much food, a family left their home to find a better place.",
  "Back in the old days, a man and his family moved away because there was no food.",
  "Long ago, a family had to move to another place to survive.",
  "When judges were in charge, food was scarce so a family relocated.",
  "During hard times, a man took his family to live somewhere new.",
];

// Action probabilities
const ACTION_WEIGHTS = {
  CLICK_SUGGESTION: 0.4, // 40%
  TYPE_RESPONSE: 0.3, // 30%
  ASK_CONFUSED_QUESTION: 0.15, // 15%
  TRY_SKIP: 0.05, // 5%
  TRY_GO_BACK: 0.05, // 5%
  JUST_CONTINUE: 0.05, // 5%
};

class ChaoticWorkshopAttendee {
  constructor(attendeeNumber) {
    this.attendeeNumber = attendeeNumber;
    this.sessionId = null;
    this.conversationHistory = [];
    this.experience = {
      goalsCompleted: 0, // Did they finish the verse?
      confusionCount: 0, // How many times were they confused?
      stuckCount: 0, // How many times did they get stuck?
      successfulActions: 0, // How many actions worked?
      failedActions: 0, // How many actions failed?
      totalTurns: 0,
    };

    // Random persona characteristics
    this.persona = {
      name: this.randomChoice(NAME_POOL),
      conversationLanguage: this.randomChoice(LANGUAGE_POOL),
      sourceLanguage: "English",
      targetLanguage: this.randomChoice(LANGUAGE_POOL),
      readingLevel: this.randomChoice(READING_LEVEL_POOL),
      tone: this.randomChoice(TONE_POOL),
      philosophy: this.randomChoice(PHILOSOPHY_POOL),
      approach: this.randomChoice(["Dynamic", "Word-for-word"]),
      patience: Math.random(), // 0-1, how patient are they?
    };
  }

  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  weightedRandomAction() {
    const rand = Math.random();
    let cumulative = 0;

    for (const [action, weight] of Object.entries(ACTION_WEIGHTS)) {
      cumulative += weight;
      if (rand < cumulative) {
        return action;
      }
    }

    return "TYPE_RESPONSE";
  }

  async makeRequest(path, data = null) {
    return new Promise((resolve, reject) => {
      let netlifyPath = path;
      if (path.startsWith("/api/")) {
        netlifyPath = path.replace("/api/", "/.netlify/functions/");
      } else if (!path.startsWith("/.netlify/functions/")) {
        netlifyPath = `/.netlify/functions${path}`;
      }

      const options = {
        hostname: "localhost",
        port: 8888,
        path: netlifyPath,
        method: data ? "POST" : "GET",
        headers: data ? { "Content-Type": "application/json" } : {},
      };

      const req = http.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch {
            reject(new Error(`Failed to parse JSON: ${body}`));
          }
        });
      });

      req.on("error", reject);

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  async sendMessage(message) {
    this.experience.totalTurns++;

    try {
      const response = await this.makeRequest("/api/conversation", {
        message,
        sessionId: this.sessionId,
      });

      if (response && response.messages) {
        response.messages.forEach((msg) => {
          if (msg.role === "assistant" && msg.content) {
            this.conversationHistory.push(msg);
          }
        });
        this.experience.successfulActions++;
      }

      return response;
    } catch (error) {
      this.experience.failedActions++;
      this.experience.stuckCount++;
      return null;
    }
  }

  async getCanvasState() {
    try {
      const response = await this.makeRequest(
        `/api/canvas-state?sessionId=${this.sessionId}`
      );
      return response;
    } catch (error) {
      return null;
    }
  }

  getLastMessage() {
    if (this.conversationHistory.length === 0) return null;
    return this.conversationHistory[this.conversationHistory.length - 1]
      .content;
  }

  async decideAction() {
    const lastMessage = this.getLastMessage();
    if (!lastMessage) return "TYPE_RESPONSE";

    // If system is asking a direct question, usually respond to it
    if (
      lastMessage.includes("?") &&
      Math.random() > 0.3 // 70% chance to answer questions
    ) {
      return "TYPE_RESPONSE";
    }

    // If stuck or confused too many times, might give up
    if (this.experience.stuckCount > 5 && Math.random() < 0.3) {
      return "ASK_CONFUSED_QUESTION";
    }

    // Otherwise, weighted random
    return this.weightedRandomAction();
  }

  async performAction(action) {
    const lastMessage = this.getLastMessage();

    switch (action) {
      case "CLICK_SUGGESTION":
        // Try to find suggestions and click one
        // In reality, we'll just send a likely response
        return await this.sendTypedResponse();

      case "TYPE_RESPONSE":
        return await this.sendTypedResponse();

      case "ASK_CONFUSED_QUESTION":
        const question = this.randomChoice(CONFUSED_QUESTIONS);
        return await this.sendMessage(question);

      case "TRY_SKIP":
        const skipAttempt = this.randomChoice(SKIP_ATTEMPTS);
        return await this.sendMessage(skipAttempt);

      case "TRY_GO_BACK":
        const backAttempt = this.randomChoice(BACK_ATTEMPTS);
        return await this.sendMessage(backAttempt);

      case "JUST_CONTINUE":
        return await this.sendMessage("Okay");

      default:
        return await this.sendTypedResponse();
    }
  }

  async sendTypedResponse() {
    const lastMessage = this.getLastMessage();
    if (!lastMessage) return null;

    const lowerMessage = lastMessage.toLowerCase();

    // Context-aware responses
    if (lowerMessage.includes("name")) {
      return await this.sendMessage(this.persona.name);
    }

    if (
      lowerMessage.includes("language") &&
      lowerMessage.includes("conversation")
    ) {
      return await this.sendMessage(this.persona.conversationLanguage);
    }

    if (lowerMessage.includes("source language")) {
      return await this.sendMessage(this.persona.sourceLanguage);
    }

    if (lowerMessage.includes("target language")) {
      return await this.sendMessage(this.persona.targetLanguage);
    }

    if (lowerMessage.includes("reading level")) {
      return await this.sendMessage(this.persona.readingLevel);
    }

    if (lowerMessage.includes("tone")) {
      return await this.sendMessage(this.persona.tone);
    }

    if (lowerMessage.includes("philosophy")) {
      return await this.sendMessage(this.persona.philosophy);
    }

    if (lowerMessage.includes("approach")) {
      return await this.sendMessage(this.persona.approach);
    }

    if (lowerMessage.includes("ready") || lowerMessage.includes("begin")) {
      return await this.sendMessage("Yes, let's start");
    }

    // Understanding phase - explaining phrases
    if (
      lowerMessage.includes("explain") ||
      lowerMessage.includes("understand") ||
      lowerMessage.includes("phrase")
    ) {
      return await this.sendMessage(this.randomChoice(SIMPLE_EXPLANATIONS));
    }

    // Drafting phase
    if (lowerMessage.includes("draft") || lowerMessage.includes("translate")) {
      return await this.sendMessage(this.randomChoice(SIMPLE_DRAFTS));
    }

    // Generic continue
    return await this.sendMessage("Okay, continue");
  }

  async runWorkshopSession(maxTurns = 100) {
    console.log(
      `\n👤 Attendee #${this.attendeeNumber}: ${this.persona.name}`
    );
    console.log(
      `   Settings: ${this.persona.readingLevel}, ${this.persona.tone}`
    );

    try {
      // Initialize session
      const initResponse = await this.makeRequest("/api/canvas-state");
      this.sessionId = initResponse.sessionId;

      // Start conversation
      await this.sendMessage("Hello!");

      // Chaotic workshop experience
      for (let turn = 0; turn < maxTurns; turn++) {
        const action = await this.decideAction();
        await this.performAction(action);

        // Random small delays
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 500)
        );

        // Check if we've made progress
        const state = await this.getCanvasState();
        if (state) {
          const drafts = Object.keys(state.scriptureCanvas?.verses || {});
          if (drafts.length > this.experience.goalsCompleted) {
            this.experience.goalsCompleted = drafts.length;
          }
        }

        // If making good progress, maybe we're done
        if (
          this.experience.goalsCompleted >= 1 &&
          Math.random() < 0.1 // 10% chance to stop if we have a draft
        ) {
          break;
        }

        // If totally stuck, give up
        if (this.experience.stuckCount > 10) {
          console.log(`   ⚠️ Gave up after getting stuck ${this.experience.stuckCount} times`);
          break;
        }
      }

      // Evaluate experience
      return this.evaluateExperience();
    } catch (error) {
      console.log(`   ❌ Session crashed: ${error.message}`);
      return "FRUSTRATED";
    }
  }

  evaluateExperience() {
    const { goalsCompleted, confusionCount, stuckCount, successfulActions, totalTurns } = this.experience;

    // Check final state
    const successRate = successfulActions / Math.max(totalTurns, 1);

    let experienceLevel;

    if (goalsCompleted >= 1 && successRate > 0.8 && stuckCount < 3) {
      experienceLevel = "SUCCESS"; // ✅
    } else if (goalsCompleted >= 1 && successRate > 0.6) {
      experienceLevel = "DECENT"; // 🙂
    } else if (successRate > 0.4 || goalsCompleted > 0) {
      experienceLevel = "MIXED"; // 😐
    } else if (totalTurns > 10 && stuckCount > 5) {
      experienceLevel = "FRUSTRATED"; // ❌
    } else {
      experienceLevel = "CONFUSED"; // ⚠️
    }

    // Report
    const icons = {
      SUCCESS: "✅",
      DECENT: "🙂",
      MIXED: "😐",
      CONFUSED: "⚠️",
      FRUSTRATED: "❌",
    };

    console.log(
      `   ${icons[experienceLevel]} Experience: ${experienceLevel} (${goalsCompleted} drafts, ${totalTurns} turns, ${successRate.toFixed(2)} success rate)`
    );

    return experienceLevel;
  }
}

class ChaoticWorkshopSimulation {
  constructor(attendeeCount = 5) {
    this.attendeeCount = attendeeCount;
    this.results = {
      SUCCESS: 0,
      DECENT: 0,
      MIXED: 0,
      CONFUSED: 0,
      FRUSTRATED: 0,
    };
  }

  async runSimulation() {
    console.log("\n🌪️  CHAOTIC WORKSHOP SIMULATION");
    console.log("=" .repeat(60));
    console.log(`Simulating ${this.attendeeCount} workshop attendees`);
    console.log("No scripts, just randomness and natural confusion");
    console.log("=" .repeat(60));

    for (let i = 1; i <= this.attendeeCount; i++) {
      const attendee = new ChaoticWorkshopAttendee(i);
      const result = await attendee.runWorkshopSession();
      this.results[result]++;

      // Delay between attendees
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.printResults();
  }

  printResults() {
    console.log("\n📊 CHAOTIC WORKSHOP RESULTS");
    console.log("=" .repeat(60));

    const total = this.attendeeCount;
    const successful = this.results.SUCCESS + this.results.DECENT;
    const successRate = (successful / total) * 100;

    console.log(`✅ Success: ${this.results.SUCCESS} (${((this.results.SUCCESS / total) * 100).toFixed(1)}%)`);
    console.log(`🙂 Decent: ${this.results.DECENT} (${((this.results.DECENT / total) * 100).toFixed(1)}%)`);
    console.log(`😐 Mixed: ${this.results.MIXED} (${((this.results.MIXED / total) * 100).toFixed(1)}%)`);
    console.log(`⚠️ Confused: ${this.results.CONFUSED} (${((this.results.CONFUSED / total) * 100).toFixed(1)}%)`);
    console.log(`❌ Frustrated: ${this.results.FRUSTRATED} (${((this.results.FRUSTRATED / total) * 100).toFixed(1)}%)`);

    console.log("\n" + "=" .repeat(60));
    console.log(`📈 Overall Success Rate: ${successRate.toFixed(1)}% (Success + Decent)`);
    console.log("=" .repeat(60));

    const threshold = 70;
    if (successRate >= threshold) {
      console.log(`\n🎉 WORKSHOP PASSES! (${successRate.toFixed(1)}% >= ${threshold}%)`);
      console.log("The system handles chaotic user behavior well enough.");
    } else {
      console.log(`\n⚠️ WORKSHOP NEEDS IMPROVEMENT (${successRate.toFixed(1)}% < ${threshold}%)`);
      console.log("Too many attendees had frustrating experiences.");
    }

    return successRate >= threshold;
  }
}

// Main execution
async function main() {
  const attendeeCount = parseInt(process.argv[2]) || 5;

  console.log("🧪 Starting Chaotic Workshop Simulation");
  console.log(`Testing ${attendeeCount} random workshop attendees`);
  console.log("Each attendee will behave unpredictably");

  const simulation = new ChaoticWorkshopSimulation(attendeeCount);
  await simulation.runSimulation();

  process.exit(0);
}

main().catch(console.error);
