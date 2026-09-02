import { Typography } from "ui";

function BibliographyHtmlText({ text }) {
  return <Typography variant="body1" dangerouslySetInnerHTML={{ __html: text }} />;
}

export default BibliographyHtmlText;
