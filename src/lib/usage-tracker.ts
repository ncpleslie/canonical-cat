import path from "node:path";
import { minimatch } from "minimatch";
import { type Project, SyntaxKind } from "ts-morph";
import type { UsageReference } from "../types";

/**
 * Check if a file is a barrel file (e.g., index.ts, index.js) that re-exports
 * other modules. Barrel files are typically excluded from usage tracking to avoid
 * noise in the usage reports.
 *
 * @param filePath - The file path to check
 * @param barrelPatterns - Array of glob patterns that identify barrel files
 * @returns true if the file matches any barrel pattern, false otherwise
 *
 * @example
 * ```typescript
 * const barrelPatterns = ["**\/index.ts", "**\/index.tsx"];
 *
 * isBarrelFile("src/components/index.ts", barrelPatterns);
 * // Returns: true
 *
 * isBarrelFile("src/components/Button.tsx", barrelPatterns);
 * // Returns: false
 * ```
 */
function isBarrelFile(filePath: string, barrelPatterns: string[]): boolean {
  return barrelPatterns.some((pattern) => minimatch(filePath, pattern));
}

/**
 * Resolve a module specifier (import path) to an absolute file path.
 * Handles relative imports and tries multiple file extensions and index files.
 * Module/absolute imports (requiring tsconfig path mapping) are not yet supported.
 *
 * @param currentFilePath - Absolute path of the file containing the import
 * @param moduleSpecifier - The import path string (e.g., "./Button", "../hooks/useToggle")
 * @param project - The ts-morph Project instance
 * @returns The resolved absolute file path, or null if resolution fails
 */
function resolveImportPath(
  currentFilePath: string,
  moduleSpecifier: string,
  project: Project,
): string | null {
  // Handle relative imports
  if (moduleSpecifier.startsWith(".")) {
    const currentDir = path.dirname(currentFilePath);
    const resolvedPath = path.resolve(currentDir, moduleSpecifier);

    // Try different extensions
    const extensions = [".ts", ".tsx", ".js", ".jsx", ""];
    for (const ext of extensions) {
      const tryPath = resolvedPath + ext;
      if (project.getSourceFile(tryPath)) {
        return tryPath;
      }
    }

    // Try index files
    const indexExtensions = [
      "/index.ts",
      "/index.tsx",
      "/index.js",
      "/index.jsx",
    ];
    for (const indexExt of indexExtensions) {
      const tryPath = resolvedPath + indexExt;
      if (project.getSourceFile(tryPath)) {
        return tryPath;
      }
    }
  }

  // Handle absolute/module imports (would need tsconfig path mapping)
  // For now, skip these
  return null;
}

/**
 * Interface representing a mapping of imported symbols to their usage locations.
 * Keys are in the format "absoluteFilePath:symbolName"
 * Values are arrays of UsageReference objects
 */
interface ImportIndex {
  [key: string]: UsageReference[];
}

/**
 * Build a reverse index of all imports and their usages across the entire codebase.
 * This is much more efficient than scanning files repeatedly for each symbol.
 *
 * Scans all files ONCE, building a map of: { "filePath:symbolName" -> [usage locations] }
 *
 * @param project - The ts-morph Project instance containing all source files
 * @param barrelPatterns - Array of glob patterns for barrel files to exclude
 * @param progressCallback - Optional callback to report progress (current file count)
 * @returns An ImportIndex mapping symbol keys to their usage locations
 */
function buildImportIndex(
  project: Project,
  barrelPatterns: string[],
  progressCallback?: (current: number) => void,
): ImportIndex {
  const index: ImportIndex = {};
  const sourceFiles = project.getSourceFiles();
  let processedCount = 0;

  for (const sourceFile of sourceFiles) {
    const currentFilePath = sourceFile.getFilePath();

    // Skip barrel files
    if (isBarrelFile(currentFilePath, barrelPatterns)) {
      processedCount++;
      if (progressCallback) progressCallback(processedCount);
      continue;
    }

    const imports = sourceFile.getImportDeclarations();

    for (const importDecl of imports) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      const resolvedPath = resolveImportPath(
        currentFilePath,
        moduleSpecifier,
        project,
      );

      if (!resolvedPath) continue;

      // Get all imported symbols from this import
      const namedImports = importDecl.getNamedImports();
      const defaultImport = importDecl.getDefaultImport();

      const importedSymbols: string[] = [];

      if (defaultImport) {
        importedSymbols.push(defaultImport.getText());
      }

      for (const namedImport of namedImports) {
        importedSymbols.push(namedImport.getName());
      }

      // Find all usages of these symbols in the current file
      const identifiers = sourceFile.getDescendantsOfKind(
        SyntaxKind.Identifier,
      );

      for (const symbolName of importedSymbols) {
        const key = `${resolvedPath}:${symbolName}`;

        if (!index[key]) {
          index[key] = [];
        }

        // Find all usages of this symbol (excluding the import statement itself)
        for (const identifier of identifiers) {
          if (identifier.getText() === symbolName) {
            // Skip if this identifier is part of the import declaration
            if (
              identifier.getFirstAncestorByKind(SyntaxKind.ImportDeclaration)
            ) {
              continue;
            }

            index[key].push({
              filePath: path
                .relative(process.cwd(), currentFilePath)
                .replace(/\\/g, "/"),
              line: identifier.getStartLineNumber(),
            });
          }
        }
      }
    }

    processedCount++;
    if (progressCallback) progressCallback(processedCount);
  }

  // Deduplicate and sort usages for each symbol
  for (const key in index) {
    const usages = index[key];
    const uniqueUsages = Array.from(
      new Map(usages.map((u) => [`${u.filePath}:${u.line}`, u])).values(),
    );
    index[key] = uniqueUsages.sort((a, b) => {
      const pathCompare = a.filePath.localeCompare(b.filePath);
      return pathCompare !== 0 ? pathCompare : a.line - b.line;
    });
  }

  return index;
}

