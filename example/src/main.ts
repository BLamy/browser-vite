/**
 * Browser-Vite Live Editor Example
 *
 * Features:
 * - CodeMirror editor for editing code
 * - Live preview in iframe
 * - HMR-style updates on code changes
 */

import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';
import { BrowserVite } from './browser-vite-wrapper';

// Sample code templates
const templates = {
  react: `// React Component with Counter
import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      padding: '40px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1>Browser-Vite Demo</h1>
      <p>Edit the code on the left to see live updates!</p>
      <div style={{
        fontSize: '48px',
        margin: '20px 0'
      }}>
        {count}
      </div>
      <button
        onClick={() => setCount(c => c + 1)}
        style={{
          padding: '12px 24px',
          fontSize: '18px',
          background: 'white',
          color: '#667eea',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        Increment
      </button>
      <button
        onClick={() => setCount(0)}
        style={{
          padding: '12px 24px',
          fontSize: '18px',
          background: 'transparent',
          color: 'white',
          border: '2px solid white',
          borderRadius: '8px',
          cursor: 'pointer',
          marginLeft: '10px'
        }}
      >
        Reset
      </button>
    </div>
  );
}
`,
  typescript: `// TypeScript Example
interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
];

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}

// This will be displayed in the preview
document.body.innerHTML = \`
  <div style="font-family: system-ui; padding: 40px; background: #1a1a2e; color: #eee; min-height: 100vh;">
    <h1>TypeScript Demo</h1>
    <ul>
      \${users.map(u => \`<li>\${greet(u)} - \${u.email}</li>\`).join('')}
    </ul>
  </div>
\`;
`,
  css: `/* CSS Example */
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  text-align: center;
  max-width: 400px;
}

.card h1 {
  color: #667eea;
  margin-top: 0;
}

.card p {
  color: #666;
  line-height: 1.6;
}

.card button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
}
`
};

// UI Elements
const statusEl = document.getElementById('status')!;
const logsEl = document.getElementById('logs')!;
const editorContainer = document.getElementById('editor')!;
const previewFrame = document.getElementById('preview') as HTMLIFrameElement;
const templateSelect = document.getElementById('templateSelect') as HTMLSelectElement;
const runBtn = document.getElementById('runCode') as HTMLButtonElement;
const autoRunCheckbox = document.getElementById('autoRun') as HTMLInputElement;

let browserVite: BrowserVite | null = null;
let editor: EditorView | null = null;
let currentFileType: 'tsx' | 'ts' | 'css' = 'tsx';
let debounceTimer: number | null = null;

// Logging
function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logsEl.appendChild(entry);
  logsEl.scrollTop = logsEl.scrollHeight;
}

function setStatus(message: string, type: 'success' | 'error' | 'pending') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

// Create the iframe HTML wrapper for React
function createReactWrapper(code: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <style>
    body { margin: 0; }
    #root { min-height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    ${code}

    // Find and render the default export
    if (typeof App !== 'undefined') {
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
    } else if (typeof exports !== 'undefined' && exports.default) {
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(exports.default));
    }
  </script>
</body>
</html>`;
}

// Create wrapper for plain JS/TS
function createJSWrapper(code: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>body { margin: 0; }</style>
</head>
<body>
  <script>${code}</script>
</body>
</html>`;
}

