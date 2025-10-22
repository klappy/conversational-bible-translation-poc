#!/usr/bin/env node

import http from "http";
import process from "process";

const BASE_URL = "http://localhost:8888";

class SessionResumptionTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    this.sessionId = null;
  }

  async makeRequest(path, data = null) {
    return new Promise((resolve, reject) => {
      // Convert API paths to Netlify function paths
      let netlifyPath = path;
      if (path.startsWith('/api/')) {
        netlifyPath = path.replace('/api/', '/.netlify/functions/');
      } else if (!path.startsWith('/.netlify/functions/')) {
        netlifyPath = `/.netlify/functions${path}`;
      }
      
      const options = {
        hostname: "localhost",
        port: 8888,
        path: netlifyPath,
        method: data ? "POST" : "GET",
        headers: data ? { "Content-Type": "application/json" } : {}
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

  async sendMessage(message, sessionId = null) {
    const response = await this.makeRequest("/api/conversation", {
      message,
      sessionId: sessionId || this.sessionId
    });
    return response;
  }

  async getCanvasState(sessionId = null) {
    const response = await this.makeRequest(`/api/canvas-state?sessionId=${sessionId || this.sessionId}`);
    return response;
  }

  async assert(condition, message) {
    if (condition) {
      console.log(`✅ ${message}`);
      this.testResults.passed++;
    } else {
      console.log(`❌ ${message}`);
      this.testResults.failed++;
      this.testResults.errors.push(message);
    }
  }

  async testInitialSession() {
    console.log("\n📱 TESTING INITIAL SESSION SETUP");
    console.log("=" * 50);

    // Initialize session
    const initResponse = await this.makeRequest("/api/canvas-state");
    this.sessionId = initResponse.sessionId;
    console.log(`📱 Session ID: ${this.sessionId}`);

    // Complete planning phase
    console.log("\n📋 Completing Planning Phase...");
    let response = await this.sendMessage("Hello!");
    await this.assert(
      response.messages.some(msg => msg.content.includes("name")),
      "Asks for user's name"
    );

    response = await this.sendMessage("Sarah");
    await this.assert(
      response.messages.some(msg => msg.content.includes("Sarah")),
      "Greets user by name"
    );

    // Collect all settings
    const settings = [
      "English", // conversation language
      "English", // source language  
      "English", // target language
      "Grade 5", // reading level
      "Friendly and encouraging", // tone
      "Meaning-based", // philosophy
      "Dynamic" // approach
    ];

    for (const setting of settings) {
      response = await this.sendMessage(setting);
      await this.assert(
        response.messages.some(msg => msg.content.toLowerCase().includes("next") || msg.content.toLowerCase().includes("what")),
        `Collects setting: ${setting}`
      );
    }

    // Start understanding phase
    response = await this.sendMessage("Use these settings and begin");
    await this.assert(
      response.messages.some(msg => msg.content.toLowerCase().includes("understanding") || msg.content.toLowerCase().includes("verse")),
      "Transitions to understanding phase"
    );

    // Complete verse 1 understanding
    console.log("\n📖 Completing Verse 1 Understanding...");
    const verse1Phrases = [
      "In the days when the judges ruled",
      "there was a famine in the land",
      "And a certain man from Bethlehem in Judah",
      "with his wife and two sons",
      "went to reside in the land of Moab"
    ];

    for (const phrase of verse1Phrases) {
      response = await this.sendMessage(`This means ${phrase.toLowerCase()}`);
      await this.assert(
        response.messages.some(msg => msg.content.toLowerCase().includes("next") || msg.content.toLowerCase().includes("good")),
        `Processes phrase: ${phrase}`
      );
    }

    // Draft verse 1
    console.log("\n✍️ Drafting Verse 1...");
    response = await this.sendMessage("Long ago, when judges ruled, there was no food. A man from Bethlehem took his family to Moab.");
    await this.assert(
      response.messages.some(msg => msg.content.toLowerCase().includes("draft") || msg.content.toLowerCase().includes("saved")),
      "Saves verse 1 draft"
    );

    // Complete verse 2 understanding
    console.log("\n📖 Completing Verse 2 Understanding...");
    const verse2Phrases = [
      "The man's name was Elimelech",
      "his wife's name was Naomi", 
      "and the names of his two sons were Mahlon and Chilion",
      "They were Ephrathites from Bethlehem in Judah",
      "and they entered the land of Moab and settled there"
    ];

    for (const phrase of verse2Phrases) {
      response = await this.sendMessage(`This means ${phrase.toLowerCase()}`);
      await this.assert(
        response.messages.some(msg => msg.content.toLowerCase().includes("next") || msg.content.toLowerCase().includes("good")),
        `Processes phrase: ${phrase}`
      );
    }

    // Draft verse 2
    console.log("\n✍️ Drafting Verse 2...");
    response = await this.sendMessage("The man was Elimelech, his wife Naomi, and their sons Mahlon and Chilion. They were from Bethlehem and moved to Moab.");
    await this.assert(
      response.messages.some(msg => msg.content.toLowerCase().includes("draft") || msg.content.toLowerCase().includes("saved")),
      "Saves verse 2 draft"
    );

    // Verify state before "closing browser"
    const state = await this.getCanvasState();
    console.log("\n📊 State before 'closing browser':");
    console.log(`   - User: ${state.styleGuide.userName}`);
    console.log(`   - Settings: ${state.styleGuide.tone}, ${state.styleGuide.readingLevel}`);
    console.log(`   - Drafts: ${Object.keys(state.scriptureCanvas?.verses || {}).length} verses`);
    console.log(`   - Glossary: ${Object.keys(state.glossary?.userPhrases || {}).length} phrases`);

    await this.assert(
      state.styleGuide.userName === "Sarah",
      "User name preserved"
    );
    await this.assert(
      Object.keys(state.scriptureCanvas?.verses || {}).length >= 2,
      "Both verse drafts saved"
    );
    await this.assert(
      Object.keys(state.glossary?.userPhrases || {}).length > 0,
      "Glossary entries preserved"
    );
  }

  async testSessionResumption() {
    console.log("\n🔄 TESTING SESSION RESUMPTION");
    console.log("=" * 50);

    // Simulate "closing browser" - use the same sessionId but new test instance
    console.log(`📱 Resuming session: ${this.sessionId}`);

    // Test that we can load the existing state
    const resumedState = await this.getCanvasState();
    console.log("\n📊 Resumed state:");
    console.log(`   - User: ${resumedState.styleGuide.userName}`);
    console.log(`   - Settings: ${resumedState.styleGuide.tone}, ${resumedState.styleGuide.readingLevel}`);
    console.log(`   - Drafts: ${Object.keys(resumedState.scriptureCanvas?.verses || {}).length} verses`);
    console.log(`   - Glossary: ${Object.keys(resumedState.glossary?.userPhrases || {}).length} phrases`);

    await this.assert(
      resumedState.styleGuide.userName === "Sarah",
      "User name preserved after resumption"
    );
    await this.assert(
      resumedState.styleGuide.tone === "Friendly and encouraging",
      "Tone setting preserved after resumption"
    );
    await this.assert(
      resumedState.styleGuide.readingLevel === "Grade 5",
      "Reading level preserved after resumption"
    );
    await this.assert(
      Object.keys(resumedState.scriptureCanvas?.verses || {}).length >= 2,
      "Previous drafts preserved after resumption"
    );
    await this.assert(
      Object.keys(resumedState.glossary?.userPhrases || {}).length > 0,
      "Glossary entries preserved after resumption"
    );

    // Test continuing the conversation
    console.log("\n💬 Testing conversation continuation...");
    let response = await this.sendMessage("Let's continue with verse 3");
    await this.assert(
      response.messages.some(msg => msg.content.toLowerCase().includes("verse") || msg.content.toLowerCase().includes("understanding")),
      "Continues conversation naturally"
    );

    // Complete verse 3
    console.log("\n📖 Completing Verse 3 Understanding...");
    const verse3Phrases = [
      "Then Naomi's husband Elimelech died",
      "and she was left with her two sons"
    ];

    for (const phrase of verse3Phrases) {
      response = await this.sendMessage(`This means ${phrase.toLowerCase()}`);
      await this.assert(
        response.messages.some(msg => msg.content.toLowerCase().includes("next") || msg.content.toLowerCase().includes("good")),
        `Processes phrase: ${phrase}`
      );
    }

    // Draft verse 3
    console.log("\n✍️ Drafting Verse 3...");
    response = await this.sendMessage("Then Elimelech died, leaving Naomi with her two sons.");
    await this.assert(
      response.messages.some(msg => msg.content.toLowerCase().includes("draft") || msg.content.toLowerCase().includes("saved")),
      "Saves verse 3 draft"
    );

    // Verify all data still intact
    const finalState = await this.getCanvasState();
    await this.assert(
      Object.keys(finalState.scriptureCanvas?.verses || {}).length >= 3,
      "All drafts preserved including new one"
    );
    await this.assert(
      Object.keys(finalState.glossary?.userPhrases || {}).length > 0,
      "Glossary continues to accumulate"
    );

    console.log("\n📊 Final state after resumption:");
    console.log(`   - Total drafts: ${Object.keys(finalState.scriptureCanvas?.verses || {}).length}`);
    console.log(`   - Total phrases: ${Object.keys(finalState.glossary?.userPhrases || {}).length}`);
    console.log(`   - Total terms: ${Object.keys(finalState.glossary?.keyTerms || {}).length}`);
  }

  async testCompleteResumption() {
    console.log("\n🧪 STARTING SESSION RESUMPTION TEST");
    console.log("Testing pause/resume functionality");
    console.log("=" * 60);

    try {
      // Phase 1: Complete initial work (verses 1-2)
      await this.testInitialSession();

      // Phase 2: Simulate "closing browser" and resuming
      await this.testSessionResumption();

    } catch (error) {
      console.error("❌ Session resumption test failed:", error);
      this.testResults.failed++;
      this.testResults.errors.push(`Resumption error: ${error.message}`);
    }
  }

  printResults() {
    console.log("\n📊 SESSION RESUMPTION TEST RESULTS");
    console.log("=" * 40);
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${Math.round((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100)}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log("\n❌ ERRORS:");
      this.testResults.errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }

    const success = this.testResults.failed === 0;
    console.log(`\n${success ? "🎉 SESSION RESUMPTION WORKS!" : "⚠️ SESSION RESUMPTION ISSUES FOUND"}`);
    return success;
  }
}

// Run the test
async function main() {
  console.log("🧪 Starting Session Resumption Test");
  console.log("Testing pause/resume functionality");
  
  const test = new SessionResumptionTest();
  await test.testCompleteResumption();
  
  const success = test.printResults();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);
