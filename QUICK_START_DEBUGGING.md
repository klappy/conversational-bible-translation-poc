# Quick Start: Debugging Production Issues

## TL;DR

Your production site is showing **404 errors** on Netlify Functions. Here's the fix:

### 1-Minute Fix

```bash
# 1. Check if OPENAI_API_KEY is set
# Go to: https://app.netlify.com/ → Your Site → Site Settings → Build & Deploy → Environment
# 
# If OPENAI_API_KEY is missing:
#   - Click "Edit Variables"
#   - Add key: OPENAI_API_KEY
#   - Add value: your-openai-api-key
#   - Save

# 2. Trigger a new deploy
# Go to: https://app.netlify.com/ → Deploys → "Trigger Deploy" → "Deploy Site"

# 3. Wait 2-3 minutes for deploy to complete

# 4. Run this to verify it works
node test/diagnose-production.js https://your-site.netlify.app

# Should show: ✅ PRODUCTION DEPLOYMENT LOOKS GOOD!
```

---

## What's Wrong

- ❌ **Local works** but **production doesn't**
- ❌ Getting **HTTP 404** on endpoints
- ❌ No **agent responses** in UI
- ✅ **Likely cause**: Missing `OPENAI_API_KEY` on Netlify

---

## 3-Step Fix

### Step 1: Add Environment Variable
```
1. Open https://app.netlify.com/
2. Select your site
3. Click "Site Settings" (left sidebar)
4. Click "Build & Deploy"
5. Click "Environment"
6. Click "Edit Variables"
7. Add:
   - Key: OPENAI_API_KEY
   - Value: [paste your OpenAI API key]
8. Save
```

### Step 2: Redeploy
```
1. Go back to Netlify Dashboard
2. Click "Deploys"
3. Click "Trigger Deploy" → "Deploy Site"
4. Wait for "Published" ✅ status (2-3 minutes)
```

### Step 3: Test
```bash
node test/diagnose-production.js https://your-site.netlify.app
```

Expected output:
```
✅ PASSED: Endpoint responds (HTTP 200)
✅ Got 3 message(s)
✅ Agents called: primary, state, suggestions
✅ PRODUCTION DEPLOYMENT LOOKS GOOD!
Tests Passed: 5/5 (100%)
```

---

## Testing Tools

### Automated Testing

```bash
# Test production
node test/diagnose-production.js https://your-site.netlify.app

# Test local (to compare)
npm run dev:netlify  # Terminal 1
node test/diagnose-production.js http://localhost:8888  # Terminal 2
```

### Manual Testing

```bash
# Test endpoint
curl https://your-site.netlify.app/.netlify/functions/canvas-state

# Test conversation
curl -X POST https://your-site.netlify.app/.netlify/functions/conversation \
  -H "Content-Type: application/json" \
  -d '{"message":"test","history":[]}'

# Both should return JSON, not 404
```

---

## If Still Not Working

**Check these in order:**

1. **Did deploy complete?**
   - Netlify Dashboard → Deploys
   - Latest deploy should show "Published" ✅
   - If showing error, click to see build log

2. **Is OPENAI_API_KEY set?**
   - Netlify Dashboard → Site Settings → Build & Deploy → Environment
   - Should see `OPENAI_API_KEY = [your key]`

3. **Are functions deployed?**
   - Netlify Dashboard → Functions
   - Should see `canvas-state` and `conversation`
   - If missing, check build log for errors

4. **Check Netlify logs**
   - Netlify Dashboard → Functions → Click a function name → Logs tab
   - Look for error messages
   - Common: "OPENAI_API_KEY is not set"

---

## Documentation References

For more detailed help:

| Document | Use When |
|----------|----------|
| `PRODUCTION_ISSUE_FOUND.md` | You want to understand the 404 issue |
| `PRODUCTION_DEBUGGING.md` | You need step-by-step debugging |
| `VERIFY_DEPLOYMENT.md` | You want to verify everything works |
| `test/diagnose-production.js` | You want automated testing |

---

## Common Issues & Quick Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| 404 errors | OPENAI_API_KEY not set | Add to environment, redeploy |
| 404 errors | Functions not deployed | Check netlify.toml, rebuild |
| 500 errors | API key invalid | Verify key is correct |
| Timeout errors | OpenAI API slow | Check status page, retry |
| No agents respond | Environment vars not loaded | Redeploy after adding vars |

---

## Before Demo

```bash
# Run this 30 minutes before demo
node test/diagnose-production.js https://your-site.netlify.app

# If you see 5/5 green ✅ → You're ready to demo!
# If you see any ❌ → Read PRODUCTION_ISSUE_FOUND.md
```

---

## During Demo

If something breaks:
1. Check browser console (F12)
2. Refresh page
3. Wait 30 seconds (might be rate limiting)
4. If still broken → Switch to local: `npm run dev:netlify`

---

**That's it!** Most likely it just needs the API key set and a redeploy. You'll be good in 5 minutes. 🚀

