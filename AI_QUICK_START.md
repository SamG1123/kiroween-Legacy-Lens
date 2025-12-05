# 🚀 AI Features Quick Start

## Setup (2 minutes)

### 1. Get Groq API Key
```bash
# Visit: https://console.groq.com/keys
# Sign up (free)
# Create API key
# Copy it (starts with gsk_...)
```

### 2. Add to .env
```bash
GROQ_API_KEY=gsk_your_key_here
AI_PROVIDER=groq
AI_MODEL=llama3-8b-8192
```

### 3. Test It
```bash
npm run test:groq
npm run test:ai
```

---

## Usage Examples

### Full AI Analysis
```bash
# 1. Analyze a codebase
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Project",
    "sourceType": "github",
    "sourceUrl": "https://github.com/user/repo"
  }'

# Response: { "projectId": "abc-123", "status": "pending" }

# 2. Run full AI analysis
curl -X POST http://localhost:3000/api/ai/full-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "abc-123"
  }'

# 3. Get results
curl http://localhost:3000/api/ai/results/abc-123
```

### Documentation Only
```bash
curl -X POST http://localhost:3000/api/ai/documentation \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "abc-123",
    "options": {
      "includeReadme": true,
      "includeFunctionDocs": true,
      "includeArchitecture": true
    }
  }'
```

### Tests Only
```bash
curl -X POST http://localhost:3000/api/ai/tests \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "abc-123",
    "options": {
      "framework": "jest",
      "coverage": "comprehensive"
    }
  }'
```

### Modernization Only
```bash
curl -X POST http://localhost:3000/api/ai/modernization \
  -H "Content-Type: application/json" \
  -d '{ "projectId": "abc-123" }'
```

### Refactoring Only
```bash
curl -X POST http://localhost:3000/api/ai/refactoring \
  -H "Content-Type: application/json" \
  -d '{ "projectId": "abc-123" }'
```

---

## Available Commands

```bash
npm run dev              # Start server
npm run test:groq        # Test Groq connection
npm run test:ai          # Test all AI features
npm run test:db          # Test database
npm run check            # Check system setup
npm run migrate:up       # Run migrations
```

---

## Features

### 📝 Documentation Generator
- Auto-generate README
- Function/class docs
- Architecture overview
- API documentation

### 🧪 Test Generator
- Generate unit tests
- Support Jest, pytest, JUnit
- Edge case coverage
- Coverage gap analysis

### 🔄 Modernization Advisor
- Outdated dependencies
- Framework upgrades
- Pattern modernization
- Migration roadmap

### ✨ Refactoring Engine
- Code smell detection
- Safe refactorings
- Before/after diffs
- Auto-apply option

---

## Troubleshooting

### API Key Issues
```bash
# Check if key is set
cat .env | grep GROQ

# Test connection
npm run test:groq
```

### Rate Limits
- Free tier: 30 requests/minute
- Wait 1 minute if you hit limits
- Consider upgrading for higher limits

### Model Selection
```bash
# Fast (default)
AI_MODEL=llama3-8b-8192

# Better quality
AI_MODEL=llama3-70b-8192

# Good for code
AI_MODEL=mixtral-8x7b-32768
```

---

## What's Next?

1. **Test with real projects** - Analyze your legacy codebases
2. **Build frontend** - Create web UI for visualization
3. **Deploy** - Put it in production
4. **Extend** - Add more AI features

---

**You're ready to revive legacy code with AI!** 🎉
