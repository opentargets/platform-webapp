
import {
  GenTrack,
  DataSprite,
  DataRect,
  DataText,
  useGenTrackTooltipDispatch,
  useGenTrackTooltipState,
} from "ui";
import { Container } from '@pixi/react';
import { TextStyle } from 'pixi.js';
import { Box, Typography } from "@mui/material";

const smallTextStyle = new TextStyle({ fontSize: 10, fill: 0x000000 });

function MyTooltip() {
  const { datum } = useGenTrackTooltipState() ?? {};
  if (!datum) return null;
  return (
    <Box sx={{ p: 0.5, border: "1px solid #bbb", borderRadius: 2, bgcolor: "#fff" }}>
      {JSON.stringify(datum)}
    </Box>
  );
}

const colorScheme = [
  // d3 schemeCategory10
  0x1f77b4,
  0xff7f0e,
  0x2ca02c,
  0xd62728,
  0x9467bd,
  0x8c564b,
  0xe377c2,
  0x7f7f7f,
  0xbcbd22,
  0x17becf,

  // d3 schemeTableau10
  0x4e79a7,
  0xf28e2b,
  0xe15759,
  0x76b7b2,
  0x59a14f,
  0xedc948,
  0xb07aa1,
  0xff9da7,
  0x9c755f,
  0xbab0ab,
];

  
// need canvasWidth prop (even if not used) for correct behavior of inner XInfo
function XInfo({start, end, canvasWidth}) {
  return (
    <Box sx={{ background: "#f0f0f0", width: "100%", height: "100%", p: 1, borderRadius: 2 }}>
      <Typography variant="body2">
        <Box component="span" sx={{fontWeight: 600, pr: 2 }}>x: {Math.round(start)}-{Math.round(end)}</Box>
        <Box component="span" sx={{fontWeight: 300, }}>x-info, e.g. axis</Box>
      </Typography>
    </Box>
  )
}

function BodyContentInner({ data, yMin, yMax }) {

  const genTrackTooltipDispatch = useGenTrackTooltipDispatch();

  const tracks = [
    { // use Graphics objects for example with few rectangles - DataSprite handles coordinate transforms
      id: `long-rectangles`,
      height: 60,
      paddingTop: 16,
      yMin,
      yMax,
      YInfo: ({}) => (
        <Box sx={{ background: "#f0f0f0", width: "100%", height: "100%", p: 1 }}>
          <Typography variant="body2">
            <Box component="span" sx={{fontWeight: 600, pr: 2 }}>Domains</Box><br />
            <Box component="span" sx={{fontWeight: 300, }}>y-info</Box>
          </Typography>
        </Box>
      ),
      Track: ({ trackId, scalesRef }) => (
        <Container>
          {data.longRects.map((d, i) => (
            <Container key={i}>
              <DataRect
                scalesRef={scalesRef}
                trackId={trackId}
                x={d.x1}
                y={d.y1}
                width={d.x2 - d.x1}
                height={d.y2 - d.y1}
                color={colorScheme[i]}
                alpha={0.9}
              />
              <DataText
                scalesRef={scalesRef}
                trackId={trackId}
                x={(d.x1 + d.x2) / 2}
                y={(d.y1 + d.y2) / 2}
                text={String(d.y2 - d.y1)}
                anchor={[0.5, 0.5]}
                alpha={1}
                style={smallTextStyle}
              />
            </Container>
          ))}
        </Container>
      ),
    },
    { // DataSprite handles data-space → screen-space transforms (no onTick needed)
      id: `small-rectangles`,
      height: 120,
      paddingTop: 16,
      yMin,
      yMax,
      YInfo: ({}) => (
        <Box sx={{ background: "#f0f0f0", width: "100%", height: "100%", p: 1 }}>
          <Typography variant="body2">
            <Box component="span" sx={{fontWeight: 600, pr: 2 }}>Segments</Box><br />
            <Box component="span" sx={{fontWeight: 300, }}>y-info</Box>
          </Typography>
        </Box>
      ),
      Track: ({ trackId, scalesRef }) => {
        return (
          <Container>
            {data.shortRects.map((p, i) => (
              <DataSprite
                key={i}
                scalesRef={scalesRef}
                trackId={trackId}
                x={p.x}
                y={p.y}
                width={p.w}
                height={p.h}
                minPixelWidth={2}
                tint={colorScheme[p.category]}
                alpha={0.3}
                eventMode="static"
                pointerover={e => {
                  genTrackTooltipDispatch({ type: "setDatum", value: p });
                  genTrackTooltipDispatch({ type: "setGlobalXY", value: { x: e.global.x, y: e.global.y } });
                }}
                pointerout={() => {
                  genTrackTooltipDispatch({ type: "setDatum", value: null });
                  genTrackTooltipDispatch({ type: "setGlobalXY", value: null });
                }}
              />
            ))}
          </Container>
        );
      }
    },
    { // DataSprite for bar chart - width and height in data space
      id: `bar-chart`,
      height: 80,
      paddingTop: 16,
      yMin,
      yMax,
      YInfo: ({}) => (
        <Box sx={{ background: "#f0f0f0", width: "100%", height: "100%", p: 1 }}>
        <Typography variant="body2">
          <Box component="span" sx={{fontWeight: 600, pr: 2 }}>Bars</Box><br />
          <Box component="span" sx={{fontWeight: 300, }}>y-info</Box>
        </Typography>
        </Box>
      ),
      Track: ({ trackId, scalesRef }) => {
        return (
          <Container>
            {data.bars.map((p, i) => (
              <Container key={i}>
                <DataSprite
                  scalesRef={scalesRef}
                  trackId={trackId}
                  x={p.x}
                  y={p.y}
                  width={p.w}
                  height={p.h}
                  minPixelWidth={2}
                  tint={colorScheme[i % colorScheme.length]}
                  alpha={0.6}
                  eventMode="static"
                  pointerover={e => {
                    genTrackTooltipDispatch({ type: "setDatum", value: p });
                    genTrackTooltipDispatch({ type: "setGlobalXY", value: { x: e.global.x, y: e.global.y } });
                  }}
                  pointerout={() => {
                    genTrackTooltipDispatch({ type: "setDatum", value: null });
                    genTrackTooltipDispatch({ type: "setGlobalXY", value: null });
                  }}
                />
                <DataText
                  scalesRef={scalesRef}
                  trackId={trackId}
                  x={p.x + p.w / 2}
                  y={p.y}
                  text={String(Math.round(p.h))}
                  anchor={[0.5, 1]}
                  alpha={1}
                  style={smallTextStyle}
                />
              </Container>
            ))}
          </Container>
        );
      }
    },
  ];

  return (
    <GenTrack
      XInfo={XInfo}
      tracks={tracks.slice(0, 2)}
      InnerXInfo={XInfo}
      innerTracks={tracks.slice(1)}
      Tooltip={MyTooltip}
      InnerTooltip={MyTooltip}
      innerTooltipProps={{ xAnchor: "adapt" }}
      zoomLines
    />
  );
}

export default BodyContentInner
