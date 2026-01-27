/**
 * OpenSCAD Language Definition for Monaco Editor
 */

import * as monaco from 'monaco-editor';

// Register OpenSCAD language
monaco.languages.register({ id: 'openscad' });

// Define OpenSCAD syntax highlighting
monaco.languages.setMonarchTokensProvider('openscad', {
  // Keywords
  keywords: [
    'cube', 'sphere', 'cylinder', 'cone', 'circle', 'square',
    'translate', 'rotate', 'scale', 'mirror', 'multmatrix',
    'union', 'difference', 'intersection', 'hull', 'minkowski',
    'linear_extrude', 'rotate_extrude',
    'for', 'let', 'function', 'module', 'include', 'use',
    'if', 'else', 'echo',
    'true', 'false', 'undef',
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
    'abs', 'sign', 'pow', 'sqrt', 'exp', 'log', 'ln', 'round', 'floor', 'ceil',
    'min', 'max', 'len', 'str', 'chr', 'concat',
  ],

  // Operators
  operators: [
    '=', '>', '<', '!', '?', ':', '==', '<=', '>=', '!=',
    '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%', '<<',
    '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=', '%=', '<<=',
    '>>=', '>>>=',
  ],

  // Symbols
  symbols: /[=><!~?:&|+\-*\/\^%]+/,

  // Escape sequences
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  // Tokenizer
  tokenizer: {
    root: [
      // Identifiers and keywords
      [/[a-z_$][\w$]*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier'
        }
      }],

      // Whitespace
      [/\s+/, 'white'],

      // Comments
      [/(\/\/.*$)/, 'comment'],
      [/\/\*/, 'comment', '@comment'],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-terminated string
      [/"([^"\\]|\\.)*$/, 'string', '@string'],

      // Numbers
      [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
      [/0[xX][0-9a-fA-F]+/, 'number.hex'],
      [/\d+/, 'number'],

      // Delimiters and operators
      [/[{}()\[\]]/, '@brackets'],
      [/[<>](?!@symbols)/, '@brackets'],
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': 'delimiter'
        }
      }],
    ],

    comment: [
      [/[^\/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment']
    ],

    string: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop']
    ],
  },
});

// Configure language features
monaco.languages.setLanguageConfiguration('openscad', {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string'] },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
  ],
});

// Completion provider
monaco.languages.registerCompletionItemProvider('openscad', {
  provideCompletionItems: (model, position) => {
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    };

    const suggestions = [
      // Primitives
      { label: 'cube', kind: monaco.languages.CompletionItemKind.Function, insertText: 'cube(${1:size});', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
      { label: 'sphere', kind: monaco.languages.CompletionItemKind.Function, insertText: 'sphere(${1:radius});', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
      { label: 'cylinder', kind: monaco.languages.CompletionItemKind.Function, insertText: 'cylinder(${1:h}, ${2:r});', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
      { label: 'cone', kind: monaco.languages.CompletionItemKind.Function, insertText: 'cone(${1:h}, ${2:r});', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },

      // Transforms
      { label: 'translate', kind: monaco.languages.CompletionItemKind.Function, insertText: 'translate([${1:x}, ${2:y}, ${3:z}]) ${4:shape};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
      { label: 'rotate', kind: monaco.languages.CompletionItemKind.Function, insertText: 'rotate(${1:angle}) ${2:shape};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
      { label: 'scale', kind: monaco.languages.CompletionItemKind.Function, insertText: 'scale([${1:x}, ${2:y}, ${3:z}]) ${4:shape};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
      { label: 'mirror', kind: monaco.languages.CompletionItemKind.Function, insertText: 'mirror([${1:x}, ${2:y}, ${3:z}]) ${4:shape};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },

      // Boolean operations
      { label: 'union', kind: monaco.languages.CompletionItemKind.Function, insertText: 'union() {\n\t${1:shape1};\n\t${2:shape2};\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
      { label: 'difference', kind: monaco.languages.CompletionItemKind.Function, insertText: 'difference() {\n\t${1:shape1};\n\t${2:shape2};\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
      { label: 'intersection', kind: monaco.languages.CompletionItemKind.Function, insertText: 'intersection() {\n\t${1:shape1};\n\t${2:shape2};\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },

      // Control flow
      { label: 'for', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'for (${1:variable} = [${2:start}:${3:end}]) {\n\t${4:shape};\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
    ];

    return { suggestions };
  },
});