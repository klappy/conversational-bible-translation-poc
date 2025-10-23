# State Saving Bug Fix

## Problem

As reported in the GitHub PR: "UI seems unable to store and retrieve state"

**Symptoms:**
- Conversation flows but doesn't save settings
- Doesn't move to understanding phase after completing settings questions
- Happens on both laptop and phone
- User has to repeat themselves

**Root Cause:**
The Canvas Scribe agent (powered by GPT-3.5-turbo) was instructed to return JSON format:
```json
{
  "message": "Noted!",
  "updates": {
    "styleGuide": { "userName": "Mike" }
  },
  "summary": "User name set to Mike"
}
```

But sometimes it would just return plain text like `"Noted!"` instead of the required JSON structure.

This caused the state parsing logic to fail silently—the user saw "Noted!" but the settings were never saved to the database.

## Solution

Added OpenAI's JSON mode to force reliable JSON output from all agents that require structured responses.

### Code Changes

**File:** `netlify/functions/conversation.js`

**Change:** Added `response_format: { type: "json_object" }` to the OpenAI API call for agents that must return JSON (orchestrator, primary, state).

```javascript
const completionPromise = openaiClient.chat.completions.create({
  model: agent.model,
  messages: messages,
  temperature: agent.id === "state" ? 0.1 : 0.7,
  max_tokens: agent.id === "state" ? 500 : 2000,
  // Force JSON mode for agents that must return JSON objects
  ...((agent.id === "state" || agent.id === "primary" || agent.id === "orchestrator") && {
    response_format: { type: "json_object" },
  }),
});
```

**Why this works:**
- JSON mode guarantees the model will return valid JSON
- No more silent failures where "Noted!" appears but settings aren't saved
- Phase transitions (planning → understanding) now happen reliably

**Why suggestions agent is excluded:**
- Suggestions agent returns a JSON array: `["option1", "option2", "option3"]`
- JSON mode only supports objects at the top level, not arrays
- Suggestions agent's format is simpler and less prone to failure

## Verification

To verify the fix works:

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Run the test script:
   ```bash
   node test-state-bug.js
   ```

3. Expected results:
   - ✅ All settings saved (userName, languages, reading level, tone, approach)
   - ✅ `settingsCustomized: true` after approach is set
   - ✅ `workflow.currentPhase` transitions to "understanding"

## Manual Testing

You can also test manually by:

1. Open the app in a browser
2. Answer the setup questions:
   - Name: "Test User"
   - Conversation language: "English"
   - Source language: "English"
   - Target language: "Spanish"
   - Target community: "Teens"
   - Reading level: "Grade 3"
   - Tone: "Simple and clear"
   - Approach: "Meaning-based"

3. After providing the approach, the system should:
   - Save all settings
   - Transition to understanding phase
   - Present the scripture (Ruth 1:1)
   - Start the phrase-by-phrase understanding process

## Related Files

- `netlify/functions/conversation.js` - Main fix location
- `netlify/functions/agents/registry.js` - Agent definitions and prompts
- `netlify/functions/canvas-state.js` - State persistence layer
- `test-state-bug.js` - Test script to reproduce and verify fix

## Impact

This fix resolves:
- ❌ Settings not saving
- ❌ Phase not transitioning after settings complete
- ❌ Users having to repeat themselves
- ❌ Silent failures in state updates

All of these issues stemmed from the same root cause: unreliable JSON parsing.
