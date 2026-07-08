import { makeStyles } from "@mui/styles";
import { Button, Chip, Typography, styled } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPrescriptionBottleAlt,
  faStethoscope,
  faDna,
  faChartBar,
  faMapPin,
  faStar,
  faTag,
} from "@fortawesome/free-solid-svg-icons";
import { clearAllRecent } from "./utils/searchUtils";
import GlobalSearchIcon from "./GlobalSearchIcon";

const useStyles = makeStyles(theme => ({
  sectionHeader: {
    textTransform: "capitalize",
    color: theme.palette.grey[600],
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    justifyContent: "space-between",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    textTransform: "uppercase",
  },
}));

const ClearAllButton = styled(Button)`
  border: none;
`;

function GlobalSearchListHeader({ listHeader, children }) {
  const classes = useStyles();

  const NewChip = (
    <Chip
      style={{
        fontSize: "0.7rem",
        margin: "0",
      }}
      size="small"
      color="primary"
      label="new"
    />
  );

  if (!listHeader) return { children };

  function getIconTag() {
    switch (listHeader) {
      case "variants":
        return NewChip;
      case "studies":
        return NewChip;
      default:
        return null;
    }
  }

  function getListHeader() {
    switch (listHeader) {
      case "studies":
        return "GWAS studies";
      default:
        return listHeader;
    }
  }

  return (
    <div tabIndex="-1" className={classes.sectionHeader}>
      <div  data-testid={`top-hit-list-item-${listHeader}`} className={classes.label}>
        <GlobalSearchIcon entity={listHeader} />
        <Typography sx={{ fontWeight: "bold" }} variant="caption">
          {getListHeader()}
        </Typography>
        <div>{getIconTag()}</div>
      </div>
      {listHeader === "recent" && (
        <ClearAllButton onClick={clearAllRecent}>
          <Typography variant="caption">clear all</Typography>
        </ClearAllButton>
      )}
    </div>
  );
}

export default GlobalSearchListHeader;
