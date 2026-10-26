# dsh-better-quotes

[![CI](https://github.com/SpellingDragon/dsh-better-quotes/actions/workflows/ci.yml/badge.svg)](https://github.com/SpellingDragon/dsh-better-quotes/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Quote or forward whole messages in DeepSeek Harness Web — one action next to Fork, an inline picker above the composer, and a collapsed bundle card the model can read and look up.

Click the quote icon between Copy and Fork to insert that message immediately. Hold the same icon to select more user and assistant messages in the conversation, then quote them once or forward the same bundle to another local Session.

## Quick start

```sh
npm ci
npm run build
npm pack
dsh plugin --profile web add /absolute/path/to/dsh-better-quotes-0.3.0.tgz
```

From a DSH source checkout, use `pnpm dsh plugin` instead of `dsh plugin`. Restart `dsh web` or refresh the browser. The package targets DSH `>=0.2.1-rc.3 <0.3.0-0`.

Once published to npm:

```sh
dsh plugin --profile web add dsh-better-quotes
```

## How it works

### Quote one message

Click the icon between Copy and Fork. The message enters the composer immediately, matching the official select-to-quote interaction.

### Quote or forward several

1. Hold the same icon for half a second, or press `Shift+Enter`.
2. The picker opens above the composer with that message selected. Click rows to toggle selection, search to narrow the list, and use the single all/none control for what is shown.
3. Choose **Insert quote (N)** to place one bundle in the composer, or **Forward** to pick another local Session and send the same bundle.
4. The target excludes the current Session and subagent Sessions.

### Locate

Sent bundle cards start folded. Expand one and click a same-Session item to scroll to the rendered original and briefly highlight it. Folded process groups are expanded first. Forwarded cards show **From another session** and hide source navigation.

## Bundle format

One insert creates one envelope:

```xml
<quoted_messages version="1" source_session="…" count="2">
<quoted_message role="user" time="2026-10-26T04:05:06.789Z" seq="12" message_id="…" session_id="…">
<metadata>
<skill name="pdf" />
<reference name="Spec" />
</metadata>
The deployment failed after the schema change.
[attachment kind=file name="deploy.log" bytes=4096 id="…"]
</quoted_message>
<quoted_message role="assistant" time="2026-10-26T04:05:08.000Z" seq="13" message_id="…" session_id="…">
<metadata provider="deepseek" model="deepseek-chat">
</metadata>
It fails because the migration dropped the index.
</quoted_message>
</quoted_messages>
```

`session_id` + `seq` let the model read the original event with `session_event_read`; `message_id` is omitted when the host does not expose one. `<skill>` and `<reference>` record loaded skills and `@session` labels. `[attachment …]` records durable image/file ids, names, sizes, media types, and dimensions. Literal boundary tags in message text are escaped.

Attachments are referenced, not copied. If history compaction removes the original, image pixels may be unavailable; files remain readable only while their saved path is in history.

## Model lookup

Mount the optional session query tools when the model should read source events:

```yaml
- name: '@deepseek-ai/dsh-tool-session-query'
```

The bundle remains readable without it, but cannot be queried by identity.

## Compatibility and privacy

- `insertQuote` is used when the host exposes it; older hosts fall back to `insertText` at the caret.
- The picker reads the Chat snapshot through standard Session props; it does not scrape the DOM.
- Forwarding stays inside the local DSH process and only targets Sessions the client lists.
- No external HTTP requests, analytics, or remote services.
- All text is React-rendered; stylesheet classes are prefixed `bq-`.

## How it compares

Public READMEs as of **2026-10-26**.

| Plugin | Selection entry | Quote shape | Cross-Session forwarding | Durable identity |
|---|---|---|---|---|
| **dsh-better-quotes** | One action: click quotes, hold multi-selects inline | One bounded `<quoted_messages>` bundle | Yes, same picker | `session_id`, `seq`, `message_id`, time, route, skills, references |
| [dsh-message-forward](https://github.com/Domaki-co/dsh-message-forward) | Long-press multi-select; forward dialog | Forwarding context | Yes | Source session and speaker |
| [dsh-quote-followup](https://github.com/tr1v3r/dsh-quote-followup) | Selection toolbar; text | Quote chips | No | Text selection |
| [dsh-select-quote](https://github.com/latte03/dsh-select-quote) | Selection toolbar; text | Stacked cards | No | Text selection |
| [dsh-quote-annotate-pro](https://github.com/zhao-guang-ai/dsh-quote-annotate-pro) | Selection toolbar; text and annotations | Anchored quote blocks | No | Turn/role anchors |
| [dsh-multi-selection-comments](https://github.com/yuanc1204/dsh-multi-selection-comments) | Selection toolbar; multiple text segments | Structured context | No | Segments and comments |

## Design

- One control carries two outcomes: click quotes immediately; hold opens multi-select.
- The picker is a `conversation.input.dock` entry, so it appears where the next message will be sent.
- One bundle replaces N disconnected quotes and carries source, count, order, and per-message boundaries.
- Bundle cards start folded; clicking an item is the locate affordance.
- Locate unfolds a folded process group and drives the real vertical scrollport.

```mermaid
flowchart LR
  A[Click] --> B[formatBundle]
  B --> C[insertQuote / insertText]
  A2[Hold] --> D[Inline picker]
  D --> E[select messages]
  E -->|Insert| C
  E -->|Forward| F[choose target Session]
  F --> G[sessions.using + prompt queue]
  C --> H[Collapsed bundle card]
  G --> H
  H --> I[Click item to locate]
  H --> J[session_event_read via session_id + seq]
```

## Limitations and roadmap

- The picker is an inline panel, not per-row checkboxes in the transcript.
- Locate only works inside the source Session.
- Attachments are referenced, not re-attached; thumbnails and re-attachment remain future work.
- Only the loaded, visible Chat window is listed.
- No browser E2E or GIF yet.

## Development

```sh
npm ci
npm run typecheck
npm test
npm run build
npm pack
```

- `QuoteAction.tsx` — click quote / hold multi-select.
- `QuoteDock.tsx` and `QuoteRow.tsx` — inline picker and message rows.
- `bundle.ts`, `quote-rule.ts`, `BundleQuote.tsx` — bundle format, parsing, and card.
- `locate.ts` — unfold and source locate.
- `tests/` — 36 focused tests.

## License

MIT. See [LICENSE](LICENSE).

中文说明见 [README.zh.md](README.zh.md)。
