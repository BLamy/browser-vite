/**
 * Browser-Vite Live Editor Example
 *
 * Features:
 * - Virtual file system with multiple files
 * - Browsable file tree
 * - CodeMirror editor for editing code
 * - Live preview in iframe with HMR
 * - Module resolution between files
 */

import './index.css';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';
import { BrowserVite } from './browser-vite-wrapper';

// =============================================================================
// Virtual File System
// =============================================================================

interface VirtualFile {
  path: string;
  content: string;
  type: 'tsx' | 'ts' | 'css' | 'json';
}

// Initial file system with a multi-file React app
const initialFiles: VirtualFile[] = [
  {
    path: '/src/App.tsx',
    type: 'tsx',
    content: `// Main App Component
import React from 'react';
import { Counter } from './Counter';
import { Header } from './components/Header';
import { greeting } from './utils';

export default function App() {
  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      padding: '40px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <Header title="Browser-Vite Demo" />
      <p>{greeting('Developer')}</p>
      <Counter initialCount={0} />
    </div>
  );
}
`,
  },
  {
    path: '/src/Counter.tsx',
    type: 'tsx',
    content: `// Counter Component
import React, { useState } from 'react';
import { Button } from './components/Button';

interface CounterProps {
  initialCount: number;
}

export function Counter({ initialCount }: CounterProps) {
  const [count, setCount] = useState(initialCount);

  return (
    <div style={{ margin: '20px 0' }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>
        {count}
      </div>
      <Button onClick={() => setCount(c => c + 1)} primary>
        Increment
      </Button>
      <Button onClick={() => setCount(c => c - 1)}>
        Decrement
      </Button>
      <Button onClick={() => setCount(initialCount)}>
        Reset
      </Button>
    </div>
  );
}
`,
  },
  {
    path: '/src/components/Header.tsx',
    type: 'tsx',
    content: `// Header Component
import React from 'react';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header>
      <h1 style={{
        fontSize: '2.5rem',
        marginBottom: '10px',
        textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
      }}>
        {title}
      </h1>
    </header>
  );
}
`,
  },
  {
    path: '/src/components/Button.tsx',
    type: 'tsx',
    content: `// Button Component
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}

export function Button({ children, onClick, primary }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 24px',
        fontSize: '16px',
        background: primary ? 'white' : 'transparent',
        color: primary ? '#667eea' : 'white',
        border: primary ? 'none' : '2px solid white',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        marginRight: '10px',
        transition: 'transform 0.1s',
      }}
      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      {children}
    </button>
  );
}
`,
  },
  {
    path: '/src/utils.ts',
    type: 'ts',
    content: `// Utility functions

export function greeting(name: string): string {
  return \`Welcome, \${name}! Edit the files to see live updates.\`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
`,
  },
  {
    path: '/src/styles.css',
    type: 'css',
    content: `/* Global Styles */

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, sans-serif;
}

/* Animation keyframes */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

/* Button hover effects */
button:hover {
  filter: brightness(1.1);
}

button:active {
  transform: scale(0.98);
}
`,
  },
];

// Virtual file system state
let fileSystem: Map<string, VirtualFile> = new Map();
let currentFile: string = '/src/App.tsx';
let modifiedFiles: Set<string> = new Set();

// Initialize file system
function initFileSystem() {
  fileSystem.clear();
  modifiedFiles.clear();
  for (const file of initialFiles) {
    fileSystem.set(file.path, { ...file });
  }
}

// =============================================================================
// UI Elements
// =============================================================================

const statusEl = document.getElementById('status')!;
const editorContainer = document.getElementById('editor')!;
const previewFrame = document.getElementById('preview') as HTMLIFrameElement;
const runBtn = document.getElementById('runCode') as HTMLButtonElement;
const autoRunCheckbox = document.getElementById('autoRun') as HTMLInputElement;
const fileTreeEl = document.getElementById('fileTree')!;
const currentFileNameEl = document.getElementById('currentFileName')!;
const newFileBtn = document.getElementById('newFileBtn')!;
const newFileModal = document.getElementById('newFileModal')!;
const newFileNameInput = document.getElementById('newFileName') as HTMLInputElement;
const createNewFileBtn = document.getElementById('createNewFile')!;
const cancelNewFileBtn = document.getElementById('cancelNewFile')!;

