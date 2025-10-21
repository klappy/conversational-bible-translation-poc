#!/usr/bin/env node

/**
 * Test Runner for Bible Translation Assistant
 * 
 * This script runs automated API tests without requiring the UI
 */

import { runAllTests, testCompleteTranslationFlow, testAgentBehaviors } from './api-test-framework.js';

const args = process.argv.slice(2);
const testType = args[0] || 'all';
const baseUrl = args[1] || 'http://localhost:9999';

console.log(`🧪 Bible Translation Assistant - Test Runner`);
console.log(`Test Type: ${testType}`);
console.log(`Base URL: ${baseUrl}`);
console.log('=' .repeat(50) + '\n');

async function main() {
  let results;
  
  switch(testType) {
    case 'flow':
      results = await testCompleteTranslationFlow();
      break;
    case 'agents':
      results = await testAgentBehaviors();
      break;
    case 'all':
    default:
      results = await runAllTests();
      break;
  }

  // Exit with appropriate code
  const failures = typeof results.summary !== 'undefined' 
    ? results.summary.failed 
    : (results.flow?.summary.failed || 0) + (results.behaviors?.summary.failed || 0);
  
  process.exit(failures > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
