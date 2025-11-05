# Deployment Verification Checklist

Use this guide to verify everything is working correctly on production.

---

## Quick Verification (2 minutes)

### 1. Run Production Diagnostics

```bash
node test/diagnose-production.js https://your-site.netlify.app
```

**Expected Output:**
```
✅ PASSED: Endpoint responds (HTTP 200)
✅ Got 3 message(s)
✅ Agents called: primary, state, suggestions
✅ PRODUCTION DEPLOYMENT LOOKS GOOD!
Tests Passed: 5/5 (100%)
```

**If you see ❌ or ⚠️:**
- Read `PRODUCTION_ISSUE_FOUND.md`
- Most likely: OPENAI_API_KEY not set
- Or: Need to trigger new deploy

---

## Manual Testing Steps

### Step 1: Verify Endpoints Respond

```bash
# Test canvas-state
curl https://your-site.netlify.app/.netlify/functions/canvas-state

# Test conversation
curl -X POST https://your-site.netlify.app/.netlify/functions/conversation \
  -H "Content-Type: application/json" \
  -d '{"message":"","history":[]}'
```

**Expected:** Both return JSON (status 200), not 404 or 500

---

### Step 2: Test Through the UI

1. Visit https://your-site.netlify.app
2. You should see: "Hello! I'm here to help you translate the book of Ruth"
3. Click the input box and type: "Chris"
4. Submit and watch for response
5. **Expected:** "Great to meet you, Chris!" and suggestions should appear

---

### Step 3: Test Full Workflow (5-minute test)

```
1. App says: "Hello! I'm here to help you translate the book of Ruth. What's your name?"
   → Type: "Chris"

2. App says: "Wonderful to meet you, Chris! Let's set up your translation. What language would 
   you like to use for our conversation?"
   → Type: "English"

3. App says: "Great! What language are we translating FROM?"
   → Type: "English"

4. App says: "Perfect! What language are we translating TO?"
   → Type: "Spanish"

5. Continue through all 7 settings

6. At the end, app should say: "Let's begin understanding the text"
   → Click "Continue"

7. App should present the verse from Ruth 1:1

✅ If all this works = Deployment is good!
```

---

## Netlify Dashboard Checks

### Check 1: Environment Variables

**Navigate:**
1. https://app.netlify.com/ → Your Site
2. Site Settings → Build & Deploy → Environment

**Must have:**
- ✅ `OPENAI_API_KEY` = [your key]

**If missing:**
1. Click "Edit Variables"
2. Add `OPENAI_API_KEY`
3. Go to Deploys → Trigger Deploy

---

### Check 2: Latest Deploy

**Navigate:**
1. https://app.netlify.com/ → Your Site
2. Deploys tab

**Should see:**
- ✅ Latest deploy: Published (green checkmark)
- ✅ No errors in status
- ✅ Deployment time recent (after your code changes)

**View deploy log:**
1. Click latest deploy
2. Look for: "Functions to build"
3. Should see: `canvas-state` and `conversation`

---

### Check 3: Function Status

**Navigate:**
1. https://app.netlify.com/ → Your Site
2. Functions tab

**Should see:**
- ✅ `canvas-state.js` listed
- ✅ `conversation.js` listed
- ✅ No error messages

**If missing:**
- Functions didn't deploy
- Check Build Log for errors
- Verify `netlify.toml` is correct

---

## Performance Checks

### Response Time Test

Run this several times and note the times:

```bash
time curl -X POST https://your-site.netlify.app/.netlify/functions/conversation \
  -H "Content-Type: application/json" \
  -d '{"message":"test","history":[]}'
```

**Expected:**
- First response: 2-5 seconds (cold start)
- Subsequent: 1-2 seconds
- Maximum: 10 seconds

**If timing out (>15s):**
- Check Netlify Function Logs
- Look for slow API calls
- May be hitting rate limits

---

## Debugging: If Something's Wrong

### Scenario 1: Getting 404

**Check:**
```bash
# 1. Are functions deployed?
https://app.netlify.app → Functions tab → Do you see them listed?

# 2. Is netlify.toml correct?
cat netlify.toml
# Should have: functions = "netlify/functions"

# 3. Did you deploy after setting env vars?
https://app.netlify.app → Deploys → Is latest deploy after env var change?
```

**Fix:**
1. If env var was just added → Trigger new deploy
2. If netlify.toml wrong → Fix and push
3. If functions missing → Check build log

---

### Scenario 2: Getting 500 with No Details

**Check Netlify Logs:**
```
1. https://app.netlify.com/ → Your Site
2. Functions tab
3. Click a function name (e.g., `conversation`)
4. Click Logs tab
5. Find error messages
```

**Common errors:**
```
"Error: OPENAI_API_KEY is not set"
→ Add to environment variables

"Error: Cannot find module 'openai'"
→ Dependencies issue, check build

"Error: Connect timeout"
→ OpenAI API slow or unreachable
```

---

### Scenario 3: App Loads but No Responses

**Check:**
```bash
# 1. Run diagnostics
node test/diagnose-production.js https://your-site.netlify.app

# 2. Check browser console
Open: https://your-site.netlify.app
Press F12 → Console tab
Look for error messages

# 3. Check network tab
F12 → Network tab
Trigger an action
Look for failed requests
What's the response?
```

**Likely issues:**
- CORS headers missing → Check conversation.js
- API timeout → Check OpenAI status
- Invalid API key → Verify OPENAI_API_KEY

---

## Final Verification Checklist

Before declaring it "ready for demo":

- [ ] ✅ Diagnostics show 100% pass rate
- [ ] ✅ UI loads and greets user
- [ ] ✅ Can send name and get response
- [ ] ✅ Settings collection works
- [ ] ✅ Can complete a full workflow
- [ ] ✅ Functions visible in Netlify Dashboard
- [ ] ✅ OPENAI_API_KEY set in environment
- [ ] ✅ Latest deploy shows green ✅
- [ ] ✅ Response times are reasonable (<5s)
- [ ] ✅ No console errors in browser

---

## Quick Commands for Verification

```bash
# Full diagnostics
node test/diagnose-production.js https://your-site.netlify.app

# Quick endpoint test
curl https://your-site.netlify.app/.netlify/functions/canvas-state | head -50

# Response time check
time curl -X POST https://your-site.netlify.app/.netlify/functions/conversation \
  -H "Content-Type: application/json" \
  -d '{"message":"test","history":[]}'

# Check local first (to compare)
npm run dev:netlify  # Terminal 1
node test/diagnose-production.js http://localhost:8888  # Terminal 2
```

---

## Demo Day Preparation

**30 minutes before demo:**

```bash
# 1. Run full diagnostics
node test/diagnose-production.js https://your-site.netlify.app

# 2. Test manually
- Visit the URL
- Type a name
- See response

# 3. If all green → You're ready!

# 4. If any red → Check PRODUCTION_ISSUE_FOUND.md
```

---

## Issues During Demo

**If agents stop responding during demo:**

1. Wait 30 seconds (might be rate limited)
2. Refresh browser
3. Check Netlify Function Logs for errors
4. If still broken, switch to local demo: `npm run dev:netlify`

---

## After Demo

**If demo went well:**
- ✅ You're done! Users can use it.

**If issues were found:**
1. Note what failed
2. Read the error messages in Netlify logs
3. Fix and redeploy
4. Rerun diagnostics to verify

---

**You've got this! 🚀**

Any questions? Check:
- `PRODUCTION_ISSUE_FOUND.md` - Specific issue diagnosis
- `PRODUCTION_DEBUGGING.md` - In-depth troubleshooting
- `test/diagnose-production.js` - Automated testing

