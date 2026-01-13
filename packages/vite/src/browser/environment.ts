/**
 * Minimal Environment API for browser-vite (Vite 6 compatibility)
 *
 * The Environment API was introduced in Vite 6 to allow plugins to target
 * specific environments (client, SSR, etc.). This is a minimal implementation
 * for browser-vite that provides the necessary interfaces for plugin compatibility.
 */

import type { ResolvedConfig } from '../node/config'
import type { ModuleGraph } from '../node/server/moduleGraph'
import type { PluginContainer } from '../node/server/pluginContainer'
import type { TransformResult } from '../node/server/transformRequest'

/**
 * Environment mode - dev for development, build for production
 */
export type EnvironmentMode = 'dev' | 'build'

/**
 * Environment options for creating a new environment
 */
export interface EnvironmentOptions {
  name: string
  config: ResolvedConfig
  mode?: EnvironmentMode
}

/**
 * DevEnvironment represents a development environment in Vite 6
 * This is a minimal implementation for browser-vite
 */
export interface DevEnvironment {
  /** Environment name (e.g., 'client', 'ssr', 'browser') */
  name: string
  /** Resolved Vite configuration */
  config: ResolvedConfig
  /** Environment mode */
  mode: EnvironmentMode
  /** Module graph for this environment */
  moduleGraph: ModuleGraph
  /** Plugin container for this environment */
  pluginContainer: PluginContainer
  /** Transform a request URL to get the module content */
  transformRequest(url: string, options?: { ssr?: boolean }): Promise<TransformResult | null>
  /** Hot update handler */
  hot?: {
    send(payload: any): void
    on(event: string, handler: (...args: any[]) => void): void
  }
}

/**
 * Environment metadata used by plugins
 */
export interface EnvironmentMeta {
  /** Whether this environment is for SSR */
  ssr?: boolean
  /** Whether this environment is for the browser */
  browser?: boolean
  /** Custom environment-specific data */
  [key: string]: any
}

/**
 * Creates a browser-compatible DevEnvironment
 * This is used by browser-vite to provide environment context to plugins
 */
export function createBrowserEnvironment(
  options: EnvironmentOptions & {
    moduleGraph: ModuleGraph
    pluginContainer: PluginContainer
    transformRequest: DevEnvironment['transformRequest']
  }
): DevEnvironment {
  return {
    name: options.name,
    config: options.config,
    mode: options.mode || 'dev',
    moduleGraph: options.moduleGraph,
    pluginContainer: options.pluginContainer,
    transformRequest: options.transformRequest,
    hot: {
      send: (payload) => {
        // In browser-vite, HMR is handled via postMessage or custom mechanism
        if (typeof globalThis.postMessage === 'function') {
          globalThis.postMessage({ type: 'vite:hmr', payload }, '*')
        }
      },
      on: () => {
        // HMR event listeners are handled by the host application
      }
    }
  }
}

/**
 * Check if a plugin should apply to the given environment
 * This implements the applyToEnvironment hook behavior from Vite 6
 */
export function shouldApplyPlugin(
  plugin: { applyToEnvironment?: (env: DevEnvironment) => boolean },
  environment: DevEnvironment
): boolean {
  if (typeof plugin.applyToEnvironment === 'function') {
    return plugin.applyToEnvironment(environment)
  }
  // By default, plugins apply to all environments
  return true
}

/**
 * Filter plugins based on environment
 */
export function filterPluginsForEnvironment<T extends { applyToEnvironment?: (env: DevEnvironment) => boolean }>(
  plugins: T[],
  environment: DevEnvironment
): T[] {
  return plugins.filter(plugin => shouldApplyPlugin(plugin, environment))
}

/**
 * Default browser environment name
 */
export const BROWSER_ENVIRONMENT_NAME = 'browser'

/**
 * Create the default browser environment configuration
 */
export function getDefaultBrowserEnvironment(config: ResolvedConfig): Partial<DevEnvironment> {
  return {
    name: BROWSER_ENVIRONMENT_NAME,
    config,
    mode: config.command === 'build' ? 'build' : 'dev'
  }
}
