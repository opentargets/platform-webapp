
import { useEffect, useRef, useCallback, Fragment } from "react";
import {
  GenTrack,
  useGenTrackState,
  useGenTrackTooltipDispatch,
  useGenTrackTooltipState
} from "ui";
import { Container, Sprite, Graphics, Text  } from '@pixi/react';
import {
  Sprite as PixiSprite,
  Text as PixiText,
  TextStyle,
  Texture,
} from "pixi.js";
import { Box, Typography } from "@mui/material";
import {
  Rectangle,
  useCircleTexture,
  useRingTexture,
} from "ui/src/components/GenTrack/shapes";
import { scaleLinear, axisTop, select, max, sum, schemePaired } from "d3";

function MyTooltip() {
  const { datum } = useGenTrackTooltipState() ?? {};
  if (!datum) return null;
  return (
    <Box sx={{ p: 0.5, border: "1px solid #bbb", borderRadius: 2, bgcolor: "#fff" }}>
      {JSON.stringify(datum)}
    </Box>
  );
}

const geneScheme = [];
for (const i of [0, 2, 6, 8, 10, 4]) {
  geneScheme.push({
    primary: schemePaired[i + 1],
    faint: schemePaired[i],
  });
}
const remoteGeneScheme = {
  primary: "#666",
  faint: "#ccc",
};

function XInfo({ start, end, canvasWidth }) {
  const axisRef = useRef(null);

  useEffect(() => {
    const scale = scaleLinear()
      .domain([start, end])
      .range([0, canvasWidth]);

    const axis = axisTop(scale)
      .ticks(8)
      .tickSizeOuter(0);

    const axisSelection = select(axisRef.current)
  .call(axis);

  axisSelection.selectAll("text")
    .style("font-size", "11px")
    .style("font-family", "'Inter', sans-serif");
  
  axisSelection.select(".domain")
    .style("stroke", "#000")
    .style("opacity", 0.5);
  
  axisSelection.selectAll(".tick line")
    .style("stroke", "#000")
    .style("opacity", 0.5);
  }, [start, end, canvasWidth]);

  return (
    <svg width={canvasWidth} height={30} style={{ overflow: "visible" }}>
      <g ref={axisRef} transform="translate(0, 30)" />
    </svg>
  );
}

const infoStyle = {
  // background: "#f0f0f0",
  width: "100%",
  height: "100%",
  display: "flex",
  justifyContent: "end",
  alignItems: "center" ,
  textAlign: "right",
};

function XYInfo({ data }) {
  return (
    <Box sx={{ ...infoStyle, alignItems: "end"}}>
      <Typography component="div" variant="caption" sx={{ height: "12px", fontSize: "11px" }}>
        Chr {data.locus.rows[0].variant.chromosome}
      </Typography>
    </Box>
  );
}

function tickScaleFactory(filterActionPairs) {
  return (wrapper) => {
    objectLoop: for (const obj of wrapper.children[0].children) {
      for (const { filterFn, actionFn } of filterActionPairs) {
        if (filterFn(obj)) {
          actionFn(obj, wrapper);
          continue objectLoop;
        }
      }
    }
  };
}

function sumInclusiveIntervals(enhancers) {
  const events = new Map();

  for (const { start, end, score } of enhancers) {
    // interval is [start, end] inclusive
    events.set(start, (events.get(start) || 0) + score);
    events.set(end + 1, (events.get(end + 1) || 0) - score);
  }

  const positions = [...events.keys()].sort((a, b) => a - b);

  const result = [];
  let totalScore = 0;

  for (const pos of positions) {
    const delta = events.get(pos);
    const nextTotal = totalScore + delta;

    // only emit when score changes
    if (result.length === 0 || nextTotal !== totalScore) {
      result.push({
        position: pos,
        totalScore: nextTotal
      });
    }

    totalScore = nextTotal;
  }

  return result;
}

