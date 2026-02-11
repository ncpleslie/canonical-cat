import fs from "node:fs";
import path from "node:path";
import type { ComponentMetadata, ComponentType } from "../types";

export interface CatalogGenerator {
  initialize(): void;
  addComponent(component: ComponentMetadata): void;
  finalize(): void;
}

/**
 * Generator for creating human-readable Markdown catalog files.
 * Organizes components into categories and creates a table of contents.
 *
 * @example
 * ```typescript
 * const generator = new MarkdownGenerator("/output/path", "CATALOG.md");
 * generator.initialize();
 * generator.addComponent(buttonMetadata);
 * generator.addComponent(cardMetadata);
 * generator.finalize(); // Writes CATALOG.md
 * ```
 */
export class MarkdownGenerator implements CatalogGenerator {
  private outputPath: string;
  private content: string[];
  private categories: Map<string, ComponentMetadata[]>;

  /**
   * Create a new MarkdownGenerator instance.
   *
   * @param outputPath - Directory where the markdown file will be written
   * @param filename - Name of the output file (default: "CATALOG.md")
   *
   * @example
   * ```typescript
   * const generator = new MarkdownGenerator("./docs", "API.md");
   * ```
   */
  constructor(outputPath: string, filename: string = "CATALOG.md") {
    this.outputPath = path.join(outputPath, filename);
    this.content = [];
    this.categories = new Map();
  }

  /**
   * Initialize the markdown generator by setting up the header and table of contents structure.
   * Resets any previous state and prepares for new component additions.
   *
   * @example
   * ```typescript
   * const generator = new MarkdownGenerator("./docs");
   * generator.initialize();
   * // Content now contains header and empty TOC placeholder
   * ```
   */
  initialize(): void {
    this.content = [
      "# Component & Utility Catalog",
      "",
      `> Auto-generated on ${new Date().toISOString()}`,
      "",
      "## Table of Contents",
      "",
    ];

    this.categories.clear();
  }

  /**
   * Add a component to the appropriate category for markdown generation.
   * Components are automatically sorted into categories based on their type.
   *
   * @param component - The ComponentMetadata object to add
   *
   * @example
   * ```typescript
   * generator.addComponent({
   *   name: "Button",
   *   type: "component",
   *   filePath: "src/Button.tsx",
   *   signature: "(props: ButtonProps) => JSX.Element",
   *   // ... other fields
   * });
   * // Button is added to "Components" category
   * ```
   */
  addComponent(component: ComponentMetadata): void {
    const category = this.getCategoryName(component.type);

    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }

    this.categories.get(category)!.push(component);
  }

  /**
   * Map a component type to its display category name.
   *
   * @param type - The component type
   * @returns The display name for the category
   */
  private getCategoryName(type: ComponentType): string {
    switch (type) {
      case "component":
        return "Components";
      case "hook":
        return "Hooks";
      case "utility":
        return "Utilities";
      case "class":
        return "Classes";
      case "type":
        return "Types";
      default:
        return "Other";
    }
  }

  finalize(): void {
    // Add table of contents
    const sortedCategories = Array.from(this.categories.keys()).sort();
    for (const category of sortedCategories) {
      this.content.push(
        `- [${category}](#${category.toLowerCase().replace(/\s+/g, "-")})`,
      );
    }
    this.content.push("");

    // Add each category
    for (const category of sortedCategories) {
      const components = this.categories.get(category)!;

      this.content.push(`## ${category}`);
      this.content.push("");

      for (const component of components) {
        this.addComponentSection(component);
      }
    }

    // Write to file
    fs.writeFileSync(this.outputPath, this.content.join("\n"), "utf-8");
  }

  /**
   * Add a detailed markdown section for a single component.
   * Includes signature, props table, examples, and usage information.
   *
   * @param component - The ComponentMetadata object to document
   */
  private addComponentSection(component: ComponentMetadata): void {
    this.content.push(`### ${component.name}`);
    this.content.push("");
    this.content.push(`**File:** \`${component.filePath}\``);
    this.content.push("");

    // JSDoc
    if (component.jsDoc) {
      this.content.push(component.jsDoc);
      this.content.push("");
    }

    // Signature
    if (component.signature) {
      this.content.push("**Signature:**");
      this.content.push("```typescript");
      this.content.push(component.signature);
      this.content.push("```");
      this.content.push("");
    }

    // Props
    if (component.props && component.props.length > 0) {
      this.content.push("**Props:**");
      this.content.push("");
      this.content.push("| Name | Type | Required | Description |");
      this.content.push("|------|------|----------|-------------|");

      for (const prop of component.props) {
        const required = prop.required ? "✓" : "";
        const desc = prop.description || "";
        this.content.push(
          `| ${prop.name} | \`${prop.type}\` | ${required} | ${desc} |`,
        );
      }
      this.content.push("");
    }

    // Stories
    if (component.stories && component.stories.length > 0) {
      this.content.push("**Examples (Storybook):**");
      this.content.push("");
      for (const story of component.stories) {
        this.content.push(`- ${story.name} (\`${story.filePath}\`)`);
      }
      this.content.push("");
    }

    // Usage
    if (component.usedIn && component.usedIn.length > 0) {
      this.content.push(`**Used in ${component.usedIn.length} places:**`);
      this.content.push("");

      const displayCount = Math.min(component.usedIn.length, 10);
      for (let i = 0; i < displayCount; i++) {
        const usage = component.usedIn[i];
        this.content.push(`- \`${usage.filePath}:${usage.line}\``);
      }

      if (component.usedIn.length > displayCount) {
        this.content.push(
          `- ... and ${component.usedIn.length - displayCount} more`,
        );
      }
      this.content.push("");
    }

    this.content.push("---");
    this.content.push("");
  }
}

