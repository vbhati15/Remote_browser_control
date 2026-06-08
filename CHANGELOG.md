# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

## [v1.1.0] - 2026-06-08

- Add refresh button to UI for easy page reload.
- Add recent URL history tracking with localStorage persistence.
- Update UI styling with flex-based control layout and improved button sizing.
- Fix `.gitignore` encoding issue that prevented proper build artifact exclusion.
- Enhance README with clearer project overview and reviewer highlights.
- Improve documentation with DEVLOG, DEVNOTES, and CHANGELOG.
- Add GitHub Actions workflow for automated smoke test on push.

## [v1.0.0] - 2026-06-08

- Initial public release with local remote-browser control features:
  - Start/Stop Chromium in Docker
  - Web UI canvas-based screencast
  - Navigation and input forwarding
  - Smoke test verifying lifecycle and basic interactions
  - WebSocket control server and Chrome DevTools Protocol integration
  - Automated end-to-end test suite
  - GitHub Actions CI/CD workflow

## Notes

- Streaming uses CDP screencast (JPEG frames). This is suitable for demos but not as smooth as production remote-desktop protocols.
- Some websites (notably Google) may present CAPTCHAs for headless/automated browsers. See README for mitigation suggestions.
