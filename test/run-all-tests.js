#!/usr/bin/env node

/**
 * MAIN TEST RUNNER
 * 
 * Runs all important tests for the Bible Translation POC
 * 
 * Usage:
 *   npm test           - Run all tests
 *   npm run test:quick - Run regression tests only
 *   npm run test:full  - Run complete workshop test
 *   npm run test:5verse - Run 5-verse comprehensive test
 *   npm run test:personas - Run multi-persona test
 *   npm run test:resume - Run session resumption test
 *   npm run test:complete - Run all comprehensive tests
 *   npm run test:report - Generate stage completion report
 */

import { spawn } from 'child_process';

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

function runTest(testFile, description) {
  return new Promise((resolve) => {
    log(`\n📋 Running ${description}...`, "cyan");
    
    const child = spawn('node', [testFile], { stdio: 'inherit' });
    
    child.on('close', (code) => {
      if (code === 0) {
        log(`✅ ${description} passed!`, "green");
        resolve(true);
      } else {
        log(`❌ ${description} failed!`, "red");
        resolve(false);
      }
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'all';
  
  log("\n" + "=".repeat(80), "blue");
  log("BIBLE TRANSLATION POC - TEST SUITE", "blue");
  log("=".repeat(80), "blue");
  
  let results = [];
  
  if (mode === 'quick' || mode === 'regression') {
    // Quick regression tests only
    const passed = await runTest('test/regression-test-suite.js', 'Regression Tests');
    results.push(passed);
  } else if (mode === 'full' || mode === 'workshop') {
    // Full workshop test only
    const passed = await runTest('test/workshop-flow-test.js', 'Workshop Flow Test');
    results.push(passed);
  } else if (mode === '5verse') {
    // 5-verse comprehensive test
    const passed = await runTest('test/complete-5-verse-workshop.js', '5-Verse Workshop Test');
    results.push(passed);
  } else if (mode === 'personas') {
    // Multi-persona test
    const passed = await runTest('test/multi-persona-spot-check.js', 'Multi-Persona Test');
    results.push(passed);
  } else if (mode === 'resume') {
    // Session resumption test
    const passed = await runTest('test/session-resumption-test.js', 'Session Resumption Test');
    results.push(passed);
  } else if (mode === 'complete') {
    // All comprehensive tests
    log("\nRunning all comprehensive tests...", "yellow");
    
    const regression = await runTest('test/regression-test-suite.js', 'Regression Tests');
    results.push(regression);
    
    const workshop = await runTest('test/workshop-flow-test.js', 'Workshop Flow Test');
    results.push(workshop);
    
    const fiveVerse = await runTest('test/complete-5-verse-workshop.js', '5-Verse Workshop Test');
    results.push(fiveVerse);
    
    const personas = await runTest('test/multi-persona-spot-check.js', 'Multi-Persona Test');
    results.push(personas);
    
    const resume = await runTest('test/session-resumption-test.js', 'Session Resumption Test');
    results.push(resume);
  } else if (mode === 'report') {
    // Generate stage completion report
    const passed = await runTest('test/stage-completion-report.js', 'Stage Completion Report');
    results.push(passed);
  } else {
    // Run all tests (default)
    log("\nRunning all tests...", "yellow");
    
    // First run regression tests (quick)
    const regression = await runTest('test/regression-test-suite.js', 'Regression Tests');
    results.push(regression);
    
    // Then run full workshop test (comprehensive)
    const workshop = await runTest('test/workshop-flow-test.js', 'Workshop Flow Test');
    results.push(workshop);
  }
  
  // Summary
  log("\n" + "=".repeat(80), "blue");
  log("FINAL RESULTS", "blue");
  log("=".repeat(80), "blue");
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  if (passed === total) {
    log(`\n✅ ALL TESTS PASSED (${passed}/${total})`, "green");
    log("Safe to deploy! 🚀", "green");
    process.exit(0);
  } else {
    log(`\n❌ SOME TESTS FAILED (${passed}/${total} passed)`, "red");
    log("Please fix issues before deploying.", "yellow");
    process.exit(1);
  }
}

// Run tests
main().catch(error => {
  log(`Fatal error: ${error.message}`, "red");
  process.exit(1);
});