/**
 * Track where a specific component or utility is imported and used throughout the codebase.
 * Uses a pre-built import index for O(1) lookup instead of scanning all files.
 *
 * @param symbolName - The name of the symbol to track (e.g., "Button", "useCounter")
 * @param exportFilePath - Absolute path to the file where the symbol is defined
 * @param importIndex - Pre-built index of all imports in the codebase
 * @returns Array of UsageReference objects with file paths and line numbers
 *
 * @example
 * ```typescript
 * const index = buildImportIndex(project, ["**\/index.ts"]);
 *
 * // Track Button component usage
 * const usages = trackUsagesFromIndex(
 *   "Button",
 *   "/path/to/src/components/Button.tsx",
 *   index
 * );
 *
 * // Returns:
 * // [
 * //   { filePath: "src/pages/Home.tsx", line: 15 },
 * //   { filePath: "src/pages/About.tsx", line: 22 }
 * // ]
 * ```
 */
function trackUsagesFromIndex(
  symbolName: string,
  exportFilePath: string,
  importIndex: ImportIndex,
): UsageReference[] {
  const key = `${exportFilePath}:${symbolName}`;
  return importIndex[key] || [];
}

/**
 * Efficiently track usages for multiple symbols using a reverse index approach.
 * This builds the import index ONCE, then queries it for each symbol - much faster
 * than the old approach of scanning all files for each symbol.
 *
 * Complexity: O(M + N) where M = total files, N = number of symbols
 * Old approach was: O(N × M) - scanning all files for each symbol
 *
 * For 5000 files and 100 components:
 * - Old: 500,000 file iterations
 * - New: 5,100 operations
 *
 * @param project - The ts-morph Project instance containing all source files
 * @param symbols - Array of objects containing symbol name and file path pairs
 * @param barrelPatterns - Array of glob patterns for barrel files to exclude
 * @param progressCallback - Optional callback to report progress during index building
 * @returns Promise resolving to a Map where keys are "filePath:symbolName" and values are usage arrays
 *
 * @example
 * ```typescript
 * const project = new Project({ tsConfigFilePath: "tsconfig.json" });
 * const symbols = [
 *   { name: "Button", filePath: "/path/to/Button.tsx" },
 *   { name: "Card", filePath: "/path/to/Card.tsx" },
 *   { name: "useCounter", filePath: "/path/to/useCounter.ts" }
 * ];
 * const barrelPatterns = ["**\/index.ts"];
 *
 * const usagesMap = await batchTrackUsages(project, symbols, barrelPatterns);
 *
 * // Access usages for specific symbol
 * const buttonUsages = usagesMap.get("/path/to/Button.tsx:Button");
 * // Returns: [{ filePath: "src/App.tsx", line: 10 }, ...]
 * ```
 */
export async function batchTrackUsages(
  project: Project,
  symbols: Array<{ name: string; filePath: string }>,
  barrelPatterns: string[],
  progressCallback?: (current: number) => void,
): Promise<Map<string, UsageReference[]>> {
  const results = new Map<string, UsageReference[]>();

  // Build the import index once - this scans all files but only once
  const importIndex = buildImportIndex(
    project,
    barrelPatterns,
    progressCallback,
  );

  // Now query the index for each symbol - this is very fast (O(1) per symbol)
  for (const { name, filePath } of symbols) {
    const key = `${filePath}:${name}`;
    const usages = trackUsagesFromIndex(name, filePath, importIndex);
    results.set(key, usages);
  }

  return results;
}

/**
 * Track where a specific component or utility is imported and used throughout the codebase.
 * This is a convenience wrapper around the batch tracking function for single symbol lookups.
 *
 * @deprecated For tracking multiple symbols, use batchTrackUsages for better performance
 * @param project - The ts-morph Project instance containing all source files
 * @param symbolName - The name of the symbol to track (e.g., "Button", "useCounter")
 * @param exportFilePath - Absolute path to the file where the symbol is defined
 * @param barrelPatterns - Array of glob patterns for barrel files to exclude
 * @returns Promise resolving to an array of UsageReference objects with file paths and line numbers
 *
 * @example
 * ```typescript
 * const project = new Project({ tsConfigFilePath: "tsconfig.json" });
 * const barrelPatterns = ["**\/index.ts"];
 *
 * // Track Button component usage
 * const usages = await trackUsages(
 *   project,
 *   "Button",
 *   "/path/to/src/components/Button.tsx",
 *   barrelPatterns
 * );
 *
 * // Returns:
 * // [
 * //   { filePath: "src/pages/Home.tsx", line: 15 },
 * //   { filePath: "src/pages/About.tsx", line: 22 }
 * // ]
 * ```
 */
export async function trackUsages(
  project: Project,
  symbolName: string,
  exportFilePath: string,
  barrelPatterns: string[],
): Promise<UsageReference[]> {
  // Use the batch function for a single symbol
  const usageMap = await batchTrackUsages(
    project,
    [{ name: symbolName, filePath: exportFilePath }],
    barrelPatterns,
  );

  const key = `${exportFilePath}:${symbolName}`;
  return usageMap.get(key) || [];
}
