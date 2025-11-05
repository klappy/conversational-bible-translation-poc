#!/usr/bin/env node

/**
 * AGENT SILENCE DIAGNOSTICS
 * 
 * Simulates the exact flow that's failing:
 * 1. Initial greeting (works)
 * 2. User sends name (agents collaborate but return nothing)
 * 3. Check what's actually happening
 * 
 * Run with: node test/diagnose-agent-silence.js [production-url]
 * 
 * Examples:
 * - node test/diagnose-agent-silence.js (uses PRODUCTION_URL env var)
 * - node test/diagnose-agent-silence.js https://your-site.netlify.app
 */

import https from "https";

const productionUrl = process.argv[2] || process.env.PRODUCTION_URL || "https://conversational-bible-translation.netlify.app";
const sessionId = `diag_agent_silence_${Date.now()}`;

const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  reset: "\x1b[0m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Agent-Silence-Diagnostics/1.0",
        "X-Session-ID": sessionId,
      },
      timeout: 45000,
    };

    const req = https.request(options, (res) => {
      let data = "";
      let startTime = Date.now();
      
      res.on("data", (chunk) => {
        data += chunk;
      });
      
      res.on("end", () => {
        const duration = Date.now() - startTime;
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            duration,
            body: parsed,
            hasMessages: !!parsed.messages,
            messageCount: parsed.messages?.length || 0,
            hasAgentResponses: !!parsed.agentResponses,
            agentCount: Object.keys(parsed.agentResponses || {}).length,
            agents: Object.keys(parsed.agentResponses || {}),
            hasError: !!parsed.error,
            error: parsed.error,
            details: parsed.details,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            duration,
            body: data,
            parseError: e.message,
          });
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject({
        error: "Request timeout",
        code: "TIMEOUT",
      });
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runDiagnostics() {
  log("\n" + "=".repeat(80), "cyan");
  log("AGENT SILENCE DIAGNOSTICS", "cyan");
  log(`Testing: ${productionUrl}`, "blue");
  log(`Session: ${sessionId}`, "gray");
  log("=".repeat(80) + "\n", "cyan");

  // Test 1: Initial greeting
  log("📝 TEST 1: Initial Greeting (Should Work)", "yellow");
  log("Sending empty message to trigger greeting...\n", "gray");
  
  let response1;
  try {
    const startTime = Date.now();
    response1 = await makeRequest(
      `${productionUrl}/.netlify/functions/conversation`,
      "POST",
      { message: "", history: [] }
    );
    const duration = response1.duration;
    
    log(`✅ Response received in ${duration}ms`, "green");
    
    if (response1.status === 200) {
      log(`✅ HTTP 200`, "green");
      log(`✅ Messages returned: ${response1.messageCount}`, response1.messageCount > 0 ? "green" : "yellow");
      log(`✅ Agents called: ${response1.agents.join(", ")}`, "green");
      
      if (response1.body.messages && response1.body.messages.length > 0) {
        const msg = response1.body.messages[0];
        log(`📖 Message: "${msg.content.substring(0, 80)}..."`, "blue");
      }
    } else {
      log(`❌ HTTP ${response1.status}`, "red");
    }
  } catch (error) {
    log(`❌ ERROR: ${error.error || error}`, "red");
    process.exit(1);
  }

  // Test 2: Send name (THIS IS WHERE IT FAILS)
  log("\n" + "-".repeat(80) + "\n", "gray");
  log("📝 TEST 2: User Sends Name (Where Silence Happens)", "yellow");
  log("Sending 'TestName' as user input...\n", "gray");

  let response2;
  try {
    const startTime = Date.now();
    response2 = await makeRequest(
      `${productionUrl}/.netlify/functions/conversation`,
      "POST",
      { message: "TestName", history: [] }
    );
    const duration = response2.duration;

    log(`✅ Response received in ${duration}ms`, "green");

    if (response2.status === 200) {
      log(`✅ HTTP 200`, "green");

      // Check for agents
      if (response2.agentCount > 0) {
        log(`✅ Agents called: ${response2.agents.join(", ")}`, "green");
      } else {
        log(`❌ NO AGENTS CALLED!`, "red");
        log(`This is the problem! No agents responded.`, "red");
      }

      // Check for messages
      if (response2.messageCount > 0) {
        log(`✅ Messages returned: ${response2.messageCount}`, "green");
        response2.body.messages.forEach((msg, i) => {
          log(`   Message ${i + 1}: ${msg.agent?.name || "Unknown"} - "${msg.content.substring(0, 60)}..."`, "blue");
        });
      } else {
        log(`❌ NO MESSAGES RETURNED!`, "red");
        log(`Agents were called but returned no messages.`, "red");
        
        if (response2.body.agentResponses) {
          log(`\nAgent responses received:`, "yellow");
          Object.entries(response2.body.agentResponses).forEach(([agent, info]) => {
            log(`  - ${agent}: ${info.timestamp}`, "blue");
          });
        }
      }

      // Check for errors
      if (response2.hasError) {
        log(`\n❌ ERROR in response:`, "red");
        log(`${response2.error}`, "red");
        if (response2.details) {
          log(`Details: ${response2.details}`, "red");
        }
      }

      // Check canvas state
      if (response2.body.canvasState) {
        log(`\nCanvas state updated:`, "blue");
        if (response2.body.canvasState.styleGuide?.userName) {
          log(`✅ Username saved: ${response2.body.canvasState.styleGuide.userName}`, "green");
        } else {
          log(`⚠️  Username NOT saved`, "yellow");
        }
      }

      // Check conversation history
      if (response2.body.conversationHistory && response2.body.conversationHistory.length > 0) {
        log(`✅ Conversation history stored: ${response2.body.conversationHistory.length} messages`, "green");
      } else {
        log(`⚠️  No conversation history`, "yellow");
      }
    } else {
      log(`❌ HTTP ${response2.status}`, "red");
    }
  } catch (error) {
    log(`❌ ERROR: ${error.error || error}`, "red");
    if (error.code === "TIMEOUT") {
      log(`\n🔴 REQUEST TIMEOUT!`, "red");
      log(`This is likely the issue: agents are taking >45 seconds to respond`, "red");
      log(`Check:`, "yellow");
      log(`  1. Netlify Function logs for slow operations`, "yellow");
      log(`  2. OpenAI API status (might be rate limiting)`, "yellow");
      log(`  3. Check if state persistence is hanging`, "yellow");
    }
  }

  // Analysis
  log("\n" + "=".repeat(80), "cyan");
  log("ANALYSIS", "cyan");
  log("=".repeat(80) + "\n", "cyan");

  if (!response2) {
    log("❌ Cannot complete analysis - second request failed", "red");
    process.exit(1);
  }

  if (response2.messageCount === 0 && response2.agentCount > 0) {
    log("🔴 THE ISSUE: Agents are called but return no messages", "red");
    log("\nLikely causes:", "yellow");
    log("1. Agent timeout - taking too long to respond", "yellow");
    log("2. OpenAI API rate limiting - too many requests", "yellow");
    log("3. State persistence failure - cascading error", "yellow");
    log("4. Silent error in agent code", "yellow");
    log("\nNext steps:", "blue");
    log("1. Check Netlify Function Logs:", "blue");
    log("   https://app.netlify.com/ → Your Site → Functions → conversation → Logs", "blue");
    log("2. Look for error messages or timeouts", "blue");
    log("3. Check if agents are timing out (30s timeout)", "blue");
    log("4. Check OpenAI API status/rate limits", "blue");
  } else if (response2.messageCount > 0) {
    log("✅ AGENTS ARE RESPONDING!", "green");
    log("The system is working correctly.", "green");
    log("\nIf you're still seeing silence in the UI:", "yellow");
    log("1. Check browser console (F12) for errors", "yellow");
    log("2. Check Network tab for failed requests", "yellow");
    log("3. Might be a frontend issue, not backend", "yellow");
  } else if (response2.agentCount === 0) {
    log("❌ NO AGENTS CALLED", "red");
    log("\nLikely causes:", "yellow");
    log("1. Orchestrator not recognizing the message", "yellow");
    log("2. Wrong workflow phase", "yellow");
    log("3. Error in agent initialization", "yellow");
    log("\nCheck Netlify logs for errors.", "blue");
  }

  // Detailed response dump
  log("\n" + "=".repeat(80), "cyan");
  log("DETAILED RESPONSE (Second Request)", "cyan");
  log("=".repeat(80) + "\n", "cyan");

  if (response2.body) {
    log("Response structure:", "blue");
    log(`- Messages: ${response2.body.messages ? response2.body.messages.length : 0}`, "gray");
    log(`- Suggestions: ${response2.body.suggestions ? response2.body.suggestions.length : 0}`, "gray");
    log(`- Agent Responses: ${Object.keys(response2.body.agentResponses || {}).length}`, "gray");
    log(`- Has Error: ${response2.hasError}`, response2.hasError ? "red" : "green");
    
    if (response2.hasError) {
      log("\n⚠️  Error found in response:", "red");
      log(`${response2.error}`, "red");
      if (response2.details) {
        log(`${response2.details}`, "red");
      }
    }
  }

  log("\n");
  process.exit(response2.messageCount > 0 ? 0 : 1);
}

runDiagnostics().catch((error) => {
  log(`\nFatal error: ${error.message}`, "red");
  process.exit(1);
});

