import { Box, Typography } from "@mui/material";
import { clinicalStageCategories } from "@ot/constants";

const usedCircleWidth = 30;
const emptyCircleWidth = 17;
const lineWidth = 1;

function StageFilter({ records, selectedStage, setSelectedStage, maxStage }: any) {
  const entries = Object.keys(clinicalStageCategories).map(
    (k) => [k, (clinicalStageCategories as any)[k]] as any
  );
  const totalStages = entries.length;
  const phase4SlotIndex = (clinicalStageCategories as any).PHASE_4.index;

  if (!maxStage) return null;

  // fade everything after this
  const lastStageToColor = records.WITHDRAWAL
    ? "WITHDRAWAL"
    : records.PHASE_4
      ? "PHASE_4"
      : maxStage;
  const lastStageToColorIndex = (clinicalStageCategories as any)[lastStageToColor].index;

  const firstSlotCenterPct = (0.5 / totalStages) * 100;
  const phase4SlotCenterPct = ((phase4SlotIndex + 0.5) / totalStages) * 100;
  const lineLeftPct = firstSlotCenterPct;
  const lineWidthPct = Math.max(phase4SlotCenterPct - firstSlotCenterPct, 0);

  const pct = Math.min((lastStageToColorIndex / phase4SlotIndex) * 100, 100);

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: "1rem",
        right: "2.5rem",
        display: "grid",
        gridTemplateColumns: `repeat(${totalStages}, 1fr)`,
        alignItems: "end",
        mb: "3rem",
      }}
    >
      {/* single absolute line behind all circles – stops at Phase IV */}
      <Box
        sx={{
          position: "absolute",
          bottom: `${usedCircleWidth / 2 - lineWidth / 2}px`,
          left: `${lineLeftPct}%`,
          width: `${lineWidthPct}%`,
          height: `${lineWidth}px`,
          background: (theme) => {
            return `linear-gradient(
              to right,
              ${theme.palette.primary.main} 0%,
              ${theme.palette.primary.main} ${pct}%,
              rgba(136,136,136,0.25) ${pct}%,
              rgba(136,136,136,0.25) 100%
            )`;
          },
          zIndex: 0,
        }}
      />

      {/* evenly spaced stage columns */}
      {entries.map(([stage, { index, label }]: any) => {
        const hasRecords = records[stage]?.length > 0;
        const isWithdrawnIndex = index === entries.length - 1;
        const circleWidth = hasRecords ? usedCircleWidth : emptyCircleWidth;

        return (
          <Box
            key={stage}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              zIndex: 1,
            }}
          >
            <Box sx={{ height: "50px", position: "relative", width: "100%" }}>
              <Typography
                variant="caption"
                component="span"
                sx={{
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  transform: `translateX(6px) rotate(-45deg)`,
                  transformOrigin: "bottom left",
                  whiteSpace: "nowrap",
                  fontWeight: stage === selectedStage ? 700 : 400,
                  opacity: index > lastStageToColorIndex ? 0.42 : 1,
                }}
              >
                {label}
              </Typography>
            </Box>
            <Box
              component={hasRecords ? "button" : "div"}
              sx={{
                borderRadius: isWithdrawnIndex ? 0 : `${circleWidth / 2}px`,
                boxShadow: (theme: any) =>
                  hasRecords && stage !== selectedStage ? theme.boxShadow.md : "none",
                borderStyle: "solid",
                borderWidth: `${stage === selectedStage ? 2 : 1}px`,
                borderColor: `${index > lastStageToColorIndex ? "rgba(136,136,136,0.3)" : "primary.main"}`,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: `${circleWidth}px`,
                height: `${circleWidth}px`,
                cursor: hasRecords && stage !== selectedStage ? "pointer" : "auto",
                my: hasRecords ? 0 : `${(usedCircleWidth - emptyCircleWidth) / 2}px`,
                color: stage === selectedStage ? "#fff" : "primary.main",
                bgcolor:
                  stage === selectedStage
                    ? "primary.main"
                    : hasRecords
                      ? "#ecf7ff"
                      : "background.paper",
                "&:hover": {
                  bgcolor:
                    stage === selectedStage
                      ? "primary.main"
                      : hasRecords
                        ? "#e1eff9"
                        : "background.paper",
                },
              }}
              onClick={hasRecords ? () => setSelectedStage(stage) : undefined}
            >
              {hasRecords && (
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: hasRecords ? 700 : 400,
                    opacity: index > lastStageToColorIndex ? 0.3 : 1,
                    fontSize: 11.5,
                  }}
                >
                  {records[stage].length}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export default StageFilter;