let browserVite: BrowserVite | null = null;
let editor: EditorView | null = null;
let debounceTimer: number | null = null;
let updateCounter = 0;
let iframeReady = false;

// =============================================================================
// Logging
// =============================================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' | 'hmr' = 'info') {
  const prefix = type === 'hmr' ? '[HMR]' : `[${type.toUpperCase()}]`;
  console.log(prefix, message);
}

function setStatus(message: string, type: 'success' | 'error' | 'pending') {
  statusEl.textContent = message;
  const statusStyles: Record<string, string> = {
    success: 'bg-emerald-900/50 border-emerald-700',
    error: 'bg-red-900/50 border-red-700',
    pending: 'bg-amber-900/50 border-amber-700',
  };
  statusEl.className = `px-3 py-1.5 rounded font-mono text-xs border ${statusStyles[type]}`;
}

// =============================================================================
// File Tree
// =============================================================================

interface FileTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: FileTreeNode[];
}

function buildFileTree(): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const paths = Array.from(fileSystem.keys()).sort();

  for (const path of paths) {
    const parts = path.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const currentPath = '/' + parts.slice(0, i + 1).join('/');

      let node = current.find((n) => n.name === part);

      if (!node) {
        node = {
          name: part,
          path: currentPath,
          isFolder: !isFile,
          children: isFile ? undefined : [],
        };
        current.push(node);
      }

      if (!isFile && node.children) {
        current = node.children;
      }
    }
  }

  return root;
}

function getFileIcon(filename: string): string {
  if (filename.endsWith('.tsx')) return '⚛️';
  if (filename.endsWith('.ts')) return '📘';
  if (filename.endsWith('.css')) return '🎨';
  if (filename.endsWith('.json')) return '📋';
  return '📄';
}

function renderFileTree() {
  const tree = buildFileTree();
  fileTreeEl.innerHTML = '';

  function renderNode(node: FileTreeNode, container: HTMLElement) {
    if (node.isFolder) {
      const folderEl = document.createElement('div');
      folderEl.className = 'flex items-center px-3 py-1.5 cursor-pointer text-[13px] text-[hsl(var(--muted-foreground))] font-medium hover:bg-[hsl(var(--sidebar-accent))]';
      folderEl.innerHTML = `<span class="mr-2">📁</span>${node.name}`;
      container.appendChild(folderEl);

      const contentsEl = document.createElement('div');
      contentsEl.className = 'pl-3';
      container.appendChild(contentsEl);

      if (node.children) {
        // Sort: folders first, then files
        const sorted = [...node.children].sort((a, b) => {
          if (a.isFolder && !b.isFolder) return -1;
          if (!a.isFolder && b.isFolder) return 1;
          return a.name.localeCompare(b.name);
        });
        for (const child of sorted) {
          renderNode(child, contentsEl);
        }
      }
    } else {
      const fileEl = document.createElement('div');
      const isActive = node.path === currentFile;
      const isModified = modifiedFiles.has(node.path);
      const baseClasses = 'flex items-center px-3 py-1.5 cursor-pointer text-[13px] border-l-2 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--foreground))]';
      const activeClasses = isActive
        ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--foreground))] border-l-[hsl(var(--primary))]'
        : 'text-[hsl(var(--sidebar-foreground))] border-l-transparent';
      fileEl.className = `${baseClasses} ${activeClasses}`;
      fileEl.innerHTML = `<span class="w-4 h-4 mr-2 text-sm">${getFileIcon(node.name)}</span>${node.name}${isModified ? '<span class="w-1.5 h-1.5 bg-amber-500 rounded-full ml-auto"></span>' : ''}`;
      fileEl.addEventListener('click', () => openFile(node.path));
      container.appendChild(fileEl);
    }
  }

  for (const node of tree) {
    renderNode(node, fileTreeEl);
  }
}

// =============================================================================
// Editor
// =============================================================================

