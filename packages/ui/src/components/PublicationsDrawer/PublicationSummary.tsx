import { useEffect, useState } from "react";
import { Collapse, Box, Typography, Button } from "@mui/material";

import { faCircleNodes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { publicationSummaryQuery } from "@ot/utils";
import PublicationActionsTooltip from "./PublicationActionsTooltip";
import SummaryLoader from "./SummaryLoader";
import PublicationSummaryLabel from "./PublicationSummaryLabel";

type LoadingState = true | false;
type CollapsedState = true | false;
type TextState = string | null;
type PublicationSummaryProps = {
  pmcId: string;
  symbol: string;
  name: string;
};

const helpText =
  "Evidence summarisation based on the available full-text article. Free-to-use full-text article provided by Europe PMC and summarised using OpenAI's gpt-3.5-turbo model.";

function PublicationSummary({ pmcId, symbol, name }: PublicationSummaryProps): JSX.Element {
  const [loading, setLoading] = useState<LoadingState>(false);
  const [error, setError] = useState<TextState>(null);
  const [summaryText, setSummaryText] = useState<TextState>(null);
  const [collapseOpen, setCollapseOpen] = useState<CollapsedState>(false);

  const handleChange = () => {
    setCollapseOpen(prev => !prev);
  };

  function requestSummary({ baseUrl, requestOptions }: any) {
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
    const requestOptions: RequestInit = {
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
      const requestOptions: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload: body.payload }),
      };

      requestSummary({ baseUrl, requestOptions });
    };
    if (collapseOpen && summaryText === null) {
      fetchData();
    }
  }, [collapseOpen]);

  return (
    <div>
      <PublicationActionsTooltip title={helpText} placement="top">
        <Button
          sx={{ margin: "0 " }}
          variant="outlined"
          size="small"
          onClick={() => {
            handleChange();
          }}
          startIcon={<FontAwesomeIcon icon={faCircleNodes} size="sm" />}
        >
          Show summary
        </Button>
      </PublicationActionsTooltip>
      <Collapse in={collapseOpen}>
        <Box
          sx={theme => ({
            background: theme.palette.grey[100],
            marginTop: "10px",
            marginBottom: "10px",
            padding: "25px 20px",
            position: "relative",
          })}
        >
          {loading && <SummaryLoader />}
          {!loading && error && (
            <>
              <span style={{ whiteSpace: "normal" }}>
                <b>Error: </b>
                {error}
              </span>
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
              <span style={{ whiteSpace: "normal" }}>{summaryText}</span>
            </>
          )}
          <PublicationSummaryLabel />
        </Box>
      </Collapse>
    </div>
  );
}

export default PublicationSummary;
