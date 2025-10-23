#!/usr/bin/env node

/**
 * REGRESSION TEST SUITE
 *
 * Quick tests to run after any code changes to ensure core functionality still works:
 * - Quick responses appear and are relevant
 * - Glossary terms are saved during Understanding phase
 * - Drafts are saved during Drafting phase
 * - Phase transitions work correctly
 * - Settings are persisted
 *
 * Run with: node test/regression-test-suite.js
 */

import http from "http";

const BASE_URL = "http://localhost:8888";

// Test utilities
function makeRequest(path, method = "GET", body = null, sessionId = null) {
  const url = new URL(`${BASE_URL}/.netlify/functions${path}`);

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId || `regression_${Date.now()}_${Math.random()}`,
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

// Colors
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Individual regression tests
const regressionTests = [
  {
    name: "Quick Responses Timing",
    description: "Verify quick responses match the current question, not the previous one",
    async run() {
      const sessionId = `test_suggestions_${Date.now()}`;

      // Get initial greeting
      let response = await makeRequest(
        "/conversation",
        "POST",
        { message: "", history: [] },
        sessionId
      );

      // Provide name
      response = await makeRequest(
        "/conversation",
        "POST",
        { message: "Chris", history: [] },
        sessionId
      );

      // Check suggestions are for CURRENT question (language), not name
      const suggestions = response.suggestions || [];
      const hasLanguageSuggestion = suggestions.some(
        (s) =>
          s.toLowerCase().includes("english") ||
          s.toLowerCase().includes("spanish") ||
          s.toLowerCase().includes("language")
      );

      if (hasLanguageSuggestion) {
        return { passed: true, message: "Suggestions match current question" };
      } else {
        return {
          passed: false,
          message: `Suggestions don't match. Got: ${suggestions.join(", ")}`,
        };
      }
    },
  },

  {
    name: "Glossary Collection",
    description: "Verify glossary terms and phrases are saved during Understanding phase",
    async run() {
      const sessionId = `test_glossary_${Date.now()}`;

      // Quick setup to get to understanding phase
      await makeRequest("/conversation", "POST", { message: "Test User", history: [] }, sessionId);
      await makeRequest("/conversation", "POST", { message: "English", history: [] }, sessionId);
      await makeRequest("/conversation", "POST", { message: "English", history: [] }, sessionId);
      await makeRequest(
        "/conversation",
        "POST",
        { message: "Simple English", history: [] },
        sessionId
      );
      await makeRequest("/conversation", "POST", { message: "Kids", history: [] }, sessionId);
      await makeRequest("/conversation", "POST", { message: "Grade 3", history: [] }, sessionId);
      await makeRequest("/conversation", "POST", { message: "Fun", history: [] }, sessionId);
      await makeRequest(
        "/conversation",
        "POST",
        { message: "Meaning-based", history: [] },
        sessionId
      );

      // Now in understanding - provide phrase explanations
      await makeRequest("/conversation", "POST", { message: "Continue", history: [] }, sessionId);
      await makeRequest(
        "/conversation",
        "POST",
        { message: "Time before kings ruled", history: [] },
        sessionId
      );

      // Check state
      const state = await makeRequest("/canvas-state", "GET", null, sessionId);

      const hasGlossary =
        Object.keys(state.glossary?.keyTerms || {}).length > 0 ||
        Object.keys(state.glossary?.userPhrases || {}).length > 0;

      if (hasGlossary) {
        return {
          passed: true,
          message: `Collected ${Object.keys(state.glossary?.keyTerms || {}).length} terms, ${
            Object.keys(state.glossary?.userPhrases || {}).length
          } phrases`,
        };
      } else {
        return { passed: false, message: "No glossary entries collected" };
      }
    },
  },

  {
    name: "Draft Saving",
    description: "Verify drafts are saved to scriptureCanvas during Drafting phase",
    async run() {
      const sessionId = `test_draft_${Date.now()}`;

      // Speed run to drafting phase
      const quickSetup = [
        "Test User",
        "English",
        "English",
        "Simple English",
        "Kids",
        "Grade 3",
        "Fun",
        "Meaning-based",
        "Continue",
        "Time before kings",
        "No food",
        "Guy from Bethlehem",
        "Went to another place",
        "His family",
        "Ready to draft",
      ];

      for (const msg of quickSetup) {
        await makeRequest("/conversation", "POST", { message: msg, history: [] }, sessionId);
      }

      // Provide draft
      const draft = "A long time ago, there was no food. A man took his family to Moab.";
      await makeRequest("/conversation", "POST", { message: draft, history: [] }, sessionId);

      // Wait for state update
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if draft was saved
      const state = await makeRequest("/canvas-state", "GET", null, sessionId);
      const savedDraft = state.scriptureCanvas?.verses?.["Ruth 1:1"]?.draft;

      if (savedDraft) {
        return { passed: true, message: `Draft saved: "${savedDraft.substring(0, 30)}..."` };
      } else {
        return { passed: false, message: "Draft not saved to canvas" };
      }
    },
  },

  {
    name: "Phase Transitions",
    description: "Verify workflow phases transition correctly",
    async run() {
      const sessionId = `test_phases_${Date.now()}`;
      const phases = [];

      // Initial state
      let state = await makeRequest("/canvas-state", "GET", null, sessionId);
      phases.push(state.workflow?.currentPhase || "unknown");

      // Complete planning
      const planningMessages = [
        "Test User",
        "English",
        "English",
        "Simple English",
        "Kids",
        "Grade 3",
        "Fun",
        "Meaning-based",
      ];

      for (const msg of planningMessages) {
        await makeRequest("/conversation", "POST", { message: msg, history: [] }, sessionId);
      }

      state = await makeRequest("/canvas-state", "GET", null, sessionId);
      phases.push(state.workflow?.currentPhase || "unknown");

      const correctTransition = phases[0] === "planning" && phases[1] === "understanding";

      if (correctTransition) {
        return {
          passed: true,
          message: `Phases: ${phases.join(" → ")}`,
        };
      } else {
        return {
          passed: false,
          message: `Incorrect phases: ${phases.join(" → ")}`,
        };
      }
    },
  },

  {
    name: "Settings Persistence",
    description: "Verify user settings are saved and persist across requests",
    async run() {
      const sessionId = `test_settings_${Date.now()}`;

      // Set user name
      await makeRequest(
        "/conversation",
        "POST",
        { message: "TestUserName", history: [] },
        sessionId
      );

      // Set a few more settings
      await makeRequest("/conversation", "POST", { message: "Spanish", history: [] }, sessionId);
      await makeRequest("/conversation", "POST", { message: "English", history: [] }, sessionId);

      // Check state persists
      const state = await makeRequest("/canvas-state", "GET", null, sessionId);

      const hasUserName = state.styleGuide?.userName === "TestUserName";
      const hasLanguage = state.styleGuide?.conversationLanguage === "Spanish";

      if (hasUserName && hasLanguage) {
        return {
          passed: true,
          message: `Settings saved: ${state.styleGuide?.userName}, ${state.styleGuide?.conversationLanguage}`,
        };
      } else {
        return {
          passed: false,
          message: `Settings not properly saved. Got userName="${state.styleGuide?.userName}" (expected "TestUserName"), conversationLanguage="${state.styleGuide?.conversationLanguage}" (expected "Spanish")`,
        };
      }
    },
  },
];

// Main test runner
async function runRegressionTests() {
  log("\n" + "=".repeat(80), "cyan");
  log("REGRESSION TEST SUITE", "cyan");
  log("Running quick tests to ensure nothing is broken", "cyan");
  log("=".repeat(80) + "\n", "cyan");

  let totalPassed = 0;
  let totalFailed = 0;

  for (const test of regressionTests) {
    log(`🧪 ${test.name}`, "yellow");
    log(`   ${test.description}`, "blue");

    try {
      const result = await test.run();

      if (result.passed) {
        log(`   ✅ PASSED: ${result.message}`, "green");
        totalPassed++;
      } else {
        log(`   ❌ FAILED: ${result.message}`, "red");
        totalFailed++;
      }
    } catch (error) {
      log(`   ❌ ERROR: ${error.message}`, "red");
      totalFailed++;
    }

    log(""); // Empty line between tests
  }

  // Summary
  log("=".repeat(80), "cyan");
  log("SUMMARY", "cyan");
  log("=".repeat(80), "cyan");

  const total = totalPassed + totalFailed;
  const successRate = Math.round((totalPassed / total) * 100);

  log(`Tests Passed: ${totalPassed}/${total}`, totalPassed === total ? "green" : "yellow");
  log(`Success Rate: ${successRate}%\n`, successRate === 100 ? "green" : "yellow");

  if (totalPassed === total) {
    log("✅ ALL REGRESSION TESTS PASSED", "green");
    log("No regressions detected. Safe to deploy!", "green");
  } else {
    log("⚠️  REGRESSION DETECTED", "red");
    log("Some functionality may be broken. Review failed tests above.", "red");
  }

  log("\n💡 Run specific workshop test: node test/workshop-flow-test.js", "blue");
  log("💡 Run after any code changes: node test/regression-test-suite.js\n", "blue");

  process.exit(totalFailed > 0 ? 1 : 0);
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest("/conversation", "POST", { message: "test", history: [] });
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  log("Checking if server is running...", "yellow");

  const serverUp = await checkServer();

  if (!serverUp) {
    log("❌ Server is not running!", "red");
    log("Please start the server with: npm run dev:netlify", "yellow");
    process.exit(1);
  }

  log("✅ Server is running\n", "green");

  await runRegressionTests();
}

main().catch((error) => {
  log(`Fatal error: ${error.message}`, "red");
  process.exit(1);
});
