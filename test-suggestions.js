#!/usr/bin/env node

/**
 * Test suggestion timing across multiple conversation turns
 */

const SESSION = `test_suggestions_${Date.now()}`;
const BASE_URL = "http://localhost:8888/.netlify/functions";

async function makeRequest(message, history = []) {
  const response = await fetch(`${BASE_URL}/conversation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": SESSION,
    },
    body: JSON.stringify({ message, history }),
  });
  return await response.json();
}

function extractQuestion(messages) {
  const primary = messages.find((m) => m.agent?.name === "Translation Assistant");
  return primary?.content || "";
}

function checkMatch(question, suggestions) {
  const q = question.toLowerCase();
  const s = suggestions.join(" ").toLowerCase();

  // Check various question types
  if (q.includes("language") && (s.includes("english") || s.includes("spanish"))) return true;
  if (q.includes("reading level") && (s.includes("grade") || s.includes("level"))) return true;
  if (
    q.includes("tone") &&
    (s.includes("tone") || s.includes("formal") || s.includes("conversational"))
  )
    return true;
  if (
    q.includes("community") &&
    (s.includes("children") || s.includes("teens") || s.includes("adults"))
  )
    return true;
  if (q.includes("approach") && (s.includes("meaning") || s.includes("word-for-word"))) return true;

  return false;
}

async function runTest() {
  console.log("=".repeat(60));
  console.log("COMPREHENSIVE SUGGESTION TIMING TEST");
  console.log("=".repeat(60));
  console.log();

  await new Promise((resolve) => setTimeout(resolve, 12000)); // Wait for server

  const tests = [];

  // Test 1: Name → Language question
  console.log("Test 1: Name collection...");
  const r1 = await makeRequest("Maria");
  const q1 = extractQuestion(r1.messages);
  const s1 = r1.suggestions || [];
  const match1 = checkMatch(q1, s1);
  console.log(`  Question: ${q1.substring(0, 60)}...`);
  console.log(`  Suggestions: ${s1.join(", ")}`);
  console.log(`  Match: ${match1 ? "✅" : "❌"}`);
  tests.push({ name: "Name→Language", match: match1 });
  console.log();

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 2: Language → Source Language
  console.log("Test 2: Conversation language...");
  const r2 = await makeRequest("English");
  const q2 = extractQuestion(r2.messages);
  const s2 = r2.suggestions || [];
  const match2 = checkMatch(q2, s2);
  console.log(`  Question: ${q2.substring(0, 60)}...`);
  console.log(`  Suggestions: ${s2.join(", ")}`);
  console.log(`  Match: ${match2 ? "✅" : "❌"}`);
  tests.push({ name: "Language→Source", match: match2 });
  console.log();

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 3: Source → Target
  console.log("Test 3: Source language...");
  const r3 = await makeRequest("English");
  const q3 = extractQuestion(r3.messages);
  const s3 = r3.suggestions || [];
  const match3 = checkMatch(q3, s3);
  console.log(`  Question: ${q3.substring(0, 60)}...`);
  console.log(`  Suggestions: ${s3.join(", ")}`);
  console.log(`  Match: ${match3 ? "✅" : "❌"}`);
  tests.push({ name: "Source→Target", match: match3 });
  console.log();

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 4: Target → Community
  console.log("Test 4: Target language...");
  const r4 = await makeRequest("Simple English");
  const q4 = extractQuestion(r4.messages);
  const s4 = r4.suggestions || [];
  const match4 = checkMatch(q4, s4);
  console.log(`  Question: ${q4.substring(0, 60)}...`);
  console.log(`  Suggestions: ${s4.join(", ")}`);
  console.log(`  Match: ${match4 ? "✅" : "❌"}`);
  tests.push({ name: "Target→Community", match: match4 });
  console.log();

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 5: Community → Reading Level
  console.log("Test 5: Target community...");
  const r5 = await makeRequest("Teenagers");
  const q5 = extractQuestion(r5.messages);
  const s5 = r5.suggestions || [];
  const match5 = checkMatch(q5, s5);
  console.log(`  Question: ${q5.substring(0, 60)}...`);
  console.log(`  Suggestions: ${s5.join(", ")}`);
  console.log(`  Match: ${match5 ? "✅" : "❌"}`);
  tests.push({ name: "Community→ReadingLevel", match: match5 });
  console.log();

  console.log("=".repeat(60));
  console.log("RESULTS:");
  console.log("=".repeat(60));
  const passed = tests.filter((t) => t.match).length;
  const total = tests.length;
  console.log(`Passed: ${passed}/${total}`);
  tests.forEach((t) => {
    console.log(`  ${t.match ? "✅" : "❌"} ${t.name}`);
  });
  console.log();

  if (passed === total) {
    console.log("✅ SUCCESS: All suggestions match their questions!");
    process.exit(0);
  } else {
    console.log("❌ FAILURE: Suggestions still delayed/mismatched");
    process.exit(1);
  }
}

runTest().catch(console.error);
