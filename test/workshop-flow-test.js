#!/usr/bin/env node

/**
 * WORKSHOP FLOW TEST
 *
 * Validates the complete workshop experience from start to finish:
 * - Name collection
 * - Settings customization
 * - Understanding phase with glossary collection
 * - Drafting phase with draft saving
 * - Proper phase transitions
 *
 * Run with: node test/workshop-flow-test.js
 */

import http from "http";

// Configuration
const BASE_URL = "http://localhost:8888";
const SESSION_ID = `workshop_test_${Date.now()}`;

// Test utilities
function makeRequest(path, method = "GET", body = null) {
  const url = new URL(`${BASE_URL}/.netlify/functions${path}`);

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": SESSION_ID,
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function sendMessage(message, history = []) {
  return makeRequest("/conversation", "POST", { message, history });
}

async function getCanvasState() {
  return makeRequest("/canvas-state", "GET");
}

// Color codes for output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Main test flow
async function runWorkshopTest() {
  log("\n" + "=".repeat(80), "blue");
  log("WORKSHOP FLOW TEST", "blue");
  log("Testing complete translation workflow", "blue");
  log("=".repeat(80) + "\n", "blue");

  const conversationHistory = [];
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Initial greeting and name collection
    log("📝 TEST 1: Name Collection", "yellow");
    let response = await sendMessage("", conversationHistory);
    let primaryMsg = response.messages.find((m) => m.agent?.name === "Translation Assistant");

    if (primaryMsg && primaryMsg.content.includes("What's your name")) {
      log("✅ Initial greeting asks for name", "green");
      testsPassed++;
    } else {
      log("❌ Initial greeting doesn't ask for name", "red");
      testsFailed++;
    }

    // Provide name
    response = await sendMessage("Sarah", conversationHistory);
    conversationHistory.push({ role: "user", content: "Sarah" });

    // Test 2: Settings collection
    log("\n📝 TEST 2: Settings Collection", "yellow");

    const settings = [
      { input: "English", description: "conversation language" },
      { input: "English", description: "source language" },
      { input: "Simple English", description: "target language" },
      { input: "Youth group teens", description: "target community" },
      { input: "Grade 6", description: "reading level" },
      { input: "Friendly and hopeful", description: "tone" },
      { input: "Meaning-based", description: "translation approach" },
    ];

    for (const setting of settings) {
      response = await sendMessage(setting.input, conversationHistory);
      conversationHistory.push({ role: "user", content: setting.input });

      // Add assistant responses to history
      if (response && response.messages) {
        response.messages.forEach((msg) => {
          if (msg.role === "assistant" && msg.content) {
            conversationHistory.push(msg);
          }
        });
      }

      log(`  Setting ${setting.description}: ${setting.input}`, "blue");
    }

    // Check if we transitioned to understanding
    let state = await getCanvasState();
    if (state.workflow?.currentPhase === "understanding") {
      log("✅ Transitioned to Understanding phase", "green");
      testsPassed++;
    } else {
      log(`❌ Still in ${state.workflow?.currentPhase} phase`, "red");
      testsFailed++;
    }

    // Test 3: Understanding phase with glossary collection
    log("\n📝 TEST 3: Understanding Phase", "yellow");

    // Start understanding
    response = await sendMessage("Let's understand the text", conversationHistory);
    conversationHistory.push({ role: "user", content: "Let's understand the text" });

    // Work through phrases
    const phrases = [
      { input: "Time before Israel had kings", phrase: "judges ruled" },
      { input: "Not enough food to eat", phrase: "famine" },
      { input: "A man from the town of bread", phrase: "Bethlehem" },
      { input: "He moved to another country", phrase: "went to Moab" },
      { input: "His whole family went with him", phrase: "family" },
    ];

    for (const item of phrases) {
      response = await sendMessage(item.input, conversationHistory);
      conversationHistory.push({ role: "user", content: item.input });

      if (response && response.messages) {
        response.messages.forEach((msg) => {
          if (msg.role === "assistant" && msg.content) {
            conversationHistory.push(msg);
          }
        });
      }

      log(`  Phrase "${item.phrase}": ${item.input}`, "blue");
    }

    // Check glossary was collected
    state = await getCanvasState();
    const hasGlossaryTerms = Object.keys(state.glossary?.keyTerms || {}).length > 0;
    const hasUserPhrases = Object.keys(state.glossary?.userPhrases || {}).length > 0;

    if (hasGlossaryTerms || hasUserPhrases) {
      log(
        `✅ Glossary collected: ${Object.keys(state.glossary?.keyTerms || {}).length} terms, ${
          Object.keys(state.glossary?.userPhrases || {}).length
        } phrases`,
        "green"
      );
      testsPassed++;
    } else {
      log("❌ No glossary entries collected", "red");
      testsFailed++;
    }

    // Test 4: Drafting phase
    log("\n📝 TEST 4: Drafting Phase", "yellow");

    // Indicate ready to draft
    response = await sendMessage("Ready to draft", conversationHistory);
    conversationHistory.push({ role: "user", content: "Ready to draft" });

    response.messages.forEach((msg) => {
      if (msg.role === "assistant" && msg.content) {
        conversationHistory.push(msg);
      }
    });

    // Provide draft
    const draft =
      "Long ago, before Israel had kings, there wasn't enough food. A man from Bethlehem took his wife and two sons to live in Moab where there was food.";
    response = await sendMessage(draft, conversationHistory);
    conversationHistory.push({ role: "user", content: draft });

    // Wait a moment for state to update
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if draft was saved
    state = await getCanvasState();
    const savedDraft = state.scriptureCanvas?.verses?.["Ruth 1:1"]?.draft;

    if (savedDraft) {
      log(`✅ Draft saved: "${savedDraft.substring(0, 50)}..."`, "green");
      testsPassed++;
    } else {
      log("❌ Draft not saved to canvas", "red");
      testsFailed++;
    }

    // Test 5: Verify complete state
    log("\n📝 TEST 5: Final State Verification", "yellow");

    const checks = [
      {
        name: "User name saved",
        value: state.styleGuide?.userName,
        expected: "Sarah",
      },
      {
        name: "Reading level saved",
        value: state.styleGuide?.readingLevel,
        expected: "Grade 6",
      },
      {
        name: "Current phase",
        value: state.workflow?.currentPhase,
        expected: "drafting",
      },
      {
        name: "Settings customized",
        value: state.settingsCustomized,
        expected: true,
      },
    ];

    for (const check of checks) {
      if (check.value === check.expected) {
        log(`✅ ${check.name}: ${check.value}`, "green");
        testsPassed++;
      } else {
        log(`❌ ${check.name}: ${check.value} (expected ${check.expected})`, "red");
        testsFailed++;
      }
    }
  } catch (error) {
    log(`\n❌ Test error: ${error.message}`, "red");
    testsFailed++;
  }

  // Summary
  log("\n" + "=".repeat(80), "blue");
  log("TEST SUMMARY", "blue");
  log("=".repeat(80), "blue");

  const totalTests = testsPassed + testsFailed;
  const successRate = Math.round((testsPassed / totalTests) * 100);

  log(
    `Tests Passed: ${testsPassed}/${totalTests}`,
    testsPassed === totalTests ? "green" : "yellow"
  );
  log(`Success Rate: ${successRate}%`, successRate === 100 ? "green" : "yellow");

  if (testsPassed === totalTests) {
    log("\n✅ WORKSHOP FLOW IS FULLY FUNCTIONAL!", "green");
    log("Users can successfully complete the translation workshop.", "green");
  } else {
    log("\n⚠️  SOME TESTS FAILED", "red");
    log("The workshop may not be fully functional.", "red");
  }

  log("\nTo run this test again: node test/workshop-flow-test.js", "blue");

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run the test
runWorkshopTest().catch((error) => {
  log(`Fatal error: ${error.message}`, "red");
  process.exit(1);
});
