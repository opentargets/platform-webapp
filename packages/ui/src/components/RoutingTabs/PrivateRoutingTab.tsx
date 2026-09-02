import { Tab } from "@mui/material";
import { Link } from "react-router-dom";
import usePermissions from "../../hooks/usePermissions";

function PrivateRoutingTab({ component, ...props }) {
  const { isPartnerPreview } = usePermissions();
  if (!isPartnerPreview) return null;
  return component ? (
    // TODO: review props spreading
    // eslint-disable-next-line
    <Tab component={Link} to={props.value} {...props} />
  ) : (
    // TODO: review props spreading
    // eslint-disable-next-line
    <Tab component="a" href={props.url} {...props} />
  );
}

export default PrivateRoutingTab;
