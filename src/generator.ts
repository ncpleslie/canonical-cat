import path from "node:path";
import { glob } from "glob";
import {
  type ArrowFunction,
  type FunctionDeclaration,
  Node,
  Project,
  type VariableDeclaration,
} from "ts-morph";
import { CatalogWriter } from "./lib/generators";
import {
  hashComponentImplementation,
  hashComponentInterface,
  loadCache,
  needsRegeneration,
  saveCache,
  updateCache,
} from "./lib/hasher";
import { batchTrackUsages } from "./lib/usage-tracker";
import type {
  CatalogConfig,
  ComponentMetadata,
  PropDefinition,
  UsageReference,
} from "./types";

/**
 * Main catalog generator that orchestrates the entire documentation generation process.
 * Scans source files, extracts component metadata, tracks usages, and generates
 * multiple output formats (Markdown, LLM-optimized text, JSON).
 *
 * @example
 * ```typescript
 * const config = loadConfig();
 * const tsConfigPath = findTsConfig();
 * const generator = new CatalogGenerator(config, tsConfigPath);
 * ```
 */
export class CatalogGenerator {
  private config: CatalogConfig;
  private project: Project;
  private writer: CatalogWriter;

  /**
   * Create a new CatalogGenerator instance.
   *
   * @param config - The validated catalog configuration object
   * @param tsConfigPath - Optional path to tsconfig.json for TypeScript project settings
   *
   * @example
   * ```typescript
   * const config = loadConfig();
   * const tsConfigPath = findTsConfig();
   * const generator = new CatalogGenerator(config, tsConfigPath);
   *
   * // Generate the catalog
   * await generator.generate();
   * ```
   */
  constructor(config: CatalogConfig, tsConfigPath?: string) {
    this.config = config;

    this.project = new Project({
      tsConfigFilePath: tsConfigPath,
      skipAddingFilesFromTsConfig: true,
    });

    this.writer = new CatalogWriter(
      config.outputPath || process.cwd(),
      config.output,
    );
  }

  /**
   * Generate the component catalog by scanning source files, extracting metadata,
   * tracking usages, and writing output files. Uses caching to skip unchanged components
   * for better performance on subsequent runs.
   *
   * @param force - If true, regenerate all components ignoring the cache (default: false)
   *
   * @example
   * ```typescript
   * const generator = new CatalogGenerator(config, tsConfigPath);
   *
   * // Generate catalog, using cache for unchanged components
   * await generator.generate();
   *
   * // Force regeneration of all components
   * await generator.generate(true);
   * ```
   */
  async generate(force: boolean = false): Promise<void> {
    console.log("🔍 Scanning codebase...");

    const files = await this.findSourceFiles();
    console.log(`Found ${files.length} files to analyze`);

    this.project.addSourceFilesAtPaths(files);

    console.log("Extracting components and utilities...");
    const components = await this.extractComponents();
    console.log(`Found ${components.length} exportable items`);

    const cache = loadCache(this.config.cacheDir);

    const componentsToProcess = force
      ? components
      : components.filter((c) => {
          const key = `${c.filePath}:${c.name}`;
          return needsRegeneration(
            key,
            c.implementationHash,
            c.interfaceHash,
            cache,
            this.config.similarityThreshold,
          );
        });

    console.log(
      `${componentsToProcess.length} of ${components.length} items need cache updates`,
    );

    // Creates a Set of keys for components that need cache updates
    const keysToUpdate = new Set(
      componentsToProcess.map((c) => `${c.filePath}:${c.name}`),
    );

    console.log("Tracking usages across codebase...");
    const usageMap = await this.trackUsages(components);

    console.log("Looking for Storybook stories...");
    const storiesMap = await this.findStories(components);

    for (const component of components) {
      const absolutePath = path.resolve(process.cwd(), component.filePath);
      const key = `${absolutePath}:${component.name}`;
      component.usedIn = usageMap.get(key) || [];
      component.stories = storiesMap.get(component.name) || [];
    }

    console.log("Generating catalog files...");
    this.writer.initialize();

    for (const component of components) {
      this.writer.addComponent(component);

      // Only update cache for components that changed
      const key = `${component.filePath}:${component.name}`;
      if (keysToUpdate.has(key)) {
        updateCache(
          cache,
          key,
          component.implementationHash,
          component.interfaceHash,
        );
      }
    }

    this.writer.finalize();
    saveCache(cache, this.config.cacheDir);

    console.log("✅ Catalog generated successfully!");

    const outputConfig = this.config.output;
    const getFilename = (
      value: boolean | { enabled: boolean; filename?: string } | undefined,
      defaultFilename: string,
    ): string | null => {
      if (value === undefined || value === true) return defaultFilename;
      if (value === false) return null;
      return value.enabled ? value.filename || defaultFilename : null;
    };

    const markdownFile = getFilename(outputConfig?.markdown, "CATALOG.md");
    const llmTxtFile = getFilename(outputConfig?.llmTxt, "llm.txt");
    const jsonFile = getFilename(outputConfig?.json, "catalog.json");

    if (markdownFile) console.log(`   - ${markdownFile}`);
    if (llmTxtFile) console.log(`   - ${llmTxtFile}`);
    if (jsonFile) console.log(`   - ${jsonFile}`);
  }

