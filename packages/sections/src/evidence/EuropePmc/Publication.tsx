import { useState, useEffect } from "react";
import { v1 } from "uuid";
import { Button } from "@mui/material";
import { styled } from "@mui/material/styles";
import { PublicationSummaryLabel, SummaryLoader, useConfigContext, Box, Typography } from "ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNodes, faCircleMinus, faCirclePlus } from "@fortawesome/free-solid-svg-icons";

import { publicationSummaryQuery } from "@ot/utils";

import { naLabel } from "@ot/constants";
import SentenceMatch from "./SentenceMatch";
import SimplePublication from "../../common/Bibliography/SimplePublication";

const StyledAbstractSpan = styled("span")({
  whiteSpace: "normal",
});

const StyledDetailsButton = styled(Button)({
  // margin: "1rem !important",
  color: "#5a5f5f !important",
  borderColor: "#c4c4c4 !important",
});

const StyledDetailPanel = styled(Box)(({ theme }) => ({
  background: theme.palette.grey[100],
  marginTop: "10px",
  marginBottom: "10px",
  padding: "25px 20px",
  position: "relative",
}));

const StyledBtnsContainer = styled("div")({
  marginTop: "1rem",
  marginBottom: "1rem",
  display: "flex",
  gap: "2rem",
});

function Publication({
  europePmcId,
  title,
  abstract,
  textMiningSentences,
  authors,
  journal,
  source = "MED",
  patentDetails = null,
  isOpenAccess,
  symbol,
  name,
  pmcId,
  fullTextOpen = false,
}) {
  const [showAbstract, setShowAbstract] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const {
    config: { urlAiApi },
  } = useConfigContext();

  const handleShowAbstractClick = () => {
    setShowAbstract(current => !current);
  };

  const handleShowMatchesClick = () => {
    setShowMatches(current => !current);
  };

  const handleShowSummaryClick = () => {
    setShowSummary(current => !current);
  };

  function requestSummary({ baseUrl, requestOptions }) {
    fetch(baseUrl, requestOptions)
      .then(response => {
        if (response.ok) return response.json();
        return response.json().then(err => {
          throw new Error(err.error);
        });
      })
      .then(data => {
        setSummaryText(data.text);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }

  const onClickRetry = () => {
    setLoading(true);
    const { baseUrl, body } = publicationSummaryQuery({
      pmcId,
      symbol,
      name,
    });
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: body.payload }),
    };
    requestSummary({ baseUrl, requestOptions });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { baseUrl, body } = publicationSummaryQuery({
        pmcId,
        symbol,
        name,
      });
      const requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload: body.payload }),
      };
      requestSummary({ baseUrl, requestOptions });
    };
    if (showSummary && summaryText === null) {
      fetchData();
    }
  }, [showSummary]);

  useEffect(() => {
    setShowAbstract(false);
    setShowMatches(false);
    setShowSummary(false);
    setSummaryText(null);
  }, [title]);

  if (!title) {
    return naLabel;
  }

  return (
    <Box>
      <SimplePublication
        pmId={europePmcId}
        titleHtml={title}
        authors={authors}
        source={source}
        patentDetails={patentDetails}
        journal={{
          title: journal?.journal?.title,
          date: journal?.yearOfPublication?.toString(),
          ref: {
            volume: journal.volume,
            issue: journal.issue,
            pgn: journal.page || naLabel,
          },
        }}
      />
      <StyledBtnsContainer>
        {fullTextOpen && isOpenAccess && urlAiApi && (
          <StyledDetailsButton
            variant="outlined"
            size="small"
            startIcon={<FontAwesomeIcon icon={faCircleNodes} size="sm" />}
            onClick={handleShowSummaryClick}
          >
            {showSummary ? "Hide summary" : "Show summary"}
          </StyledDetailsButton>
        )}
        {abstract && (
          <StyledDetailsButton
            variant="outlined"
            size="small"
            startIcon={
              showAbstract ? (
                <FontAwesomeIcon icon={faCircleMinus} />
              ) : (
                <FontAwesomeIcon icon={faCirclePlus} />
              )
            }
            onClick={handleShowAbstractClick}
          >
            {showAbstract ? "Hide abstract" : "Show abstract"}
          </StyledDetailsButton>
        )}
        {textMiningSentences && (
          <StyledDetailsButton
            variant="outlined"
            size="small"
            startIcon={
              showMatches ? (
                <FontAwesomeIcon icon={faCircleMinus} />
              ) : (
                <FontAwesomeIcon icon={faCirclePlus} />
              )
            }
            onClick={handleShowMatchesClick}
          >
            {showMatches
              ? "Hide match details"
              : `Show ${textMiningSentences.length} match details`}
          </StyledDetailsButton>
        )}
      </StyledBtnsContainer>
      <Box>
        {showSummary && (
          <StyledDetailPanel>
            {loading && <SummaryLoader />}
            {!loading && error && (
              <>
                <StyledAbstractSpan>
                  <b>Error: </b>
                  {error}
                </StyledAbstractSpan>
                <br />
                <br />
                <button type="button" onClick={onClickRetry}>
                  Retry request
                </button>
              </>
            )}
            {!loading && !error && (
              <>
                <Typography variant="subtitle2">Evidence summary</Typography>
                <StyledAbstractSpan>{summaryText}</StyledAbstractSpan>
              </>
            )}
            <PublicationSummaryLabel />
          </StyledDetailPanel>
        )}
        {showAbstract && (
          <StyledDetailPanel>
            <Typography variant="subtitle2">Abstract</Typography>
            <StyledAbstractSpan>{abstract}</StyledAbstractSpan>
          </StyledDetailPanel>
        )}
        {showMatches && (
          <StyledDetailPanel>
            <Typography variant="subtitle2">Matches</Typography>
            <table style={{ width: "100%" }}>
              <tbody>
                {textMiningSentences.map(match => (
                  <SentenceMatch key={v1()} match={match} />
                ))}
              </tbody>
            </table>
          </StyledDetailPanel>
        )}
      </Box>
    </Box>
  );
}

export default Publication;
