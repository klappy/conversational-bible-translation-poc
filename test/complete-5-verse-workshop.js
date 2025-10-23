#!/usr/bin/env node

import http from "http";
import process from "process";

const BASE_URL = "http://localhost:8888";

// Pastor Amy persona - children's minister, Grade 3, fun tone
const PASTOR_AMY_RESPONSES = {
  // Planning phase responses
  name: "Amy",
  conversationLanguage: "English",
  sourceLanguage: "English",
  targetLanguage: "English",
  readingLevel: "Grade 3",
  tone: "Fun and engaging",
  philosophy: "Meaning-based",
  approach: "Dynamic",
  targetCommunity: "Children",

  // Understanding phase responses (phrase explanations)
  phraseExplanations: {
    "In the days when the judges ruled": "Back when there were leaders before kings",
    "there was a famine in the land": "There wasn't enough food for everyone",
    "And a certain man from Bethlehem in Judah": "A guy from the town where Jesus was born",
    "with his wife and two sons": "He had a wife and two boys",
    "went to reside in the land of Moab": "They moved to a different country",
    "The man's name was Elimelech": "The dad's name was Elimelech",
    "his wife's name was Naomi": "The mom was named Naomi",
    "and the names of his two sons were Mahlon and Chilion": "The boys were Mahlon and Chilion",
    "They were Ephrathites from Bethlehem in Judah": "They were from Bethlehem",
    "and they entered the land of Moab and settled there": "They moved to Moab and stayed",
    "Then Naomi's husband Elimelech died": "Sadly, Naomi's husband died",
    "and she was left with her two sons": "She was left with just her two boys",
    "who took Moabite women as their wives": "The boys married women from Moab",
    "one named Orpah": "One wife was named Orpah",
    "and the other named Ruth": "The other wife was named Ruth",
    "And after they had lived in Moab about ten years": "They lived there for about ten years",
    "both Mahlon and Chilion also died": "Sadly, both boys died too",
    "and Naomi was left without her two sons": "Naomi lost her sons",
    "and without her husband": "And her husband was gone too",
  },

  // Drafting phase responses
  drafts: {
    "Ruth 1:1":
      "Long ago, before Israel had kings, there wasn't enough food. So a man from Bethlehem took his wife and two sons to live in Moab.",
    "Ruth 1:2":
      "The man was named Elimelech, his wife was Naomi, and their sons were Mahlon and Chilion. They were from Bethlehem and moved to Moab.",
    "Ruth 1:3": "Then Elimelech died, leaving Naomi with her two sons.",
    "Ruth 1:4":
      "The sons married Moabite women named Orpah and Ruth. They lived in Moab for about ten years.",
    "Ruth 1:5": "Then both sons died too, leaving Naomi alone without her husband or sons.",
  },
};