function HLine({ xMin, xMax, yValue, width, color }) {
  const drawHLine = useCallback((g) => {
    g.clear();
    g.lineStyle(width, color, 1);
    g.moveTo(xMin, yValue);
    g.lineTo(xMax, yValue);
  }, [xMin, xMax]);

  return <Graphics draw={drawHLine} />;
}


function BodyContentInner() {

  const genTrackState = useGenTrackState();
  const { data, xMin, xMax } = genTrackState;

  const genTrackTooltipDispatch = useGenTrackTooltipDispatch();

  const hLineWidth = 1;  // in pixels, convert to data width using: hLineWidth * yDataRange / trackHeightInPixels
  const hLineColor = 0xdddddd;
  const labelColor = 0x222222;
  const tracks = [];
  
  const variantTrackHeight = 30;
  const geneTrackHeight = 30;
  const e2gTrackHeight = 30;
  const colocTrackHeight = 60;
  const xExtremes = [];

  // variants
  {
    const variantWidth = 10;
    tracks.push({
      id: `variants`,
      height: variantTrackHeight,
      paddingTop: 24,
      yMin: 0,
      yMax: 100,
      YInfo: () => (
        <Box sx={infoStyle}> 
          <Typography component="div" variant="caption" sx={{ fontWeight: 500 }}>
            Variants <span style={{ fontWeight: 300 }}>({data.locus.count})</span>
          </Typography>
        </Box>
      ),
      Track: ({ isInner }) => {
        const ringTexture = useRingTexture(32, 10);
        const circleTexture = useCircleTexture(32);
        
        return (
          <Container>
            <HLine
              xMin={xMin}
              xMax={xMax}
              yValue={50}
              width={hLineWidth * 100 / variantTrackHeight}
              color={hLineColor}
            />
            
            {/* all variants */}
            {data.locus.rows.map(({ variant }, i) => {
              const isLead = variant.position === data.variant.position;
              return (
                <Sprite
                  key={i}
                  texture={isLead ? circleTexture : ringTexture}
                  x={variant.position}
                  y={50}
                  anchor={[0.5, 0.5]}
                  height={variantWidth / variantTrackHeight * 100}
                  tint={0x000000}
                  alpha={isLead ? 1 : 0.6}
                />
              );
            })}

            {/* lead variant label */}
            <Text
              text="Lead"
              x={data.variant.position}
              y={25}
              anchor={[0.5, 1]}
              style={
                new TextStyle({
                  align: 'center',
                  fill: labelColor,
                  fontSize: 11,
                  fontWeight: '100',
                  wordWrap: false,
                })
              }
            />
          </Container>
        );
      },
      // scale circles and text to stop stretched/squished appearance
      onTick: tickScaleFactory([
        {
          filterFn: obj => obj instanceof PixiText,  // look for text first as is also a sprite
          actionFn: (obj, wrapper) => {
            obj.scale.x = 1 / (wrapper.scale.x * wrapper.parent.scale.x);
            obj.scale.y = 1 / (wrapper.scale.y * wrapper.parent.scale.y);
          }
        },
        {
          filterFn: obj => obj instanceof PixiSprite,
          actionFn: (obj, wrapper) => {
            obj.width = variantWidth / (wrapper.scale.x * wrapper.parent.scale.x);
          }
        },
      ])
    });
  }

  // genes and L2G scores
  const geneLookup = {};
  for (const [i, { target }] of data.l2GPredictions.rows.entries()) {
    geneLookup[target.id] = { symbol: target.approvedSymbol, color: geneScheme[i] };
  }
  if (data.l2GPredictions.count) {
    tracks.push({
      id: `genes`,
      height: geneTrackHeight,
      paddingTop: 16,
      yMin: 0,
      yMax: 100,
      YInfo: () => (
        <Box sx={infoStyle}> 
          <Typography component="div" variant="caption" sx={{ fontWeight: 500 }}>
            Genes <span style={{ fontWeight: 300 }}>({data.l2GPredictions.count})</span>
          </Typography>
        </Box>
      ),
      Track: () => {

        return (
          <Container>
            <HLine
              xMin={xMin}
              xMax={xMax}
              yValue={50}
              width={hLineWidth * 100 / geneTrackHeight}
              color={hLineColor}
            />
            
            {/* genes - use graphics objects since not many */}
            {data.l2GPredictions.rows.map(({ score, target }, i) => {
              const { start, end } = target.genomicLocation
              return (
                <Fragment key={i}>
                  <Rectangle
                    x={start}
                    y={34}
                    width={end - start}
                    height={32}
                    color={geneScheme[i].primary}
                  />
                  <Text
                    text={`${target.approvedSymbol}: ${score.toFixed(3)}`}
                    x={start}
                    y={25}
                    anchor={[0, 1]}
                    style={
                      new TextStyle({
                        align: 'center',
                        fill: labelColor,
                        fontSize: 11,
                        fontWeight: '100',
                        wordWrap: false,
                      })
                    }
                  />
                </Fragment>
              );
            })}
          </Container>
        );
      },
      onTick: tickScaleFactory([
        {
          filterFn: obj => obj instanceof PixiText,  // look for text first as is also a sprite
          actionFn: (obj, wrapper) => {
            obj.scale.x = 1 / (wrapper.scale.x * wrapper.parent.scale.x);
            obj.scale.y = 1 / (wrapper.scale.y * wrapper.parent.scale.y);
          }
        },
      ]),
    });
  }

  // E2G
  if (data.variant.enhancerToGenes.count > 0) {
    const enhancersByGene = Object.groupBy(data.variant.enhancerToGenes.rows, row => row.target.id);
    const distributionByGene = {};
    for (const [geneId, enhancers] of Object.entries(enhancersByGene)) {
      distributionByGene[geneId] = sumInclusiveIntervals(enhancers);
    }
    const maxTotalScores = [];
    for (const [geneId, distribution] of Object.entries(distributionByGene)) {
      maxTotalScores.push({
        geneId,
        maxTotalScore: max(distribution, d => d.totalScore)
      });
    }
    maxTotalScores.sort((a, b) => b.maxTotalScore - a.maxTotalScore);
    const maxTotal = maxTotalScores[0].maxTotalScore;
    for (const { geneId } of maxTotalScores) {
      const distribution = distributionByGene[geneId];
      tracks.push({
        id: `e2g-${geneId}`,
        height: e2gTrackHeight,
        paddingTop: 16,
        yMin: 0,
        yMax: maxTotal,
        YInfo: () => (
          <Box sx={infoStyle}>
            <Typography component="div" variant="caption" sx={{ fontWeight: 500 }}>
              {geneLookup[geneId]?.symbol ?? "???"} enhancers <span style={{ fontWeight: 300 }}>({enhancersByGene[geneId].length})</span>
            </Typography>
          </Box>
        ),
        Track: () => {
          const drawDistribution = useCallback((g) => {
            g.clear();
            g.beginFill(geneLookup[geneId]?.color?.primary ?? 0xaaaaaa, 0.75);

            // move to baseline start
            g.moveTo(distribution[0].position, maxTotal);

            // draw top line
            for (const { position, totalScore } of distribution) {
              g.lineTo(position, maxTotal - totalScore);
            }

            // close shape back to baseline
            g.lineTo(distribution.at(-1).position, maxTotal);
            g.closePath();

            g.endFill();
          }, [xMin, xMax]);

          return (
            <Container>
              <HLine
                xMin={xMin}
                xMax={xMax}
                yValue={maxTotal}
                width={hLineWidth * maxTotal / e2gTrackHeight}
                color={hLineColor}
              />

              {/* enhancer distribution */}
              <Graphics draw={drawDistribution} />

            </Container>
          );
        },
      });
    }
  }

  // shared coloc options
  const maxCircleWidth = 16;
  const minCircleWidth = 7;
  const stemWidth = 1.5;

  // molQTL coloc
  if (data.molqtlcolocalisation.count > 0) {
    const colocsByPosition = Object.groupBy(
      data.molqtlcolocalisation.rows,
      d => d.otherStudyLocus.variant.position
    );
    const colocsAggregated = [];
    for (const [position, positionGroup] of Object.entries(colocsByPosition)) {
      const groupByGene = [...Map.groupBy(positionGroup, obj => obj.otherStudyLocus.study.target.id)];
      let dominantGeneId = null;
      let dominantGeneClpp = -Infinity;
      for (const [geneId, geneGroup] of groupByGene) {
        const geneClpp = sum(geneGroup, obj => obj.clpp);
        if (geneClpp > dominantGeneClpp) {
          dominantGeneId = geneId;
          dominantGeneClpp = geneClpp;
        }
      }
      const summedClpp = sum(positionGroup, obj => obj.clpp)
      const direction = sum(positionGroup, ({ clpp, betaRatioSignAverage }) => {
        const wt = betaRatioSignAverage > 0 ? 1 : (betaRatioSignAverage < 0 ? -1 : 0);
        return clpp * wt;
      });
      const isTrans = sum(positionGroup, obj => {
        const { isTransQtl } = obj.otherStudyLocus;
        return (isTransQtl ? 1 : -1) * obj.clpp;  // !! ASSUMES FALSY MEANS CIS - IS THIS CORRECT OR CAN HAVE NULL?
      });
      colocsAggregated.push({
        position,
        summedClpp,
        direction,
        dominantGeneId,
        isTrans, 
      });
    }

    const maxSummedClpp = max(colocsAggregated, obj => obj.summedClpp);

    function getCircleWidth(summedClpp) {
      return Math.max(maxCircleWidth * Math.sqrt(summedClpp / maxSummedClpp), minCircleWidth);
    }
    tracks.push({
      id: "qtlColoc",
      height: colocTrackHeight,
      paddingTop: 16,
      yMin: -1,
      yMax: 1,
      YInfo: () => (
        <Box sx={infoStyle}> 
          <Box>
            <Typography component="div" variant="caption" sx={{ fontWeight: 500 }}>
              MolQTL Colocalisation <span style={{ fontWeight: 300 }}>({data.molqtlcolocalisation.count})</span>
            </Typography>
            <Typography component="div" variant="caption" sx={{ fontWeight: 300 }}>
              Unique positions: {Object.keys(colocsByPosition).length}
            </Typography>
          </Box>
        </Box>
      ),
      Track: ({ isInner }) => {
        const circleTexture = useCircleTexture(32);
        
        return (
          <Container>
            <HLine
              xMin={xMin}
              xMax={xMax}
              yValue={0}
              width={hLineWidth * 2 / colocTrackHeight}
              color={hLineColor}
            />
            
            {/* circles and stems */}
            {colocsAggregated.map((obj, i) => {
              const { position, isTrans, dominantGeneId, direction, summedClpp } = obj;
              const isRemote = !geneLookup[dominantGeneId];
              return (
                <Fragment key={i}>
                  {/* circle */}
                  <Sprite
                    texture={ circleTexture}
                    x={position}
                    y={-direction / summedClpp}
                    anchor={[0.5, 0.5]}
                    height={getCircleWidth(summedClpp) / colocTrackHeight * 2}
                    tint={isRemote
                      ? remoteGeneScheme[isTrans > 0 ? "faint" : "primary"]
                      : geneLookup[dominantGeneId].color[isTrans > 0 ? "faint" : "primary"]
                    }
                    alpha={1}
                    ref={(sprite) => {  // need access to qtl data in onTick callback
                      if (sprite) {
                        sprite._qtlColocData = obj;
                        sprite._shape = "circle";
                      }
                    }}
                  />

                  {/* stem */}
                  <Sprite
                    texture={Texture.WHITE}
                    x={position}
                    y={ -direction / summedClpp / 2}
                    anchor={[0.5, 0.5]}
                    width={stemWidth}
                    height={direction / summedClpp}
                    tint={isRemote
                      ? remoteGeneScheme[isTrans > 0 ? "faint" : "primary"]
                      : geneLookup[dominantGeneId].color[isTrans > 0 ? "faint" : "primary"]
                    }
                    alpha={1}
                    ref={(sprite) => {  // need access to data in onTick callback
                      if (sprite) {
                        sprite._qtlColocData = obj;
                        sprite._shape = "line";
                      }
                    }}
                  />
                </Fragment>
              );
            })}
          </Container>
        );
      },
      // scale circles to stop stretched/squished appearance
      onTick: tickScaleFactory([
        {
          filterFn: obj => obj instanceof PixiSprite,
          actionFn: (obj, wrapper) => {
            obj.width = obj._shape ===  "circle"
              ? getCircleWidth(obj._qtlColocData.summedClpp) / (wrapper.scale.x * wrapper.parent.scale.x)
              : stemWidth / (wrapper.scale.x * wrapper.parent.scale.x)
          }
        },
      ])
    });
  }

  // GWAS coloc
   if (data.colocalisation.count > 0) {
    const colocsByPosition = Object.groupBy(
      data.colocalisation.rows,
      d => d.otherStudyLocus.variant.position
    );

    const colocsAggregated = [];
    for (const [position, positionGroup] of Object.entries(colocsByPosition)) {
      const summedClpp = sum(positionGroup, obj => obj.clpp)
      const direction = sum(positionGroup, ({ clpp, betaRatioSignAverage }) => {
        const wt = betaRatioSignAverage > 0 ? 1 : (betaRatioSignAverage < 0 ? -1 : 0);
        return clpp * wt;
      });
      colocsAggregated.push({
        position,
        summedClpp,
        direction,
      });
    }
    
    const maxSummedClpp = max(colocsAggregated, obj => obj.summedClpp);

    function getCircleWidth(summedClpp) {
      return Math.max(maxCircleWidth * Math.sqrt(summedClpp / maxSummedClpp), minCircleWidth);
    }

    tracks.push({
      id: "gwasColoc",
      height: colocTrackHeight,
      paddingTop: 16,
      yMin: -1,
      yMax: 1,
      YInfo: () => (
        <Box sx={infoStyle}> 
          <Box>
            <Typography component="div" variant="caption" sx={{ fontWeight: 500 }}>
              GWAS Colocalisation <span style={{ fontWeight: 300 }}>({data.colocalisation.count})</span>
            </Typography>
            <Typography component="div" variant="caption" sx={{ fontWeight: 300 }}>
              Unique positions: {Object.keys(colocsByPosition).length}
            </Typography>
          </Box>
        </Box>
      ),
      Track: ({ isInner }) => {
        const circleTexture = useCircleTexture(32);
        
        return (
          <Container>
            <HLine
              xMin={xMin}
              xMax={xMax}
              yValue={0}
              width={hLineWidth * 2 / colocTrackHeight}  // !! I THINK SHOULD USE Y-RANGE (I.E. 2) HERE? - BUT THEN LINE TOO THICK!
              color={hLineColor}
            />
            
            {/* circles and stems */}
            {colocsAggregated.map((obj, i) => {
              const { position, direction, summedClpp } = obj;
              return (
                <Fragment key={i}>
                  {/* circle */}
                  <Sprite
                    texture={ circleTexture}
                    x={position}
                    y={-direction / summedClpp}
                    anchor={[0.5, 0.5]}
                    height={getCircleWidth(summedClpp) / colocTrackHeight * 2}
                    tint={0x888888}
                    alpha={1}
                    ref={(sprite) => {  // need access to data in onTick callback
                      if (sprite) {
                        sprite._gwasColocData = obj;
                        sprite._shape = "circle";
                      }
                    }}
                  />

                  {/* stem */}
                  <Sprite
                    texture={Texture.WHITE}
                    x={position}
                    y={ -direction / summedClpp / 2}
                    anchor={[0.5, 0.5]}
                    width={stemWidth}
                    height={direction / summedClpp}
                    tint={0x888888}
                    alpha={1}
                    ref={(sprite) => {  // need access to qtl data in onTick callback
                      if (sprite) {
                        sprite._gwasColocData = obj;
                        sprite._shape = "line";
                      }
                    }}
                  />
                </Fragment>
              );
            })}
          </Container>
        );
      },
      // scale circles to stop stretched/squished appearance
      onTick: tickScaleFactory([
        {
          filterFn: obj => obj instanceof PixiSprite,
          actionFn: (obj, wrapper) => {
            obj.width = obj._shape ===  "circle"
              ? getCircleWidth(obj._gwasColocData.summedClpp) / (wrapper.scale.x * wrapper.parent.scale.x)
              : stemWidth / (wrapper.scale.x * wrapper.parent.scale.x)
          }
        },
      ])
    });
  }


  return (
    <Box sx={{mr: 3}}>
      <GenTrack
        XInfo={XInfo}
        XYInfo={XYInfo}
        tracks={tracks}
        InnerXInfo={XInfo}
        innerTracks={tracks}
        InnerXYInfo={XYInfo}
        yInfoGap={8}
        yInfoWidth={180}
        zoomLines
        panZoomTopGap={0}
        paddingBottom={24}
      />
      {/* <Intro /> */}
    </Box>
  );
}

