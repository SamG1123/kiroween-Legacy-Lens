# 🪝 Kiro Hooks Guide - AI-Powered Automation

## What Are Hooks?

Hooks are automated workflows that trigger AI actions based on events in your IDE. They help you:
- Automate repetitive tasks
- Maintain code quality
- Generate documentation automatically
- Catch issues early

---

## 📋 Available Hooks

### 🔧 Manual Triggers (Click to Run)

#### 1. Generate Tests
**File**: `.kiro/hooks/generate-tests-on-demand.json`

Generates comprehensive unit tests for the current file.

**What it does:**
- Analyzes code structure
- Creates test cases (happy path, edge cases, errors)
- Uses appropriate framework (Jest/pytest/JUnit)
- Mocks external dependencies

**How to use:**
1. Open a source file
2. Click "Generate Tests" in Kiro Hooks panel
3. Review and save generated tests

---

#### 2. Refactor Code Smell
**File**: `.kiro/hooks/refactor-code-smell.json`

Identifies and fixes code smells.

**What it detects:**
- Long functions (>50 lines)
- High complexity (>10)
- Duplicate code
- Deep nesting
- Magic numbers
- Poor naming

**How to use:**
1. Open a file with code smells
2. Click "Refactor Code Smell"
3. Review suggestions
4. Apply refactorings

---

#### 3. Modernize Legacy Code
**File**: `.kiro/hooks/modernize-legacy-code.json`

Suggests modern patterns and upgrades.

**What it suggests:**
- Callbacks → Promises → Async/await
- var → let/const
- ES5 → ES6+ features
- Outdated dependencies
- Modern APIs

**How to use:**
1. Open legacy code file
2. Click "Modernize Legacy Code"
3. Review modernization suggestions
4. Apply changes incrementally

---

#### 4. Explain Complex Code
**File**: `.kiro/hooks/explain-complex-code.json`

Get clear explanations of confusing code.

**What it explains:**
- High-level overview
- Step-by-step logic breakdown
- Algorithms and patterns
- Performance considerations
- Potential issues

**How to use:**
1. Select complex code (or open file)
2. Click "Explain Complex Code"
3. Read the explanation
4. Ask follow-up questions

---

#### 5. Security Audit
**File**: `.kiro/hooks/security-audit.json`

Checks for security vulnerabilities.

**What it checks:**
- SQL injection
- XSS/CSRF
- Authentication issues
- Sensitive data exposure
- Hardcoded secrets
- Insecure dependencies

**How to use:**
1. Open a file (especially API/auth code)
2. Click "Security Audit"
3. Review vulnerabilities
4. Apply security fixes

---

#### 6. Optimize Performance
**File**: `.kiro/hooks/optimize-performance.json`

Suggests performance improvements.

**What it finds:**
- Inefficient algorithms
- Memory leaks
- Blocking operations
- Missing caching
- Redundant calculations

**How to use:**
1. Open a performance-critical file
2. Click "Optimize Performance"
3. Review optimization suggestions
4. Apply high-impact changes

---

#### 7. Code Review
**File**: `.kiro/hooks/code-review.json`

Comprehensive code review.

**What it reviews:**
- Code quality (readability, naming, organization)
- Best practices
- Potential bugs
- Security concerns
- Performance issues

**How to use:**
1. Open any file
2. Click "Code Review"
3. Get detailed feedback with ratings
4. Address issues

---

#### 8. Add TypeScript Types
**File**: `.kiro/hooks/add-typescript-types.json`

Improves TypeScript type safety.

**What it does:**
- Converts JS → TS
- Replaces 'any' with proper types
- Adds missing annotations
- Creates interfaces
- Adds generics

**How to use:**
1. Open JS or TS file
2. Click "Add TypeScript Types"
3. Review type improvements
4. Apply changes

---

### ⚡ Automatic Triggers (Disabled by Default)

#### 9. Auto-Document on Save
**File**: `.kiro/hooks/auto-document-on-save.json`
**Status**: ⚠️ Disabled (enable in hook file)

Automatically generates documentation when you save a file.

**What it does:**
- Analyzes code changes
- Updates JSDoc/docstrings
- Updates README if needed
- Only documents what changed

**How to enable:**
1. Open `.kiro/hooks/auto-document-on-save.json`
2. Change `"enabled": false` to `"enabled": true`
3. Save the file

**Triggers on:**
- Saving `.ts`, `.js`, `.py`, `.java`, `.go`, `.rb`, `.php` files

---

#### 10. Update README on Feature
**File**: `.kiro/hooks/update-readme-on-feature.json`
**Status**: ⚠️ Disabled (enable in hook file)

Updates README when tasks complete.

**What it does:**
- Reviews completed work
- Updates README sections
- Adds new features
- Updates examples

**How to enable:**
1. Open `.kiro/hooks/update-readme-on-feature.json`
2. Change `"enabled": false` to `"enabled": true`
3. Save the file

**Triggers on:**
- Agent task completion

---

## 🎯 How to Use Hooks

### Method 1: Kiro Hooks Panel
1. Open Kiro sidebar
2. Find "Agent Hooks" section
3. Click on any enabled hook
4. Wait for AI response

### Method 2: Command Palette
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Kiro Hook"
3. Select the hook you want to run

### Method 3: Edit Hook Files
1. Navigate to `.kiro/hooks/`
2. Open any `.json` file
3. Modify the message or settings
4. Save to apply changes

