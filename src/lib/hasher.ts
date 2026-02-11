import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { distance } from "fastest-levenshtein";
import { type Node, SyntaxKind } from "ts-morph";
import { PACKAGE_ROOT } from "../constants";
import type { CatalogCache } from "../types";

const CACHE_FILE = ".catalog-cache.json";
const CACHE_VERSION = "1.0.0";

/**
 * Normalize an AST node by stripping whitespace, comments, and non-meaningful tokens
 * to create a consistent representation for hashing. This ensures that formatting changes
 * don't trigger false positives in change detection.
 *
 * @param node - The ts-morph AST node to normalize
 * @returns A normalized string representation of the AST with tokens joined by pipes
 *
 * @example
 * ```typescript
 * const sourceFile = project.getSourceFile("component.tsx");
 * const functionNode = sourceFile.getFunctions()[0];
 * const normalized = normalizeASTForHashing(functionNode);
 * // Returns: "function|Button|props|ButtonProps|return|button|..."
 * ```
 */
function normalizeASTForHashing(node: Node): string {
  const normalized: string[] = [];

  node.forEachDescendant((descendant) => {
    // Skip comments and whitespace
    if (
      descendant.getKind() === SyntaxKind.SingleLineCommentTrivia ||
      descendant.getKind() === SyntaxKind.MultiLineCommentTrivia ||
      descendant.getKind() === SyntaxKind.JSDocComment
    ) {
      return;
    }

    // Include meaningful tokens
    const text = descendant.getText().trim();
    if (text) {
      normalized.push(text);
    }
  });

  return normalized.join("|");
}

/**
 * Generate a SHA256 hash of a component's implementation details (function body, logic).
 * This hash changes when the component's internal logic changes, but not when only
 * the interface (props, types) changes.
 *
 * @param componentNode - The ts-morph AST node representing the component
 * @returns A SHA256 hash string (64 hexadecimal characters)
 *
 * @example
 * ```typescript
 * const component = sourceFile.getFunction("Button");
 * const hash = hashComponentImplementation(component);
 * // Returns: "a3f5b8c..."
 *
 * // Hash remains same after formatting changes
 * // but changes when logic is modified
 * ```
 */
