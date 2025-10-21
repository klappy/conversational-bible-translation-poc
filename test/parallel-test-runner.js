/**
 * Parallel Test Runner for Bible Translation Assistant
 * 
 * Runs multiple test personas simultaneously to speed up testing
 * and tests both quick response and manual typing modes.
 */

import fetch from "node-fetch";
import { IntelligentWorkshopAttendee } from "./intelligent-conversation-tester.js";

/**
 * Enhanced test persona that can specify interaction mode
 */
class TestPersona extends IntelligentWorkshopAttendee {
  constructor(baseUrl, persona, interactionMode = 'mixed') {
    super(baseUrl, persona);
    this.interactionMode = interactionMode; // 'suggestions', 'manual', 'mixed'
    this.suggestionsUsed = [];
    this.manualResponsesUsed = [];
  }

  /**
   * Override response generation to respect interaction mode
   */
  async generateNextResponse() {
    const lastMessage = this.getLastAssistantMessage();
    if (!lastMessage) return null;

    const content = lastMessage.content.toLowerCase();
    const suggestions = this.getLastSuggestions();

    // Determine if we should use suggestions based on mode
    const shouldUseSuggestion = this.shouldUseSuggestion(suggestions);

    if (shouldUseSuggestion && suggestions && suggestions.length > 0) {
      // Track which suggestions we use
      const selected = this.selectFromSuggestions(suggestions);
      if (selected) {
        this.suggestionsUsed.push({
          available: suggestions,
          selected: selected,
          context: content.substring(0, 50) + '...'
        });
        return selected;
      }
    }

    // Generate manual response
    const manualResponse = await this.generateManualResponse(content);
    if (manualResponse) {
      this.manualResponsesUsed.push({
        response: manualResponse,
        context: content.substring(0, 50) + '...'
      });
    }
    return manualResponse;
  }

  /**
   * Determine if we should use a suggestion based on interaction mode
   */
  shouldUseSuggestion(suggestions) {
    if (!suggestions || suggestions.length === 0) return false;

    switch (this.interactionMode) {
      case 'suggestions':
        // Always use suggestions when available
        return true;
      
      case 'manual':
        // Never use suggestions
        return false;
      
      case 'mixed':
      default:
        // Use suggestions 50% of the time
        return Math.random() > 0.5;
    }
  }

  /**
   * Generate manual typed response based on context
   */
  async generateManualResponse(content) {
    // Language questions
    if (content.includes("language") && content.includes("conversation")) {
      return this.getManualLanguageResponse('conversation');
    }

    if (content.includes("translating from") || content.includes("source language")) {
      return this.getManualLanguageResponse('source');
    }

    if (content.includes("translating to") || content.includes("target language")) {
      return this.getManualLanguageResponse('target');
    }

    // Community/audience
    if (content.includes("who will be reading") || content.includes("audience")) {
      return this.getManualCommunityResponse();
    }

    // Reading level
    if (content.includes("reading level") || content.includes("grade")) {
      return this.getManualReadingLevelResponse();
    }

    // Tone
    if (content.includes("tone") || content.includes("style")) {
      return this.getManualToneResponse();
    }

    // Approach
    if (content.includes("approach") || content.includes("word-for-word")) {
      return this.getManualApproachResponse();
    }

    // Scripture understanding
    if (content.includes("ruth 1:1") || content.includes("here is the text")) {
      return this.respondToScripturePresentation();
    }

    // Draft request
    if (content.includes("draft") || content.includes("translate") || content.includes("ready to draft")) {
      return this.provideDraft();
    }

    // Understanding check
    if (content.includes("understand") || content.includes("make sense")) {
      return "Yes, I understand that. Let's continue.";
    }

    return null;
  }

  /**
   * Get manual responses for different contexts
   */
  getManualLanguageResponse(type) {
    const pref = this.currentPersona.preferences;
    const variations = {
      conversation: [
        pref.conversationLanguage,
        `I'd like to use ${pref.conversationLanguage}`,
        `${pref.conversationLanguage} please`,
        `Let's use ${pref.conversationLanguage} for our conversation`
      ],
      source: [
        pref.sourceLanguage,
        `We're translating from ${pref.sourceLanguage}`,
        `The source is ${pref.sourceLanguage}`,
        `${pref.sourceLanguage} is the original language`
      ],
      target: [
        pref.targetLanguage,
        `We're translating to ${pref.targetLanguage}`,
        `The target is ${pref.targetLanguage}`,
        `We need it in ${pref.targetLanguage}`
      ]
    };
    
    const options = variations[type] || variations.conversation;
    return options[Math.floor(Math.random() * options.length)];
  }

