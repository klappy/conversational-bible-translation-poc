# Setup Instructions for Bible Translation PoC

> **Version 0.3.0 Update**: This version includes a multi-agent architecture with specialized AI agents working together. The system will automatically fall back to single-agent mode if the multi-agent system encounters issues.

## Quick Start

### 1. Environment Setup

You need to create a `.env` file in the root directory with your OpenAI API key:

```bash
# Copy the example file and edit it
cp env.example .env
# Then edit .env and add your actual OpenAI API key
```

### 2. Install & Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Or run with Netlify Functions (recommended)
npm run dev:netlify
```

### 3. Access the App

- Local: http://localhost:5173
- With Netlify Dev: http://localhost:8888

### 4. Test the Mobile View

- Open browser DevTools (F12)
- Toggle device toolbar (Ctrl+Shift+M or Cmd+Shift+M)
- Select a mobile device or resize below 768px width

## Required API Keys

You'll need an OpenAI API key to use the chat functionality:

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add it to your `.env` file

## Features to Test

### Desktop Experience

- Chat with the AI assistant
- View the sidebar with 4 tabs (Style Guide, Glossary, Scripture, Feedback)
- Collapse/expand the sidebar
- Send messages and receive responses

### Mobile Experience

- Swipe between cards
- Test chat interface
- View different artifact cards
- Try the swipe-up gesture to dismiss cards

## Mock Features

The following features are mocked for the PoC:

- Audio recording (prompts for transcript paste)
- FIA images/maps (placeholder data)
- Community feedback (simulated)
- WhatsApp integration (not implemented)

## Troubleshooting

### "Cannot find module" errors

```bash
npm install
```

### Port already in use

```bash
# Kill the process using port 5173
lsof -ti:5173 | xargs kill -9
```

### OpenAI API errors

- Verify your API key is correct in `.env`
- Check you have credits on your OpenAI account

## Next Steps

To add real data:

1. Download FIA resources and place in `/public/data/ruth/fia/`
2. Add unfoldingWord resources to `/public/data/ruth/uw/`
3. Update Bible text in `/public/data/ruth/bsb-ruth-1.json`
