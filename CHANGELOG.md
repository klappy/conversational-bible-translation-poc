# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.2] - 2025-10-17

### Fixed
- **CRITICAL**: Fixed state persistence in serverless functions
  - Implemented file-based state storage using /tmp/canvas-state.json
  - State now persists between function invocations
  - Canvas panels FINALLY update and stay updated!
  - This was the root cause preventing canvas updates all along

## [0.3.1] - 2025-10-17

### Fixed
- **CRITICAL**: Fixed serverless function exports that were preventing canvas state from working
  - canvas-state.js and conversation.js now export handlers correctly
  - State management actually works now
  - Canvas panels will finally update!

## [0.3.0] - 2025-10-17

### Added
- **Multi-Agent Architecture**: Complete redesign with specialized AI agents
  - Orchestrator Agent: Manages conversation flow
  - Primary Translator: Handles translation conversation
  - State Manager: Extracts and updates canvas state
  - Validator Agent: Checks quality and consistency
  - Resource Agent: Provides biblical resources
- **Server-Side State Management**: Canvas state now managed on server
- **Agent Visual Identity**: Each agent has unique icon, color, and avatar
- **Agent Status Panel**: Shows active agents and their current status
- **Polling Mechanism**: Client polls server for state updates every 2 seconds
- **AgentMessage Component**: Displays messages with agent attribution
- **Fallback Support**: Falls back to original chat if multi-agent fails

### Changed
- **Architecture Shift**: From client-side parsing to server-side state management
- **Chat Interface**: Now uses multi-agent system with visual differentiation
- **State Updates**: Canvas artifacts update from server state, not client parsing
- **Message Display**: Messages show which agent is speaking

### Fixed
- **State Synchronization**: Canvas and conversation now properly synchronized
- **Antifragility**: System more resilient with multiple specialized agents
- **Scalability**: Easy to add new agents without modifying existing ones

## [0.2.0] - 2025-10-17

### Added
- **ResponseProcessor service**: Parses AI responses and updates canvas artifacts automatically
- Automatic state updates when AI mentions changes to style guide, glossary, or drafts
- User articulation capture during Understanding phase
- Structured updates from backend alongside streaming responses
- Process user inputs to capture phrase articulations

### Fixed
- **Critical**: Fixed disconnect between conversation and canvas artifacts
- Canvas components now properly update when state changes
- Style Guide, Glossary, Scripture Canvas, and Feedback panels now reflect conversation progress
- Phase transitions are properly tracked and update workflow state

### Changed
- Enhanced ChatInterface to process AI responses for actionable updates
- Backend now sends structured updates along with text responses
- Improved response parsing to detect and apply canvas updates

## [0.1.0] - 2025-10-17

### Fixed
- **Critical**: Fixed FIA (Familiarization, Internalization, Articulation) workflow to properly follow methodology
  - System now presents verse text BEFORE asking comprehension questions
  - Replaced thematic questions with proper comprehension-based questions
  - Implemented phrase-by-phrase progression through verses
  
### Changed
- Updated backend system prompt with comprehensive FIA methodology from documentation
- Enhanced workflow state management to track phrase completion
- Improved initial welcome message to clearly explain defaults and options
- Modified question generation to focus on understanding rather than personal meaning

### Added
- Verse data now automatically loads and sends to AI during Understanding phase
- Phrase completion tracking with user articulation storage
- Methods for checking verse understanding completion
- Proper context passing including current phrase and progress

### Technical Details
- Modified files:
  - `netlify/functions/chat.js` - Comprehensive system prompt and enhanced context
  - `src/components/ChatInterface.jsx` - Auto-load verse data for Understanding phase
  - `src/contexts/TranslationContext.jsx` - Phrase tracking and improved state management
  - `src/services/TranslationWorkflow.js` - FIA-compliant question generation

## [0.0.0] - 2025-10-16

### Initial Release
- Basic proof of concept for Bible translation assistant
- React frontend with chat interface
- Netlify Functions backend
- OpenAI integration
- Basic FIA workflow structure
