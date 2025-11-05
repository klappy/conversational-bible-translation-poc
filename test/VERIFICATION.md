# Conversation Persistence Testing

## The Problem

The conversation persistence feature had multiple claimed "fixes" but the issues persisted:
1. Initial greeting message disappears
2. Quick responses get wiped
3. Suggestions show as "Translation Assistant" instead of "Suggestion Helper"
4. Messages duplicate on refresh

## How to Verify The Fix

### Run Automated Tests

```bash
# Run all conversation persistence tests
npx playwright test conversation-persistence-test.spec.js

# Run with UI to see what's happening
npx playwright test conversation-persistence-test.spec.js --ui

# Run specific test
npx playwright test -g "Initial greeting appears"
```

### What Tests Verify

1. **Initial Greeting Test**: Confirms greeting message appears on first load
2. **Greeting Persistence Test**: Confirms greeting survives page refresh
3. **Quick Response Test**: Confirms suggestions appear and are visible
4. **Agent Attribution Test**: Confirms suggestions labeled as "Suggestion Helper" NOT "Translation Assistant"
5. **Message Persistence Test**: Confirms all messages survive refresh
6. **No Duplicates Test**: Confirms messages don't multiply on refresh
7. **Suggestions Persist Test**: Confirms quick response history is preserved
8. **Full Flow Test**: End-to-end test of complete conversation flow

### Screenshots

All tests automatically save screenshots to `test/screenshots/` with timestamps:
- `initial-greeting-*.png` - First load greeting
- `greeting-after-refresh-*.png` - Greeting after refresh
- `quick-responses-*.png` - Suggestions visible
- `suggestion-attribution-*.png` - Agent labels
- `messages-persist-*.png` - Messages after refresh
- `no-duplicates-*.png` - No duplicate messages
- `suggestions-persist-*.png` - Preserved suggestions
- `step1-greeting-*.png` through `step4-after-refresh-*.png` - Full flow steps

### Manual Testing Steps

If automated tests pass but you want to verify manually:

1. **Start dev server**:
   ```bash
   npm run dev:netlify
   ```

2. **Open browser to** `http://localhost:9999`

3. **Test 1: Initial Greeting**
   - You should see a greeting message immediately
   - Take screenshot
   - ✅ PASS if greeting appears
   - ❌ FAIL if no message or blank screen

4. **Test 2: Enter Name**
   - Type your name and send
   - Wait for response
   - Take screenshot
   - ✅ PASS if response appears
   - ❌ FAIL if nothing happens or message disappears

5. **Test 3: Refresh Page**
   - Press F5 or refresh button
   - Wait 3 seconds for page to load
   - Take screenshot
   - ✅ PASS if ALL previous messages still visible (greeting + your name + response)
   - ❌ FAIL if any messages disappeared

6. **Test 4: Check Quick Responses**
   - Look for suggestion buttons/chips
   - Take screenshot
   - ✅ PASS if suggestions visible
   - ❌ FAIL if no suggestions

7. **Test 5: Agent Attribution**
   - Look at who sent the suggestions
   - Should show "Suggestion Helper" icon 💡
   - Should NOT show "Translation Assistant" icon 📖
   - Take screenshot
   - ✅ PASS if correct agent shown
   - ❌ FAIL if wrong agent or no agent shown

8. **Test 6: Click Suggestion**
   - Click one of the suggestions
   - Wait for response
   - Refresh page
   - Take screenshot
   - ✅ PASS if suggestion history preserved
   - ❌ FAIL if suggestion disappeared

9. **Test 7: No Duplicates**
   - Refresh page 3 times
   - Count messages each time
   - Take screenshot after each refresh
   - ✅ PASS if count stays the same
   - ❌ FAIL if messages multiply

### Report Results

After running tests, please share:
1. Test output (pass/fail for each test)
2. Screenshots from `test/screenshots/` directory
3. Any console errors you see
4. Playwright HTML report: `npx playwright show-report`

## Next Steps

**If tests PASS**: The fix is verified and working
**If tests FAIL**: Share results and I'll fix the actual root cause

No more "it should work" without proof. Tests first, claims after.
