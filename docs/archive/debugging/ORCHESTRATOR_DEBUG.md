# Orchestrator Debug - Canvas Scribe Not Being Called

## Problem

The Canvas Scribe is not being called when users provide specific settings like "Spanish", "Hebrew", "Grade 3", etc.

## What We've Fixed So Far

### 1. Canvas Scribe Response Format ✅

- Removed quotes from response examples (was returning `"Noted!"` instead of `Noted!`)
- Now returns plain text acknowledgments

### 2. Orchestrator Rules ✅

- Added explicit examples for language names
- Added "SIMPLE RULE" for short answers in planning phase
- Enhanced critical rules to explicitly include language settings

### 3. Netlify Blobs Store ✅

- Fixed initialization for production environment
- Simplified store configuration

## Current Issue

Despite the fixes, the orchestrator is still only calling the primary agent when users provide settings.

## Test Commands

### Test Orchestrator Decision (After Deployment):

```bash
# Test with Spanish language setting
curl -X POST https://conversational-bible-translation-poc.netlify.app/.netlify/functions/conversation \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Spanish",
    "history": [
      {"role": "assistant", "content": "What language would you like for our conversation?"}
    ]
  }' | jq '.agentResponses'
```

Expected: Should see both "primary" and "state" in agentResponses
Actual: Only seeing "primary"

### Test with Grade Setting:

```bash
curl -X POST https://conversational-bible-translation-poc.netlify.app/.netlify/functions/conversation \
  -H "Content-Type: application/json" \
  -d '{"message": "Grade 3", "history": []}' | jq '.'
```

## Possible Remaining Issues

1. **Orchestrator Model Issue**: The orchestrator might need more explicit instructions or a different prompt structure

2. **Context Not Being Passed**: The orchestrator might not be receiving the conversation history properly

3. **Phase Detection**: The orchestrator might not know it's in the "planning" phase

4. **GPT Model Behavior**: GPT-4o-mini might be interpreting the rules differently than expected

## Next Steps to Debug

1. **Add Logging**: Log what the orchestrator receives and decides
2. **Test Orchestrator Directly**: Create a test that calls just the orchestrator agent
3. **Simplify Rules**: Make the rules even more explicit and simple
4. **Force State Agent**: Temporarily always include state agent during planning phase

## Workaround Ideas

1. **Pattern Matching**: Use regex to detect short answers and force state agent inclusion
2. **Keyword Detection**: Look for specific keywords like language names
3. **Always Include in Planning**: During planning phase, always include state agent
4. **Direct Check**: Check message length and content before orchestrator
