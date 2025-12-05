# 🪝 Kiro Hooks - Quick Reference

## 10 AI-Powered Hooks Created

### ✅ Ready to Use (Manual Triggers)

| Hook | Purpose | When to Use |
|------|---------|-------------|
| **Generate Tests** | Create unit tests | Before committing code |
| **Refactor Code Smell** | Fix quality issues | During refactoring |
| **Modernize Legacy Code** | Upgrade patterns | Working with legacy code |
| **Explain Complex Code** | Understand logic | Reading unfamiliar code |
| **Security Audit** | Find vulnerabilities | API/auth code |
| **Optimize Performance** | Improve speed | Slow code paths |
| **Code Review** | Quality check | Before pull requests |
| **Add TypeScript Types** | Type safety | JS → TS conversion |

### ⚠️ Disabled (Enable When Ready)

| Hook | Purpose | Enable When |
|------|---------|-------------|
| **Auto-Document on Save** | Auto-update docs | Want always-current docs |
| **Update README on Feature** | Keep README fresh | Active development |

---

## 🚀 Quick Start

### Use a Hook
1. Open any source file
2. Open Kiro sidebar → Agent Hooks
3. Click a hook (e.g., "Generate Tests")
4. Review AI suggestions
5. Apply changes

### Enable Auto Hooks
1. Open `.kiro/hooks/auto-document-on-save.json`
2. Change `"enabled": false` to `"enabled": true`
3. Save file
4. Hook now runs automatically!

---

## 💡 Common Workflows

### New Feature
```
1. Write code
2. Run "Generate Tests"
3. Run "Add TypeScript Types"
4. Run "Code Review"
5. Commit
```

### Legacy Code
```
1. Run "Explain Complex Code"
2. Run "Modernize Legacy Code"
3. Run "Generate Tests"
4. Apply changes
5. Run "Code Review"
```

### Performance Issue
```
1. Run "Explain Complex Code"
2. Run "Optimize Performance"
3. Apply optimizations
4. Run "Generate Tests"
5. Benchmark
```

---

## 📁 Files Created

All hooks are in `.kiro/hooks/`:
- `generate-tests-on-demand.json`
- `refactor-code-smell.json`
- `modernize-legacy-code.json`
- `explain-complex-code.json`
- `security-audit.json`
- `optimize-performance.json`
- `code-review.json`
- `add-typescript-types.json`
- `auto-document-on-save.json`
- `update-readme-on-feature.json`

---

## 🎯 Benefits

✅ **Automate repetitive tasks**
✅ **Maintain code quality**
✅ **Catch issues early**
✅ **Learn from AI suggestions**
✅ **Speed up development**
✅ **Improve code consistency**

---

## 📚 Full Documentation

See **`KIRO_HOOKS_GUIDE.md`** for:
- Detailed hook descriptions
- Customization guide
- Advanced workflows
- Troubleshooting
- Creating custom hooks

---

**Your AI-powered development workflow is ready!** 🚀
