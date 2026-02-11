import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Project } from "ts-morph";
import * as fs from "node:fs";
import * as path from "node:path";
import { trackUsages, batchTrackUsages } from "../src/lib/usage-tracker";

describe("usage-tracker", () => {
  const testDir = path.join(process.cwd(), "test-usage-temp");

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("trackUsages", () => {
    it("should find usages of a component in other files", async () => {
      // Create Button component
      const buttonFile = path.join(testDir, "Button.tsx");
      fs.writeFileSync(
        buttonFile,
        `
export const Button = ({ label }: { label: string }) => {
  return <button>{label}</button>;
};
`,
      );

      // Create App component that uses Button
      const appFile = path.join(testDir, "App.tsx");
      fs.writeFileSync(
        appFile,
        `
import { Button } from './Button';

export const App = () => {
  return <Button label="Click me" />;
};
`,
      );

      const project = new Project();
      project.addSourceFilesAtPaths(`${testDir}/**/*.tsx`);

      const usages = await trackUsages(project, "Button", buttonFile, []);

      expect(usages.length).toBeGreaterThan(0);
      const appUsage = usages.find((u) => u.filePath.includes("App.tsx"));
      expect(appUsage).toBeDefined();
      expect(appUsage?.line).toBeGreaterThan(0);
    });

    it("should track multiple usages in the same file", async () => {
      const buttonFile = path.join(testDir, "Button.tsx");
      fs.writeFileSync(
        buttonFile,
        `
export const Button = ({ label }: { label: string }) => {
  return <button>{label}</button>;
};
`,
      );

      const appFile = path.join(testDir, "App.tsx");
      fs.writeFileSync(
        appFile,
        `
import { Button } from './Button';

export const App = () => {
  return (
    <div>
      <Button label="First" />
      <Button label="Second" />
      <Button label="Third" />
    </div>
  );
};
`,
      );

      const project = new Project();
      project.addSourceFilesAtPaths(`${testDir}/**/*.tsx`);

      const usages = await trackUsages(project, "Button", buttonFile, []);

      // Should find at least the import and the usages
      expect(usages.length).toBeGreaterThan(0);
    });

    it("should exclude barrel files from usage tracking", async () => {
      const buttonFile = path.join(testDir, "Button.tsx");
      fs.writeFileSync(
        buttonFile,
        `
export const Button = ({ label }: { label: string }) => {
  return <button>{label}</button>;
};
`,
      );

      // Create barrel file
      const indexFile = path.join(testDir, "index.ts");
      fs.writeFileSync(
        indexFile,
        `
export { Button } from './Button';
`,
      );

      // Create actual usage
      const appFile = path.join(testDir, "App.tsx");
      fs.writeFileSync(
        appFile,
        `
import { Button } from './Button';

export const App = () => {
  return <Button label="Click" />;
};
`,
      );

      const project = new Project();
      project.addSourceFilesAtPaths(`${testDir}/**/*.{ts,tsx}`);

      const barrelPatterns = ["**/index.ts"];
      const usages = await trackUsages(project, "Button", buttonFile, barrelPatterns);

      // Should find usage in App but not in index (barrel file)
      const hasBarrelUsage = usages.some((u) => u.filePath.includes("index.ts"));
      const hasAppUsage = usages.some((u) => u.filePath.includes("App.tsx"));

      expect(hasBarrelUsage).toBe(false);
      expect(hasAppUsage).toBe(true);
    });

    it("should not track self-references", async () => {
      const buttonFile = path.join(testDir, "Button.tsx");
      fs.writeFileSync(
        buttonFile,
        `
export const Button = ({ label }: { label: string }) => {
  return <button>{label}</button>;
};

// This is in the same file - should not be counted
const example = <Button label="test" />;
`,
      );

      const project = new Project();
      project.addSourceFilesAtPaths(`${testDir}/**/*.tsx`);

      const usages = await trackUsages(project, "Button", buttonFile, []);

      // Should not include self-references from the same file
      const hasSelfReference = usages.some((u) => u.filePath.includes("Button.tsx"));
      expect(hasSelfReference).toBe(false);
    });

    it("should handle default imports", async () => {
      const buttonFile = path.join(testDir, "Button.tsx");
      fs.writeFileSync(
        buttonFile,
        `
const Button = ({ label }: { label: string }) => {
  return <button>{label}</button>;
};

export default Button;
`,
      );

      const appFile = path.join(testDir, "App.tsx");
      fs.writeFileSync(
        appFile,
        `
import Button from './Button';

export const App = () => {
  return <Button label="Click" />;
};
`,
      );

      const project = new Project();
      project.addSourceFilesAtPaths(`${testDir}/**/*.tsx`);

      const usages = await trackUsages(project, "Button", buttonFile, []);

      expect(usages.length).toBeGreaterThan(0);
    });

    it("should return empty array when no usages exist", async () => {
      const unusedFile = path.join(testDir, "Unused.tsx");
      fs.writeFileSync(
        unusedFile,
        `
export const Unused = () => {
  return <div>Never used</div>;
};
`,
      );

      const project = new Project();
      project.addSourceFilesAtPaths(`${testDir}/**/*.tsx`);

      const usages = await trackUsages(project, "Unused", unusedFile, []);

      expect(usages).toEqual([]);
    });
  });

  describe("batchTrackUsages", () => {
    it("should track usages for multiple components in parallel", async () => {
      // Create multiple components
      const buttonFile = path.join(testDir, "Button.tsx");
      fs.writeFileSync(
        buttonFile,
        `
export const Button = () => <button>Click</button>;
`,
      );

      const cardFile = path.join(testDir, "Card.tsx");
      fs.writeFileSync(
        cardFile,
        `
export const Card = () => <div>Card</div>;
`,
      );

      // Create file that uses both
      const appFile = path.join(testDir, "App.tsx");
      fs.writeFileSync(
        appFile,
        `
import { Button } from './Button';
import { Card } from './Card';

export const App = () => {
  return (
    <div>
      <Button />
      <Card />
    </div>
  );
};
`,
      );

      const project = new Project();
      project.addSourceFilesAtPaths(`${testDir}/**/*.tsx`);

      const symbols = [
        { name: "Button", filePath: buttonFile },
        { name: "Card", filePath: cardFile },
      ];

      const results = await batchTrackUsages(project, symbols, []);

      expect(results.size).toBe(2);
      // Keys are in format "filePath:name"
      const buttonKey = `${buttonFile}:Button`;
      const cardKey = `${cardFile}:Card`;

      expect(results.get(buttonKey)).toBeDefined();
      expect(results.get(cardKey)).toBeDefined();

      const buttonUsages = results.get(buttonKey) || [];
      const cardUsages = results.get(cardKey) || [];

      expect(buttonUsages.length).toBeGreaterThan(0);
      expect(cardUsages.length).toBeGreaterThan(0);
    });

    it("should handle empty symbol list", async () => {
      const project = new Project();
      const results = await batchTrackUsages(project, [], []);

      expect(results.size).toBe(0);
    });

    it("should apply barrel file patterns to all components", async () => {
      const buttonFile = path.join(testDir, "Button.tsx");
      fs.writeFileSync(buttonFile, `export const Button = () => <button />;`);

      const cardFile = path.join(testDir, "Card.tsx");
      fs.writeFileSync(cardFile, `export const Card = () => <div />;`);

      const indexFile = path.join(testDir, "index.ts");
      fs.writeFileSync(
        indexFile,
        `
export { Button } from './Button';
export { Card } from './Card';
`,
      );

      const appFile = path.join(testDir, "App.tsx");
      fs.writeFileSync(
        appFile,
        `
import { Button } from './index';
import { Card } from './index';

export const App = () => <div><Button /><Card /></div>;
`,
      );

      const project = new Project();
      project.addSourceFilesAtPaths(`${testDir}/**/*.{ts,tsx}`);

      const symbols = [
        { name: "Button", filePath: buttonFile },
        { name: "Card", filePath: cardFile },
      ];

      const barrelPatterns = ["**/index.ts"];
      const results = await batchTrackUsages(project, symbols, barrelPatterns);

      // Both should have usages but not from barrel files
      for (const usages of results.values()) {
        const hasBarrelUsage = usages.some((u) => u.filePath.includes("index.ts"));
        expect(hasBarrelUsage).toBe(false);
      }
    });
  });

  describe("Import Resolution", () => {
    it("should resolve relative imports", async () => {
      const utilsFile = path.join(testDir, "utils", "helpers.ts");
      fs.mkdirSync(path.dirname(utilsFile), { recursive: true });
      fs.writeFileSync(
        utilsFile,
        `
export const formatDate = (date: Date) => date.toISOString();
`,
      );

      const appFile = path.join(testDir, "App.tsx");
      fs.writeFileSync(
        appFile,
        `
import { formatDate } from './utils/helpers';

export const App = () => {
  const now = formatDate(new Date());
  return <div>{now}</div>;
};
`,
      );

      const project = new Project();
      project.addSourceFilesAtPaths(`${testDir}/**/*.{ts,tsx}`);

      const usages = await trackUsages(project, "formatDate", utilsFile, []);

      expect(usages.length).toBeGreaterThan(0);
      expect(usages[0].filePath).toContain("App.tsx");
    });

    it("should handle imports with file extensions", async () => {
      const buttonFile = path.join(testDir, "Button.tsx");
      fs.writeFileSync(
        buttonFile,
        `
export const Button = () => <button>Click</button>;
`,
      );

      const appFile = path.join(testDir, "App.tsx");
      fs.writeFileSync(
        appFile,
        `
import { Button } from './Button.tsx';

export const App = () => <Button />;
`,
      );

      const project = new Project();
      project.addSourceFilesAtPaths(`${testDir}/**/*.tsx`);

      const usages = await trackUsages(project, "Button", buttonFile, []);

      expect(usages.length).toBeGreaterThan(0);
    });
  });
});
