import { ReactElement, ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { styled } from "@mui/material/styles";
import Tooltip from "../Tooltip";
import OtAsyncTooltip from "../OtAsyncTooltip/OtAsyncTooltip";

const shouldForwardProp = (prop: string) => prop !== "footer" && prop !== "hasTooltip";

const linkVariantStyles = (theme: any, footer?: boolean, hasTooltip?: boolean) => {
  if (footer)
    return {
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
    };
  if (hasTooltip)
    return {
      color: theme.palette.primary.main,
      "&:hover": { color: theme.palette.primary.dark },
      textDecoration: "none",
    };
  return {
    color: theme.palette.primary.main,
    "&:hover": {
      color: theme.palette.primary.dark,
      "text-decoration-color": theme.palette.primary.dark,
      "-webkit-text-decoration-color": theme.palette.primary.dark,
    },
  };
};

const StyledA = styled("a", { shouldForwardProp })<{ footer?: boolean; hasTooltip?: boolean }>(
  ({ theme, footer, hasTooltip }) => ({
    fontSize: "inherit",
    "text-decoration-color": "transparent",
    "-webkit-text-decoration-color": "transparent",
    ...linkVariantStyles(theme, footer, hasTooltip),
  })
);

const StyledRouterLink = styled(RouterLink, { shouldForwardProp })<{
  footer?: boolean;
  hasTooltip?: boolean;
}>(({ theme, footer, hasTooltip }) => ({
  fontSize: "inherit",
  "text-decoration-color": "transparent",
  "-webkit-text-decoration-color": "transparent",
  ...linkVariantStyles(theme, footer, hasTooltip),
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
  const ariaLabelProp = ariaLabel ? { "aria-label": ariaLabel } : {};
  const newTabProps = newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};

  if (external)
    return (
      <StyledA
        footer={footer}
        hasTooltip={!!tooltip}
        className={className}
        href={to}
        onClick={onClick}
        {...newTabProps}
        {...ariaLabelProp}
      >
        {children}
      </StyledA>
    );

  if (asyncTooltip && !external) {
    const args = to.split("/");
    return (
      <StyledRouterLink
        footer={footer}
        hasTooltip={!!tooltip}
        className={className}
        to={to}
        onClick={onClick}
      >
        <OtAsyncTooltip entity={args[1]} id={args[2]}>
          <span>{children}</span>
        </OtAsyncTooltip>
      </StyledRouterLink>
    );
  }

  return (
    <StyledRouterLink footer={footer} hasTooltip={!!tooltip} className={className} to={to} onClick={onClick}>
      <Tooltip title={tooltip}>{children}</Tooltip>
    </StyledRouterLink>
  );
}

export default Link;
