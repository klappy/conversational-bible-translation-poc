# GitHub Setup Instructions

## Prerequisites
- GitHub account (create one at https://github.com if needed)
- Git configured with your credentials

## Steps to Push to GitHub

### 1. Create a New Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `conversational-bible-translation-poc`
3. Description: "AI-powered conversational Bible translation assistant using FIA methodology"
4. Set to **Public** or **Private** (your choice)
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### 2. Add GitHub Remote

After creating the repository, GitHub will show you commands. Use these (replace YOUR_USERNAME):

```bash
# Add the remote repository
git remote add origin https://github.com/YOUR_USERNAME/conversational-bible-translation-poc.git

# Verify the remote was added
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

### Alternative: Using GitHub CLI

If you have GitHub CLI installed:

```bash
# Create repo and push in one command
gh repo create conversational-bible-translation-poc --public --source=. --remote=origin --push
```

### 3. Verify Success

- Visit your GitHub repository page
- You should see all files and commits
- The README.md should be displayed

## Setting Up Netlify Deployment

### 1. Connect to Netlify

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Choose "GitHub"
4. Authorize Netlify to access your GitHub
5. Select the `conversational-bible-translation-poc` repository

### 2. Configure Build Settings

Netlify should auto-detect these, but verify:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`

### 3. Set Environment Variables

In Netlify dashboard → Site settings → Environment variables:

1. Click "Add a variable"
2. Add these variables:
   - Key: `OPENAI_API_KEY`
   - Value: Your actual OpenAI API key
   - Scope: Production (and Preview if desired)

3. Optional:
   - Key: `OPENAI_MODEL`
   - Value: `gpt-4o-mini`

### 4. Deploy

1. Click "Deploy site"
2. Wait for build to complete (2-3 minutes)
3. Your site will be live at a Netlify URL (e.g., `amazing-curie-12345.netlify.app`)

### 5. Custom Domain (Optional)

1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Follow instructions for your domain provider

## Continuous Deployment

Once connected, every push to `main` branch will:
1. Trigger automatic build on Netlify
2. Run tests (if configured)
3. Deploy to production
4. Update live site

## GitHub Repository Settings

### Recommended Settings

1. **About section**: Add description and topics
   - Topics: `bible-translation`, `ai`, `react`, `netlify`, `fia-methodology`
   
2. **README badges**: Add to README.md
   ```markdown
   [![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR-BADGE-ID/deploy-status)](https://app.netlify.com/sites/YOUR-SITE-NAME/deploys)
   ```

3. **GitHub Pages** (optional for docs):
   - Settings → Pages
   - Source: Deploy from branch
   - Branch: main, /docs folder

## Collaboration Setup

### Adding Collaborators

1. Go to Settings → Manage access
2. Click "Add people"
3. Enter GitHub username or email
4. Choose permission level

### Branch Protection (Optional)

For production safety:
1. Settings → Branches
2. Add rule for `main`
3. Enable:
   - Require pull request reviews
   - Dismiss stale reviews
   - Include administrators

## Secrets Management

### For GitHub Actions (if needed later)

1. Settings → Secrets and variables → Actions
2. Add repository secrets:
   - `OPENAI_API_KEY`
   - `NETLIFY_AUTH_TOKEN`
   - `NETLIFY_SITE_ID`

## Local Development After Cloning

For other developers or fresh setup:

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/conversational-bible-translation-poc.git
cd conversational-bible-translation-poc

# Install dependencies
npm install

# Create .env file
echo "OPENAI_API_KEY=your_key_here" > .env

# Run development server
npm run dev

# Or with Netlify Dev
npm run dev:netlify
```

## Troubleshooting

### Push Rejected

If push is rejected:
```bash
git pull origin main --rebase
git push origin main
```

### Authentication Issues

For HTTPS:
```bash
git config --global credential.helper cache
```

For SSH (more secure):
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add to GitHub
cat ~/.ssh/id_ed25519.pub
# Copy and add to GitHub → Settings → SSH Keys

# Update remote to use SSH
git remote set-url origin git@github.com:YOUR_USERNAME/conversational-bible-translation-poc.git
```

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Deploy to Netlify
3. ✅ Configure environment variables
4. ✅ Test live deployment
5. 📝 Share URL with stakeholders
6. 🎯 Prepare for ETEN Summit demo

---

*Remember to never commit sensitive data like API keys to GitHub!*
