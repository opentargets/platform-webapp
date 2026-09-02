import { CardContent, Typography } from "@mui/material";
import { makeStyles, useTheme } from "@mui/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDna } from "@fortawesome/free-solid-svg-icons";

import { Link } from "ui";
import TargetDescription from "../TargetPage/TargetDescription";
import { getUniprotIds, clearDescriptionCodes } from "@ot/utils";

const useStyles = makeStyles(() => ({
  subtitle: {
    fontWeight: 500,
  },
}));

function TargetDetail({ data }) {
  const { id, approvedSymbol, approvedName, functionDescriptions, biotype, proteinIds } = data;

  const classes = useStyles();
  const theme = useTheme();

  const uniprotIds = getUniprotIds(proteinIds);

  const targetDescription = clearDescriptionCodes(functionDescriptions, theme.palette.primary.main);

  return (
    <CardContent>
      <Typography color="primary" variant="h5">
        <Link to={`/target/${id}/associations`}>{approvedSymbol}</Link>
      </Typography>
      <Typography variant="subtitle2">{approvedName}</Typography>
      <Typography color="primary">
        <FontAwesomeIcon icon={faDna} /> Target
      </Typography>
      {targetDescription.length > 0 ? (
        <TargetDescription
          descriptions={targetDescription}
          targetId={id}
          showLabel={false}
          lineLimit={4}
        />
      ) : null}
      <Typography className={classes.subtitle} variant="subtitle1">
        Biotype
      </Typography>
      <Typography variant="body2">{biotype}</Typography>
      <Typography className={classes.subtitle} variant="subtitle1">
        UniProt accession{uniprotIds.length > 1 ? "s" : ""}
      </Typography>
      <Typography component="div" variant="body2">
        {uniprotIds.map(uniprotId => (
          <div key={uniprotId}>{uniprotId}</div>
        ))}
      </Typography>
    </CardContent>
  );
}

export default TargetDetail;
