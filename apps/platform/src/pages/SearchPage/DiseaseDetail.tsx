import { styled } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStethoscope } from "@fortawesome/free-solid-svg-icons";

import { LongText, Link, CardContent, Typography } from "ui";

const StyledLink = styled(Link)({
  display: "block",
});

function DiseaseDetail({ data }) {
  const { id, name, description, therapeuticAreas } = data;
  return (
    <CardContent>
      <Typography color="primary" variant="h5">
        <Link to={`/disease/${id}/associations`}>{name}</Link>
      </Typography>
      <Typography color="primary">
        <FontAwesomeIcon icon={faStethoscope} /> Disease or phenotype
      </Typography>
      <LongText lineLimit={4}>{description}</LongText>
      {therapeuticAreas.length > 0 && (
        <>
          <Typography sx={{ fontWeight: 500 }} variant="subtitle1">
            Therapeutic areas
          </Typography>
          {therapeuticAreas.map(area => (
            <StyledLink key={area.id} to={`/disease/${area.id}`}>
              {area.name}
            </StyledLink>
          ))}
        </>
      )}
    </CardContent>
  );
}

export default DiseaseDetail;
