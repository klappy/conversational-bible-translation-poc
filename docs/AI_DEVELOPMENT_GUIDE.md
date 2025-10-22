# 🤖 AI Development Guide - Bible Translation Workshop

**FOR AI ASSISTANTS:** This document is your primary reference for continuing development on this project. Read this first before making any changes.

## 🎯 Project Overview

You are working on a **Bible Translation Workshop** application that helps users translate scripture through a conversational, multi-agent AI system. The app guides users through 6 stages: Plan → Understand → Draft → Check → Share → Publish.

**Current State:** The first 3 stages (Plan, Understand, Draft) are **mostly working** but have reliability issues. The last 3 stages (Check, Share, Publish) are **not yet built**.

## 🚀 Quick Start for AI Assistants

### 1. Start the Development Server
```bash
# Kill any existing servers
pkill -f "netlify dev"

# Start the server
npm run dev:netlify

# Wait 10-15 seconds for server to start
# Server runs on http://localhost:8888
```

### 2. Run Tests to Verify Current State
```bash
# Quick regression test (1 min) - SHOULD PASS 100%
npm run test:quick

# Full workshop test (2 min) - CURRENTLY 88% passing
npm run test:full

# Generate status report
npm run test:report

# Run all comprehensive tests (10 min)
npm run test:complete
```

### 3. Check the Status Dashboard
Always check `docs/WORKSHOP_STATUS_DASHBOARD.md` for the latest status before starting work.

## 🔧 Current Issues to Fix

### 🔴 **CRITICAL ISSUES** (Fix These First)
1. **Settings Persistence** 
   - **Problem:** User name and settings not saving reliably
   - **Location:** `netlify/functions/canvas-state.js`
   - **Test:** Run `npm run test:full` and check "User name saved" test
   - **Success Criteria:** Settings persist across all requests

2. **Phase Transitions**
   - **Problem:** System stays in "understanding" phase, doesn't advance to "drafting"
   - **Location:** `netlify/functions/agents/registry.js` (orchestrator rules)
   - **Test:** Run `npm run test:full` and check "Current phase" test
   - **Success Criteria:** Phase correctly transitions: planning → understanding → drafting

3. **Glossary Collection**
   - **Problem:** User phrases not being captured consistently
   - **Location:** `netlify/functions/agents/registry.js` (Canvas Scribe agent)
   - **Test:** Run `npm run test:quick` and check "Glossary Collection" test
   - **Success Criteria:** All user phrase explanations saved to glossary

### 🟡 **IMPORTANT ISSUES** (Fix After Critical)
- Phrase processing only handles 1/3 phrases reliably
- Settings collection only captures 4/7 settings reliably
- Backend state management needs stabilization

## 📁 Key Files to Understand

### Backend (Netlify Functions)
- `netlify/functions/conversation.js` - Main conversation endpoint
- `netlify/functions/canvas-state.js` - State management
- `netlify/functions/agents/registry.js` - Agent definitions and orchestration
- `netlify/functions/resources.js` - Scripture data endpoint

### Frontend (React)
- `src/contexts/TranslationContext.jsx` - Main state management
- `src/components/ChatInterfaceMultiAgent.jsx` - Chat UI
- `src/components/ScriptureCanvas.jsx` - Translation canvas
- `src/components/InlineSuggestions.jsx` - Quick response suggestions

### Testing
- `test/regression-test-suite.js` - Quick tests (MUST STAY 100%)
- `test/workshop-flow-test.js` - Full workshop test
- `test/complete-5-verse-workshop.js` - Comprehensive 5-verse test
- `test/stage-completion-report.js` - Stage analysis

## 🎭 Testing Philosophy

This project uses **AGENTIC TESTING** - tests simulate real users with personas:
- Tests read AI responses and respond naturally
- Tests make decisions based on context
- Tests verify the complete user experience
- Tests are persona-driven (Pastor Amy, Youth Pastor Jake, etc.)

**Key Principle:** Tests should think and adapt like humans, not follow rigid scripts.

## 📊 Success Metrics

