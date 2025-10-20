#!/bin/bash

# Bible Translation Assistant - Quick Deploy Script
# This script helps you deploy to Netlify after creating your GitHub repo

echo "🚀 Bible Translation Assistant - Deployment Helper"
echo "================================================"
echo ""

# Check if git remote exists
if git remote | grep -q "origin"; then
    echo "⚠️  Git remote 'origin' already exists!"
    echo "Current remote: $(git remote get-url origin)"
    echo ""
    read -p "Do you want to update it? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your GitHub username: " github_username
        git remote set-url origin "https://github.com/$github_username/conversational-bible-translation-poc.git"
        echo "✅ Remote updated!"
    fi
else
    echo "📝 Setting up GitHub remote..."
    read -p "Enter your GitHub username: " github_username
    git remote add origin "https://github.com/$github_username/conversational-bible-translation-poc.git"
    echo "✅ Remote added!"
fi

echo ""
echo "📤 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "🌐 Now let's deploy to Netlify!"
    echo "================================"
    echo ""
    echo "Choose deployment method:"
    echo "1) Netlify CLI (recommended - faster)"
    echo "2) Netlify Web UI (visual interface)"
    echo ""
    read -p "Enter your choice (1 or 2): " deploy_choice

    if [ "$deploy_choice" = "1" ]; then
        echo ""
        echo "🚀 Deploying with Netlify CLI..."
        echo ""
        
        # Check if already linked
        if [ -f ".netlify/state.json" ]; then
            echo "Project already linked to Netlify!"
            netlify status
        else
            echo "Initializing Netlify..."
            netlify init
        fi
        
        echo ""
        echo "📦 Building and deploying to production..."
        netlify deploy --prod
        
        echo ""
        echo "🔑 Setting up environment variables..."
        read -p "Enter your OpenAI API key: " openai_key
        netlify env:set OPENAI_API_KEY "$openai_key"
        
        echo ""
        echo "✅ Deployment complete!"
        echo ""
        echo "Your site is live! Opening in browser..."
        netlify open:site
        
    elif [ "$deploy_choice" = "2" ]; then
        echo ""
        echo "📋 Manual Deployment Instructions:"
        echo "==================================="
        echo ""
        echo "1. Go to: https://app.netlify.com"
        echo "2. Click 'Add new site' → 'Import an existing project'"
        echo "3. Choose GitHub and select: conversational-bible-translation-poc"
        echo "4. Verify build settings:"
        echo "   - Build command: npm run build"
        echo "   - Publish directory: dist"
        echo "   - Functions directory: netlify/functions"
        echo "5. Add environment variable:"
        echo "   - Key: OPENAI_API_KEY"
        echo "   - Value: Your OpenAI API key"
        echo "6. Click 'Deploy site'"
        echo ""
        echo "Opening Netlify in your browser..."
        open "https://app.netlify.com" 2>/dev/null || xdg-open "https://app.netlify.com" 2>/dev/null || echo "Please open: https://app.netlify.com"
    else
        echo "Invalid choice. Please run the script again."
        exit 1
    fi
else
    echo "❌ Failed to push to GitHub!"
    echo ""
    echo "Please ensure you've created the repository on GitHub first:"
    echo "1. Go to: https://github.com/new"
    echo "2. Create repository named: conversational-bible-translation-poc"
    echo "3. DO NOT initialize with any files"
    echo "4. Run this script again"
    exit 1
fi

echo ""
echo "📚 Documentation:"
echo "- Deployment Guide: ./DEPLOYMENT_GUIDE.md"
echo "- Checklist: ./DEPLOYMENT_CHECKLIST.md"
echo ""
echo "Need help? Check the guides above or create an issue on GitHub!"
