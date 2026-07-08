import { makeStyles } from "@mui/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartBar } from "@fortawesome/free-solid-svg-icons";
import { Highlights, Link, StudyPublication } from "ui";
import { Box, Typography } from "@mui/material";
import { getStudyItemMetaData } from "@ot/utils";

const useStyles = makeStyles(theme => ({
  container: {
    marginBottom: "30px",
  },
  subtitle: {
    fontSize: "20px",
    fontWeight: 500,
  },
  icon: {
    color: theme.palette.primary.main,
  },
}));

function StudyResult({ data, highlights }) {
  const classes = useStyles();

  return (
    <div className={classes.container}>
      <Link to={`/study/${data.id}`} className={classes.subtitle}>
        <FontAwesomeIcon icon={faChartBar} className={classes.icon} /> <>{data.traitFromSource}</>
      </Link>
      <Typography className={classes.subtitle} variant="subtitle1">
        {data.credibleSets.credibleSetsCount > -1 && (
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Box sx={{ display: "flex", flexDirection: "row", gap: 1 }}>
              <div>
                {getStudyItemMetaData({
                  studyType: data.studyType,
                  credibleSetsCount: data.credibleSets.credibleSetsCount,
                  nSamples: data.nSamples,
                })}
              </div>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "row", gap: 1 }}>
              <div>
                {" "}
                <StudyPublication
                  publicationFirstAuthor={data.publicationFirstAuthor}
                  publicationDate={data.publicationDate}
                  publicationJournal={data.publicationJournal}
                />
              </div>
            </Box>
            <div>
              {data.target?.approvedSymbol && `Affected gene: ${data.target.approvedSymbol}  • `}
              {data.biosample?.biosampleName &&
                `Affected cell/tissue: ${data.biosample.biosampleName}`}
            </div>
          </Box>
        )}
      </Typography>
      <Highlights highlights={highlights} />
    </div>
  );
}

export default StudyResult;
