import { ReactNode } from "react";
import { SxProps } from "@mui/system";
import { usePermissions, Link, GridLegacy, Paper, Box, Typography } from "ui";

import OTLogo from "../../assets/OTLogo";
import PPOTLogo from "../../assets/PPPOTLogo";
import { grey } from "@mui/material/colors";

type StylesType = {
  homeboxContainer: SxProps;
  homeboxHeader: SxProps;
  logo: SxProps;
  dataPolicy: SxProps;
};

const styles: StylesType = {
  homeboxContainer: {
    overflow: "visible",
    mx: {
      xs: 2,
      sm: 4,
      md: "auto",
    },
    px: {
      xs: 4,
      sm: 4,
      md: 10,
    },
    py: {
      xs: 12,
      sm: 10,
    },
    maxWidth: "900px",
    margin: "auto",
    background: grey[50], // Fixed typo in 'background'
  },
  homeboxHeader: {
    textAlign: "center",
    marginBottom: "20px",
  },
  logo: {
    maxWidth: "30rem",
    width: "100%",
  },
  dataPolicy: {
    borderRadius: 2,
    padding: "24px 48px",
    maxWidth: "900px",
    margin: "auto",
    mt: 2,
    backgroundColor: grey[50],
  },
};

interface HomeBoxProps {
  children: ReactNode;
}

function HomeBox({ children }: HomeBoxProps): JSX.Element {
  const { isPartnerPreview } = usePermissions();

  return (
    <GridLegacy item xs={12} sm={12} md={8} lg={8}>
      <Paper elevation={1} sx={styles.homeboxContainer}>
        <Box sx={styles.homeboxHeader}>
          {isPartnerPreview ? <PPOTLogo sx={styles.logo} /> : <OTLogo sx={styles.logo} />}
        </Box>
        {children}
      </Paper>
      {isPartnerPreview && (
        <Paper elevation={1} sx={styles.dataPolicy}>
          <Typography variant="body2">
            The Open Targets Partner Preview Platform is for consortium members only. Data is
            confidential, pre-publication, and subject to change. See release notes for known
            issues.{" "}
            <strong>Use is restricted to partner organizations; other access is prohibited.</strong>
          </Typography>
          <Typography variant="body2" display="block" align="center">
            <strong>
              <Link
                external
                newTab
                to="http://home.opentargets.org/partner-preview-platform-data-policy"
              >
                View our data policy
              </Link>
            </strong>
          </Typography>
        </Paper>
      )}
    </GridLegacy>
  );
}

export default HomeBox;