export function hashComponentImplementation(componentNode: Node): string {
  const normalized = normalizeASTForHashing(componentNode);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Generate a SHA256 hash of a component's public interface (props, types, signature).
 * This hash changes when the component's API changes, allowing detection of breaking changes
 * that affect consumers of the component.
 *
 * @param propsNode - Optional ts-morph AST node representing the component's props interface
 * @param signatureText - The function signature as a string
 * @returns A SHA256 hash string (64 hexadecimal characters)
 *
 * @example
 * ```typescript
 * const component = sourceFile.getFunction("Button");
 * const propsInterface = sourceFile.getInterface("ButtonProps");
 * const signature = "(props: ButtonProps) => JSX.Element";
 * const hash = hashComponentInterface(propsInterface, signature);
 * // Returns: "b2e7c9d..."
 *
 * // Hash changes when props are added/removed/modified
 * ```
 */
export function hashComponentInterface(
  propsNode: Node | undefined,
  signatureText: string,
): string {
  let content = signatureText;

  if (propsNode) {
    content += normalizeASTForHashing(propsNode);
  }

  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Calculate the similarity between two hash strings. For cryptographic hashes,
 * this is binary: either identical (1.0) or completely different (0.0).
 *
 * @param hash1 - First hash string to compare
 * @param hash2 - Second hash string to compare
 * @returns 1.0 if hashes are identical, 0.0 otherwise
 *
 * @example
 * ```typescript
 * const oldHash = "a3f5b8c1d2e...";
 * const newHash = "a3f5b8c1d2e...";
 * const similarity = calculateSimilarity(oldHash, newHash);
 * // Returns: 1.0 (identical)
 *
 * const differentHash = "b4g6c9d2e3f...";
 * const similarity2 = calculateSimilarity(oldHash, differentHash);
 * // Returns: 0.0 (different)
 * ```
 */
export function calculateSimilarity(hash1: string, hash2: string): number {
  if (hash1 === hash2) return 1.0;

  // For hashes, we use string comparison as a proxy
  // In practice, hashes are either identical or completely different
  return hash1 === hash2 ? 1.0 : 0.0;
}

/**
 * Calculate the similarity between two source code strings using Levenshtein distance.
 * Returns a value between 0 (completely different) and 1 (identical), allowing for
 * fine-grained similarity detection beyond binary hash comparison.
 *
 * @param code1 - First source code string to compare
 * @param code2 - Second source code string to compare
 * @returns A value between 0.0 and 1.0 representing similarity percentage
 *
 * @example
 * ```typescript
 * const original = "function hello() { return 'world'; }";
 * const modified = "function hello() { return 'World'; }";
 * const similarity = calculateCodeSimilarity(original, modified);
 * // Returns: ~0.97 (very similar, only case difference)
 *
 * const veryDifferent = "const x = 123;";
 * const similarity2 = calculateCodeSimilarity(original, veryDifferent);
 * // Returns: ~0.2 (quite different)
 * ```
 */
export function calculateCodeSimilarity(code1: string, code2: string): number {
  const maxLength = Math.max(code1.length, code2.length);
  if (maxLength === 0) return 1.0;

  const levenshteinDistance = distance(code1, code2);
  return 1.0 - levenshteinDistance / maxLength;
}

/**
 * Load the catalog cache from disk, or create a new empty cache if none exists.
 * The cache is stored within the package installation directory (node_modules/canonical-cat/)
 * by default, or in a custom directory if specified. Cache in package directory is
 * automatically cleared when the package is reinstalled.
 * Handles cache version migration and gracefully recovers from corrupted cache files.
 *
 * @param cacheDir - Optional custom cache directory path. Defaults to package installation directory
 * @returns The loaded cache object or a new empty cache
 *
 * @example
 * ```typescript
 * // Load cache from package directory (default)
 * const cache = loadCache();
 *
 * // Load cache from custom directory
 * const cache = loadCache('./node_modules/.cache/canonical-cat');
 *
 * // Check if component exists in cache
 * if (cache.components["Button"]) {
 *   console.log("Button is cached");
 * }
 * ```
 */
export function loadCache(cacheDir?: string): CatalogCache {
  const cachePath = path.join(cacheDir || PACKAGE_ROOT, CACHE_FILE);

  if (!fs.existsSync(cachePath)) {
    return {
      version: CACHE_VERSION,
      lastGenerated: new Date().toISOString(),
      components: {},
    };
  }

  try {
    const content = fs.readFileSync(cachePath, "utf-8");
    const cache: CatalogCache = JSON.parse(content);

    // Migrate cache if version mismatch
    if (cache.version !== CACHE_VERSION) {
      console.warn("Cache version mismatch, starting fresh...");
      return {
        version: CACHE_VERSION,
        lastGenerated: new Date().toISOString(),
        components: {},
      };
    }

    return cache;
  } catch (error) {
    console.warn(error, "Failed to load cache, starting fresh...");
    return {
      version: CACHE_VERSION,
      lastGenerated: new Date().toISOString(),
      components: {},
    };
  }
}

/**
 * Save the catalog cache to disk as a JSON file. Updates the lastGenerated timestamp
 * automatically and handles write errors gracefully. The cache is stored within the
 * package installation directory by default or in a custom directory if specified.
 *
 * @param cache - The cache object to save
 * @param cacheDir - Optional custom cache directory path. Defaults to package installation directory
 *
 * @example
 * ```typescript
 * const cache = loadCache();
 *
 * // Update cache with new component data
 * updateCache(cache, "Button", implHash, interfaceHash);
 *
 * // Save updated cache to default location
 * saveCache(cache);
 *
 * // Save to custom directory
 * saveCache(cache, './node_modules/.cache/canonical-cat');
 * ```
 */
export function saveCache(cache: CatalogCache, cacheDir?: string): void {
  const cachePath = path.join(cacheDir || PACKAGE_ROOT, CACHE_FILE);
  cache.lastGenerated = new Date().toISOString();

  try {
    // Ensure cache directory exists
    const dir = path.dirname(cachePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save cache:", error);
  }
}

/**
 * Determine if a component needs to be regenerated by comparing its current hashes
 * with cached values. Uses a similarity threshold to decide if changes are significant
 * enough to warrant regeneration.
 *
 * @param componentKey - Unique identifier for the component (e.g., "src/Button.tsx:Button")
 * @param newImplHash - Current implementation hash of the component
 * @param newInterfaceHash - Current interface hash of the component
 * @param cache - The cache object containing previous hash values
 * @param threshold - Similarity threshold (0.0 to 1.0). Values < 1.0 mean any change triggers regeneration
 * @returns true if component should be regenerated, false if it can use cached version
 *
 * @example
 * ```typescript
 * const cache = loadCache();
 * const component = sourceFile.getFunction("Button");
 * const implHash = hashComponentImplementation(component);
 * const interfaceHash = hashComponentInterface(propsNode, signature);
 *
 * // Check if regeneration needed (threshold 1.0 = only regenerate if changed)
 * if (needsRegeneration("Button", implHash, interfaceHash, cache, 1.0)) {
 *   console.log("Component changed, regenerating documentation...");
 *   // regenerate...
 * } else {
 *   console.log("Using cached version");
 * }
 * ```
 */
export function needsRegeneration(
  componentKey: string,
  newImplHash: string,
  newInterfaceHash: string,
  cache: CatalogCache,
  threshold: number,
): boolean {
  const cached = cache.components[componentKey];

  if (!cached) {
    return true; // New component
  }

  // Calculate similarity for implementation and interface hashes
  const implSimilarity = calculateSimilarity(
    cached.implementationHash,
    newImplHash,
  );
  const interfaceSimilarity = calculateSimilarity(
    cached.interfaceHash,
    newInterfaceHash,
  );

  // Regenerate if either similarity falls below threshold
  // Note: For hashes, similarity is binary (0.0 or 1.0)
  // A threshold < 1.0 means any change triggers regeneration
  return implSimilarity < threshold || interfaceSimilarity < threshold;
}

/**
 * Update the cache with new hash values for a component. Optionally stores
 * AI-generated descriptions and tracks when they were last enhanced.
 *
 * @param cache - The cache object to update
 * @param componentKey - Unique identifier for the component
 * @param implHash - New implementation hash to store
 * @param interfaceHash - New interface hash to store
 * @param description - Optional AI-generated description with 'what' and 'whenToUse' fields
 *
 * @example
 * ```typescript
 * const cache = loadCache();
 *
 * // Update cache with hashes only
 * updateCache(cache, "Button", implHash, interfaceHash);
 *
 * // Update cache with hashes and AI description
 * updateCache(cache, "Button", implHash, interfaceHash, {
 *   what: "A reusable button component with various styles",
 *   whenToUse: "Use when you need a clickable button with consistent styling"
 * });
 *
 * saveCache(cache);
 * ```
 */
export function updateCache(
  cache: CatalogCache,
  componentKey: string,
  implHash: string,
  interfaceHash: string,
  description?: { what: string; whenToUse: string },
): void {
  cache.components[componentKey] = {
    implementationHash: implHash,
    interfaceHash: interfaceHash,
    lastEnhanced: description ? new Date().toISOString() : undefined,
    description,
  };
}
