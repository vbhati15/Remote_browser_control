# Changelog

All notable changes to this project are documented in this file.

## [Unreleased] - 2026-06-08

- Add initial project scaffold and Next.js UI (`app/page.tsx`, `app/layout.tsx`).
- Implement WebSocket control server (`server/index.ts`) and session management (`server/browserSession.ts`).
- Add Docker image and container tooling (`docker/browser.Dockerfile`, `server/docker.ts`).
- Implement CDP connection and screencast forwarding using `chrome-remote-interface`.
- Add input forwarding (mouse, wheel, keyboard) from UI to CDP `Input.*` methods.
- Add `scripts/smoke.mjs` for automated end-to-end verification.

## [v1.0.0] - 2026-06-08

- Initial public release with local remote-browser control features:
  - Start/Stop Chromium in Docker
  - Web UI canvas-based screencast
  - Navigation and input forwarding
  - Smoke test verifying lifecycle and basic interactions

## Notes

- Streaming uses CDP screencast (JPEG frames). This is suitable for demos but not as smooth as production remote-desktop protocols.
- Some websites (notably Google) may present CAPTCHAs for headless/automated browsers. See README for mitigation suggestions.
