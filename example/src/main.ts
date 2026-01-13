/**
 * Browser-Vite Example Application
 *
 * This example demonstrates browser-vite's capabilities:
 * 1. Code transformation (TypeScript, JSX)
 * 2. Plugin system
 * 3. Module graph management
 * 4. HMR simulation
 */

import { BrowserVite } from './browser-vite-wrapper';

// UI Elements
const statusEl = document.getElementById('status')!;
const logsEl = document.getElementById('logs')!;
const appEl = document.getElementById('app')!;
const testResultsEl = document.getElementById('testResults')!;
const runTestsBtn = document.getElementById('runTests') as HTMLButtonElement;
const transformCodeBtn = document.getElementById('transformCode') as HTMLButtonElement;
const testHMRBtn = document.getElementById('testHMR') as HTMLButtonElement;

// Logging utility
function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logsEl.appendChild(entry);
  logsEl.scrollTop = logsEl.scrollHeight;
  console.log(`[${type.toUpperCase()}]`, message);
}

function setStatus(message: string, type: 'success' | 'error' | 'pending') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function addTestResult(name: string, passed: boolean, details?: string) {
  const result = document.createElement('div');
  result.className = `test-result ${passed ? 'pass' : 'fail'}`;
  result.innerHTML = `
    <strong>${passed ? '✓' : '✗'} ${name}</strong>
    ${details ? `<br><small>${details}</small>` : ''}
  `;
  result.setAttribute('data-testid', `test-${name.toLowerCase().replace(/\s+/g, '-')}`);
  result.setAttribute('data-passed', String(passed));
  testResultsEl.appendChild(result);
}

// Sample code to transform
const sampleTypeScript = `
// TypeScript code with types
interface User {
  id: number;
  name: string;
  email: string;
}

const greet = (user: User): string => {
  return \`Hello, \${user.name}!\`;
};

export { greet, User };
`;

const sampleJSX = `
// React JSX component
import React, { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="counter">
      <h2>Counter: {count}</h2>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
}
`;

const sampleCSS = `
.counter {
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  color: white;
}

.counter button {
  margin-top: 10px;
  padding: 8px 16px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
`;

// Initialize browser-vite
let browserVite: BrowserVite | null = null;

async function initialize() {
  try {
    log('Initializing browser-vite...');
    browserVite = new BrowserVite();
    await browserVite.init();

    setStatus('Browser-vite initialized successfully!', 'success');
    log('Browser-vite ready!', 'success');

    // Enable buttons
    runTestsBtn.disabled = false;
    transformCodeBtn.disabled = false;
    testHMRBtn.disabled = false;

    // Expose for Playwright
    (window as any).browserVite = browserVite;
    (window as any).browserViteReady = true;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`Initialization failed: ${message}`, 'error');
    log(`Error: ${message}`, 'error');
    (window as any).browserViteError = message;
  }
}

