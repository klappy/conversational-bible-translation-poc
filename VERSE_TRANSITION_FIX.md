# Critical Fix: Verse Transitions

## The Problem

When moving from verse 1 to verse 2:
1. Phase stayed in DRAFTING instead of resetting to UNDERSTANDING
2. Draft Builder spoke instead of Resource Librarian
3. Multiple agents tried to explore phrases (chaos!)

## Root Cause

The system doesn't know how to handle verse transitions. It needs to:
1. Reset phase to Understanding
2. Clear previous verse's phrases
3. Present new verse properly
4. Start fresh phrase exploration

## Quick Fix (Manual)

When starting a new verse, the user should:
1. Say "I want to translate verse 2" or "Next verse"
2. System should detect this and reset to Understanding phase
3. Resource Librarian presents the new verse
4. Understanding Guide starts fresh phrase exploration

## Proper Fix (Code)

### Add to Orchestrator:

```javascript
// Detect verse transition requests
if (userMessage.includes("verse 2") || 
    userMessage.includes("next verse") || 
    userMessage.includes("continue to verse")) {
  return {
    "phase_status": {
      "current": "understanding",
      "transition": "NEW VERSE - Resetting to Understanding"
    },
    "agents": ["resource", "suggestions"],
    "notes": "New verse requested. Resource Librarian will present it."
  }
}
```

### Add to Canvas Scribe:

```javascript
// When detecting new verse:
{
  "updates": {
    "workflow": {
      "currentPhase": "understanding",
      "currentVerse": "Ruth 1:2",  // increment
      "currentPhrases": []  // clear for new extraction
    },
    "glossary": {
      "userPhrases": {}  // optionally clear for new verse
    }
  }
}
```

### Add to Translation Assistant:

```javascript
// After completing a verse:
"Great work on verse 1! Would you like to:
1. Continue to verse 2
2. Review your translation
3. Publish and finish"

// If continuing:
"Moving to verse 2. Let's start with understanding the text..."
[Transition to Understanding phase]
```

## Current Workaround

Until properly fixed, users should:
1. Complete verse 1 fully
2. Refresh the page
3. Start fresh with verse 2
4. This ensures clean phase reset

## Why This Happened

We added multi-verse "support" without:
- Phase reset logic
- Verse transition detection
- Proper context clearing
- Agent role reinforcement

Classic case of feature creep breaking existing functionality!

## Testing Needed

1. Complete verse 1
2. Try "I want to translate verse 2"
3. Verify:
   - Phase resets to Understanding
   - Resource Librarian presents verse 2
   - Understanding Guide extracts NEW phrases
   - No agents overlap responsibilities
