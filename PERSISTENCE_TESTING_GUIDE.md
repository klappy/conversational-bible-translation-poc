# Testing Persistence with Netlify Blobs

## 🎉 What's New

Your Bible Translation Assistant now has **persistent state storage** using Netlify Blobs! This means:

- ✅ Translation progress is saved between sessions
- ✅ State survives page refreshes
- ✅ Multiple users can work independently (session support)
- ✅ No more lost work!

## 🧪 How to Test Persistence

### 1. Basic Persistence Test

1. **Open your site**: https://conversational-bible-translation-poc.netlify.app
2. **Start a conversation**:
   - Type: "Hello, I want to translate Ruth into Spanish"
   - Wait for response
3. **Check state is saved**:
   - Refresh the page (F5 or Cmd+R)
   - Your conversation should still be there!
   - The style guide settings should persist

### 2. Multi-User Session Test

Test that multiple users can work independently:

**User 1**:

```
https://conversational-bible-translation-poc.netlify.app?session=workshop_user1
```

- Translate into Spanish
- Set reading level to Grade 3

**User 2**:

```
https://conversational-bible-translation-poc.netlify.app?session=workshop_user2
```

- Translate into French
- Set reading level to Grade 5

Each user's progress is completely isolated!

### 3. Default Session Test

Without any session parameter:

```
https://conversational-bible-translation-poc.netlify.app
```

- Uses default session
- Good for single-user mode
- State persists in browser localStorage

## 🔍 What to Look For

### ✅ Working Correctly If:

- Conversation history persists after refresh
- Style guide settings are retained
- Scripture Canvas content is saved
- Glossary terms are preserved
- Different session URLs maintain separate states

### ⚠️ Issues to Watch For:

- Empty conversation after refresh → Persistence not working
- Mixed data between sessions → Session isolation problem
- Slow loading → API latency (normal for serverless cold start)

## 🛠️ Debugging

### Check Session Info

Add `?debug=true` to see session details:

```
https://conversational-bible-translation-poc.netlify.app?debug=true
```

### View Netlify Function Logs

1. Go to Netlify dashboard
2. Click "Functions" tab
3. Select `canvas-state`
4. View real-time logs

### Test API Directly

Check current state:

```bash
curl https://conversational-bible-translation-poc.netlify.app/.netlify/functions/canvas-state
```

With specific session:

```bash
curl https://conversational-bible-translation-poc.netlify.app/.netlify/functions/canvas-state?session=test123
```

## 📊 Performance Notes

- **First Load**: May be slower (serverless cold start)
- **Subsequent Loads**: Should be fast (warm function)
- **State Updates**: Save automatically every few seconds
- **Storage Limit**: ~10MB per session (plenty for text)

## 🎯 Workshop Scenario

For the ETEN Summit workshop:

1. **Facilitator prepares**:

   ```
   Base URL: https://conversational-bible-translation-poc.netlify.app
   ```

2. **Generate attendee URLs**:

   ```
   Attendee 1: ?session=eten2025_attendee1
   Attendee 2: ?session=eten2025_attendee2
   Attendee 3: ?session=eten2025_attendee3
   ...
   ```

3. **Each attendee**:
   - Opens their unique URL
   - Works independently
   - Progress saves automatically
   - Can return anytime to continue

## 🚀 Next Steps

### If Persistence Works:

✅ Ready for production use!
✅ Can handle workshop scenarios
✅ State management is reliable

### Optional Enhancements:

- [ ] Add session management UI
- [ ] Show "last saved" timestamp
- [ ] Add export/import feature
- [ ] Create facilitator dashboard

## 📝 Implementation Details

- **Storage**: Netlify Blobs (key-value store)
- **Session Management**: URL parameter or localStorage
- **Persistence**: Automatic on state changes
- **Isolation**: Each session has unique namespace
- **Fallback**: Returns to default state if storage fails

## 🆘 Troubleshooting

### State Not Persisting?

1. Check browser console for errors
2. Verify Netlify Blobs is enabled
3. Check function logs in Netlify dashboard
4. Try different session ID

### Session Mixing?

1. Clear browser cache
2. Use incognito/private window
3. Explicitly set session parameter

### Performance Issues?

1. Normal on first load (cold start)
2. Should improve after warm-up
3. Consider implementing caching

## 🎉 Success Indicators

When everything is working:

- ✅ Refresh doesn't lose data
- ✅ Multiple tabs can have different sessions
- ✅ Workshop attendees work independently
- ✅ State updates are immediate
- ✅ No errors in console

---

**Ready to test?** Open your site and start translating! The state should persist automatically.
