# Set Your OpenAI API Key

## Quick Setup

To set your OpenAI API key for the deployed site, run this command in your terminal:

```bash
netlify env:set OPENAI_API_KEY "your_actual_api_key_here"
```

Replace `your_actual_api_key_here` with your actual OpenAI API key.

## Where to Find Your API Key

1. Go to: https://platform.openai.com/api-keys
2. Sign in to your OpenAI account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-`)
5. Use it in the command above

## Verify It's Set

After setting, you can verify with:

```bash
netlify env:list
```

## Security Note

- Never commit API keys to Git
- The key is stored securely in Netlify
- It's only accessible to your serverless functions

## Ready to Deploy?

Once you've set your API key, the site will automatically rebuild and deploy with the key available!
