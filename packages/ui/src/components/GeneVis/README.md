# GeneVis

Component to show genome browser style visualisation of (at least one of) genes and variants. Uses the `GenTrack` component so can easily be extended - e.g. may likely show E2G distributions per gene in future.

## `GeneVis`

Main visualisation component.

| Prop                | Type                   | Default                       | Description                                                                                                                                    |
| ------------------- | ---------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`              | `object`               |                               | Properties: `genes`, `variants` - see below.                                                                                                   |
| `chromosome`        | `string`               |                               |                                                                                                                                                |
| `xMin`              | `number`               |                               | Miniumum position on chromosome shown.                                                                                                         |
| `xMax`              | `number`               |                               | Maximum position on chromosome shown.                                                                                                          |
| `geneAxisLabel`     | `string` or `component | 'Genes'                       | y label for genes track.                                                                                                                       |
| `variantsAxisLabel` | `string` or `component | 'Variants'                    | y label for variants track.                                                                                                                    |
| `geneLabel`         | `function`             | `gene => gene.approvedSymbol` | Passed a gene object and should return a string.                                                                                               |
| `variantColor`      | `string` or `function` |                               | If a function, should take variant object and return a colour string.                                                                          |
| `fixedTracks`       | `boolean` or `array`   | `true`                        | Which fixed (i.e. non-zoomable) tracks to show. Use a boolean for all/none or an array to specifiy tracks by name, e.g. [`genes`, `variants`]. |
| `zoomableTracks`    | `boolean` or `array`   | `true`                        | Which zoomable tracks to show - see `topTracks` for possible values.                                                                           |

## Data

The `data` prop passed to `GeneVis` can take a `genes` and/or `variants` property. Where used, each value is an array of objects. 

### Genes

Gene objects:

| Property          | Type     | Default | Description                                                       |
| ----------------- | -------- | ------- | ----------------------------------------------------------------- |
| `approvedSymbol`  | `string` |         |
| `id`              | `string` |         |
| `genomicLocation` | `object` |         | `{ chromosome: string, strand: int, start: number, end: number }` |
| `biotype`         | `string` |         | Indicates if gene is protein coding.                              |
| `l2gScore`        | `number` | `null`  | L2G score (optional).                                             |

Variant objects:

| Property               | Type     | Default | Description                                                                                             |
| ---------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------- |
| `variant`              | `object` |         | `{ id, chromosome, position, referenceAllele, alternateAllele, mostSevereConsequences: { id, label } }` |
| `posteriorProbability` | `number` |         |
| `pValueMantissa`       | `number` |         |                                                                                                         |
| `pValueExponent`       | `number` |         |                                                                                                         |
| `beta`                 | `number` |         |                                                                                                         |
| `standardError`        | `number` |         |                                                                                                         |
| `r2Overall`            | `number` |         |                                                                                                         |
| `logBF`                | `number` |         |                                                                                                         |

## TO DO

## COULD DO

## Issues

