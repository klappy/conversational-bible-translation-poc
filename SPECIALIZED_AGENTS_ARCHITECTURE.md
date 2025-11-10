# 🎯 Specialized Agents Architecture
## Single Responsibility Principle Applied

---

## Current Problem: One Agent Doing Everything

### Translation Assistant (Primary) Currently Handles:
1. Collecting settings (8+ questions)
2. Providing book context
3. Providing chapter context  
4. Providing pericope context
5. Leading phrase understanding
6. Creating drafts
7. Managing checking
8. Handling transitions
9. Error recovery
10. User guidance

**Result:** Confused, inconsistent, unreliable

---

## Proposed Solution: Specialized Agents

### 1. 📋 Settings Collector Agent
```javascript
{
  id: "settings_collector",
  model: "gpt-4o-mini",
  role: "Settings Specialist",
  visual: {
    icon: "📋",
    color: "#3B82F6",
    name: "Settings Collector"
  },
  systemPrompt: `
  You ONLY collect translation settings. Nothing else.
  
  EXACTLY 4 questions in this order:
  1. What's your name?
  2. What language are we translating to?
  3. Who will read this? (audience)
  4. What reading level?
  
  After each answer:
  - Acknowledge briefly ("Got it!")
  - Ask next question
  - After 4th answer: "Settings complete!"
  
  EXIT CONDITION: After 4th setting collected
  NEVER: Provide context, explain process, discuss translation
  
  Context needed: Just previous Q&A
  `
}
```

### 2. 📚 Context Provider Agent
```javascript
{
  id: "context_provider",
  model: "gpt-4o-mini", 
  role: "Story Guide",
  visual: {
    icon: "📚",
    color: "#8B5CF6",
    name: "Context Provider"
  },
  systemPrompt: `
  You ONLY provide biblical context. No questions, no interaction.
  
  Follow this EXACT sequence:
  1. Book context (Ruth overview)
  2. Chapter context (Chapter 1 summary)
  3. Pericope context (Verses 1-5 overview)
  
  After each level, wait for user response before continuing.
  
  EXIT CONDITION: After pericope context delivered
  NEVER: Ask questions, collect settings, work with phrases
  
  Context needed: Current context level, user readiness
  `
}
```

### 3. 🔍 Phrase Explorer Agent  
```javascript
{
  id: "phrase_explorer",
  model: "gpt-4o-mini",
  role: "Understanding Guide",
  visual: {
    icon: "🔍",
    color: "#10B981",
    name: "Phrase Explorer"
  },
  systemPrompt: `
  You ONLY explore phrase meanings. One job: collect understanding.
  
  Process EXACTLY 5 phrases:
  1. Present phrase from source text
  2. Ask "What does this mean to you?"
  3. Acknowledge their understanding
  4. Move to next phrase
  
  Track: X of 5 phrases complete
  
  EXIT CONDITION: After 5th phrase understood
  NEVER: Provide context, create drafts, check quality
  
  Context needed: Source verse, glossary entries so far
  `
}
```

### 4. ✏️ Draft Creator Agent
```javascript
{
  id: "draft_creator",
  model: "gpt-4o-mini",
  role: "Draft Composer",
  visual: {
    icon: "✏️",
    color: "#F59E0B",
    name: "Draft Creator"
  },
  systemPrompt: `
  You ONLY create and refine drafts. Nothing else.
  
  Your ONLY job:
  1. Read glossary.userPhrases
  2. Combine into coherent draft
  3. Present draft
  4. Accept revisions if requested
  
  EXIT CONDITION: When user accepts draft
  NEVER: Check quality, provide context, explore phrases
  
  Context needed: Complete glossary, source text, user preferences
  `
}
```

### 5. ✅ Quality Validator Agent (Enhanced)
```javascript
{
  id: "quality_validator",
  model: "gpt-4o-mini",
  role: "Quality Specialist",
  visual: {
    icon: "✅",
    color: "#EF4444",
    name: "Quality Validator"
  },
  systemPrompt: `
  You ONLY validate quality. One check per draft.
  
  Your ONLY job:
  1. Compare draft to source
  2. Check reading level
  3. Verify completeness
  4. Give ONE verdict: Approved/Minor Issues/Major Issues
  
  EXIT CONDITION: After giving verdict
  NEVER: Ask to check again, provide context, create drafts
  
  Context needed: Draft, source text, settings, glossary
  `
}
```

---

## 🧠 Context Requirements

### Problem: Agents Need More Context

Current issue: Agents only see tiny slice of conversation

