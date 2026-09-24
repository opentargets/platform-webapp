# GenTrack

`GenTrack` provides flexible one-dimensional tracks for genomic and related data. Tracks share an x-scale and can be rendered in an outer overview canvas and an optional inner, zoomed canvas.

## Providers

`GenTrack` must be rendered inside a `GenTrackProvider`:

```tsx
<GenTrackProvider initialState={{ data, xMin, xMax }}>
  <GenTrackTooltipProvider>
    <GenTrack
      tracks={tracks}
      innerTracks={innerTracks}
      InnerXInfo={XAxis}
      InnerTooltip={Tooltip}
    />
  </GenTrackTooltipProvider>
</GenTrackProvider>
```

`GenTrackProvider` supplies the data and outer x-limits. `GenTrackTooltipProvider` is needed when using `Tooltip` or `InnerTooltip`.

## `GenTrack` props

| Prop | Type | Description |
| --- | --- | --- |
| `tracks` | `Track[]` | Tracks rendered in the outer overview canvas. |
| `innerTracks` | `Track[]` | Optional tracks rendered in the zoomed canvas. |
| `XInfo` / `InnerXInfo` | component | Optional x-axis or x-scale information for the outer and inner canvases. The inner component receives `canvasWidth`. |
| `XYInfo` / `InnerXYInfo` | component | Optional content in the y-axis information column. |
| `xyInfoHeight` / `innerXYInfoHeight` | `number` | Heights of the corresponding x/y information rows. Defaults to `32`. |
| `Tooltip` / `InnerTooltip` | component | Tooltip components for outer and inner canvases. |
| `tooltipProps` / `innerTooltipProps` | object | Tooltip positioning and interaction options. |
| `yInfoWidth` | `number` | Width reserved for track y-axis information. Defaults to `160`. |
| `yInfoGap` | `number` | Gap between y-axis information and track content. Defaults to `16`. |
| `paddingBottom` | `number` | Bottom padding inside each canvas. Defaults to `16`. |
| `panZoomTopGap` / `panZoomBottomGap` | `number` | Spacing around the pan/zoom panel. |
| `overlayZoombar` | `boolean` | Places the pan/zoom panel over the outer tracks. Requires at least one outer track. |
| `crosshairs` | `"none" \| "both" \| "horizontal" \| "vertical"` | Crosshair lines to display. Defaults to `"both"`. |
| `zoomLines` | `boolean` | Shows the selected zoom window on the outer canvas. |
| `initialZoom` | `[number, number]` | Initial limits for the inner zoomed view. |
| `overlayGraphics` / `innerOverlayGraphics` | `ReactNode` | Pixi content drawn over the outer or inner canvas. |
| `underlayGraphics` / `innerUnderlayGraphics` | `ReactNode` | Pixi content drawn under the outer or inner tracks. |
| `onInnerScalesReady` | function | Receives the inner canvas scales ref when it is ready. Useful for overlays that need inner coordinate information. |

## Tracks

Each track has the following shape:

| Property | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique track identifier. |
| `height` | `number` | Track height in pixels. Defaults to `50`. |
| `yMin` / `yMax` | `number` | Track y-scale limits. Defaults to `0` and `100`. |
| `paddingTop` | `number` | Padding above the track. Defaults to `0`. |
| `YInfo` | component | Optional y-axis information component. |
| `Track` | component | Pixi content for the track. Receives `isInner`, `trackId`, and `scalesRef`. |
| `onTick` | function | Optional callback invoked on each Pixi ticker update. |
| `Legend` | component | Optional HTML legend receiving `data` and `isInner`. |
| `legendPosition` | string | Legend position: `top-left`, `top-right`, `bottom-left`, or `bottom-right`. |

Tracks on the same canvas share the x-scale. Track content should use the supplied `scalesRef` and data-space coordinates through the reusable `GenTrack` primitives.

## Track primitives

The `GenTrack` package provides primitives for common Pixi content:

- `DataSprite` for point or interval sprites;
- `DataText` for data-positioned labels;
- `DataBackground` for track backgrounds;
- `DataVLine` for vertical reference lines;
- `DataRect` for data-positioned rectangles;
- `DataGeneBox` for interactive gene boxes;
- `RegionBoundaryOverlay` and `CrosshairOverlay` for overlays.

Components rendered inside the Pixi stage should receive `scalesRef` explicitly. Pixi uses a separate React reconciler, so React context reads from inside the stage cannot reliably access providers in the surrounding DOM tree.

## Inner-track panning and zooming

When `innerTracks` are supplied, the inner canvas supports horizontal drag-to-pan. The outer pan/zoom panel controls the selected genomic window, and the inner canvas shows the corresponding detail range.

Pan-dragging is disabled while interacting with a datum that provides a tooltip, so hover and click interactions remain available.

## Tooltips

Pass `Tooltip` and/or `InnerTooltip` to render tooltip content. Track content can dispatch tooltip state with `useGenTrackTooltipDispatch`:

```tsx
<Sprite
  eventMode="static"
  pointerover={event => {
    dispatch({ type: "setDatum", value: datum });
    dispatch({ type: "setGlobalXY", value: { x: event.global.x, y: event.global.y } });
  }}
  pointerout={() => {
    dispatch({ type: "setDatum", value: null });
    dispatch({ type: "setGlobalXY", value: null });
  }}
/>
```

Tooltip positioning supports anchors such as `adapt` and `anchorAdapt`. `anchorAdapt` can use `boxTopPageY` and `boxBottomPageY` in `globalXY` when the tooltip should follow a larger datum box. Nested canvases can provide `pointerPageY` for pointer-based positioning.

### Click-to-stick tooltips

Set `stickyOnClick: true` in `tooltipProps` or `innerTooltipProps` to keep a tooltip open while its content is used. This is currently intended for the inner canvas. A sticky tooltip can be switched to another datum, dismissed by clicking again or pressing Escape, and automatically dismissed when the datum leaves the meaningful view.

Sticky visual state is mirrored on `ScalesRef` and updated through `useStickyTick`. Track components that need sticky-driven Pixi changes should follow this pattern rather than reading tooltip context inside the Pixi stage.

## Future work

Potential improvements include:

- improving circle rendering at low zoom;
- investigating initial inner-canvas sizing;
- evaluating the cost of per-frame rescaling for fixed-pixel markers;
- improving culling and performance for large numbers of off-screen items.
