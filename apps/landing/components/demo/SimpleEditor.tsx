'use client';

import { useState } from 'react';

interface DemoEditorProps {
  code: string;
  onChange: (code: string) => void;
  language: string;
  height: string;
}

export default function DemoEditor({ code, onChange, language, height }: DemoEditorProps) {
  return (
    <div className="relative">
      <textarea
        value={code}
        onChange={(e) => onChange((e.target as HTMLTextAreaElement).value)}
        className="w-full h-full bg-slate-900 text-white font-mono text-sm p-4 resize-none focus:outline-none"
        style={{ height }}
        spellCheck={false}
        placeholder={`Write your ${language} code here...`}
      />
      <div className="absolute top-2 right-2 text-xs text-gray-500">
        {language === 'javascript' ? '📜 JS' : '🔧 OpenSCAD'}
      </div>
    </div>
  );
}