#!/usr/bin/env node

/**
 * PRODUCTION DIAGNOSTICS
 * 
 * Test Netlify Functions deployment to identify issues with agent responses
 * Run with: node test/diagnose-production.js [production-url]
 * 
 * Examples:
 * - node test/diagnose-production.js (uses PRODUCTION_URL env var)
 * - node test/diagnose-production.js https://your-site.netlify.app
 */

import http from "http";
import https from "https";

// Get production URL from args or env
const productionUrl = process.argv[2] || process.env.PRODUCTION_URL || "https://conversational-bible-translation.netlify.app";

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

function makeRequest(url, method = "GET", body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith("https");
    const httpModule = isHttps ? https : http;
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Production-Diagnostics/1.0",
        "X-Session-ID": `diag_${Date.now()}`,
        ...headers,
      },
      timeout: 15000,
    };

    const req = httpModule.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            parseError: e.message,
          });
        }
      });
    });

    req.on("error", (err) => {
      reject({
        error: err.message,
        code: err.code,
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject({
        error: "Request timeout after 15 seconds",
        code: "TIMEOUT",
      });
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runDiagnostics() {
  log("\n" + "=".repeat(80), "cyan");
  log("PRODUCTION DIAGNOSTICS", "cyan");
  log(`Testing: ${productionUrl}`, "blue");
  log("=".repeat(80) + "\n", "cyan");

  let passed = 0;
  let failed = 0;

  // Test 1: Canvas State Endpoint
  log("📋 TEST 1: Canvas State Endpoint", "yellow");
  try {
    const response = await makeRequest(
      `${productionUrl}/.netlify/functions/canvas-state`
    );
    
    if (response.status === 200) {
      log("   ✅ PASSED: Endpoint responds (HTTP 200)", "green");
      log(`   Initial state loaded:`, "blue");
      if (response.body.styleGuide) {
        log(`   - Conversation Language: ${response.body.styleGuide.conversationLanguage}`, "blue");
        log(`   - Current Phase: ${response.body.workflow?.currentPhase}`, "blue");
      }
      passed++;
    } else {
      log(`   ❌ FAILED: HTTP ${response.status}`, "red");
      log(`   Response: ${JSON.stringify(response.body).substring(0, 100)}`, "red");
      failed++;
    }
  } catch (error) {
    log(`   ❌ ERROR: ${error.error || error}`, "red");
    if (error.code === "ENOTFOUND") {
      log(`   → Host not found. Check URL: ${productionUrl}`, "red");
    } else if (error.code === "TIMEOUT") {
      log(`   → Request timed out. Netlify may be slow or down.`, "red");
    }
    failed++;
  }

  // Test 2: Conversation Endpoint
  log("\n📋 TEST 2: Conversation Endpoint (Initial)", "yellow");
  try {
    const response = await makeRequest(
      `${productionUrl}/.netlify/functions/conversation`,
      "POST",
      { message: "", history: [] }
    );

    if (response.status === 200) {
      log("   ✅ PASSED: Endpoint responds", "green");
      
      // Check for messages
      const messages = response.body.messages || [];
      if (messages.length > 0) {
        log(`   ✅ Got ${messages.length} message(s)`, "green");
        messages.forEach((msg, i) => {
          log(`   Message ${i + 1}: ${msg.agent?.name || "Unknown"} - "${msg.content.substring(0, 60)}..."`, "blue");
        });
      } else {
        log(`   ⚠️  No messages in response`, "yellow");
      }

      // Check for agent responses
      const agents = Object.keys(response.body.agentResponses || {});
      if (agents.length > 0) {
        log(`   ✅ Agents called: ${agents.join(", ")}`, "green");
        passed++;
      } else {
        log(`   ⚠️  No agents called`, "yellow");
        log(`   Check: Is OPENAI_API_KEY set on Netlify?`, "yellow");
        failed++;
      }

      // Check for errors in response
      if (response.body.error) {
        log(`   ❌ Error in response: ${response.body.error}`, "red");
        if (response.body.details) {
          log(`   Details: ${response.body.details}`, "red");
        }
        failed++;
      }
    } else {
      log(`   ❌ FAILED: HTTP ${response.status}`, "red");
      failed++;
    }
  } catch (error) {
    log(`   ❌ ERROR: ${error.error || error}`, "red");
    failed++;
  }

  // Test 3: Conversation with Name
  log("\n📋 TEST 3: Conversation with Input", "yellow");
  try {
    const response = await makeRequest(
      `${productionUrl}/.netlify/functions/conversation`,
      "POST",
      { message: "TestName", history: [] }
    );

    if (response.status === 200) {
      const agentIds = Object.keys(response.body.agentResponses || {});
      const hasState = agentIds.includes("state");
      const hasPrimary = agentIds.includes("primary");

      if (hasPrimary && hasState) {
        log(`   ✅ PASSED: Both Primary and State agents responded`, "green");
        passed++;
      } else {
        log(`   ⚠️  Agents: ${agentIds.join(", ")}`, "yellow");
        if (!hasPrimary) log(`   Missing: Primary agent`, "yellow");
        if (!hasState) log(`   Missing: State agent`, "yellow");
        failed++;
      }
    } else {
      log(`   ❌ FAILED: HTTP ${response.status}`, "red");
      failed++;
    }
  } catch (error) {
    log(`   ❌ ERROR: ${error.error || error}`, "red");
    failed++;
  }

  // Test 4: CORS Headers
  log("\n📋 TEST 4: CORS Headers", "yellow");
  try {
    const response = await makeRequest(
      `${productionUrl}/.netlify/functions/conversation`,
      "OPTIONS"
    );

    const corsHeader = response.headers["access-control-allow-origin"];
    if (corsHeader) {
      log(`   ✅ PASSED: CORS enabled (${corsHeader})`, "green");
      passed++;
    } else {
      log(`   ⚠️  No CORS header found`, "yellow");
      log(`   The frontend may have issues communicating`, "yellow");
      failed++;
    }
  } catch (error) {
    log(`   ℹ️  CORS test inconclusive: ${error.error}`, "blue");
  }

  // Test 5: Response Structure
  log("\n📋 TEST 5: Response Structure", "yellow");
  try {
    const response = await makeRequest(
      `${productionUrl}/.netlify/functions/conversation`,
      "POST",
      { message: "Quick test", history: [] }
    );

    const hasMessages = Array.isArray(response.body.messages);
    const hasSuggestions = Array.isArray(response.body.suggestions);
    const hasConversationHistory = Array.isArray(response.body.conversationHistory);
    const hasAgentResponses = response.body.agentResponses;
    const hasCanvasState = response.body.canvasState;

    if (hasMessages && hasSuggestions && hasConversationHistory && hasAgentResponses && hasCanvasState) {
      log(`   ✅ PASSED: All expected fields present`, "green");
      passed++;
    } else {
      log(`   ⚠️  Missing fields:`, "yellow");
      if (!hasMessages) log(`   - messages`, "yellow");
      if (!hasSuggestions) log(`   - suggestions`, "yellow");
      if (!hasConversationHistory) log(`   - conversationHistory`, "yellow");
      if (!hasAgentResponses) log(`   - agentResponses`, "yellow");
      if (!hasCanvasState) log(`   - canvasState`, "yellow");
      failed++;
    }
  } catch (error) {
    log(`   ❌ ERROR: ${error.error || error}`, "red");
    failed++;
  }

  // Summary
  log("\n" + "=".repeat(80), "cyan");
  log("DIAGNOSTICS SUMMARY", "cyan");
  log("=".repeat(80), "cyan");

  const total = passed + failed;
  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

  log(`Passed: ${passed}/${total} (${percentage}%)`, passed === total ? "green" : "yellow");

  if (passed === total) {
    log("\n✅ PRODUCTION DEPLOYMENT LOOKS GOOD!", "green");
    log("Agents are responding correctly.", "green");
  } else {
    log("\n⚠️  POTENTIAL ISSUES DETECTED", "yellow");
    log("\nTroubleshooting:", "blue");
    log("1. Check Netlify environment variables:", "blue");
    log("   - OPENAI_API_KEY must be set", "blue");
    log("   - OPENAI_MODEL defaults to gpt-4o-mini", "blue");
    log("2. Check Netlify logs:", "blue");
    log("   - Go to Netlify Dashboard → Functions → Logs", "blue");
    log("3. Verify deployment:", "blue");
    log("   - Latest code is deployed", "blue");
    log("   - Build logs show no errors", "blue");
    log("4. Test local first:", "blue");
    log("   - Run: npm run dev:netlify", "blue");
    log("   - Compare local vs production behavior", "blue");
  }

  log("\n");
  process.exit(failed > 0 ? 1 : 0);
}

// Run diagnostics
runDiagnostics().catch((error) => {
  log(`\nFatal error: ${error.message}`, "red");
  process.exit(1);
});

