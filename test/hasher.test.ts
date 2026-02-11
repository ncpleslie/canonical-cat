import { describe, it, expect } from "vitest";
import {
  hashComponentImplementation,
  hashComponentInterface,
  calculateCodeSimilarity,
  loadCache,
  saveCache,
  needsRegeneration,
  updateCache,
} from "../src/lib/hasher";
import { Project } from "ts-morph";
import path from "node:path";
import fs from "node:fs";

describe("hasher", () => {
  describe("hashComponentImplementation", () => {
    it("should generate consistent hash for same code", () => {
      const project = new Project();
      const sourceFile = project.createSourceFile("test.ts", `function test() { return 42; }`);
      const func = sourceFile.getFunctions()[0];

      const hash1 = hashComponentImplementation(func);
      const hash2 = hashComponentImplementation(func);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });

    it("should generate different hash for different code", () => {
      const project = new Project();
      const sourceFile1 = project.createSourceFile("test1.ts", `function test() { return 42; }`);
      const sourceFile2 = project.createSourceFile("test2.ts", `function test() { return 43; }`);

      const hash1 = hashComponentImplementation(sourceFile1.getFunctions()[0]);
      const hash2 = hashComponentImplementation(sourceFile2.getFunctions()[0]);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("hashComponentInterface", () => {
    it("should generate hash from signature", () => {
      const signature = "function test(x: number): string";
      const hash = hashComponentInterface(undefined, signature);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });

    it("should generate different hash for different signatures", () => {
      const hash1 = hashComponentInterface(undefined, "function test(x: number): string");
      const hash2 = hashComponentInterface(undefined, "function test(x: string): number");

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("calculateCodeSimilarity", () => {
    it("should return 1.0 for identical code", () => {
      const code = "const x = 42;";
      const similarity = calculateCodeSimilarity(code, code);

      expect(similarity).toBe(1.0);
    });

    it("should return value between 0 and 1 for similar code", () => {
      const code1 = "const x = 42;";
      const code2 = "const x = 43;";
      const similarity = calculateCodeSimilarity(code1, code2);

      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it("should return lower value for very different code", () => {
      const code1 = "const x = 42;";
      const code2 = 'function foo() { return "hello world"; }';
      const similarity = calculateCodeSimilarity(code1, code2);

      expect(similarity).toBeLessThan(0.5);
    });
  });

  describe("cache management", () => {
    const testCacheDir = path.join(process.cwd(), "test-cache");

    it("should create empty cache if file does not exist", () => {
      const cache = loadCache(testCacheDir);

      expect(cache.version).toBeDefined();
      expect(cache.components).toEqual({});
    });

    it("should save and load cache", () => {
      // Ensure directory exists
      if (!fs.existsSync(testCacheDir)) {
        fs.mkdirSync(testCacheDir, { recursive: true });
      }

      const cache = loadCache(testCacheDir);
      updateCache(cache, "test:Component", "hash1", "hash2");

      saveCache(cache, testCacheDir);

      const loadedCache = loadCache(testCacheDir);
      expect(loadedCache.components["test:Component"]).toBeDefined();
      expect(loadedCache.components["test:Component"].implementationHash).toBe("hash1");

      // Cleanup
      const cachePath = path.join(testCacheDir, ".catalog-cache.json");
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
      }
      if (fs.existsSync(testCacheDir)) {
        fs.rmdirSync(testCacheDir);
      }
    });
  });

  describe("needsRegeneration", () => {
    it("should return true for new component", () => {
      const cache = loadCache("/tmp/test");
      const result = needsRegeneration("new:Component", "hash1", "hash2", cache, 0.85);

      expect(result).toBe(true);
    });

    it("should return false for unchanged component", () => {
      const cache = loadCache("/tmp/test");
      updateCache(cache, "test:Component", "hash1", "hash2");

      const result = needsRegeneration("test:Component", "hash1", "hash2", cache, 0.85);

      expect(result).toBe(false);
    });

    it("should return true when implementation changes", () => {
      const cache = loadCache("/tmp/test");
      updateCache(cache, "test:Component", "hash1", "hash2");

      const result = needsRegeneration("test:Component", "hash1-changed", "hash2", cache, 0.85);

      expect(result).toBe(true);
    });

    it("should return true when interface changes", () => {
      const cache = loadCache("/tmp/test");
      updateCache(cache, "test:Component", "hash1", "hash2");

      const result = needsRegeneration("test:Component", "hash1", "hash2-changed", cache, 0.85);

      expect(result).toBe(true);
    });
  });
});
