import { Box } from "@mui/material";
import useRatchetMinHeight from "../../hooks/useRatchetMinHeight";

function ClinicalReportsMasterDetailFrame({ master, detail }: any) {
  // the frame never shrinks, so a shorter list or detail does not move the page
  const [frameRef, minHeight] = useRatchetMinHeight<HTMLDivElement>();

  return (
    <Box
      ref={frameRef}
      sx={{
        display: "flex",
        alignItems: "stretch",
        flexWrap: { xs: "wrap", md: "nowrap" },
        columnGap: { md: 3, lg: 6 },
        rowGap: 3,
        height: "100%",
        "& .MuiCardContent-root": {
          padding: "0 !important",
        },
      }}
      style={{ minHeight }}
    >
      <Box
        sx={{
          flex: "0 0 auto",
          width: {
            xs: "100% ",
            md: "clamp(270px, 30%, 300px)",
          },
          alignSelf: { md: "stretch" },
        }}
      >
        {master}
      </Box>

      <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>{detail}</Box>
    </Box>
  );
}

export default ClinicalReportsMasterDetailFrame;
