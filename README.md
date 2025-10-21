# Bible Translation Assistant (PoC)

**Version 0.4.0** | [Changelog](./CHANGELOG.md)

An AI-powered conversational Bible translation tool implementing the FIA (Familiarization, Internalization, Articulation) methodology for church-based Bible translation.

## Features

- 🤖 **Multi-Agent System**: Team of specialized AI agents working together
- 🎯 **Conversational Interface**: Natural chat-based translation workflow
- 📱 **Responsive Design**: Swipeable cards on mobile, sidebar on desktop
- 📖 **FIA Methodology**: Phrase-by-phrase understanding before drafting
- 🔍 **Smart Checking**: Automated validation with unfoldingWord resources
- 💬 **Community Feedback**: Simulated peer review system
- 🎤 **Mock Audio Support**: Prepared for voice input/output
- 🎭 **Visual Agent Identity**: Each agent has unique icon and color
- 💾 **Persistent State**: Translation progress saved with Netlify Blobs
- 👥 **Multi-User Sessions**: Workshop support with isolated user spaces
- 📤 **Session Sharing**: QR codes and links for cross-device access
- 🔄 **Seamless Continuity**: Resume translations on any device

## Tech Stack

- **Frontend**: React with Vite
- **Backend**: Netlify Functions (serverless)
- **AI**: Multi-Agent System
  - GPT-4o-mini (Primary Translator, Orchestrator)
  - GPT-3.5-turbo (State Manager, Validator, Resources)
- **State Management**: Server-side with polling
- **Styling**: Custom CSS with mobile-first approach
- **PWA**: Installable web app with offline capability

## Setup

1. **Clone the repository**

   ```bash
   git clone [repository-url]
   cd conversational-bible-translation-poc
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**
   Copy the example file and add your API key:

   ```bash
   cp env.example .env
   # Edit .env and add your actual OpenAI API key
   ```

4. **Run development server**

   ```bash
   # Run with Vite (frontend only)
   npm run dev

   # Run with Netlify Dev (includes functions)
   npm run dev:netlify
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## Project Structure

```
/
├── src/
│   ├── components/              # React components
│   │   ├── AgentMessage         # Agent-attributed messages
│   │   ├── AgentStatus          # Active agent panel
│   │   ├── ChatInterfaceMultiAgent # Multi-agent chat UI
│   │   ├── ScriptureCanvas      # Desktop sidebar
│   │   └── MobileSwipeView      # Mobile swipe cards
│   ├── contexts/                # React contexts
│   ├── services/                # Business logic
│   └── styles/                  # CSS files
├── netlify/
│   └── functions/               # Serverless functions
│       ├── agents/
│       │   └── registry.js      # Agent definitions
│       ├── canvas-state.js      # State management
│       ├── conversation.js      # Multi-agent orchestration
│       ├── chat.js              # Original chat (fallback)
│       └── resources.js         # Bible/FIA data
├── public/
│   └── data/                   # Static resources
│       └── ruth/               # Ruth chapter data
└── docs/                       # Documentation
    ├── MULTI_AGENT_ARCHITECTURE.md
    ├── DEVELOPMENT_NOTES.md
    ├── CONVERSATION_SUMMARY.md
    └── COMMIT_PROCESS.md

```

## Documentation

- [Multi-Agent Architecture](./docs/MULTI_AGENT_ARCHITECTURE.md) - Detailed agent system documentation
- [Development Notes](./docs/DEVELOPMENT_NOTES.md) - Technical implementation details
- [Conversation Summary](./docs/CONVERSATION_SUMMARY.md) - Development history
- [Setup Instructions](./SETUP_INSTRUCTIONS.md) - Detailed setup guide
- [PRD](./docs/PRD.md) - Product requirements document
- [Commit Process](./docs/COMMIT_PROCESS.md) - Version management guidelines
- [Changelog](./CHANGELOG.md) - Version history and changes

## Workshop Demo Paths

1. **Quick Demo (10 min)**: Single verse (Ruth 1:1)
2. **Standard Demo (30 min)**: Multiple verses (Ruth 1:1-5)
3. **Extended Demo (45 min)**: Full chapter exploration

## Mobile Interface

- **Swipe left/right**: Navigate between cards
- **Swipe up**: Dismiss temporary resource cards
- **Card types**: Chat, Style Guide, Glossary, Scripture, Feedback

## Desktop Interface

- **70% Chat**: Main conversation area
- **30% Sidebar**: Four tabbed artifacts
- **Collapsible**: Toggle sidebar visibility

## FIA Workflow Phases

1. **Planning**: Set translation parameters
2. **Understanding**: Phrase-by-phrase comprehension
3. **Drafting**: Compile and refine translation
4. **Checking**: Automated validation
5. **Sharing**: Community feedback
6. **Publishing**: Final output and export

## Data Sources

- **Bible Text**: Berean Standard Bible (CC BY-SA 4.0)
- **FIA Resources**: Images, maps, videos (mock data)
- **unfoldingWord**: translationNotes, Questions (mock data)

## Development Notes

- Mock audio functionality (ready for Whisper API integration)
- Streaming chat responses for better UX
- PWA-ready with offline fallback capability
- Responsive breakpoint at 768px

## Deployment

Deploy to Netlify:

1. Connect GitHub repository
2. Set environment variables in Netlify dashboard
3. Deploy with automatic builds on push

## License

MIT

## Credits

Built for ETEN Summit 2025 demonstration
