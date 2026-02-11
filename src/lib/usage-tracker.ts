import path from "node:path";
import { type Project, SyntaxKind } from "ts-morph";
import type { UsageReference } from "../types";
import { minimatch } from "minimatch";

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
 * Track where a specific component or utility is imported and used throughout the codebase.
 * Scans all source files to find imports of the symbol and returns references to actual
 * usages (excluding the import statement itself and barrel files).
 *
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
  const usages: UsageReference[] = [];
  const sourceFiles = project.getSourceFiles();

  const usagePromises = sourceFiles.map(async (sourceFile) => {
    const currentFilePath = sourceFile.getFilePath();

    if (currentFilePath === exportFilePath) {
      return [];
    }

    // We don't want to track usages in barrel files (e.g., index.ts) to avoid noise, so skip those
    if (isBarrelFile(currentFilePath, barrelPatterns)) {
      return [];
    }

    const fileUsages: UsageReference[] = [];
    const imports = sourceFile.getImportDeclarations();

    for (const importDecl of imports) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      const resolvedPath = resolveImportPath(currentFilePath, moduleSpecifier, project);

      if (resolvedPath === exportFilePath) {
        const namedImports = importDecl.getNamedImports();
        const defaultImport = importDecl.getDefaultImport();

        const importsSymbol =
          namedImports.some((ni) => ni.getName() === symbolName) ||
          (defaultImport && defaultImport.getText() === symbolName);

        if (importsSymbol) {
          const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);

          for (const identifier of identifiers) {
            if (identifier.getText() === symbolName) {
              if (identifier.getFirstAncestorByKind(SyntaxKind.ImportDeclaration)) {
                continue;
              }

              fileUsages.push({
                filePath: path.relative(process.cwd(), currentFilePath).replace(/\\/g, "/"),
                line: identifier.getStartLineNumber(),
              });
            }
          }
        }
      }
    }

    return fileUsages;
  });

  const results = await Promise.all(usagePromises);

  for (const fileUsages of results) {
    usages.push(...fileUsages);
  }

  const uniqueUsages = Array.from(
    new Map(usages.map((u) => [`${u.filePath}:${u.line}`, u])).values(),
  );

  return uniqueUsages.sort((a, b) => {
    const pathCompare = a.filePath.localeCompare(b.filePath);
    return pathCompare !== 0 ? pathCompare : a.line - b.line;
  });
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
    const indexExtensions = ["/index.ts", "/index.tsx", "/index.js", "/index.jsx"];
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
 * Efficiently track usages for multiple symbols in parallel. This is much faster
 * than calling trackUsages sequentially for each symbol when processing many components.
 *
 * @param project - The ts-morph Project instance containing all source files
 * @param symbols - Array of objects containing symbol name and file path pairs
 * @param barrelPatterns - Array of glob patterns for barrel files to exclude
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
): Promise<Map<string, UsageReference[]>> {
  const results = new Map<string, UsageReference[]>();

  // Process all symbols in parallel
  const trackingPromises = symbols.map(async ({ name, filePath }) => {
    const usages = await trackUsages(project, name, filePath, barrelPatterns);
    return { key: `${filePath}:${name}`, usages };
  });

  const allResults = await Promise.all(trackingPromises);

  for (const { key, usages } of allResults) {
    results.set(key, usages);
  }

  return results;
}
