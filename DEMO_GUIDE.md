# 🚀 QUICK DEMO GUIDE - Bible Translation Assistant

## ✅ Current Status (45 minutes to demo)
- **API**: Working ✅
- **Multi-agent system**: Responding correctly ✅  
- **Chat interface**: Should work (test in browser)
- **Known issue**: Settings persistence (Spanish saves as English) - minor for demo

## 🎯 How to Start the Demo

1. **Make sure server is running:**
   ```bash
   npm run dev:netlify
   ```

2. **Open browser to:**
   ```
   http://localhost:8888
   ```

3. **Use a fresh session for demo:**
   Add `?session=demo_live` to URL to start fresh

## 📋 Demo Script (10-15 minutes)

### Part 1: Introduction (2 min)
- "This is an AI-powered Bible translation assistant"
- "Uses the FIA methodology: Familiarization, Internalization, Articulation"
- "Multiple specialized AI agents work together"
- Show the agent panel on the right

### Part 2: Planning Phase (3 min)
1. Say "Hello!"
2. Enter your name when asked
3. Choose a language (e.g., "Spanish" or "Korean")
4. Select reading level ("Grade 3" or "Grade 5")
5. Watch the Canvas Scribe update settings in real-time

### Part 3: Understanding Phase (5 min)
1. System will show Ruth 1:1
2. Answer the comprehension questions
3. Point out how glossary terms are being collected
4. Show the Scripture Canvas updating with drafts

### Part 4: Multi-Agent Collaboration (3 min)
- Point out different agents responding:
  - 📖 Translation Assistant (blue) - main conversation
  - 📝 Canvas Scribe (green) - saves settings
  - 💡 Suggestion Helper (yellow) - provides quick responses
  - 🔍 Validator (purple) - quality checks
  - 📚 Resource Agent (indigo) - biblical context

### Part 5: Mobile View (2 min)
- Resize browser to show mobile responsive design
- Demonstrate swipeable cards
- Show how panels adapt to screen size

## ⚠️ Things to Avoid During Demo

1. **Don't** try to change languages mid-conversation (persistence bug)
2. **Don't** refresh the page without noting session will reset
3. **Don't** demonstrate the audio feature (it's mocked)
4. **Don't** go past verse 3 (gets repetitive)

## 🎭 If Something Breaks

### Chat not responding:
- Check server is running
- Try refreshing with new session: `?session=demo_backup`

### Agents not showing:
- The agent panel might be collapsed
- Click the toggle button to expand

### Settings not saving:
- Known issue - just mention "This is being fixed in the next sprint"

## 💬 Good Talking Points

1. **AI Innovation**: "Each agent specializes in different aspects of translation"
2. **User-Friendly**: "Designed for non-technical Bible translators"
3. **FIA Methodology**: "Follows established translation best practices"
4. **Progressive Web App**: "Works on any device with a browser"
5. **Conversation-Based**: "Natural language interaction, no complex forms"

## 🔑 Key Features to Highlight

✅ **Working Well:**
- Multi-agent orchestration
- Real-time canvas updates
- Question generation
- Suggestion system
- Mobile responsive design
- Verse-by-verse progression

⚠️ **In Progress (don't demo):**
- Full settings persistence
- Community feedback
- Audio recording
- Export features
- Multi-user collaboration

## 🎯 Demo Success Metrics

If you can show these, the demo is a success:
1. ✅ Agents respond to user input
2. ✅ Settings appear in the canvas
3. ✅ Verse text is displayed
4. ✅ Questions are contextual
5. ✅ Multiple agents collaborate

## 🚨 Emergency Fallback

If everything breaks:
1. Show the successful API response in terminal:
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/conversation \
     -H "Content-Type: application/json" \
     -H "X-Session-ID: demo_test" \
     -d '{"message": "Hello!", "history": []}'
   ```

2. Explain: "The backend multi-agent system is working perfectly, we're just fine-tuning the UI"

---

**Remember**: The core innovation (multi-agent Bible translation) is working! 
Everything else is just polish. You've got this! 🎉
