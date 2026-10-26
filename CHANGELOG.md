# Changelog

## 0.4.0 - 2026-10-26

### Changed

- Multi-select moved from the composer dock into a right-Sidebar Quotes tab, so selecting never scrolls or covers the transcript.
- Press-and-hold (or `Shift+Enter`) on the Fork-side action now opens the Quotes tab with that message preselected; navigating again replaces the selection.
- The selector reads its preselect from the tab's navigation params (`useTabInfo`), and the plugin dropped its picker store and `@deepseek-ai/dsh-client-store` runtime dependency.

## 0.3.0 - 2026-10-26

### Changed

- Replaced the two-icon and sidebar flow with one Fork-side action: click quotes the message, press-and-hold (or `Shift+Enter`) opens multi-select.
- Moved multi-select into a compact picker above the composer; removed the right-sidebar drawer, guide entry, and mode switch.
- Picker rows toggle selection by clicking the row; one all/none control replaces separate Select all and Clear actions.
- Sent bundle cards now start collapsed and locate a source when its item is clicked instead of showing a per-item locate button.
- Source locate now unfolds a folded process group and drives the real vertical scrollport, so assistant sources jump visibly.

### Fixed

- The preselect effect no longer re-selects an already selected row every render, avoiding a render loop with fresh snapshots.

## 0.2.1 - 2026-10-26

### Fixed

- Same-Session locate for assistant messages: the durable identity lives on the assistant node's `finalNode`, not on the node payload, so earlier lookups never matched and always reported the source as not visible. Locate now reads `finalNode.messageId` for assistant rows and falls back to `seq` when either side omits an identity.

## 0.2.0 - 2026-10-26

### Changed

- Replaced the Session-header modal with a right-sidebar Quotes drawer.
- Added a Quotes action between Copy and Fork on finalized assistant messages; it opens the drawer with that message preselected.
- Quote insertion now emits one bounded `<quoted_messages>` bundle instead of one Markdown quote per message.
- Sent bundles render as an expandable bundle card with per-message source locate.

### Added

- Cross-Session forwarding from the same drawer, with a target Session picker.
- Bundle parsing and a custom UserText rule for raw and blockquoted bundles.
- Forwarded bundle cards labeled **From another session**.
- Search and filtered select-all inside the drawer.
- Drawer mode switch for Quote vs Forward.

### Fixed

- Quote actions no longer interrupt the conversation with a centered modal.
- Bound bundles against early closing-tag injection from message text.

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
