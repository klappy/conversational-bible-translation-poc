# Multi-Verse Implementation Plan
## Supporting Ruth 1:1-5, Chapter 1, and Full Book Without Breaking Existing Functionality

## Implementation Strategy: Progressive Enhancement

### Phase 1: Dynamic Phrase Detection (No Breaking Changes)
**Goal:** Make Understanding Guide smart enough to handle ANY verse

#### Current (Brittle):
```javascript
THE 5 PHRASES FOR RUTH 1:1:
1. "In the days when the judges ruled"
2. "there was a famine in the land"
// ...hardcoded list
```

#### Proposed (Flexible):
```javascript
DYNAMIC PHRASE EXTRACTION:
1. Check if workflow.currentVerse exists
2. If Ruth 1:1 and no custom phrases → use existing 5 (backwards compatible!)
3. Otherwise → dynamically extract phrases from presented verse
4. Store phrases in workflow.currentPhrases
```

**Implementation:**
```javascript
// In Understanding Guide
YOUR PROCESS:
1. Check workflow.currentPhrases (new field)
2. If empty and verse is Ruth 1:1 → use default 5 phrases (KEEPS WORKING!)
3. If empty and different verse → extract phrases dynamically
4. Work through whatever phrases are identified

// Phrase extraction algorithm:
- Split at natural boundaries (commas, "and", semicolons)
- Target 3-7 phrases per verse
- Each phrase should be 3-10 words
- Store in workflow.currentPhrases array
```

**Risk:** NONE - Falls back to existing behavior for Ruth 1:1

### Phase 2: Verse Navigation System
**Goal:** Allow progression through multiple verses

#### Add to workflow state:
```javascript
workflow: {
  currentPhase: "understanding",
  currentVerse: "Ruth 1:1",  // Already exists
  verseQueue: ["Ruth 1:1", "Ruth 1:2", "Ruth 1:3", "Ruth 1:4", "Ruth 1:5"], // NEW
  completedVerses: [],  // NEW
  currentPhrases: [],  // NEW - from Phase 1
  totalVersesPlanned: 5  // NEW
}
```

#### After checking phase for a verse:
- Move currentVerse to completedVerses
- Pull next from verseQueue
- If queue empty → "All verses complete! Would you like to publish?"
- If queue has more → "Ready for verse 2?" → Loop back to Understanding

**Risk:** NONE - Single verse users never see this

### Phase 3: Settings Enhancement
**Goal:** Let users choose scope upfront

#### During Planning Phase:
```javascript
Settings Guide asks (NEW 5th question):
"How much would you like to translate?"
Options:
- "Just one verse (Ruth 1:1)" ← DEFAULT, keeps current behavior
- "First 5 verses"
- "Full chapter"
- "Entire book"

Based on answer:
- Populate verseQueue accordingly
- Set expectations: "This will take about X minutes"
```

**Risk:** NONE - Defaults to current single-verse behavior

### Phase 4: Smart Context Progression
**Goal:** Don't repeat context for subsequent verses

#### Logic:
```javascript
if (completedVerses.length === 0) {
  // First verse - full context progression
  Book → Chapter → Pericope → Verse
} else {
  // Subsequent verses - abbreviated
  "Continuing with verse 2..." → Verse
}
```

**Risk:** NONE - First verse users get same experience

### Phase 5: Batch Operations
**Goal:** Efficiency for multiple verses

#### Optimizations:
- Cache biblical text for the chapter/book
- Reuse glossary entries across verses
- Smart phrase detection (don't re-ask about repeated phrases)
- Progressive draft building (show cumulative translation)

## Implementation Order & Timeline

### Week 1: Phase 1 (Dynamic Phrases)
- Update Understanding Guide with fallback logic
- Add phrase extraction function
- Test with Ruth 1:1 to ensure no regression
- Test with Ruth 1:2 to verify it works

### Week 2: Phase 2 (Navigation)
- Add verseQueue to workflow
- Implement verse progression logic
- Add "Continue to next verse" option after checking

### Week 3: Phase 3 (Settings)
- Add scope question to Settings Guide
- Populate verseQueue based on choice
- Update progress indicators

### Week 4: Phase 4 & 5 (Optimization)
- Smart context handling
- Batch operations
- Performance testing with full chapter

## Backwards Compatibility Guarantees

1. **Default behavior unchanged:** Without selecting multi-verse, works exactly as now
2. **Ruth 1:1 phrases preserved:** Fallback ensures verse 1 works identically
3. **Progressive enhancement:** Each phase adds capability without breaking existing
4. **Opt-in complexity:** Users must explicitly choose multi-verse
5. **Graceful degradation:** If dynamic extraction fails, falls back to manual entry

## Code Changes Required

### Understanding Guide:
```javascript
// Add at start of systemPrompt
CHECK FOR PHRASES:
1. If workflow.currentPhrases exists and has items → use those
2. If currentVerse === "Ruth 1:1" and no currentPhrases → use default 5
3. Otherwise → extract dynamically from verse text

DYNAMIC EXTRACTION:
- Split verse at punctuation and conjunctions
- Aim for 3-7 meaningful chunks
- Each chunk 3-10 words
- Store in workflow.currentPhrases
```

### Canvas Scribe:
```javascript
// Track multi-verse progress
When saving completed verse:
- Add to completedVerses array
- Update progress: "2 of 5 verses complete"
```

### Orchestrator:
```javascript
// Detect multi-verse completion
If checking phase complete AND verseQueue not empty:
- Announce: "Verse 1 complete! Moving to verse 2..."
- Update currentVerse
- Reset currentPhrases
- Transition back to Understanding phase
```

## Risk Assessment

### Zero Risk Items:
- ✅ Ruth 1:1 continues working exactly as is
- ✅ Single verse flow unchanged
- ✅ All changes are additive/optional

### Low Risk Items:
- ⚠️ Phrase extraction quality for other verses
  - Mitigation: Fallback to manual if poor extraction
- ⚠️ Performance with full book (31 verses)
  - Mitigation: Add progress saves, allow resuming

### Benefits:
- 📈 10x more valuable (5 verses vs 1)
- 📈 31x more valuable (full book)
- 📈 Demonstrates scalability
- 📈 Real translation work possible
- 📈 Same effort, more output

## Testing Strategy

1. **Regression Testing:**
   - Run Ruth 1:1 through current flow
   - Verify identical behavior
   - Check all phases work as before

2. **Progressive Testing:**
   - Test Ruth 1:2 alone
   - Test Ruth 1:1-2 sequence
   - Test Ruth 1:1-5 sequence
   - Test full chapter

3. **Edge Cases:**
   - Verse with 10+ phrases
   - Verse with 2 phrases
   - User quitting mid-sequence
   - Resuming saved session

## Success Metrics

- Ruth 1:1 success rate unchanged (baseline)
- 80%+ success rate for verses 2-5
- 70%+ completion rate for 5-verse sequence
- No increase in error rates
- No performance degradation for single verse

## Conclusion

This plan allows us to:
1. Keep everything working for Ruth 1:1
2. Progressively add multi-verse support
3. Eventually handle any Bible passage
4. Ship improvements incrementally
5. Maintain backwards compatibility

The key insight: **Default to current behavior, enhance optionally**
