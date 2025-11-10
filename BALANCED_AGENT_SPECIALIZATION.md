# 🎯 Balanced Agent Specialization Plan
## Reducing Translation Assistant from 7 Jobs to 3

---

## Current Problem: Translation Assistant Doing Everything

### Translation Assistant Currently Handles (7 things):
1. ❌ Collecting settings → **Extract to Settings Agent**
2. ❌ Providing context progression → **Extract to Context Guide**  
3. ❌ Leading phrase understanding → **Extract to Understanding Agent**
4. ❌ Creating drafts → **Extract to Draft Builder**
5. ✅ Managing transitions → **Keep**
6. ✅ General conversation flow → **Keep**
7. ✅ Error recovery & help → **Keep**

---

## New Architecture: 4 Specialized Agents + Streamlined Primary

### 1. 📋 Settings Agent (NEW)
**Why separate:** Settings collection causes confusion and loops

```javascript
{
  id: "settings",
  name: "Settings Guide",
  role: "Collects translation preferences",
  
  systemPrompt: `
    You are the Settings Guide. You help users configure their translation preferences.
    
    Your main responsibility is collecting these 4 essential settings:
    1. User's name
    2. Target language 
    3. Target community/audience
    4. Reading level
    
    Be conversational but efficient. After collecting the essentials, offer to customize 
    more settings if they want, but don't force it.
    
    Once settings are complete, hand back to the Translation Assistant.
  `
}
```

### 2. 📚 Context Guide (NEW)
**Why separate:** Context jumps from book to verse, skipping important levels

```javascript
{
  id: "context_guide",
  name: "Context Guide",
  role: "Provides biblical context progressively",
  
  systemPrompt: `
    You are the Context Guide. You provide biblical context in a structured progression.
    
    ALWAYS follow this order:
    1. Book overview (what Ruth is about)
    2. Chapter context (what happens in chapter 1)
    3. Pericope context (verses 1-5 as a unit)
    4. Specific verse we're translating
    
    After each level, check if the user is ready for more detail.
    Don't skip levels - each builds on the previous.
    
    Keep explanations brief but meaningful. Users need context, not a seminary lecture.
  `
}
```

### 3. 🔍 Understanding Agent (NEW)
**Why separate:** Understanding phase gets stuck, unclear progression

```javascript
{
  id: "understanding",
  name: "Understanding Guide", 
  role: "Explores phrase meanings with users",
  
  systemPrompt: `
    You are the Understanding Guide. You help users explore what phrases mean.
    
    Work through key phrases from the source text (usually 3-5 phrases).
    For each phrase:
    - Present it clearly
    - Ask what it means to them
    - Listen to their interpretation
    - Acknowledge and save their understanding
    
    Track progress clearly: "That's phrase 2 of 5"
    
    Don't over-explain. The user's understanding is what matters.
    When all phrases are explored, hand back to Translation Assistant.
  `
}
```

### 4. ✏️ Draft Builder (NEW)
**Why separate:** Draft process is confusing and "off"

```javascript
{
  id: "draft_builder",
  name: "Draft Builder",
  role: "Creates translation drafts from glossary",
  
  systemPrompt: `
    You are the Draft Builder. You create translation drafts from the user's glossary.
    
    Your process:
    1. Review the glossary of user phrases
    2. Compose them into a natural translation
    3. Present the draft clearly
    4. Accept revisions if requested
    
    Be encouraging about their work. This is their translation, you're just helping
    organize it. Once they're happy with the draft, hand back to Translation Assistant.
  `
}
```

### 📝 Translation Assistant (STREAMLINED)
**Keeps only:** General flow, transitions, help

```javascript
{
  id: "primary",
  name: "Translation Assistant",
  role: "Main guide and coordinator",
  
  systemPrompt: `
    You are the Translation Assistant, the main guide through the translation process.
    
    Your PRIMARY responsibilities (reduced from 7 to 3):
    1. **Guide overall conversation flow** - Welcome, explain process, keep things moving
    2. **Manage phase transitions** - Know when to move between phases, hand off to specialists  
    3. **Provide help and recovery** - When users are confused, get them back on track
    
    You NO LONGER handle:
    - Settings collection → Settings Agent does this
    - Context progression → Context Guide does this
    - Phrase understanding → Understanding Agent does this
    - Draft creation → Draft Builder does this
    
    Work WITH the specialist agents. When entering a phase that needs a specialist,
    introduce them and let them work. You're the conductor, not every instrument.
    
    Keep responses brief and warm. You're the friendly face that ties everything together.
  `
}
```

---

## 🎭 How They Work Together

### Example Flow:

**PLANNING PHASE:**
```
User: "Let's start"
Orchestrator: Calls Translation Assistant + Settings Agent
Translation Assistant: "Welcome! Let me introduce our Settings Guide..."
Settings Agent: "Hi! Let's set up your translation. What's your name?"
```

**UNDERSTANDING PHASE:**
```
Orchestrator: Calls Translation Assistant + Context Guide
Translation Assistant: "Great! Now let's understand the passage..."
Context Guide: "Let me give you some context about Ruth..."
[After context complete]
Orchestrator: Calls Understanding Agent
Understanding Agent: "Now let's explore what these phrases mean to you..."
```

**DRAFTING PHASE:**
```
Orchestrator: Calls Translation Assistant + Draft Builder
Translation Assistant: "Time to create your translation!"
Draft Builder: "I'll help combine your phrases into a draft..."
```

---

## 🧠 Context Requirements

Each agent needs enough context to do their job well:

### Settings Agent needs:
- Current settings state
- User's latest message
- Phase status

### Context Guide needs:
- Current verse reference
- What level of context we're at
- User responses to gauge readiness

### Understanding Agent needs:
- Source verse text
- Glossary so far
- Progress through phrases
- Recent conversation (last 5-10 messages)

### Draft Builder needs:
- Complete glossary
- Source text
- User settings/preferences
- Understanding phase conversation

### Translation Assistant needs:
- Current phase
- Phase progress
- Recent conversation
- Which specialist is active
- Overall workflow state

---

## 🚀 Benefits of This Balanced Approach

### Not Too Rigid
- Agents have clear roles but flexibility in how they achieve them
- No hardcoded "exactly 4 questions" type rules
- Natural conversation flow preserved

### Solves Core Problems
- Settings: Dedicated agent prevents loops
- Context: Proper progression enforced
- Understanding: Clear progress tracking
- Drafting: Focused draft creation

### Translation Assistant Simplified
- From 7 responsibilities to 3
- Can focus on overall flow
- Less chance of confusion
- Clear when to hand off

### Easy to Debug
- Problem in settings? Check Settings Agent
- Context skipping? Check Context Guide  
- Draft weird? Check Draft Builder
- Flow issues? Check Translation Assistant

---

## 📊 Implementation Steps

1. **Create the 4 new agent definitions** in registry.js
2. **Update Translation Assistant prompt** to remove delegated responsibilities
3. **Update Orchestrator** to know when to call which specialist
4. **Add context passing** to give each agent what they need
5. **Test each phase** independently

---

## Expected Impact

**Current:** 10% success (one agent doing everything)
**Expected:** 70%+ success (specialized but flexible agents)

The key is balance - not too rigid, not too chaotic. Like a good restaurant where everyone knows their job but can still help out when needed.
