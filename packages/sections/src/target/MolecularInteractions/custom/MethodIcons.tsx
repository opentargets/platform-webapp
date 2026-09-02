import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle, faArrowsAltH, faExpandArrowsAlt } from "@fortawesome/free-solid-svg-icons";
import { v1 } from "uuid";
import { Tooltip } from "ui";

function MethodIcon({ tooltip, enabled = true, children, notooltip, small = false }) {
  let title;

  if (!enabled || !tooltip) title = "no data";
  else if (Array.isArray(tooltip)) {
    title = tooltip.map(m => (
      <span key={v1()}>
        {m}
        <br />
      </span>
    ));
  } else title = tooltip;
  const icon = (
    <span
      className="fa-layers fa-fw"
      style={{
        marginRight: "20px",
        color: enabled ? undefined : " #e0e0e0", // theme.palette.text.disabled,
        cursor: tooltip ? "help" : "default",
        fontSize: small ? "0.7em" : "",
        marginBottom: small ? "0.1em" : "",
      }}
    >
      <FontAwesomeIcon icon={faCircle} size="2x" />
      {children}
    </span>
  );

  return notooltip ? icon : <Tooltip title={title}>{icon}</Tooltip>;
}

function MethodIconText({ tooltip, enabled = true, notooltip, children, small = false }) {
  return (
    <MethodIcon tooltip={tooltip} enabled={enabled} notooltip={notooltip} small={small}>
      <span
        className="fa-layers-text fa-inverse"
        data-fa-transform="shrink-10 left-2"
        style={{ left: "80%" }}
      >
        {children}
      </span>
    </MethodIcon>
  );
}

function MethodIconExpandArrow({ tooltip, enabled = true, notooltip, small = false }) {
  return (
    <MethodIcon tooltip={tooltip} enabled={enabled} notooltip={notooltip} small={small}>
      <FontAwesomeIcon icon={faExpandArrowsAlt} size="2x" inverse transform="shrink-6 right-1" />
    </MethodIcon>
  );
}

function MethodIconArrow({ tooltip, enabled = true, notooltip, small = false }) {
  return (
    <MethodIcon tooltip={tooltip} enabled={enabled} notooltip={notooltip} small={small}>
      <FontAwesomeIcon icon={faArrowsAltH} size="2x" inverse transform="shrink-6" />
    </MethodIcon>
  );
}

export { MethodIconText };
export { MethodIconExpandArrow };
export { MethodIconArrow };
