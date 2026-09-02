import { CardContent, Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStethoscope } from "@fortawesome/free-solid-svg-icons";

import { LongText, Link } from "ui";

const useStyles = makeStyles({
  link: {
    display: "block",
  },
  subtitle: {
    fontWeight: 500,
  },
});

function DiseaseDetail({ data }) {
  const { id, name, description, therapeuticAreas } = data;
  const classes = useStyles();
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
          <Typography className={classes.subtitle} variant="subtitle1">
            Therapeutic areas
          </Typography>
          {therapeuticAreas.map(area => (
            <Link key={area.id} className={classes.link} to={`/disease/${area.id}`}>
              {area.name}
            </Link>
          ))}
        </>
      )}
    </CardContent>
  );
}

export default DiseaseDetail;
