# apps/docs — Open Targets UI Documentation

Storybook 10 app that serves as both a deployable component showcase and a machine-readable reference for AI tooling.

## Quick start

```bash
yarn dev:docs      # dev server at http://localhost:6006
yarn build:docs    # static build → apps/docs/storybook-static/
```

## What's in here

- **UI Components** — autodocs for `packages/ui` components (opt-in per story with `tags: ["autodocs"]`)
- **Sections** — custom stories for `packages/sections` composed widgets
- **Associations on the Fly** — dedicated section for the AOTF toolkit
- **Package docs** — hand-authored MDX for `ot-config`, `ot-constants`, `ot-utils`
- **Architecture** — how the monorepo packages relate

## Adding a story

Stories live **in the package they document**, not in `apps/docs`:

```
packages/ui/src/components/MyComponent/MyComponent.stories.tsx
packages/sections/src/target/MySection/MySection.stories.tsx
```

Use `tags: ["autodocs"]` to get a generated docs page for that component.

## Adding a docs page

Drop an `.mdx` file anywhere under `apps/docs/src/docs/`. Use the `title` field in `<Meta>` to set sidebar position:

```mdx
import { Meta } from "@storybook/blocks";

<Meta title="My Section/My Page" />

# My Page
```

## Storybook config

| File | Purpose |
|---|---|
| `.storybook/main.ts` | Story globs, addons, Vite config |
| `.storybook/preview.ts` | Global decorators — MemoryRouter + OTApolloProvider + ThemeProvider |
| `.storybook/preview-head.html` | `window.configUrlApi` and other globals required before React loads |
| `.storybook/manager.ts` | Sidebar branding |

## Deployment

Build output is `storybook-static/`. Recommended target: Vercel with:
- Root directory: `apps/docs`
- Build command: `cd ../.. && yarn build:docs`
- Output directory: `storybook-static`
