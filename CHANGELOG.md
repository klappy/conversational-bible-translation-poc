# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.3] - 2025-11-06

### Critical Fixes

- **BREAKING BUG: Hardcoded User Data**: Removed hardcoded glossary entries that were being suggested to ALL users
  - One user's personal translations were hardcoded as examples in the prompt
  - Every user would get the same translation suggestions regardless of their input
  - Fixed to use actual dynamic glossary data from each user's session
  - Added warnings against hardcoding user-specific data

- **Trust Issue: Glossary Not Saving User's Exact Words**: Fixed system paraphrasing user input
  - Canvas Scribe was "improving" user's words (e.g., "before kings" → "prior to monarchical rule")
  - Now saves user's EXACT words verbatim to preserve trust
  - Critical for accurate translation drafts

- **Draft Creation Ignored User's Work**: Translation Assistant was using original Bible text instead of user's glossary
  - Users spent time explaining phrases, but drafts used the original scripture
  - Now MUST use glossary.userPhrases to create drafts
  - Added explicit warnings to never suggest original text as draft

### Fixed

- **Premature Phase Transitions**: Fixed system jumping from Planning to Understanding too early
  - Was transitioning after "tone" (step 7) instead of waiting for "philosophy" (step 8)
  - Added guards to prevent transition until ALL settings collected
  - Philosophy/approach is now correctly marked as the FINAL setting

- **Primary Agent Outputting Raw JSON**: Fixed JSON code appearing in chat messages
  - Users saw both the message AND raw JSON like `{"message": "...", "suggestions": [...]}`
  - Strengthened instructions for JSON-only output format
  - No more duplicate content or visible code

- **Missing Settings in UI**: Settings panel now shows ALL collected fields
  - Added userName and targetCommunity that were hidden
  - Dynamic rendering of all fields in state instead of hardcoded subset
  - Users can now see everything they've provided

### Added

- **Pericope Explanation**: Added note about translation scope when entering Understanding phase
  - Explains that pericopes (complete passages) are normal for Bible translation
  - Clarifies workshop focuses on one verse at a time for learning
  - Sets proper expectations for workshop participants

- **Multi-language Bible Support**: Added Spanish and French translations
  - Spanish: Reina-Valera 1909 (public domain)
  - French: Louis Segond 1910 (public domain)
  - Resource Librarian now checks source language and uses appropriate translation
  - Proper citations for each language version

### Changed

- **Agent Response Order**: Corrected sequence for natural conversation flow
  - Canvas Scribe now responds BEFORE Translation Assistant asks next question
  - Resource Librarian presents full scripture BEFORE Primary discusses phrases
  - Prevents confusing out-of-order responses

- **Suggestion Helper Consistency**: Orchestrator now always includes suggestions when primary responds
  - Fixed disappearing quick response buttons
  - Updated all orchestrator examples to include suggestions
  - Consistent user experience throughout conversation

### Security

- **Removed Hardcoded Test Data**: Cleaned up user-specific examples
  - Removed "A long time ago, before Israel had kings..." draft example
  - Generic placeholders instead of actual user translations
  - Protected user privacy and prevented data leakage

## [0.4.2] - 2025-11-06

### Added

- **Conversation Rewind Feature**: Users can now undo their last message
  - New "Undo" button in chat header removes last user message and all subsequent agent responses
  - Canvas state (settings, glossary, drafts) remains intact during rewind
  - Button automatically disables when: agents are thinking, no messages to undo, or rewind in progress
  - Protects initial greeting from being removed
  - Backend endpoint at `/canvas-state/rewind` handles conversation history pruning
  - Instant UI refresh after rewind completes

### Changed

- Enhanced chat interface with rewind capability for error correction
- Improved user control over conversation flow

## [0.4.1] - 2025-11-05

### Fixed

- **Critical Conversation API Bug**: Fixed undefined `serverHistory` variable causing complete API failure
  - All tests were failing with "Cannot read properties of undefined"
  - Conversation endpoint was completely non-functional
  - Fixed by properly fetching canvas state before using serverHistory
  
- **Glossary Display Issue**: Fixed user phrases showing as "phrase_1", "phrase_2" instead of actual source phrases
  - Canvas Scribe now captures and saves actual source phrases from Ruth
  - Added backward compatibility for sessions with old format
  - Display component handles both formats gracefully
  
### Changed

- Enhanced Canvas Scribe instructions to prioritize capturing actual phrase text
- Improved error handling in conversation endpoint

## [0.4.0] - 2025-10-21

### Added

- **Persistent State Storage**: Implemented Netlify Blobs for serverless state persistence
  - Translation progress now survives page refreshes and function restarts
  - Automatic state saving with no data loss
  - Replaced ephemeral `/tmp` storage with reliable cloud storage
