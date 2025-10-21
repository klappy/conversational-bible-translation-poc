# 🧪 Bible Translation Assistant - Automated Testing

## Overview

This testing framework provides intelligent, conversational testing of the Bible Translation Assistant. Instead of rigid scripts, our AI-powered tests actually **converse naturally** with the translation assistant, simulating real workshop attendees.

## 🎭 Intelligent Testing Approach

Our tests don't just send pre-scripted messages. They:

- Read and understand AI responses
- Ask clarifying questions when appropriate
- Use suggestions intelligently (not always)
- Simulate different user personas
- Complete full translation workflows naturally
- Verify the system works end-to-end

## Test Personas

### Foreign Language Translators

#### 1. **Maria** - Curious Beginner

- First-time Bible translator
- Spanish speaker translating for youth group
- Asks questions, needs clarification
- Engaging and curious

#### 2. **John** - Experienced Translator

- Knows what he wants
- Direct and efficient
- Uses suggestions often
- Translating Greek to French

#### 3. **Sarah** - Confused User

- Uncertain about the process
- Needs guidance
- Sometimes changes mind
- Translating for young children

### English-to-English Simplification Personas

#### 4. **Pastor Amy** - Children's Minister

- Simplifying for elementary school kids
- Needs Grade 1 reading level
- Fun and engaging tone
- Meaning-based approach

#### 5. **Ms. Chen** - ESL Teacher

- Teaching adult English learners
- Needs Grade 4 reading level
- Clear and respectful tone
- Methodical approach

#### 6. **Jake** - Youth Pastor

- Modernizing for high schoolers
- Grade 10 reading level
- Relatable and authentic tone
- Makes scripture relevant

#### 7. **Reverend Thomas** - Senior Ministry

- Traditional but clear for seniors
- Grade 8 reading level
- Dignified tone
- Word-for-word preference

#### 8. **Chaplain Mike** - Prison Chaplain

- Accessible for incarcerated individuals
- Grade 6 reading level
- Straightforward and hopeful
- Balanced approach

## 🧪 Core Test Files

### `workshop-flow-test.js`

**Purpose:** Complete end-to-end test of the workshop experience  
**What it tests:**

- Name collection and greeting
- All 7 translation settings customization
- Understanding phase with glossary collection (terms & phrases)
- Drafting phase with draft saving to canvas
- Proper phase transitions throughout

**Run:** `node test/workshop-flow-test.js`

### `regression-test-suite.js`

**Purpose:** Quick regression tests to catch breaking changes  
**What it tests:**

- Quick response timing (suggestions match current question)
- Glossary collection during Understanding phase
- Draft saving to scriptureCanvas during Drafting
- Phase transitions (Planning → Understanding → Drafting)
- Settings persistence across requests

**Run:** `node test/regression-test-suite.js`

## 🚦 Testing Strategy

1. **Before Every Commit:** Run regression suite (< 1 minute)

   ```bash
   node test/regression-test-suite.js
   ```

2. **After Feature Changes:** Run workshop flow test (~ 2 minutes)

   ```bash
   node test/workshop-flow-test.js
   ```

3. **Before Deployment:** Run everything
   ```bash
   node test/regression-test-suite.js && node test/workshop-flow-test.js
   ```

## Running Tests

### 🚀 New: Parallel Testing (3-6x Faster!)

```bash
# Quick smoke test (2 personas, <30s)
npm run test:quick

# Run all tests in parallel batches
npm run test:parallel

# Test interaction modes
npm run test:suggestions  # Only use quick responses
npm run test:manual       # Only type manually
npm run test:mixed        # Mix both modes
```

### Traditional Sequential Tests

```bash
# Test all personas locally
npm run test:workshop

# Test only English-to-English personas
npm run test:workshop:english

# Test production
npm run test:workshop:prod
```

### Test Individual Personas

```bash
# Foreign language personas
npm run test:beginner    # Maria
npm run test:expert      # John
npm run test:confused    # Sarah

# English-to-English personas
npm run test:children    # Pastor Amy
npm run test:esl         # Ms. Chen
npm run test:youth       # Jake
npm run test:senior      # Reverend Thomas
npm run test:prison      # Chaplain Mike
```

