# Contributing to Component Cat

Thank you for your interest in contributing!

## Development Setup

```bash
# Clone repository
git clone <repo-url>
cd canonical-cat

# Install dependencies
npm install

# Build
npm run build

# Watch mode for development
npm run watch
```

## Project Structure

- `src/cli.ts` - CLI commands and entry point
- `src/config.ts` - Configuration loading
- `src/generator.ts` - Main catalog generator orchestration
- `src/types.ts` - TypeScript type definitions
- `src/lib/` - Core libraries
  - `hasher.ts` - Versioning and caching
  - `usage-tracker.ts` - Cross-file usage tracking
  - `generators.ts` - Output file generation

## Testing

Test locally using the example directory:

```bash
# Build
npm run build

# Test generation
node dist/cli.js generate

# Test with example project
cd example
node ../dist/cli.js init
node ../dist/cli.js generate
```

## Making Changes

1. Make your changes in `src/`
2. Run `npm run build` to compile
3. Test with `node dist/cli.js`
4. Ensure TypeScript compiles without errors
5. Update README.md if adding features
6. Submit pull request

## Adding New Features

### New Output Format

1. Create new generator class in `src/lib/generators.ts`
2. Implement `initialize()`, `addComponent()`, `finalize()`
3. Add to `CatalogWriter` orchestrator
4. Update README

### New Extraction Type

1. Add detection logic in `src/generator.ts` `extractComponentMetadata()`
2. Update `ComponentMetadata` type if needed
3. Add to category mapping in generators

## Code Style

- Use TypeScript strict mode
- Add JSDoc comments for public APIs
- Use descriptive variable names
- Keep functions focused and small
- Handle errors gracefully

## Questions?

Please open an issue for discussion before making changes.
