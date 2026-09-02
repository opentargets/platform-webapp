import { Button, Grid } from "@mui/material";

import downloadSvg from "./DownloadSvg";
import PlotContainer from "../PlotContainer";

const handleSvgDownload = (svgContainer, filenameStem) => {
  const svgNode = svgContainer.current;
  if (svgNode === null) return;
  downloadSvg({ svgNode, filenameStem });
};

function DownloadSvgPlot({
  loading,
  error,
  left,
  center,
  svgContainer,
  filenameStem,
  reportDownloadEvent,
  children,
}) {
  return (
    <PlotContainer
      loading={loading}
      error={error}
      left={left}
      center={center}
      right={
        <Grid container justifyContent="flex-end" spacing={1}>
          <Grid item>
            <Button
              variant="outlined"
              onClick={() => {
                if (reportDownloadEvent) {
                  reportDownloadEvent();
                }
                handleSvgDownload(svgContainer, filenameStem);
              }}
            >
              SVG
            </Button>
          </Grid>
        </Grid>
      }
    >
      {children}
    </PlotContainer>
  );
}

export default DownloadSvgPlot;
