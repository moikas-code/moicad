/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'editor-bg': '#1e1e1e',
        'editor-text': '#d4d4d4',
        'viewport-bg': '#2a2a2a',
        'sidebar-bg': '#252526',
        'accent': '#007acc',
        'accent-hover': '#005a9c',
        'success': '#4ec9b0',
        'error': '#f48771',
        'warning': '#ce9178',
      },
      fontFamily: {
        'mono': ['Fira Code', 'Monaco', 'Courier New', 'monospace'],
      },
      spacing: {
        '128': '32rem',
      },
    },
  },
  plugins: [],
};
