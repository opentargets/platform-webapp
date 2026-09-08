import { Typography } from "@mui/material";

import BibliographyHtmlText from "./BibliographyHtmlText";

/**
 * This renders a publication abstract with highlighted matching content.
 * Props:
 *  - abstract: the abstract markup (html) as returned by LINK
 */
function Abstract({ abstract, variant = "regular" }) {
  return (
    <>
      {variant === "regular" ? (
        <Typography variant="subtitle2" gutterBottom>
          Abstract
        </Typography>
      ) : (
        ""
      )}

      <BibliographyHtmlText text={abstract} />

      {/* Legend */}
      {variant === "regular" ? (
        <Typography variant="body1" gutterBottom>
          <span data-entity="GENE">Gene</span>
          <span data-entity="DISEASE">Disease</span>
          <span data-entity="DRUG">Drug</span>
          <span data-entity="TARGET&amp;DISEASE">Target and disease</span>
        </Typography>
      ) : (
        ""
      )}
    </>
  );
}

export default Abstract;
