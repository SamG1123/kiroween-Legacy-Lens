# 🚀 Groq AI Setup Guide

Your Legacy Code Revival system now uses **Groq** - ultra-fast, free AI inference!

## Quick Setup

### 1. Get Free API Key
- Visit: **https://console.groq.com/keys**
- Sign up (free)
- Create API key
- Copy it (starts with `gsk_...`)

### 2. Add to .env
```env
GROQ_API_KEY=gsk_your_api_key_here
```

### 3. Test It
```bash
npm run test:groq
```

## Available Models

| Model | Speed | Quality | Best For |
|-------|-------|---------|----------|
| `llama3-8b-8192` | ⚡ Very Fast | Good | Documentation, general tasks |
| `llama3-70b-8192` | Slower | Better | Complex analysis |
| `mixtral-8x7b-32768` | Fast | Good | Code generation |

Default: `llama3-8b-8192`

## Features Enabled

✅ Documentation generation
✅ Test generation  
✅ Code explanation
✅ Modernization analysis
✅ Refactoring suggestions

## Why Groq?

- **10x faster** than OpenAI
- **Free tier** with generous limits
- **Code-optimized** models
- **No data retention**

## Rate Limits (Free)
- 30 requests/minute
- 6,000 tokens/minute

That's it! Your AI features are ready to go.