function getFileType(path: string): 'tsx' | 'ts' | 'css' | 'json' {
  if (path.endsWith('.tsx')) return 'tsx';
  if (path.endsWith('.ts')) return 'ts';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.json')) return 'json';
  return 'ts';
}

function openFile(path: string) {
  // Save current editor content before switching
  if (editor && currentFile) {
    const content = editor.state.doc.toString();
    const file = fileSystem.get(currentFile);
    if (file && file.content !== content) {
      file.content = content;
      modifiedFiles.add(currentFile);
    }
  }

  currentFile = path;
  currentFileNameEl.textContent = path.split('/').pop() || '';

  const file = fileSystem.get(path);
  if (!file) {
    log(`File not found: ${path}`, 'error');
    return;
  }

  const fileType = getFileType(path);

  if (editor) {
    editor.destroy();
  }

  const languageExtension =
    fileType === 'css' ? css() : javascript({ jsx: fileType === 'tsx', typescript: true });

  editor = new EditorView({
    state: EditorState.create({
      doc: file.content,
      extensions: [
        basicSetup,
        languageExtension,
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            modifiedFiles.add(currentFile);
            renderFileTree();
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

  renderFileTree();
  log(`Opened file: ${path}`, 'info');
}

// =============================================================================
// Module Resolution & Bundling
// =============================================================================

function resolveImport(importPath: string, fromFile: string): string | null {
  // Handle relative imports
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/'));
    let resolved = fromDir + '/' + importPath.replace(/^\.\//, '');

    // Normalize path (handle ../)
    const parts = resolved.split('/').filter(Boolean);
    const normalized: string[] = [];
    for (const part of parts) {
      if (part === '..') {
        normalized.pop();
      } else if (part !== '.') {
        normalized.push(part);
      }
    }
    resolved = '/' + normalized.join('/');

    // Try extensions
    const extensions = ['.tsx', '.ts', '.js', '.jsx'];
    for (const ext of extensions) {
      if (fileSystem.has(resolved + ext)) {
        return resolved + ext;
      }
    }
    // Try index files
    for (const ext of extensions) {
      if (fileSystem.has(resolved + '/index' + ext)) {
        return resolved + '/index' + ext;
      }
    }
    // Already has extension
    if (fileSystem.has(resolved)) {
      return resolved;
    }
  }

  return null;
}

async function bundleAllModules(): Promise<string> {
  if (!browserVite) throw new Error('BrowserVite not initialized');

  const modules: Map<string, string> = new Map();
  const processed = new Set<string>();

  // Process a module and its dependencies
  async function processModule(path: string) {
    if (processed.has(path)) return;
    processed.add(path);

    const file = fileSystem.get(path);
    if (!file) return;

    // Skip CSS for now (handled separately)
    if (file.type === 'css') return;

    // Transform the code
    const result = await browserVite!.transform(file.content, path);
    let code = result.code;

    // Find and process imports
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s+['"]([^'"]+)['"]/g;
    let match;
    const imports: string[] = [];

    while ((match = importRegex.exec(code)) !== null) {
      const importPath = match[1];
      if (!importPath.startsWith('.')) continue; // Skip external modules

      const resolved = resolveImport(importPath, path);
      if (resolved) {
        imports.push(resolved);
        await processModule(resolved);
      }
    }

    modules.set(path, code);
  }

  // Start from App.tsx
  await processModule('/src/App.tsx');

  // Build the bundle
  let bundle = '';

  // Add module registry
  bundle += `
const __modules = {};
const __exports = {};

function __require(id) {
  if (__exports[id]) return __exports[id];
  __exports[id] = {};
  __modules[id](__require);
  return __exports[id];
}

`;

  // Process each module
  for (const [path, code] of modules) {
    let processedCode = code;

    // Replace React imports with globals
    processedCode = processedCode.replace(
      /import\s+React\s*,\s*\{([^}]+)\}\s+from\s+['"]react['"];?/g,
      (_, imports) => {
        const vars = imports
          .split(',')
          .map((i: string) => i.trim())
          .filter(Boolean);
        return `const React = window.React;\n${vars.map((v: string) => `const ${v} = React.${v};`).join('\n')}`;
      }
    );
    processedCode = processedCode.replace(
      /import\s+React\s+from\s+['"]react['"];?/g,
      'const React = window.React;'
    );
    processedCode = processedCode.replace(
      /import\s+\{([^}]+)\}\s+from\s+['"]react['"];?/g,
      (_, imports) => {
        const vars = imports
          .split(',')
          .map((i: string) => i.trim())
          .filter(Boolean);
        return vars.map((v: string) => `const ${v} = React.${v};`).join('\n');
      }
    );

    // Replace relative imports with __require calls
    processedCode = processedCode.replace(
      /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g,
      (_, imports, importPath) => {
        const resolved = resolveImport(importPath, path);
        if (resolved) {
          const vars = imports
            .split(',')
            .map((i: string) => i.trim())
            .filter(Boolean);
          return `const { ${vars.join(', ')} } = __require('${resolved}')`;
        }
        return '';
      }
    );

    // Handle default imports
    processedCode = processedCode.replace(
      /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
      (_, name, importPath) => {
        const resolved = resolveImport(importPath, path);
        if (resolved) {
          return `const ${name} = __require('${resolved}').default`;
        }
        return '';
      }
    );

    // Convert exports
    processedCode = processedCode.replace(/export\s+default\s+function\s+(\w+)/g, 'function $1');
    processedCode = processedCode.replace(
      /export\s+default\s+/g,
      '__exports[__currentModule].default = '
    );
    processedCode = processedCode.replace(
      /export\s+function\s+(\w+)/g,
      '__exports[__currentModule].$1 = function $1'
    );
    processedCode = processedCode.replace(
      /export\s+const\s+(\w+)/g,
      '__exports[__currentModule].$1 = '
    );
    processedCode = processedCode.replace(/export\s+\{[^}]*\};?/g, '');

    // Check for default function that needs assignment
    const funcMatch = code.match(/export\s+default\s+function\s+(\w+)/);
    if (funcMatch) {
      processedCode += `\n__exports[__currentModule].default = ${funcMatch[1]};`;
    }

    bundle += `
__modules['${path}'] = function(__require) {
  const __currentModule = '${path}';
${processedCode
  .split('\n')
  .map((line) => '  ' + line)
  .join('\n')}
};
`;
  }

  // Add entry point
  bundle += `
const App = __require('/src/App.tsx').default;
`;

  return bundle;
}

// =============================================================================
// HMR Runtime
// =============================================================================

function createHMRRuntime(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/chobitsu"></script>
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
  <style id="hmr-styles"></style>
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

    // Initialize Chobitsu CDP
    function initChobitsu() {
      if (typeof chobitsu === 'undefined') {
        hmrLog('Chobitsu not loaded, skipping CDP initialization');
        return;
      }

      // Set up message handler to forward CDP responses to parent
      chobitsu.setOnMessage(function(message) {
        window.parent.postMessage({
          type: 'cdp-response',
          message: message
        }, '*');
      });

      hmrLog('Chobitsu CDP initialized');
      window.parent.postMessage({ type: 'cdp-ready' }, '*');
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
          '<div class="hmr-error"><h2>Render Error</h2><pre>' + err.message + '\\n' + err.stack + '</pre></div>';
      }
    }

    function handleHMRUpdate(code, fileType) {
      updateCount++;
      hmrLog('Received HMR update #' + updateCount + ' for ' + fileType);

      if (fileType === 'css') {
        document.getElementById('hmr-styles').textContent = code;
        hmrLog('CSS injected without reload');
        return;
      }

      try {
        hmrLog('Evaluating module bundle...');

        const moduleCode = code + '\\nreturn typeof App !== "undefined" ? App : null;';
        const AppComponent = new Function(moduleCode)();

        if (AppComponent) {
          currentApp = AppComponent;
          renderApp(currentApp);
          hmrLog('HMR update successful - component re-rendered');
        } else {
          new Function(code)();
          hmrLog('Code executed (no App component found)');
        }
      } catch (err) {
        hmrLog('HMR Error: ' + err.message);
        document.getElementById('root').innerHTML =
          '<div class="hmr-error"><h2>HMR Error</h2><pre>' + err.message + '\\n' + err.stack + '</pre></div>';
      }
    }

    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'hmr-update') {
        handleHMRUpdate(event.data.code, event.data.fileType);
      }
      // Handle CDP commands from parent
      if (event.data && event.data.type === 'cdp-command') {
        if (typeof chobitsu !== 'undefined') {
          chobitsu.sendRawMessage(event.data.message);
        }
      }
    });

    window.parent.postMessage({ type: 'hmr-ready' }, '*');
    hmrLog('HMR Runtime initialized');

    // Initialize Chobitsu after a short delay to ensure it's loaded
    setTimeout(initChobitsu, 100);
  </script>
</body>
</html>`;
}

// =============================================================================
// Preview Update
// =============================================================================

async function updatePreview() {
  if (!browserVite || !editor) {
    log('Cannot update: browserVite or editor not ready', 'warn');
    return;
  }

  // Save current editor content
  if (currentFile) {
    const content = editor.state.doc.toString();
    const file = fileSystem.get(currentFile);
    if (file) {
      file.content = content;
    }
  }

  updateCounter++;
  const updateId = updateCounter;

  log(`Starting update #${updateId}`, 'hmr');

  try {
    const currentFileData = fileSystem.get(currentFile);
    const fileType = currentFileData?.type || 'tsx';

    let processedCode: string;

    if (fileType === 'css') {
      // For CSS, just send the content
      const cssFiles = Array.from(fileSystem.values()).filter((f) => f.type === 'css');
      processedCode = cssFiles.map((f) => f.content).join('\n');
      log(`CSS update #${updateId}`, 'hmr');
    } else {
      // Bundle all modules
      log(`Bundling modules...`, 'hmr');
      const startTime = performance.now();
      processedCode = await bundleAllModules();
      const bundleTime = (performance.now() - startTime).toFixed(1);
      log(`Bundle complete in ${bundleTime}ms (${processedCode.length} chars)`, 'hmr');
    }

    // Send to iframe via postMessage
    if (iframeReady) {
      log(`Sending HMR update #${updateId} to iframe...`, 'hmr');
      previewFrame.contentWindow?.postMessage(
        {
          type: 'hmr-update',
          code: processedCode,
          fileType: fileType,
          updateId,
        },
        '*'
      );
    } else {
      log('Iframe not ready, queuing update...', 'warn');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Bundle error: ${message}`, 'error');

    if (iframeReady) {
      previewFrame.contentWindow?.postMessage(
        {
          type: 'hmr-update',
          code: `document.getElementById('root').innerHTML = '<div class="hmr-error"><h2>Bundle Error</h2><pre>${message.replace(/'/g, "\\'")}</pre></div>';`,
          fileType: 'ts',
          updateId,
        },
        '*'
      );
    }
  }
}

