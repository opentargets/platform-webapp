import { Typography } from "@mui/material";

function BibliographyHtmlText({ text }) {
  return <Typography variant="body1" dangerouslySetInnerHTML={{ __html: text }} />;
}

export default BibliographyHtmlText;