  /**
   * Find all source files that match the include patterns from the configuration,
   * while respecting the exclude patterns. Returns absolute file paths.
   *
   * @returns Promise resolving to an array of absolute file paths
   */
  private async findSourceFiles(): Promise<string[]> {
    const files: string[] = [];

    for (const pattern of this.config.include) {
      const matches = await glob(pattern, {
        ignore: this.config.exclude,
        absolute: true,
        cwd: process.cwd(),
      });
      files.push(...matches);
    }

    return [...new Set(files)];
  }

  /**
   * Extract component metadata from all source files in the project.
   * Processes files in parallel for efficiency and collects all exported
   * components, hooks, utilities, types, and classes.
   *
   * @returns Promise resolving to an array of ComponentMetadata objects
   */
  private async extractComponents(): Promise<ComponentMetadata[]> {
    const components: ComponentMetadata[] = [];
    const sourceFiles = this.project.getSourceFiles();

    const extractPromises = sourceFiles.map(async (sourceFile) => {
      const absolutePath = sourceFile.getFilePath();
      const filePath = path
        .relative(process.cwd(), absolutePath)
        .replace(/\\/g, "/");
      const fileComponents: ComponentMetadata[] = [];

      const exports = sourceFile.getExportedDeclarations();

      for (const [name, declarations] of exports) {
        for (const declaration of declarations) {
          const component = this.extractComponentMetadata(
            name,
            declaration,
            filePath,
          );
          if (component) {
            fileComponents.push(component);
          }
        }
      }

      return fileComponents;
    });

    const results = await Promise.all(extractPromises);

    for (const fileComponents of results) {
      components.push(...fileComponents);
    }

    return components;
  }