  getManualCommunityResponse() {
    const pref = this.currentPersona.preferences;
    const variations = [
      pref.community,
      `The audience is ${pref.community}`,
      `This is for ${pref.community}`,
      `We're targeting ${pref.community}`
    ];
    return variations[Math.floor(Math.random() * variations.length)];
  }

  getManualReadingLevelResponse() {
    const pref = this.currentPersona.preferences;
    const variations = [
      pref.readingLevel,
      `About ${pref.readingLevel}`,
      `I think ${pref.readingLevel} would work`,
      `Let's target ${pref.readingLevel}`
    ];
    return variations[Math.floor(Math.random() * variations.length)];
  }

  getManualToneResponse() {
    const pref = this.currentPersona.preferences;
    const variations = [
      pref.tone,
      `I'd like a ${pref.tone} tone`,
      `Let's make it ${pref.tone}`,
      `Something ${pref.tone}`
    ];
    return variations[Math.floor(Math.random() * variations.length)];
  }

  getManualApproachResponse() {
    const pref = this.currentPersona.preferences;
    const variations = [
      pref.approach,
      `I prefer ${pref.approach}`,
      `Let's use a ${pref.approach} approach`,
      `${pref.approach} would be best`
    ];
    return variations[Math.floor(Math.random() * variations.length)];
  }

  /**
   * Get report with interaction mode analysis
   */
  generateTestReport() {
    const baseReport = super.generateTestReport();
    
    // Add interaction mode analysis
    baseReport.interactionMode = this.interactionMode;
    baseReport.suggestionsUsed = this.suggestionsUsed.length;
    baseReport.manualResponsesUsed = this.manualResponsesUsed.length;
    baseReport.interactionDetails = {
      suggestions: this.suggestionsUsed,
      manual: this.manualResponsesUsed
    };
    
    return baseReport;
  }
}

/**
 * Run a single test persona with specified interaction mode
 */
