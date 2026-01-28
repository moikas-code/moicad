# AGENTS.md

This file contains guidelines and commands for agentic coding agents working on the moicad desktop project.

## Project Overview

This is a Tauri-based desktop application for moicad - a Web-based OpenSCAD clone with real-time 3D preview and WASM-powered geometry engine. The project uses Next.js for the frontend and Rust for the desktop wrapper.

## Build & Development Commands

### Frontend (Next.js)
All frontend commands should be run from the project root or `frontend/` directory:

```bash
# Development
npm run dev                # Start Next.js dev server (from root)
cd frontend && npm run dev # Start Next.js dev server (from frontend)

# Build
npm run build              # Build Next.js for production (from root)
cd frontend && npm run build # Build Next.js for production (from frontend)

# Linting & Type Checking
cd frontend && npm run lint        # Run ESLint
cd frontend && npm run type-check  # Run TypeScript type checking

# Production
npm run start             # Start production server
```

### Desktop (Tauri)
```bash
# Development with Tauri
npm run dev:tauri         # Start Tauri dev with frontend
cargo tauri dev           # Alternative Tauri dev command

# Build desktop app
npm run build:tauri       # Build for current platform
npm run build:tauri:linux # Build for Linux x86_64
npm run build:tauri:mac   # Build for macOS ARM64
npm run build:tauri:win   # Build for Windows x86_64
```

### Testing
Currently no test framework is configured in this project. Tests should be added with appropriate framework configuration.

## Code Style & Conventions

### Import Style
- Use ES6 imports/exports
- Place external library imports first, then internal imports using `@/` alias
- Group React imports separately
- Example:
```typescript
import React, { useEffect, useState } from 'react';
import { SceneManager } from '@/lib/three-utils';
import { GeometryResponse } from '@/lib/api-client';
```

### TypeScript Configuration
- Strict mode enabled
- Path aliases configured:
  - `@/*` → `./`
  - `@/components/*` → `./components/*`
  - `@/lib/*` → `./lib/*`
  - `@/hooks/*` → `./hooks/*`

### Component Conventions
- Use functional components with React hooks
- Components should be PascalCase
- Props interfaces should be defined above the component
- Use `"use client";` directive for client-side components
- Example:
```typescript
"use client";

import { useEffect, useRef } from 'react';

interface ViewportProps {
  geometry: GeometryResponse | null;
  printerSize?: PrinterPreset;
}

export default function Viewport({ geometry, printerSize }: ViewportProps) {
  // Component logic
}
```

### Hook Conventions
- Custom hooks should start with `use`
- Hook files should be in `hooks/` directory
- Return state and setter functions
- Example:
```typescript
import { useState, useCallback } from 'react';

export function useGeometry() {
  const [state, setState] = useState<GeometryState>({
    geometry: null,
    loading: false,
    error: null,
  });

  const setGeometry = useCallback((geometry: GeometryResponse | null) => {
    setState(prev => ({ ...prev, geometry, error: null }));
  }, []);

  return { ...state, setGeometry };
}
```

### Styling
- Use Tailwind CSS for all styling
- Follow the established dark theme (Blender-inspired)
- Custom component classes defined in `globals.css`:
  - `.btn-primary`, `.btn-secondary`, `.btn-danger`
  - `.input-field`, `.error-message`, `.success-message`
  - `.panel`, `.layout-container`

### Error Handling
- Use try-catch blocks for async operations
- Provide user-friendly error messages
- Log errors to console for debugging
- Example:
```typescript
try {
  const response = await fetch(`${API_BASE}/api/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  
  if (!response.ok) {
    throw new Error(`Evaluation failed: ${response.statusText}`);
  }
  
  return await response.json();
} catch (error) {
  console.error('Evaluation error:', error);
  throw new Error(`Failed to evaluate code: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

### File Naming
- Components: `PascalCase.tsx`
- Hooks: `camelCase.ts`
- Utilities/Lib: `camelCase.ts`
- Types/interfaces: `camelCase.ts` or within component files

### API Client
- All API calls should use the centralized API client in `frontend/lib/api-client.ts`
- The API client handles Tauri vs web environment detection
- Base URL is `http://localhost:42069` for Tauri, configurable via `NEXT_PUBLIC_API_URL` for web

### Three.js & 3D Graphics
- Use Three.js for 3D rendering
- SceneManager class handles scene setup and geometry rendering
- Support for object highlighting and selection
- Geometry data structure includes vertices, indices, normals, and bounds

### State Management
- Use React hooks for local state
- Context providers for shared state (e.g., ViewportControlsContext)
- Avoid external state management libraries unless necessary

## Environment & Dependencies

### Node Version
- Requires Node.js >= 18.0.0
- Bun >= 1.0.0 (optional but supported)

### Key Dependencies
- **Frontend**: Next.js 16.1.4, React 19.2.3, Three.js 0.182.0, Monaco Editor 0.50.0, Tailwind CSS 3.4.0
- **Desktop**: Tauri 2, Rust 2021 edition
- **3D Engine**: three-bvh-csg for CSG operations

### Development Tools
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting (2 spaces, single quotes, no semicolons)
- Tailwind CSS for styling

## Platform-Specific Considerations

### Tauri Desktop
- Backend API runs on localhost:42069
- File system access through Tauri APIs
- Native window controls and menu bar
- Resource bundling for standalone executables

### Web Mode
- Configurable API endpoint via environment variables
- No file system access (browser sandbox)
- Responsive design considerations
- PWA capabilities possible

## Testing Strategy

When adding tests:
1. Choose appropriate framework (Jest, Vitest, or React Testing Library)
2. Configure test files with `.test.ts` or `.spec.ts` suffix
3. Add test scripts to package.json
4. Follow existing code patterns and conventions
5. Test both happy path and error scenarios

## Performance Guidelines

- Use React.memo for expensive components
- Implement proper cleanup in useEffect
- Debounce resize events and user input
- Use ResizeObserver for container size changes
- Optimize Three.js rendering with proper disposal