# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.0.2] - 2026-06-21

### Fixed

- Declared `rxjs` as an explicit peer dependency (previously relied on Angular pulling it in transitively)

### Changed

- Internal lint and code cleanups (safe `Object.prototype.hasOwnProperty` access); no behavioral changes

## [0.0.1] - 2026-06-21

### Added

- Type-safe tRPC client proxy returning RxJS Observables
- SSR transfer state link for hydration without double-fetching
- Configurable `serverUrl` for SSR fetch resolution
- Custom `httpLink` with individual HTTP requests
- Support for `@trpc/server` v10 and v11
- Dynamic headers via `TrpcHeaders` signal
- Analog.js / Nitro compatibility via `$fetch` and env var detection
