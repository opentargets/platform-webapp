import { Box, Button, Chip, Typography, styled } from "@mui/material";
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

const ClearAllButton = styled(Button)`
  border: none;
`;

function GlobalSearchListHeader({ listHeader, children }) {
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
    <Box
      tabIndex="-1"
      sx={{
        textTransform: "capitalize",
        color: "grey.600",
        display: "flex",
        alignItems: "center",
        gap: 1,
        justifyContent: "space-between",
      }}
    >
      <Box
        data-testid={`top-hit-list-item-${listHeader}`}
        sx={{ display: "flex", alignItems: "center", gap: 1, textTransform: "uppercase" }}
      >
        <GlobalSearchIcon entity={listHeader} />
        <Typography sx={{ fontWeight: "bold" }} variant="caption">
          {getListHeader()}
        </Typography>
        <div>{getIconTag()}</div>
      </Box>
      {listHeader === "recent" && (
        <ClearAllButton onClick={clearAllRecent}>
          <Typography variant="caption">clear all</Typography>
        </ClearAllButton>
      )}
    </Box>
  );
}

export default GlobalSearchListHeader;