// =============================================================================
// CDP (Chrome DevTools Protocol) via Chobitsu
// =============================================================================

let cdpReady = false;
let cdpMessageId = 0;
const cdpCallbacks: Map<number, (result: any) => void> = new Map();
const cdpEventListeners: Map<string, Set<(params: any) => void>> = new Map();

// Forward declaration for DevTools CDP forwarding
declare function forwardCDPToDevtools(message: string): void;

// Send a CDP command to the iframe
function sendCDPCommand(method: string, params: Record<string, any> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!cdpReady) {
      reject(new Error('CDP not ready'));
      return;
    }

    const id = ++cdpMessageId;
    cdpCallbacks.set(id, resolve);

    const message = JSON.stringify({ id, method, params });
    previewFrame.contentWindow?.postMessage({ type: 'cdp-command', message }, '*');

    // Timeout after 10 seconds
    setTimeout(() => {
      if (cdpCallbacks.has(id)) {
        cdpCallbacks.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }
    }, 10000);
  });
}

// Subscribe to CDP events
function onCDPEvent(eventName: string, callback: (params: any) => void) {
  if (!cdpEventListeners.has(eventName)) {
    cdpEventListeners.set(eventName, new Set());
  }
  cdpEventListeners.get(eventName)!.add(callback);

  // Return unsubscribe function
  return () => {
    cdpEventListeners.get(eventName)?.delete(callback);
  };
}