/**
 * Generator for creating LLM-optimized text format catalogs.
 * Produces concise, single-line entries optimized for AI model context windows.
 *
 * @example
 * ```typescript
 * const generator = new LLMTextGenerator("/output/path", "llm.txt");
 * generator.initialize();
 * generator.addComponent(buttonMetadata);
 * generator.finalize(); // Writes llm.txt
 * ```
 */
export class LLMTextGenerator implements CatalogGenerator {
  private outputPath: string;
  private content: string[];
  private categories: Map<string, ComponentMetadata[]>;

  /**
   * Create a new LLMTextGenerator instance.
   *
   * @param outputPath - Directory where the text file will be written
   * @param filename - Name of the output file (default: "llm.txt")
   *
   * @example
   * ```typescript
   * const generator = new LLMTextGenerator("./docs", "components.txt");
   * ```
   */
  constructor(outputPath: string, filename: string = "llm.txt") {
    this.outputPath = path.join(outputPath, filename);
    this.content = [];
    this.categories = new Map();
  }

  /**
   * Initialize the LLM text generator by setting up the header and description.
   *
   * @example
   * ```typescript
   * const generator = new LLMTextGenerator("./docs");
   * generator.initialize();
   * // Content now contains LLM-optimized header
   * ```
   */
  initialize(): void {
    this.content = [
      "# Component & Utility Catalog (LLM-Optimized)",
      `# Generated: ${new Date().toISOString()}`,
      "",
      "# This file provides a concise overview of available components and utilities.",
      "# Use this to quickly find existing solutions before implementing new ones.",
      "",
    ];
    this.categories.clear();
  }

  /**
   * Add a component to the appropriate category for LLM text generation.
   * Components are automatically sorted into categories based on their type.
   *
   * @param component - The ComponentMetadata object to add
   *
   * @example
   * ```typescript
   * generator.addComponent(buttonMetadata);
   * // Component is stored and will be written with section headers in finalize()
   * ```
   */
  addComponent(component: ComponentMetadata): void {
    const category = this.getCategoryName(component.type);

    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }

