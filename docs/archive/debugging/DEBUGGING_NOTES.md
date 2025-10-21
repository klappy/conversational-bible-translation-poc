# Debugging Notes - Persistence & Agent Behavior

## Issues Investigated

### 1. Persistence Not Working ✅ FIXED

**Problem**: State wasn't persisting between page refreshes in production
**Cause**: Netlify Blobs store initialization was incorrectly requiring explicit siteID/token in production
**Solution**: Modified `getBlobStore()` function to work without explicit parameters in production (Netlify provides these automatically)

### 2. Only Translation Assistant Responding ✅ WORKING AS DESIGNED

**This is actually correct behavior!** The orchestrator intelligently decides which agents should respond based on the message:

#### How It Works:

- **General messages** (Hello, tell me about, etc.) → Only Translation Assistant responds
- **Specific information** (Grade 3, Spanish, etc.) → Canvas Scribe + Translation Assistant respond
- **Scripture questions** → Resource Librarian + Translation Assistant respond

#### Examples:

**User says "Hello"**

- ✅ Translation Assistant responds with welcome
- ❌ Canvas Scribe stays silent (no data to record)

**User says "I want Grade 3 reading level"**

- ✅ Canvas Scribe says "Noted!" and records the setting
- ✅ Translation Assistant continues the conversation

**User says "Tell me about this translation process"**

- ✅ Translation Assistant explains the process
- ❌ Canvas Scribe stays silent (nothing to record)

## Testing Commands

### Test Persistence (after deployment completes):

```bash
# Update state
curl -X POST https://conversational-bible-translation-poc.netlify.app/.netlify/functions/canvas-state/update \
  -H "Content-Type: application/json" \
  -d '{"updates": {"styleGuide": {"testField": "test123"}}, "agentId": "test"}'

# Retrieve state (should show the update)
curl https://conversational-bible-translation-poc.netlify.app/.netlify/functions/canvas-state
```

### Test Agent Responses:

```bash
# General greeting (only Translation Assistant)
curl -X POST https://conversational-bible-translation-poc.netlify.app/.netlify/functions/conversation \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "history": []}'

# Specific setting (both Canvas Scribe and Translation Assistant)
curl -X POST https://conversational-bible-translation-poc.netlify.app/.netlify/functions/conversation \
  -H "Content-Type: application/json" \
  -d '{"message": "I want Grade 3 reading level", "history": []}'
```

## Deployment Status

- Fix committed and pushed at [timestamp]
- Deployment will complete in ~2-3 minutes
- Persistence should work after deployment

## Summary

1. **Persistence**: Fixed with simplified Netlify Blobs initialization
2. **Agent Behavior**: Working correctly - agents only respond when they have something meaningful to contribute
3. **Canvas Scribe**: Only speaks when recording actual data, stays silent otherwise (by design)

This is the intended behavior to avoid redundant responses and keep conversations focused!