// Create wrapper for CSS preview
function createCSSWrapper(css: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${css}</style>
</head>
<body>
  <div class="card">
    <h1>CSS Preview</h1>
    <p>This is a preview of your CSS styles. Edit the code on the left to see changes.</p>
    <button>Hover Me!</button>
  </div>
</body>
</html>`;
}

// Transform and update preview
async function updatePreview() {
  if (!browserVite || !editor) return;

  const code = editor.state.doc.toString();

  try {
    let result;
    let html: string;

    if (currentFileType === 'css') {
      // CSS doesn't need transformation for preview
      html = createCSSWrapper(code);
      log('CSS updated', 'success');
    } else {
      // Transform TypeScript/JSX
      const filename = currentFileType === 'tsx' ? '/App.tsx' : '/main.ts';
      result = await browserVite.transform(code, filename);

      // Post-process for browser: handle imports
      let processedCode = result.code;

      // Replace React imports with globals (for UMD)
      // Handle combined: import React, { useState, useEffect } from 'react'
      processedCode = processedCode.replace(
        /import\s+React\s*,\s*\{([^}]+)\}\s+from\s+['"]react['"];?/g,
        (_, imports) => {
          const vars = imports.split(',').map((i: string) => i.trim());
          return `const React = window.React;\n${vars.map((v: string) => `const ${v} = React.${v};`).join('\n')}`;
        }
      );
      // Handle: import React from 'react'
      processedCode = processedCode.replace(
        /import\s+React\s+from\s+['"]react['"];?/g,
        'const React = window.React;'
      );
      // Handle: import { useState } from 'react'
      processedCode = processedCode.replace(
        /import\s+\{([^}]+)\}\s+from\s+['"]react['"];?/g,
        (_, imports) => {
          const vars = imports.split(',').map((i: string) => i.trim());
          return vars.map((v: string) => `const ${v} = React.${v};`).join('\n');
        }
      );
      // Handle react-dom
      processedCode = processedCode
        .replace(/import.*from\s+['"]react-dom\/client['"];?/g, 'const ReactDOM = window.ReactDOM;')
        .replace(/import.*from\s+['"]react-dom['"];?/g, 'const ReactDOM = window.ReactDOM;');

      // Handle exports for rendering
      processedCode = processedCode
        .replace(/export\s+default\s+function\s+(\w+)/g, 'function $1')
        .replace(/export\s+default\s+/, 'const App = ')
        .replace(/export\s+\{[^}]*\};?/g, '');

      if (currentFileType === 'tsx') {
        html = createReactWrapper(processedCode);
      } else {
        html = createJSWrapper(processedCode);
      }

      log(`Transformed ${filename}`, 'success');
    }

    // Update iframe
    const blob = new Blob([html], { type: 'text/html' });
    previewFrame.src = URL.createObjectURL(blob);

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Transform error: ${message}`, 'error');

    // Show error in preview
    const errorHtml = `<!DOCTYPE html>
<html>
<head><style>
  body {
    font-family: monospace;
    background: #2d1b1b;
    color: #ff6b6b;
    padding: 20px;
    margin: 0;
    min-height: 100vh;
    box-sizing: border-box;
  }
  pre { white-space: pre-wrap; word-wrap: break-word; }
</style></head>
<body>
  <h2>Transform Error</h2>
  <pre>${message}</pre>
</body>
</html>`;
    const blob = new Blob([errorHtml], { type: 'text/html' });
    previewFrame.src = URL.createObjectURL(blob);
  }
}

// Debounced update for auto-run
function scheduleUpdate() {
  if (!autoRunCheckbox.checked) return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = window.setTimeout(() => {
    updatePreview();
    debounceTimer = null;
  }, 500);
}

// Initialize CodeMirror editor
function initEditor(content: string, language: 'tsx' | 'ts' | 'css') {
  if (editor) {
    editor.destroy();
  }

  const languageExtension = language === 'css'
    ? css()
    : javascript({ jsx: language === 'tsx', typescript: true });

  editor = new EditorView({
    state: EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        languageExtension,
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            scheduleUpdate();
          }
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
        }),
      ],
    }),
    parent: editorContainer,
  });
}

// Handle template change
function handleTemplateChange() {
  const template = templateSelect.value as 'react' | 'typescript' | 'css';

  switch (template) {
    case 'react':
      currentFileType = 'tsx';
      initEditor(templates.react, 'tsx');
      break;
    case 'typescript':
      currentFileType = 'ts';
      initEditor(templates.typescript, 'ts');
      break;
    case 'css':
      currentFileType = 'css';
      initEditor(templates.css, 'css');
      break;
  }

  log(`Switched to ${template} template`, 'info');
  updatePreview();
}

// Initialize
async function initialize() {
  try {
    log('Initializing browser-vite...');
    setStatus('Initializing...', 'pending');

    browserVite = new BrowserVite();
    await browserVite.init();

    setStatus('Ready!', 'success');
    log('Browser-vite ready!', 'success');

    // Enable UI
    runBtn.disabled = false;
    templateSelect.disabled = false;
    autoRunCheckbox.disabled = false;

    // Initialize editor with React template
    initEditor(templates.react, 'tsx');

    // Initial preview
    await updatePreview();

    // Expose for debugging
    (window as any).browserVite = browserVite;
    (window as any).editor = editor;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`Error: ${message}`, 'error');
    log(`Initialization failed: ${message}`, 'error');
  }
}

// Event listeners
runBtn.addEventListener('click', updatePreview);
templateSelect.addEventListener('change', handleTemplateChange);

// Start
initialize();