async function runSingleTest(baseUrl, persona, interactionMode) {
  const startTime = Date.now();
  const tester = new TestPersona(baseUrl, persona, interactionMode);
  
  try {
    console.log(`\n🚀 Starting ${persona} (${interactionMode} mode)...`);
    const report = await tester.startConversation();
    report.duration = Date.now() - startTime;
    return report;
  } catch (error) {
    console.error(`❌ ${persona} failed: ${error.message}`);
    return {
      persona,
      interactionMode,
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Run tests in parallel batches
 */
async function runParallelTests(baseUrl = "http://localhost:9999", batchSize = 3) {
  console.log("\n🎬 Starting Parallel Workshop Simulation");
  console.log("==========================================");
  console.log(`Running tests in batches of ${batchSize} for server stability\n`);

  // Define test configurations
  const testConfigs = [
    // Test with suggestions only
    { persona: 'curious_beginner', mode: 'suggestions' },
    { persona: 'children_minister', mode: 'suggestions' },
    { persona: 'esl_teacher', mode: 'suggestions' },
    
    // Test with manual typing only
    { persona: 'experienced_translator', mode: 'manual' },
    { persona: 'youth_pastor', mode: 'manual' },
    { persona: 'senior_ministry', mode: 'manual' },
    
    // Test with mixed mode
    { persona: 'confused_user', mode: 'mixed' },
    { persona: 'prison_chaplain', mode: 'mixed' }
  ];

  const results = [];
  const startTime = Date.now();

  // Process in batches to avoid overwhelming the server
  for (let i = 0; i < testConfigs.length; i += batchSize) {
    const batch = testConfigs.slice(i, i + batchSize);
    console.log(`\n📦 Running batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(testConfigs.length / batchSize)}`);
    console.log(`   Tests: ${batch.map(t => `${t.persona} (${t.mode})`).join(', ')}`);
    
    // Run batch in parallel
    const batchPromises = batch.map(config => 
      runSingleTest(baseUrl, config.persona, config.mode)
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Brief pause between batches
    if (i + batchSize < testConfigs.length) {
      console.log('   ⏸️  Pausing before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const totalDuration = Date.now() - startTime;

  // Generate summary report
  generateSummaryReport(results, totalDuration);
  
  return results;
}

/**
 * Generate summary report
 */
function generateSummaryReport(results, totalDuration) {
  console.log('\n' + '='.repeat(60));
  console.log('🏁 PARALLEL TEST SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n📊 Overall Results:`);
  console.log(`   Success Rate: ${successful.length}/${results.length} (${Math.round(successful.length / results.length * 100)}%)`);
  console.log(`   Total Duration: ${Math.round(totalDuration / 1000)}s`);
  console.log(`   Average Test Duration: ${Math.round(results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length / 1000)}s`);
  
  // Group by interaction mode
  const byMode = {
    suggestions: results.filter(r => r.interactionMode === 'suggestions'),
    manual: results.filter(r => r.interactionMode === 'manual'),
    mixed: results.filter(r => r.interactionMode === 'mixed')
  };
  
  console.log(`\n🎯 Results by Interaction Mode:`);
  Object.entries(byMode).forEach(([mode, modeResults]) => {
    const modeSuccess = modeResults.filter(r => r.success).length;
    console.log(`   ${mode}: ${modeSuccess}/${modeResults.length} successful`);
  });
  
  // Interaction statistics
  console.log(`\n💬 Interaction Statistics:`);
  results.forEach(r => {
    if (r.success) {
      console.log(`   ${r.persona} (${r.interactionMode}):`);
      console.log(`      Suggestions used: ${r.suggestionsUsed || 0}`);
      console.log(`      Manual responses: ${r.manualResponsesUsed || 0}`);
    }
  });
  
  // Failed tests
  if (failed.length > 0) {
    console.log(`\n❌ Failed Tests:`);
    failed.forEach(r => {
      console.log(`   ${r.persona} (${r.interactionMode}): ${r.error || 'Unknown error'}`);
    });
  }
  
  // Performance metrics
  console.log(`\n⚡ Performance Metrics:`);
  console.log(`   Parallel Speedup: ${Math.round(results.length * 30 / totalDuration * 1000)}x`);
  console.log(`   Tests per minute: ${Math.round(results.length / (totalDuration / 60000))}`);
  
  // Quick response analysis
  const suggestionsOnlySuccess = byMode.suggestions.filter(r => r.success).length / byMode.suggestions.length;
  const manualOnlySuccess = byMode.manual.filter(r => r.success).length / byMode.manual.length;
  
  console.log(`\n📝 Interaction Mode Analysis:`);
  console.log(`   Suggestions-only success rate: ${Math.round(suggestionsOnlySuccess * 100)}%`);
  console.log(`   Manual-only success rate: ${Math.round(manualOnlySuccess * 100)}%`);
  
  if (suggestionsOnlySuccess < manualOnlySuccess) {
    console.log(`   ⚠️  Suggestions mode has lower success rate - quick responses may need improvement`);
  }
}

/**
 * Run focused test on specific interaction mode
 */
export async function testInteractionMode(mode = 'suggestions', baseUrl = 'http://localhost:9999') {
  console.log(`\n🎯 Testing ${mode} interaction mode`);
  console.log('='.repeat(40));
  
  const personas = ['curious_beginner', 'esl_teacher', 'youth_pastor'];
  const results = [];
  
  for (const persona of personas) {
    const result = await runSingleTest(baseUrl, persona, mode);
    results.push(result);
  }
  
  // Analyze results
  const successful = results.filter(r => r.success).length;
  console.log(`\n${mode} Mode Results: ${successful}/${results.length} successful`);
  
  return results;
}

/**
 * Quick smoke test - runs 2 personas in parallel
 */
export async function quickTest(baseUrl = 'http://localhost:9999') {
  console.log("\n🚀 Running Quick Smoke Test");
  
  const tests = [
    runSingleTest(baseUrl, 'children_minister', 'suggestions'),
    runSingleTest(baseUrl, 'youth_pastor', 'manual')
  ];
  
  const results = await Promise.all(tests);
  
  console.log("\n📊 Quick Test Results:");
  results.forEach(r => {
    console.log(`   ${r.persona} (${r.interactionMode}): ${r.success ? '✅' : '❌'}`);
  });
  
  return results;
}

// Allow running from command line
if (process.argv[1] === import.meta.url) {
  const mode = process.argv[2] || 'parallel';
  const baseUrl = process.argv[3] || 'http://localhost:9999';
  
  switch(mode) {
    case 'parallel':
      runParallelTests(baseUrl).then(results => {
        const failures = results.filter(r => !r.success).length;
        process.exit(failures > 0 ? 1 : 0);
      });
      break;
    
    case 'suggestions':
    case 'manual':
    case 'mixed':
      testInteractionMode(mode, baseUrl).then(results => {
        const failures = results.filter(r => !r.success).length;
        process.exit(failures > 0 ? 1 : 0);
      });
      break;
    
    case 'quick':
      quickTest(baseUrl).then(results => {
        const failures = results.filter(r => !r.success).length;
        process.exit(failures > 0 ? 1 : 0);
      });
      break;
    
    default:
      console.log('Usage: node parallel-test-runner.js [parallel|suggestions|manual|mixed|quick] [baseUrl]');
      process.exit(1);
  }
}

export { runParallelTests, TestPersona };
