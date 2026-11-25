# GeneVis

`GeneVis` is a genome-browser-style visualisation for variants and genes in a genomic region. It uses `GenTrack` for shared scales, pan/zoom, tracks, and tooltips.

## Usage

```tsx
<GeneVis
  model={model}
  chromosome={chromosome}
  xMin={start}
  xMax={end}
  initialZoom={initialZoom}
/>
```

`GeneVis` does not fetch data or calculate a genomic region. The caller adapts its own query result to a query-independent `GeneVisModel` and supplies the genomic range to display.

## Props

| Prop          | Type                    | Description                                                                                                          |
| ------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `model`       | `GeneVisModel`          | Presentation data: genes, optional reference position, optional overview/detail variants, and optional gene styling. |
| `chromosome`  | `string`                | Chromosome containing the displayed region.                                                                          |
| `xMin`        | `number`                | Minimum genomic position for the outer view.                                                                         |
| `xMax`        | `number`                | Maximum genomic position for the outer view.                                                                         |
| `initialZoom` | `[number, number]`      | Optional initial genomic range for the zoomed view.                                                                  |
| `tooltip`     | `GeneVisTooltipOptions` | Optional widget-owned detail panel, context, and width rule beneath the shared entity header.                        |

## Model

`GeneVisModel` intentionally does not mirror a GraphQL response. Its relevant fields are:

- `genes`: genes overlapping the displayed region. Each needs its biotype, genomic location, and canonical transcript/exon data.
- `referencePosition`: optional vertical reference line position.
- `overviewVariants`: optional variant markers for the overview track.
- `variantTrack`: optional posterior-probability variant-detail track, with an optional labelled emphasis.
- `genePresentation`: optional priority IDs, highlight styles, and per-gene label scores.

With only `genes` supplied, GeneVis renders neutral gene tracks: no reference line, variants, priorities, or highlighted genes.

## Tooltips

GeneVis always renders the standard linked entity header. `tooltip.Detail` may return an optional widget-specific lower panel; `tooltip.context` and `tooltip.getWidth` support that panel without coupling the shared tooltip to a widget query shape.

## Tracks and behaviour

Depending on the supplied model, the visualisation can contain:

- an overview track, optionally with variants and a reference line;
- an optional zoomable variant detail track;
- zoomable gene tracks grouped by biotype;
- labels and optional per-gene scores for protein-coding genes;
- optional gene highlighting and prioritisation;
- canonical transcript and exon rendering for genes;
- an optional vertical reference line.

Users can pan and zoom the genomic view, inspect genes and variants with hover tooltips, and click a datum to keep its tooltip visible.