    this.categories.get(category)!.push(component);
  }

  /**
   * Map a component type to its display category name.
   *
   * @param type - The component type
   * @returns The display name for the category
   */
  private getCategoryName(type: ComponentType): string {
    switch (type) {
      case "component":
        return "COMPONENTS";
      case "hook":
        return "HOOKS";
      case "utility":
        return "UTILITIES";
      case "class":
        return "CLASSES";
      case "type":
        return "TYPES";
      default:
        return "OTHER";
    }
  }

  /**
   * Format a single component entry in LLM-optimized format.
   * Includes What, Props, Returns, Signature, and Usage information.
   *
   * @param component - The ComponentMetadata object to format
   */
  private formatComponent(component: ComponentMetadata): void {
    this.content.push(`[${component.type.toUpperCase()}] ${component.name}`);
    this.content.push(`File: ${component.filePath}`);

    if (component.jsDoc) {
      const cleanDoc = component.jsDoc.replace(/\n/g, "\n ").trim();
      this.content.push(`What: ${cleanDoc}`);
    }

    // Add Props for components that have them
    if (component.props && component.props.length > 0) {
      const propsStr = component.props
        .map((prop) => {
          const optional = prop.required ? "" : "?";
          return `${prop.name}${optional}: ${prop.type}`;
        })
        .join(", ");
      this.content.push(`Props: ${propsStr}`);
    }

    // Add Return Type for hooks and utilities
    if (
      component.returnType &&
      (component.type === "hook" || component.type === "utility")
    ) {
      this.content.push(`Returns: ${component.returnType}`);
    }

    // Add full signature (not truncated)
    if (component.signature) {
      this.content.push(`Sig: ${component.signature}`);
    }

    if (component.usedIn && component.usedIn.length > 0) {
      this.content.push(`Uses: ${component.usedIn.length} locations`);
    }

    this.content.push("");
  }

  /**
   * Write the LLM-optimized text file to disk with Table of Contents and section headers.
   *
   * @example
   * ```typescript
   * generator.initialize();
   * generator.addComponent(buttonMetadata);
   * generator.finalize();
   * // llm.txt file is now written with TOC and organized sections
   * ```
   */
  finalize(): void {
    // Generate Table of Contents
    const sortedCategories = Array.from(this.categories.keys()).sort();

    if (sortedCategories.length > 0) {
      this.content.push("# TABLE OF CONTENTS");

      for (const category of sortedCategories) {
        const components = this.categories.get(category)!;
        const names = components.map((c) => c.name).join(", ");
        this.content.push(`${category}: ${names}`);
      }

      this.content.push("");
    }

    // Add each category with components
    for (const category of sortedCategories) {
      const components = this.categories.get(category)!;

      this.content.push(`## ${category}`);
      this.content.push("");

      for (const component of components) {
        this.formatComponent(component);
      }
    }

    fs.writeFileSync(this.outputPath, this.content.join("\n"), "utf-8");
  }
}

/**
 * Generator for creating JSON catalog files.
 * Produces machine-readable structured data suitable for programmatic consumption.
 *
 * @example
 * ```typescript
 * const generator = new JSONGenerator("/output/path", "catalog.json");
 * generator.initialize();
 * generator.addComponent(buttonMetadata);
 * generator.finalize(); // Writes catalog.json
 * ```
 */
export class JSONGenerator implements CatalogGenerator {
  private outputPath: string;
  private components: ComponentMetadata[];

  /**
   * Create a new JSONGenerator instance.
   *
   * @param outputPath - Directory where the JSON file will be written
   * @param filename - Name of the output file (default: "catalog.json")
   *
   * @example
   * ```typescript
   * const generator = new JSONGenerator("./docs", "api.json");
   * ```
   */
  constructor(outputPath: string, filename: string = "catalog.json") {
    this.outputPath = path.join(outputPath, filename);
    this.components = [];
  }

  /**
   * Initialize the JSON generator by clearing the components array.
   *
   * @example
   * ```typescript
   * const generator = new JSONGenerator("./docs");
   * generator.initialize();
   * // Components array is now empty and ready
   * ```
   */
  initialize(): void {
    this.components = [];
  }

  /**
   * Add a component to the JSON catalog array.
   *
   * @param component - The ComponentMetadata object to add
   *
   * @example
   * ```typescript
   * generator.addComponent(buttonMetadata);
   * generator.addComponent(cardMetadata);
   * // Both components are now in the array
   * ```
   */
  addComponent(component: ComponentMetadata): void {
    this.components.push(component);
  }

  /**
   * Write the JSON catalog file to disk with metadata and all components.
   *
   * @example
   * ```typescript
   * generator.initialize();
   * generator.addComponent(buttonMetadata);
   * generator.finalize();
   * // Writes: { generated: "...", version: "1.0.0", components: [...] }
   * ```
   */
  finalize(): void {
    const catalog = {
      generated: new Date().toISOString(),
      version: "1.0.0",
      components: this.components,
    };

    fs.writeFileSync(
      this.outputPath,
      JSON.stringify(catalog, null, 2),
      "utf-8",
    );
  }
}

