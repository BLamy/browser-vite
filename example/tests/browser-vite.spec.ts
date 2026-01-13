import { test, expect, Page } from '@playwright/test';

/**
 * Browser-Vite E2E Tests
 *
 * These tests verify that browser-vite's core functionality works correctly
 * in the browser environment.
 */

// Helper to wait for browser-vite initialization
async function waitForBrowserViteReady(page: Page, timeout = 10000): Promise<void> {
  await page.waitForFunction(
    () => (window as any).browserViteReady === true || (window as any).browserViteError,
    { timeout }
  );

  const error = await page.evaluate(() => (window as any).browserViteError);
  if (error) {
    throw new Error(`Browser-vite initialization failed: ${error}`);
  }
}

test.describe('Browser-Vite Initialization', () => {
  test('should initialize successfully', async ({ page }) => {
    await page.goto('/');
    await waitForBrowserViteReady(page);

    // Check status shows success
    const status = page.locator('#status');
    await expect(status).toHaveClass(/success/);
    await expect(status).toContainText('initialized successfully');
  });

  test('should enable action buttons after initialization', async ({ page }) => {
    await page.goto('/');
    await waitForBrowserViteReady(page);

    // All buttons should be enabled
    await expect(page.locator('#runTests')).toBeEnabled();
    await expect(page.locator('#transformCode')).toBeEnabled();
    await expect(page.locator('#testHMR')).toBeEnabled();
  });

  test('should expose browserVite instance on window', async ({ page }) => {
    await page.goto('/');
    await waitForBrowserViteReady(page);

    const hasBrowserVite = await page.evaluate(() => {
      const bv = (window as any).browserVite;
      return bv && typeof bv.transform === 'function' && typeof bv.resolveId === 'function';
    });

    expect(hasBrowserVite).toBe(true);
  });
});

test.describe('Browser-Vite Test Suite', () => {
  test('should run all tests and pass', async ({ page }) => {
    await page.goto('/');
    await waitForBrowserViteReady(page);

    // Click run tests button
    await page.click('#runTests');

    // Wait for tests to complete
    await page.waitForFunction(
      () => (window as any).allTestsPassed !== undefined,
      { timeout: 30000 }
    );

    // Check all tests passed
    const allPassed = await page.evaluate(() => (window as any).allTestsPassed);
    expect(allPassed).toBe(true);
  });

  test('should display individual test results', async ({ page }) => {
    await page.goto('/');
    await waitForBrowserViteReady(page);

    await page.click('#runTests');

    // Wait for test results
    await page.waitForSelector('[data-testid="test-typescript-transform"]');

    // Check that all test results are shown
    const testResults = page.locator('.test-result');
    await expect(testResults).toHaveCount(6);

    // Verify each test
    const tests = [
      'test-typescript-transform',
      'test-jsx-transform',
      'test-css-processing',
      'test-module-resolution',
      'test-plugin-system',
      'test-source-maps'
    ];

    for (const testId of tests) {
      const result = page.locator(`[data-testid="${testId}"]`);
      await expect(result).toHaveAttribute('data-passed', 'true');
    }
  });
});

test.describe('Code Transformation', () => {
  test('should transform TypeScript code', async ({ page }) => {
    await page.goto('/');
    await waitForBrowserViteReady(page);

    const result = await page.evaluate(async () => {
      const bv = (window as any).browserVite;
      const code = `const greeting: string = "Hello"; export { greeting };`;
      return await bv.transform(code, '/test.ts');
    });

    // TypeScript types should be removed
    expect(result.code).not.toContain(': string');
    expect(result.code).toContain('greeting');
  });

  test('should transform JSX code', async ({ page }) => {
    await page.goto('/');
    await waitForBrowserViteReady(page);

    const result = await page.evaluate(async () => {
      const bv = (window as any).browserVite;
      const code = `export function App() { return <div>Hello</div>; }`;
      return await bv.transform(code, '/App.jsx');
    });

    // JSX should be transformed to function calls
    expect(result.code).not.toContain('<div>');
    expect(result.code).toMatch(/jsx|createElement/);
  });

  test('should transform TSX code', async ({ page }) => {
    await page.goto('/');
    await waitForBrowserViteReady(page);

    const result = await page.evaluate(async () => {
      const bv = (window as any).browserVite;
      const code = `
        interface Props { name: string; }
        export function Greet({ name }: Props) {
          return <span>Hello, {name}</span>;
        }
      `;
      return await bv.transform(code, '/Greet.tsx');
    });

    // Types and JSX should both be transformed
    expect(result.code).not.toContain('interface Props');
    expect(result.code).not.toContain(': Props');
    expect(result.code).not.toContain('<span>');
  });

  test('should process CSS into JS module', async ({ page }) => {
    await page.goto('/');
    await waitForBrowserViteReady(page);

    const result = await page.evaluate(async () => {
      const bv = (window as any).browserVite;
      const css = `.button { color: red; padding: 10px; }`;
      return await bv.transform(css, '/styles.css');
    });

    // CSS should be wrapped in a JS module
    expect(result.code).toContain('document.createElement');
    expect(result.code).toContain('style');
    expect(result.code).toContain('.button');
  });

  test('should generate source maps', async ({ page }) => {
    await page.goto('/');
    await waitForBrowserViteReady(page);

    const result = await page.evaluate(async () => {
      const bv = (window as any).browserVite;
      const code = `const x: number = 1; export { x };`;
      return await bv.transform(code, '/test.ts');
    });

    expect(result.map).toBeTruthy();
  });
});