### Solution: Expanded Context Windows

#### Each Agent Receives:
```javascript
{
  // Core context (what they always get)
  current_phase: "understanding",
  phase_progress: "3 of 5 phrases complete",
  
  // Phase-specific context
  settings: {
    userName: "Sarah",
    targetLanguage: "Spanish",
    audience: "Teens", 
    readingLevel: "Grade 5"
  },
  
  // Relevant history (last 5-10 messages)
  recent_conversation: [...],
  
  // Current work product
  glossary: { userPhrases: {...} },
  draft: "current draft text",
  
  // What just happened
  previous_agent_response: "...",
  user_last_message: "..."
}
```

#### Context Provider Pattern:
```javascript
function getAgentContext(agentId, fullContext) {
  const baseContext = {
    current_phase: fullContext.workflow.currentPhase,
    phase_progress: calculateProgress(fullContext),
    settings: fullContext.settings
  };
  
  switch(agentId) {
    case 'phrase_explorer':
      return {
        ...baseContext,
        source_verse: fullContext.currentVerse,
        glossary_so_far: fullContext.glossary,
        phrases_completed: fullContext.phrasesComplete,
        // Include last 5 messages for continuity
        recent_history: fullContext.history.slice(-5)
      };
      
    case 'draft_creator':
      return {
        ...baseContext,
        complete_glossary: fullContext.glossary,
        source_text: fullContext.sourceText,
        previous_drafts: fullContext.draftHistory,
        user_preferences: fullContext.settings,
        // Include understanding phase history
        understanding_conversation: fullContext.understandingHistory
      };
      
    // etc for each agent
  }
}
```

---

## 🎭 Orchestration Flow

### How Orchestrator Coordinates Specialists:

```
Phase: SETTINGS
Orchestrator: "📍 Settings Phase - Calling Settings Collector"
Settings Collector: [Handles all 4 questions]
Orchestrator: "✅ Settings complete! Moving to Context"

Phase: CONTEXT  
Orchestrator: "📍 Context Phase - Calling Context Provider"
Context Provider: [Delivers book/chapter/pericope]
Orchestrator: "✅ Context delivered! Moving to Understanding"

Phase: UNDERSTANDING
Orchestrator: "📍 Understanding Phase - Calling Phrase Explorer"
Phrase Explorer: [Handles all 5 phrases]
Orchestrator: "✅ Understanding complete! Moving to Drafting"

Phase: DRAFTING
Orchestrator: "📍 Drafting Phase - Calling Draft Creator"
Draft Creator: [Creates and refines draft]
Orchestrator: "✅ Draft ready! Moving to Checking"

Phase: CHECKING
Orchestrator: "📍 Checking Phase - Calling Quality Validator"
Quality Validator: [Gives ONE verdict]
Orchestrator: "✅ Checking complete! Next verse or done?"
```

---

## 🚀 Benefits of Specialization

### 1. Single Responsibility
- Each agent has ONE job
- Can't get confused about role
- Easier to debug

### 2. Clear Boundaries
- No overlap in duties
- No conflicting instructions
- Clean handoffs

### 3. Predictable Behavior
- Settings Collector ALWAYS asks 4 questions
- Phrase Explorer ALWAYS handles 5 phrases
- Quality Validator ALWAYS checks once

### 4. Better Context Management
- Each agent gets exactly what they need
- No information overload
- Relevant history included

### 5. Easier Testing
- Test each agent independently
- Mock other agents easily
- Isolate problems quickly

---

## 📊 Implementation Priority

### Phase 1: Create New Agents
1. Settings Collector (High - fixes settings loop)
2. Phrase Explorer (High - fixes understanding loop)
3. Draft Creator (Medium - clarifies drafting)

### Phase 2: Refactor Existing
4. Quality Validator (enhance existing)
5. Context Provider (extract from primary)

### Phase 3: Orchestrator Updates
6. Update orchestrator to call specialists
7. Remove overlapping responsibilities from primary
8. Add context expansion logic

---

## 🎯 Expected Outcome

### Current Success Rate: 10%
- One agent doing everything
- Confused responsibilities
- Limited context

### With Specialized Agents: 80%+
- Each agent does ONE thing well
- Clear responsibilities
- Rich context for decisions
- No confusion possible

---

## 💡 Key Insight

**"A chef shouldn't also be the waiter, cashier, and janitor."**

By separating concerns completely, we eliminate the root cause of confusion. Each agent becomes an expert at their ONE job, making the system antifragile - if one agent fails, it's clear which one and why.
