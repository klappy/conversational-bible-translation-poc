# Deployment Checklist

## Pre-Flight Checks ✅

- [x] Build tested locally (`npm run build`)
- [x] Environment variables documented
- [x] `.gitignore` configured properly
- [x] Netlify configuration (`netlify.toml`) present
- [x] Netlify CLI installed and authenticated
- [x] All changes committed to git

## Deployment Steps

### Phase 1: GitHub Repository 🚀

**Status**: Ready to create

**Action Required**:

1. Go to: https://github.com/new
2. Create repository named: `conversational-bible-translation-poc`
3. Set visibility (Public/Private)
4. **DO NOT initialize with any files**
5. After creation, run in terminal:

```bash
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/conversational-bible-translation-poc.git
git push -u origin main
```

### Phase 2: Netlify Deployment 🌐

**Two Options Available**:

#### Option A: Web UI (Easier)

- [ ] Go to https://app.netlify.com
- [ ] Import from GitHub
- [ ] Configure build settings
- [ ] Add OPENAI_API_KEY environment variable
- [ ] Deploy

#### Option B: CLI (Faster)

```bash
# Run these commands:
netlify init
# Choose: Create & configure a new site
# Select team: unfoldingWord or klappy
# Choose site name or leave blank

# Deploy immediately
netlify deploy --prod

# Set environment variable
netlify env:set OPENAI_API_KEY "your_key_here"
```

### Phase 3: Verification 🧪

- [ ] Site loads successfully
- [ ] Chat interface works
- [ ] Agents respond correctly
- [ ] Mobile view works
- [ ] Desktop sidebar works

## Current Status

**You are currently logged in to Netlify CLI as:**

- Name: Christopher Klapp
- Email: christopher@klapp.name
- Teams: unfoldingWord, klappy

**Next Step**: Create GitHub repository and push code

## Quick Commands

```bash
# After GitHub repo is created:
git remote add origin [your-repo-url]
git push -u origin main

# Then deploy with CLI:
netlify init
netlify deploy --prod
netlify env:set OPENAI_API_KEY "your_key"

# Or use web UI at:
# https://app.netlify.com
```

## Environment Variables Needed

```
OPENAI_API_KEY=your_actual_api_key_here
```

Optional:

```
OPENAI_MODEL=gpt-4o-mini
```

## Files Ready for Deployment

✅ All required files are present:

- `/netlify.toml` - Configuration
- `/package.json` - Dependencies
- `/netlify/functions/` - Serverless functions
- `/src/` - React application
- `/public/` - Static assets

## Support Links

- [Create GitHub Repo](https://github.com/new)
- [Netlify Dashboard](https://app.netlify.com)
- [OpenAI API Keys](https://platform.openai.com/api-keys)

---

**Ready to deploy!** Follow the steps above in order.
