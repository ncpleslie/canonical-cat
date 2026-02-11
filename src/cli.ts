#!/usr/bin/env node

import { Command } from "commander";
import { findTsConfig, loadConfig } from "./config";
import {
  CONFIG_FILE_NAME,
  EXAMPLE_CONFIG,
  PACKAGE_DISPLAY_NAME,
  PACKAGE_NAME,
} from "./constants";
import { CatalogGenerator } from "./generator";

const program = new Command();

program
  .name(PACKAGE_NAME)
  .description(
    `${PACKAGE_DISPLAY_NAME} - Automated catalog generator for React components and utilities`,
  )
  .version("0.1.0");

program
  .command("generate")
  .description(
    "Generate component and utility catalog (uses defaults if no config file)",
  )
  .option("-c, --config <path>", "Path to catalog.config.js")
  .option("-f, --force", "Force regeneration of all components (ignore cache)")
  .option("--filter <pattern>", "Filter components by name pattern")
  /**
   * Handle the 'generate' command to create component catalogs.
   * Loads configuration, finds TypeScript config, initializes the generator,
   * and runs the catalog generation process.
   *
   * @param options - Command line options
   * @param options.config - Optional path to catalog config file
   * @param options.force - Force regeneration ignoring cache
   * @param options.filter - Optional pattern to filter components
   *
   * @example
   * ```bash
   * # Generate catalog with default config
   * canonical-cat generate
   *
   * # Generate with custom config file
   * canonical-cat generate --config ./my-config.mts
   *
   * # Force regeneration of all components
   * canonical-cat generate --force
   *
   * # Filter specific components
   * canonical-cat generate --filter Button*
   * ```
   */
  .action(async (options) => {
    try {
      console.log("🚀 Starting catalog generation...\n");
      const config = await loadConfig(options.config);
      const tsConfigPath = findTsConfig();
      if (tsConfigPath) {
        console.log(`Using TypeScript config: ${tsConfigPath}\n`);
      } else {
        console.log(
          "⚠️  No tsconfig.json found, using default TypeScript settings\n",
        );
      }

      const generator = new CatalogGenerator(config, tsConfigPath);
      await generator.generate(options.force);

      console.log("\n🎉 Done!");
    } catch (error) {
      console.error(
        "❌ Error:",
        error instanceof Error ? error.message : "Unknown error",
      );
      process.exit(1);
    }
  });

program
  .command("init")
  .description("Create a catalog config file to customize settings (optional)")
  /**
   * Handle the 'init' command to create a sample catalog.config file.
   * Automatically detects project type (TypeScript/JavaScript) and creates
   * the appropriate config file format (.mts for TS, .mjs for JS).
   *
   * @example
   * ```bash
   * # Create config file in current directory
   * canonical-cat init
   *
   * # For TypeScript projects, creates: catalog.config.mts
   * # For JavaScript projects, creates: catalog.config.mjs
   * ```
   */
  .action(() => {
    const fs = require("node:fs");
    const path = require("node:path");

    // Detect if project is TypeScript or JavaScript
    const tsConfigPath = findTsConfig();
    const isTypeScript = !!tsConfigPath;
    const extension = isTypeScript ? ".mts" : ".mjs";
    const configPath = path.join(
      process.cwd(),
      `${CONFIG_FILE_NAME}${extension}`,
    );

    if (fs.existsSync(configPath)) {
      console.error(`❌ ${CONFIG_FILE_NAME}${extension} already exists`);
      process.exit(1);
    }

    fs.writeFileSync(configPath, EXAMPLE_CONFIG, "utf-8");
    console.log(`✅ Created ${CONFIG_FILE_NAME}${extension}`);
    console.log("Edit this file to customize your configuration.");
  });

program.parse();
