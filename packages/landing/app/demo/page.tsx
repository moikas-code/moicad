'use client';

import { useState, useEffect } from 'react';
import DemoEditor from '../../components/demo/SimpleEditor';
import DemoViewport from '../../components/demo/SimpleViewport';
import ErrorDisplay from '../../components/demo/SimpleErrorDisplay';

const EXAMPLES = {
  'Basic Shapes': [
    {
      name: 'Hello Cube',
      code: `// JavaScript style (recommended)
cube(10);

// OpenSCAD equivalent:
// cube(10);`,
      language: 'javascript'
    },
    {
      name: 'Colored Sphere',
      code: `// High-detail sphere
sphere(5, { $fn: 64 });

// In JavaScript, you could also use:
// Shape.sphere(5, { segments: 64 }).color('blue');`,
      language: 'javascript'
    },
  ],
  'Parametric': [
    {
      name: 'Parametric Bolt',
      code: `// Simple bolt design
translate([0, 0, 10]) {
  sphere(r=3, $fn=16);
}

cylinder(h=20, r=3);

// JavaScript equivalent would use classes:
// class Bolt { ... }
// new Bolt(20, 6).build();`,
      language: 'javascript'
    },
  ],
  'Advanced': [
    {
      name: 'Boolean Operations',
      code: `// Subtract sphere from cube
difference() {
  cube(20);
  translate([10, 10, 10]) {
    sphere(12);
  }
}

color("cyan") difference();

// JavaScript equivalent:
// Shape.cube(20).subtract(Shape.sphere(12).translate([10, 10, 10])).color('cyan')`,
      language: 'javascript'
    },
  ],
  'JavaScript SDK': [
    {
      name: 'Fluent API Chain',
      code: `// Modern JavaScript with SDK (recommended)
// Note: This shows the SDK API, but uses OpenSCAD syntax for compatibility

// Create a bolt head and shaft
difference() {
  // Bolt shaft
  cylinder(h=20, r=3);
  
  // Hexagonal head
  translate([0, 0, 20]) {
    for(i = [0:60:6]) {
      rotate([0, 0, i]) {
        translate([5, 0, 0]) {
          cube([4, 1, 4], center=true);
        }
      }
    }
  }
}`,
      language: 'javascript'
    },
    {
      name: '2D to 3D',
      code: `// Create 2D shape and extrude to 3D
linear_extrude(height=15, twist=90) {
  difference() {
    circle(r=5);
    translate([3, 0]) {
      circle(r=2);
    }
  }
}

// JavaScript equivalent:
// Shape.circle(5).subtract(Shape.circle(2).translate([3, 0]))
//   .linearExtrude(15, { twist: 90 })`,
      language: 'javascript'
    },
  ],
  'OpenSCAD Classic': [
    {
      name: 'Car Model',
      code: `module car(length=60, width=30, height=20) {
  // Car body
  cube([length, width, height]);
  
  // Wheels
  translate([length*0.2, -width/2, 0])
    cylinder(r=height*0.3, h=2, $fn=16);
  translate([length*0.2, width/2, 0])
    cylinder(r=height*0.3, h=2, $fn=16);
  translate([length*0.7, -width/2, 0])
    cylinder(r=height*0.3, h=2, $fn=16);
  translate([length*0.7, width/2, 0])
    cylinder(r=height*0.3, h=2, $fn=16);
}

car();`,
      language: 'openscad'
    },
  ]
};

export default function DemoPage() {
  const [code, setCode] = useState(EXAMPLES['JavaScript SDK']?.[0]?.code || '');
  const [language, setLanguage] = useState('javascript');
  const [geometry, setGeometry] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const evaluateCode = async () => {
    setIsEvaluating(true);
    setError(null);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, language }),
      });

      const result = await response.json() as any;

      if (result.success) {
        setGeometry(result.geometry);
        setError(null);
      } else {
        setError(result.error || 'Evaluation failed');
        setGeometry(null);
      }
    } catch (err) {
      setError('Network error: Failed to evaluate code');
      setGeometry(null);
    } finally {
      setIsEvaluating(false);
    }
  };

  const loadExample = (example: typeof EXAMPLES['JavaScript SDK'][0]) => {
    setCode(example.code);
    setLanguage(example.language);
  };

  useEffect(() => {
    // Load initial example
    evaluateCode();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">
            🚀 Interactive CAD Playground
          </h1>
          <p className="text-gray-300 text-lg">
            Try moicad in your browser. Write JavaScript or OpenSCAD code and see instant 3D results.
          </p>
        </div>

        {/* Language Selector */}
        <div className="mb-6 flex items-center gap-4">
          <label className="font-semibold">Language:</label>
          <select
            value={language}
            onChange={(e) => setLanguage((e.target as HTMLSelectElement).value)}
            className="bg-slate-800 border border-slate-700 rounded px-4 py-2 text-white"
          >
            <option value="javascript">JavaScript</option>
            <option value="openscad">OpenSCAD</option>
          </select>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Editor Side */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Code Editor</h2>
              <button
                onClick={evaluateCode}
                disabled={isEvaluating}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
              >
                {isEvaluating ? '⏳ Evaluating...' : '▶️ Run'}
              </button>
            </div>
            
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <div className="h-96 lg:h-[500px] border border-slate-700 rounded-lg overflow-hidden">
              <DemoEditor
                code={code}
                onChange={setCode}
                language={language}
                height="500px"
              />
              </div>
            </div>

            {error && (
              <div className="mt-4">
                <ErrorDisplay error={error} />
              </div>
            )}
          </div>

          {/* Viewport Side */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">3D Preview</h2>
            
            <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-800">
              <DemoViewport
                geometry={geometry}
                width="100%"
                height="500px"
              />
            </div>
            
            {geometry && (
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <h3 className="font-semibold mb-2">Geometry Info</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Vertices: {geometry.stats?.vertexCount || 'N/A'}</div>
                  <div>Faces: {geometry.stats?.faceCount || 'N/A'}</div>
                  <div>Volume: {geometry.stats?.volume?.toFixed(3) || 'N/A'}</div>
                  <div>Bounds: {JSON.stringify(geometry.bounds)}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Example Gallery */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Example Gallery</h2>
          
          {Object.entries(EXAMPLES).map(([category, examples]) => (
            <div key={category} className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-blue-400">{category}</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {examples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => loadExample(example)}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-4 text-left transition-colors"
                  >
                    <div className="font-semibold text-white mb-2">{example.name}</div>
                    <div className="text-sm text-gray-400">
                      {example.language === 'javascript' ? '📜 JavaScript' : '🔧 OpenSCAD'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        
      </div>
    </div>
  );
}