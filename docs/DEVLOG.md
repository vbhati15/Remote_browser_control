# Development Log

This document records the main steps taken while building the project.

## 2026-06-08

- Initialized the repository and added project configuration files.
- Built the remote browser control UI in Next.js with a canvas-based viewport.
- Implemented the Node server WebSocket endpoint for control messages.
- Added Docker tooling to build and run Chromium in a local container.
- Integrated Chrome DevTools Protocol to start screencast and forward input events.
- Added an automated smoke test to validate startup, navigation, streaming, and input.
- Added documentation files: `CHANGELOG.md`, `DEVNOTES.md`, and `README.md`.
- Added a GitHub Actions workflow to run the smoke test automatically on push.

## 2026-06-08 (Updates)

- Fixed `.gitignore` encoding issue (literal escape sequences replaced with proper newlines).
- Added refresh button to UI for page reload functionality.
- Implemented recent URL history tracking with localStorage persistence.
- Updated UI styling: flex-based control layout and improved button sizing.
- Enhanced README with clearer project overview and reviewer highlights.
- Improved documentation structure with DEVLOG, DEVNOTES, and CHANGELOG.
