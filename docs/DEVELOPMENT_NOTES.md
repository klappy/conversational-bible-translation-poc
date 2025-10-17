# Development Notes - Bible Translation Assistant PoC

## Project Overview

This project was built as a Proof of Concept for the ETEN Summit 2025, demonstrating an AI-powered conversational Bible translation assistant using the FIA (Familiarization, Internalization, Articulation) methodology.

## What We Built

### Core Features Implemented

1. **Conversational Chat Interface**

   - React-based chat UI with streaming responses
   - Markdown support for rich formatting
   - Mock audio recording functionality (prompts for transcript)
   - Message history and timestamps

2. **Responsive Design**

   - **Desktop**: 70/30 split with collapsible sidebar
   - **Mobile**: Swipeable card interface using Swiper.js
   - Breakpoint at 768px for responsive switching

3. **Scripture Canvas (4 Artifacts)**

   - Style Guide: Translation parameters and settings
   - Glossary: Key terms and definitions
   - Scripture Canvas: Draft translations with verse navigation
   - Feedback: Community review comments (simulated)

4. **Backend Infrastructure**

   - Netlify Functions for serverless API
   - OpenAI GPT-4o-mini integration for chat
   - Resource serving for Bible text and FIA materials

5. **FIA Workflow Engine**

   - Six-phase translation process (Planning → Understanding → Drafting → Checking → Sharing → Publishing)
   - Phrase-by-phrase progression through verses
   - Question generation for understanding phase
   - Progress tracking and state management

6. **Data Resources**
   - Berean Standard Bible (BSB) for Ruth Chapter 1
   - Mock glossary of biblical terms
   - Placeholder structure for FIA resources (images/maps)
   - Mock unfoldingWord checking resources

## Technical Stack

- **Frontend**: React 19 with Vite
- **State Management**: React Context API
- **Styling**: Custom CSS (no framework)
- **Mobile UI**: Swiper.js for card navigation
- **Backend**: Netlify Functions (Node.js)
- **AI**: OpenAI API (GPT-4o-mini)
- **Deployment**: Netlify
- **Version Control**: Git/GitHub

## Key Design Decisions

### 1. Why React over Svelte?

- Better ecosystem for chat UI components
- More resources and examples available
- Easier integration with OpenAI streaming

### 2. Why Netlify Functions?

- Serverless architecture (no server maintenance)
- Built-in CI/CD with GitHub
- Easy environment variable management
- Good free tier for PoC

### 3. Why BSB over NET Bible?

- Completely open license (CC BY-SA 4.0)
- No usage restrictions for PoC
- Modern, readable translation

### 4. Mobile-First Swipeable Cards

- Natural gesture-based navigation
- Familiar UX pattern (like dating apps)
- Efficient use of mobile screen space
- Dismissible temporary resource cards

## Architecture Decisions

### State Management

Used React Context for global state instead of Redux/Zustand because:

- Simpler setup for PoC
- Adequate for current scale
- No complex async state requirements

### Streaming Responses

Implemented SSE (Server-Sent Events) for chat streaming:

- Better UX than waiting for complete responses
- Shows AI "thinking" in real-time
- Standard pattern with OpenAI API

### Mock Audio

Audio recording is mocked (prompts for transcript) because:

- Reduces complexity for PoC
- Avoids browser permission issues in demo
- Easy to add real Whisper API later

## Project Structure

```
/
├── src/                    # React application
│   ├── components/         # UI components
│   ├── contexts/          # React contexts
│   ├── services/          # Business logic
│   └── styles/            # Component CSS
├── netlify/
│   └── functions/         # Serverless functions
├── public/
│   └── data/             # Static resources
│       └── ruth/         # Bible text and resources
└── docs/                 # Documentation
```

## Development Workflow

### Local Development

```bash
npm run dev              # Frontend only
npm run dev:netlify      # With functions
```

### Environment Setup

Requires `.env` file with:

- `OPENAI_API_KEY` - OpenAI API key
- `OPENAI_MODEL` - Model selection (gpt-4o-mini)

### Testing Approach

- Manual testing for PoC scope
- Desktop and mobile responsive testing
- API integration testing with mock data

## Recent Updates

### v0.3.0 - October 17, 2025

