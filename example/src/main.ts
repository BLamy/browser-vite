/**
 * Browser-Vite Live Editor Example
 *
 * Features:
 * - CodeMirror editor for editing code
 * - Live preview in iframe with HMR
 * - HMR-style updates on code changes (no full refresh)
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
let updateCounter = 0;
let iframeReady = false;

// Logging with timestamps
function log(message: string, type: 'info' | 'success' | 'error' | 'warn' | 'hmr' = 'info') {
  const entry = document.createElement('div');
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${timestamp}] ${type === 'hmr' ? '[HMR] ' : ''}${message}`;
  logsEl.appendChild(entry);
  logsEl.scrollTop = logsEl.scrollHeight;
  console.log(`[${type.toUpperCase()}]`, message);
}

function setStatus(message: string, type: 'success' | 'error' | 'pending') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

// Create the iframe HTML with HMR support
function createHMRRuntime(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <style>
    body { margin: 0; }
    #root { min-height: 100vh; }
    .hmr-error {
      font-family: monospace;
      background: #2d1b1b;
      color: #ff6b6b;
      padding: 20px;
      margin: 0;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .hmr-error pre { white-space: pre-wrap; word-wrap: break-word; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    // HMR Runtime
    let currentApp = null;
    let reactRoot = null;
    let updateCount = 0;

    function hmrLog(msg) {
      window.parent.postMessage({ type: 'hmr-log', message: msg }, '*');
    }

    function renderApp(AppComponent) {
      try {
        if (!reactRoot) {
          reactRoot = ReactDOM.createRoot(document.getElementById('root'));
          hmrLog('Created new React root');
        }
        reactRoot.render(React.createElement(AppComponent));
        hmrLog('Rendered component (update #' + updateCount + ')');
      } catch (err) {
        hmrLog('Render error: ' + err.message);
        document.getElementById('root').innerHTML =
          '<div class="hmr-error"><h2>Render Error</h2><pre>' + err.message + '</pre></div>';
      }
    }

    function handleHMRUpdate(code, fileType) {
      updateCount++;
      hmrLog('Received HMR update #' + updateCount + ' for ' + fileType);

      if (fileType === 'css') {
        // CSS HMR - just update the style tag
        let styleEl = document.getElementById('hmr-styles');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'hmr-styles';
          document.head.appendChild(styleEl);
          hmrLog('Created style element');
        }
        styleEl.textContent = code;
        // Update body content for CSS preview
        document.getElementById('root').innerHTML = \`
          <div class="card">
            <h1>CSS Preview</h1>
            <p>This is a preview of your CSS styles. Edit the code on the left to see changes.</p>
            <button>Hover Me!</button>
          </div>
        \`;
        hmrLog('CSS injected without reload');
        return;
      }

      // JS/TSX HMR - evaluate new code and re-render
      try {
        hmrLog('Evaluating new module code...');

        // Create a new function scope for the code
        // Don't pass React as param since code already has: const React = window.React
        const moduleCode = code + '\\nreturn typeof App !== "undefined" ? App : null;';

        try {
          const AppComponent = new Function(moduleCode)();

          if (AppComponent) {
            currentApp = AppComponent;
            renderApp(currentApp);
            hmrLog('HMR update successful - component re-rendered');
          } else {
            // Non-React code or no App export, just execute for side effects
            new Function(code)();
            hmrLog('Code executed (no App component found)');
          }
        } catch (evalErr) {
          throw new Error('Eval error: ' + evalErr.message);
        }
      } catch (err) {
        hmrLog('HMR Error: ' + err.message);
        document.getElementById('root').innerHTML =
          '<div class="hmr-error"><h2>HMR Error</h2><pre>' + err.message + '</pre></div>';
      }
    }

    // Listen for HMR updates from parent
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'hmr-update') {
        handleHMRUpdate(event.data.code, event.data.fileType);
      }
    });

    // Signal ready
    window.parent.postMessage({ type: 'hmr-ready' }, '*');
    hmrLog('HMR Runtime initialized');
  </script>
</body>
</html>`;
}

// Process code for browser execution
function processCodeForBrowser(code: string): string {
  let processedCode = code;

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
  // First capture the function name if it's a named export default function
  const funcMatch = processedCode.match(/export\s+default\s+function\s+(\w+)/);
  const funcName = funcMatch ? funcMatch[1] : null;

  processedCode = processedCode
    // Remove 'export default' from function declarations, keep the function
    .replace(/export\s+default\s+function\s+(\w+)/g, 'function $1')
    // Handle 'export default expression'
    .replace(/export\s+default\s+/, 'var App = ')
    // Remove named exports
    .replace(/export\s+\{[^}]*\};?/g, '');

  // If there was a named function, add App assignment at the end
  if (funcName) {
    processedCode += `\\nvar App = ${funcName};`;
  }

  return processedCode;
}

// Transform and send HMR update
async function updatePreview() {
  if (!browserVite || !editor) {
    log('Cannot update: browserVite or editor not ready', 'warn');
    return;
  }

  updateCounter++;
  const updateId = updateCounter;
  const code = editor.state.doc.toString();

  log(`Starting update #${updateId}`, 'hmr');

  try {
    let processedCode: string;

    if (currentFileType === 'css') {
      processedCode = code;
      log(`CSS update #${updateId} - no transform needed`, 'hmr');
    } else {
      // Transform TypeScript/JSX
      const filename = currentFileType === 'tsx' ? '/App.tsx' : '/main.ts';
      log(`Transforming ${filename}...`, 'hmr');

      const startTime = performance.now();
      const result = await browserVite.transform(code, filename);
      const transformTime = (performance.now() - startTime).toFixed(1);

      log(`Transform complete in ${transformTime}ms`, 'hmr');

      // Process for browser
      processedCode = processCodeForBrowser(result.code);
      log(`Code processed for browser (${processedCode.length} chars)`, 'hmr');
    }

    // Send to iframe via postMessage (HMR style)
    if (iframeReady) {
      log(`Sending HMR update #${updateId} to iframe...`, 'hmr');
      previewFrame.contentWindow?.postMessage({
        type: 'hmr-update',
        code: processedCode,
        fileType: currentFileType,
        updateId
      }, '*');
    } else {
      log('Iframe not ready, queuing update...', 'warn');
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Transform error: ${message}`, 'error');

    // Send error to iframe
    if (iframeReady) {
      previewFrame.contentWindow?.postMessage({
        type: 'hmr-update',
        code: `document.getElementById('root').innerHTML = '<div class="hmr-error"><h2>Transform Error</h2><pre>${message.replace(/'/g, "\\'")}</pre></div>';`,
        fileType: 'ts',
        updateId
      }, '*');
    }
  }
}

// Listen for messages from iframe
window.addEventListener('message', (event) => {
  if (event.data?.type === 'hmr-ready') {
    iframeReady = true;
    log('Iframe HMR runtime ready', 'hmr');
    // Send initial update
    updatePreview();
  } else if (event.data?.type === 'hmr-log') {
    log(`iframe: ${event.data.message}`, 'hmr');
  }
});

// Initialize iframe with HMR runtime
function initIframe() {
  log('Initializing iframe with HMR runtime...', 'hmr');
  iframeReady = false;
  const html = createHMRRuntime();
  const blob = new Blob([html], { type: 'text/html' });
  previewFrame.src = URL.createObjectURL(blob);
}

// Debounced update for auto-run
function scheduleUpdate() {
  if (!autoRunCheckbox.checked) return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = window.setTimeout(() => {
    log('Debounce timer fired, triggering update', 'info');
    updatePreview();
    debounceTimer = null;
  }, 300);
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
            log('Editor content changed', 'info');
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
  // Re-init iframe for clean state
  initIframe();
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

    // Initialize iframe with HMR runtime
    initIframe();

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
runBtn.addEventListener('click', () => {
  log('Manual run triggered', 'info');
  updatePreview();
});
templateSelect.addEventListener('change', handleTemplateChange);

// Start
initialize();
