module.exports = {
  // Glob patterns for files to include
  include: [
    'src/**/*.{ts,tsx,js,jsx}',
  ],
  
  // Glob patterns for files to exclude
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.{ts,tsx,js,jsx}',
    '**/*.spec.{ts,tsx,js,jsx}',
  ],
  
  // Patterns to identify barrel files (excluded from usage tracking)
  barrelFilePatterns: [
    '**/index.ts',
    '**/index.tsx',
    '**/index.js',
    '**/index.jsx',
  ],
  
  // Patterns to identify Storybook story files
  storyFilePatterns: [
    '**/*.stories.{ts,tsx,js,jsx}',
    '**/*.story.{ts,tsx,js,jsx}',
  ],
  
  // Similarity threshold (0-1) for detecting changes
  // Lower = more sensitive to changes
  similarityThreshold: 0.85,
  
  // Cache directory (optional)
  // Defaults to package installation directory (node_modules/canonical-cat/)
  // Set to custom path if you want persistent cache across reinstalls
  // cacheDir: './node_modules/.cache/canonical-cat',
  
  // Output configuration (optional)
  // Each format can be:
  //   - boolean: true/false (uses default filename)
  //   - object: { enabled: boolean, filename?: string }
  output: {
    markdown: true,  // Shorthand: enabled with default filename (CATALOG.md)
    llmTxt: { enabled: true, filename: 'llm.txt' },  // Full format
    json: { enabled: true, filename: 'catalog.json' },  // Custom filename
  },
  
  // Output path (defaults to current directory)
  outputPath: process.cwd(),
};
