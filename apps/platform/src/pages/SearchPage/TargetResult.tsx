import { makeStyles, useTheme } from "@mui/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDna } from "@fortawesome/free-solid-svg-icons";
import { Highlights, Link } from "ui";

import { clearDescriptionCodes } from "@ot/utils";
import TargetDescription from "../TargetPage/TargetDescription";

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

function TargetResult({ data, highlights }) {
  const classes = useStyles();
  const theme = useTheme();
  const targetDescription = clearDescriptionCodes(
    data.functionDescriptions,
    theme.palette.primary.main
  );

  return (
    <div className={classes.container}>
      <Link to={`/target/${data.id}/associations`} className={classes.subtitle}>
        <FontAwesomeIcon icon={faDna} className={classes.icon} /> {data.approvedSymbol}
      </Link>
      {data.functionDescriptions.length > 0 ? (
        <TargetDescription
          descriptions={targetDescription}
          targetId={data.id}
          showLabel={false}
          lineLimit={4}
        />
      ) : null}
      <Highlights highlights={highlights} />
    </div>
  );
}

export default TargetResult;
