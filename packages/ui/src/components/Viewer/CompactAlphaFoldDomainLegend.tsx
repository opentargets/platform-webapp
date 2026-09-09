import { Box, Typography } from "@mui/material";

export default function CompactAlphaFoldDomainLegend({ domains, colorScheme }) {
  return (
    <Box
      sx={{
        display: "flex",
        columnGap: 1.5,
        rowGap: 0.5,
        flexWrap: "wrap",
        justifyContent: { xs: "start", lg: "end" },
        alignItems: "center",
      }}
    >
      {domains.descriptions.length === 0 ? (
        <Typography variant="caption" sx={{ fontStyle: "italic" }}>
          No annotated domains
        </Typography>
      ) : (
        domains.descriptions.map((description) => (
          <Box key={description} sx={{ display: "inline-flex", gap: 0.5, alignItems: "center" }}>
            <Box
              borderRadius="2px"
              width="11px"
              height="11px"
              bgcolor={colorScheme[domains.descriptionToIndex[description]]}
            />
            <Typography variant="caption">{description}</Typography>
          </Box>
        ))
      )}
    </Box>
  );
}
