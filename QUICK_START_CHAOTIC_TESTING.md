# Quick Start: Chaotic Testing

## TL;DR

I built you a test that simulates **real workshop chaos** instead of following rigid scripts.

## Running It

```bash
# Terminal 1: Start the server
npm run dev:netlify

# Terminal 2: Run the test
npm run test:chaotic          # 5 attendees (~5 min)
npm run test:chaotic:50       # 50 attendees (~1 hour)
```

## What Makes It Different

| Old Tests | New Chaotic Tests |
|-----------|-------------------|
| Hardcoded responses | Random from pools |
| Fixed sequence | Probabilistic choices |
| Same path every time | Different each run |
| Pass/fail binary | Experience quality spectrum |
| 3 personas | Infinite variations |
| Scripted conversation | Natural chaos |

## What You'll See

```
🎭 CHAOTIC WORKSHOP ATTENDEE #1: Maria
Messages Exchanged: 34
Questions Asked: 6
Backwards Moves: 2
Experience Quality: 🙂 DECENT

---

📊 AGGREGATE: 80% had decent+ experience ✅
```

## Success Threshold

**70%+ of attendees** have "decent" or better experience

## On Each Turn, The Test Randomly Decides:

- 40% - Click a suggestion
- 30% - Type their own response
- 15% - Ask a confused question
- 5% - Try to go backwards
- 5% - Try to skip
- 5% - Do something random

## No Hardcoding

- ❌ No predetermined conversation path
- ❌ No "correct" answers
- ❌ No fixed sequence
- ✅ Just probabilities and natural variety

## What It Tests

- Can users navigate non-linearly?
- Does confusion get handled gracefully?
- Can users recover from mistakes?
- Do random button clicks work sensibly?
- Is the experience good when users don't follow the happy path?

## Files

- **Test:** `test/chaotic-workshop-attendee.js`
- **Docs:** `docs/CHAOTIC_TESTING_APPROACH.md`
- **Summary:** `CHAOTIC_TESTING_SUMMARY.md`

## Next Steps

1. Run it
2. See what breaks
3. Fix what breaks
4. Run it again
5. Deploy when 70%+ have decent experience

---

**That's it. No scripts. Just chaos. Like a real workshop.** 🎪