---

## 🔧 Customizing Hooks

### Hook Structure
```json
{
  "name": "Hook Name",
  "description": "What this hook does",
  "enabled": true,
  "trigger": {
    "type": "manual" | "onFileSave" | "onAgentComplete",
    "filePattern": "**/*.{ts,js}" // for onFileSave
  },
  "action": {
    "type": "sendMessage",
    "message": "Instructions for the AI..."
  }
}
```

### Trigger Types
- **manual**: Click to run
- **onFileSave**: Runs when you save a file
- **onAgentComplete**: Runs after agent finishes a task
- **onSessionCreate**: Runs when you start a new chat

### Customization Tips
1. **Modify the message**: Change AI instructions to fit your needs
2. **Add file patterns**: Restrict to specific file types
3. **Enable/disable**: Toggle `"enabled"` field
4. **Create new hooks**: Copy existing hook and modify

---

## 💡 Best Practices

### When to Use Manual Hooks
- **Generate Tests**: Before committing new code
- **Code Review**: Before pull requests
- **Security Audit**: For API/auth code
- **Refactor Code Smell**: During refactoring sessions
- **Optimize Performance**: For slow code paths

### When to Enable Auto Hooks
- **Auto-Document**: If you want docs always up-to-date
- **Update README**: For active development projects

### Tips
1. **Start with manual hooks** - Get familiar before enabling auto hooks
2. **Review AI suggestions** - Don't blindly apply changes
3. **Customize messages** - Tailor to your coding style
4. **Combine hooks** - Run multiple hooks on the same file
5. **Create project-specific hooks** - Add to `.kiro/hooks/`

---

## 🎨 Example Workflows

### Workflow 1: Legacy Code Modernization
```
1. Open legacy file
2. Run "Explain Complex Code" (understand it)
3. Run "Modernize Legacy Code" (get suggestions)
4. Run "Generate Tests" (safety net)
5. Apply modernization changes
6. Run "Code Review" (verify quality)
```

### Workflow 2: New Feature Development
```
1. Write new code
2. Run "Generate Tests" (create tests)
3. Run "Add TypeScript Types" (type safety)
4. Run "Security Audit" (check security)
5. Run "Code Review" (final check)
6. Commit with confidence
```

### Workflow 3: Performance Optimization
```
1. Identify slow code
2. Run "Explain Complex Code" (understand logic)
3. Run "Optimize Performance" (get suggestions)
4. Apply optimizations
5. Run "Generate Tests" (verify behavior)
6. Benchmark improvements
```

---

## 🚀 Advanced: Creating Custom Hooks

### Example: Auto-Format on Save
```json
{
  "name": "Auto-Format Code",
  "description": "Format code on save",
  "enabled": true,
  "trigger": {
    "type": "onFileSave",
    "filePattern": "**/*.{ts,js,tsx,jsx}"
  },
  "action": {
    "type": "executeCommand",
    "command": "prettier --write {{filePath}}"
  }
}
```

### Example: Generate Changelog
```json
{
  "name": "Generate Changelog",
  "description": "Update CHANGELOG.md",
  "enabled": true,
  "trigger": {
    "type": "manual"
  },
  "action": {
    "type": "sendMessage",
    "message": "Review recent git commits and update CHANGELOG.md with:\n1. New features\n2. Bug fixes\n3. Breaking changes\n4. Follow Keep a Changelog format"
  }
}
```

---

## 📊 Hook Status

| Hook | Type | Status | Use Case |
|------|------|--------|----------|
| Generate Tests | Manual | ✅ Enabled | Test generation |
| Refactor Code Smell | Manual | ✅ Enabled | Code quality |
| Modernize Legacy Code | Manual | ✅ Enabled | Modernization |
| Explain Complex Code | Manual | ✅ Enabled | Understanding |
| Security Audit | Manual | ✅ Enabled | Security |
| Optimize Performance | Manual | ✅ Enabled | Performance |
| Code Review | Manual | ✅ Enabled | Quality check |
| Add TypeScript Types | Manual | ✅ Enabled | Type safety |
| Auto-Document on Save | Auto | ⚠️ Disabled | Documentation |
| Update README on Feature | Auto | ⚠️ Disabled | Documentation |

---

## 🎓 Learning Resources

### Understanding Hooks
- Hooks run in your Kiro IDE
- They send messages to the AI agent
- AI analyzes your code and responds
- You review and apply suggestions

### Hook Variables
- `{{filePath}}`: Current file path
- `{{fileName}}`: Current file name
- `{{selectedText}}`: Selected code
- `{{projectPath}}`: Project root

---

## 🔍 Troubleshooting

### Hook Not Appearing
1. Check `.kiro/hooks/` folder exists
2. Verify JSON syntax is valid
3. Ensure `"enabled": true`
4. Restart Kiro IDE

### Hook Not Working
1. Check Groq API key is set
2. Verify file pattern matches
3. Check Kiro logs for errors
4. Try running manually first

### Customization Not Applied
1. Save the hook file
2. Reload Kiro hooks (Command Palette)
3. Check JSON syntax
4. Verify file permissions

---

## 📞 Support

Need help with hooks?
1. Check this guide
2. Review hook JSON files
3. Test with manual hooks first
4. Check Kiro documentation

---

**Happy automating with Kiro Hooks!** 🚀

Your AI-powered development assistant is ready to help you write better code faster!
