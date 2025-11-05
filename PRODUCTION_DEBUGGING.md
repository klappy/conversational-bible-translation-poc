# Production Debugging Guide

## Current Issue: HTTP 404 on Netlify Functions

The production deployment shows **404 errors** on all Netlify Functions endpoints:
- `/.netlify/functions/conversation` → 404
- `/.netlify/functions/canvas-state` → 404

This means the functions aren't deployed or accessible.

---

## Step-by-Step Diagnosis

### Step 1: Verify Functions are Deployed

**On Netlify Dashboard:**
1. Go to https://app.netlify.com/
2. Select your site
3. Click **Functions** in the left sidebar
4. You should see:
   - `conversation.js`
   - `canvas-state.js`

**If functions are listed:**
- Click on each one
- Check the **Logs** tab for errors
- If there's a "Build Error" banner, click it to see details

**If functions are NOT listed:**
- The build didn't create them
- Go to **Deploys** tab
- Click the latest deploy → **Deploy Log**
- Look for errors like:
  - `netlify/functions not found`
  - `Build command failed`
  - `Module not found` errors

---

### Step 2: Check Build Configuration

**Verify `netlify.toml`:**

```toml
[build]
  command = "npm run build"
  functions = "netlify/functions"
  publish = "dist"
```

**Common issues:**
- ❌ `functions` path is wrong
- ❌ `publish` path points to wrong folder
- ❌ `command` doesn't create `dist`

**Fix:** Ensure these paths match your actual directories.

---

### Step 3: Verify Environment Variables

**On Netlify Dashboard:**
1. Go to **Site Settings** → **Build & Deploy** → **Environment**
2. Look for:
   - `OPENAI_API_KEY` ← Required!
   - `OPENAI_MODEL` (optional, defaults to gpt-4o-mini)

**If OPENAI_API_KEY is missing:**
1. Click **Edit Variables**
2. Add key: `OPENAI_API_KEY`
3. Add value: Your OpenAI API key
4. **Trigger a new deploy**

**Note:** Environment variables only take effect on NEW deployments!

---

### Step 4: Check Build Artifacts

**On Netlify Dashboard:**
1. Go to **Deploys** → Latest Deploy
2. Click **View Summary**
3. Under "Build details", look for:
   - ✅ `dist` folder created
   - ✅ `netlify/functions` processed
   - ❌ Any build warnings/errors

**Look at Deploy Log:**
- Search for `functions` in the log
- Should see lines like:
  ```
  Functions to build: canvas-state, conversation
  ✓ canvas-state bundled in 123ms
  ✓ conversation bundled in 456ms
  ```

---

### Step 5: Manual Function Test

**Test via cURL (from terminal):**

```bash
# Test canvas-state endpoint
curl -v https://your-site.netlify.app/.netlify/functions/canvas-state

# Should return 200 + JSON, NOT 404
```

**Expected response:**
```json
{
  "styleGuide": {...},
  "workflow": {...},
  "conversationHistory": [...]
}
```

**If you get 404:**
- Functions didn't deploy
- Go back to Step 1-4

**If you get 500:**
- Function is deployed but has an error
- Check Function Logs on Netlify
- Look for error messages

---

### Step 6: Trigger a New Deploy

Sometimes the functions just need to be re-deployed:

**Option A: Netlify UI**
1. Go to **Deploys** tab
2. Click **Trigger Deploy** → **Deploy Site**
3. Wait for build to complete
4. Retest with diagnostics

**Option B: Git Push**
```bash
git add .
git commit -m "Trigger redeploy"
git push origin main
```

**Option C: Force Clear Cache**
1. Go to **Deploys**
2. Click **Trigger Deploy** → **Clear Cache and Deploy Site**
3. This rebuilds everything from scratch

---

## Quick Checklist

- [ ] **Environment Variables Set**: OPENAI_API_KEY exists on Netlify
- [ ] **netlify.toml Correct**: Points to `netlify/functions` directory
- [ ] **Functions Listed**: Visible in Netlify Dashboard → Functions
- [ ] **No Build Errors**: Latest deploy shows ✅ status
- [ ] **Manual Test Works**: `curl` to endpoint returns data
- [ ] **Recent Deploy**: Deployed after code changes

---

## Testing Commands

### Test Diagnostics (Run Locally)

```bash
# Test against production
node test/diagnose-production.js

# Or specify URL
node test/diagnose-production.js https://your-site.netlify.app
```

### Test Local Functions

```bash
# Start local dev server
npm run dev:netlify

# In another terminal, run diagnostics against localhost
node test/diagnose-production.js http://localhost:8888
```

### Compare Local vs Production

If local works but production doesn't:

1. **Local test:**
   ```bash
   npm run dev:netlify  # Terminal 1
   node test/diagnose-production.js http://localhost:8888  # Terminal 2
   ```

2. **Production test:**
   ```bash
   node test/diagnose-production.js https://your-site.netlify.app
   ```

3. **Compare results** - they should be the same!

---

## Common Issues & Fixes

### Issue: `functions not found`
**Cause:** `netlify.toml` has wrong path  
**Fix:** 
```toml
functions = "netlify/functions"  # Must point to directory with .js files
```

### Issue: `Cannot find module 'openai'`
**Cause:** Dependencies not installed during build  
**Fix:** Ensure `netlify/functions` has its own `package.json` or uses monorepo setup

### Issue: Timeout errors
**Cause:** Function takes too long to respond  
**Fix:** Check function logs for slow operations or API timeouts

### Issue: 500 errors with no message
**Cause:** Error being swallowed  
**Fix:** Check Netlify Function Logs for actual error

### Issue: Variables undefined
**Cause:** Environment variables not set  
**Fix:** Netlify Dashboard → Environment Variables → Add variable

---

## Netlify Dashboard Navigation

**To check Functions:**
1. Open https://app.netlify.com/
2. Select your site (top left)
3. Click **Functions** (left sidebar)
4. You'll see a list of functions with status

**To view Logs:**
1. Click a function name
2. Click **Logs** tab
3. See recent invocations and errors

**To check Builds:**
1. Click **Deploys** (left sidebar)
2. Click the latest deployment
3. Click **Deploy Log** to see build output

**To set Environment Variables:**
1. Click **Site Settings** (left sidebar)
2. Click **Build & Deploy**
3. Click **Environment**
4. Click **Edit Variables**
5. Add `OPENAI_API_KEY` and value

---

## Next Steps

1. **Run diagnostics**: `node test/diagnose-production.js`
2. **Based on results:**
   - If 404 → Check netlify.toml and function deployment
   - If timeout → Check function logs for errors
   - If missing API key error → Add OPENAI_API_KEY to environment
3. **After fix:** Trigger new deploy and retest
4. **If still broken:** Share the diagnostic output in your Netlify logs

---

## Debug Output Interpretation

### Good Output (Local):
```
✅ PASSED: Endpoint responds (HTTP 200)
✅ Got 3 message(s)
✅ Agents called: primary, state, suggestions
✅ PRODUCTION DEPLOYMENT LOOKS GOOD!
```

### Bad Output (404):
```
❌ FAILED: HTTP 404
Response: "Not Found"
→ Functions didn't deploy
→ Check netlify.toml and environment setup
```

### Bad Output (500 with API error):
```
❌ FAILED: HTTP 500
Details: "Invalid API key provided"
→ OPENAI_API_KEY not set or wrong
→ Add to Netlify environment variables
```

---

**Questions?** Check the Netlify Functions documentation or reach out with the diagnostic output.

