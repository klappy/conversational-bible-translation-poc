# 🎪 Chaotic Testing Approach

## What This Is

Instead of hardcoded test scripts that expect users to follow a specific path, this testing approach simulates **real human chaos** in workshops.

## Philosophy

**Old way:** "User says X, system says Y, user says Z" (brittle, scripted)

**New way:** "User randomly does stuff, and we observe what happens" (resilient, natural)

## How It Works

### 1. **Hybrid Response Generation**

The test uses a combination of two approaches:

**60% Probabilistic Pools (Fast & Cheap):**
- Pool of possible names (picks randomly)
- Pool of possible settings (picks randomly)
- Pool of possible questions (picks randomly)
- Contextual response selection

**40% LLM-Generated (Natural & Expensive):**
- Uses GPT-4o-mini to generate truly natural responses
- Maintains conversation context
- Responds with authentic confusion, curiosity, and uncertainty
- Adapts to the actual conversation flow

**Why Hybrid?**
- Best of both worlds: speed + naturalness
- Manages API costs while maximizing realism
- Provides statistical variety + authentic language
- Probability weights for different behaviors

### 2. **Probabilistic Behavior**

On each turn, the test randomly decides what to do:

| Behavior | Probability | What It Does |
|----------|-------------|--------------|
| Use Suggestion | 40% | Clicks a suggested quick response |
| Type Own Response | 30% | Types their own contextual response |
| Ask Question | 15% | Asks a confused question |
| Go Backwards | 5% | Tries to go back or change something |
| Skip Attempt | 5% | Tries to skip the current step |
| Random Click | 5% | Clicks something random |

### 3. **Contextual Response Generation**

The test reads what the AI asks and generates an appropriate response:

**When using pools (60%):**
- Selects from context-appropriate response pools
- No hardcoded lookup tables
- Random selection from natural variations

**When using LLM (40%):**
- Builds conversation context from recent exchanges
- Generates persona-specific responses
- Introduces authentic confusion, questions, and natural language
- No two responses are ever the same

Example: If AI asks for tone:
- **Pool**: Randomly picks "Friendly and warm" or "Casual and fun"
- **LLM**: Might say "Hmm, I think I want something warm but not too formal... friendly?" or "Can you give me examples of different tones?"

No predetermined "correct" answer. Just authentic variety.

### 4. **Natural Human Delays**

Humans don't respond instantly. The test adds random delays (200-700ms) between messages to simulate thinking time.

### 5. **Unpredictable Session Length**

Each test runs for a random number of exchanges (20-50 messages), just like real people vary in how long they take.

## What Gets Measured

Instead of pass/fail, we analyze the **quality of experience**:

### Quantitative Metrics:
- Messages exchanged
- Questions asked (confusion level)
- Backwards moves (navigation issues)
- Settings provided
- Goals accomplished

### Qualitative Assessment:
- ❌ **FRUSTRATED** - Made little progress
- ⚠️ **CONFUSED** - Some progress but struggled
- 😐 **MIXED** - Accomplished some goals
- 🙂 **DECENT** - Good progress made
- ✅ **SUCCESS** - Accomplished goals naturally

### Aggregate Analysis:

After running multiple attendees, we look at:
- Experience distribution (what % had decent+ experience)
- Behavior patterns (how chaotic were they on average)
- Goal completion rates
- **Success threshold: 70% have decent or better experience**

## Running Tests

### Setup

First, ensure you have an OpenAI API key in your `.env` file:

```bash
OPENAI_API_KEY=your-key-here
```

**Note:** The test will still work without an API key, but will fall back to 100% pool responses.

### Running

```bash
# Test with 5 chaotic attendees (quick, ~5-10 min)
npm run test:chaotic

# Test with 50 chaotic attendees (comprehensive, ~1-2 hours)
npm run test:chaotic:50

# Test with custom number
node test/chaotic-workshop-attendee.js 25
```

**Cost Estimate:** With the 60/40 hybrid:
- 5 attendees: ~$0.05-0.15
- 50 attendees: ~$0.50-1.50
- Uses GPT-4o-mini (cheapest model with good quality)

## Example Output

