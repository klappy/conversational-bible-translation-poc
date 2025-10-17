# Bible Translation Assistant (PoC)

**Version 0.3.0** | [Changelog](./CHANGELOG.md)

An AI-powered conversational Bible translation tool implementing the FIA (Familiarization, Internalization, Articulation) methodology for church-based Bible translation.

## Features

- 🎯 **Conversational Interface**: Natural chat-based translation workflow
- 📱 **Responsive Design**: Swipeable cards on mobile, sidebar on desktop
- 📖 **FIA Methodology**: Phrase-by-phrase understanding before drafting
- 🔍 **Smart Checking**: Automated validation with unfoldingWord resources
- 💬 **Community Feedback**: Simulated peer review system
- 🎤 **Mock Audio Support**: Prepared for voice input/output

## Tech Stack

- **Frontend**: React with Vite
- **Backend**: Netlify Functions (serverless)
- **AI**: OpenAI GPT-4o-mini
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
│   ├── components/        # React components
│   │   ├── ChatInterface  # Main chat UI
│   │   ├── ScriptureCanvas # Desktop sidebar
│   │   └── MobileSwipeView # Mobile swipe cards
│   ├── contexts/          # React contexts
│   ├── services/          # Business logic
│   └── styles/            # CSS files
├── netlify/
│   └── functions/         # Serverless functions
│       ├── chat.js        # OpenAI integration
│       └── resources.js   # Bible/FIA data
├── public/
│   └── data/             # Static resources
│       └── ruth/         # Ruth chapter data
└── docs/                 # Documentation

```

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
