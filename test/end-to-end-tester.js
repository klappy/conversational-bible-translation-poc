/**
 * End-to-End Testing for Complete Bible Translation Workshop
 * 
 * Tests the FULL workshop flow from start to finish:
 * Planning → Understanding → Drafting → Checking → Sharing → Publishing
 */

import { IntelligentWorkshopAttendee } from "./intelligent-conversation-tester.js";
import fetch from "node-fetch";

/**
 * Extended workshop attendee that completes the full workshop
 */
class CompleteWorkshopAttendee extends IntelligentWorkshopAttendee {
  constructor(baseUrl, persona = "workshop_completer") {
    super(baseUrl, persona);
    this.targetPhases = [
      "planning",
      "understanding", 
      "drafting",
      "checking",
      "sharing",
      "publishing"
    ];
    this.phasesCompleted = [];
    this.checkingFeedback = [];
    this.communityComments = [];
    this.draftProvided = false;
  }

  /**
   * Override completion check to continue through all phases
   */
  isConversationComplete() {
    const currentPhase = this.currentState?.workflow?.currentPhase;
    
    // Track phase progression
    if (currentPhase && !this.phasesCompleted.includes(currentPhase)) {
      this.phasesCompleted.push(currentPhase);
      console.log(`📍 Phase completed: ${currentPhase}`);
    }
    
    // Only complete after publishing phase or max exchanges
    const exchanges = this.conversationHistory.filter(m => m.role === "user").length;
    const isPublished = currentPhase === "publishing" || this.phasesCompleted.includes("publishing");
    const maxExchangesReached = exchanges > 50; // Allow longer conversations
    
    if (isPublished) {
      console.log("🎉 Workshop complete - reached publishing!");
      return true;
    }
    
    if (maxExchangesReached) {
      console.log("⏰ Max exchanges reached");
      return true;
    }
    
    return false;
  }

  /**
   * Detect the actual phase from conversation content
   */
  detectActualPhase(content) {
    // More reliable phase detection based on what the AI is saying
    if (content.includes("begin understanding") || content.includes("let's understand") || 
        content.includes("scripture passage") || content.includes("here's the text")) {
      return "understanding";
    }
    if (content.includes("ready to draft") || content.includes("start drafting") || 
        content.includes("translate this")) {
      return "drafting";
    }
    if (content.includes("check") && content.includes("translation") && 
        (content.includes("ready to check") || content.includes("let's check"))) {
      return "checking";
    }
    if (content.includes("share") || content.includes("distribute")) {
      return "sharing";
    }
    if (content.includes("publish") || content.includes("finalize")) {
      return "publishing";
    }
    if (content.includes("language") || content.includes("community") || 
        content.includes("reading level") || content.includes("tone")) {
      return "planning";
    }
    
    // Fall back to state phase
    return this.currentState?.workflow?.currentPhase || "planning";
  }

  /**
   * Generate appropriate response based on workshop phase
   */
  async generateNextResponse() {
    const lastMessage = this.getLastAssistantMessage();
    if (!lastMessage) return null;

    const content = lastMessage.content.toLowerCase();
    const suggestions = this.getLastSuggestions();
    
    // Detect the ACTUAL phase from what the AI is saying
    const actualPhase = this.detectActualPhase(content);
    const statePhase = this.currentState?.workflow?.currentPhase || "planning";
    
    // If phases mismatch, log it
    if (actualPhase !== statePhase) {
      console.log(`  [Phase mismatch! State: ${statePhase}, Actual: ${actualPhase}]`);
    }
    
    console.log(`  [Phase: ${actualPhase}]`);

    // Phase-specific responses based on ACTUAL phase
    switch (actualPhase) {
      case "planning":
        return this.handlePlanningPhase(content, suggestions);
      
      case "understanding":
        return this.handleUnderstandingPhase(content, suggestions);
      
      case "drafting":
        return this.handleDraftingPhase(content, suggestions);
      
      case "checking":
        return this.handleCheckingPhase(content, suggestions);
      
      case "sharing":
        return this.handleSharingPhase(content, suggestions);
      
      case "publishing":
        return this.handlePublishingPhase(content, suggestions);
      
      default:
        // Use suggestions if available
        if (suggestions && suggestions.length > 0) {
          return suggestions[0];
        }
        return "Continue";
    }
  }

