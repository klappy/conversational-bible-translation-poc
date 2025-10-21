# Workshop Experience Testing Strategy

## Our Real Goal

**Not**: Build sophisticated test agents  
**But**: Discover what prevents real workshop attendees from having a successful, enjoyable experience

## Key Questions We Need Answered

### 1. Where Do People Get Stuck?

- [ ] Can a beginner complete the entire workshop?
- [ ] Where do they give up or get confused?
- [ ] What causes repetitive loops?
- [ ] Why don't we reach the publishing phase?

### 2. What Breaks the Experience?

- [ ] Empty responses from agents (validator issue)
- [ ] State not progressing between phases
- [ ] Suggestions that don't make sense
- [ ] Conversations that feel robotic

### 3. Critical User Journeys to Test

#### Journey 1: First-Time Workshop Attendee

**Goal**: Complete their first translation
**Success Metrics**:

- Reaches drafting phase
- Creates a meaningful translation
- Feels guided, not lost

#### Journey 2: Community Leader

**Goal**: Create translation for their congregation
**Success Metrics**:

- Gets to share with community
- Receives and incorporates feedback
- Publishes final version

#### Journey 3: Quick Translation Need

**Goal**: Translate one verse quickly
**Success Metrics**:

- Can complete in < 10 exchanges
- Gets usable output
- Doesn't get bogged down in process

## Tests We Actually Need

### Test 1: Can Anyone Complete the Workshop?

```javascript
// Simple test: Start → Finish
// Measure: How many actually reach publishing?
// Current Status: 0% reach publishing ❌
```

### Test 2: Where Do Conversations Break?

```javascript
// Identify:
// - Validator returning empty responses
// - State not updating when it should
// - Orchestrator not calling right agents
// - Phases not transitioning properly
```

### Test 3: Is the Experience Natural?

```javascript
// Check:
// - Do suggestions help or confuse?
// - Are responses contextually appropriate?
// - Does it feel like a conversation or interrogation?
```

## Current System Problems (From Testing)

### 🔴 Critical Issues

1. **Validator Never Responds** - Checking phase is broken
2. **Phase Transitions Fail** - Gets stuck in drafting
3. **State Updates Inconsistent** - Settings not always saved

### 🟡 Experience Issues

1. **Repetitive Loops** - Users repeat same action
2. **Unclear Progression** - Users don't know what's next
3. **Suggestions Misaligned** - Options don't match context

### 🟢 What Works

1. **Initial Onboarding** - Settings collection works
2. **Scripture Presentation** - Resource agent delivers
3. **Basic Drafting** - Can create initial translations

## Focused Test Suite

### 1. Workshop Completion Rate Test

**Purpose**: Measure how many personas can actually complete the workshop

```bash
npm run test:completion-rate
```

**Current Rate**: 0% ❌
**Target**: 80% minimum

### 2. Phase Transition Test

**Purpose**: Verify all phases are reachable and work

```bash
npm run test:phase-transitions
```

**Current Issues**:

- ❌ Understanding → Drafting (sometimes skips)
- ❌ Drafting → Checking (validator silent)
- ❌ Checking → Sharing (never reached)
- ❌ Sharing → Publishing (never reached)

### 3. User Satisfaction Test

**Purpose**: Would a real person enjoy this experience?

```bash
npm run test:user-satisfaction
```

Measures:

- Time to first value (getting a translation)
- Number of confusing exchanges
- Clear guidance at each step
- Natural conversation flow

## What We Should Fix First

Based on testing, prioritize:

### 1. Fix the Validator (Checking Phase)

The validator agent returns empty responses, blocking progress:

```javascript
// Current: Orchestrator calls validator, gets nothing
// Need: Validator provides actual checking feedback
```

### 2. Fix Phase Transitions

State shows one phase, but conversation is in another:

```javascript
// Current: State says "drafting" but AI thinks "understanding"
// Need: Synchronized phase awareness
```

### 3. Improve Orchestration

Orchestrator doesn't always call the right agents:

```javascript
// Current: Only calls validator, no other agents
// Need: Multi-agent responses for richer interaction
```

## Success Metrics

### For the System

- **Completion Rate**: % of users who reach publishing
- **Phase Coverage**: All 6 phases accessible
- **Error Rate**: < 5% failed responses
- **Loop Detection**: No repetitive cycles

### For the Users

- **Time to Value**: First translation in < 15 exchanges
- **Clarity**: Users always know next step
- **Engagement**: Natural, helpful conversation
- **Success**: Users achieve their goal

## Test Philosophy

### Don't Test:

- How smart our test agents are
- Edge cases that won't happen
- Technical implementation details
- Perfect coverage metrics

### Do Test:

- Real user journeys
- Common confusion points
- System failures that block progress
- Experience quality

## Next Actions

1. **Run completion test** - How many can finish?
2. **Debug validator** - Why no responses?
3. **Test phase transitions** - Where do they break?
4. **Measure user satisfaction** - Is it enjoyable?

## The Real Question

**Can a real person at our workshop successfully translate a Bible verse and feel good about the experience?**

Currently: **No** ❌

Our tests should help us fix that.