  /**
   * Extract complete metadata from a single exported declaration.
   * Determines the item type (component, hook, utility, class, type) and extracts
   * signature, props, JSDoc comments, and generates hashes for change detection.
   *
   * @param name - The exported name of the declaration
   * @param declaration - The ts-morph AST node representing the declaration
   * @param filePath - The relative file path where the declaration is located
   * @returns ComponentMetadata object or null if the declaration type is unsupported
   */
  private extractComponentMetadata(
    name: string,
    declaration: Node,
    filePath: string,
  ): ComponentMetadata | null {
    let type: ComponentMetadata["type"] = "utility";
    let signature = "";
    let props: PropDefinition[] = [];
    let jsDoc = "";

    if (
      Node.isFunctionDeclaration(declaration) ||
      Node.isArrowFunction(declaration)
    ) {
      const func = declaration as FunctionDeclaration | ArrowFunction;
      signature = this.extractSignature(func);

      if (this.isReactComponent(func)) {
        type = "component";
        props = this.extractProps(func);
      } else if (name.startsWith("use")) {
        type = "hook";
      }

      jsDoc = this.extractJSDoc(func);
    } else if (Node.isVariableDeclaration(declaration)) {
      const varDecl = declaration as VariableDeclaration;
      const init = varDecl.getInitializer();

      if (
        init &&
        (Node.isArrowFunction(init) || Node.isFunctionExpression(init))
      ) {
        signature = this.extractSignature(init, name);

        if (this.isReactComponent(init)) {
          type = "component";
          props = this.extractProps(init);
        } else if (name.startsWith("use")) {
          type = "hook";
        }

        jsDoc = this.extractJSDoc(varDecl);
      }
    } else if (Node.isClassDeclaration(declaration)) {
      type = "class";
      signature = `class ${name}`;
      jsDoc = this.extractJSDoc(declaration);
    } else if (
      Node.isInterfaceDeclaration(declaration) ||
      Node.isTypeAliasDeclaration(declaration)
    ) {
      type = "type";
      signature = declaration.getText().split("\n")[0];
      jsDoc = this.extractJSDoc(declaration);
    } else {
      return null; // Skip unsupported types
    }

    const implHash = hashComponentImplementation(declaration);
    const propsNode = props.length > 0 ? declaration : undefined;
    const interfaceHash = hashComponentInterface(propsNode, signature);

    return {
      name,
      type,
      filePath,
      exportType: "named",
      signature,
      props,
      jsDoc,
      implementationHash: implHash,
      interfaceHash: interfaceHash,
      usedIn: [],
      stories: [],
    };
  }