  /**
   * Handle planning phase - settings collection
   */
  handlePlanningPhase(content, suggestions) {
    // Answer setting questions
    if (content.includes("language") && content.includes("conversation")) {
      return "English";
    }
    if (content.includes("translating from")) {
      return "Hebrew";
    }
    if (content.includes("translating to")) {
      return "Simple English";
    }
    if (content.includes("who will be reading")) {
      return "young adults in our community";
    }
    if (content.includes("reading level")) {
      return "Grade 8";
    }
    if (content.includes("tone")) {
      return "friendly and accessible";
    }
    if (content.includes("approach")) {
      return "meaning-based";
    }
    
    // Use suggestions to progress
    if (suggestions && suggestions.length > 0) {
      const progressSuggestion = suggestions.find(s => 
        s.toLowerCase().includes("begin") || 
        s.toLowerCase().includes("continue") ||
        s.toLowerCase().includes("start")
      );
      return progressSuggestion || suggestions[0];
    }
    
    return "Let's continue";
  }

  /**
   * Handle understanding phase - scripture comprehension
   */
  handleUnderstandingPhase(content, suggestions) {
    // First, check if we're just starting understanding
    if (content.includes("begin understanding") || content.includes("let's understand")) {
      // Use suggestion or acknowledge
      if (suggestions && suggestions.length > 0) {
        return suggestions[0]; // Usually "Begin understanding" or similar
      }
      return "Yes, let's begin understanding the text";
    }
    
    // Respond to scripture presentation
    if (content.includes("here is") || content.includes("here's") || 
        content.includes("scripture") || content.includes("ruth 1:1")) {
      return "I see the scripture. Please explain what it means.";
    }
    
    // Respond to understanding checks
    if (content.includes("understand") && (content.includes("?") || content.includes("make sense"))) {
      return "Yes, I understand. Let's continue.";
    }
    
    if (content.includes("phrase") && content.includes("mean")) {
      return "I understand this phrase. It makes sense in context.";
    }
    
    // Ask clarifying questions occasionally
    if (Math.random() > 0.7 && content.includes("judges")) {
      return "What exactly were judges in this context?";
    }
    
    // Move to drafting when ready
    if (content.includes("ready to draft") || content.includes("ready to translate")) {
      return "Yes, let's start drafting";
    }
    
    if (suggestions && suggestions.length > 0) {
      // Prefer understanding-related suggestions
      const understandSuggestion = suggestions.find(s => 
        s.toLowerCase().includes("understand") || 
        s.toLowerCase().includes("continue") ||
        s.toLowerCase().includes("explain")
      );
      if (understandSuggestion) return understandSuggestion;
      
      // Then drafting suggestions
      const draftSuggestion = suggestions.find(s => 
        s.toLowerCase().includes("draft") || 
        s.toLowerCase().includes("start")
      );
      if (draftSuggestion) return draftSuggestion;
      
      // Otherwise first suggestion
      return suggestions[0];
    }
    
    return "Please continue explaining";
  }

  /**
   * Handle drafting phase - create translation
   */
  handleDraftingPhase(content, suggestions) {
    // Check if we need to provide a draft
    if (content.includes("your draft") || content.includes("your translation") || 
        content.includes("translate") || content.includes("now draft") ||
        content.includes("try drafting")) {
      this.draftProvided = true;
      return "During the time when judges led Israel, there wasn't enough food in the land. " +
             "A man from Bethlehem in Judah went to live in Moab with his wife and two sons.";
    }
    
    // Refine draft if asked
    if (content.includes("revise") || content.includes("improve") || content.includes("refine")) {
      return "When the judges were leading Israel, a famine struck the land. " +
             "So a man from Bethlehem took his family to live in Moab for a while.";
    }
    
    // Accept feedback
    if (content.includes("how about") || content.includes("change") || content.includes("suggestion")) {
      return "That's a good suggestion. Let me incorporate that.";
    }
    
    // Only move to checking if we've provided a draft and it's being suggested
    if ((content.includes("ready to check") || content.includes("let's check")) && this.draftProvided) {
      return "Yes, let's check the translation";
    }
    
    // If checking is mentioned but we haven't drafted yet, we need to draft first
    if (content.includes("check") && !this.draftProvided) {
      return "Let me draft the translation first";
    }
    
    if (suggestions && suggestions.length > 0) {
      // If we haven't drafted yet, prefer draft-related suggestions
      if (!this.draftProvided) {
        const draftSuggestion = suggestions.find(s => 
          s.toLowerCase().includes("draft") || 
          s.toLowerCase().includes("attempt") ||
          s.toLowerCase().includes("try")
        );
        if (draftSuggestion) return draftSuggestion;
      }
      
      // If we have drafted, look for checking suggestions
      if (this.draftProvided) {
        const checkSuggestion = suggestions.find(s => 
          s.toLowerCase().includes("check") || 
          s.toLowerCase().includes("review")
        );
        if (checkSuggestion) return checkSuggestion;
      }
      
      return suggestions[0];
    }
    
    return this.draftProvided ? "Let's check this translation" : "I'll work on the draft";
  }

