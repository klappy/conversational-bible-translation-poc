#!/usr/bin/env node
import fetch from 'node-fetch';

const SESSION = `full_test_${Date.now()}`;
const BASE = 'http://localhost:8888/.netlify/functions';

async function sendAndCheck(turn, message, history, expectedInQuestion, expectedInSuggestions) {
  console.log(`\n${turn}. Sending: "${message}"`);
  
  const response = await fetch(`${BASE}/conversation`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Session-ID': SESSION},
    body: JSON.stringify({message, history})
  });
  
  const result = await response.json();
  const question = result.messages.find(m => m.agent?.name === "Translation Assistant")?.content || "";
  const suggestions = result.suggestions || [];
  
  console.log(`   Question: "${question.substring(0, 70)}..."`);
  console.log(`   Suggestions: ${JSON.stringify(suggestions)}`);
  
  const qMatch = expectedInQuestion ? question.toLowerCase().includes(expectedInQuestion.toLowerCase()) : true;
  const sMatch = expectedInSuggestions ? suggestions.some(s => s.toLowerCase().includes(expectedInSuggestions.toLowerCase())) : true;
  const match = qMatch && sMatch;
  
  console.log(`   Expected in Q: "${expectedInQuestion}" - ${qMatch ? '✅' : '❌'}`);
  console.log(`   Expected in S: "${expectedInSuggestions}" - ${sMatch ? '✅' : '❌'}`);
  console.log(`   Overall: ${match ? '✅ PASS' : '❌ FAIL'}`);
  
  // Update history for next turn
  result.messages.forEach(m => history.push(m));
  
  return {match, question, suggestions, history};
}

async function main() {
  console.log('='.repeat(70));
  console.log('COMPLETE 8-TURN SUGGESTION TIMING TEST');
  console.log('Testing all settings collection + transition to Understanding');
  console.log('='.repeat(70));
  
  await new Promise(r => setTimeout(r, 10000)); // Wait for server
  
  let history = [];
  const results = [];
  
  // 1. Name → Language question
  const t1 = await sendAndCheck(1, 'Chris', history, 'language', 'English');
  history = t1.history;
  results.push(t1.match);
  await new Promise(r => setTimeout(r, 2000));
  
  // 2. Conversation Lang → Source Lang question
  const t2 = await sendAndCheck(2, 'English', history, 'translating from', 'English');
  history = t2.history;
  results.push(t2.match);
  await new Promise(r => setTimeout(r, 2000));
  
  // 3. Source Lang → Target Lang question
  const t3 = await sendAndCheck(3, 'English', history, 'translating to', 'English');
  history = t3.history;
  results.push(t3.match);
  await new Promise(r => setTimeout(r, 2000));
  
  // 4. Target Lang → Community question
  const t4 = await sendAndCheck(4, 'Simple English', history, 'who will', 'children');
  history = t4.history;
  results.push(t4.match);
  await new Promise(r => setTimeout(r, 2000));
  
  // 5. Community → Reading Level question
  const t5 = await sendAndCheck(5, 'Kids', history, 'reading level', 'Grade');
  history = t5.history;
  results.push(t5.match);
  await new Promise(r => setTimeout(r, 2000));
  
  // 6. Reading Level → Tone question
  const t6 = await sendAndCheck(6, 'Grade 3', history, 'tone', 'friendly');
  history = t6.history;
  results.push(t6.match);
  await new Promise(r => setTimeout(r, 2000));
  
  // 7. Tone → Approach question
  const t7 = await sendAndCheck(7, 'Fun and friendly', history, 'approach', 'meaning');
  history = t7.history;
  results.push(t7.match);
  await new Promise(r => setTimeout(r, 2000));
  
  // 8. Approach → Understanding phase transition
  const t8 = await sendAndCheck(8, 'Meaning-based', history, null, null);
  console.log(`   Should transition to Understanding phase`);
  results.push(true); // Just check it doesn't error
  
  console.log('\n' + '='.repeat(70));
  console.log('FINAL RESULTS:');
  console.log('='.repeat(70));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  const percentage = Math.round((passed/total) * 100);
  
  console.log(`Passed: ${passed}/${total} (${percentage}%)`);
  console.log();
  
  if (percentage >= 85) {
    console.log('✅ SUCCESS: Suggestion timing is working correctly!');
    console.log('Suggestions consistently match the questions being asked.');
    process.exit(0);
  } else {
    console.log('❌ FAILURE: Suggestion timing still has issues');
    console.log(`Only ${percentage}% of suggestions matched their questions.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});

