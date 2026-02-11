import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  CATALOG_CONFIG_SCHEMA,
  CONFIG_FILE_EXTENSIONS,
  CONFIG_FILE_NAME,
  DEFAULT_CONFIG,
  PACKAGE_NAME,
} from "./constants";
import type { CatalogConfig } from "./types";

/**
 * Load and validate the catalog configuration file. Automatically detects project type
 * (TypeScript/JavaScript) and searches for the appropriate config file format.
 * Merges user configuration with defaults and validates against schema.
 * If no config file is found, returns default configuration.
 *
 * @param configPath - Optional explicit path to config file. If not provided, searches current directory
 * @returns The validated and merged configuration object (or defaults if no config file found)
 * @throws {Error} If config file is invalid or fails validation
 *
 * @example
 * ```typescript
 * // Load config from default location (catalog.config.mts or catalog.config.mjs)
 * const config = await loadConfig();
 * console.log(config.include); // ["src/**\/*.{ts,tsx}"]
 *
 * // Load config from specific path
 * const config = await loadConfig("./custom-config/catalog.config.mts");
 *
 * // Config is merged with defaults
 * const config = await loadConfig();
 * console.log(config.llmOptimized.enabled); // true (from DEFAULT_CONFIG)
 * ```
 */
export async function loadConfig(configPath?: string): Promise<CatalogConfig> {
  let configFile = configPath;

  const cwd = process.cwd();
  const tsConfigPath = findTsConfig(cwd);
  const isTypeScript = !!tsConfigPath;
  // Use .mts for TypeScript projects, .mjs for JavaScript projects
  const extension = isTypeScript
    ? CONFIG_FILE_EXTENSIONS.typescriptModule
    : CONFIG_FILE_EXTENSIONS.javascriptModule;

  if (!configFile) {
    const candidate = path.join(cwd, `${CONFIG_FILE_NAME}${extension}`);

    configFile = candidate; // Use as default even if doesn't exist (error will be thrown below)
    if (fs.existsSync(candidate)) {
      configFile = candidate;
    }
  }

  if (!fs.existsSync(configFile)) {
    console.log(
      `No config found, using defaults. Run '${PACKAGE_NAME} init' to customize.\n`,
    );
    return { ...DEFAULT_CONFIG };
  }

  try {
    const configModule = await import(configFile);
    const userConfig = configModule.default || configModule;
    const validationResult = CATALOG_CONFIG_SCHEMA.safeParse(userConfig);

    if (!validationResult.success) {
      const flattenedErrors = z.flattenError(validationResult.error);
      throw new Error(
        `Invalid configuration:\n${Object.values(flattenedErrors.fieldErrors)
          .map((errs) => errs.join(", "))
          .join("\n")}`,
      );
    }

    const config: CatalogConfig = {
      ...DEFAULT_CONFIG,
      ...userConfig,
    };

    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Search upward from a starting directory to find the nearest tsconfig.json file.
 * Traverses parent directories until finding the file or reaching the filesystem root.
 *
 * @param startDir - The directory to start searching from (defaults to process.cwd())
 * @returns The absolute path to tsconfig.json if found, undefined otherwise
 *
 * @example
 * ```typescript
 * // Find tsconfig.json starting from current directory
 * const tsConfigPath = findTsConfig();
 * if (tsConfigPath) {
 *   console.log(`Found TypeScript config at: ${tsConfigPath}`);
 * }
 *
 * // Find tsconfig.json starting from specific directory
 * const tsConfigPath = findTsConfig("/path/to/project/src/components");
 * // Searches: /path/to/project/src/components/tsconfig.json
 * //           /path/to/project/src/tsconfig.json
 * //           /path/to/project/tsconfig.json
 * //           etc.
 * ```
 */
export function findTsConfig(
  startDir: string = process.cwd(),
): string | undefined {
  let currentDir = startDir;

  while (currentDir !== path.parse(currentDir).root) {
    const tsConfigPath = path.join(currentDir, "tsconfig.json");
    if (fs.existsSync(tsConfigPath)) {
      return tsConfigPath;
    }
    currentDir = path.dirname(currentDir);
  }

  return undefined;
}
