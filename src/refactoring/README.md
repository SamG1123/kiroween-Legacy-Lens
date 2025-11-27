# Refactoring Engine

The Refactoring Engine automatically improves code quality by applying safe, behavior-preserving transformations to legacy code.

## Architecture

```
src/refactoring/
├── detectors/       # Smell detection (long methods, duplication, etc.)
├── suggesters/      # Refactoring suggestion generation
├── planners/        # Refactoring planning and prioritization
├── transformers/    # AST-based code transformations
├── validators/      # Safety validation
├── runners/         # Test execution and verification
├── ai/             # AI-powered naming and SOLID suggestions
└── types.ts        # Core type definitions
```

## Components

### Detectors
Identify code smells and refactoring opportunities:
- Long methods
- Code duplication
- Complex conditionals
- Poor naming
- SOLID violations

### Suggesters
Generate refactoring suggestions with before/after examples and risk assessments.

### Planners
Plan refactoring execution order based on dependencies and priorities.

### Transformers
Apply refactorings using AST transformations:
- Extract method
- Remove duplication
- Simplify conditionals
- Rename identifiers
- SOLID refactorings

### Validators
Ensure refactorings are safe:
- Syntax validation
- Naming conflict detection
- Behavior preservation checks

### Runners
Execute tests to verify behavior preservation.

### AI
AI-powered suggestions for:
- Descriptive method names
- Variable naming
- SOLID refactoring recommendations

## Usage

```typescript
import { SmellDetector, RefactoringSuggester, CodeTransformer } from './refactoring';

// Detect code smells
const detector = new SmellDetector();
const smells = detector.detectLongMethods(code);

// Generate suggestions
const suggester = new RefactoringSuggester();
const suggestions = suggester.suggestRefactorings(smells);

// Apply refactoring
const transformer = new CodeTransformer();
const result = transformer.applyRefactoring(code, suggestions[0]);
```

## Safety Guarantees

1. **Test-Driven**: Always run tests before and after
2. **Atomic**: All-or-nothing application
3. **Reversible**: Every refactoring can be undone
4. **Validated**: Check for conflicts before applying
5. **Incremental**: Apply one refactoring at a time

## Dependencies

- `@babel/parser` - JavaScript/TypeScript parsing
- `jscodeshift` - AST transformations
- `recast` - Code generation from AST
- `diff` - Diff generation
- `fast-check` - Property-based testing
- OpenAI/Anthropic - AI-powered suggestions
