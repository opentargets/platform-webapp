import {
  faChartBar,
  faDna,
  faMapPin,
  faPrescriptionBottleAlt,
  faStar,
  faStethoscope,
  faTag,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const labelIconStyle = { fontSize: "0.8rem" };

function GlobalSearchIcon({ entity }: { entity: string }) {
  function getIcon() {
    switch (entity) {
      case "topHit":
        return <FontAwesomeIcon icon={faStar} style={labelIconStyle} />;
      case "drugs":
      case "drug":
        return (
          <FontAwesomeIcon
            icon={faPrescriptionBottleAlt}
            fixedWidth
            style={labelIconStyle}
          />
        );
      case "diseases":
      case "disease":
        return <FontAwesomeIcon icon={faStethoscope} fixedWidth style={labelIconStyle} />;
      case "targets":
      case "target":
        return <FontAwesomeIcon icon={faDna} fixedWidth style={labelIconStyle} />;
      case "variants":
      case "variant":
        return <FontAwesomeIcon icon={faMapPin} fixedWidth style={labelIconStyle} />;
      case "studies":
      case "study":
        return <FontAwesomeIcon icon={faChartBar} fixedWidth style={labelIconStyle} />;
      case "recent":
      case "Search Suggestions":
      case "filter":
      case "All":
        return null;
      default:
        return <FontAwesomeIcon icon={faTag} />;
    }
  }

  return <>{getIcon()}</>;
}
export default GlobalSearchIcon;
