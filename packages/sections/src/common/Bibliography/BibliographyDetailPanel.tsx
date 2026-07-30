import { Box } from "ui";

function BibliographyDetailPanel({ children }) {
  return (
    <Box sx={theme => ({ background: theme.palette.grey[100], marginTop: "10px", padding: "20px" })}>
      {children}
    </Box>
  );
}

export default BibliographyDetailPanel;
