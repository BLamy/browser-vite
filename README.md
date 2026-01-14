<p align="center">
  <img src="https://raw.github.com/divriots/browser-vite/master/browser-vite.svg" height="200px">
</p>
<br/>
<p align="center">
  <a href="https://npmjs.com/package/browser-vite"><img src="https://img.shields.io/npm/v/browser-vite.svg" alt="npm package"></a>
  <a href="https://nodejs.org/en/about/releases/"><img src="https://img.shields.io/node/v/browser-vite.svg" alt="node compatibility"></a>
  <br/>
</p>

# browser-vite ⚡

Run Vite in the browser! This is a fork of Vite that compiles to a browser-compatible bundle, enabling you to use Vite's powerful transformation pipeline directly in web applications.

**Version 6.0** - Modernized fork based on Vite 6 with Rollup 4 support.

## Features

- TypeScript/TSX/JSX transformation via esbuild-wasm
- CSS processing and injection
- Module resolution and plugin system
- Hot Module Replacement (HMR) support
- Works entirely in the browser - no server required

## Installation

```bash
npm install browser-vite
# or
npm install vite@npm:browser-vite  # alias as 'vite' for plugin compatibility
```

## Quick Start

```typescript
import { createPluginContainer, ModuleGraph, transformRequest } from 'browser-vite';

// Or use esbuild-wasm directly for simple transforms
import * as esbuild from 'esbuild-wasm';

await esbuild.initialize({
  wasmURL: 'https://unpkg.com/esbuild-wasm@0.24.2/esbuild.wasm',
});

// Transform TypeScript/TSX
const result = await esbuild.transform(code, {
  loader: 'tsx',
  sourcemap: true,
  target: 'es2020',
});

console.log(result.code);
```

## Live Editor Example

See the `/example` directory for a complete CodeMirror-based live editor with:
- Real-time TypeScript/JSX transformation
- HMR-style preview updates
- CSS live preview

```bash
cd example
npm install
npm run dev
```

## Package Entry Points

| Entry | Description |
|-------|-------------|
| `browser-vite` | Browser bundle (default) |
| `browser-vite/dist/browser/index.js` | Explicit browser entry |
| `browser-vite/dist/node/index.js` | Node.js entry |

## Browser Shims

The browser build includes shims for Node.js modules:
- `fs` - No-op (use memfs or virtual FS)
- `path` - Browser-compatible path operations
- `chokidar` - No-op watcher stub
- `chalk/picocolors` - Identity functions
- And more...

## Usage with Service Worker

For full Vite dev server emulation in the browser, you'll need:

1. **Service Worker** - Intercept requests and route to Vite
2. **Virtual File System** - Use `memfs` or similar
3. **Plugin Container** - Process transforms

```typescript
import {
  createPluginContainer,
  ModuleGraph,
  transformRequest,
  resolveConfig,
} from 'browser-vite';

// Create Vite config
const config = await resolveConfig({
  plugins: [/* your plugins */],
  root: '/virtual',
}, 'serve');

// Create plugin container
const container = await createPluginContainer(config);
const moduleGraph = new ModuleGraph((url) => container.resolveId(url));

// Transform requests
const result = await transformRequest('/src/App.tsx', {
  config,
  pluginContainer: container,
  moduleGraph,
});
```

## Changes from Upstream Vite

This fork modifies Vite to run in browsers:

- **Browser bundle** - Rollup config generates browser-compatible output
- **Node.js shims** - CLI-only deps (chalk, debug, fs) are shimmed
- **No file watching** - chokidar/fsevents stubbed out
- **No dev server** - Use service worker + virtual FS instead
- **Rollup 4** - Updated for modern Rollup compatibility
- **ESM-first** - Optimized for ES modules

## Version History

| Version | Base Vite | Key Changes |
|---------|-----------|-------------|
| 6.0.0-browser.1 | Vite 6.0 | Rollup 4, Environment API, picocolors |
| 2.7.0-browser.x | Vite 2.7 | Original browser-vite |

## Contributing

Issues and PRs welcome at [github.com/BLamy/browser-vite](https://github.com/BLamy/browser-vite)

## Credits

- Original browser-vite by [‹div›RIOTS](https://divRIOTS.com)
- Vite by [Evan You](https://github.com/yyx990803) and the Vite team

## License

MIT
