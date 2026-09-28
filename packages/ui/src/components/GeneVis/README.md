# GeneVis

`GeneVis` is a genome-browser-style visualisation for credible-set variants, locus-to-gene predictions, and genes in a genomic region. It uses `GenTrack` for shared scales, pan/zoom, tracks, and tooltips.

## Usage

```tsx
<GeneVis
  data={data}
  chromosome={chromosome}
  xMin={start}
  xMax={end}
  initialZoom={initialZoom}
/>
```

`GeneVis` does not fetch data. The caller supplies the combined data object and the genomic region to display.

## Props

| Prop          | Type               | Description                                                   |
| ------------- | ------------------ | ------------------------------------------------------------- |
| `data`        | `object`           | Combined credible-set, locus-to-gene, and region-target data. |
| `chromosome`  | `string`           | Chromosome containing the displayed region.                   |
| `xMin`        | `number`           | Minimum genomic position for the outer view.                  |
| `xMax`        | `number`           | Maximum genomic position for the outer view.                  |
| `initialZoom` | `[number, number]` | Optional initial genomic range for the zoomed view.           |

## Data

The data object currently contains the following relevant properties:

- `variant`: the lead variant, including its chromosome and position.
- `locus.rows`: credible-set variants and their statistical values, such as posterior probability, p-value, beta, standard error, and log Bayes factor.
- `l2GPredictions.rows`: locus-to-gene predictions, scores, and target genomic locations.
- `region.targets.rows`: genes overlapping the displayed region.
- Each region target may include its `biotype`, genomic location, and canonical transcript/exon data.

## Tracks and behaviour

The visualisation currently contains:

- a simplified variant overview track;
- a zoomable variant detail track;
- zoomable gene tracks grouped by biotype;
- labels and L2G scores for protein-coding genes;
- highlighting for genes with L2G predictions;
- canonical transcript and exon rendering for genes;
- a vertical reference line for the lead variant.

Users can pan and zoom the genomic view, inspect genes and variants with hover tooltips, and click a datum to keep its tooltip visible.
