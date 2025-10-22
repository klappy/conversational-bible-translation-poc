#!/usr/bin/env node

import http from "http";
import process from "process";

const BASE_URL = "http://localhost:8888";

// Different personas for testing variety
const PERSONAS = {
  youthPastor: {
    name: "Jake",
    responses: {
      conversationLanguage: "English",
      sourceLanguage: "English",
      targetLanguage: "English",
      readingLevel: "Grade 8",
      tone: "Casual and modern",
      philosophy: "Dynamic",
      approach: "Dynamic",
      targetCommunity: "Teens",
      phraseExplanations: {
        "In the days when the judges ruled":
          "Back in the day before kings, when judges were in charge",
        "there was a famine in the land": "There was a major food shortage",
        "And a certain man from Bethlehem in Judah": "This dude from Bethlehem",
        "with his wife and two sons": "He had his wife and two kids",
        "went to reside in the land of Moab": "They moved to Moab to live there",
      },
      draft:
        "Back when judges were running things, there was a huge food shortage. So this guy from Bethlehem packed up his family and moved to Moab.",
    },
  },

  eslTeacher: {
    name: "Maria",
    responses: {
      conversationLanguage: "English",
      sourceLanguage: "English",
      targetLanguage: "English",
      readingLevel: "Grade 2",
      tone: "Simple and clear",
      philosophy: "Meaning-based",
      approach: "Dynamic",
      targetCommunity: "ESL Students",
      phraseExplanations: {
        "In the days when the judges ruled": "A long time ago, when judges were leaders",
        "there was a famine in the land": "There was no food",
        "And a certain man from Bethlehem in Judah": "A man from Bethlehem",
        "with his wife and two sons": "He had a wife and two boys",
        "went to reside in the land of Moab": "They went to live in Moab",
      },
      draft:
        "Long ago, when judges were leaders, there was no food. A man from Bethlehem took his wife and two sons to live in Moab.",
    },
  },

  traditionalMinister: {
    name: "Reverend Thompson",
    responses: {
      conversationLanguage: "English",
      sourceLanguage: "English",
      targetLanguage: "English",
      readingLevel: "Adult",
      tone: "Reverent and formal",
      philosophy: "Word-for-word",
      approach: "Word-for-word",
      targetCommunity: "Adults",
      phraseExplanations: {
        "In the days when the judges ruled": "During the period when the judges governed Israel",
        "there was a famine in the land": "A severe famine afflicted the land",
        "And a certain man from Bethlehem in Judah": "A man from Bethlehem in Judah",
        "with his wife and two sons": "accompanied by his wife and two sons",
        "went to reside in the land of Moab": "journeyed to dwell in the land of Moab",
      },
      draft:
        "In the days when the judges ruled, there was a famine in the land. And a certain man from Bethlehem in Judah, with his wife and two sons, went to reside in the land of Moab.",
    },
  },
};

class MultiPersonaTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
    };
  }

  async makeRequest(path, data = null) {
    return new Promise((resolve, reject) => {
      // Convert API paths to Netlify function paths
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

  async sendMessage(message, sessionId) {
    const response = await this.makeRequest("/api/conversation", {
      message,
      sessionId,
    });
    return response;
  }

  async getCanvasState(sessionId) {
    const response = await this.makeRequest(`/api/canvas-state?sessionId=${sessionId}`);
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

  async testPersona(personaName, persona) {
    console.log(`\n👤 TESTING PERSONA: ${personaName.toUpperCase()}`);
    console.log("=" * 50);

    try {
      // Initialize new session for this persona
      const initResponse = await this.makeRequest("/api/canvas-state");
      const sessionId = initResponse.sessionId;
      console.log(`📱 Session ID: ${sessionId}`);

      // Test name collection
      let response = await this.sendMessage("Hello!", sessionId);
      await this.assert(
        response.messages.some((msg) => msg.content.includes("name")),
        `${personaName}: Asks for name`
      );

      // Test name response
      response = await this.sendMessage(persona.name, sessionId);
      await this.assert(
        response.messages.some((msg) => msg.content.includes(persona.name)),
        `${personaName}: Greets by name`
      );

      // Test settings collection
      const settings = [
        { key: "conversationLanguage", value: persona.responses.conversationLanguage },
        { key: "sourceLanguage", value: persona.responses.sourceLanguage },
        { key: "targetLanguage", value: persona.responses.targetLanguage },
        { key: "readingLevel", value: persona.responses.readingLevel },
        { key: "tone", value: persona.responses.tone },
        { key: "philosophy", value: persona.responses.philosophy },
        { key: "approach", value: persona.responses.approach },
      ];

      for (const setting of settings) {
        response = await this.sendMessage(setting.value, sessionId);
        await this.assert(
          response.messages.some(
            (msg) =>
              msg.content.toLowerCase().includes("next") ||
              msg.content.toLowerCase().includes("what")
          ),
          `${personaName}: Collects ${setting.key} setting`
        );
      }

      // Test transition to understanding
      response = await this.sendMessage("Use these settings and begin", sessionId);
      await this.assert(
        response.messages.some(
          (msg) =>
            msg.content.toLowerCase().includes("understanding") ||
            msg.content.toLowerCase().includes("verse")
        ),
        `${personaName}: Transitions to understanding phase`
      );

      // Test understanding phase with persona-specific responses
      const phrases = [
        "In the days when the judges ruled",
        "there was a famine in the land",
        "And a certain man from Bethlehem in Judah",
        "with his wife and two sons",
        "went to reside in the land of Moab",
      ];

      for (const phrase of phrases) {
        const explanation = persona.responses.phraseExplanations[phrase];
        if (explanation) {
          response = await this.sendMessage(explanation, sessionId);
          await this.assert(
            response.messages.some(
              (msg) =>
                msg.content.toLowerCase().includes("next") ||
                msg.content.toLowerCase().includes("good")
            ),
            `${personaName}: Processes phrase explanation`
          );
        }
      }

      // Test drafting phase
      response = await this.sendMessage(persona.responses.draft, sessionId);
      await this.assert(
        response.messages.some(
          (msg) =>
            msg.content.toLowerCase().includes("draft") ||
            msg.content.toLowerCase().includes("saved")
        ),
        `${personaName}: Saves draft`
      );

      // Verify settings persisted correctly
      const state = await this.getCanvasState(sessionId);
      await this.assert(
        state.styleGuide.userName === persona.name,
        `${personaName}: Name saved correctly`
      );
      await this.assert(
        state.styleGuide.readingLevel === persona.responses.readingLevel,
        `${personaName}: Reading level saved correctly`
      );
      await this.assert(
        state.styleGuide.tone === persona.responses.tone,
        `${personaName}: Tone saved correctly`
      );

      // Verify draft saved
      const savedDraft = state.scriptureCanvas?.verses?.["Ruth 1:1"];
      await this.assert(savedDraft && savedDraft.draft, `${personaName}: Draft saved to canvas`);

      // Verify glossary entries
      const userPhrases = Object.keys(state.glossary?.userPhrases || {});
      const keyTerms = Object.keys(state.glossary?.keyTerms || {});

      await this.assert(
        userPhrases.length > 0,
        `${personaName}: User phrases collected (${userPhrases.length} found)`
      );

      console.log(`📊 ${personaName} Results:`);
      console.log(`   - Settings: ${state.styleGuide.tone}, ${state.styleGuide.readingLevel}`);
      console.log(`   - Draft: "${savedDraft?.draft?.substring(0, 50)}..."`);
      console.log(`   - Glossary: ${userPhrases.length} phrases, ${keyTerms.length} terms`);
    } catch (error) {
      console.error(`❌ ${personaName} test failed:`, error);
      this.testResults.failed++;
      this.testResults.errors.push(`${personaName} error: ${error.message}`);
    }
  }

  async testAllPersonas() {
    console.log("\n🧪 STARTING MULTI-PERSONA SPOT CHECK TEST");
    console.log("Testing different user types with same verse");
    console.log("=" * 60);

    for (const [personaName, persona] of Object.entries(PERSONAS)) {
      await this.testPersona(personaName, persona);

      // Small delay between personas
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  printResults() {
    console.log("\n📊 MULTI-PERSONA TEST RESULTS");
    console.log("=" * 40);
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(
      `📈 Success Rate: ${Math.round(
        (this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100
      )}%`
    );

    if (this.testResults.errors.length > 0) {
      console.log("\n❌ ERRORS:");
      this.testResults.errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }

    const success = this.testResults.failed === 0;
    console.log(`\n${success ? "🎉 ALL PERSONA TESTS PASSED!" : "⚠️ SOME PERSONA TESTS FAILED"}`);
    return success;
  }
}

// Run the test
async function main() {
  console.log("🧪 Starting Multi-Persona Spot Check Test");
  console.log("Testing different user types with Ruth 1:1");

  const test = new MultiPersonaTest();
  await test.testAllPersonas();

  const success = test.printResults();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);
