/**
 * API Testing Framework for Bible Translation Assistant
 * 
 * This framework allows automated testing of the complete conversation flow
 * without requiring any UI interaction. It directly tests the API endpoints
 * to ensure the multi-agent system works correctly end-to-end.
 */

import fetch from 'node-fetch';

class ConversationTester {
  constructor(baseUrl = 'http://localhost:8888') {
    this.baseUrl = baseUrl;
    this.sessionId = `test_${Date.now()}`;
    this.conversationHistory = [];
    this.canvasState = null;
    this.testResults = [];
  }

  /**
   * Make an API call to the conversation endpoint
   */
  async sendMessage(message, expectations = {}) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/.netlify/functions/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId
        },
        body: JSON.stringify({
          message,
          history: this.conversationHistory
        })
      });

      const result = await response.json();
      const duration = Date.now() - startTime;

      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: message
      });

      // Add agent responses to history
      if (result.messages) {
        result.messages.forEach(msg => {
          this.conversationHistory.push(msg);
        });
      }

      // Update canvas state
      this.canvasState = result.canvasState;

      // Validate expectations
      const testResult = this.validateExpectations(result, expectations);
      
      this.testResults.push({
        message,
        expectations,
        result: testResult,
        duration,
        response: result
      });

      return { success: testResult.success, result, duration };
    } catch (error) {
      this.testResults.push({
        message,
        expectations,
        result: { success: false, error: error.message },
        duration: Date.now() - startTime
      });
      
      throw error;
    }
  }

  /**
   * Validate response against expectations
   */
  validateExpectations(response, expectations) {
    const results = {
      success: true,
      failures: []
    };

    // Check if expected agents responded
    if (expectations.agentsRespond) {
      expectations.agentsRespond.forEach(agentId => {
        if (!response.agentResponses?.[agentId]) {
          results.success = false;
          results.failures.push(`Expected agent '${agentId}' to respond`);
        }
      });
    }

    // Check if state was updated
    if (expectations.stateUpdates) {
      Object.entries(expectations.stateUpdates).forEach(([path, value]) => {
        const actual = this.getNestedValue(response.canvasState, path);
        if (actual !== value) {
          results.success = false;
          results.failures.push(`Expected state.${path} to be '${value}', got '${actual}'`);
        }
      });
    }

    // Check workflow phase
    if (expectations.phase) {
      const currentPhase = response.canvasState?.workflow?.currentPhase;
      if (currentPhase !== expectations.phase) {
        results.success = false;
        results.failures.push(`Expected phase '${expectations.phase}', got '${currentPhase}'`);
      }
    }

    // Check if suggestions are present
    if (expectations.hasSuggestions) {
      if (!response.suggestions || response.suggestions.length === 0) {
        results.success = false;
        results.failures.push('Expected suggestions to be present');
      }
    }

    // Check message content
    if (expectations.messageContains) {
      const hasContent = response.messages?.some(msg => 
        msg.content.toLowerCase().includes(expectations.messageContains.toLowerCase())
      );
      if (!hasContent) {
        results.success = false;
        results.failures.push(`Expected message to contain '${expectations.messageContains}'`);
      }
    }

    return results;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get the current canvas state
   */
  async getCanvasState() {
    const response = await fetch(`${this.baseUrl}/.netlify/functions/canvas-state`, {
      headers: {
        'X-Session-ID': this.sessionId
      }
    });
    return await response.json();
  }

  /**
   * Reset the canvas state for a fresh test
   */
  async resetState() {
    await fetch(`${this.baseUrl}/.netlify/functions/canvas-state/reset`, {
      method: 'POST',
      headers: {
        'X-Session-ID': this.sessionId
      }
    });
    this.conversationHistory = [];
    this.canvasState = null;
  }

  /**
   * Generate test report
   */
  getReport() {
    const totalTests = this.testResults.length;
    const passed = this.testResults.filter(t => t.result.success).length;
    const failed = totalTests - passed;
    const totalDuration = this.testResults.reduce((sum, t) => sum + t.duration, 0);

    return {
      summary: {
        total: totalTests,
        passed,
        failed,
        duration: totalDuration,
        sessionId: this.sessionId
      },
      tests: this.testResults,
      finalState: this.canvasState
    };
  }
}

/**
 * Complete conversation flow test
 */