```
🎭 CHAOTIC WORKSHOP ATTENDEE #1: Maria
============================================================
👤 Maria: "Hello!"
🤖 Translation Assistant: Welcome! I'm excited to help you...

👤 Maria: "Wait, what are we doing again?"
🤖 Translation Assistant: We're going to translate scripture...

👤 Maria: "Maria"
🤖 Canvas Scribe: Noted!

👤 Maria: "Can I go back?"
🤖 Translation Assistant: Of course! What would you like to change?

[... continues naturally and chaotically ...]

📊 EXPERIENCE ANALYSIS - Maria
============================================================
Messages Exchanged: 34
Questions Asked: 6
Backwards Moves: 2
Settings Provided: 7/7
Final Phase: drafting
Has Draft: ✅
Glossary Terms: 3
Glossary Phrases: 8
Settings Customized: ✅

🎯 Experience Quality: 🙂 DECENT - Good progress made

Action Distribution:
  - typed_own: 14 times
  - clicked_suggestion: 11 times
  - asked_question: 6 times
  - went_backwards: 2 times
  - tried_skip: 1 times
```

## Aggregate Results

```
📊 AGGREGATE ANALYSIS - ALL ATTENDEES
================================================================================

Experience Distribution:
  ✅ Success: 12/50 (24%)
  🙂 Decent: 28/50 (56%)
  😐 Mixed: 7/50 (14%)
  ⚠️ Confused: 2/50 (4%)
  ❌ Frustrated: 1/50 (2%)

Behavior Averages:
  Messages per person: 31.4
  Questions asked: 4.8
  Backwards moves: 1.3

Goals Accomplished:
  Settings customized: 47/50 (94%)
  Draft created: 42/50 (84%)

================================================================================
✅ WORKSHOP PASSES: 80% had decent or better experience
The system handles chaotic, natural user behavior well!
================================================================================
```

## Why This Is Better

### 1. **Tests Real Resilience**
- Does the system handle confusion gracefully?
- Can users navigate non-linearly?
- What happens when someone asks unexpected questions?

### 2. **Discovers Edge Cases Naturally**
- No need to manually think of every possible path
- Random behavior finds unexpected issues
- Scales with more runs (50 attendees find more than 5)

### 3. **Averages Out Inconsistencies**
- One weird result? That's okay
- Pattern of weird results? That's a problem
- Statistical confidence increases with sample size

### 4. **Reflects Reality**
- Workshops have 50+ people with varied behavior
- No one follows the "happy path" perfectly
- People get confused, go backwards, ask questions

### 5. **Less Maintenance**
- No hardcoded scripts to update when UI changes
- Probabilistic behavior adapts to changes
- Just adjust probabilities to simulate different user types

## Tuning the Chaos

You can adjust behavior probabilities in `chaotic-workshop-attendee.js`:

```javascript
const BEHAVIOR_PROBABILITIES = {
  USE_SUGGESTION: 0.4,      // More or less button clicking
  TYPE_OWN_RESPONSE: 0.3,   // More or less typing
  ASK_QUESTION: 0.15,       // More or less confusion
  GO_BACKWARDS: 0.05,       // More or less navigation
  SKIP_ATTEMPT: 0.05,       // More or less skipping
  RANDOM_CLICK: 0.05        // More or less chaos
};

// Adjust LLM usage (higher = more natural, slower, more expensive)
const USE_LLM_PROBABILITY = 0.4;  // 40% of responses use LLM
```

**Tuning LLM Usage:**
- **0.0** = No LLM, 100% pools (fastest, cheapest)
- **0.2** = 20% LLM (still fast, very cheap)
- **0.4** = 40% LLM (balanced, default)
- **0.6** = 60% LLM (more natural, slower)
- **1.0** = 100% LLM (most natural, slowest, expensive)

## Future Enhancements

- **Persona archetypes with different probability distributions**
  - Confused user: Higher ASK_QUESTION probability
  - Efficient user: Higher USE_SUGGESTION probability
  - Chaotic user: Higher RANDOM_CLICK probability

- **More sophisticated response generation**
  - Use local LLM to generate natural responses
  - Analyze conversation history for better context

- **Conversational quality analysis**
  - Did agents contradict themselves?
  - Did agents misunderstand the user?
  - Did the flow make logical sense?

## The Bottom Line

This isn't about forcing 50 attendees through the same script. It's about simulating 50 *different* attendees, each behaving *naturally and unpredictably*, and seeing if the system can handle that chaos gracefully.

If 70%+ of random, chaotic users still have a decent experience, the workshop is resilient enough for the real world.
