# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ws-scrcpy is a web client for [Genymobile/scrcpy](https://github.com/Genymobile/scrcpy) that enables remote control of Android devices (and experimentally iOS) through a browser. It uses WebSockets to stream H264 video and handle control messages.

## Common Commands

```bash
# Install dependencies
npm install

# Build and start (production)
npm start

# Development build only
npm run dist:dev

# Production build only
npm run dist:prod

# Clean build artifacts
npm run clean

# Lint check
npm run lint

# Lint and auto-fix
npm run format
```

## Architecture

### Directory Structure

```
src/
├── app/           # Frontend (browser) code
│   ├── client/    # Base client classes, host tracking
│   ├── player/    # Video decoders (WebCodecs, MSE, Broadway, TinyH264)
│   ├── googDevice/# Android device handling (StreamClientScrcpy)
│   ├── applDevice/# iOS device handling
│   ├── toolbox/   # Device-specific toolbars
│   └── ui/        # UI components
├── server/        # Backend (Node.js) code
│   ├── mw/        # WebSocket middleware
│   └── goog-device/# Android services (ADB, file push, devtools)
├── common/        # Shared types and utilities (ChannelCode, ControlMessages)
├── packages/      # Reusable packages (multiplexer)
└── types/         # TypeScript type definitions
```

### Build System

Webpack builds both frontend and backend:
- **Frontend entry**: `src/app/index.ts` → `dist/public/bundle.js`
- **Backend entry**: `src/server/index.ts` → `dist/index.js`

### Conditional Compilation

Uses `ifdef-loader` with feature flags defined in `webpack/default.build.config.json`. Override in `build.config.override.json`:
- `INCLUDE_GOOG` - Android support (default: true)
- `INCLUDE_APPL` - iOS support (default: false)
- `USE_WEBCODECS`, `USE_H264_CONVERTER`, `USE_BROADWAY`, `USE_TINY_H264` - Video decoders
- `INCLUDE_ADB_SHELL`, `INCLUDE_DEV_TOOLS`, `INCLUDE_FILE_LISTING` - Android tools

### Key Patterns

**Video Players**: Pluggable decoder implementations in `src/app/player/`. Each player extends a base interface and handles H264 decoding differently (hardware via WebCodecs, software via WASM).

**WebSocket Communication**: Uses a custom multiplexer (`src/packages/multiplexer/`) to handle multiple channels (video stream, shell, devtools) over a single WebSocket connection.

**Control Messages**: Serializable message types in `src/app/controlMessage/` for touch, keyboard, scroll, and device commands.

**Middleware Pattern**: Server middleware in `src/server/mw/` processes WebSocket requests - includes proxying, device tracking, and shell handling.

## TypeScript Configuration

- Strict mode enabled
- Target: ES5 for browser compatibility
- `noUnusedLocals` and `noUnusedParameters` enforced
- Path alias: `*` maps to `typings/*`

## ESLint Configuration

Uses `@typescript-eslint` with Prettier integration. Run `npm run lint` to check, `npm run format` to auto-fix.
