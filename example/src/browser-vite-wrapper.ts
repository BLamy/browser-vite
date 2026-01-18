/**
 * Browser-Vite Wrapper
 *
 * This wrapper provides a browser-compatible interface to browser-vite.
 * Uses OXC (Oxidation Compiler) for fast TypeScript/JSX transforms.
 */

import { transform as oxcTransform } from '@oxc-transform/binding-wasm32-wasi';

export interface TransformResult {
  code: string;
  map: any | null;
}

export interface ResolvedId {
  id: string;
  external?: boolean;
  meta?: Record<string, any>;
}

export interface VirtualFile {
  path: string;
  content: string;
  lastModified: number;
}

/**
 * BrowserVite - Main class for browser-based Vite functionality
 *
 * This is a simplified implementation that demonstrates the core concepts.
 * The actual browser-vite would use the full plugin container and module graph.
 */
export class BrowserVite {
  private initialized = false;
  private moduleGraph = new Map<string, VirtualFile>();
  private plugins: Array<{ name: string; transform?: Function; resolveId?: Function }> = [];
  private hmrCallbacks = new Map<string, Array<(module: any) => void>>();

  constructor() {
    // Initialize with core plugins
    this.plugins = [
      {
        name: 'vite:oxc',
        async transform(code: string, id: string) {
          if (id.endsWith('.ts') || id.endsWith('.tsx')) {
            const isTsx = id.endsWith('.tsx');
            const result = await oxcTransform(id, code, {
              typescript: {
                onlyRemoveTypeImports: false,
                declaration: false,
              },
              ...(isTsx && {
                jsx: {
                  runtime: 'automatic',
                  importSource: 'react',
                },
              }),
              sourcemap: true,
            });

            if (result.errors && result.errors.length > 0) {
              console.error('[OXC] Transform errors:', result.errors);
              throw new Error(result.errors.map((e: any) => e.message).join('\n'));
            }

            return {
              code: result.code,
              map: result.map || null,
            };
          }
          return null;
        },
      },
      {
        name: 'vite:jsx',
        async transform(code: string, id: string) {
          if (id.endsWith('.jsx')) {
            const result = await oxcTransform(id, code, {
              jsx: {
                runtime: 'automatic',
                importSource: 'react',
              },
              sourcemap: true,
            });

            if (result.errors && result.errors.length > 0) {
              console.error('[OXC] Transform errors:', result.errors);
              throw new Error(result.errors.map((e: any) => e.message).join('\n'));
            }

            return {
              code: result.code,
              map: result.map || null,
            };
          }
          return null;
        },
      },
      {
        name: 'vite:css',
        async transform(code: string, id: string) {
          if (id.endsWith('.css')) {
            // Wrap CSS in a JS module that injects styles
            const escapedCss = JSON.stringify(code);
            return {
              code: `
const css = ${escapedCss};
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);
export default css;
              `.trim(),
              map: null,
            };
          }
          return null;
        },
      },
      {
        name: 'vite:resolve',
        resolveId(id: string, importer?: string) {
          // Simple resolution logic
          if (id.startsWith('./') || id.startsWith('../') || id.startsWith('/')) {
            return { id: id, external: false };
          }
          // Node modules
          if (!id.startsWith('.')) {
            return { id: `/node_modules/${id}`, external: true };
          }
          return null;
        },
      },
    ];
  }

  /**
   * Initialize browser-vite
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // OXC WASM is loaded automatically when the module is imported
    // No explicit initialization needed like esbuild
    this.initialized = true;
    console.log('[BrowserVite] Initialized with OXC transformer, plugins:', this.plugins.map(p => p.name));
  }

  /**
   * Transform source code
   */
  async transform(code: string, id: string): Promise<TransformResult> {
    if (!this.initialized) {
      throw new Error('BrowserVite not initialized. Call init() first.');
    }

    let result: TransformResult = { code, map: null };

    // Run through plugins
    for (const plugin of this.plugins) {
      if (plugin.transform) {
        const pluginResult = await plugin.transform(code, id);
        if (pluginResult) {
          result = {
            code: pluginResult.code || result.code,
            map: pluginResult.map || result.map,
          };
          code = result.code; // Chain transformations
        }
      }
    }

    // Store in module graph
    this.moduleGraph.set(id, {
      path: id,
      content: result.code,
      lastModified: Date.now(),
    });

    return result;
  }

  /**
   * Resolve module ID
   */
  async resolveId(id: string, importer?: string): Promise<ResolvedId | null> {
    if (!this.initialized) {
      throw new Error('BrowserVite not initialized. Call init() first.');
    }

    for (const plugin of this.plugins) {
      if (plugin.resolveId) {
        const result = await plugin.resolveId(id, importer);
        if (result) {
          return typeof result === 'string' ? { id: result } : result;
        }
      }
    }

    return null;
  }

  /**
   * Check if a plugin is loaded
   */
  hasPlugin(name: string): boolean {
    return this.plugins.some(p => p.name === name);
  }

  /**
   * Get all plugin names
   */
  getPluginNames(): string[] {
    return this.plugins.map(p => p.name);
  }

  /**
   * Simulate HMR update
   */
  async handleHMRUpdate(path: string, newCode: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('BrowserVite not initialized. Call init() first.');
    }

    try {
      // Transform the new code
      const result = await this.transform(newCode, path);

      // Update module graph
      this.moduleGraph.set(path, {
        path,
        content: result.code,
        lastModified: Date.now(),
      });

      // Trigger HMR callbacks
      const callbacks = this.hmrCallbacks.get(path) || [];
      for (const callback of callbacks) {
        callback({ code: result.code });
      }

      console.log(`[HMR] Updated: ${path}`);
      return true;
    } catch (error) {
      console.error(`[HMR] Failed to update ${path}:`, error);
      return false;
    }
  }

  /**
   * Register HMR callback
   */
  onHMRUpdate(path: string, callback: (module: any) => void): void {
    const callbacks = this.hmrCallbacks.get(path) || [];
    callbacks.push(callback);
    this.hmrCallbacks.set(path, callbacks);
  }

  /**
   * Get module from graph
   */
  getModule(path: string): VirtualFile | undefined {
    return this.moduleGraph.get(path);
  }

  /**
   * Get all modules
   */
  getAllModules(): VirtualFile[] {
    return Array.from(this.moduleGraph.values());
  }

  /**
   * Add a custom plugin
   */
  addPlugin(plugin: { name: string; transform?: Function; resolveId?: Function }): void {
    this.plugins.push(plugin);
  }

  /**
   * Clear module graph
   */
  clearModuleGraph(): void {
    this.moduleGraph.clear();
  }
}

// Export a singleton for convenience
export const browserVite = new BrowserVite();
