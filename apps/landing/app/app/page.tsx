'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import components to avoid SSR issues with Monaco/Three.js
const Editor = dynamic(() => import('../../components/demo/SimpleEditor'), { ssr: false });
const Viewport = dynamic(() => import('../../components/demo/ThreeViewport'), { ssr: false });
const ErrorDisplay = dynamic(() => import('../../components/demo/SimpleErrorDisplay'), { ssr: false });

interface GeometryResult {
  vertices: number[];
  indices: number[];
  normals: number[];
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
  stats: {
    vertexCount: number;
    faceCount: number;
    volume?: number;
  };
}

const DEFAULT_CODE = `// Welcome to moicad Web Editor
// Write OpenSCAD or JavaScript code to create 3D models

// JavaScript SDK Example:
import { Shape } from '@moicad/sdk';

export default Shape.cube(20)
  .subtract(Shape.sphere(13))
  .translate([0, 0, 10]);

// OpenSCAD Example (switch language above):
// difference() {
//   cube(20);
//   translate([10, 10, 10]) sphere(13);
// }
`;

export default function AppPage() {
  // State
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState<'javascript' | 'openscad'>('javascript');
  const [geometry, setGeometry] = useState<GeometryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRun, setAutoRun] = useState(false);

  // Animation state
  const [isAnimation, setIsAnimation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationT, setAnimationT] = useState(0);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Saved files
  const [fileName, setFileName] = useState('untitled');
  const [savedFiles, setSavedFiles] = useState<string[]>([]);

  // Evaluate code
  const evaluate = useCallback(async (t?: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          t: isAnimation ? (t ?? animationT) : undefined,
        }),
      });

      const result = await response.json();

      if (result.success && result.geometry) {
        setGeometry(result.geometry);
        setError(null);
      } else {
        const errorMsg = result.errors?.map((e: any) => e.message).join('\n') || 'Evaluation failed';
        setError(errorMsg);
        setGeometry(null);
      }
    } catch (err) {
      setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setGeometry(null);
    } finally {
      setIsLoading(false);
    }
  }, [code, language, isAnimation, animationT]);

  // Detect animation code
  useEffect(() => {
    const isAnim =
      (language === 'javascript' && /export\s+default\s+(?:async\s+)?function\s*\(\s*t\s*\)/.test(code)) ||
      (language === 'openscad' && code.includes('$t'));
    setIsAnimation(isAnim);

    // Stop animation if code changes to non-animation
    if (!isAnim && isPlaying) {
      setIsPlaying(false);
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    }
  }, [code, language]);

  // Animation playback
  useEffect(() => {
    if (isPlaying && isAnimation) {
      animationRef.current = setInterval(() => {
        setAnimationT(prev => {
          const next = prev + 0.02;
          return next >= 1 ? 0 : next;
        });
      }, 33);
    } else if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isPlaying, isAnimation]);

  // Re-evaluate when animation t changes
  useEffect(() => {
    if (isAnimation && isPlaying) {
      evaluate(animationT);
    }
  }, [animationT]);

  // Auto-run on code change
  useEffect(() => {
    if (autoRun && !isPlaying) {
      const timeout = setTimeout(() => evaluate(), 500);
      return () => clearTimeout(timeout);
    }
  }, [code, language, autoRun]);

  // Export geometry
  const exportGeometry = async (format: 'stl' | 'obj') => {
    if (!geometry) return;

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geometry, format }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Export error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  };

  // Save to localStorage
  const saveFile = () => {
    const files = JSON.parse(localStorage.getItem('moicad-files') || '{}');
    files[fileName] = { code, language, savedAt: Date.now() };
    localStorage.setItem('moicad-files', JSON.stringify(files));
    setSavedFiles(Object.keys(files));
  };

  // Load saved files list
  useEffect(() => {
    const files = JSON.parse(localStorage.getItem('moicad-files') || '{}');
    setSavedFiles(Object.keys(files));
  }, []);

  // Load file
  const loadFile = (name: string) => {
    const files = JSON.parse(localStorage.getItem('moicad-files') || '{}');
    if (files[name]) {
      setFileName(name);
      setCode(files[name].code);
      setLanguage(files[name].language || 'javascript');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white">
      {/* Top Bar */}
      <div className="h-12 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-4">
        <h1 className="font-bold text-lg">moicad</h1>

        {/* File Name */}
        <input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className="bg-slate-700 px-2 py-1 rounded text-sm w-32"
        />

        {/* Language Selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'javascript' | 'openscad')}
          className="bg-slate-700 px-2 py-1 rounded text-sm"
        >
          <option value="javascript">JavaScript</option>
          <option value="openscad">OpenSCAD</option>
        </select>

        {/* Auto-run toggle */}
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={autoRun}
            onChange={(e) => setAutoRun(e.target.checked)}
            className="w-4 h-4"
          />
          Auto-run
        </label>

        <div className="flex-1" />

        {/* Actions */}
        <button
          onClick={saveFile}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
        >
          Save
        </button>

        {isAnimation && (
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1 rounded text-sm ${
              isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isPlaying ? 'Stop' : 'Play'}
          </button>
        )}

        <button
          onClick={() => evaluate()}
          disabled={isLoading || isPlaying}
          className="px-4 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded text-sm font-semibold"
        >
          {isLoading ? 'Running...' : 'Run'}
        </button>

        {/* Export Menu */}
        {geometry && (
          <div className="relative group">
            <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">
              Export
            </button>
            <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg hidden group-hover:block">
              <button
                onClick={() => exportGeometry('stl')}
                className="block w-full px-4 py-2 text-left hover:bg-slate-700 text-sm"
              >
                Export STL
              </button>
              <button
                onClick={() => exportGeometry('obj')}
                className="block w-full px-4 py-2 text-left hover:bg-slate-700 text-sm"
              >
                Export OBJ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Saved Files */}
        <div className="w-48 bg-slate-800 border-r border-slate-700 overflow-y-auto">
          <div className="p-2 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-slate-400">Saved Files</h2>
          </div>
          {savedFiles.length === 0 ? (
            <p className="p-2 text-sm text-slate-500">No saved files</p>
          ) : (
            savedFiles.map((name) => (
              <button
                key={name}
                onClick={() => loadFile(name)}
                className={`w-full text-left px-2 py-1 text-sm hover:bg-slate-700 ${
                  name === fileName ? 'bg-slate-700' : ''
                }`}
              >
                {name}
              </button>
            ))
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <Editor
              code={code}
              onChange={setCode}
              language={language}
              height="100%"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="border-t border-slate-700">
              <ErrorDisplay error={error} />
            </div>
          )}

          {/* Animation Controls */}
          {isAnimation && (
            <div className="p-2 bg-slate-800 border-t border-slate-700">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-400 w-16">t = {animationT.toFixed(2)}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={animationT}
                  onChange={(e) => {
                    const t = parseFloat(e.target.value);
                    setAnimationT(t);
                    if (!isPlaying) evaluate(t);
                  }}
                  disabled={isPlaying}
                  className="flex-1"
                />
              </div>
            </div>
          )}
        </div>

        {/* Viewport */}
        <div className="flex-1 flex flex-col border-l border-slate-700">
          <div className="flex-1">
            <Viewport
              geometry={geometry}
              width="100%"
              height="100%"
            />
          </div>

          {/* Stats */}
          {geometry && (
            <div className="p-2 bg-slate-800 border-t border-slate-700 text-sm">
              <div className="flex gap-4">
                <span>Vertices: {geometry.stats?.vertexCount || 0}</span>
                <span>Faces: {geometry.stats?.faceCount || 0}</span>
                {geometry.stats?.volume && (
                  <span>Volume: {geometry.stats.volume.toFixed(2)} mm³</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