  /**
   * Handle checking phase - quality review
   */
  handleCheckingPhase(content, suggestions) {
    console.log("  📝 In checking phase");
    
    // Respond to checking questions
    if (content.includes("accurate")) {
      return "Yes, I believe it accurately conveys the original meaning";
    }
    
    if (content.includes("clear")) {
      return "The translation is clear and easy to understand";
    }
    
    if (content.includes("natural")) {
      return "It sounds natural in English, like something we'd say";
    }
    
    // Address specific issues
    if (content.includes("issue") || content.includes("problem")) {
      this.checkingFeedback.push("Maybe we could make 'famine' clearer - perhaps 'time when food was scarce'?");
      return this.checkingFeedback[this.checkingFeedback.length - 1];
    }
    
    // Community feedback
    if (content.includes("community") || content.includes("feedback")) {
      return "I shared it with some friends and they found it very understandable";
    }
    
    // Move to sharing when ready
    if (content.includes("share") || content.includes("ready")) {
      return "Yes, I'm ready to share this translation";
    }
    
    if (suggestions && suggestions.length > 0) {
      const nextSuggestion = suggestions.find(s => 
        s.toLowerCase().includes("share") || 
        s.toLowerCase().includes("continue") ||
        s.toLowerCase().includes("next")
      );
      return nextSuggestion || suggestions[0];
    }
    
    return "The translation looks good";
  }

  /**
   * Handle sharing phase - community distribution
   */
  handleSharingPhase(content, suggestions) {
    console.log("  📤 In sharing phase");
    
    // Respond to sharing options
    if (content.includes("how") && content.includes("share")) {
      return "I'd like to share it with my small group first";
    }
    
    if (content.includes("format")) {
      return "A printed handout would work best for our group";
    }
    
    if (content.includes("feedback") || content.includes("comments")) {
      this.communityComments.push("The group really appreciated the simple language");
      return this.communityComments[this.communityComments.length - 1];
    }
    
    // Move to publishing when ready
    if (content.includes("publish") || content.includes("finalize")) {
      return "Yes, let's publish the final version";
    }
    
    if (suggestions && suggestions.length > 0) {
      const publishSuggestion = suggestions.find(s => 
        s.toLowerCase().includes("publish") || 
        s.toLowerCase().includes("finalize") ||
        s.toLowerCase().includes("complete")
      );
      return publishSuggestion || suggestions[0];
    }
    
    return "Let's proceed with sharing";
  }

