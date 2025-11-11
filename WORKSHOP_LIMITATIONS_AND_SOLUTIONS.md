# Workshop Limitations and Proposed Solutions

## Current Critical Limitations

### 1. Hardcoded for Ruth 1:1 Only
**Problem:** The system only knows 5 specific phrases from Ruth 1:1
- Understanding Guide looks for those exact 5 phrases
- Canvas Scribe expects those exact 5 as keys
- Draft Builder assumes those specific phrases
- **Will break immediately on verse 2 or any other passage**

**Current Boundaries Users Should Know:**
- Workshop currently only handles Ruth 1:1
- Moving to verse 2+ will cause phrase exploration to fail
- Cannot handle other books or chapters
- Limited to exactly 5 phrases (hardcoded)

### 2. No Self-Correction Mechanism
**Problem:** We're trying to predict and hardcode every edge case
- Leads to brittle, complex code
- Still misses edge cases
- No recovery when things go wrong
- Accumulating technical debt with each "fix"

## Proposed Solutions

### Solution 1: Process Monitor Agent
Create a "Process Monitor" or "Quality Assurance" agent that:

**Responsibilities:**
- Validates glossary entries (ensures source→target mapping)
- Detects and fixes malformed data
- Identifies stuck loops and intervenes
- Monitors phase transitions for correctness
- Acts as safety net for all other agents

**How it works:**
```
1. Runs after each agent interaction
2. Checks data integrity:
   - Glossary: source phrase → user interpretation (not duplicate)
   - Phase transitions: actually saved
   - Progress tracking: moving forward
3. If issues detected:
   - Corrects data silently
   - OR alerts user "I noticed an issue and fixed it"
4. Prevents cascading failures
```

**Benefits:**
- Self-healing system
- Catches edge cases we didn't predict
- Reduces need for hardcoding every scenario
- More robust and antifragile

### Solution 2: Dynamic Verse Handling
Redesign Understanding Guide to handle ANY verse:

**Current (Brittle) Approach:**
```javascript
THE 5 PHRASES FOR RUTH 1:1:
1. "In the days when the judges ruled"
2. "there was a famine in the land"
...hardcoded list
```

**Proposed (Flexible) Approach:**
```javascript
DYNAMIC PHRASE EXTRACTION:
1. Receive verse text from Resource Librarian
2. Split verse into meaningful phrases (3-7 words typically)
3. Store phrases in context for this session
4. Work through them systematically
5. No hardcoded phrases - works with ANY verse
```

**Algorithm:**
1. When verse is presented, parse it into phrases
2. Save phrase list to workflow context
3. Understanding Guide uses that dynamic list
4. Canvas Scribe maps whatever phrases were identified
5. Continue to next verse with new phrase set

**Benefits:**
- Works with any verse in any book
- Handles varying phrase counts
- Allows continuous translation
- No hardcoded dependencies

## Implementation Priority

### Immediate (for shipping):
- **Document current limitations clearly**
- Warn users: "This workshop is designed for Ruth 1:1 as a proof of concept"
- Set expectations: "For multiple verses, you may need to restart"

### Short-term (next iteration):
- **Add Process Monitor agent** - easier to implement, big stability gain
- Monitor and correct data issues automatically
- Prevent infinite loops and stuck states

### Long-term (proper fix):
- **Implement dynamic verse handling** - requires significant refactoring
- Extract phrases dynamically from any verse
- Enable multi-verse and multi-chapter workflows
- True flexibility for any Bible passage

## Current Workarounds for Users

If users want to continue past Ruth 1:1:
1. Complete verse 1 fully (through checking)
2. Save/export their work
3. Refresh and start new session for verse 2
4. Manual process but functional

## Recommendation

**For now:** Ship with clear boundaries communicated
**Next sprint:** Add Process Monitor for self-correction
**Future release:** Dynamic verse handling for true flexibility

The Process Monitor approach aligns with KISS and Antifragile principles - instead of predicting every failure, build a system that detects and recovers from failures.
