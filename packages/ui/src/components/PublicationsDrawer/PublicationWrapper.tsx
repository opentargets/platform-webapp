import { useState, useEffect } from "react";
import { faPlusCircle, faMinusCircle, faFileAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import LongText from "../LongText";
import Link from "../Link";

import PublicationSummary from "./PublicationSummary";
import { useConfigContext } from "../../providers/ConfigurationProvider";

const pmUrl = "https://europepmc.org/";
const pmTitleUrlMED = "abstract/med/";
const pmTitleUrlPAT = "abstract/pat/";

const StyledDetailsButton = styled(Button)({
  margin: "1rem !important",
  marginLeft: "0 !important",
  color: "#5a5f5f !important",
  borderColor: "#c4c4c4 !important",
});

const fileLabelStyle = {
  color: "#5a5f5f",
  fontSize: "0.875rem",
  fontFamily: '"Inter", "sans-serif"',
  fontWeight: 500,
};

function PublicationWrapper({
  europePmcId,
  title,
  titleHtml,
  authors,
  journal,
  variant = "regular",
  abstract,
  fullTextOpen = false,
  source = "MED",
  patentDetails,
  symbol = null,
  name = null,
  pmcId = null,
  isOpenAccess = false,
  inPMC = false,
}) {
  const [showAbstract, setShowAbstract] = useState(false);

  const {
    config: { urlAiApi },
  } = useConfigContext();

  const handleShowAbstractClick = () => {
    setShowAbstract(!showAbstract);
  };

  useEffect(() => {
    setShowAbstract(false);
  }, [europePmcId]);

  const isSourcePAT = source === "PAT";
  const sourceScope = isSourcePAT ? pmTitleUrlPAT : pmTitleUrlMED;
  const externalURL = pmUrl + sourceScope + europePmcId;

  return (
    <Box mb={2} data-testid={`literature-entry-${europePmcId}`}>
      {/* paper title */}
      <Box style={{ whiteSpace: "normal" }}>
        <Typography variant={variant === "small" ? "subtitle2" : "subtitle1"}>
          <Link external to={externalURL}>
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
      </Box>

      <Box style={{ whiteSpace: "normal" }}>
        <LongText lineLimit={1} variant={variant === "small" ? "caption" : "body2"}>
          {authors
            .reduce((acc, author) => {
              if (author.lastName)
                acc.push(author.lastName + (author.initials ? ` ${author.initials}` : ""));
              return acc;
            }, [])
            .join(", ")}
        </LongText>
      </Box>

      {isSourcePAT ? (
        <Box style={{ whiteSpace: "normal" }}>
          <Typography variant={variant === "small" ? "caption" : "body2"}>
            {patentDetails.typeDescription}
            {" - "}
            <span>{patentDetails.country}</span>
          </Typography>
        </Box>
      ) : (
        <Box style={{ whiteSpace: "normal" }}>
          <Typography variant={variant === "small" ? "caption" : "body2"}>
            {/* journal, year, reference */}
            {journal.journal?.title || ""}{" "}
            <span>
              <b>
                {journal.dateOfPublication && (journal.dateOfPublication.substring(0, 4) || "")}
              </b>
            </span>{" "}
            <span>{journal.volume || ""}</span>
            <span>{journal.issue && `(${journal.issue})`}</span>
            <span>{journal.page && `:${journal.page}`}</span>
          </Typography>
        </Box>
      )}

      <Box style={{ display: "flex", alignItems: "center" }}>
        <StyledDetailsButton
          variant="outlined"
          size="small"
          disabled={!abstract}
          onClick={handleShowAbstractClick}
          startIcon={
            showAbstract ? (
              <FontAwesomeIcon icon={faMinusCircle} size="sm" />
            ) : (
              <FontAwesomeIcon icon={faPlusCircle} size="sm" />
            )
          }
        >
          {showAbstract ? "Hide abstract" : "Show abstract"}
        </StyledDetailsButton>
        {fullTextOpen && (
          <span style={fileLabelStyle}>
            <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: "8px" }} size="lg" />
            {isOpenAccess ? "Full text free to use/read" : "Full text free to read"}
          </span>
        )}
      </Box>

      {showAbstract && (
        <Box sx={theme => ({ background: theme.palette.grey[100], marginTop: "10px", padding: "20px" })}>
          <Typography variant="subtitle2">Abstract</Typography>
          <span style={{ whiteSpace: "normal" }} dangerouslySetInnerHTML={{ __html: abstract }} />
        </Box>
      )}

      {symbol && name && fullTextOpen && isOpenAccess && urlAiApi && (
        <PublicationSummary name={name} symbol={symbol} pmcId={pmcId} />
      )}
    </Box>
  );
}

export default PublicationWrapper;