/**
 * Orchestrate multiple catalog generators simultaneously.
 * Manages initialization, component distribution, and finalization across all enabled output formats.
 *
 * @example
 * ```typescript
 * const writer = new CatalogWriter("./docs", {
 *   markdown: true,
 *   llmTxt: { enabled: true, filename: "components.txt" },
 *   json: false
 * });
 * writer.initialize();
 * writer.addComponent(buttonMetadata);
 * writer.finalize();
 * // Generates CATALOG.md and components.txt
 * ```
 */
export class CatalogWriter {
  private generators: CatalogGenerator[];

  /**
   * Create a new CatalogWriter instance with configured output generators.
   *
   * @param outputPath - Directory where all output files will be written
   * @param outputConfig - Configuration for each output format (boolean or detailed config)
   *
   * @example
   * ```typescript
   * // Enable all formats with defaults
   * const writer = new CatalogWriter("./docs");
   *
   * // Enable specific formats
   * const writer = new CatalogWriter("./docs", {
   *   markdown: true,
   *   llmTxt: false,
   *   json: true
   * });
   *
   * // Custom filenames
   * const writer = new CatalogWriter("./docs", {
   *   markdown: { enabled: true, filename: "API.md" },
   *   llmTxt: { enabled: true, filename: "summary.txt" },
   *   json: { enabled: true, filename: "api.json" }
   * });
   * ```
   */
  constructor(
    outputPath: string,
    outputConfig?: {
      markdown?: boolean | { enabled: boolean; filename?: string };
      llmTxt?: boolean | { enabled: boolean; filename?: string };
      json?: boolean | { enabled: boolean; filename?: string };
    },
  ) {
    // Normalize config: convert boolean shorthand to object format
    const normalizeConfig = (
      value: boolean | { enabled: boolean; filename?: string } | undefined,
      defaultFilename: string,
    ): { enabled: boolean; filename: string } => {
      if (value === undefined) {
        return { enabled: true, filename: defaultFilename };
      }
      if (typeof value === "boolean") {
        return { enabled: value, filename: defaultFilename };
      }
      return {
        enabled: value.enabled,
        filename: value.filename || defaultFilename,
      };
    };

    const markdownConfig = normalizeConfig(
      outputConfig?.markdown,
      "CATALOG.md",
    );
    const llmTxtConfig = normalizeConfig(outputConfig?.llmTxt, "llm.txt");
    const jsonConfig = normalizeConfig(outputConfig?.json, "catalog.json");

    this.generators = [];
    if (markdownConfig.enabled) {
      this.generators.push(
        new MarkdownGenerator(outputPath, markdownConfig.filename),
      );
    }
    if (llmTxtConfig.enabled) {
      this.generators.push(
        new LLMTextGenerator(outputPath, llmTxtConfig.filename),
      );
    }
    if (jsonConfig.enabled) {
      this.generators.push(new JSONGenerator(outputPath, jsonConfig.filename));
    }
  }

  /**
   * Initialize all enabled generators.
   *
   * @example
   * ```typescript
   * const writer = new CatalogWriter("./docs");
   * writer.initialize();
   * // All enabled generators are now ready to accept components
   * ```
   */
  initialize(): void {
    for (const generator of this.generators) {
      generator.initialize();
    }
  }

  /**
   * Add a component to all enabled generators simultaneously.
   *
   * @param component - The ComponentMetadata object to add to all generators
   *
   * @example
   * ```typescript
   * writer.initialize();
   * writer.addComponent(buttonMetadata);
   * writer.addComponent(cardMetadata);
   * // Both components are added to all enabled generators
   * ```
   */
  addComponent(component: ComponentMetadata): void {
    for (const generator of this.generators) {
      generator.addComponent(component);
    }
  }

  /**
   * Finalize all enabled generators, writing their output files to disk.
   *
   * @example
   * ```typescript
   * writer.initialize();
   * components.forEach(c => writer.addComponent(c));
   * writer.finalize();
   * // All enabled output files are now written
   * ```
   */
  finalize(): void {
    for (const generator of this.generators) {
      generator.finalize();
    }
  }
}
