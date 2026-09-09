import { faQuestionCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "@mui/material";
import { colorRange } from "@ot/constants";

type LegendProps = {
  url?: string;
  urlLabel?: string;
  hideLink?: boolean;
};

function Legend({ url, urlLabel, hideLink }: LegendProps) {
  const linkUrl = url || "https://platform-docs.opentargets.org/associations#association-scores";
  const linkLabel = urlLabel || "Score";

  return (
    <div>
      <span
        style={{
          display: "inline-block",
          border: "1px solid #eeefef",
          height: "20px",
          width: "20px",
        }}
      />{" "}
      <span style={{ position: "relative", bottom: "5px" }}>No data</span>
      <div style={{ display: "flex" }}>
        <div style={{ height: "20px", width: "20px", textAlign: "center" }}>0</div>
        {colorRange.map((color: string) => (
          <div
            key={color}
            style={{
              backgroundColor: color,
              height: "20px",
              width: "20px",
            }}
          />
        ))}
        <div style={{ height: "20px", width: "20px", textAlign: "center" }}>1</div>
      </div>
      {hideLink ? null : (
        <Link href={linkUrl}>
          <FontAwesomeIcon icon={faQuestionCircle} size="xs" /> {linkLabel}
        </Link>
      )}
    </div>
  );
}

export default Legend;
