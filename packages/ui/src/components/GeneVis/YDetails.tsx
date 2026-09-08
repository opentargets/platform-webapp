import { Box, Typography } from "@mui/material";
import { grey } from "@mui/material/colors";
import { ElementType } from "react";

type LabelProp = string | ElementType;

function renderLabel(Label: LabelProp | undefined, defaultSx: object) {
  if (!Label) return null;
  if (typeof Label === "string") {
    return (
      <Typography variant="caption" sx={defaultSx}>
        {Label}
      </Typography>
    );
  }
  return <Label />;
}

function YDetails({
  Label,
  SubLabel,
  Axis,
}: {
  Label?: LabelProp;
  SubLabel?: LabelProp;
  Axis?: ElementType | null;
}) {
  return (
    <Box
      sx={{ 
        width: "100%", 
        height: "100%", 
        display: "flex", 
        justifyContent: "flex-end", 
        alignItems: "flex-start",
        gap: 0.75,
      }}>
      <Box sx={{ height: "100%" }}>
        {renderLabel(Label, {
          height: "100%",
          display: "flex",
          alignItems: "top",
          justifyContent: "flex-start",
          fontWeight: 500,
          color: "text.secondary",
        })}
        {renderLabel(SubLabel, {
          height: "100%",
          display: "flex",
          alignItems: "top",
          justifyContent: "flex-end",
          color: "text.secondary",
        })}
      </Box>
      {Axis ? <Axis /> : (
        <Box
          // sx={{
          //   height: "100%",
          //   borderRight: `1px solid ${grey[600]}`,
          // }}
        />
      )}
    </Box>
  );
}

export default YDetails;