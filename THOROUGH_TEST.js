#!/usr/bin/env node

const SESSION = `thorough_${Date.now()}`;
const BASE = "http://localhost:8888/.netlify/functions";

async function test() {
  console.log("THOROUGH MULTI-TURN SUGGESTION TEST");
  console.log("=".repeat(60));

  let history = [];
  const results = [];

  // Turn 1
  console.log("\nTurn 1: Provide name");
  const r1 = await (
    await fetch(`${BASE}/conversation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-ID": SESSION },
      body: JSON.stringify({ message: "Bob", history }),
    })
  ).json();

  const q1 = r1.messages.find((m) => m.agent?.name === "Translation Assistant")?.content || "";
  const s1 = r1.suggestions || [];
  console.log(`Question: "${q1.substring(0, 80)}"`);
  console.log(`Suggestions: ${JSON.stringify(s1)}`);
  const match1 =
    q1.toLowerCase().includes("language") &&
    s1.some((s) => s.toLowerCase().includes("english") || s.toLowerCase().includes("spanish"));
  console.log(`Match: ${match1 ? "✅ YES" : "❌ NO - suggestions should be languages"}`);
  results.push({ turn: 1, match: match1, q: q1.substring(0, 40), s: s1 });

  // Update history
  r1.messages.forEach((m) => history.push(m));

  await new Promise((r) => setTimeout(r, 2000));

  // Turn 2
  console.log("\nTurn 2: Provide language");
  const r2 = await (
    await fetch(`${BASE}/conversation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-ID": SESSION },
      body: JSON.stringify({ message: "English", history }),
    })
  ).json();

  const q2 = r2.messages.find((m) => m.agent?.name === "Translation Assistant")?.content || "";
  const s2 = r2.suggestions || [];
  console.log(`Question: "${q2.substring(0, 80)}"`);
  console.log(`Suggestions: ${JSON.stringify(s2)}`);
  const match2 = s2.some(
    (s) =>
      s.toLowerCase().includes("english") ||
      s.toLowerCase().includes("spanish") ||
      s.toLowerCase().includes("language")
  );
  console.log(`Match: ${match2 ? "✅ YES" : "❌ NO - suggestions should be languages"}`);
  results.push({ turn: 2, match: match2, q: q2.substring(0, 40), s: s2 });

  r2.messages.forEach((m) => history.push(m));

  await new Promise((r) => setTimeout(r, 2000));

  // Turn 3
  console.log("\nTurn 3: Another setting");
  const r3 = await (
    await fetch(`${BASE}/conversation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-ID": SESSION },
      body: JSON.stringify({ message: "Spanish", history }),
    })
  ).json();

  const q3 = r3.messages.find((m) => m.agent?.name === "Translation Assistant")?.content || "";
  const s3 = r3.suggestions || [];
  console.log(`Question: "${q3.substring(0, 80)}"`);
  console.log(`Suggestions: ${JSON.stringify(s3)}`);
  results.push({ turn: 3, q: q3.substring(0, 40), s: s3 });

  console.log("\n" + "=".repeat(60));
  console.log("FINAL RESULTS:");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.match !== false).length;
  console.log(`Passed: ${passed}/${results.length}`);

  if (passed >= 2) {
    console.log("\n✅ SUGGESTION TIMING IS WORKING");
    console.log("Suggestions are contextual to questions being asked");
  } else {
    console.log("\n❌ STILL BROKEN");
    console.log("Suggestions do not match questions");
  }

  process.exit(passed >= 2 ? 0 : 1);
}

test().catch((err) => {
  console.error("Test failed:", err.message);
  process.exit(1);
});