test.describe('Module Resolution', () => {
  test('should resolve relative imports', async ({ page }) => {
    await page.goto('/');
    await waitForBrowserViteReady(page);

    const result = await page.evaluate(async () => {
      const bv = (window as any).browserVite;
      return await bv.resolveId('./utils', '/src/main.ts');
    });

    expect(result).toBeTruthy();
    expect(result.id).toBe('./utils');
  });

  test('should resolve node module imports', async ({ page }) => {
    await page.goto('/');
    await waitForBrowserViteReady(page);

    const result = await page.evaluate(async () => {
      const bv = (window as any).browserVite;
      return await bv.resolveId('react', '/src/main.tsx');
    });

    expect(result).toBeTruthy();
    expect(result.id).toContain('react');
    expect(result.external).toBe(true);
  });
});

test.describe('HMR (Hot Module Replacement)', () => {
  test('should handle HMR updates', async ({ page }) => {
    await page.goto('/');
    await waitForBrowserViteReady(page);

    // Click HMR test button
    await page.click('#testHMR');

    // Wait for HMR test to complete
    await page.waitForFunction(
      () => (window as any).hmrTestPassed !== undefined,
      { timeout: 10000 }
    );

    const passed = await page.evaluate(() => (window as any).hmrTestPassed);
    expect(passed).toBe(true);
  });

  test('should update module graph on HMR', async ({ page }) => {
    await page.goto('/');
    await waitForBrowserViteReady(page);

    const result = await page.evaluate(async () => {
      const bv = (window as any).browserVite;

      // Initial transform
      await bv.transform('export const v = 1;', '/mod.ts');
      const before = bv.getModule('/mod.ts')?.content;

      // HMR update
      await bv.handleHMRUpdate('/mod.ts', 'export const v = 2;');
      const after = bv.getModule('/mod.ts')?.content;

      return { before, after };
    });

    expect(result.before).toContain('1');
    expect(result.after).toContain('2');
  });
});

test.describe('Plugin System', () => {
  test('should have core plugins loaded', async ({ page }) => {
    await page.goto('/');
    await waitForBrowserViteReady(page);

    const plugins = await page.evaluate(() => {
      const bv = (window as any).browserVite;
      return bv.getPluginNames();
    });

    expect(plugins).toContain('vite:esbuild');
    expect(plugins).toContain('vite:jsx');
    expect(plugins).toContain('vite:css');
    expect(plugins).toContain('vite:resolve');
  });

  test('should allow adding custom plugins', async ({ page }) => {
    await page.goto('/');
    await waitForBrowserViteReady(page);

    const result = await page.evaluate(async () => {
      const bv = (window as any).browserVite;

      // Add custom plugin
      bv.addPlugin({
        name: 'custom-test-plugin',
        transform(code: string, id: string) {
          if (id.endsWith('.custom')) {
            return { code: `/* Custom: ${code} */`, map: null };
          }
          return null;
        }
      });

      const hasPlugin = bv.hasPlugin('custom-test-plugin');
      const transformed = await bv.transform('test content', '/file.custom');

      return { hasPlugin, transformed };
    });

    expect(result.hasPlugin).toBe(true);
    expect(result.transformed.code).toContain('/* Custom:');
  });
});

test.describe('Transform Sample Code Button', () => {
  test('should transform and display sample code', async ({ page }) => {
    await page.goto('/');
    await waitForBrowserViteReady(page);

    // Click transform button
    await page.click('#transformCode');

    // Wait for transform result
    await page.waitForFunction(
      () => (window as any).lastTransformResult !== undefined,
      { timeout: 10000 }
    );

    // Check result was stored
    const hasResult = await page.evaluate(() => {
      const result = (window as any).lastTransformResult;
      return result && result.code && result.code.length > 0;
    });

    expect(hasResult).toBe(true);

    // Check that transformed code is displayed in app area
    const appContent = await page.locator('#app').textContent();
    expect(appContent).toContain('Transformed Code');
  });
});
