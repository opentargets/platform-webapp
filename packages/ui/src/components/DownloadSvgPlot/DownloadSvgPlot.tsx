import { Button, GridLegacy } from "@mui/material";
import PlotContainer from "../PlotContainer";
import downloadSvg from "./DownloadSvg";

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
        <GridLegacy container justifyContent="flex-end" spacing={1}>
          <GridLegacy item>
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
          </GridLegacy>
        </GridLegacy>
      }
    >
      {children}
    </PlotContainer>
  );
}

export default DownloadSvgPlot;
