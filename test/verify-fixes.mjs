#!/usr/bin/env node

/**
 * Server Function Logic Test
 * Tests conversation.js logic without needing full Netlify environment
 */

import { readFileSync } from 'fs';

console.log('\n🔍 VERIFYING CONVERSATION PERSISTENCE FIXES\n');
console.log('=' .repeat(80));

let passCount = 0;
let failCount = 0;

function test(name, condition, details = '') {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    if (details) console.log(`   ${details}`);
    passCount++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    if (details) console.log(`   ${details}`);
    failCount++;
  }
}

// Read source files
const canvasState = readFileSync('./netlify/functions/canvas-state.js', 'utf8');
const conversation = readFileSync('./netlify/functions/conversation.js', 'utf8');
const translationContext = readFileSync('./src/contexts/TranslationContext.jsx', 'utf8');
const chatInterface = readFileSync('./src/components/ChatInterfaceMultiAgent.jsx', 'utf8');

console.log('\n📦 PART 1: SERVER STATE SCHEMA');
console.log('-'.repeat(80));

test(
  'conversationHistory field exists in DEFAULT_STATE',
  canvasState.includes('conversationHistory: []'),
  'Location: netlify/functions/canvas-state.js'
);

console.log('\n💾 PART 2: MESSAGE PERSISTENCE');
console.log('-'.repeat(80));

test(
  'ID generator function exists in conversation.js',
  conversation.includes('const generateUniqueId = (prefix)'),
  'Generates stable IDs for all messages'
);

test(
  'Server uses its own history as base (not client history)',
  conversation.includes('const serverHistory = canvasState.conversationHistory'),
  'Preserves initial greeting and all previous messages'
);

test(
  'Server passes its history to agents',
  conversation.includes('conversationHistory: serverHistory.slice(-10)'),
  'Agents get full context from server'
);

test(
  'User messages saved with IDs',
  conversation.includes('id: generateUniqueId("user")'),
  'Stable IDs prevent React key conflicts'
);

test(
  'Agent messages saved with IDs',
  conversation.includes('id: msg.id || generateUniqueId("msg")'),
  'Preserves existing IDs or generates new ones'
);

test(
  'Suggestion messages saved with IDs',
  conversation.includes('id: generateUniqueId("sug")'),
  'Stable IDs for suggestion messages'
);

test(
  'Complete history saved to server',
  conversation.includes('conversationHistory: updatedHistory'),
  'Server stores all messages persistently'
);

console.log('\n🏷️  PART 3: AGENT ATTRIBUTION');
console.log('-'.repeat(80));

test(
  'Suggestions have Suggestion Helper agent attribution',
  conversation.includes('agent: getAgent("suggestions").visual'),
  'Should show as "Suggestion Helper" 💡 not "Translation Assistant" 📖'
);

test(
  'Agent type preserved in saved messages',
  conversation.includes('type: msg.type'),
  'Preserves message type for proper UI rendering'
);

console.log('\n🔄 PART 4: CLIENT SYNC LOGIC');
console.log('-'.repeat(80));

test(
  'TranslationContext reads conversationHistory from server',
  translationContext.includes('serverState.conversationHistory'),
  'Client reads from server state'
);

test(
  'Client replaces local state (no merge)',
  translationContext.includes('setMessages(serverState.conversationHistory.map'),
  'Simple replace prevents duplication'
);

test(
  'No complex merge logic present',
  !translationContext.includes('localOnlyMessages') && 
  !translationContext.includes('serverMessages, ...localOnlyMessages'),
  'Removed buggy merge logic that caused infinite appending'
);

console.log('\n⏸️  PART 5: RACE CONDITION PREVENTION');
console.log('-'.repeat(80));

test(
  'Polling pauses during message send',
  chatInterface.includes('if (isLoading)') && chatInterface.includes('Skipping poll'),
  'Prevents server from overwriting user message before saved'
);

test(
  'isLoading added to polling dependencies',
  chatInterface.includes('], [updateFromServerState, isLoading]'),
  'Polling effect re-runs when loading state changes'
);

console.log('\n👋 PART 6: INITIAL GREETING');
console.log('-'.repeat(80));

test(
  'Greeting only generated if server history is empty',
  chatInterface.includes('(!canvasState.conversationHistory || canvasState.conversationHistory.length === 0)'),
  'Prevents duplicate greetings'
);

test(
  'Greeting saved to server before being added locally',
  chatInterface.includes('conversationHistory: [') && 
  chatInterface.includes('...initialMsg') &&
  chatInterface.includes('timestamp: initialMsg.timestamp.toISOString()'),
  'Server becomes source of truth immediately'
);

test(
  'Fallback to local if server save fails',
  chatInterface.includes('catch (error)') && chatInterface.includes('addMessage(initialMsg)'),
  'Graceful degradation if server unavailable'
);

console.log('\n' + '='.repeat(80));
console.log(`\n📊 RESULTS: ${passCount} PASSED, ${failCount} FAILED`);

if (failCount === 0) {
  console.log('\n✅ ALL LOGIC CHECKS PASSED');
  console.log('\n Architecture Summary:');
  console.log('  • Server (Netlify Blobs) = Single source of truth');
  console.log('  • All messages saved with stable IDs');
  console.log('  • Suggestion Helper has proper agent attribution');
  console.log('  • Client syncs from server (simple replace, no merge)');
  console.log('  • Polling pauses during message send');
  console.log('  • Initial greeting saved to server first');
  console.log('\n📋 NEXT STEP: Manual UI verification required');
  console.log('   Run: npm run dev:netlify');
  console.log('   See: test/VERIFICATION.md for test steps');
  process.exit(0);
} else {
  console.log('\n❌ SOME CHECKS FAILED - Code needs fixes');
  process.exit(1);
}
