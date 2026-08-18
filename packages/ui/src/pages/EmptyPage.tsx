import { Box } from "@mui/material";
import { Button, Typography } from "@mui/material";

import { ReactNode } from "react";
import Link from "../components/Link";
import BrokenSearchIcon from "../components/icons/BrokenSearchIcon";

const hiddenMobileSx = {
  "@media (max-width: 767px)": {
    display: "none",
  },
};

type EmptyPageProps = {
  children: ReactNode;
  documentationLink?: string;
  communityLink?: string;
};
function EmptyPage({
  children,
  documentationLink = "https://platform-docs.opentargets.org",
  communityLink = "https://community.opentargets.org",
}: EmptyPageProps) {
  return (
    <Box
      sx={{
        minHeight: "500px",
        display: "flex",
        justifyContent: "center",
        height: "80vh",
        alignItems: "center",
      }}
    >
      <Box sx={[hiddenMobileSx, { fontSize: "13em" }]}>
        <BrokenSearchIcon />
      </Box>
      <Box
        sx={[
          hiddenMobileSx,
          theme => ({
            borderRight: `1px solid ${theme.palette.grey[500]}`,
            height: "65%",
            margin: "0 4em",
          }),
        ]}
      />
      <div className="message-body-container">
        <Typography variant="h2" sx={{ color: "primary.main", fontWeight: "700" }}>
          404: Page not found
        </Typography>
        <Box sx={{ padding: "4em 0" }}>
          <Typography>
            We can't find the page you're looking for.

            You could try:
            <ul>
            <li>search for a target, disease, drug, variant, or study in the search bar</li>
            <li>check our{" "}
            <Link external to={documentationLink}>
              Documentation
            </Link>{" "}
            to see if we've moved the page you are looking for</li>
            <li>get in touch on the{" "}
            <Link external to={communityLink}>
              Community
            </Link>{" "}
            to report the error</li>
            </ul>
            <br/>
            Thanks!
          </Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Button href="/" variant="contained" color="primary">
            Go back to Home Page
          </Button>
        </Box>
      </div>
    </Box>
  );
}

export default EmptyPage;
