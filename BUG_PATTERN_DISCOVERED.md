# Bug Pattern - Session ID Double-Prefix

## The Pattern (Happened 3+ Times)

### Symptom
State persistence fails - settings are not saved, users get stuck in repetition loops

### Root Cause  
Session IDs get double-prefixed with "session_":
- Frontend generates: `session_1234567_abc`
- Backend adds prefix: `session_` + `session_1234567_abc`
- Result: `session_session_1234567_abc`
- Updates save to one key, reads come from another
- Nothing persists

### How It Breaks
```javascript
// Frontend (sessionManager.js)
sessionId = `session_${timestamp}_${random}`;  // session_123_abc

// Backend (canvas-state.js) - WRONG
return `session_${sessionId}`;  // session_session_123_abc
```

### The Fix (Oct 21, 2025)
```javascript
// canvas-state.js - Check before adding prefix
if (!sessionId) return "default";
return sessionId.startsWith("session_") ? sessionId : `session_${sessionId}`;
```

### Why This Keeps Happening
1. Session management has two layers (frontend gen + backend storage key)
2. Easy to forget which layer adds the prefix
3. No visual indication when keys don't match
4. Blobs returns defaults silently when key doesn't exist

### Prevention
- **Always check**: Does the incoming session ID already have "session_" prefix?
- **Document clearly**: Which layer is responsible for prefixing
- **Test**: Verify session_X updates and session_X reads use SAME key

### Test That Proves It Works
```bash
curl -X POST .../conversation -H "X-Session-ID: session_test" -d '{"message": "Spanish", ...}'
# Should save to: session_test (not session_session_test)

curl .../canvas-state -H "X-Session-ID: session_test"  
# Should read from: session_test
# Should return: "Spanish"
```

### Evidence From Testing
- ✅ session_flow: Spanish + Grade 5 both saved
- ✅ session_finaltest: Zulu saved
- ✅ Multiple settings persist in same session
- ✅ State survives across requests

---

**Pattern Identified:** October 21, 2025  
**Times This Bug Appeared:** 3+  
**Time to Fix Each Time:** 1-2 hours  
**Time Saved By Documentation:** Future fixes should take <15 min