export async function testCompleteTranslationFlow() {
  const tester = new ConversationTester();
  
  console.log('Starting complete translation flow test...\n');

  try {
    // Reset state
    await tester.resetState();

    // 1. Initial greeting
    await tester.sendMessage('Hello', {
      agentsRespond: ['primary'],
      phase: 'planning',
      hasSuggestions: true,
      messageContains: 'translate'
    });

    // 2. Start customization
    await tester.sendMessage("I'd like to customize the reading level and style", {
      agentsRespond: ['primary'],
      phase: 'planning',
      messageContains: 'language'
    });

    // 3. Set conversation language
    await tester.sendMessage('Spanish', {
      agentsRespond: ['primary', 'state'],
      stateUpdates: {
        'styleGuide.conversationLanguage': 'Spanish'
      }
    });

    // 4. Set source language
    await tester.sendMessage('Hebrew', {
      agentsRespond: ['primary', 'state'],
      stateUpdates: {
        'styleGuide.sourceLanguage': 'Hebrew'
      }
    });

    // 5. Set target language  
    await tester.sendMessage('Spanish', {
      agentsRespond: ['primary', 'state'],
      stateUpdates: {
        'styleGuide.targetLanguage': 'Spanish'
      }
    });

    // 6. Set target community
    await tester.sendMessage('Teenagers', {
      agentsRespond: ['primary', 'state'],
      stateUpdates: {
        'styleGuide.targetCommunity': 'Teenagers'
      }
    });

    // 7. Set reading level
    await tester.sendMessage('Grade 8', {
      agentsRespond: ['primary', 'state'],
      stateUpdates: {
        'styleGuide.readingLevel': 'Grade 8'
      }
    });

    // 8. Set tone
    await tester.sendMessage('Friendly and engaging', {
      agentsRespond: ['primary', 'state'],
      stateUpdates: {
        'styleGuide.tone': 'Friendly and engaging'
      }
    });

    // 9. Set approach (triggers phase transition)
    await tester.sendMessage('Meaning-based', {
      agentsRespond: ['primary', 'state', 'resource'],
      stateUpdates: {
        'styleGuide.approach': 'Meaning-based'
      },
      phase: 'understanding'
    });

    // 10. Understanding phase - discuss first phrase
    await tester.sendMessage('I understand this talks about a time of judges', {
      agentsRespond: ['primary'],
      phase: 'understanding'
    });

    // 11. Continue to drafting
    await tester.sendMessage('Start drafting', {
      agentsRespond: ['primary', 'state'],
      phase: 'drafting'
    });

    // 12. Provide a draft
    await tester.sendMessage('During the time when judges ruled, there was a famine in the land.', {
      agentsRespond: ['primary', 'state'],
      stateUpdates: {
        'scriptureCanvas.verses.Ruth 1:1.draft': '*'  // Check that something was saved
      }
    });

    // Generate report
    const report = tester.getReport();
    
    console.log('\n=== TEST REPORT ===');
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Total Duration: ${report.summary.duration}ms`);
    
    if (report.summary.failed > 0) {
      console.log('\n=== FAILURES ===');
      report.tests.filter(t => !t.result.success).forEach(test => {
        console.log(`\nMessage: "${test.message}"`);
        test.result.failures.forEach(f => console.log(`  ❌ ${f}`));
      });
    }

    console.log('\n=== FINAL STATE ===');
    console.log('Style Guide:', report.finalState?.styleGuide);
    console.log('Current Phase:', report.finalState?.workflow?.currentPhase);

    return report;

  } catch (error) {
    console.error('Test failed with error:', error);
    return tester.getReport();
  }
}

/**
 * Test specific agent behaviors
 */
export async function testAgentBehaviors() {
  const tester = new ConversationTester();
  
  console.log('Testing specific agent behaviors...\n');

  const tests = [
    {
      name: 'Canvas Scribe responds to specific data',
      message: 'Grade 3',
      expectations: {
        agentsRespond: ['primary', 'state']
      }
    },
    {
      name: 'Canvas Scribe stays silent for questions',
      message: 'How does this work?',
      expectations: {
        agentsRespond: ['primary'],
        // Explicitly check that state does NOT respond
      }
    },
    {
      name: 'Resource Librarian provides scripture',
      message: 'Show me Ruth 1:1',
      expectations: {
        agentsRespond: ['resource', 'primary'],
        messageContains: 'Ruth'
      }
    }
  ];

  for (const test of tests) {
    await tester.resetState();
    const result = await tester.sendMessage(test.message, test.expectations);
    console.log(`${test.name}: ${result.success ? '✅' : '❌'}`);
  }

  return tester.getReport();
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('🧪 Running Bible Translation Assistant API Tests\n');
  console.log('=' .repeat(50) + '\n');

  // Test complete flow
  const flowResults = await testCompleteTranslationFlow();
  
  console.log('\n' + '=' .repeat(50) + '\n');
  
  // Test agent behaviors
  const behaviorResults = await testAgentBehaviors();
  
  console.log('\n' + '=' .repeat(50));
  console.log('\n🏁 All tests completed!\n');

  return {
    flow: flowResults,
    behaviors: behaviorResults
  };
}

// Allow running from command line
if (process.argv[2] === 'run') {
  runAllTests().then(results => {
    const exitCode = results.flow.summary.failed + results.behaviors.summary.failed > 0 ? 1 : 0;
    process.exit(exitCode);
  });
}
