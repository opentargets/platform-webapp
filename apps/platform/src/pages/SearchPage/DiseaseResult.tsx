import { Typography } from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStethoscope } from "@fortawesome/free-solid-svg-icons";

import { LongText, Link, Highlights } from "ui";

const StyledLink = styled(Link)({
  fontSize: "20px",
  fontWeight: 500,
});

function DiseaseResult({ data, highlights }) {
  const theme = useTheme();
  return (
    <div style={{ marginBottom: "30px" }}>
      <StyledLink to={`/disease/${data.id}/associations`}>
        <FontAwesomeIcon icon={faStethoscope} color={theme.palette.primary.main} /> {data.name}
      </StyledLink>
      {data.description && (
        <Typography variant="body2" component="div">
          <LongText lineLimit="4">{data.description}</LongText>
        </Typography>
      )}
      <Highlights highlights={highlights} />
    </div>
  );
}

export default DiseaseResult;
