# Production Issue Identified 🔴

## The Problem

Your production deployment at `https://conversational-bible-translation.netlify.app` is returning **HTTP 404** on all Netlify Functions:

```
❌ FAILED: HTTP 404
Response: "Not Found"
```

This means the Netlify Functions endpoints are not accessible.

---

## What's Happening

When a user tries to interact with the app on production:
1. Frontend sends request to `/.netlify/functions/conversation`
2. Netlify responds with 404 (Not Found)
3. No agent responses → UI appears broken
4. Works fine locally because `npm run dev:netlify` serves functions correctly

---

## Most Likely Causes (in order)

### 1. ⚠️ **OPENAI_API_KEY Not Set** (Most Common)
Even if functions deploy, if `OPENAI_API_KEY` is missing, they return 500 errors or functions don't deploy correctly.

**Check:**
- Netlify Dashboard → Site Settings → Build & Deploy → Environment
- Is `OPENAI_API_KEY` listed?

**Fix:**
```
1. Go to Netlify Dashboard
2. Site Settings → Build & Deploy → Environment
3. Edit Variables → Add OPENAI_API_KEY
4. Value = Your OpenAI API key
5. Trigger new deploy
```

### 2. ⚠️ **Functions Didn't Deploy**
The `netlify/functions` directory might not be getting bundled during build.

**Check:**
- Netlify Dashboard → Deploys → Latest Deploy
- View Deploy Log
- Search for "Functions to build"
- Should show: `canvas-state`, `conversation`

**Fix:**
- Verify `netlify.toml` exists with:
```toml
[build]
  functions = "netlify/functions"
```

### 3. ⚠️ **Build Configuration Wrong**
The `netlify.toml` might be pointing to wrong directory.

**Check `netlify.toml`:**
```toml
[build]
  command = "npm run build"
  functions = "netlify/functions"
  publish = "dist"
```

---

## Step-by-Step Fix

### Step 1: Check Environment Variables
```
1. Open https://app.netlify.com/
2. Select your site
3. Click "Site Settings" (left sidebar)
4. Click "Build & Deploy"
5. Click "Environment"
6. Do you see OPENAI_API_KEY? (MUST be set)
```

**If missing:**
```
1. Click "Edit Variables"
2. Add variable: OPENAI_API_KEY
3. Add your OpenAI API key as value
4. Save
5. Go to Deploys → Trigger Deploy → Deploy Site
```

### Step 2: Verify Build Works Locally
```bash
npm run dev:netlify
# Visit http://localhost:8888
# Test the app locally
# If it works here but not on production, it's an environment issue
```

### Step 3: Check Netlify Logs
```
1. Netlify Dashboard → Deploys → Latest Deploy
2. Click "View Deploy Log"
3. Search for errors:
   - "functions not found"
   - "Cannot find module"
   - "OPENAI_API_KEY"
```

### Step 4: Test Production Diagnostics
```bash
node test/diagnose-production.js https://your-site.netlify.app
```

Expected output when fixed:
```
✅ PASSED: Endpoint responds (HTTP 200)
✅ Got 3 message(s)
✅ Agents called: primary, state, suggestions
```

### Step 5: Trigger Clean Deploy
```
1. Netlify Dashboard → Deploys
2. Click "Trigger Deploy" → "Clear Cache and Deploy Site"
3. Wait for build to complete
4. Retest with diagnostics
```

---

## Quick Checklist

Before demoing again:

- [ ] OPENAI_API_KEY is set on Netlify
- [ ] Latest code is deployed (check git log)
- [ ] Build shows ✅ status (no errors)
- [ ] Run `node test/diagnose-production.js` shows green checks
- [ ] Testing with actual API key, not placeholder

---

## Testing Locally First

Always verify locally works before checking production:

```bash
# Terminal 1: Start dev server
npm run dev:netlify

# Terminal 2: Test it
node test/diagnose-production.js http://localhost:8888

# Should see all green ✅
```

If this works but production doesn't → environment variable issue
If this fails → code/function issue

---

## Diagnostic Output

Run this command to get detailed information:

```bash
node test/diagnose-production.js https://your-site.netlify.app
```

Share the output if you're stuck. It will show:
- ✅/❌ Status of each endpoint
- Which agents are/aren't responding
- Response structure validation
- Suggestions for fixes

---

## The Real Issue (TL;DR)

**Local works, production doesn't** = Usually environment variables

**Both fail** = Function deployment issue

**Check these in order:**
1. Is `OPENAI_API_KEY` set on Netlify?
2. Do functions show in Netlify Dashboard?
3. Do build logs show errors?
4. Did you trigger a deploy AFTER setting variables?

Most likely: You set the API key but didn't redeploy. Just click "Trigger Deploy" on Netlify.

---

## Next Actions

1. ✅ Check OPENAI_API_KEY on Netlify
2. ✅ Trigger a new deploy if you added it
3. ✅ Wait 2-3 minutes for deploy
4. ✅ Run: `node test/diagnose-production.js`
5. ✅ If green: You're good! Demo away
6. ✅ If red: Share the output in Netlify logs

Good luck with your demo! 🚀

