'use client';

import { useState, useEffect } from 'react';
import DemoEditor from '../../components/demo/SimpleEditor';
import DemoViewport from '../../components/demo/ThreeViewport';
import ErrorDisplay from '../../components/demo/SimpleErrorDisplay';

const EXAMPLES = {
  'Basic Shapes': [
    {
      name: 'Hello Cube',
      code: `// Simple 10mm cube using Shape API
import { Shape } from '@moicad/sdk';

export default Shape.cube(10);`,
      language: 'javascript',
      isAnimation: false,
    },
    {
      name: 'Sphere with Options',
      code: `// High-detail sphere
import { Shape } from '@moicad/sdk';

export default Shape.sphere(5, { $fn: 64 });`,
      language: 'javascript',
      isAnimation: false,
    },
  ],
  'Transformations': [
    {
      name: 'Translate & Scale',
      code: `// Move and resize shapes
import { Shape } from '@moicad/sdk';

const cube = Shape.cube(10)
  .translate([0, 0, 5])
  .scale([1.5, 1, 2]);

export default cube;`,
      language: 'javascript',
      isAnimation: false,
    },
  ],
  'Boolean Operations': [
    {
      name: 'Difference',
      code: `// Subtract sphere from cube
import { Shape } from '@moicad/sdk';

const cube = Shape.cube(20);
const sphere = Shape.sphere(12).translate([10, 10, 10]);

export default cube.subtract(sphere);`,
      language: 'javascript',
      isAnimation: false,
    },
    {
      name: 'Union',
      code: `// Combine multiple shapes
import { Shape } from '@moicad/sdk';

const base = Shape.cube([30, 30, 5]);
const post = Shape.cylinder(20, 3).translate([15, 15, 5]);

export default base.union(post);`,
      language: 'javascript',
      isAnimation: false,
    },
  ],
  'Fluent API': [
    {
      name: 'Method Chaining',
      code: `// Fluent API with method chaining
import { Shape } from '@moicad/sdk';

export default Shape.cube([20, 10, 5])
  .translate([0, 0, 5])
  .union(Shape.sphere(8))
  .scale([1.2, 1, 1]);`,
      language: 'javascript',
      isAnimation: false,
    },
    {
      name: 'Hollow Cylinder',
      code: `// Create a hollow cylinder (pipe)
import { Shape } from '@moicad/sdk';

const outer = Shape.cylinder(20, 8);
const inner = Shape.cylinder(20, 6);

export default outer.subtract(inner);`,
      language: 'javascript',
      isAnimation: false,
    },
  ],
  'Animations': [
    {
      name: 'Spinning Cube',
      code: `// Animated spinning cube
// The function receives t (0 to 1) for animation progress
import { Shape } from '@moicad/sdk';

export default function(t) {
  return Shape.cube(10)
    .rotate([0, 0, t * 360]);
}`,
      language: 'javascript',
      isAnimation: true,
    },
    {
      name: 'Growing Sphere',
      code: `// Sphere that grows and shrinks
import { Shape } from '@moicad/sdk';

export default function(t) {
  // Use sine wave for smooth grow/shrink
  const scale = 5 + Math.sin(t * Math.PI * 2) * 3;
  return Shape.sphere(scale, { $fn: 32 });
}`,
      language: 'javascript',
      isAnimation: true,
    },
    {
      name: 'Orbiting Spheres',
      code: `// Two spheres orbiting each other
import { Shape } from '@moicad/sdk';

export default function(t) {
  const angle = t * 360;
  const radius = 15;

  const sphere1 = Shape.sphere(5, { $fn: 24 })
    .translate([
      Math.cos(angle * Math.PI / 180) * radius,
      Math.sin(angle * Math.PI / 180) * radius,
      0
    ]);

  const sphere2 = Shape.sphere(5, { $fn: 24 })
    .translate([
      Math.cos((angle + 180) * Math.PI / 180) * radius,
      Math.sin((angle + 180) * Math.PI / 180) * radius,
      0
    ]);

  return sphere1.union(sphere2);
}`,
      language: 'javascript',
      isAnimation: true,
    },
    {
      name: 'OpenSCAD Animation',
      code: `// Animated using $t variable (0 to 1)
// Cube that rotates and moves up/down

translate([0, 0, sin($t * 360) * 10])
  rotate([0, 0, $t * 360])
    cube(10, center=true);`,
      language: 'openscad',
      isAnimation: true,
    },
  ],
  'Interactive (Coming Soon)': [
    {
      name: 'Box with Lid',
      code: `// Interactive box with opening lid
// Click and drag the lid to open/close
import { Shape, interactive, fixedPart, hingePart } from '@moicad/sdk';

export default interactive({
  parts: [
    fixedPart('base', Shape.cube([30, 30, 18])),
    hingePart('lid', Shape.cube([30, 30, 2]).translate([0, 0, 18]), {
      axis: [1, 0, 0],
      pivot: [0, 30, 18],
      range: [0, 110],
    }),
  ],
  metadata: {
    name: 'Box with Lid',
    description: 'Click and drag the lid to open',
  },
});

// Note: Interactive mode renders individual parts
// For now, showing assembled preview:
// export default Shape.cube([30, 30, 20]);`,
      language: 'javascript',
      isAnimation: false,
      isInteractive: true,
    },
    {
      name: 'Sliding Drawer',
      code: `// Interactive drawer that slides in/out
import { Shape, interactive, fixedPart, sliderPart } from '@moicad/sdk';

export default interactive({
  parts: [
    fixedPart('cabinet',
      Shape.cube([40, 30, 50])
        .subtract(Shape.cube([36, 26, 10]).translate([2, 2, 38]))
    ),
    sliderPart('drawer', Shape.cube([35, 25, 8]).translate([2.5, 2.5, 40]), {
      axis: [0, 1, 0],
      range: [0, 20],
      springBack: true,
      springStrength: 0.3,
    }),
  ],
});

// Note: Interactive mode coming soon
// Preview shows assembled model`,
      language: 'javascript',
      isAnimation: false,
      isInteractive: true,
    },
  ],
  'OpenSCAD Syntax': [
    {
      name: 'Tower with Roof',
      code: `// Tower structure
union() {
  // Base
  cube([20, 20, 30]);

  // Roof (cone)
  translate([10, 10, 30])
    cylinder(h=15, r1=14, r2=0, $fn=4);
}`,
      language: 'openscad',
      isAnimation: false,
    },
  ],
};

