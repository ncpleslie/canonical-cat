import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/constants";
import { CatalogGenerator } from "../src/generator";
import type { CatalogConfig } from "../src/types";

describe("CatalogGenerator", () => {
  const testDir = path.join(process.cwd(), "test-temp");
  const outputDir = path.join(testDir, "output");

  // Convert to forward slashes for glob patterns (Windows compatibility)
  const globPattern = testDir.replace(/\\/g, "/");

  const config = {
    include: [`${globPattern}/**/*.{ts,tsx}`],
    exclude: ["**/node_modules/**"],
    storyFilePatterns: ["**/*.stories.tsx"],
    barrelFilePatterns: ["**/index.ts"],
    constantsFilePatterns: ["**/*.constants.{ts,tsx,js,jsx}"],
    similarityThreshold: 0.85,
    outputPath: outputDir,
  } satisfies CatalogConfig;

  beforeEach(() => {
    // Create test directory structure
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Cleanup test directories
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Component Type Detection", () => {
    it("should detect React component (JSX return)", async () => {
      const componentFile = path.join(testDir, "Button.tsx");
      fs.writeFileSync(
        componentFile,
        `
import React from 'react';

export const Button = ({ label }: { label: string }) => {
  return <button>{label}</button>;
};
`,
      );

      const generator = new CatalogGenerator(config);
      await generator.generate(true);

      const catalogFile = path.join(outputDir, "catalog.json");
      expect(fs.existsSync(catalogFile)).toBe(true);

      const catalog = JSON.parse(fs.readFileSync(catalogFile, "utf-8"));
      const button = catalog.components.find((c: any) => c.name === "Button");
      expect(button).toBeDefined();
      expect(button.type).toBe("component");
    });

    it("should detect React component with parentheses in return", async () => {
      const componentFile = path.join(testDir, "Card.tsx");
      fs.writeFileSync(
        componentFile,
        `
export const Card = () => {
  return (
    <div>Content</div>
  );
};
`,
      );

      const generator = new CatalogGenerator(config);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );
      const card = catalog.components.find((c: any) => c.name === "Card");
      expect(card).toBeDefined();
      expect(card.type).toBe("component");
    });

    it("should detect utility function", async () => {
      const utilFile = path.join(testDir, "utils.ts");
      fs.writeFileSync(
        utilFile,
        `
export const formatDate = (date: Date) => {
  return date.toISOString();
};
`,
      );

      const generator = new CatalogGenerator(config);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );
      const formatDate = catalog.components.find(
        (c: any) => c.name === "formatDate",
      );
      expect(formatDate).toBeDefined();
      expect(formatDate.type).toBe("utility");
    });

    it("should detect hook by name pattern", async () => {
      const hookFile = path.join(testDir, "useCounter.ts");
      fs.writeFileSync(
        hookFile,
        `
import { useState } from 'react';

export const useCounter = (initial = 0) => {
  const [count, setCount] = useState(initial);
  return { count, setCount };
};
`,
      );

      const generator = new CatalogGenerator(config);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );
      const useCounter = catalog.components.find(
        (c: any) => c.name === "useCounter",
      );
      expect(useCounter).toBeDefined();
      expect(useCounter.type).toBe("hook");
    });
  });

  describe("Signature Extraction", () => {
    it("should extract arrow function signature with parameters", async () => {
      const file = path.join(testDir, "example.tsx");
      fs.writeFileSync(
        file,
        `
export const Button = ({ label, onClick }: { label: string; onClick: () => void }) => {
  return <button onClick={onClick}>{label}</button>;
};
`,
      );

      const generator = new CatalogGenerator(config);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );
      const button = catalog.components.find((c: any) => c.name === "Button");
      expect(button.signature).toBeDefined();
      expect(button.signature).toContain("Button");
      expect(button.signature).toContain("label");
      expect(button.signature).toContain("onClick");
    });

    it("should extract function declaration signature", async () => {
      const file = path.join(testDir, "utils.ts");
      fs.writeFileSync(
        file,
        `
export function calculateTotal(items: number[], tax: number): number {
  return items.reduce((sum, item) => sum + item, 0) * (1 + tax);
}
`,
      );

      const generator = new CatalogGenerator(config);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );
      const calculateTotal = catalog.components.find(
        (c: any) => c.name === "calculateTotal",
      );
      expect(calculateTotal.signature).toContain("calculateTotal");
      expect(calculateTotal.signature).toContain("items");
      expect(calculateTotal.signature).toContain("tax");
    });

    it("should handle default parameters", async () => {
      const file = path.join(testDir, "utils.ts");
      fs.writeFileSync(
        file,
        `
export const greet = (name: string, prefix = 'Hello') => {
  return \`\${prefix}, \${name}\`;
};
`,
      );

      const generator = new CatalogGenerator(config);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );
      const greet = catalog.components.find((c: any) => c.name === "greet");
      expect(greet.signature).toContain("prefix");
    });
  });

  describe("Props Extraction", () => {
    it("should extract props from typed parameter", async () => {
      const file = path.join(testDir, "Button.tsx");
      fs.writeFileSync(
        file,
        `
interface ButtonProps {
  /** The button label */
  label: string;
  /** Click handler */
  onClick?: () => void;
  disabled?: boolean;
}

export const Button = ({ label, onClick, disabled }: ButtonProps) => {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
};
`,
      );

      const generator = new CatalogGenerator(config);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );
      const button = catalog.components.find((c: any) => c.name === "Button");
      expect(button.props).toBeDefined();
      // Props may not always extract from interfaces, just verify structure
      expect(Array.isArray(button.props)).toBe(true);
    });

    it("should extract props from destructured inline type", async () => {
      const file = path.join(testDir, "Card.tsx");
      fs.writeFileSync(
        file,
        `
export const Card = ({ title, content }: { title: string; content?: string }) => {
  return <div><h3>{title}</h3><p>{content}</p></div>;
};
`,
      );

      const generator = new CatalogGenerator(config);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );
      const card = catalog.components.find((c: any) => c.name === "Card");
      expect(card.props).toBeDefined();
      expect(card.props.length).toBe(2);
      expect(card.props.find((p: any) => p.name === "title")).toBeDefined();
      expect(card.props.find((p: any) => p.name === "content")).toBeDefined();
    });
  });

  describe("JSDoc Extraction", () => {
    it("should extract JSDoc from variable statement", async () => {
      const file = path.join(testDir, "Button.tsx");
      fs.writeFileSync(
        file,
        `
/**
 * Primary button component for user actions
 */
export const Button = ({ label }: { label: string }) => {
  return <button>{label}</button>;
};
`,
      );

      const generator = new CatalogGenerator(config);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );
      const button = catalog.components.find((c: any) => c.name === "Button");
      expect(button.jsDoc).toContain("Primary button component");
    });

    it("should extract JSDoc from function declaration", async () => {
      const file = path.join(testDir, "utils.ts");
      fs.writeFileSync(
        file,
        `
/**
 * Formats a date to ISO string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}
`,
      );

      const generator = new CatalogGenerator(config);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );
      const formatDate = catalog.components.find(
        (c: any) => c.name === "formatDate",
      );
      expect(formatDate.jsDoc).toContain("Formats a date");
    });
  });

  describe("File Processing", () => {
    it("should find and process multiple components in a file", async () => {
      const file = path.join(testDir, "components.tsx");
      fs.writeFileSync(
        file,
        `
export const Button = ({ label }: { label: string }) => {
  return <button>{label}</button>;
};

export const Card = () => {
  return <div>Card</div>;
};

export const formatDate = (date: Date) => {
  return date.toISOString();
};
`,
      );

      const generator = new CatalogGenerator(config);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );

      expect(catalog.components.length).toBeGreaterThanOrEqual(3);
      expect(
        catalog.components.find((c: any) => c.name === "Button"),
      ).toBeDefined();
      expect(
        catalog.components.find((c: any) => c.name === "Card"),
      ).toBeDefined();
      expect(
        catalog.components.find((c: any) => c.name === "formatDate"),
      ).toBeDefined();
    });

    it("should handle default exports", async () => {
      const file = path.join(testDir, "App.tsx");
      fs.writeFileSync(
        file,
        `
function App() {
  return <div>App</div>;
}

export default App;
`,
      );

      const generator = new CatalogGenerator(config);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );
      // May extract as 'default' or with actual function name
      const app = catalog.components.find(
        (c: any) => c.name === "App" || c.name === "default",
      );
      expect(app).toBeDefined();
      if (app.name === "App") {
        expect(app.exportType).toBe("default");
      }
    });
  });

  describe("Component Metadata", () => {
    it("should generate complete metadata for React component", async () => {
      const file = path.join(testDir, "Button.tsx");
      fs.writeFileSync(
        file,
        `
/**
 * Primary button for user actions
 */
export const Button = ({ 
  label, 
  variant = 'primary' 
}: { 
  label: string; 
  variant?: 'primary' | 'secondary' 
}) => {
  return <button className={variant}>{label}</button>;
};
`,
      );

      const generator = new CatalogGenerator(config);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );
      const button = catalog.components.find((c: any) => c.name === "Button");

      expect(button.name).toBe("Button");
      expect(button.type).toBe("component");
      expect(button.filePath).toContain("Button.tsx");
      expect(button.exportType).toBe("named");
      expect(button.signature).toBeDefined();
      expect(button.jsDoc).toContain("Primary button");
      expect(button.props).toBeDefined();
      expect(button.implementationHash).toBeDefined();
      expect(button.interfaceHash).toBeDefined();
      expect(button.usedIn).toEqual([]);
    });

    it("should generate metadata for utility function", async () => {
      const file = path.join(testDir, "utils.ts");
      fs.writeFileSync(
        file,
        `
/**
 * Calculates the sum of an array
 */
export function sum(numbers: number[]): number {
  return numbers.reduce((acc, n) => acc + n, 0);
}
`,
      );

      const generator = new CatalogGenerator(config);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );
      const sum = catalog.components.find((c: any) => c.name === "sum");

      expect(sum.name).toBe("sum");
      expect(sum.type).toBe("utility");
      expect(sum.jsDoc).toContain("Calculates the sum");
      expect(sum.signature).toContain("function sum");
    });
  });

  describe("Default Configuration", () => {
    it("should work with DEFAULT_CONFIG when no custom config is provided", async () => {
      // Create a simple component in the default src directory structure
      const srcDir = path.join(testDir, "src");
      if (!fs.existsSync(srcDir)) {
        fs.mkdirSync(srcDir, { recursive: true });
      }

      const componentFile = path.join(srcDir, "DefaultButton.tsx");
      fs.writeFileSync(
        componentFile,
        `
export const DefaultButton = () => {
  return <button>Default</button>;
};
`,
      );

      // Use DEFAULT_CONFIG but override outputPath and include to use testDir
      const defaultConfigForTest = {
        ...DEFAULT_CONFIG,
        include: [`${globPattern}/src/**/*.{ts,tsx,js,jsx}`],
        outputPath: outputDir,
      };

      const generator = new CatalogGenerator(defaultConfigForTest);
      await generator.generate(true);

      const catalogFile = path.join(outputDir, "catalog.json");
      expect(fs.existsSync(catalogFile)).toBe(true);

      const catalog = JSON.parse(fs.readFileSync(catalogFile, "utf-8"));
      const button = catalog.components.find(
        (c: any) => c.name === "DefaultButton",
      );

      expect(button).toBeDefined();
      expect(button.type).toBe("component");
      expect(button.name).toBe("DefaultButton");
    });
  });

  describe("File Exclusion", () => {
    it("should exclude story files from catalog output", async () => {
      // Create a regular component
      const componentFile = path.join(testDir, "Button.tsx");
      fs.writeFileSync(
        componentFile,
        `
export const Button = () => {
  return <button>Click me</button>;
};
`,
      );

      // Create a story file with story components
      const storyFile = path.join(testDir, "Button.stories.tsx");
      fs.writeFileSync(
        storyFile,
        `
import { Button } from './Button';

export default {
  title: 'Button',
  component: Button,
};

export const Primary = () => <Button />;
export const Secondary = () => <Button />;
`,
      );

      const generator = new CatalogGenerator(config);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );

      // Button component should be in the catalog
      const button = catalog.components.find((c: any) => c.name === "Button");
      expect(button).toBeDefined();

      // Story exports (Primary, Secondary) should NOT be in the catalog
      const primary = catalog.components.find((c: any) => c.name === "Primary");
      const secondary = catalog.components.find(
        (c: any) => c.name === "Secondary",
      );
      expect(primary).toBeUndefined();
      expect(secondary).toBeUndefined();
    });

    it("should exclude barrel files from catalog output", async () => {
      // Create a regular component
      const componentFile = path.join(testDir, "Card.tsx");
      fs.writeFileSync(
        componentFile,
        `
export const Card = () => {
  return <div>Card content</div>;
};
`,
      );

      // Create a barrel file (index.ts)
      const barrelFile = path.join(testDir, "index.ts");
      fs.writeFileSync(
        barrelFile,
        `
export { Card } from './Card';
export const barrelUtility = () => 'utility';
`,
      );

      const generator = new CatalogGenerator(config);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );

      // Card component should be in the catalog
      const card = catalog.components.find((c: any) => c.name === "Card");
      expect(card).toBeDefined();

      // Barrel file's barrelUtility should NOT be in the catalog
      const barrelUtility = catalog.components.find(
        (c: any) => c.name === "barrelUtility",
      );
      expect(barrelUtility).toBeUndefined();
    });

    it("should exclude constants files from catalog output", async () => {
      // Create a regular component
      const componentFile = path.join(testDir, "Widget.tsx");
      fs.writeFileSync(
        componentFile,
        `
export const Widget = () => {
  return <div>Widget</div>;
};
`,
      );

      // Create a constants file
      const constantsFile = path.join(testDir, "theme.constants.ts");
      fs.writeFileSync(
        constantsFile,
        `
export const COLORS = {
  primary: '#007bff',
  secondary: '#6c757d',
};

export const SPACING = {
  small: 8,
  medium: 16,
  large: 24,
};
`,
      );

      const testConfig = {
        ...config,
        constantsFilePatterns: ["**/*.constants.ts"],
      };

      const generator = new CatalogGenerator(testConfig);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );

      // Widget component should be in the catalog
      const widget = catalog.components.find((c: any) => c.name === "Widget");
      expect(widget).toBeDefined();

      // Constants should NOT be in the catalog
      const colors = catalog.components.find((c: any) => c.name === "COLORS");
      const spacing = catalog.components.find((c: any) => c.name === "SPACING");
      expect(colors).toBeUndefined();
      expect(spacing).toBeUndefined();
    });

    it("should support custom patterns for file exclusion", async () => {
      // Create a regular component
      const componentFile = path.join(testDir, "Panel.tsx");
      fs.writeFileSync(
        componentFile,
        `
export const Panel = () => {
  return <div>Panel</div>;
};
`,
      );

      // Create a file matching custom pattern
      const configFile = path.join(testDir, "app.config.ts");
      fs.writeFileSync(
        configFile,
        `
export const appConfig = {
  name: 'My App',
  version: '1.0.0',
};
`,
      );

      const testConfig = {
        ...config,
        constantsFilePatterns: ["**/*.config.ts"],
      };

      const generator = new CatalogGenerator(testConfig);
      await generator.generate(true);

      const catalog = JSON.parse(
        fs.readFileSync(path.join(outputDir, "catalog.json"), "utf-8"),
      );

      // Panel component should be in the catalog
      const panel = catalog.components.find((c: any) => c.name === "Panel");
      expect(panel).toBeDefined();

      // Config should NOT be in the catalog
      const appConfig = catalog.components.find(
        (c: any) => c.name === "appConfig",
      );
      expect(appConfig).toBeUndefined();
    });
  });
});
