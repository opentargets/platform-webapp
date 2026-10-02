# notebook-runtime

The sandboxed runtime for Report Builder **notebook** blocks. It bundles d3 v7,
Observable Plot 0.6 and acorn into a single classic script that runs inside an
opaque-origin iframe (`sandbox="allow-scripts"`, no `allow-same-origin`) with a
strict CSP (`connect-src 'none'`), so user code can draw charts against data the
host passes in but can never reach the network, the app's DOM, cookies or storage.

```
yarn workspace notebook-runtime build          # → apps/platform/public/notebook-runtime/runtime.js
yarn workspace notebook-runtime generate:completions   # → packages/ui/.../notebook/completions/{d3,plot}.json
```

`turbo run dev --filter=platform` builds it first (`dev` depends on `^build`).
`runtime.js` is git-ignored; `index.html` (with the CSP) is committed.

## Layout

| File | Role |
|---|---|
| `src/protocol.ts` | Message types shared with `packages/ui` (host ↔ sandbox). `packages/ui` imports these as types only. |
| `src/instrument.ts` | acorn parse + loop guard. Guards are spliced inline so the user's line numbers survive; nothing is re-serialised. |
| `src/htl.ts` | `html\`…\`` / `svg\`…\`` tagged templates (interpolations escaped as text, nodes inserted as-is). |
| `src/runtime.ts` | Message loop, compile (`AsyncFunction`), run, output classification, SVG/PNG serialisation, `ResizeObserver` height reports. |

## Protocol (v1)

Every message carries `{ v: 1, blockId, runId }`. The host accepts only messages
whose `event.source` is the iframe's window; the runtime accepts only messages
from `window.parent` (origins can't be compared: the sandbox origin is `"null"`).

Host → sandbox: `run`, `resize`, `serialize`, `dispose`.
Sandbox → host: `ready`, `started`, `log`, `value`, `rendered`, `error`, `serialized`, `height`.

Stale `runId`s are dropped on both sides, so a slow earlier run can never overwrite a newer one.

## Runaway code

* Loop guard: every `for` / `for…in` / `for…of` / `while` / `do…while` body starts with
  `if(__guard())throw new __LoopTimeout(line)`. The budget is 2 s of synchronous
  time and resets on every macrotask, so `await`-ing yields.
* Watchdog (host side, `useNotebookRunner`): no `rendered`/`error` within 15 s →
  the iframe is replaced and the block switches to manual runs.
