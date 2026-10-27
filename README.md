<div align="center">
  <img src="apps/docs/public/OT_logo_colour.svg" alt="Open Targets" width="340" />
  <br /><br />
  <a href="https://github.com/opentargets/platform-webapp/actions/workflows/ci.yaml"><img src="https://github.com/opentargets/platform-webapp/actions/workflows/ci.yaml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/opentargets/platform-webapp/actions/workflows/e2e-ci.yml"><img src="https://github.com/opentargets/platform-webapp/actions/workflows/e2e-ci.yml/badge.svg" alt="Tests: E2E" /></a>
  <a href="https://github.com/opentargets/platform-webapp/actions/workflows/publish.yaml"><img src="https://github.com/opentargets/platform-webapp/actions/workflows/publish.yaml/badge.svg" alt="Development build" /></a>
</div>

# Open Targets Platform Web App

Monorepo for the [Open Targets Platform](https://platform.opentargets.org) — a data integration tool for systematic drug target identification and prioritisation.

## Stack

- **React 18** + TypeScript (strict)
- **MUI v5** with a custom Open Targets theme
- **Apollo Client** + GraphQL (generated types via `graphql-codegen`)
- **Vite 6** build tooling, **Turbo** monorepo task runner
- **Biome** linting and formatting, **Yarn 1** workspaces

## Repository layout

```
platform-webapp/
├── apps/
│   ├── platform/      # The Open Targets Platform SPA
│   └── docs/          # Storybook component documentation site
└── packages/
    ├── ui/            # Shared React component primitives
    ├── sections/      # Composed data widgets (evidence sections, etc.)
    ├── ot-config/     # Runtime configuration and MUI theme factory
    ├── ot-constants/  # App-wide constants + generated GraphQL types
    └── ot-utils/      # Pure utility functions
```

## Requirements

- Node.js 20+
- Yarn 1.22.x (`packageManager` is locked in `package.json`)

## Development

```bash
# Install all workspace dependencies
yarn install

# Run the Platform app (http://localhost:3000)
yarn dev:platform

# Run the Storybook docs site (http://localhost:6006)
yarn dev:docs
```

## Building

```bash
# Production build for the Platform app
yarn build:platform

# Static Storybook build
yarn build:docs
```

## Other useful scripts

| Script | Description |
|---|---|
| `yarn lint` | Biome check across all workspaces |
| `yarn check:fix` | Biome format + lint autofix |
| `yarn generateAPITypes` | Regenerate GraphQL types from the production API schema |
| `yarn test:platform:e2e` | Run Playwright end-to-end tests |

## Documentation

Component and package documentation is published to GitHub Pages via the `docs.yaml` workflow. It covers UI component stories, package APIs, architecture, AOTF integration, and more.

## Copyright

Copyright 2014-2024 EMBL - European Bioinformatics Institute, Genentech, GSK, MSD, Pfizer, Sanofi and Wellcome Sanger Institute

This software was developed as part of the Open Targets project. For more information please see: http://www.opentargets.org

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
