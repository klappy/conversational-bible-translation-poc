# Testing Guide for Multi-Agent System (v0.3.0)

## Quick Test Checklist

### 1. Agent Visibility

- [ ] Open http://localhost:5173
- [ ] Check that Agent Status panel appears
- [ ] Verify agents show as "Ready" or "Inactive"
- [ ] Start a conversation - agents should show "Thinking..."

### 2. Basic Conversation Flow

- [ ] Type "1" or "Use these settings and begin"
- [ ] Observe multiple agents responding
- [ ] Check that messages show agent attribution (icon + name)
- [ ] Verify Primary Translator (📖 Blue) is main responder

### 3. State Management

- [ ] Watch the Canvas panels (Style Guide, Glossary, Scripture)
- [ ] When you confirm settings, Style Guide should update
- [ ] As terms are discussed, Glossary should populate
- [ ] Scripture Canvas should show verses when discussed

### 4. Phase Transitions

- [ ] Planning Phase: Confirm translation settings
- [ ] Understanding Phase: Should show verse text first
- [ ] Check that phase indicator updates in header

## Test Scenarios

### Scenario 1: Basic Translation Setup

```
1. Start fresh conversation
2. Type: "1" (use default settings)
3. Expected:
   - Style Guide updates with Grade 1, English→English
   - Workflow moves to Understanding phase
   - Agent status shows active agents
```

### Scenario 2: Understanding Phase

```
1. After setup, conversation moves to Understanding
2. Expected:
   - Ruth 1:1 text is presented
   - Questions are comprehension-based
   - NOT asking for themes or personal meaning
   - Working phrase-by-phrase
```

### Scenario 3: Glossary Population

```
1. During Understanding, discuss "judges"
2. Expected:
   - Term appears in Glossary
   - Definition captured from conversation
   - State persists (check after 2 seconds)
```

### Scenario 4: Multi-Agent Response

```
1. Ask: "What does the Hebrew word mean?"
2. Expected:
   - Resource Agent (📚 Indigo) may activate
   - Multiple agents might respond
   - Clear visual differentiation
```

## Debugging

### If agents aren't responding:

1. Check browser console for errors
2. Verify OPENAI_API_KEY is set
3. Check network tab for API calls
4. Look for fallback to single-agent mode

### If state isn't updating:

1. Check polling is happening (every 2 seconds)
2. Verify canvas-state endpoint is accessible
3. Look for state updates in network requests
4. Check browser console for polling errors

### If visual attribution is missing:

1. Verify AgentMessage component is rendering
2. Check that agent data is in response
3. Look for CSS loading issues
4. Verify icons are displaying

## API Endpoints to Test

### Canvas State

```bash
# Get current state
curl http://localhost:9999/.netlify/functions/canvas-state

# Check state history
curl http://localhost:9999/.netlify/functions/canvas-state/history
```

### Conversation

```bash
# Test multi-agent conversation
curl -X POST http://localhost:9999/.netlify/functions/conversation \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "history": []}'
```

## Performance Checks

- [ ] Response time under 5 seconds
- [ ] Polling doesn't freeze UI
- [ ] Smooth scrolling in chat
- [ ] Agent status updates quickly
- [ ] No memory leaks (check after 10 min)

## Edge Cases

1. **Rapid input**: Send multiple messages quickly
2. **Long responses**: Check formatting and scrolling
3. **Network interruption**: Disconnect/reconnect
4. **State conflicts**: Open in two tabs
5. **Agent failures**: Test with invalid API key

## Success Criteria

✅ Agents are visually distinct
✅ Conversation flows naturally
✅ State updates reliably
✅ Canvas artifacts populate
✅ System falls back gracefully on errors

---

_Testing v0.3.0 Multi-Agent Architecture_
_Last Updated: October 17, 2025_