#### Multi-Agent Architecture Implementation
- **Complete Redesign**: Shifted from single LLM to multi-agent team
- **Specialized Agents**: 
  - Orchestrator: Manages conversation flow and agent coordination
  - Primary Translator: Handles FIA methodology and user interaction
  - State Manager: Extracts and persists canvas state changes
  - Validator: Quality control and consistency checking
  - Resource Agent: Biblical resources and commentary
- **Server-Side State**: Canvas state now managed on server (canvas-state.js)
- **Visual Identity System**: Each agent has unique icon, color, and role
- **Agent Status Panel**: Real-time display of active agents
- **Antifragile Design**: Agents can be added/removed without affecting others
- **Polling Mechanism**: Client syncs with server state every 2 seconds

### v0.2.0 - October 17, 2025

#### Connected Conversation to Canvas Artifacts

- **Added ResponseProcessor**: Service that parses AI responses and updates canvas components
- **Fixed State Disconnect**: Canvas panels now update automatically based on conversation
- **User Articulation Capture**: System now captures and stores user translations during Understanding
- **Structured Updates**: Backend sends metadata alongside responses for reliable state updates

### v0.1.0 - October 17, 2025

#### Fixed FIA Workflow Issues

- **Verse Presentation**: System now shows actual Bible verse text BEFORE asking questions
- **Question Types**: Replaced thematic questions with proper comprehension-based questions
- **Phrase Tracking**: Implemented proper phrase-by-phrase progression through verses
- **System Prompt**: Updated with comprehensive FIA methodology including all six phases

### Enhanced Features

- Automatic verse data loading during Understanding phase
- Proper workflow state tracking with phrase completion
- Better context passing to AI including current phrase and progress
- Improved initial welcome message with clear defaults

## Known Limitations (PoC Scope)

1. **Audio Features**: Mock implementation only
2. **FIA Resources**: Placeholder data (no real images/maps)
3. **Community Feedback**: Simulated, not real multi-user
4. **Checking Phase**: Basic implementation without real uW integration
5. **Authentication**: None (not needed for demo)
6. **Offline Support**: PWA manifest present but not fully implemented
7. **Language Support**: English only for PoC

## Future Enhancements

### Phase 1 (Post-PoC)

- Real audio recording with Whisper API
- Actual FIA resources integration
- Real unfoldingWord API integration
- User authentication

### Phase 2

- Multi-language support
- Real-time collaboration
- Cloud storage for projects
- Export formats (USFM, PDF, etc.)

### Phase 3

- WhatsApp integration
- Offline-first PWA
- Advanced checking algorithms
- Community marketplace for resources

## Deployment Notes

### Netlify Deployment

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard
5. Deploy

### Required Environment Variables

- `OPENAI_API_KEY` - Required for chat functionality
- `OPENAI_MODEL` - Optional (defaults to gpt-4o-mini)

## Workshop Demo Scenarios

### 10-Minute Quick Demo

- Show conversational planning phase
- Demonstrate one verse understanding
- Quick draft generation
- Mobile swipe navigation

### 30-Minute Standard Demo

- Complete Ruth 1:1-5 translation
- Show all workflow phases
- Desktop and mobile views
- Glossary building demonstration

### 45-Minute Extended Demo

- Full chapter exploration
- Community feedback simulation
- Style guide customization
- Export and review features

## Troubleshooting

### Common Issues

1. **Chat not responding**: Check OpenAI API key in .env
2. **Functions not working locally**: Use `npm run dev:netlify`
3. **Mobile swipe not working**: Check browser compatibility
4. **Build failures**: Run `npm install` to update dependencies

## Credits

- **Developer**: Built with assistance from Claude AI
- **Concept**: ETEN Innovation Lab recommendations
- **Methodology**: FIA (Familiarization, Internalization, Articulation)
- **Target Event**: ETEN Summit November 2025

## Resources Used

- React Documentation
- Netlify Functions Documentation
- OpenAI API Documentation
- Swiper.js Documentation
- unfoldingWord Resources (planned)
- FIA Project Resources (planned)

## Contact

For questions about this PoC, please refer to the README.md or SETUP_INSTRUCTIONS.md files.

---

_Last Updated: October 2025_
_Version: 1.0.0 (Initial PoC)_
