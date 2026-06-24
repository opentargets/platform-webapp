# AssociationsToolkit

The AOTF (Associations on the Fly) table component for Open Targets Platform. Renders target–disease association scores in a paginated, sortable, filterable table with support for pinning, bulk upload, and interactor expansion.

---

## Directory structure

```
AssociationsToolkit/
├── AssociationsView.tsx          # Top-level entry point — composes all providers + UI
├── index.ts                      # Public exports
├── types.ts                      # Shared TypeScript types (ENTITY, QueryState, etc.)
│
├── associationsUtils/            # Pure utilities and constants
│   ├── index.ts                  # getScale, getCellId, getLegend, TABLE_PREFIX,
│   │                             # tableCSSVariables, serializeSorting, deserializeSorting, …
│   ├── associations.ts           # GQL response parsers + data-source score helpers
│   ├── interactors.ts            # Interactors-specific helpers
│   └── Legend.ts                 # D3 colour-scale SVG legend builder
│
├── static_datasets/              # Static column / metric definitions
│   ├── dataSourcesAssoc.ts       # DataSourceDef[] — evidence data sources
│   ├── prioritisationColumns.ts  # Prioritisation column defs
│   └── rowMetrics.ts             # ROW_METRICS — novelty gauge, METRICS_SORT_FIELD resolver
│
├── context/                      # React context providers (one concern each)
│   ├── AssociationsQueryContext.tsx   # Reducer state + URL-backed query params
│   ├── AssociationsURLContext.tsx     # UI URL params: display mode, pins, uploads, focus
│   ├── AssociationsDataContext.tsx    # Fetched data for core / pinned / uploaded rows
│   ├── AssociationsFocusContext.tsx   # Active row/section state + URL focus sync
│   ├── aotfActions.ts            # Action creators
│   └── aotfReducer.ts            # Query state reducer (4 fields)
│
├── hooks/
│   └── useAssociationsData.ts    # Apollo-backed pagination hook used by AssociationsDataContext
│
└── components/
    ├── layout.tsx                # Shared styled layout primitives (zones, containers)
    │
    ├── controls/                 # Toolbar controls above the table
    │   ├── ActiveFiltersPanel.tsx
    │   ├── AotfApiPlayground.tsx
    │   ├── ColumnOptionsMenu.tsx
    │   ├── DisplayModeSwitch.tsx
    │   ├── ExportMenu.tsx
    │   ├── FacetsSearch.tsx
    │   ├── NameFilter.tsx
    │   └── HeaderControls/       # Per-datasource column weight / required sliders
    │       ├── HeaderControls.tsx
    │       ├── RequiredControl.tsx
    │       ├── SliderControl.tsx
    │       └── index.ts
    │
    ├── data/                     # Data import / export components
    │   ├── DataDownloader.tsx    # CSV download for current table view
    │   └── DataUploader/         # Bulk entity upload + validation
    │       ├── DataUploader.tsx
    │       ├── NestedItem.tsx
    │       ├── ValidationQuery.gql
    │       └── index.ts
    │
    └── Table/                    # Table rendering
        ├── TableAssociations.tsx # Root table: builds columns, three TanStack table instances
        ├── TableHeader.tsx       # Sticky column headers with sort / aggregation row
        ├── TableBody.tsx         # Row rendering, section drawer, interactors expansion
        ├── TableFooter.tsx       # Pagination + colour-scale legend
        ├── TableCell.tsx         # Score cell (rectangular / circular, colour-scaled)
        ├── CellName.tsx          # Name cell with pin/unpin action
        ├── AggregationsRow.tsx   # Second header row — datasource aggregation buttons
        ├── AssocTooltip.tsx      # Styled MUI tooltip wrapper
        ├── MetricCells.tsx       # Novelty gauge cell renderer
        ├── SectionRender.tsx     # Lazy evidence-section drawer content
        └── RowInteractors/       # Protein–protein interactors sub-table
            ├── RowInteractorsWrapper.tsx
            ├── RowInteractorsTable.tsx
            ├── useRowInteractors.ts
            └── InteractorsQuery.gql
```

