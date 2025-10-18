#!/usr/bin/env node

/**
 * Post-install script to build the native addon
 * Gracefully handles build failures
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

console.log("");
console.log("🔧 Building native C++ addon...");
console.log("");

try {
  // Check if binding.gyp exists
  const bindingPath = join(__dirname, "..", "binding.gyp");
  if (!existsSync(bindingPath)) {
    console.log("⚠️  No binding.gyp found - skipping native build");
    console.log("   JavaScript fallback will be used");
    process.exit(0);
  }

  // Check if node-gyp is available
  try {
    execSync("node-gyp --version", { stdio: "ignore" });
  } catch (err) {
    console.log("⚠️  node-gyp not found - installing...");
    execSync("npm install -g node-gyp", { stdio: "inherit" });
  }

  // Build the native addon
  execSync("node-gyp rebuild", {
    stdio: "inherit",
    cwd: join(__dirname, ".."),
  });

  console.log("");
  console.log("✅ Native C++ addon built successfully!");
  console.log("   High-performance mode enabled 🚀");
  console.log("");

  process.exit(0);
} catch (error) {
  console.error("");
  console.error("⚠️  Native addon build failed");
  console.error(
    "   JavaScript fallback will be used (full functionality maintained)"
  );
  console.error("");
  console.error("   To retry: npm run build:native");
  console.error("   See NATIVE_ADDON.md for troubleshooting");
  console.error("");

  // Don't fail the installation
  process.exit(0);
}