// Handle CDP response from iframe
function handleCDPResponse(message: string) {
  try {
    const parsed = JSON.parse(message);

    // Handle response to a command
    if (parsed.id !== undefined) {
      const callback = cdpCallbacks.get(parsed.id);
      if (callback) {
        cdpCallbacks.delete(parsed.id);
        callback(parsed.result || parsed.error);
      }
    }

    // Handle event
    if (parsed.method) {
      const listeners = cdpEventListeners.get(parsed.method);
      if (listeners) {
        listeners.forEach((cb) => cb(parsed.params));
      }
    }
  } catch (e) {
    log(`CDP parse error: ${e}`, 'error');
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

window.addEventListener('message', (event) => {
  if (event.data?.type === 'hmr-ready') {
    iframeReady = true;
    log('Iframe HMR runtime ready', 'hmr');
    updatePreview();
  } else if (event.data?.type === 'hmr-log') {
    log(`iframe: ${event.data.message}`, 'hmr');
  } else if (event.data?.type === 'cdp-ready') {
    cdpReady = true;
    log('CDP (Chobitsu) ready - Click DevTools to open Chrome DevTools', 'success');
  } else if (event.data?.type === 'cdp-response') {
    handleCDPResponse(event.data.message);
    // Forward CDP responses to DevTools iframe if open
    forwardCDPToDevtools(event.data.message);
  }
});

function initIframe() {
  log('Initializing iframe with HMR runtime...', 'hmr');
  iframeReady = false;
  const html = createHMRRuntime();
  const blob = new Blob([html], { type: 'text/html' });
  previewFrame.src = URL.createObjectURL(blob);
}

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

// New file modal handlers
function showNewFileModal() {
  newFileModal.classList.remove('hidden');
  newFileModal.classList.add('flex');
  newFileNameInput.value = '';
  newFileNameInput.focus();
}

function hideNewFileModal() {
  newFileModal.classList.add('hidden');
  newFileModal.classList.remove('flex');
}

function createNewFile() {
  let filename = newFileNameInput.value.trim();
  if (!filename) return;

  // Add extension if not present
  if (!filename.match(/\.(tsx?|css|json)$/)) {
    filename += '.tsx';
  }

  // Add /src/ prefix if not present
  let path = filename.startsWith('/') ? filename : '/src/' + filename;

  if (fileSystem.has(path)) {
    log(`File already exists: ${path}`, 'error');
    return;
  }

  const type = getFileType(path);
  const content =
    type === 'css'
      ? `/* ${filename} */\n`
      : type === 'tsx'
        ? `import React from 'react';\n\nexport function ${filename.replace(/\\.tsx?$/, '')}() {\n  return <div>New Component</div>;\n}\n`
        : `// ${filename}\n`;

  fileSystem.set(path, { path, content, type });
  log(`Created new file: ${path}`, 'success');

  hideNewFileModal();
  renderFileTree();
  openFile(path);
}

// =============================================================================
// Initialization
// =============================================================================

async function initialize() {
  try {
    log('Initializing browser-vite...');
    setStatus('Initializing...', 'pending');

    // Initialize file system
    initFileSystem();
    renderFileTree();

    // Initialize browser-vite
    browserVite = new BrowserVite();
    await browserVite.init();

    setStatus('Ready!', 'success');
    log('Browser-vite ready!', 'success');

    // Enable UI
    runBtn.disabled = false;
    autoRunCheckbox.disabled = false;

    // Open the main App file
    openFile('/src/App.tsx');

    // Initialize iframe with HMR runtime
    initIframe();

    // Expose for debugging and external use
    (window as any).browserVite = browserVite;
    (window as any).fileSystem = fileSystem;

    // Expose CDP API
    (window as any).cdp = {
      send: sendCDPCommand,
      on: onCDPEvent,
      get ready() {
        return cdpReady;
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`Error: ${message}`, 'error');
    log(`Initialization failed: ${message}`, 'error');
  }
}

// =============================================================================
// DevTools - Embedded Chrome DevTools Frontend via Chii
// =============================================================================

const devtoolsToggle = document.getElementById('devtoolsToggle')!;
const devtoolsPanel = document.getElementById('devtoolsPanel')!;
const devtoolsFrame = document.getElementById('devtoolsFrame') as HTMLIFrameElement;
const devtoolsResizeHandle = document.getElementById('devtoolsResizeHandle')!;

let devtoolsOpen = false;
let devtoolsInitialized = false;

// Chii DevTools URL with embedded mode pointing to our origin
const CHII_DEVTOOLS_URL = `https://chii.liriliri.io/front_end/chii_app.html#?embedded=${encodeURIComponent(window.location.origin)}`;

function toggleDevtools() {
  if (!cdpReady) {
    log('Cannot open DevTools: CDP not ready', 'error');
    return;
  }

  devtoolsOpen = !devtoolsOpen;
  devtoolsPanel.classList.toggle('hidden', !devtoolsOpen);
  devtoolsPanel.classList.toggle('block', devtoolsOpen);
  devtoolsToggle.classList.toggle('bg-[hsl(var(--primary))]', devtoolsOpen);

  if (devtoolsOpen && !devtoolsInitialized) {
    initDevtoolsFrame();
  }

  log(devtoolsOpen ? 'DevTools panel opened' : 'DevTools panel closed', 'info');
}

function initDevtoolsFrame() {
  log('Initializing embedded DevTools...', 'info');
  // Load chii directly from its CDN - no intermediate iframe needed
  devtoolsFrame.src = CHII_DEVTOOLS_URL;
  devtoolsInitialized = true;
}

// Handle messages from chii DevTools (CDP commands)
function handleDevtoolsMessage(event: MessageEvent) {
  // Only accept messages from chii's origin
  if (event.origin !== 'https://chii.liriliri.io') return;

  // Chii sends CDP commands as JSON strings
  if (event.data && typeof event.data === 'string') {
    try {
      const parsed = JSON.parse(event.data);
      if (parsed.method || parsed.id !== undefined) {
        // Forward CDP command to preview iframe (chobitsu)
        previewFrame.contentWindow?.postMessage(
          { type: 'cdp-command', message: event.data },
          '*'
        );
      }
    } catch {
      // Not JSON, ignore
    }
  }
}

// Forward CDP responses to chii DevTools iframe
function forwardCDPToDevtools(message: string) {
  if (devtoolsOpen && devtoolsInitialized && devtoolsFrame.contentWindow) {
    devtoolsFrame.contentWindow.postMessage(message, 'https://chii.liriliri.io');
  }
}

// DevTools panel resize functionality
let isResizing = false;
let startY = 0;
let startHeight = 0;

devtoolsResizeHandle.addEventListener('mousedown', (e) => {
  isResizing = true;
  startY = e.clientY;
  startHeight = devtoolsPanel.offsetHeight;
  document.body.style.cursor = 'ns-resize';
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const deltaY = startY - e.clientY;
  const newHeight = Math.min(Math.max(150, startHeight + deltaY), window.innerHeight - 200);
  devtoolsPanel.style.height = `${newHeight}px`;
});

document.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// Listen for messages from chii DevTools
window.addEventListener('message', handleDevtoolsMessage);

// DevTools toggle button
devtoolsToggle.addEventListener('click', toggleDevtools);

// Event listeners
runBtn.addEventListener('click', () => {
  log('Manual run triggered', 'info');
  updatePreview();
});

newFileBtn.addEventListener('click', showNewFileModal);
cancelNewFileBtn.addEventListener('click', hideNewFileModal);
createNewFileBtn.addEventListener('click', createNewFile);
newFileNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') createNewFile();
  if (e.key === 'Escape') hideNewFileModal();
});
newFileModal.addEventListener('click', (e) => {
  if (e.target === newFileModal) hideNewFileModal();
});

// Start
initialize();
