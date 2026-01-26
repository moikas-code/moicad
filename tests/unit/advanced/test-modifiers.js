#!/usr/bin/env node

// Test script for visualization modifiers in moicad

const testCases = [
  {
    name: "Root modifier (!)",
    code: "!cube(10);",
    expectedModifier: "!",
  },
  {
    name: "Debug modifier (#)",
    code: "#sphere(5);",
    expectedModifier: "#",
  },
  {
    name: "Transparent modifier (%)",
    code: "%cylinder(3, 10);",
    expectedModifier: "%",
  },
  {
    name: "Disable modifier (*)",
    code: "*cube(20);",
    expectedModifier: null,
    expectGeometry: false,
  },
  {
    name: "Multiple modifiers - root priority",
    code: "!cube(10); #sphere(5);",
    expectedModifier: "!",
  },
  {
    name: "Multiple modifiers - debug priority",
    code: "#sphere(5); %cylinder(3, 10);",
    expectedModifier: "#",
  },
  {
    name: "Modifier in union",
    code: "union(){!cube(10);#sphere(5);}",
    expectedModifier: "!",
  },
  {
    name: "Modifier in transform",
    code: "translate([5,0,0]){!cube(10);}",
    expectedModifier: "!",
  },
];

async function runTest(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`📝 Code: ${testCase.code}`);

  try {
    // Test parsing
    const parseResponse = await fetch("http://localhost:42069/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: testCase.code }),
    });
    const parseResult = await parseResponse.json();

    if (!parseResult.success) {
      console.log(
        `❌ Parse failed: ${parseResult.errors?.map((e) => e.message).join(", ")}`,
      );
      return false;
    }

    console.log(`✅ Parse successful`);

    // Test evaluation
    const evalResponse = await fetch("http://localhost:42069/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: testCase.code }),
    });
    const evalResult = await evalResponse.json();

    if (testCase.expectGeometry === false) {
      // For disable modifier, we expect no geometry
      if (!evalResult.success && evalResult.geometry === null) {
        console.log(`✅ Correctly disabled geometry`);
        return true;
      } else {
        console.log(
          `❌ Expected no geometry, but got: ${evalResult.success ? "geometry" : "evaluation failed"}`,
        );
        return false;
      }
    }

    if (!evalResult.success) {
      console.log(
        `❌ Evaluation failed: ${evalResult.errors?.map((e) => e.message).join(", ")}`,
      );
      return false;
    }

    const actualModifier = evalResult.geometry?.modifier?.type;

    if (actualModifier === testCase.expectedModifier) {
      console.log(`✅ Modifier correct: ${actualModifier || "none"}`);
      return true;
    } else {
      console.log(
        `❌ Modifier mismatch. Expected: ${testCase.expectedModifier || "none"}, Got: ${actualModifier || "none"}`,
      );
      return false;
    }
  } catch (error) {
    console.log(`❌ Test failed with error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("🔧 Testing Visualization Modifiers Implementation\n");
  console.log("This will test all modifier functionality in moicad\n");

  // Check if server is running
  try {
    const healthResponse = await fetch("http://localhost:42069/health");
    if (!healthResponse.ok) {
      console.log(
        "❌ Server not running. Please start the moicad server first:",
      );
      console.log("   bun --hot ./backend/index.ts");
      process.exit(1);
    }
    console.log("✅ Server is running\n");
  } catch (error) {
    console.log(
      "❌ Cannot connect to server. Please start the moicad server first:",
    );
    console.log("   bun --hot ./backend/index.ts");
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = await runTest(testCase);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(
    `📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`,
  );

  if (failed === 0) {
    console.log(
      `\n🎉 All tests passed! Visualization modifiers are working correctly.`,
    );
  } else {
    console.log(`\n⚠️ Some tests failed. Please check the implementation.`);
    process.exit(1);
  }
}

main().catch(console.error);
