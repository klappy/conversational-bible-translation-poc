# Multi-Agent Architecture Documentation

## Overview

Version 0.3.0 introduces a revolutionary multi-agent architecture where specialized AI agents collaborate to provide a robust, scalable Bible translation experience. This replaces the fragile client-side parsing with an antifragile server-side state management system.

## Architecture Diagram

```
                    User Interface
                          ↕
                 [ChatInterfaceMultiAgent]
                          ↕
                  [Polling (2s interval)]
                          ↕
                   [Canvas State API]
                          ↕
              [Conversation Orchestrator]
                          ↕
    ┌─────────────────────┼─────────────────────┐
    ↓                     ↓                     ↓
[Primary            [State Manager]        [Validator]
Translator]              ↓                     ↓
    ↓            [Server State Store]    [Quality Checks]
    ↓                     ↓                     ↓
    └─────────────────────┼─────────────────────┘
                          ↓
                  [Resource Agent]
                   (When Needed)
```

## Agent Profiles

### 1. Orchestrator Agent 🎭

- **Role**: Conversation Manager
- **Color**: Purple (#8B5CF6)
- **Model**: GPT-4o-mini
- **Responsibilities**:
  - Analyzes user messages
  - Determines which agents should respond
  - Routes messages appropriately
  - Manages conversation flow
- **Always Active**: Yes

### 2. Primary Translator 📖

- **Role**: Translation Assistant
- **Color**: Blue (#3B82F6)
- **Model**: GPT-4o-mini
- **Responsibilities**:
  - Implements FIA methodology
  - Guides through six translation phases
  - Maintains natural conversation
  - Focuses on translation without state concerns
- **Always Active**: Yes

### 3. State Manager 📝

- **Role**: Canvas Scribe
- **Color**: Green (#10B981)
- **Model**: GPT-4o-mini
- **Responsibilities**:
  - Monitors all conversations
  - Extracts state updates
  - Updates canvas artifacts
  - Returns structured JSON only
- **Always Active**: Yes

### 4. Validator Agent ✅

- **Role**: Quality Checker
- **Color**: Orange (#F97316)
- **Model**: GPT-4o-mini
- **Responsibilities**:
  - Checks glossary consistency
  - Verifies reading level compliance
  - Identifies doctrinal concerns
  - Flags style guide violations
- **Conditionally Active**: During checking phase

### 5. Resource Agent 📚

- **Role**: Resource Librarian
- **Color**: Indigo (#6366F1)
- **Model**: GPT-4o-mini
- **Responsibilities**:
  - Provides original language insights
  - Supplies cultural/historical context
  - Offers cross-references
  - Shares commentary excerpts
- **Conditionally Active**: When biblical resources needed

## Technical Implementation

### Server-Side Components

#### 1. Canvas State Management

```javascript
// netlify/functions/canvas-state.js
- GET /canvas-state - Retrieve current state
- POST /canvas-state/update - Update state
- POST /canvas-state/reset - Reset to defaults
- GET /canvas-state/history - View state history
```

#### 2. Agent Registry

```javascript
// netlify/functions/agents/registry.js
- Defines all agent configurations
- Manages agent prompts
- Controls visual identities
- Determines activation logic
```

#### 3. Conversation Handler

```javascript
// netlify/functions/conversation.js
- Processes user messages
- Orchestrates agent responses
- Updates server state
- Returns combined responses
```

### Client-Side Components

#### 1. ChatInterfaceMultiAgent

- Handles user input
- Displays agent messages
- Shows agent status
- Polls for state updates

#### 2. AgentMessage Component

- Visual agent attribution
- Icon and color coding
- Role descriptions
- Timestamp display

#### 3. AgentStatus Panel

- Shows active agents
- Displays thinking states
- Visual team roster
- Real-time status updates

## State Management Flow

1. **User Input** → ChatInterfaceMultiAgent
2. **API Call** → conversation.js endpoint
3. **Orchestration** → Determines active agents
4. **Agent Execution** → Each agent processes in parallel/sequence
5. **State Extraction** → State Manager extracts updates
6. **State Persistence** → Updates stored on server
7. **Response Merge** → Combine agent responses
8. **Client Update** → Return messages + state
9. **Polling Sync** → Client polls every 2 seconds

## Benefits

### 1. Antifragility

- Agents fail independently
- System continues with degraded service
- Fallback to simpler chat if needed

### 2. Scalability

- Easy to add new agents
- No modification of existing agents required
- Plug-and-play architecture

### 3. Consistency and Reliability

- All agents use GPT-4o-mini for consistent behavior
- Standardized model selection prevents blocking issues
- Better quality responses across all agent types

### 4. Clear Responsibilities

- Each agent has one job
- Easier to debug
- Simpler maintenance

### 5. Visual Clarity

- Users see who's speaking
- Build trust through personas
- Reduce cognitive load

## Adding New Agents

To add a new agent:

1. **Define in Registry**:

```javascript
// netlify/functions/agents/registry.js
newAgent: {
  id: 'newAgent',
  model: 'gpt-4o-mini',
  role: 'Specific Role',
  visual: {
    icon: '🆕',
    color: '#COLOR',
    name: 'Agent Name'
  },
  systemPrompt: `Your prompt here`
}
```

2. **Add Activation Logic**:

```javascript
// In getActiveAgents function
if (conditionForNewAgent) {
  active.push("newAgent");
}
```

3. **Handle in Conversation**:

```javascript
// In processConversation
if (orchestration.agents?.includes('newAgent')) {
  responses.newAgent = await callAgent(newAgent, ...);
}
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: Required for all agents
- `OPENAI_MODEL`: Default model override

### Cost Controls

```javascript
agentConfig = {
  maxConcurrent: 3,
  timeout: 30000,
  retries: 2,
  costBudget: {
    perConversation: 0.5,
    perMonth: 100.0,
  },
};
```

## Future Enhancements

### Phase 1: Persistence

- Move from in-memory to Redis/KV store
- Add user sessions
- Implement state versioning

### Phase 2: Advanced Agents

- Hebrew/Greek language specialist
- Denomination-specific validators
- Poetry/prose style agents
- Community feedback aggregator

### Phase 3: Intelligence

- Agent learning from feedback
- Optimal agent selection AI
- Performance monitoring
- Cost optimization algorithms

### Phase 4: Marketplace

- Community-contributed agents
- Agent templates
- Custom agent builder
- Agent performance ratings

## Troubleshooting

### Common Issues

1. **Agents not responding**

   - Check OPENAI_API_KEY
   - Verify conversation.js is running
   - Check agent activation logic

2. **State not updating**

   - Verify canvas-state.js is running
   - Check polling interval
   - Inspect server state directly

3. **Wrong agent activated**

   - Review orchestrator logic
   - Check activation conditions
   - Verify workflow phase

4. **Performance issues**
   - Reduce concurrent agents
   - Optimize polling frequency
   - Use caching for repeated calls

## Testing

### Manual Testing

1. Start dev server: `npm run dev:netlify`
2. Open browser to http://localhost:5173
3. Start conversation
4. Observe agent panel
5. Check canvas updates
6. Verify state persistence

### Automated Testing (Future)

- Unit tests for each agent
- Integration tests for orchestration
- State management tests
- Performance benchmarks

## Monitoring

### Metrics to Track

- Agent response times
- State update frequency
- Error rates by agent
- Cost per conversation
- User satisfaction scores

### Debugging Tools

- State history endpoint
- Agent activity logs
- Conversation replay
- Performance profiling

## Security Considerations

- API keys in environment variables only
- Rate limiting per user (future)
- Input sanitization
- State validation
- Audit logging

---

_Last Updated: October 17, 2025_
_Version: 0.3.0_
_Status: Production Ready for Testing_