---

## Usage

```tsx
import { AssociationsView } from "src/components/AssociationsToolkit";
import TARGET_ASSOCIATIONS_QUERY from "./TargetAssociationsQuery.gql";

<AssociationsView
  id="ENSG00000141510"   // entity ID (Ensembl gene or EFO disease)
  entity="target"        // "target" | "disease"
  query={TARGET_ASSOCIATIONS_QUERY}
/>
```

`AssociationsView` mounts all four context providers in the correct order and renders the toolbar + table. Behaviour is controlled through URL state — all user-navigable state is URL-backed and survives page reload.

---

## Context providers

| Provider | Hook(s) | What it owns |
|---|---|---|
| `AssociationsQueryProvider` | `useAotfQueryState` / `useAotfQueryDispatch` | Reducer: dataSourceControls, enableIndirect. URL-backed: pagination, sorting, facets, entity search |
| `AssociationsURLProvider` | `useAotfURLState` | Display mode, pinned entities, uploaded entities, column-weight panel open state, raw focus param |
| `AssociationsDataProvider` | `useAotfData` | Fetched rows for core, pinned, and uploaded tables; loading/error state |
| `AssociationsFocusProvider` | `useAssociationsFocus` / `useFocusElementState` | Active row + section drawer state; initialised from URL and synced back |

---

## URL params

| Param | Owner | Format | Default |
|---|---|---|---|
| `page` | QueryContext | integer | 0 (omitted) |
| `pageSize` | QueryContext | integer | 25 (omitted) |
| `sort` | QueryContext | `columnId:asc\|desc` | score:desc (omitted) |
| `q` | QueryContext | plain string | omitted |
| `facets` | QueryContext | `id~label~category\|…` | omitted |
| `table` | URLContext | `associations\|prioritisations` | `associations` |
| `pinned` | URLContext | comma-separated IDs | omitted |
| `uploaded` | URLContext | comma-separated IDs | omitted |
| `weights` | URLContext | `1` when open | omitted |
| `focus` | URLContext / FocusContext | `table\|rowId\|section0\|section1` | omitted |

---

## Display modes

`displayedTable` in `AssociationsURLContext` toggles between two views:

- **`"associations"`** — evidence data sources, association score, novelty metrics
- **`"prioritisations"`** — target safety / tractability prioritisation columns

The column set, colour scale, and aggregation row all switch automatically.

---

## Three table instances

`TableAssociations` creates three separate TanStack table instances sharing the same column definitions:

| Instance | Data source | Behaviour |
|---|---|---|
| Core | Paginated GQL query | Full pagination, sorting |
| Pinned | `pinnedData` from context | Fixed page size 150, no pagination UI |
| Uploaded | `uploadedData` from context | Fixed page size 150, no pagination UI |

Pinned and uploaded sections are shown above the core table inside collapsible panels.

---

## Row expansion

Clicking a cell opens the evidence section drawer. `AssociationsFocusContext` stores an array of focus entries (`{ row, table, section, interactors }`). `TableBody` reads this state to show/hide the `SectionRender` and `RowInteractors` sub-panels below each row.

The active section is serialised to the `focus` URL param (`table|rowId|section0|section1`) so deep links open the correct drawer directly.

---

## Adding a new data source column

1. Add an entry to `static_datasets/dataSourcesAssoc.ts` (for evidence) or `prioritisationColumns.ts` (for prioritisation).
2. The column is picked up automatically by `getDatasources()` in `TableAssociations.tsx`.
3. For private (partner-preview) columns, set `isPrivate: true` — `isPartnerPreview` in `associationsUtils/index.ts` gates rendering.

---

## Adding a new row metric

1. Add an entry to `static_datasets/rowMetrics.ts`.
2. Provide a `format` function and set `sortable` accordingly.
3. For a custom cell renderer, add a matching key to `CUSTOM_CELL_RENDERERS` in `TableAssociations.tsx`.
