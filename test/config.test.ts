import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findTsConfig, loadConfig } from "../src/config";

describe("config", () => {
  const testFiles: string[] = [];

  afterEach(() => {
    for (const file of testFiles) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
    testFiles.length = 0;
  });

  describe("loadConfig", () => {
    it("should return default config when no config file exists", async () => {
      const config = await loadConfig("/nonexistent/catalog.config.js");

      expect(config).toBeDefined();
      expect(config.include).toEqual(["src/**/*.{ts,tsx,js,jsx}"]);
      expect(config.exclude).toContain("**/node_modules/**");
      expect(config.similarityThreshold).toBe(0.85);
      expect(config.outputPath).toBeDefined();
    });

    it("should load config from existing file", async () => {
      const testConfigPath = path.join(process.cwd(), "catalog.config.mts");
      testFiles.push(testConfigPath);
      fs.writeFileSync(
        testConfigPath,
        `export default {
          include: ['src/**/*.ts'],
          exclude: ['**/node_modules/**'],
          similarityThreshold: 0.85
        };`,
      );

      const config = await loadConfig();

      expect(config).toBeDefined();
      expect(config.include).toBeDefined();
      expect(config.exclude).toBeDefined();
      expect(config.similarityThreshold).toBe(0.85);
    });

    it("should merge user config with defaults", async () => {
      const testConfigPath = path.join(process.cwd(), "catalog.config.mts");
      testFiles.push(testConfigPath);
      fs.writeFileSync(
        testConfigPath,
        `export default {
          include: ['src/**/*.ts'],
          exclude: []
        };`,
      );

      const config = await loadConfig();

      // Should have defaults merged
      expect(config.exclude).toContain("**/node_modules/**");
      expect(config.barrelFilePatterns).toBeDefined();
    });

    it("should find .mts config file", async () => {
      const testConfigPath = path.join(
        process.cwd(),
        "catalog-test1.config.mts",
      );
      testFiles.push(testConfigPath);
      fs.writeFileSync(
        testConfigPath,
        `export default {
          include: ['src/**/*.ts'],
          exclude: ['**/*.test.ts']
        };`,
      );

      const config = await loadConfig(testConfigPath);

      expect(config.include).toContain("src/**/*.ts");
      expect(config.exclude).toContain("**/*.test.ts");
    });

    it("should find additional .mts config file", async () => {
      const testConfigPath = path.join(
        process.cwd(),
        "test-catalog.config.mts",
      );
      testFiles.push(testConfigPath);
      fs.writeFileSync(
        testConfigPath,
        `export default {
          include: ['lib/**/*.ts'],
          exclude: []
        };`,
      );

      const config = await loadConfig(testConfigPath);

      expect(config.include).toContain("lib/**/*.ts");
    });

    it("should load .mts config file", async () => {
      const mtsPath = path.join(process.cwd(), "test-priority.config.mts");
      testFiles.push(mtsPath);

      fs.writeFileSync(
        mtsPath,
        `export default { include: ['mts-source/**/*.ts'], exclude: [] };`,
      );

      const config = await loadConfig(mtsPath);

      expect(config.include).toContain("mts-source/**/*.ts");
    });

    it("should use defaults when no config file exists in current directory", async () => {
      // Save current directory config if it exists
      const defaultConfigPath = path.join(process.cwd(), "catalog.config.mts");
      const defaultMjsPath = path.join(process.cwd(), "catalog.config.mjs");
      let savedConfig: string | null = null;
      let savedPath: string | null = null;

      if (fs.existsSync(defaultConfigPath)) {
        savedConfig = fs.readFileSync(defaultConfigPath, "utf-8");
        savedPath = defaultConfigPath;
        fs.unlinkSync(defaultConfigPath);
      } else if (fs.existsSync(defaultMjsPath)) {
        savedConfig = fs.readFileSync(defaultMjsPath, "utf-8");
        savedPath = defaultMjsPath;
        fs.unlinkSync(defaultMjsPath);
      }

      try {
        const config = await loadConfig();

        expect(config).toBeDefined();
        expect(config.include).toEqual(["src/**/*.{ts,tsx,js,jsx}"]);
        expect(config.exclude).toContain("**/node_modules/**");
        expect(config.exclude).toContain("**/dist/**");
        expect(config.similarityThreshold).toBe(0.85);
        expect(config.barrelFilePatterns).toContain("**/index.ts");
      } finally {
        // Restore saved config
        if (savedConfig && savedPath) {
          fs.writeFileSync(savedPath, savedConfig);
        }
      }
    });
  });

  describe("Schema Validation", () => {
    it("should reject empty include array", async () => {
      const testConfigPath = path.join(process.cwd(), "invalid-config.mts");
      testFiles.push(testConfigPath);
      fs.writeFileSync(
        testConfigPath,
        `export default { include: [], exclude: [] };`,
      );

      await expect(() => loadConfig(testConfigPath)).rejects.toThrow(
        "Must specify at least one include pattern",
      );
    });

    it("should reject invalid similarityThreshold", async () => {
      const testConfigPath = path.join(process.cwd(), "invalid-threshold.mts");
      testFiles.push(testConfigPath);
      fs.writeFileSync(
        testConfigPath,
        `export default { include: ['src/**/*.ts'], similarityThreshold: 2.5 };`,
      );

      await expect(() => loadConfig(testConfigPath)).rejects.toThrow(
        "Similarity threshold must be at most 1",
      );
    });

    it("should accept valid configuration", async () => {
      const testConfigPath = path.join(process.cwd(), "valid-config.mts");
      testFiles.push(testConfigPath);
      fs.writeFileSync(
        testConfigPath,
        `export default {
          include: ['src/**/*.{ts,tsx}'],
          exclude: ['**/*.test.ts'],
          barrelFilePatterns: ['**/index.ts'],
          similarityThreshold: 0.9,
          outputPath: './output',
          output: {
            markdown: true,
            llmTxt: false,
            json: true
          },
        };`,
      );

      const config = await loadConfig(testConfigPath);

      expect(config.include).toContain("src/**/*.{ts,tsx}");
      expect(config.exclude).toContain("**/*.test.ts");
      expect(config.similarityThreshold).toBe(0.9);
      expect(config.outputPath).toBe("./output");
      expect(config.output?.markdown).toBe(true);
      expect(config.output?.llmTxt).toBe(false);
    });

    it("should merge storyFilePatterns with defaults", async () => {
      const testConfigPath = path.join(process.cwd(), "story-patterns.mts");
      testFiles.push(testConfigPath);
      fs.writeFileSync(
        testConfigPath,
        `export default {
          include: ['src/**/*.ts'],
        };`,
      );

      const config = await loadConfig(testConfigPath);

      expect(config.storyFilePatterns).toBeDefined();
      expect(config.storyFilePatterns).toContain(
        "**/*.stories.{ts,tsx,js,jsx}",
      );
      expect(config.storyFilePatterns).toContain("**/*.story.{ts,tsx,js,jsx}");
    });

    it("should accept custom storyFilePatterns", async () => {
      const testConfigPath = path.join(
        process.cwd(),
        "custom-story-patterns.mts",
      );
      testFiles.push(testConfigPath);
      fs.writeFileSync(
        testConfigPath,
        `export default {
          include: ['src/**/*.ts'],
          storyFilePatterns: ['**/*.stories.tsx', '**/*.sb.tsx'],
        };`,
      );

      const config = await loadConfig(testConfigPath);

      expect(config.storyFilePatterns).toContain("**/*.stories.tsx");
      expect(config.storyFilePatterns).toContain("**/*.sb.tsx");
      expect(config.storyFilePatterns).toHaveLength(2);
    });

    it("should accept new output config format with enabled and filename", async () => {
      const testConfigPath = path.join(process.cwd(), "new-format-config.mts");
      testFiles.push(testConfigPath);
      fs.writeFileSync(
        testConfigPath,
        `export default {
          include: ['src/**/*.ts'],
          output: {
            markdown: { enabled: true, filename: 'custom.md' },
            llmTxt: { enabled: false },
            json: { enabled: true, filename: 'data.json' }
          },
        };`,
      );

      const config = await loadConfig(testConfigPath);

      expect(config.output?.markdown).toEqual({
        enabled: true,
        filename: "custom.md",
      });
      expect(config.output?.llmTxt).toEqual({ enabled: false });
      expect(config.output?.json).toEqual({
        enabled: true,
        filename: "data.json",
      });
    });

    it("should accept mixed boolean and object output config", async () => {
      const testConfigPath = path.join(process.cwd(), "mixed-config.mts");
      testFiles.push(testConfigPath);
      fs.writeFileSync(
        testConfigPath,
        `export default {
          include: ['src/**/*.ts'],
          output: {
            markdown: true,
            llmTxt: { enabled: true, filename: 'ai.txt' },
            json: false
          },
        };`,
      );

      const config = await loadConfig(testConfigPath);

      expect(config.output?.markdown).toBe(true);
      expect(config.output?.llmTxt).toEqual({
        enabled: true,
        filename: "ai.txt",
      });
      expect(config.output?.json).toBe(false);
    });
  });

  describe("findTsConfig", () => {
    it("should find tsconfig.json in current directory", () => {
      const tsConfigPath = findTsConfig();

      expect(tsConfigPath).toBeDefined();
      if (tsConfigPath) {
        expect(tsConfigPath).toContain("tsconfig.json");
        expect(fs.existsSync(tsConfigPath)).toBe(true);
      }
    });

    it("should return undefined if no tsconfig found", () => {
      const tsConfigPath = findTsConfig("/tmp/nonexistent");

      expect(tsConfigPath).toBeUndefined();
    });
  });
});
