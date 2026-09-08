
import {
  GenTrack,
  useGenTrackTooltipDispatch,
  useGenTrackTooltipState
} from "ui";
import { Container, Sprite, ParticleContainer } from '@pixi/react';
import { Box, Typography } from "@mui/material";
import { Rectangle, useRectangleTexture } from "ui/src/components/GenTrack/shapes";
import Intro from "./Intro";

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
    { // use Graphics objects for example with few rectangles
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
      Track: () => (
        <Container>
          {data.longRects.map((d, i) => (
            <Rectangle
              key={i}
              x={d.x1}
              y={d.y1}
              width={d.x2 - d.x1}
              height={d.y2 - d.y1}
              color={colorScheme[i]}
              alpha={0.9}
            />
          ))}
        </Container>
      ),
    },
    { // use texture and particle container when a lot of rectangles
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
      Track: () => {
        const rectTexture = useRectangleTexture();
        return (
          // <ParticleContainer
          //   maxSize={data.shortRects.length}
          //   properties={{
          //     position: true,
          //     scale: true, // width/height maps to scale internally
          //     tint: true,
          //     alpha: true,
          //   }}
          // >
          <Container>
            {data.shortRects.map((p, i) => (
              <Sprite
                key={i}
                texture={rectTexture}
                x={p.x}
                y={p.y}
                width={p.w}
                height={p.h}
                tint={colorScheme[p.category]}
                alpha={0.3}
                eventMode="static"
                pointerover={e => {
                  genTrackTooltipDispatch({ type: "setDatum", value: p });
                  genTrackTooltipDispatch({ type: "setGlobalXY", value: { x: e.global.x, y: e.global.y } });
                }}
                pointerout={e => {
                  genTrackTooltipDispatch({ type: "setDatum", value: null });
                  genTrackTooltipDispatch({ type: "setGlobalXY", value: null });
                }}
              />
            ))}
          </Container>
          // </ParticleContainer>
        );
      }
    },
    {
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
      Track: () => {
        const rectTexture = useRectangleTexture();
        return (
          <Container>
            {data.bars.map((p, i) => (
              <Sprite
                key={i}
                texture={rectTexture}
                x={p.x}
                y={p.y}
                width={p.w}
                height={p.h}
                tint={colorScheme[i % colorScheme.length]}
                alpha={0.6}
                eventMode="static"
                pointerover={e => {
                  genTrackTooltipDispatch({ type: "setDatum", value: p });
                  genTrackTooltipDispatch({ type: "setGlobalXY", value: { x: e.global.x, y: e.global.y } });
                }}
                pointerout={e => {
                  genTrackTooltipDispatch({ type: "setDatum", value: null });
                  genTrackTooltipDispatch({ type: "setGlobalXY", value: null });
                }}
              />
            ))}
          </Container>
        );
      }
    },
  ];

  return (
    <>
      <GenTrack
        XInfo={XInfo}
        tracks={tracks.slice(0, 2)}
        // tracks={[]}
        InnerXInfo={XInfo}
        innerTracks={tracks.slice(1)}
        Tooltip={MyTooltip}
        // tooltipProps={{ xAnchor: "left", dy: 40 }}
        InnerTooltip={MyTooltip}
        innerTooltipProps={{ xAnchor: "adapt" }}
        zoomLines
        // initialZoom={[400, 650]}
      />
      {/* <Intro /> */}
    </>
  );
}

export default BodyContentInner