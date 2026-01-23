# Editor Setup for moicad

## Monaco Editor (Recommended)

Monaco is the VS Code editor component - perfect for our needs.

### Installation

```bash
npm install @monaco-editor/react monaco-editor
```

### OpenSCAD Language Definition

Create `frontend/lib/monaco-openscad.ts`:

```typescript
import * as monaco from 'monaco-editor';

export function registerOpenSCADLanguage() {
  // Register language
  monaco.languages.register({ id: 'openscad' });

  // Syntax highlighting
  monaco.languages.setMonarchTokensProvider('openscad', {
    keywords: [
      'module', 'function', 'if', 'else', 'for', 'let',
      'true', 'false', 'undef',
      'include', 'use',
      'cube', 'sphere', 'cylinder', 'cone', 'circle', 'square',
      'polygon', 'polyhedron', 'text',
      'translate', 'rotate', 'scale', 'mirror', 'multmatrix',
      'color', 'resize', 'offset',
      'union', 'difference', 'intersection', 'hull', 'minkowski',
      'linear_extrude', 'rotate_extrude',
      'children', 'echo', 'assert'
    ],

    operators: [
      '=', '>', '<', '!', '~', '?', ':',
      '==', '<=', '>=', '!=', '&&', '||',
      '+', '-', '*', '/', '%', '^'
    ],

    symbols: /[=><!~?:&|+\-*\/\^%]+/,

    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    tokenizer: {
      root: [
        // Identifiers and keywords
        [/[a-zA-Z_$][\w$]*/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier'
          }
        }],

        // Whitespace
        { include: '@whitespace' },

        // Numbers
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/\d+/, 'number'],

        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string'],

        // Operators
        [/@symbols/, {
          cases: {
            '@operators': 'operator',
            '@default': ''
          }
        }],

        // Delimiters
        [/[{}()\[\]]/, '@brackets'],
        [/[;,.]/, 'delimiter'],
      ],

      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],

      comment: [
        [/[^\/*]+/, 'comment'],
        [/\/\*/, 'comment', '@push'],
        [/\*\//, 'comment', '@pop'],
        [/[\/*]/, 'comment']
      ],

      string: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop']
      ],
    }
  });

  // Auto-completion
  monaco.languages.registerCompletionItemProvider('openscad', {
    provideCompletionItems: (model, position) => {
      const suggestions = [
        // Primitives
        {
          label: 'cube',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'cube(${1:10});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Creates a cube'
        },
        {
          label: 'sphere',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'sphere(r=${1:5}, \\$fn=${2:20});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Creates a sphere'
        },
        {
          label: 'cylinder',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'cylinder(r=${1:5}, h=${2:10}, \\$fn=${3:20});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Creates a cylinder'
        },

        // Transforms
        {
          label: 'translate',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'translate([${1:0}, ${2:0}, ${3:0}]) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Translates geometry'
        },
        {
          label: 'rotate',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'rotate(a=${1:0}, v=[${2:0}, ${3:0}, ${4:1}]) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Rotates geometry'
        },

        // Boolean ops
        {
          label: 'union',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'union() {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Combines shapes'
        },
        {
          label: 'difference',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'difference() {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Subtracts shapes'
        },

        // Control flow
        {
          label: 'module',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'module ${1:name}(${2:params}) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Defines a module'
        },
        {
          label: 'function',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'function ${1:name}(${2:params}) = ${3:expression};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Defines a function'
        },
        {
          label: 'for',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'for (${1:i} = [${2:0} : ${3:10}]) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'For loop'
        },
        {
          label: 'if',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'if (${1:condition}) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Conditional statement'
        },

        // Built-in functions
        {
          label: 'sqrt',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'sqrt(${1:x})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Square root'
        },
        {
          label: 'sin',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'sin(${1:angle})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Sine (degrees)'
        },
        {
          label: 'cos',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'cos(${1:angle})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Cosine (degrees)'
        },
      ];

      return { suggestions };
    }
  });

  // Configuration
  monaco.languages.setLanguageConfiguration('openscad', {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/']
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    indentationRules: {
      increaseIndentPattern: /^.*\{[^}]*$/,
      decreaseIndentPattern: /^\s*\}/
    }
  });
}
```

### React Component

```typescript
// frontend/components/CodeEditor.tsx
import { Editor } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';
import { registerOpenSCADLanguage } from '../lib/monaco-openscad';

export default function CodeEditor({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const editorRef = useRef<any>(null);

  useEffect(() => {
    // Register OpenSCAD language on mount
    registerOpenSCADLanguage();
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Enable auto-save on change
    editor.onDidChangeModelContent(() => {
      onChange(editor.getValue());
    });

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Trigger evaluation
      console.log('Save/Evaluate');
    });
  };

  return (
    <Editor
      height="100%"
      defaultLanguage="openscad"
      defaultValue={value}
      theme="vs-dark"
      onMount={handleEditorDidMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        renderLineHighlight: 'all',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        insertSpaces: true,
        wordWrap: 'on',
        suggest: {
          showKeywords: true,
          showSnippets: true,
        }
      }}
    />
  );
}
```

### Usage in App

```typescript
// frontend/app/page.tsx
'use client';

import { useState } from 'react';
import CodeEditor from '@/components/CodeEditor';

export default function Home() {
  const [code, setCode] = useState(`// Welcome to moicad!
function double(x) = x * 2;

module box(size) {
    cube(size);
}

size = double(5);
box(size);
`);

  return (
    <div className="flex h-screen">
      <div className="w-1/2 border-r">
        <CodeEditor value={code} onChange={setCode} />
      </div>
      <div className="w-1/2">
        {/* Three.js viewport here */}
      </div>
    </div>
  );
}
```

## Alternative: CodeMirror 6

If you prefer CodeMirror:

```bash
npm install @codemirror/lang-javascript @codemirror/state @codemirror/view
```

More lightweight but requires custom language mode setup.

## Summary

**For moicad, use Monaco Editor** because:
- ✅ Better for OpenSCAD (similar to C-like languages)
- ✅ Rich IntelliSense/autocomplete
- ✅ Built-in syntax highlighting
- ✅ VS Code-like experience
- ✅ TypeScript support
- ✅ Easy to customize

The language is **OpenSCAD** with our custom Monaco language definition for syntax highlighting and autocomplete!
