import { Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStethoscope } from "@fortawesome/free-solid-svg-icons";

import { LongText, Link, Highlights } from "ui";

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

function DiseaseResult({ data, highlights }) {
  const classes = useStyles();
  return (
    <div className={classes.container}>
      <Link to={`/disease/${data.id}/associations`} className={classes.subtitle}>
        <FontAwesomeIcon icon={faStethoscope} className={classes.icon} /> {data.name}
      </Link>
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