type ExampleType = {
  name: string;
  code: string;
  language: string;
  isAnimation?: boolean;
  isInteractive?: boolean;
};

export default function DemoPage() {
  const [code, setCode] = useState(EXAMPLES['Basic Shapes']?.[0]?.code || '');
  const [language, setLanguage] = useState('javascript');
  const [geometry, setGeometry] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Animation state
  const [isAnimation, setIsAnimation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationT, setAnimationT] = useState(0);
  const [animationInterval, setAnimationInterval] = useState<NodeJS.Timeout | null>(null);

  const evaluateCode = async (t?: number) => {
    setIsEvaluating(true);
    setError(null);

    const tValue = t !== undefined ? t : animationT;

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, language, t: isAnimation ? tValue : undefined }),
      });

      const result = await response.json() as any;

      if (result.success) {
        setGeometry(result.geometry);
        setError(null);
      } else {
        const errorMsg = result.error || result.errors?.map((e: any) => e.message).join(', ') || 'Evaluation failed';
        console.error('Evaluation failed:', errorMsg, result);
        setError(errorMsg);
        setGeometry(null);
      }
    } catch (err) {
      console.error('Network error:', err);
      setError('Network error: Failed to evaluate code');
      setGeometry(null);
    } finally {
      setIsEvaluating(false);
    }
  };

  const loadExample = (example: ExampleType) => {
    // Stop any playing animation
    if (animationInterval) {
      clearInterval(animationInterval);
      setAnimationInterval(null);
    }
    setIsPlaying(false);
    setAnimationT(0);

    setCode(example.code);
    setLanguage(example.language);
    setIsAnimation(example.isAnimation || false);
  };

  // Animation playback controls
  const toggleAnimation = () => {
    if (isPlaying) {
      // Stop
      if (animationInterval) {
        clearInterval(animationInterval);
        setAnimationInterval(null);
      }
      setIsPlaying(false);
    } else {
      // Start
      setIsPlaying(true);
      const interval = setInterval(() => {
        setAnimationT(prev => {
          const newT = prev + 0.02; // ~50 steps per cycle
          if (newT >= 1) {
            return 0; // Loop
          }
          return newT;
        });
      }, 33); // ~30fps
      setAnimationInterval(interval);
    }
  };

  // Evaluate when animation t changes
  useEffect(() => {
    if (isAnimation && isPlaying) {
      evaluateCode(animationT);
    }
  }, [animationT]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (animationInterval) {
        clearInterval(animationInterval);
      }
    };
  }, [animationInterval]);

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
            <option value="javascript">JavaScript (SDK)</option>
            <option value="openscad">OpenSCAD</option>
          </select>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Editor Side */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Code Editor</h2>
              <div className="flex gap-2">
                {isAnimation && (
                  <button
                    onClick={toggleAnimation}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      isPlaying
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {isPlaying ? '⏹️ Stop' : '▶️ Play'}
                  </button>
                )}
                <button
                  onClick={() => evaluateCode()}
                  disabled={isEvaluating || isPlaying}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
                >
                  {isEvaluating ? '⏳ Evaluating...' : isAnimation ? '🔄 Preview' : '▶️ Run'}
                </button>
              </div>
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

            {/* Animation Controls */}
            {isAnimation && (
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <h3 className="font-semibold mb-2">Animation Timeline</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400 w-12">t = {animationT.toFixed(2)}</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={animationT}
                      onChange={(e) => {
                        const newT = parseFloat(e.target.value);
                        setAnimationT(newT);
                        if (!isPlaying) {
                          evaluateCode(newT);
                        }
                      }}
                      className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      disabled={isPlaying}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {isPlaying ? 'Animation playing...' : 'Drag slider to scrub through animation, or click Play'}
                  </p>
                </div>
              </div>
            )}

            {geometry && (
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <h3 className="font-semibold mb-2">Geometry Info</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Vertices: {geometry.stats?.vertexCount || 'N/A'}</div>
                  <div>Faces: {geometry.stats?.faceCount || 'N/A'}</div>
                  <div>Volume: {geometry.stats?.volume?.toFixed(3) || 'N/A'}</div>
                  <div className="col-span-2">
                    Bounds: [{geometry.bounds?.min?.join(', ')}] to [{geometry.bounds?.max?.join(', ')}]
                  </div>
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
                    onClick={() => loadExample(example as ExampleType)}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-4 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-white">{example.name}</span>
                      {example.isAnimation && (
                        <span className="px-2 py-0.5 bg-green-600/30 text-green-400 text-xs rounded-full">
                          Animation
                        </span>
                      )}
                      {example.isInteractive && (
                        <span className="px-2 py-0.5 bg-purple-600/30 text-purple-400 text-xs rounded-full">
                          Interactive
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      {example.language === 'javascript' ? '📜 JavaScript SDK' : '🔧 OpenSCAD'}
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
