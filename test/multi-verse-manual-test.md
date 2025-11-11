# Manual Test for Multi-Verse Support

## Quick Hack to Test Ruth 1:2

Without changing ANY code, we could test if the concept works:

### Step 1: Complete Ruth 1:1 normally
- Go through full workflow
- Get to checking phase
- Complete the verse

### Step 2: Manually inject verse 2
When Resource Librarian presents verse 2, the text is:
```
"The man's name was Elimelech, his wife's name was Naomi, and the names of his two sons were Mahlon and Kilion. They were Ephrathites from Bethlehem, Judah. And they went to Moab and lived there."
```

### Step 3: When Understanding Guide asks about phrases
Instead of looking for the hardcoded 5, manually identify these phrases:
1. "The man's name was Elimelech"
2. "his wife's name was Naomi"  
3. "the names of his two sons were Mahlon and Kilion"
4. "They were Ephrathites from Bethlehem, Judah"
5. "they went to Moab and lived there"

### Step 4: Complete the workflow
- Provide interpretations for each
- Create draft
- Check quality

### If this works manually:
- We know the WORKFLOW supports multiple verses
- We just need to make phrase extraction dynamic
- Success probability goes up to 90%+

## The Real Implementation Path

1. **Today**: Manual test with verse 2
2. **Tomorrow**: Add phrase-extractor.js integration
3. **Next Week**: Add verse queue to workflow
4. **Next Month**: Full chapter support

## What Would Break?

Actually... almost nothing:
- ❌ Understanding Guide would ask about wrong phrases (but Process Monitor could detect)
- ❌ Canvas Scribe might save wrong keys (but we could fix in post)
- ✅ Everything else would work fine!

## Conclusion

The chances are VERY good we can support multiple verses because:
1. The workflow is verse-agnostic (it's just steps)
2. Only the phrase list is hardcoded
3. Everything else is already flexible
4. We can implement progressively

**Recommended approach:**
1. Ship current version with Ruth 1:1
2. Test phrase extractor separately
3. Deploy multi-verse as "beta feature"
4. Gradually expand to full book
