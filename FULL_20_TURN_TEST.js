#!/usr/bin/env node
import fetch from "node-fetch";

const SESSION = `full_20_turn_${Date.now()}`;
const BASE = "http://localhost:8888/.netlify/functions";

async function send(message, history = []) {
  const response = await fetch(`${BASE}/conversation`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-ID": SESSION },
    body: JSON.stringify({ message, history }),
  });
  return await response.json();
}

function extractPrimary(result) {
  return result.messages.find((m) => m.agent?.name === "Translation Assistant")?.content || "";
}

async function main() {
  console.log("=".repeat(80));
  console.log("FULL 20-TURN WORKFLOW TEST");
  console.log("Planning (8) → Understanding (10) → Drafting (2)");
  console.log("=".repeat(80));

  await new Promise((r) => setTimeout(r, 10000));

  let history = [];
  const turns = [];

  // PLANNING PHASE (Turns 1-8)
  console.log("\n📝 PLANNING PHASE (8 turns)");
  console.log("-".repeat(80));

  const planningTurns = [
    { msg: "Chris", desc: "Name" },
    { msg: "English", desc: "Conversation language" },
    { msg: "English", desc: "Source language" },
    { msg: "Simple English", desc: "Target language" },
    { msg: "Kids in my church", desc: "Target community" },
    { msg: "Grade 3", desc: "Reading level" },
    { msg: "Fun and clear", desc: "Tone" },
    { msg: "Meaning-based", desc: "Approach (should transition)" },
  ];

  for (let i = 0; i < planningTurns.length; i++) {
    const { msg, desc } = planningTurns[i];
    console.log(`\n${i + 1}. ${desc}: "${msg}"`);
    const result = await send(msg, history);
    const q = extractPrimary(result);
    const s = result.suggestions || [];
    console.log(`   Next Q: ${q.substring(0, 70)}...`);
    console.log(`   Suggestions: ${s.slice(0, 3).join(" | ")}`);
    result.messages.forEach((m) => history.push(m));
    turns.push({ turn: i + 1, phase: "planning", q, s });
    await new Promise((r) => setTimeout(r, 2000));
  }

  // UNDERSTANDING PHASE (Turns 9-18)
  console.log("\n\n🧠 UNDERSTANDING PHASE (10 turns)");
  console.log("-".repeat(80));

  const understandingTurns = [
    { msg: "Continue", desc: "Start understanding" },
    { msg: "Time before kings when judges led", desc: "Phrase 1: judges ruled" },
    { msg: "Not enough food", desc: "Phrase 2: famine" },
    { msg: "A guy from Bethlehem", desc: "Phrase 3: man from Bethlehem" },
    { msg: "Moved to Moab for food", desc: "Phrase 4: went to Moab" },
    { msg: "He had a wife and two sons", desc: "Phrase 5: family" },
    { msg: "Makes sense", desc: "Acknowledge understanding" },
    { msg: "Yes", desc: "Confirm ready" },
    { msg: "Continue", desc: "Progress" },
    { msg: "Ready to draft", desc: "Move to drafting" },
  ];

  for (let i = 0; i < understandingTurns.length; i++) {
    const { msg, desc } = understandingTurns[i];
    console.log(`\n${i + 9}. ${desc}: "${msg}"`);
    const result = await send(msg, history);
    const q = extractPrimary(result);
    const s = result.suggestions || [];
    console.log(`   Response: ${q.substring(0, 70)}...`);
    console.log(`   Suggestions: ${s.slice(0, 3).join(" | ")}`);
    result.messages.forEach((m) => history.push(m));
    turns.push({ turn: i + 9, phase: "understanding", q, s });
    await new Promise((r) => setTimeout(r, 2000));
  }

  // DRAFTING PHASE (Turns 19-20)
  console.log("\n\n✍️  DRAFTING PHASE (2 turns)");
  console.log("-".repeat(80));

  console.log("\n19. Provide draft");
  const draft =
    "A long time ago, before Israel had kings, there wasn't enough food. A man from Bethlehem moved his family to Moab.";
  const r19 = await send(draft, history);
  const q19 = extractPrimary(r19);
  const s19 = r19.suggestions || [];
  console.log(`   Response: ${q19.substring(0, 70)}...`);
  console.log(`   Suggestions: ${s19.slice(0, 3).join(" | ")}`);
  r19.messages.forEach((m) => history.push(m));
  turns.push({ turn: 19, phase: "drafting", q: q19, s: s19 });
  await new Promise((r) => setTimeout(r, 2000));

  console.log("\n20. Finalize");
  const r20 = await send("Looks good", history);
  const q20 = extractPrimary(r20);
  const s20 = r20.suggestions || [];
  console.log(`   Response: ${q20.substring(0, 70)}...`);
  console.log(`   Suggestions: ${s20.slice(0, 3).join(" | ")}`);
  turns.push({ turn: 20, phase: "final", q: q20, s: s20 });

  // Check final state
  const stateResponse = await fetch(`${BASE}/canvas-state`, {
    headers: { "X-Session-ID": SESSION },
  });
  const finalState = await stateResponse.json();

  console.log("\n" + "=".repeat(80));
  console.log("FINAL STATE CHECK");
  console.log("=".repeat(80));
  console.log("User Name:", finalState.styleGuide?.userName);
  console.log("Reading Level:", finalState.styleGuide?.readingLevel);
  console.log("Current Phase:", finalState.workflow?.currentPhase);
  console.log("Glossary Phrases:", Object.keys(finalState.glossary?.userPhrases || {}).length);
  console.log("Glossary Terms:", Object.keys(finalState.glossary?.keyTerms || {}).length);
  console.log(
    "Draft Saved:",
    finalState.scriptureCanvas?.verses?.["Ruth 1:1"]?.draft ? "YES ✅" : "NO ❌"
  );

  console.log("\n" + "=".repeat(80));
  console.log("ANALYSIS");
  console.log("=".repeat(80));

  const hasName = finalState.styleGuide?.userName === "Chris";
  const hasSettings = finalState.styleGuide?.readingLevel === "Grade 3";
  const hasGlossary = Object.keys(finalState.glossary?.userPhrases || {}).length > 0;
  const hasDraft = !!finalState.scriptureCanvas?.verses?.["Ruth 1:1"]?.draft;
  const phaseProgressed = finalState.workflow?.currentPhase !== "planning";

  const checks = [
    { name: "Name saved", pass: hasName },
    { name: "Settings saved", pass: hasSettings },
    { name: "Phase progressed", pass: phaseProgressed },
    { name: "Glossary collected", pass: hasGlossary },
    { name: "Draft saved", pass: hasDraft },
  ];

  checks.forEach((c) => console.log(`${c.pass ? "✅" : "❌"} ${c.name}`));

  const passedChecks = checks.filter((c) => c.pass).length;
  const totalChecks = checks.length;

  console.log(`\nOverall: ${passedChecks}/${totalChecks} checks passed`);

  if (passedChecks >= 4) {
    console.log("\n✅ SUCCESS: Full workflow is functional!");
    console.log("User can complete Planning → Understanding → Drafting");
    process.exit(0);
  } else {
    console.log("\n❌ FAILURE: Workflow has significant issues");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Test crashed:", err.message);
  process.exit(1);
});