| What to Measure | Current | Target | How to Test |
|-----------------|---------|--------|-------------|
| Regression Tests | 100% | 100% | `npm run test:quick` |
| Workshop Flow | 88% | 95% | `npm run test:full` |
| Settings Save | 60% | 95% | Check state persistence |
| Phase Transitions | 75% | 95% | Check workflow.currentPhase |
| Glossary Collection | 70% | 95% | Check glossary entries |

## 🔄 Development Workflow

1. **Always start by running tests** to understand current state
2. **Check the dashboard** at `docs/WORKSHOP_STATUS_DASHBOARD.md`
3. **Make small, focused changes** - fix one issue at a time
4. **Test after each change** - ensure no regressions
5. **Update the dashboard** after making improvements
6. **Commit with clear messages** describing what was fixed

## 🚦 Decision Points for User Input

When you encounter these situations, **ASK THE USER**:

1. **Architecture Changes** - Changing how agents communicate
2. **New Features** - Adding functionality beyond the 6 stages
3. **UI/UX Changes** - Modifying the user interface significantly
4. **Data Structure Changes** - Altering how state is stored
5. **External Integrations** - Adding new dependencies or services

## 📈 How to Track Progress

After fixing issues:

1. Run the test suite:
```bash
npm run test:complete
```

2. Update the dashboard:
```bash
# Edit docs/WORKSHOP_STATUS_DASHBOARD.md with new success rates
# Update the "Last Run" timestamps
# Add notes about what was fixed
```

3. Commit your changes:
```bash
git add -A
git commit -m "Fix [issue]: [what you did]"
```

## 🎯 Next Milestone Goals

### Milestone 1: Stabilize Core (Current Priority)
- [ ] Fix settings persistence (60% → 95%)
- [ ] Fix phase transitions (75% → 95%)
- [ ] Fix glossary collection (70% → 95%)
- [ ] Achieve 95% workshop flow success

### Milestone 2: Complete Understanding
- [ ] Fix phrase processing reliability
- [ ] Enhance glossary categorization
- [ ] Improve resource presentation

### Milestone 3: Build CHECK Stage
- [ ] Add translation validation
- [ ] Implement readability scoring
- [ ] Create quality metrics

### Milestone 4: Build SHARE Stage
- [ ] Add sharing mechanisms
- [ ] Implement feedback collection
- [ ] Create collaboration features

### Milestone 5: Build PUBLISH Stage
- [ ] Add export functionality
- [ ] Implement final formatting
- [ ] Create distribution system

## 🆘 Common Issues and Solutions

### Server Won't Start
```bash
pkill -f "netlify dev"
pkill -f "vite"
npm run dev:netlify
```

### Tests Failing Unexpectedly
```bash
# Check if server is running
curl http://localhost:8888/.netlify/functions/canvas-state

# Check server logs
tail -f /tmp/server.log
```

### State Not Persisting
- Check `netlify/functions/canvas-state.js`
- Verify sessionId is being passed correctly
- Check Netlify Blobs storage

## 📝 Important Context

- **Multi-Agent System:** Orchestrator, Primary, Canvas Scribe, Resource Librarian, Suggestion Helper
- **State Management:** Uses Netlify Blobs for persistence
- **Session Management:** Each user gets a unique sessionId
- **Mobile Support:** App is responsive with swipe navigation
- **Quick Responses:** AI-generated suggestions for common responses

## ✅ Before You Start Coding

1. [ ] Read this entire document
2. [ ] Check `docs/WORKSHOP_STATUS_DASHBOARD.md`
3. [ ] Run `npm run test:quick` to verify setup
4. [ ] Understand the current issues from test output
5. [ ] Pick ONE issue to fix (start with critical)
6. [ ] Make a plan before coding

## 🤝 Handoff Notes

**To the next AI assistant:** 
- The testing framework is solid and comprehensive
- The UI works well, focus on backend reliability
- State management is the core issue - fix that first
- Keep regression tests at 100% - don't break what works
- Update the dashboard after making improvements

---

*This guide is the source of truth for AI-assisted development. Keep it updated as the project evolves.*
