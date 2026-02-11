import path from "node:path";
import z from "zod";

/**
 * Package name constants
 */
export const PACKAGE_NAME = "canonical-cat";
export const PACKAGE_DISPLAY_NAME = "Component Cat";

/**
 * Package root directory - resolves to the installed package location
 * in node_modules/canonical-cat/ (or wherever the package is installed)
 */
export const PACKAGE_ROOT = path.join(__dirname, "..");

/**
 * Supported config file extensions
 * - TypeScript projects: .mts
 * - JavaScript projects: .mjs
 */
export const CONFIG_FILE_EXTENSIONS = {
  typescriptModule: ".mts",
  javascriptModule: ".mjs",
} as const;

/**
 * Config file base name
 */
export const CONFIG_FILE_NAME = "catalog.config";

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  include: ["src/**/*.{ts,tsx,js,jsx}"],
  exclude: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/*.test.{ts,tsx,js,jsx}",
    "**/*.spec.{ts,tsx,js,jsx}",
  ],
  barrelFilePatterns: [
    "**/index.ts",
    "**/index.tsx",
    "**/index.js",
    "**/index.jsx",
  ],
  storyFilePatterns: [
    "**/*.stories.{ts,tsx,js,jsx}",
    "**/*.story.{ts,tsx,js,jsx}",
  ],
  constantsFilePatterns: [
    "**/*.constants.{ts,tsx,js,jsx}",
    "**/*.constant.{ts,tsx,js,jsx}",
    "**/*.const.{ts,tsx,js,jsx}",
    "**/constant.{ts,tsx,js,jsx}",
  ],
  similarityThreshold: 0.85,
  outputPath: process.cwd(),
};

/**
 * Default output filenames
 */
export const DEFAULT_OUTPUT_FILENAMES = {
  markdown: "CATALOG.md",
  llmTxt: "llm.txt",
  json: "catalog.json",
} as const;

const OutputFormatConfigSchema = z.union([
  z.boolean(),
  z.object({
    enabled: z.boolean(),
    filename: z.string().optional(),
  }),
]);

export const CATALOG_CONFIG_SCHEMA = z.object({
  include: z
    .array(z.string(), {
      error: `Missing required field "include". Must be an array of strings. Example: ["src/**/*.{ts,tsx}"]. Default: ${JSON.stringify(DEFAULT_CONFIG.include)}`,
    })
    .min(1, {
      message: `Must specify at least one include pattern. Example: ["src/**/*.{ts,tsx}"]. Default: ${JSON.stringify(DEFAULT_CONFIG.include)}`,
    }),
  exclude: z
    .array(z.string(), {
      error: `Field "exclude" must be an array of strings. Example: ["**/*.test.ts"]. Default: ${JSON.stringify(DEFAULT_CONFIG.exclude)}`,
    })
    .optional()
    .describe(
      `Optional array of glob patterns to exclude. Example: ["**/*.test.ts"]. Default: ${JSON.stringify(DEFAULT_CONFIG.exclude)}`,
    ),
  barrelFilePatterns: z
    .array(z.string(), {
      error: `Field "barrelFilePatterns" must be an array of strings. Example: ["**/index.ts"]. Default: ${JSON.stringify(DEFAULT_CONFIG.barrelFilePatterns)}`,
    })
    .optional()
    .describe(
      `Optional array of patterns for barrel files. Example: ["**/index.ts"]. Default: ${JSON.stringify(DEFAULT_CONFIG.barrelFilePatterns)}`,
    ),
  storyFilePatterns: z
    .array(z.string(), {
      error: `Field "storyFilePatterns" must be an array of strings. Example: ["**/*.stories.tsx"]. Default: ${JSON.stringify(DEFAULT_CONFIG.storyFilePatterns)}`,
    })
    .optional()
    .describe(
      `Optional array of patterns for story files. Example: ["**/*.stories.tsx"]. Default: ${JSON.stringify(DEFAULT_CONFIG.storyFilePatterns)}`,
    ),
  constantsFilePatterns: z
    .array(z.string(), {
      error: `Field "constantsFilePatterns" must be an array of strings. Example: ["**/*.constants.ts"]. Default: ${JSON.stringify(DEFAULT_CONFIG.constantsFilePatterns)}`,
    })
    .optional()
    .describe(
      `Optional array of patterns for constants files. Example: ["**/*.constants.ts"]. Default: ${JSON.stringify(DEFAULT_CONFIG.constantsFilePatterns)}`,
    ),
  similarityThreshold: z
    .number({
      error: `Field "similarityThreshold" must be a number between 0 and 1. Example: 0.85. Default: ${DEFAULT_CONFIG.similarityThreshold}`,
    })
    .min(0, { message: "Similarity threshold must be at least 0" })
    .max(1, {
      message: `Similarity threshold must be at most 1. Example: 0.85. Default: ${DEFAULT_CONFIG.similarityThreshold}`,
    })
    .optional(),
  outputPath: z
    .string({
      error: `Field "outputPath" must be a string. Example: "./docs". Default: current working directory`,
    })
    .optional()
    .describe(
      `Optional output directory path. Example: "./docs". Default: current working directory`,
    ),
  cacheDir: z
    .string({
      error: `Field "cacheDir" must be a string. Example: "./node_modules/.cache/canonical-cat". Default: package installation directory`,
    })
    .optional()
    .describe(
      `Optional cache directory path. Example: "./node_modules/.cache/canonical-cat". Default: package installation directory (node_modules/canonical-cat/)`,
    ),
  output: z
    .object(
      {
        markdown: OutputFormatConfigSchema.optional().describe(
          `Generate markdown catalog. Boolean (enabled/disabled) or object with 'enabled' and optional 'filename'. Default: { enabled: true, filename: "${DEFAULT_OUTPUT_FILENAMES.markdown}" }`,
        ),
        llmTxt: OutputFormatConfigSchema.optional().describe(
          `Generate LLM-optimized text file. Boolean or object with 'enabled' and optional 'filename'. Default: { enabled: true, filename: "${DEFAULT_OUTPUT_FILENAMES.llmTxt}" }`,
        ),
        json: OutputFormatConfigSchema.optional().describe(
          `Generate JSON catalog. Boolean or object with 'enabled' and optional 'filename'. Default: { enabled: true, filename: "${DEFAULT_OUTPUT_FILENAMES.json}" }`,
        ),
      },
      {
        error: `Field "output" must be an object with optional fields (markdown, llmTxt, json). Each can be a boolean or { enabled: boolean, filename?: string }`,
      },
    )
    .optional(),
});

/**
 * Example configuration template for init command
 */
export const EXAMPLE_CONFIG = `module.exports = {
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
  
  // Patterns to identify barrel files (excluded from catalog output)
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
  
  // Patterns to identify constants files
  constantsFilePatterns: [
    '**/*.constants.{ts,tsx,js,jsx}',
    '**/*.const.{ts,tsx,js,jsx}',
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
`;
