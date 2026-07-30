import { styled, useTheme } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartBar } from "@fortawesome/free-solid-svg-icons";
import { Highlights, Link, StudyPublication, Box, Typography } from "ui";
import { getStudyItemMetaData } from "@ot/utils";

const subtitleSx = { fontSize: "20px", fontWeight: 500 };

const StyledLink = styled(Link)(subtitleSx);

function StudyResult({ data, highlights }) {
  const theme = useTheme();

  return (
    <div style={{ marginBottom: "30px" }}>
      <StyledLink to={`/study/${data.id}`}>
        <FontAwesomeIcon icon={faChartBar} color={theme.palette.primary.main} />{" "}
        <>{data.traitFromSource}</>
      </StyledLink>
      <Typography sx={subtitleSx} variant="subtitle1">
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
