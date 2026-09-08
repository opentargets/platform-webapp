import { Box, Typography } from "@mui/material";

import { LongText, Link } from "ui";

const pmUrl = "https://europepmc.org/";
// const pmTitleUrl = 'abstract/med/';

/**
 * This renders a publication block in the bibliography details.
 * Props:
 *  - pmId
 *  - title
 *  - titleHtml
 *  - authors
 *  - source
 *  - patentDetails
 *  - journal: {
 *      title
 *      date
 *      ref
 *    }
 *  - variant: "regular" (default) or "small" (has smaller titles)
 */

function SimplePublication({
  pmId,
  title,
  titleHtml,
  authors,
  journal,
  variant = "regular",
  source,
  patentDetails,
}) {
  const isSourcePAT = source === "PAT";
  const sourceScope = isSourcePAT ? "abstract/pat/" : "abstract/med/";
  const pubURL = pmUrl + sourceScope + pmId;

  return (
    <>
      {/* paper title */}
      <Typography variant={variant === "small" ? "subtitle2" : "subtitle1"}>
        <Link external to={pubURL}>
          {titleHtml ? (
            <span
              dangerouslySetInnerHTML={{ __html: titleHtml }}
              style={{ whiteSpace: "normal" }}
            />
          ) : (
            title
          )}
        </Link>
      </Typography>

      {/* paper data */}
      {/* authors */}
      <Box style={{ whiteSpace: "normal" }}>
        <LongText lineLimit={1} variant={variant === "small" ? "caption" : "body2"}>
          {authors
            .map(author => author.lastName + (author.initials ? ` ${author.initials}` : ""))
            .join(", ")}
        </LongText>
      </Box>

      {isSourcePAT ? (
        <Typography variant={variant === "small" ? "caption" : "body2"}>
          {/* journal, year, reference */}
          {patentDetails.typeDescription}
          {" - "}
          <span>{patentDetails.country}</span>
        </Typography>
      ) : (
        <Typography variant={variant === "small" ? "caption" : "body2"}>
          {/* journal, year, reference */}
          {journal.title}{" "}
          <span>
            <b>{journal?.date?.substring(0, 4)}</b>
          </span>{" "}
          <span>{journal.ref.volume}</span>
          <span>({journal.ref.issue})</span>
          <span>:{journal.ref.pgn}</span>
        </Typography>
      )}
    </>
  );
}

export default SimplePublication;
