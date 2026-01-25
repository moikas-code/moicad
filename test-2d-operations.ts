// Comprehensive tests for 2D operations: offset(), resize(), and minkowski()
const API_BASE = 'http://localhost:3000/api/evaluate';

interface TestResult {
  success: boolean;
  geometry?: {
    stats?: {
      vertexCount?: number;
      faceCount?: number;
    };
  };
  errors?: Array<{ message?: string }>;
}

async function testOperation(code: string, description: string): Promise<{ success: boolean; result?: any; errors?: any[] }> {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`📝 Code: ${code}`);
  
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    
    const result = await response.json() as TestResult;
    
    if (result.success) {
      const stats = result.geometry?.stats;
      console.log(`✅ Success! Vertices: ${stats?.vertexCount || 0}, Faces: ${stats?.faceCount || 0}`);
      return { success: true, result };
    } else {
      console.log(`❌ Failed: ${result.errors?.[0]?.message || 'Unknown error'}`);
      return { success: false, errors: result.errors };
    }
  } catch (error: any) {
    console.log(`💥 Error: ${error.message}`);
    return { success: false, errors: [{ message: error.message }] };
  }
}

async function runAllTests() {
  console.log('🚀 Starting 2D Operations Test Suite\n');
  
  const tests = [
    // OFFSET TESTS
    {
      code: 'offset(2) circle(10);',
      description: 'offset() - positive delta (outset) with circle'
    },
    {
      code: 'offset(-1) square(10);',
      description: 'offset() - negative delta (inset) with square'
    },
    {
      code: 'offset(1.5) polygon([[0,0], [10,0], [5,8]]);',
      description: 'offset() - positive delta with polygon'
    },
    {
      code: 'offset(0.5) circle(2);',
      description: 'offset() - small positive delta'
    },
    {
      code: 'offset(-0.3) square(1);',
      description: 'offset() - small negative delta'
    },
    {
      code: 'offset(2, chamfer=true) square(10);',
      description: 'offset() - with chamfer corners'
    },
    
    // RESIZE TESTS
    {
      code: 'resize([20,15]) circle(10);',
      description: 'resize() - change circle dimensions'
    },
    {
      code: 'resize([15,25]) square(10);',
      description: 'resize() - change square dimensions'
    },
    {
      code: 'resize([5,10], auto=true) circle(8);',
      description: 'resize() - auto scale to fit'
    },
    {
      code: 'resize([30,20], auto=false) polygon([[0,0], [10,0], [5,8]]);',
      description: 'resize() - specific dimensions for polygon'
    },
    
    // MINKOWSKI TESTS (verify 2D compatibility)
    {
      code: 'minkowski() { circle(10); square(5); }',
      description: 'minkowski() - circle + square (2D)'
    },
    {
      code: 'minkowski() { square(8); circle(2); }',
      description: 'minkowski() - square + circle (2D)'
    },
    {
      code: 'minkowski() { polygon([[0,0],[10,0],[5,8]]); circle(1); }',
      description: 'minkowski() - polygon + circle'
    },
    
    // COMBINATION TESTS
    {
      code: 'offset(2) resize([20,20]) circle(5);',
      description: 'Combined: resize then offset'
    },
    {
      code: 'resize([15,15]) offset(1) square(8);',
      description: 'Combined: offset then resize'
    },
    {
      code: 'minkowski() { offset(1) circle(5); offset(1) square(3); }',
      description: 'Combined: minkowski with offset shapes'
    },
    {
      code: 'offset(1) minkowski() { circle(5); square(3); }',
      description: 'Combined: minkowski then offset'
    },
    
    // EDGE CASES
    {
      code: 'offset(0) circle(10);',
      description: 'offset() - zero delta (should be same)'
    },
    {
      code: 'resize([10,10]) circle(10);',
      description: 'resize() - same dimensions (should be same)'
    },
    {
      code: 'offset(-5) circle(2);',
      description: 'offset() - negative delta larger than shape'
    }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const result = await testOperation(test.code, test.description);
    if (result.success) {
      passed++;
    }
  }
  
  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! 2D operations are working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the implementation.');
  }
}

// Run tests if this file is executed directly
if (typeof module !== 'undefined' && require.main === module) {
  runAllTests().catch(console.error);
}

export { testOperation, runAllTests };