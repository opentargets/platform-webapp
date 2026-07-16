import { ReactElement, ReactNode } from "react";
import classNames from "classnames";
import { Link as RouterLink } from "react-router-dom";
import { makeStyles } from "@mui/styles";
import Tooltip from "../Tooltip";
import OtAsyncTooltip from "../OtAsyncTooltip/OtAsyncTooltip";

const useStyles = makeStyles(theme => ({
  base: {
    fontSize: "inherit",
    "text-decoration-color": "transparent",
    "-webkit-text-decoration-color": "transparent",
  },
  baseDefault: {
    color: theme.palette.primary.main,
    "&:hover": {
      color: theme.palette.primary.dark,
      "text-decoration-color": theme.palette.primary.dark,
      "-webkit-text-decoration-color": theme.palette.primary.dark,
    },
  },
  baseTooltip: {
    color: theme.palette.primary.main,
    "&:hover": {
      color: theme.palette.primary.dark,
    },
    textDecoration: "none",
  },
  baseFooter: {
    color: "white",
    "text-decoration-color": "transparent",
    "-webkit-text-decoration-color": "transparent",
    "&:hover": {
      color: theme.palette.primary.light,
      "text-decoration-color": theme.palette.primary.light,
      "-webkit-text-decoration-color": theme.palette.primary.light,
    },
    display: "flex",
    alignItems: "center",
  },
}));

type LinkProptypes = {
  className?: string;
  to: string;
  onClick?: () => void | null;
  external?: boolean;
  newTab?: boolean;
  footer?: boolean;
  tooltip?: unknown;
  children: ReactNode;
  ariaLabel?: string;
  asyncTooltip?: boolean;
};

const defaultProps = {
  external: false,
  footer: false,
  tooltip: false,
  to: "/",
  children: <></>,
  asyncTooltip: false,
};

function Link({
  children,
  to,
  onClick,
  external,
  newTab,
  footer,
  tooltip,
  className,
  ariaLabel,
  asyncTooltip,
}: LinkProptypes = defaultProps): ReactElement {
  const classes = useStyles();
  const ariaLabelProp = ariaLabel ? { "aria-label": ariaLabel } : {};
  const newTabProps = newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};

  if (external)
    return (
      <a
        className={classNames(
          classes.base,
          {
            [classes.baseDefault]: !footer && !tooltip,
            [classes.baseFooter]: footer,
            [classes.baseTooltip]: tooltip,
          },
          className
        )}
        href={to}
        onClick={onClick}
        {...newTabProps}
        {...ariaLabelProp}
      >
        {children}
      </a>
    );

  if (asyncTooltip && !external) {
    const args = to.split("/");
    return (
      <RouterLink
        className={classNames(
          classes.base,
          {
            [classes.baseDefault]: !footer && !tooltip,
            [classes.baseFooter]: footer,
            [classes.baseTooltip]: tooltip,
          },
          className
        )}
        to={to}
        onClick={onClick}
      >
        <OtAsyncTooltip entity={args[1]} id={args[2]}>
          <span>{children}</span>
        </OtAsyncTooltip>
      </RouterLink>
    );
  }

  return (
    <RouterLink
      className={classNames(
        classes.base,
        {
          [classes.baseDefault]: !footer && !tooltip,
          [classes.baseFooter]: footer,
          [classes.baseTooltip]: tooltip,
        },
        className
      )}
      to={to}
      onClick={onClick}
    >
      <Tooltip title={tooltip}>{children}</Tooltip>
    </RouterLink>
  );
}

export default Link;
