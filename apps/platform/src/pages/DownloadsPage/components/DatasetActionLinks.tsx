import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCode } from "@fortawesome/free-solid-svg-icons";
import { MuiButton } from "ui";
import { Link, useLocation } from "react-router";
import { RADIUS } from "./tokens";

interface DatasetActionLinksProps {
  datasetId: string;
  /** Stops click bubbling (e.g. when rendered inside something else clickable) */
  stopPropagation?: boolean;
}

export const smallOutlinedButtonSx = {
  fontSize: ".8125rem",
  minHeight: 30,
  height: 30,
  padding: "4px 10px",
  whiteSpace: "nowrap",
  flex: "none",
  borderRadius: RADIUS,
  gap: 0.75,
  lineHeight: 1.2,
  color: "text.primary",
} as const;

/**
 * The `Schema` and `Access data` buttons shared by DatasetCard, the network
 * hover popover and the details panel. Both keep today's dialog routes and
 * carry the current query string along, so opening a dialog from the
 * network view doesn't drop `?view=network`.
 */
function DatasetActionLinks({ datasetId, stopPropagation = false }: DatasetActionLinksProps) {
  const { search } = useLocation();
  const onClick = stopPropagation ? (e: React.MouseEvent) => e.stopPropagation() : undefined;

  return (
    <>
      <MuiButton
        component={Link}
        to={{ pathname: `/downloads/${datasetId}/schema`, search }}
        onClick={onClick}
        variant="outlined"
        sx={smallOutlinedButtonSx}
      >
        <FontAwesomeIcon icon={faCode} style={{ fontSize: 12 }} />
        Schema
      </MuiButton>
      <MuiButton
        component={Link}
        to={{ pathname: `/downloads/${datasetId}/access`, search }}
        onClick={onClick}
        variant="outlined"
        sx={smallOutlinedButtonSx}
      >
        Access data
      </MuiButton>
    </>
  );
}

export default DatasetActionLinks;
