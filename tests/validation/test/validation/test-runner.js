#!/usr/bin/env node

/**
 * moicad Comprehensive Validation Test Runner
 * Tests all OpenSCAD compatibility features
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const SERVER_URL = "http://localhost:42069";
const TEST_RESULTS = {
  passed: 0,
  failed: 0,
  partial: 0,
  notTested: 0,
  details: [],
};

// Test categories
const TEST_CATEGORIES = {
  1: "primitives",
  2: "transformations",
  3: "boolean_ops",
  4: "language_features",
  5: "advanced_features",
  6: "special_variables",
  quick: "quick-validation",
  validation: "quick-validation",
};

// HTTP request helper
function makeRequest(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: "localhost",
      port: 42069,
      path: endpoint,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => {
        responseData += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve({ error: "Invalid JSON response", raw: responseData });
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// Test execution helper
async function runTest(name, code, expectedType = "success") {
  console.log(`  🧪 Testing: ${name}`);

  try {
    // First test parsing
    const parseResult = await makeRequest("/api/parse", { code });

    if (!parseResult.success) {
      const result = {
        name,
        status: "❌ FAIL",
        error: `Parse failed: ${parseResult.errors?.map((e) => e.message).join(", ") || "Unknown error"}`,
        code,
      };
      TEST_RESULTS.failed++;
      TEST_RESULTS.details.push(result);
      console.log(`    ${result.status} - ${result.error}`);
      return result;
    }

    // Then test evaluation
    const evalResult = await makeRequest("/api/evaluate", { code });

    let status = "✅ PASS";
    let error = null;

    if (expectedType === "success" && !evalResult.success) {
      status = "❌ FAIL";
      error = `Evaluation failed: ${evalResult.errors?.map((e) => e.message).join(", ") || "Unknown error"}`;
      TEST_RESULTS.failed++;
    } else if (expectedType === "error" && evalResult.success) {
      status = "❌ FAIL";
      error = "Expected failure but succeeded";
      TEST_RESULTS.failed++;
    } else if (
      evalResult.success &&
      (!evalResult.geometry || evalResult.geometry.stats.vertexCount === 0)
    ) {
      status = "⚠️ PARTIAL";
      error = "Succeeded but produced no geometry";
      TEST_RESULTS.partial++;
    } else {
      TEST_RESULTS.passed++;
    }

    const result = {
      name,
      status,
      error,
      code,
      geometry: evalResult.geometry
        ? {
            vertices: evalResult.geometry.stats.vertexCount,
            faces: evalResult.geometry.stats.faceCount,
            bounds: evalResult.geometry.bounds,
          }
        : null,
      executionTime: evalResult.executionTime,
    };

    TEST_RESULTS.details.push(result);
    console.log(`    ${status}${error ? " - " + error : ""}`);
    if (result.geometry) {
      console.log(
        `    📊 Geometry: ${result.geometry.vertices} vertices, ${result.geometry.faces} faces`,
      );
    }

    return result;
  } catch (error) {
    const result = {
      name,
      status: "❌ FAIL",
      error: `Request failed: ${error.message}`,
      code,
    };
    TEST_RESULTS.failed++;
    TEST_RESULTS.details.push(result);
    console.log(`    ${result.status} - ${result.error}`);
    return result;
  }
}

// Load test cases
async function loadTestCases(category) {
  if (category === "quick-validation") {
    const content = await import(
      path.join(__dirname, "categories", "quick-validation.js")
    );
    return content.default;
  }

  const categoryDir = path.join(__dirname, "categories", category);
  if (!fs.existsSync(categoryDir)) {
    return [];
  }

  const files = fs.readdirSync(categoryDir).filter((f) => f.endsWith(".js"));
  const testCases = [];

  for (const file of files) {
    const content = await import(path.join(categoryDir, file));
    testCases.push(...content.default);
  }

  return testCases;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  let categoriesToRun = [];
  let verbose = false;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--all") {
      categoriesToRun = Object.values(TEST_CATEGORIES);
    } else if (args[i].startsWith("--category=")) {
      const cat = args[i].split("=")[1];
      if (Object.values(TEST_CATEGORIES).includes(cat)) {
        categoriesToRun.push(cat);
      } else if (TEST_CATEGORIES[cat]) {
        categoriesToRun.push(TEST_CATEGORIES[cat]);
      }
    } else if (args[i] === "--verbose") {
      verbose = true;
    }
  }

  if (categoriesToRun.length === 0) {
    console.log(
      "Usage: node test-runner.js [--all | --category=<number|name>] [--verbose]",
    );
    console.log(
      "Categories:",
      Object.entries(TEST_CATEGORIES)
        .map(([k, v]) => `${k}=${v}`)
        .join(", "),
    );
    process.exit(1);
  }

  console.log("🚀 Starting moicad Comprehensive Validation Tests\n");
  console.log(`📋 Categories to test: ${categoriesToRun.join(", ")}`);
  console.log("🌐 Server: http://localhost:42069\n");

  // Check if server is running
  try {
    await makeRequest("/health", {});
    console.log("✅ Server is responding\n");
  } catch (error) {
    console.error(
      "❌ Server is not responding. Please start with: bun --hot ./backend/index.ts",
    );
    process.exit(1);
  }

  // Run tests for each category
  for (const category of categoriesToRun) {
    console.log(`\n📂 Category: ${category.toUpperCase()}`);
    console.log("=".repeat(50));

    const testCases = await loadTestCases(category);
    if (testCases.length === 0) {
      console.log(`⚠️  No test cases found for category: ${category}`);
      continue;
    }

    for (const testCase of testCases) {
      await runTest(testCase.name, testCase.code, testCase.expectedType);
    }
  }

  // Generate final report
  console.log("\n" + "=".repeat(60));
  console.log("📊 FINAL VALIDATION REPORT");
  console.log("=".repeat(60));

  console.log(`✅ Passed: ${TEST_RESULTS.passed}`);
  console.log(`❌ Failed: ${TEST_RESULTS.failed}`);
  console.log(`⚠️  Partial: ${TEST_RESULTS.partial}`);
  console.log(`❓ Not Tested: ${TEST_RESULTS.notTested}`);

  const total =
    TEST_RESULTS.passed +
    TEST_RESULTS.failed +
    TEST_RESULTS.partial +
    TEST_RESULTS.notTested;
  const successRate =
    total > 0 ? ((TEST_RESULTS.passed / total) * 100).toFixed(1) : 0;

  console.log(`\n🎯 Overall Success Rate: ${successRate}%`);

  if (TEST_RESULTS.failed > 0) {
    console.log("\n❌ FAILED TESTS:");
    TEST_RESULTS.details
      .filter((t) => t.status.includes("FAIL"))
      .forEach((t) => console.log(`  • ${t.name}: ${t.error}`));
  }

  if (TEST_RESULTS.partial > 0) {
    console.log("\n⚠️  PARTIAL TESTS:");
    TEST_RESULTS.details
      .filter((t) => t.status.includes("PARTIAL"))
      .forEach((t) => console.log(`  • ${t.name}: ${t.error}`));
  }

  // Save detailed report
  const reportPath = path.join(__dirname, "validation-report.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        summary: {
          passed: TEST_RESULTS.passed,
          failed: TEST_RESULTS.failed,
          partial: TEST_RESULTS.partial,
          notTested: TEST_RESULTS.notTested,
          successRate: parseFloat(successRate),
        },
        details: TEST_RESULTS.details,
      },
      null,
      2,
    ),
  );

  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  // Exit with appropriate code
  if (TEST_RESULTS.failed > 0) {
    console.log("\n❌ Validation failed - some tests did not pass");
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed - moicad is ready for release!");
    process.exit(0);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { runTest, makeRequest };
