# Validation

Validated on Windows with Node 24 and the pinned SDK 1.6.0.

- TypeScript strict type checking: passed.
- Domain and official SDK HTTP-mock tests: 6 passed.
- Chromium learner journeys: 8 passed, across desktop and mobile.
- Production build: passed.
- All 14 method/parameter cards include highlighted code; browser verified.
- Component architecture and swimlane workflow render with eight selectable steps.
- Guided context continuity, independent empty history, retrieve-only behavior, terminal lifecycle guards, and literal hostile input verified.
- Preview screenshots captured from the actual built demo; desktop visually inspected.

Browser tests use dedicated port 4394 and never reuse an unrelated existing server. Test credentials are mock-only. No real account mutations or live model calls were used for validation. Live behavior still requires your enabled account and valid existing definition IDs.

CI repeats type checks, SDK/domain tests, production build, and browser tests on Node 24 / Ubuntu.
