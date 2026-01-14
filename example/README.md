# Browser-Vite Example

This example demonstrates browser-vite's capabilities with a Playwright test suite.

## Features Tested

- **TypeScript Transformation** - Strips types and compiles to ES2020
- **JSX Transformation** - Converts JSX to function calls
- **CSS Processing** - Wraps CSS in JS modules for injection
- **Module Resolution** - Resolves relative and node_modules imports
- **Plugin System** - Core plugins and custom plugin support
- **HMR (Hot Module Replacement)** - Module graph updates
- **Source Maps** - Generated for transformed code

## Running the Example

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Visit http://localhost:5173 and click the "Run Tests" button to see all browser-vite tests pass.

## Running Playwright Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run tests headless
npm test

# Run tests with UI
npm run test:ui

# Run tests in headed mode
npm run test:headed
```

## Test Structure

- `tests/browser-vite.spec.ts` - Comprehensive E2E tests covering:
  - Initialization
  - Code transformation (TS, JSX, TSX, CSS)
  - Module resolution
  - HMR updates
  - Plugin system
  - UI interactions

## Architecture

```
example/
├── src/
│   ├── main.ts                 # Main test runner UI
│   └── browser-vite-wrapper.ts # Browser-vite interface wrapper
├── tests/
│   └── browser-vite.spec.ts    # Playwright E2E tests
├── index.html                  # Test UI
├── vite.config.ts             # Vite configuration
└── playwright.config.ts       # Playwright configuration
```