class FiveVerseWorkshopTest {
  constructor() {
    this.sessionId = `test_5verse_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    this.conversationHistory = [];
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
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": this.sessionId,
        },
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
    console.log(`👤 Sending: ${message}`);

    const response = await this.makeRequest("/api/conversation", {
      message,
      sessionId: this.sessionId,
    });

    if (response && response.messages) {
      response.messages.forEach((msg) => {
        if (msg.role === "assistant" && msg.content) {
          this.conversationHistory.push(msg);
          console.log(`🤖 ${msg.agent?.name || "Assistant"}: ${msg.content}`);
        }
      });
    }

    return response;
  }

  async getCanvasState() {
    const response = await this.makeRequest(`/api/canvas-state?sessionId=${this.sessionId}`);
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

  async testPlanningPhase() {
    console.log("\n📋 TESTING PLANNING PHASE");
    console.log("=" * 50);

    // Test 1: Name collection
    let response = await this.sendMessage("Hello!");
    await this.assert(
      response.messages.some((msg) => msg.content.includes("name")),
      "Asks for user's name"
    );

    // Test 2: Name response
    response = await this.sendMessage(PASTOR_AMY_RESPONSES.name);
    await this.assert(
      response.messages.some((msg) => msg.content.includes(PASTOR_AMY_RESPONSES.name)),
      "Greets user by name"
    );

    // Test 3-9: Settings collection
    const settings = [
      { question: "conversation language", answer: PASTOR_AMY_RESPONSES.conversationLanguage },
      { question: "source language", answer: PASTOR_AMY_RESPONSES.sourceLanguage },
      { question: "target language", answer: PASTOR_AMY_RESPONSES.targetLanguage },
      { question: "reading level", answer: PASTOR_AMY_RESPONSES.readingLevel },
      { question: "tone", answer: PASTOR_AMY_RESPONSES.tone },
      { question: "philosophy", answer: PASTOR_AMY_RESPONSES.philosophy },
      { question: "approach", answer: PASTOR_AMY_RESPONSES.approach },
    ];

    for (const setting of settings) {
      response = await this.sendMessage(setting.answer);
      await this.assert(
        response.messages.some(
          (msg) =>
            msg.content.toLowerCase().includes("next") || msg.content.toLowerCase().includes("what")
        ),
        `Collects ${setting.question} setting`
      );
    }

    // Test 10: Final settings confirmation
    response = await this.sendMessage("Use these settings and begin");
    await this.assert(
      response.messages.some(
        (msg) =>
          msg.content.toLowerCase().includes("understanding") ||
          msg.content.toLowerCase().includes("verse")
      ),
      "Transitions to understanding phase"
    );

    // Verify settings saved
    const state = await this.getCanvasState();
    await this.assert(
      state.styleGuide.userName === PASTOR_AMY_RESPONSES.name,
      "User name saved in state"
    );
    await this.assert(
      state.styleGuide.readingLevel === PASTOR_AMY_RESPONSES.readingLevel,
      "Reading level saved in state"
    );
  }

  async testUnderstandingPhase(verseNumber) {
    console.log(`\n📖 TESTING UNDERSTANDING PHASE - VERSE ${verseNumber}`);
    console.log("=" * 50);

    // Get phrases for this verse from the data
    const verseData = await this.makeRequest(
      "/.netlify/functions/resources?type=bible&id=bsb-ruth-1"
    );
    const verse = verseData.verses.find((v) => v.verse === verseNumber);

    if (!verse) {
      console.log(`⚠️ No data found for verse ${verseNumber}`);
      return;
    }

    console.log(`Working on phrases: ${verse.phrases.join(", ")}`);

    // Test each phrase
    for (const phrase of verse.phrases) {
      console.log(`\n🔍 Testing phrase: "${phrase}"`);

      // Send explanation
      const explanation = PASTOR_AMY_RESPONSES.phraseExplanations[phrase];
      if (explanation) {
        const response = await this.sendMessage(explanation);
        await this.assert(
          response.messages.some(
            (msg) =>
              msg.content.toLowerCase().includes("next") ||
              msg.content.toLowerCase().includes("good")
          ),
          `Processes explanation for: "${phrase}"`
        );
      }
    }

    // Verify glossary entries
    const updatedState = await this.getCanvasState();
    const userPhrases = updatedState.glossary?.userPhrases || {};
    const keyTerms = updatedState.glossary?.keyTerms || {};

    await this.assert(
      Object.keys(userPhrases).length > 0,
      `Glossary has user phrase entries (${Object.keys(userPhrases).length} found)`
    );

    console.log(
      `📚 Glossary now has ${Object.keys(userPhrases).length} user phrases and ${
        Object.keys(keyTerms).length
      } key terms`
    );
  }

  async testDraftingPhase(verseNumber) {
    console.log(`\n✍️ TESTING DRAFTING PHASE - VERSE ${verseNumber}`);
    console.log("=" * 50);

    const draft = PASTOR_AMY_RESPONSES.drafts[`Ruth 1:${verseNumber}`];
    if (!draft) {
      console.log(`⚠️ No draft provided for verse ${verseNumber}`);
      return;
    }

    // Send draft
    const response = await this.sendMessage(draft);
    await this.assert(
      response.messages.some(
        (msg) =>
          msg.content.toLowerCase().includes("draft") ||
          msg.content.toLowerCase().includes("saved") ||
          msg.content.toLowerCase().includes("recorded")
      ),
      `Draft saved for verse ${verseNumber}`
    );

    // Verify draft saved to canvas
    const state = await this.getCanvasState();
    const savedDraft = state.scriptureCanvas?.verses?.[`Ruth 1:${verseNumber}`];

    await this.assert(
      savedDraft && savedDraft.draft,
      `Draft exists in canvas for Ruth 1:${verseNumber}`
    );

    if (savedDraft) {
      console.log(`📝 Draft saved: "${savedDraft.draft.substring(0, 50)}..."`);
    }
  }

  async testCompleteWorkshop() {
    console.log("\n🚀 STARTING COMPLETE 5-VERSE WORKSHOP TEST");
    console.log("=" * 60);
    console.log(`📱 Session ID: ${this.sessionId}`);

    try {
      // Test Planning Phase
      await this.testPlanningPhase();

      // Test Understanding + Drafting for each verse
      for (let verse = 1; verse <= 5; verse++) {
        await this.testUnderstandingPhase(verse);
        await this.testDraftingPhase(verse);

        // Small delay between verses
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Final verification
      console.log("\n🔍 FINAL VERIFICATION");
      console.log("=" * 30);

      const finalState = await this.getCanvasState();

      // Check all drafts saved
      const savedVerses = Object.keys(finalState.scriptureCanvas?.verses || {});
      await this.assert(
        savedVerses.length >= 5,
        `All 5 verse drafts saved (${savedVerses.length} found)`
      );

      // Check glossary accumulation
      const totalUserPhrases = Object.keys(finalState.glossary?.userPhrases || {}).length;
      const totalKeyTerms = Object.keys(finalState.glossary?.keyTerms || {}).length;

      await this.assert(totalUserPhrases > 0, `User phrases collected (${totalUserPhrases} found)`);

      await this.assert(totalKeyTerms > 0, `Key terms collected (${totalKeyTerms} found)`);

      // Check conversation flow
      await this.assert(
        this.conversationHistory.length > 50,
        `Natural conversation flow (${this.conversationHistory.length} messages)`
      );
    } catch (error) {
      console.error("❌ Test failed with error:", error);
      this.testResults.failed++;
      this.testResults.errors.push(`Test error: ${error.message}`);
    }
  }

  printResults() {
    console.log("\n📊 TEST RESULTS");
    console.log("=" * 30);
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
    console.log(`\n${success ? "🎉 ALL TESTS PASSED!" : "⚠️ SOME TESTS FAILED"}`);
    return success;
  }
}

// Run the test
async function main() {
  console.log("🧪 Starting 5-Verse Workshop Test");
  console.log("Testing complete workshop experience through all 5 verses of Ruth");

  const test = new FiveVerseWorkshopTest();
  await test.testCompleteWorkshop();

  const success = test.printResults();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);
