import { Box, GridLegacy, Skeleton, SxProps, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, ReactNode } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

type HeaderProps = {
  externalLinks?: ReactNode;
  Icon: IconProp;
  loading: boolean;
  rightContent?: ReactNode;
  subtitle?: string | null;
  title: string;
};

const iconHeaderStyles: SxProps = {
  width: "56px",
  marginRight: "4px !important",
  justifyContent: "center",
  alignItems: "center",
  display: {
    xs: "none",
    md: "flex",
  },
};

const iconTextStyles: SxProps = {
  marginRight: "4px !important",
  display: {
    xs: "inline-block",
    md: "none",
  },
};

function Header({
  loading,
  Icon,
  title,
  subtitle = null,
  externalLinks,
  rightContent = null,
}: HeaderProps): ReactElement {
  const theme = useTheme();

  return (
    <GridLegacy
      sx={{ justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}
      data-testid="profile-page-header-block"
      container
      id="profile-page-header-block"
    >
      <GridLegacy item zeroMinWidth>
        <GridLegacy container wrap="nowrap">
          <Box sx={iconHeaderStyles}>
            <FontAwesomeIcon icon={Icon} size="3x" color={theme.palette.primary.dark} />
          </Box>
          <GridLegacy item zeroMinWidth>
            <GridLegacy container sx={{ mb: { xs: 2, md: 0 } }}>
              <Typography
                data-testid="profile-page-header-text"
                sx={{ color: "primary.dark", fontWeight: "500 !important" }}
                variant="h4"
                noWrap
                title={title}
              >
                <Box component="span" sx={iconTextStyles}>
                  <FontAwesomeIcon icon={Icon} size="sm" color={theme.palette.primary.dark} />
                </Box>
                {loading ? <Skeleton width="10vw" /> : title}
              </Typography>
              <Typography sx={{ display: "flex", paddingLeft: "5px", alignItems: "center" }} variant="h5">
                {loading ? <Skeleton width="50vw" /> : subtitle}
              </Typography>
            </GridLegacy>
            <GridLegacy container sx={{ mb: { xs: 2, md: 0 } }}>
              <Typography
                variant="body2"
                sx={{ "& > :not(:first-of-type):before": { content: '" | "' } }}
                data-testid="external-links"
              >
                {loading ? <Skeleton width="50vw" /> : externalLinks}
              </Typography>
            </GridLegacy>
          </GridLegacy>
        </GridLegacy>
      </GridLegacy>
      <GridLegacy item>{rightContent}</GridLegacy>
    </GridLegacy>
  );
}

export default Header;
