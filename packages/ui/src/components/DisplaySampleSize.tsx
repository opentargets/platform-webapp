import { Typography } from "@mui/material";
import { Tooltip } from "ui";

type DisplaySampleSizeProps = {
  nSamples: number;
  cohorts?: string[];
  initialSampleSize?: string;
};

export default function DisplaySampleSize({
  nSamples,
  cohorts,
  initialSampleSize,
}: DisplaySampleSizeProps) {
  const display = (
    <>
      {nSamples?.toLocaleString()}
      {cohorts?.length > 0 ? ` (cohorts: ${cohorts.join(", ")})` : ""}
    </>
  );

  if (initialSampleSize) {
    const title = (
      <>
        <Typography variant="subtitle2">Initial sample size</Typography>
        {initialSampleSize}
      </>
    );
    return (
      <Tooltip title={title} showHelpIcon>
        {display}
      </Tooltip>
    );
  }

  return display;
}