  /**
   * Extract a clean, readable function signature from an AST node.
   * Handles function declarations, arrow functions, and function expressions.
   *
   * @param node - The ts-morph AST node representing the function
   * @param name - Optional name to use for anonymous functions
   * @returns A formatted string representation of the function signature
   */
  private extractSignature(node: Node, name?: string): string {
    if (Node.isFunctionDeclaration(node)) {
      const func = node as FunctionDeclaration;
      const params = func
        .getParameters()
        .map((p) => p.getText())
        .join(", ");
      const returnType = func.getReturnTypeNode()?.getText() || "";
      const funcName = func.getName() || name || "";
      return returnType
        ? `function ${funcName}(${params}): ${returnType}`
        : `function ${funcName}(${params})`;
    } else if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) {
      const params = node
        .getParameters()
        .map((p) => p.getText())
        .join(", ");
      const returnType = node.getReturnTypeNode()?.getText() || "";
      if (name) {
        return returnType
          ? `${name} = (${params}): ${returnType} => ...`
          : `${name} = (${params}) => ...`;
      }
      return returnType
        ? `(${params}): ${returnType} => ...`
        : `(${params}) => ...`;
    }
    return node.getText().split("{")[0].trim();
  }

  /**
   * Determine if a function node represents a React component by checking for JSX return statements.
   * Looks for patterns like `return <Component`, `return <div`, or React.createElement calls.
   *
   * @param node - The ts-morph AST node to check
   * @returns true if the function returns JSX (is a React component), false otherwise
   */
  private isReactComponent(node: Node): boolean {
    const text = node.getText();
    // Check for JSX syntax patterns - must return JSX elements, not just any function
    // Look for return statements that directly return JSX (starts with <Tag)
    const hasJSXReturn =
      /return\s+<[A-Z]/.test(text) || // return <Component
      /return\s+<[a-z]+/.test(text) || // return <div, <button, etc
      /return\s*\(\s*<[A-Z]/.test(text) || // return (<Component
      /return\s*\(\s*<[a-z]+/.test(text) || // return (<div
      text.includes("React.createElement");

    // Exclude if it only returns functions (arrow functions)
    if (hasJSXReturn) {
      // Make sure it's not just returning a function that happens to have < in it
      // Check if the first < after return is actually a JSX tag
      const returnMatch = text.match(/return\s*\(?\s*<([A-Za-z])/);
      if (returnMatch) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract prop definitions from a React component's first parameter.
   * Parses inline prop type literals to extract prop names, types, and whether they're required.
   *
   * @param node - The function AST node representing the React component
   * @returns Array of PropDefinition objects describing each prop
   */
  private extractProps(node: Node): PropDefinition[] {
    const props: PropDefinition[] = [];

    // Try to find props parameter
    if (
      Node.isFunctionDeclaration(node) ||
      Node.isArrowFunction(node) ||
      Node.isFunctionExpression(node)
    ) {
      const params = node.getParameters();
      if (params.length > 0) {
        const propsParam = params[0];
        const typeNode = propsParam.getTypeNode();

        if (typeNode && Node.isTypeLiteral(typeNode)) {
          const members = typeNode.getMembers();
          for (const member of members) {
            if (Node.isPropertySignature(member)) {
              props.push({
                name: member.getName(),
                type: member.getTypeNode()?.getText() || "any",
                required: !member.hasQuestionToken(),
                description: this.extractJSDoc(member),
              });
            }
          }
        }
      }
    }

    return props;
  }

  /**
   * Extract JSDoc comment description from a node.
   * Handles various node types including functions, variables, classes, and interfaces.
   * For variable declarations, also checks the parent variable statement.
   *
   * @param node - The ts-morph AST node to extract JSDoc from
   * @returns The JSDoc description string, or empty string if no JSDoc found
   */
  private extractJSDoc(node: Node): string {
    // Only certain node types have JSDoc
    if (Node.isJSDocable(node)) {
      const jsDocs = node.getJsDocs();
      if (jsDocs.length > 0) {
        return jsDocs[0].getDescription().trim();
      }
    }

    // For variable declarations, check the parent statement
    if (Node.isVariableDeclaration(node)) {
      const statement = node.getVariableStatement();
      if (statement && Node.isJSDocable(statement)) {
        const jsDocs = statement.getJsDocs();
        if (jsDocs.length > 0) {
          return jsDocs[0].getDescription().trim();
        }
      }
    }

    return "";
  }

  /**
   * Track where all components and utilities are used across the entire codebase.
   * Converts relative file paths to absolute paths and delegates to batchTrackUsages
   * for efficient parallel processing.
   *
   * @param components - Array of ComponentMetadata objects to track usages for
   * @returns Promise resolving to a Map of "absolutePath:name" keys to usage reference arrays
   */
  private async trackUsages(
    components: ComponentMetadata[],
  ): Promise<Map<string, UsageReference[]>> {
    // Convert relative paths back to absolute for usage tracking
    const symbols = components.map((c) => ({
      name: c.name,
      filePath: path.resolve(process.cwd(), c.filePath),
    }));
    const usageMap = await batchTrackUsages(
      this.project,
      symbols,
      this.config.barrelFilePatterns,
    );

    return usageMap;
  }

  /**
   * Find and associate Storybook story files with components.
   * Searches for story files matching configured patterns and links them to components
   * based on filename matching (e.g., Button.stories.tsx matches Button component).
   *
   * @param components - Array of ComponentMetadata objects to find stories for
   * @returns Promise resolving to a Map of component names to their associated story files
   */
  private async findStories(
    components: ComponentMetadata[],
  ): Promise<Map<string, Array<{ name: string; filePath: string }>>> {
    const storyFiles: string[] = [];

    for (const pattern of this.config.storyFilePatterns) {
      const matches = await glob(pattern, {
        ignore: this.config.exclude,
        absolute: true,
        cwd: process.cwd(),
      });
      storyFiles.push(...matches);
    }

    const uniqueStoryFiles = [...new Set(storyFiles)];

    const storiesMap = new Map<
      string,
      Array<{ name: string; filePath: string }>
    >();

    if (uniqueStoryFiles.length === 0) return storiesMap;

    // Simple story detection (could be enhanced)
    for (const component of components) {
      const componentFileName = path.basename(
        component.filePath,
        path.extname(component.filePath),
      );
      const stories: Array<{ name: string; filePath: string }> = [];

      for (const storyFile of uniqueStoryFiles) {
        if (storyFile.includes(componentFileName)) {
          // Convert to relative path from project root
          const relativeStoryPath = path
            .relative(process.cwd(), storyFile)
            .replace(/\\/g, "/");
          stories.push({
            name: path.basename(storyFile),
            filePath: relativeStoryPath,
          });
        }
      }

      if (stories.length > 0) {
        storiesMap.set(component.name, stories);
      }
    }

    return storiesMap;
  }
}