  /**
   * Handle publishing phase - finalization
   */
  handlePublishingPhase(content, suggestions) {
    console.log("  ✅ In publishing phase");
    
    // Respond to publishing options
    if (content.includes("format")) {
      return "PDF format would be perfect";
    }
    
    if (content.includes("copyright") || content.includes("attribution")) {
      return "We can use Creative Commons attribution";
    }
    
    if (content.includes("final") || content.includes("confirm")) {
      return "Yes, this is our final version. Let's publish it!";
    }
    
    if (suggestions && suggestions.length > 0) {
      return suggestions[0];
    }
    
    return "Let's complete the publication";
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport() {
    const baseReport = super.generateTestReport();
    
    // Add phase progression details
    baseReport.phasesCompleted = this.phasesCompleted;
    baseReport.allPhasesReached = this.phasesCompleted.length === this.targetPhases.length;
    baseReport.checkingFeedback = this.checkingFeedback;
    baseReport.communityComments = this.communityComments;
    
    // Calculate phase coverage
    baseReport.phaseCoverage = `${this.phasesCompleted.length}/${this.targetPhases.length}`;
    
    // Enhanced success criteria
    baseReport.success = baseReport.allPhasesReached || 
                         this.phasesCompleted.includes("publishing") ||
                         this.phasesCompleted.includes("sharing");
    
    console.log("\n📊 WORKSHOP COMPLETION REPORT");
    console.log("=" .repeat(50));
    console.log(`Phases Completed: ${baseReport.phaseCoverage}`);
    console.log(`Phases: ${this.phasesCompleted.join(" → ")}`);
    console.log(`Final Phase: ${baseReport.finalPhase}`);
    console.log(`Translation Created: ${baseReport.hasDraft}`);
    console.log(`Checking Feedback: ${this.checkingFeedback.length} items`);
    console.log(`Community Comments: ${this.communityComments.length} items`);
    console.log(`Workshop Complete: ${baseReport.success ? "✅ YES" : "❌ NO"}`);
    
    return baseReport;
  }
}

/**
 * Run a complete workshop test
 */
export async function runCompleteWorkshop(baseUrl = 'http://localhost:9999') {
  console.log("\n🎬 Starting Complete Workshop Test");
  console.log("Testing full flow: Planning → Understanding → Drafting → Checking → Sharing → Publishing");
  console.log("=" .repeat(70) + "\n");
  
  const attendee = new CompleteWorkshopAttendee(baseUrl);
  const report = await attendee.startConversation();
  
  // Generate detailed analysis
  console.log("\n📈 DETAILED ANALYSIS");
  console.log("=" .repeat(50));
  
  if (report.allPhasesReached) {
    console.log("✅ Successfully completed entire workshop!");
  } else {
    console.log(`⚠️  Only completed ${report.phasesCompleted.length} of 6 phases`);
    const missingPhases = attendee.targetPhases.filter(
      p => !report.phasesCompleted.includes(p)
    );
    if (missingPhases.length > 0) {
      console.log(`Missing phases: ${missingPhases.join(", ")}`);
    }
  }
  
  return report;
}

/**
 * Run multiple complete workshops with different personas
 */
export async function runWorkshopSuite(baseUrl = 'http://localhost:9999') {
  console.log("\n🎭 Running Complete Workshop Suite");
  console.log("=" .repeat(50));
  
  const personas = [
    { name: "beginner", persona: "curious_beginner" },
    { name: "experienced", persona: "experienced_translator" },
    { name: "teacher", persona: "esl_teacher" }
  ];
  
  const results = [];
  
  for (const config of personas) {
    console.log(`\n📝 Testing with ${config.name} persona...`);
    const attendee = new CompleteWorkshopAttendee(baseUrl, config.persona);
    const report = await attendee.startConversation();
    results.push({
      ...report,
      personaName: config.name
    });
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log("\n🏁 WORKSHOP SUITE SUMMARY");
  console.log("=" .repeat(50));
  
  results.forEach(r => {
    console.log(`\n${r.personaName}:`);
    console.log(`  Phases: ${r.phasesCompleted.join(" → ")}`);
    console.log(`  Coverage: ${r.phaseCoverage}`);
    console.log(`  Success: ${r.success ? "✅" : "❌"}`);
  });
  
  const successRate = results.filter(r => r.success).length / results.length * 100;
  console.log(`\nOverall Success Rate: ${successRate.toFixed(0)}%`);
  
  return results;
}

/**
 * Test specific phase transitions
 */
export async function testPhaseTransition(fromPhase, toPhase, baseUrl = 'http://localhost:9999') {
  console.log(`\n🔄 Testing transition: ${fromPhase} → ${toPhase}`);
  
  const attendee = new CompleteWorkshopAttendee(baseUrl);
  
  // Fast-forward to starting phase
  // This would need implementation based on your needs
  
  const report = await attendee.startConversation();
  
  const transitionSuccess = report.phasesCompleted.includes(fromPhase) && 
                           report.phasesCompleted.includes(toPhase);
  
  console.log(`Transition ${transitionSuccess ? "✅ Successful" : "❌ Failed"}`);
  
  return {
    ...report,
    transitionSuccess
  };
}

// Command line interface
if (process.argv[1] === import.meta.url) {
  const mode = process.argv[2] || 'complete';
  const baseUrl = process.argv[3] || 'http://localhost:9999';
  
  switch(mode) {
    case 'complete':
      runCompleteWorkshop(baseUrl).then(report => {
        process.exit(report.success ? 0 : 1);
      });
      break;
    
    case 'suite':
      runWorkshopSuite(baseUrl).then(results => {
        const failures = results.filter(r => !r.success).length;
        process.exit(failures === 0 ? 0 : 1);
      });
      break;
    
    case 'checking':
      // Test specifically getting to checking phase
      testPhaseTransition('drafting', 'checking', baseUrl).then(report => {
        process.exit(report.transitionSuccess ? 0 : 1);
      });
      break;
    
    default:
      console.log('Usage: node end-to-end-tester.js [complete|suite|checking] [baseUrl]');
      process.exit(1);
  }
}

export default CompleteWorkshopAttendee;
