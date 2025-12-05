# 🔧 Kiro Hooks Troubleshooting

## Hooks Not Appearing in Sidebar

If hooks aren't showing up in the Agent Hooks sidebar, try these steps:

### Step 1: Verify Hook Files Exist
```bash
# Check if hooks folder exists
ls .kiro/hooks/

# Should show:
# - generate-tests.json
# - refactor-smell.json
# - modernize-code.json
# - explain-code.json
# - security-check.json
# - optimize-perf.json
# - review-code.json
# - add-types.json
```

### Step 2: Reload Kiro
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Reload Window"
3. Press Enter
4. Check Agent Hooks sidebar again

### Step 3: Check Kiro Version
Hooks might require a specific Kiro version. Check:
1. Help → About Kiro
2. Ensure you're on the latest version
3. Update if needed

### Step 4: Use Command Palette Instead
If sidebar doesn't work, try Command Palette:
1. Press `Ctrl+Shift+P`
2. Type "Kiro: Run Hook" or "Kiro Hook"
3. Select a hook from the list

### Step 5: Manual Execution
You can manually send the hook messages:
1. Open Kiro chat
2. Copy message from hook file
3. Paste and send

Example from `generate-tests.json`:
```
Generate comprehensive unit tests for the currently open file. 
Analyze the code structure, identify testable functions/classes, 
and create test cases using the appropriate framework.
```

### Step 6: Check Hook Format
Hooks should be in `.kiro/hooks/` with this format:

**Simple Format** (try this first):
```json
{
  "name": "Hook Name",
  "description": "What it does",
  "trigger": "manual",
  "action": "sendMessage",
  "message": "Instructions for AI..."
}
```

**Alternative Format**:
```json
{
  "name": "Hook Name",
  "description": "What it does",
  "enabled": true,
  "trigger": {
    "type": "manual"
  },
  "action": {
    "type": "sendMessage",
    "message": "Instructions for AI..."
  }
}
```

### Step 7: Check Kiro Settings
1. Open `.kiro/settings/hooks.json` (if it exists)
2. Verify hooks are listed and enabled
3. Check for JSON syntax errors

### Step 8: Enable Hooks Panel
1. View → Appearance → Show Kiro Panel
2. Look for "Agent Hooks" section
3. If not visible, check View menu for hooks option

### Step 9: Check Workspace
Hooks are workspace-specific:
1. Ensure you're in the correct workspace
2. Check if `.kiro/hooks/` is in your workspace root
3. Try opening a file before checking hooks

### Step 10: Create Test Hook
Create a simple test hook to verify functionality:

`.kiro/hooks/test.json`:
```json
{
  "name": "Test Hook",
  "description": "Test if hooks work",
  "trigger": "manual",
  "action": "sendMessage",
  "message": "Say 'Hooks are working!' if you can see this."
}
```

If this appears, hooks are working!

---

## Alternative: Use Kiro Chat Directly

While hooks are being set up, you can use these prompts directly in Kiro chat:

### Generate Tests
```
Generate comprehensive unit tests for #File
Include happy path, edge cases, and error handling.
Use Jest for JS/TS, pytest for Python.
```

### Refactor Code Smell
```
Analyze #File for code smells:
- Long functions (>50 lines)
- High complexity (>10)
- Duplicate code
- Deep nesting
Suggest refactorings with before/after examples.
```

### Modernize Code
```
Analyze #File for modernization opportunities:
- Callbacks → Promises → Async/await
- var → let/const
- ES5 → ES6+
- Outdated dependencies
Show before/after examples.
```

### Explain Code
```
Explain #File in simple terms:
- High-level overview
- Step-by-step logic breakdown
- Algorithms and patterns used
- Potential issues
```

### Security Audit
```
Perform security audit on #File:
- SQL injection
- XSS/CSRF
- Auth issues
- Hardcoded secrets
- Insecure dependencies
Rate severity and suggest fixes.
```

### Optimize Performance
```
Analyze #File for performance issues:
- Inefficient algorithms
- Memory leaks
- Blocking operations
- Missing caching
Suggest optimizations with impact estimates.
```

### Code Review
```
Perform comprehensive code review on #File:
- Code quality (readability, naming, organization)
- Best practices
- Potential bugs
- Security concerns
Rate each category (1-5 stars).
```

### Add TypeScript Types
```
Improve TypeScript types in #File:
- Replace 'any' with proper types
- Add missing annotations
- Create interfaces
- Add generics
Show before/after comparison.
```

---

## Still Not Working?

### Check Kiro Documentation
1. Open Command Palette
2. Type "Kiro: Open Documentation"
3. Search for "hooks" or "agent hooks"

### Check Kiro Logs
1. Help → Toggle Developer Tools
2. Check Console for errors
3. Look for hook-related messages

### Contact Support
If hooks still don't appear:
1. Check Kiro GitHub issues
2. Ask in Kiro Discord/Slack
3. File a bug report with:
   - Kiro version
   - OS version
   - Hook file contents
   - Screenshots

---

## Workaround: Steering Files

If hooks don't work, use steering files instead:

`.kiro/steering/code-quality.md`:
```markdown
# Code Quality Guidelines

When reviewing code, always check for:
- Code smells (long functions, high complexity)
- Security vulnerabilities
- Performance issues
- Type safety
- Best practices

Suggest improvements with examples.
```

Steering files are always included in context!

---

## Quick Reference

**Hook Files Location**: `.kiro/hooks/*.json`
**Settings File**: `.kiro/settings/hooks.json`
**Reload Command**: `Ctrl+Shift+P` → "Reload Window"
**Alternative**: Use Kiro chat with `#File` context

---

**Need more help?** Check `KIRO_HOOKS_GUIDE.md` for detailed documentation.
