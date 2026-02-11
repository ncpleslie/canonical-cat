import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  JSONGenerator,
  LLMTextGenerator,
  MarkdownGenerator,
} from "../src/lib/generators";
import type { ComponentMetadata } from "../src/types";

describe("generators", () => {
  const testOutputDir = path.join(process.cwd(), "test-output");

  beforeEach(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Cleanup test files
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true });
    }
  });

  const mockComponent: ComponentMetadata = {
    name: "Button",
    type: "component",
    filePath: "/test/Button.tsx",
    exportType: "named",
    signature: "Button = (props: ButtonProps) => JSX.Element",
    props: [
      {
        name: "label",
        type: "string",
        required: true,
        description: "Button text",
      },
      { name: "onClick", type: "() => void", required: false },
    ],
    jsDoc: "A reusable button component",
    implementationHash: "hash1",
    interfaceHash: "hash2",
    usedIn: [{ filePath: "App.tsx", line: 10 }],
    stories: [{ name: "Primary", filePath: "Button.stories.tsx" }],
  };

  describe("MarkdownGenerator", () => {
    it("should generate markdown file with component details", () => {
      const generator = new MarkdownGenerator(testOutputDir);

      generator.initialize();
      generator.addComponent(mockComponent);
      generator.finalize();

      const mdPath = path.join(testOutputDir, "CATALOG.md");
      expect(fs.existsSync(mdPath)).toBe(true);

      const content = fs.readFileSync(mdPath, "utf-8");
      expect(content).toContain("# Component & Utility Catalog");
      expect(content).toContain("### Button");
      expect(content).toContain("A reusable button component");
      expect(content).toContain("Button = (props: ButtonProps) => JSX.Element");
    });

    it("should support custom filename", () => {
      const generator = new MarkdownGenerator(
        testOutputDir,
        "custom-catalog.md",
      );

      generator.initialize();
      generator.addComponent(mockComponent);
      generator.finalize();

      const mdPath = path.join(testOutputDir, "custom-catalog.md");
      expect(fs.existsSync(mdPath)).toBe(true);

      const content = fs.readFileSync(mdPath, "utf-8");
      expect(content).toContain("# Component & Utility Catalog");
    });

    it("should include props table", () => {
      const generator = new MarkdownGenerator(testOutputDir);

      generator.initialize();
      generator.addComponent(mockComponent);
      generator.finalize();

      const content = fs.readFileSync(
        path.join(testOutputDir, "CATALOG.md"),
        "utf-8",
      );
      expect(content).toContain("**Props:**");
      expect(content).toContain("| label |");
      expect(content).toContain("| onClick |");
    });

    it("should include usage references", () => {
      const generator = new MarkdownGenerator(testOutputDir);

      generator.initialize();
      generator.addComponent(mockComponent);
      generator.finalize();

      const content = fs.readFileSync(
        path.join(testOutputDir, "CATALOG.md"),
        "utf-8",
      );
      expect(content).toContain("Used in 1 places");
      expect(content).toContain("App.tsx:10");
    });
  });

  describe("LLMTextGenerator", () => {
    it("should generate concise llm.txt format", () => {
      const generator = new LLMTextGenerator(testOutputDir);

      generator.initialize();
      generator.addComponent(mockComponent);
      generator.finalize();

      const txtPath = path.join(testOutputDir, "llm.txt");
      expect(fs.existsSync(txtPath)).toBe(true);

      const content = fs.readFileSync(txtPath, "utf-8");
      expect(content).toContain("[COMPONENT] Button");
      expect(content).toContain("File: /test/Button.tsx");
      expect(content).toContain("What: A reusable button component");
      expect(content).toContain(
        "Sig: Button = (props: ButtonProps) => JSX.Element",
      );
    });

    it("should support custom filename", () => {
      const generator = new LLMTextGenerator(testOutputDir, "custom-llm.txt");

      generator.initialize();
      generator.addComponent(mockComponent);
      generator.finalize();

      const txtPath = path.join(testOutputDir, "custom-llm.txt");
      expect(fs.existsSync(txtPath)).toBe(true);

      const content = fs.readFileSync(txtPath, "utf-8");
      expect(content).toContain("[COMPONENT] Button");
    });

    it("should include usage count", () => {
      const generator = new LLMTextGenerator(testOutputDir);

      generator.initialize();
      generator.addComponent(mockComponent);
      generator.finalize();

      const content = fs.readFileSync(
        path.join(testOutputDir, "llm.txt"),
        "utf-8",
      );
      expect(content).toContain("Uses: 1 locations");
    });

    it("should include Table of Contents", () => {
      const generator = new LLMTextGenerator(testOutputDir);

      generator.initialize();
      generator.addComponent(mockComponent);
      generator.finalize();

      const content = fs.readFileSync(
        path.join(testOutputDir, "llm.txt"),
        "utf-8",
      );
      expect(content).toContain("# TABLE OF CONTENTS");
      expect(content).toContain("COMPONENTS: Button");
    });

    it("should include section headers", () => {
      const generator = new LLMTextGenerator(testOutputDir);

      generator.initialize();
      generator.addComponent(mockComponent);
      generator.finalize();

      const content = fs.readFileSync(
        path.join(testOutputDir, "llm.txt"),
        "utf-8",
      );
      expect(content).toContain("## COMPONENTS");
    });

    it("should include Props line for components with props", () => {
      const generator = new LLMTextGenerator(testOutputDir);

      generator.initialize();
      generator.addComponent(mockComponent);
      generator.finalize();

      const content = fs.readFileSync(
        path.join(testOutputDir, "llm.txt"),
        "utf-8",
      );
      expect(content).toContain("Props: label: string, onClick?: () => void");
    });

    it("should include Returns line for hooks with returnType", () => {
      const hookComponent: ComponentMetadata = {
        name: "useCounter",
        type: "hook",
        filePath: "/test/useCounter.ts",
        exportType: "named",
        signature:
          "useCounter = (initialValue: number = 0): UseCounterReturn => ...",
        returnType: "UseCounterReturn",
        jsDoc: "Hook for managing a counter",
        implementationHash: "hash1",
        interfaceHash: "hash2",
        usedIn: [],
      };

      const generator = new LLMTextGenerator(testOutputDir);

      generator.initialize();
      generator.addComponent(hookComponent);
      generator.finalize();

      const content = fs.readFileSync(
        path.join(testOutputDir, "llm.txt"),
        "utf-8",
      );
      expect(content).toContain("Returns: UseCounterReturn");
    });

    it("should group components by type", () => {
      const hookComponent: ComponentMetadata = {
        name: "useCounter",
        type: "hook",
        filePath: "/test/useCounter.ts",
        exportType: "named",
        signature: "useCounter = () => number",
        implementationHash: "hash3",
        interfaceHash: "hash4",
        usedIn: [],
      };

      const generator = new LLMTextGenerator(testOutputDir);

      generator.initialize();
      generator.addComponent(mockComponent);
      generator.addComponent(hookComponent);
      generator.finalize();

      const content = fs.readFileSync(
        path.join(testOutputDir, "llm.txt"),
        "utf-8",
      );
      expect(content).toContain("COMPONENTS: Button");
      expect(content).toContain("HOOKS: useCounter");
      expect(content).toContain("## COMPONENTS");
      expect(content).toContain("## HOOKS");
    });
  });

  describe("JSONGenerator", () => {
    it("should generate valid JSON file", () => {
      const generator = new JSONGenerator(testOutputDir);

      generator.initialize();
      generator.addComponent(mockComponent);
      generator.finalize();

      const jsonPath = path.join(testOutputDir, "catalog.json");
      expect(fs.existsSync(jsonPath)).toBe(true);

      const content = fs.readFileSync(jsonPath, "utf-8");
      const data = JSON.parse(content);

      expect(data.version).toBeDefined();
      expect(data.generated).toBeDefined();
      expect(data.components).toHaveLength(1);
      expect(data.components[0].name).toBe("Button");
    });

    it("should support custom filename", () => {
      const generator = new JSONGenerator(testOutputDir, "custom-catalog.json");

      generator.initialize();
      generator.addComponent(mockComponent);
      generator.finalize();

      const jsonPath = path.join(testOutputDir, "custom-catalog.json");
      expect(fs.existsSync(jsonPath)).toBe(true);

      const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      expect(data.components).toHaveLength(1);
    });

    it("should include all metadata", () => {
      const generator = new JSONGenerator(testOutputDir);

      generator.initialize();
      generator.addComponent(mockComponent);
      generator.finalize();

      const data = JSON.parse(
        fs.readFileSync(path.join(testOutputDir, "catalog.json"), "utf-8"),
      );
      const component = data.components[0];

      expect(component.props).toHaveLength(2);
      expect(component.usedIn).toHaveLength(1);
      expect(component.stories).toHaveLength(1);
      expect(component.implementationHash).toBe("hash1");
      expect(component.interfaceHash).toBe("hash2");
    });
  });
});