### Basic API Tests

```bash
# Run all API tests
npm test

# Test conversation flow
npm run test:flow

# Test agent behaviors
npm run test:agents
```

## What Gets Tested

### Full Conversation Flow

✅ Initial greeting and response
✅ Language customization (7 settings)
✅ Phase transitions (Planning → Understanding → Drafting)
✅ Scripture presentation and comprehension
✅ Draft creation and refinement
✅ State persistence throughout
✅ Agent coordination (who responds when)

### Natural Variations

✅ Using suggestions vs typing own responses
✅ Asking clarifying questions
✅ Providing detailed vs brief answers
✅ Confusion and corrections
✅ Different translation approaches

### State Management

✅ Settings are saved correctly
✅ Progress persists between messages
✅ Phase transitions work properly
✅ Canvas state updates appropriately

## Example Test Output

```
🎭 Workshop Attendee: Maria
📝 Background: First-time Bible translator, Spanish speaker
============================================================

👤 Maria: "Hello! I'm interested in translating the Bible for my youth group"

📖 Translation Assistant: "Welcome! I'm excited to help you translate..."

👤 Maria: "I'd like to customize the reading level and style"

📖 Translation Assistant: "Great! Let's customize your settings. First, what language..."

👤 Maria: "English"

📝 Canvas Scribe: "Noted!"

📖 Translation Assistant: "Perfect! What language are we translating from?"

👤 Maria: "Hebrew. I want to work from the original text."

[... conversation continues naturally ...]

📊 TEST REPORT
============================================================
Persona: Maria
Exchanges: 12
Final Phase: drafting
Style Guide Complete: true
Has Draft: true
Success: ✅
```

## How It Works

1. **Persona Selection**: Each test run selects a persona with specific characteristics
2. **Natural Conversation**: The test reads AI responses and responds appropriately
3. **Decision Making**: Tests decide whether to use suggestions or type custom responses
4. **Context Awareness**: Tests understand what phase they're in and respond accordingly
5. **Validation**: Tests verify that settings are saved and progress is made

## Adding New Test Scenarios

To add a new persona, edit `intelligent-conversation-tester.js`:

```javascript
workshop_leader: {
  name: "Pastor David",
  background: "Leading a translation workshop",
  style: "organized, methodical",
  preferences: {
    conversationLanguage: "English",
    sourceLanguage: "Hebrew",
    targetLanguage: "Swahili",
    // ... etc
  }
}
```

## Success Criteria

A test is considered successful if:

- ✅ All 7 style guide settings are collected
- ✅ The conversation progresses through phases naturally
- ✅ A draft translation is produced (or attempted)
- ✅ State persists throughout the conversation
- ✅ No errors occur during the flow

## Continuous Integration

These tests can be run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Start local server
  run: npm run dev:netlify &

- name: Wait for server
  run: sleep 10

- name: Run workshop simulation
  run: npm run test:workshop
```

## Debugging Failed Tests

If a test fails:

1. **Check the conversation log** - See exactly what was said
2. **Verify state changes** - Ensure settings are being saved
3. **Check agent responses** - Verify all agents are responding appropriately
4. **Review phase transitions** - Ensure workflow progresses correctly

## Benefits of This Approach

### 🎯 Realistic Testing

- Tests interact like real users would
- Natural language variations
- Realistic confusion and clarification

### 🔄 Comprehensive Coverage

- Multiple personas test different paths
- Edge cases are naturally discovered
- Full end-to-end validation

### 🛡️ Confidence in Changes

- Run before deploying to ensure nothing breaks
- Catch issues that rigid tests might miss
- Verify the complete user experience works

### 🚀 Easy to Extend

- Add new personas easily
- Test new features naturally
- No need to rewrite rigid test scripts

## Tips

1. **Run tests after major changes** to ensure nothing broke
2. **Use individual persona tests** for quick checks
3. **Run full workshop simulation** before deployments
4. **Check both local and production** environments
5. **Review conversation logs** to understand failures

---

_"These tests don't just verify the code works - they verify that real people can successfully use the system!"_