export default BodyContentInner;

// TO DO:
// - genes:
//   - handle overlapping better - either y offsets or opacity so can see overlap
//      - give labels (partic e.g. gene: L2G score) a background so clear when over lap
//   - highlight which gene has highest L2G score, even just make highest bold?
// - draw vertical dotted line through lead variant?
//   - in genereal, maybe need easy but systematic approach to underlay and overlay arbitrary content over entire canvas
// - why is the 2nd (all non-first?) e2g hLines thicker?! - all e2g traks are the same height and we use
//   same hLine props!
// - increase length of geneScheme
// - show more gene details? e.g.
//    - introns and exons
//    - strand? - is this what is normally displayed by arrow-end?
// - why gene sometimes has no label? e.g. credible-set/4a5402cdec4ba249d1e6c944803950d5
// - abstrct repeated code in to functions, inc:
//   - draw functions for graphics (e.g. horizontal line)
// - e2g
//   - are we guaranteed that all genes that have enhancers assigend to them are in the L2G track?
//   - smooth the enhancer distributions? - e.g. bezier and may also need to look at Pixi options like resolutin so
//     actually displayed smoothly
//   - what if a very narrow spike? - is it visible?
// - coloc:
//    - currently all at same position and assigned trans or cis, but better to have separate cis and trans
//      lollipops when this situation arises? 
// - make scaling for fixed pixel size or text aspect rario efficient - only scale on init,
//   canvas width changes and x-limit changes
//     - since use a factory function, can store canvasWidth, xMin, xMax and return early if
//       no change
// - inner track showing bases: base color (when not at too high a range) and base letter (when zoomed closer)? 
//   - what is the gene is on the other strand? - if not shwoing this info base info poss useless/misleading?
// - coloc
//   - suse opacity and or rings so can see overlapping better
//      - rings tricky since variable sizes and stroke width should not scale - but we are using a texture
//      - opacity easier, just need to make stem only go to edge of circle rather than center
//   - pale (i.e. trans) kollipos too faint?
// - there can probably be genes in the displayed range with below threshold L2G score?
//    - we should show thes in grey?
//    - how know what they are?
// - generally, improve quality of text and sprites!
// QUESTIONS:
// - misleading since digram incomplete, e.g.
//  - genes on the range shown not shown if low L2G?
//    - if have colocs spread over wide range particularly likely to be an issue
//    - and some of the enhancers could be for genes with sub-threshold L2G score
//  - emhancers are only those that overlap the lead variant