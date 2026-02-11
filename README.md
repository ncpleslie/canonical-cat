# Canonical Cat

A command-line tool for enhancing code discovery in large React projects. As codebases grow, finding and understanding existing components, hooks, and utilities becomes difficult. Canonical Cat automatically generates searchable documentation catalogs by scanning your codebase, extracting TypeScript signatures and usage patterns, and producing multiple forms of documentation that serves as a source-of-truth for both developers and AI coding assistants.

## Installation

```bash
npm install --save-dev canonical-cat
```

## Quick Start

### 1. Initialize Configuration

```bash
npx canonical-cat init
```

This creates a `catalog.config.js` file in your project root.

### 2. Configure (Optional)

Edit `catalog.config.js` to customize patterns and settings:

```javascript
module.exports = {
  include: ["src/**/*.{ts,tsx,js,jsx}"],
  exclude: ["**/node_modules/**", "**/dist/**"],
  similarityThreshold: 0.85,
};
```

### 3. Generate Catalog

```bash
npx canonical-cat generate
```

## Configuration

All configuration options for `catalog.config.js`:

| Field                 | Type                | Required | Default                                                                                                         | Description                                                                                          |
| --------------------- | ------------------- | -------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `include`             | `string[]`          | Yes      | `["src/**/*.{ts,tsx,js,jsx}"]`                                                                                  | Glob patterns for source files to analyze for components, hooks, and utilities                       |
| `exclude`             | `string[]`          | No       | `["**/node_modules/**", "**/dist/**", "**/build/**", "**/*.test.{ts,tsx,js,jsx}", "**/*.spec.{ts,tsx,js,jsx}"]` | Glob patterns for files to ignore during scanning                                                    |
| `barrelFilePatterns`  | `string[]`          | No       | `["**/index.ts", "**/index.tsx", "**/index.js", "**/index.jsx"]`                                                | Patterns to identify barrel files (re-export files) to exclude from usage tracking                   |
| `storyFilePatterns`   | `string[]`          | No       | `["**/*.stories.{ts,tsx,js,jsx}", "**/*.story.{ts,tsx,js,jsx}"]`                                                | Patterns to identify Storybook story files for linking examples to components                        |
| `similarityThreshold` | `number`            | No       | `0.85`                                                                                                          | Change detection sensitivity (0-1). Lower values are more sensitive to changes                       |
| `outputPath`          | `string`            | No       | `process.cwd()`                                                                                                 | Directory where catalog files will be written                                                        |
| `cacheDir`            | `string`            | No       | `node_modules/canonical-cat/`                                                                                   | Custom directory for storing the cache file (`.catalog-cache.json`)                                  |
| `output.markdown`     | `boolean \| object` | No       | `true`                                                                                                          | Enable/disable Markdown catalog. Use `{ enabled: boolean, filename?: string }` for custom filename   |
| `output.llmTxt`       | `boolean \| object` | No       | `true`                                                                                                          | Enable/disable LLM-optimized text. Use `{ enabled: boolean, filename?: string }` for custom filename |
| `output.json`         | `boolean \| object` | No       | `true`                                                                                                          | Enable/disable JSON catalog. Use `{ enabled: boolean, filename?: string }` for custom filename       |

### Example Configuration

**Minimal configuration:**

```javascript
module.exports = {
  include: ["src/**/*.{ts,tsx,js,jsx}"],
};
```

**Full configuration with all options:**

```javascript
module.exports = {
  // Required
  include: ["src/**/*.{ts,tsx,js,jsx}", "lib/**/*.ts"],

  // File filtering
  exclude: ["**/node_modules/**", "**/dist/**", "**/*.test.ts"],
  barrelFilePatterns: ["**/index.ts", "**/index.tsx"],
  storyFilePatterns: ["**/*.stories.tsx"],

  // Change detection
  similarityThreshold: 0.85,

  // Output configuration
  outputPath: "./docs",
  cacheDir: "./.catalog-cache",
  output: {
    markdown: { enabled: true, filename: "CATALOG.md" },
    llmTxt: { enabled: true, filename: "llm.txt" },
    json: false, // Disable JSON output
  },
};
```

**Custom output filenames:**

```javascript
module.exports = {
  include: ["src/**/*.tsx"],
  output: {
    markdown: { enabled: true, filename: "component-library.md" },
    llmTxt: { enabled: true, filename: "ai-context.txt" },
    json: { enabled: true, filename: "catalog-data.json" },
  },
};
```

## CLI Commands

### `canonical-cat generate`

Generate catalog.

```bash
npx canonical-cat generate [options]

Options:
  -c, --config <path>   Path to catalog.config.js
  -f, --force          Force regeneration (ignore cache)
  --filter <pattern>   Filter components by name
```

### `canonical-cat init`

Create a sample `catalog.config.js` file.

```bash
npx canonical-cat init
```

## Output Files

### CATALOG.md

Human-readable markdown with full details:

- Component descriptions (what/when to use)
- Type signatures
- Props/parameters
- Storybook examples
- Usage locations

### llm.txt

Concise format optimized for AI context windows:

```
[COMPONENT] Button
File: src/components/Button.tsx
What: A reusable button component with variants
When: Use for clickable actions throughout the app
Sig: ({ children, variant, onClick }: ButtonProps) => JSX.Element
Uses: 23 locations
```

### catalog.json

Structured JSON for programmatic access with full metadata.

## How It Works

### Smart Versioning

Component Cat generates two hashes for each component:

1. **Implementation Hash** - Function body and logic
2. **Interface Hash** - Props, types, and signature

Only components with changed hashes are regenerated.

### Usage Tracking

Uses TypeScript's AST to find all imports and references, excluding:

- Barrel files (index.ts, etc.)
- The component's own file
- Test files

## Best Practices

1. **Commit catalog files** - Check in CATALOG.md and llm.txt for team reference
2. **Run regularly** - Add to CI or pre-commit hooks
3. **JSDoc comments** - Write good JSDoc for better extraction and provide more context to your LLMs
4. **Storybook stories** - Create stories for better examples

## Quick Demo

See it in action with the included example React project:

```bash
cd example
npx canonical-cat generate
cat CATALOG.md
```

The example cataloged **26 items** including Button, Card, Modal components, custom hooks, and utility functions with full TypeScript types.

**[See the example project](./example/)**

## TypeScript Support

Component Cat automatically detects your `tsconfig.json` for proper type resolution and path mapping.

## Contributing

Issues and PRs welcome at https://github.com/ncpleslie/canonical-cat/issues

## License

MIT