- **Multi-User Session Support**: Enable workshop scenarios with isolated sessions
  - Each user gets independent translation workspace via URL parameters
  - Session isolation ensures no data mixing between users
  - Support for 100+ concurrent workshop attendees
  - Session management via `?session=workshop_user1` URL pattern
- **Session Sharing Features**: Share and continue translations across devices
  - QR code generation for instant mobile access
  - Shareable links for collaboration
  - Copy session URL with one click
  - Continue translations on phone, tablet, or another computer
  - "Share" button prominently displayed in interface header
- **Session Management Utilities**: New tools for session handling
  - `sessionManager.js` utility for session ID generation and management
  - Session info component for debugging
  - Workshop mode detection
  - Automatic session persistence in localStorage

### Changed

- **Backend Architecture**: Refactored state management from file-based to Blob storage
  - `canvas-state.js` now uses `@netlify/blobs` package
  - Added session-aware state keys
  - Improved error handling and fallback to defaults
- **API Integration**: Updated all frontend API calls to include session headers
  - Added `X-Session-ID` header to all requests
  - Session context preserved across all API interactions

### Fixed

- **State Persistence Issues**: Resolved all data loss problems in production
  - State now properly persists between serverless function invocations
  - No more lost translations after page refresh
  - Consistent state across all function calls

### Documentation

- Created `MULTI_USER_ARCHITECTURE.md` for technical implementation details
- Added `PERSISTENCE_TESTING_GUIDE.md` for testing the new features
- Created `SHARING_GUIDE.md` with user instructions for session sharing
- Updated deployment guides with persistence information

## [0.3.5] - 2025-10-20

### Fixed

- **Canvas Scribe behavior**: Prevented from asking questions or repeating messages
- **Translation Assistant question order**: Fixed to follow mandatory 7-step customization sequence
- **Duplicate questions**: Eliminated repeated questions about tone, audience, and reading level
- **Resource Librarian empty quotes**: Filtered out empty string responses that showed as blank messages
- **JSON formatting in Understanding phase**: Enforced strict JSON output with aggressive warnings
- **UI panel switching**: Fixed tab activation when transitioning from Planning to Understanding phase
- **Phase initialization**: Corrected app starting in wrong phase due to persisted state
- **Workflow phase tracking**: Improved state management for phase transitions
- **Context-aware recording**: Canvas Scribe now correctly maps user responses to appropriate fields

### Changed

- **Agent prompts**: Significantly enhanced with explicit rules and examples
- **Conversation history**: Refactored to structured message array format for better LLM context
- **Initial suggestions**: Modified to prevent premature phase transitions
- **Understanding phase suggestions**: Added diverse options (story, explanation, context, multiple choice)
- **Mobile card reordering**: Prioritized relevant cards based on workflow phase
- **Response formatting**: Added bold, italics, and rich markdown for better readability

### Added

- **Workflow phase indicator**: Visual display of current phase in chat header
- **Workflow verse display**: Shows current scripture reference being worked on
- **Context preservation**: System message includes current phase and collected information
- **Unique ID generation**: Prevents duplicate key errors in message rendering
- **Session reset capability**: Can clear persisted state for fresh testing

## [0.3.4] - 2025-10-17

### Added

- Multi-view mode for Translation Team panel (collapsed/compact/expanded)
- View mode persistence using localStorage
- Auto-expand feature when agents are thinking
- Toggle button to cycle through view modes
- Horizontal layout for compact agent display

### Fixed

- Translation Team panel consuming excessive vertical screen space
- Agent panel now defaults to compact mode (60px vs 250-300px previously)
- Improved UI balance with 80% reduction in agent panel height

### Changed

- Agent panel now has three display modes:
  - Collapsed: Minimal 40px bar showing active agent count
  - Compact: 60px horizontal layout with agent icons (default)
  - Expanded: Original vertical layout (available on-demand)
- Added responsive design adjustments for mobile screens
- Enhanced visual feedback with pulsing indicators for thinking agents

## [0.3.3] - 2025-10-17

### Fixed

- Initial message now loads persistent server state first before displaying
- Initial message shows correct reading level from persistent state (e.g., Grade 3 instead of hardcoded Grade 1)
- Initial message attribution fixed - now correctly shows as "Translation Assistant" agent instead of "You"
- Added proper agent metadata (icon, color, name) to initial message

### Changed

- TranslationContext starts with empty messages array, populated after server state loads
- Added `generateInitialMessage` function that creates welcome message based on actual server state
- ChatInterfaceMultiAgent generates initial message only once after first successful state load
- AgentMessage component now correctly identifies assistant messages without agent metadata

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
