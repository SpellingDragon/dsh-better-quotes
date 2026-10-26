# Changelog

## 0.1.0 - 2026-10-26

### Added

- Session header picker for multi-selecting user, steering, and finalized assistant messages.
- Search across message text, role, model route, skills, session references, and attachment names.
- Markdown quote serialization with durable `session_id`, `seq`, `message_id`, role, time, provider/model, skills, and references.
- Image and file attachment manifests with durable ids, names, sizes, media types, and dimensions.
- Locate-original control and filtered select-all.
- Atomic `insertQuote` support with `insertText` fallback for older hosts.
- English and Simplified Chinese dictionaries.
- Plugin-owned stylesheet with disposer-based cleanup.
- CI workflow for typecheck, tests, build, and npm pack on Node 22 and 24.
- 23 tests covering candidate projection, formatting, picker interaction, fallback insertion, and registration lifecycle.
