# Deployment Guide - Bible Translation Assistant

## Quick Start Deployment Instructions

This guide will walk you through deploying your Bible Translation Assistant to production on Netlify.

## Step 1: Create GitHub Repository ✅

### Manual Steps Required:

1. Go to https://github.com/new
2. Create a new repository with these settings:
   - Repository name: `conversational-bible-translation-poc`
   - Description: "AI-powered conversational Bible translation assistant using FIA methodology"
   - Visibility: Choose Public or Private
   - ⚠️ **DO NOT** initialize with README, .gitignore, or license
3. Click "Create repository"

### Push Your Code:

After creating the repository, run these commands in your terminal:

```bash
# Add your GitHub repository as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/conversational-bible-translation-poc.git

# Push your code to GitHub
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Netlify

### Option A: Deploy via Netlify Web UI (Recommended)

1. **Connect Repository**:

   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Choose "GitHub"
   - Authorize Netlify to access your GitHub account
   - Select the `conversational-bible-translation-poc` repository

2. **Configure Build Settings**:
   Netlify should auto-detect these, but verify:

   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

3. **Add Environment Variables**:

   - Click "Show advanced" before deploying
   - Add variables:
     - Key: `OPENAI_API_KEY`
     - Value: Your OpenAI API key
     - (Optional) Key: `OPENAI_MODEL`
     - (Optional) Value: `gpt-4o-mini`

4. **Deploy**:
   - Click "Deploy site"
   - Wait 2-3 minutes for the build to complete
   - Your site will be live at a URL like: `amazing-curie-12345.netlify.app`

### Option B: Deploy via CLI (Alternative)

If you prefer using the command line:

```bash
# Link to Netlify (you'll be prompted to login)
netlify init

# Choose "Create & configure a new site"
# Select your team
# Choose a unique site name or leave blank for auto-generated

# Deploy to production
netlify deploy --prod

# Set environment variables
netlify env:set OPENAI_API_KEY "your_api_key_here"
```

## Step 3: Verify Deployment

### Testing Checklist:

- [ ] Site loads at your Netlify URL
- [ ] Chat interface appears and accepts input
- [ ] Translation Assistant responds to messages
- [ ] Scripture Canvas sidebar works on desktop
- [ ] Mobile swipe navigation works on mobile devices
- [ ] Agents show with proper names and avatars
- [ ] State persists between messages

### Common Issues:

1. **"Failed to load" or API errors**:

   - Verify OPENAI_API_KEY is set in Netlify environment variables
   - Check OpenAI API key is valid and has credits

2. **Functions not working**:

   - Check Netlify Functions logs: Site dashboard → Functions → View logs
   - Verify functions directory is set to `netlify/functions`

3. **Build failures**:
   - Check build logs in Netlify dashboard
   - Clear cache and retry: Deploy settings → Clear cache and deploy site

## Step 4: Post-Deployment Setup (Optional)

### Custom Domain

1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Follow DNS configuration for your provider

### Deploy Notifications

1. Go to Site settings → Build & deploy → Deploy notifications
2. Add email or Slack webhook for build status

### Monitoring

1. Enable Netlify Analytics (paid feature)
2. Set up error tracking (e.g., Sentry)
3. Monitor function logs regularly

## Environment Variables Reference

| Variable       | Required | Default     | Description             |
| -------------- | -------- | ----------- | ----------------------- |
| OPENAI_API_KEY | Yes      | -           | Your OpenAI API key     |
| OPENAI_MODEL   | No       | gpt-4o-mini | Model for primary agent |

## Useful Commands

```bash
# Check deployment status
netlify status

# View production logs
netlify functions:log

# Open production site
netlify open:site

# Open Netlify admin
netlify open:admin

# Run locally with Netlify dev
npm run dev:netlify
```

## Support Resources

- [Netlify Documentation](https://docs.netlify.com)
- [Troubleshooting Builds](https://docs.netlify.com/configure-builds/troubleshooting-tips/)
- [Functions Documentation](https://docs.netlify.com/functions/overview/)
- Project Issues: Create an issue on GitHub

## Next Steps

After successful deployment:

1. Share the URL with stakeholders for testing
2. Gather feedback on the translation workflow
3. Monitor usage and API costs
4. Prepare demo scenarios for ETEN Summit

---

**Need Help?** Check the [GitHub Setup Guide](./docs/GITHUB_SETUP.md) for detailed Git instructions.
