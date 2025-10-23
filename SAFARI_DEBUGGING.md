# Safari Debugging Guide

If the app isn't working in Safari (especially on mobile or in Private Browsing), follow these steps:

## Quick Diagnosis

### Open Safari's Web Inspector / Console

**On Mac:**
1. Safari → Settings → Advanced → Show Develop menu
2. Develop → Show JavaScript Console (Cmd+Option+C)
3. Reload the app

**On iPhone/iPad:**
1. Settings → Safari → Advanced → Web Inspector (enable)
2. Connect device to Mac via cable
3. Open Safari on Mac → Develop → [Your Device] → [The Tab]

### What to Look For

#### ✅ Good Signs (Working)

Console shows:
```
📤 Sending API request with session ID: session_1234567890_abc123
```

And the session ID **stays the same** across multiple messages.

#### ⚠️ Warning Signs (localStorage blocked but fallback working)

Console shows:
```
localStorage unavailable (private browsing?), using memory storage
📤 Sending API request with session ID: session_1234567890_abc123
```

**This is OK!** The app is using memory storage. Session ID should still stay consistent.

#### ❌ Bad Signs (Not Working)

Console shows session ID **changing** on every message:
```
📤 Sending API request with session ID: session_1234567890_abc123
📤 Sending API request with session ID: session_9876543210_xyz789  ← DIFFERENT!
```

This means the session fallback isn't working. Report this with:
- Safari version
- macOS/iOS version
- Whether Private Browsing is enabled
- Full console logs

## Common Issues

### Issue 1: Private Browsing Mode

**Symptom:** Settings don't save, phase doesn't advance

**Solution:** The app should work with memory storage fallback. Check console for:
```
localStorage unavailable (private browsing?), using memory storage
```

If you don't see this warning, the fix may not be deployed yet.

**Workaround:** Use a shareable session URL instead:
1. Start in regular (non-private) Safari
2. Click "📤 Share" button
3. Copy the URL
4. Open that URL in Private Browsing mode
5. Session will persist via URL parameter

### Issue 2: "Prevent Cross-Site Tracking" Enabled

Safari's "Prevent Cross-Site Tracking" can block localStorage in some contexts.

**Check:** Safari → Settings → Privacy → Prevent Cross-Site Tracking

If enabled, the app should still work with the memory fallback.

### Issue 3: Older Safari Version

Safari versions before 14 may have localStorage bugs.

**Solution:** Update Safari/iOS to latest version, or use Chrome/Firefox as alternative.

## Verification Steps

After the fix is deployed:

1. **Open Safari (regular or private mode)**
2. **Open browser console** (see above)
3. **Navigate to the app**
4. **Start answering questions**
5. **Watch console logs** for session ID
6. **Verify:**
   - Session ID appears in console on each message
   - Session ID **does not change** between messages
   - Settings save (check by answering a few questions, then refreshing and checking if they're remembered—only if NOT in private mode)
   - Phase transitions to "understanding" after completing setup

## If It Still Doesn't Work

Please report with:

1. **Safari version:** Safari → About Safari
2. **OS version:** System Settings → General → About
3. **Device:** Mac / iPhone / iPad
4. **Browsing mode:** Regular / Private
5. **Console logs:** Copy everything from console, especially lines with 📤 or 📥
6. **Steps to reproduce:** Exactly what you clicked/typed
7. **What happened:** What you expected vs. what actually happened

The session ID and console logs are critical for debugging!