// Test functions
async function runAllTests() {
  if (!browserVite) return;

  testResultsEl.innerHTML = '';
  log('Running all tests...', 'info');

  // Test 1: TypeScript transformation
  try {
    log('Test 1: TypeScript transformation...');
    const result = await browserVite.transform(sampleTypeScript, '/test.ts');
    const hasNoTypes = !result.code.includes(': User') && !result.code.includes(': string');
    addTestResult('TypeScript Transform', hasNoTypes,
      hasNoTypes ? 'Types successfully removed' : 'Types still present in output');
    log(`TypeScript transform: ${hasNoTypes ? 'PASS' : 'FAIL'}`, hasNoTypes ? 'success' : 'error');
  } catch (e) {
    addTestResult('TypeScript Transform', false, String(e));
    log(`TypeScript transform error: ${e}`, 'error');
  }

  // Test 2: JSX transformation
  try {
    log('Test 2: JSX transformation...');
    const result = await browserVite.transform(sampleJSX, '/Counter.jsx');
    const hasJSXRuntime = result.code.includes('jsx') || result.code.includes('createElement');
    addTestResult('JSX Transform', hasJSXRuntime,
      hasJSXRuntime ? 'JSX compiled to function calls' : 'JSX not transformed');
    log(`JSX transform: ${hasJSXRuntime ? 'PASS' : 'FAIL'}`, hasJSXRuntime ? 'success' : 'error');
  } catch (e) {
    addTestResult('JSX Transform', false, String(e));
    log(`JSX transform error: ${e}`, 'error');
  }

  // Test 3: CSS handling
  try {
    log('Test 3: CSS handling...');
    const result = await browserVite.transform(sampleCSS, '/styles.css');
    const isProcessed = result.code.length > 0;
    addTestResult('CSS Processing', isProcessed,
      isProcessed ? 'CSS processed successfully' : 'CSS processing failed');
    log(`CSS processing: ${isProcessed ? 'PASS' : 'FAIL'}`, isProcessed ? 'success' : 'error');
  } catch (e) {
    addTestResult('CSS Processing', false, String(e));
    log(`CSS processing error: ${e}`, 'error');
  }

  // Test 4: Module resolution
  try {
    log('Test 4: Module resolution...');
    const resolved = await browserVite.resolveId('react', '/src/main.tsx');
    const isResolved = resolved !== null;
    addTestResult('Module Resolution', isResolved,
      isResolved ? `Resolved to: ${resolved?.id?.slice(0, 50)}...` : 'Failed to resolve');
    log(`Module resolution: ${isResolved ? 'PASS' : 'FAIL'}`, isResolved ? 'success' : 'error');
  } catch (e) {
    addTestResult('Module Resolution', false, String(e));
    log(`Module resolution error: ${e}`, 'error');
  }

  // Test 5: Plugin system
  try {
    log('Test 5: Plugin system...');
    const pluginWorking = browserVite.hasPlugin('vite:esbuild');
    addTestResult('Plugin System', pluginWorking,
      pluginWorking ? 'Core plugins loaded' : 'Plugins not loaded');
    log(`Plugin system: ${pluginWorking ? 'PASS' : 'FAIL'}`, pluginWorking ? 'success' : 'error');
  } catch (e) {
    addTestResult('Plugin System', false, String(e));
    log(`Plugin system error: ${e}`, 'error');
  }

  // Test 6: Source maps
  try {
    log('Test 6: Source maps...');
    const result = await browserVite.transform(sampleTypeScript, '/test.ts');
    const hasSourceMap = result.map !== null && result.map !== undefined;
    addTestResult('Source Maps', hasSourceMap,
      hasSourceMap ? 'Source map generated' : 'No source map');
    log(`Source maps: ${hasSourceMap ? 'PASS' : 'FAIL'}`, hasSourceMap ? 'success' : 'error');
  } catch (e) {
    addTestResult('Source Maps', false, String(e));
    log(`Source maps error: ${e}`, 'error');
  }

  log('All tests completed!', 'success');

  // Set overall result for Playwright
  const results = testResultsEl.querySelectorAll('.test-result');
  const allPassed = Array.from(results).every(r => r.getAttribute('data-passed') === 'true');
  (window as any).allTestsPassed = allPassed;
}

async function transformSampleCode() {
  if (!browserVite) return;

  log('Transforming sample React component...');

  try {
    const result = await browserVite.transform(sampleJSX, '/Counter.tsx');
    log('Transformation successful!', 'success');
    log(`Output (first 200 chars): ${result.code.slice(0, 200)}...`);

    // Display in app area
    appEl.innerHTML = `
      <h3>Transformed Code:</h3>
      <pre style="background: #0a0a15; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px;">${escapeHtml(result.code)}</pre>
    `;

    (window as any).lastTransformResult = result;
  } catch (e) {
    log(`Transform error: ${e}`, 'error');
  }
}

async function testHMR() {
  if (!browserVite) return;

  log('Testing HMR simulation...');

  try {
    // Simulate a file change
    const originalCode = `export const message = "Hello";`;
    const updatedCode = `export const message = "Hello, Updated!";`;

    // Transform original
    await browserVite.transform(originalCode, '/message.ts');
    log('Original module registered');

    // Simulate update
    const updateResult = await browserVite.handleHMRUpdate('/message.ts', updatedCode);
    log(`HMR update result: ${updateResult ? 'Success' : 'Failed'}`, updateResult ? 'success' : 'error');

    appEl.innerHTML = `
      <h3>HMR Test Result:</h3>
      <p>File: /message.ts</p>
      <p>Original: <code>${originalCode}</code></p>
      <p>Updated: <code>${updatedCode}</code></p>
      <p>HMR Status: <strong style="color: ${updateResult ? '#81c784' : '#e57373'}">${updateResult ? 'SUCCESS' : 'FAILED'}</strong></p>
    `;

    (window as any).hmrTestPassed = updateResult;
  } catch (e) {
    log(`HMR error: ${e}`, 'error');
    (window as any).hmrTestPassed = false;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event listeners
runTestsBtn.addEventListener('click', runAllTests);
transformCodeBtn.addEventListener('click', transformSampleCode);
testHMRBtn.addEventListener('click', testHMR);

// Initialize on load
initialize();
