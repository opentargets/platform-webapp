import { Typography } from "@mui/material";

import { EmptyPage, BasePage } from "ui";
import { getConfig } from "@ot/config";

const config = getConfig();

function NotFoundPage() {
  return (
    <BasePage>
      <EmptyPage
        communityLink={config.profile.communityUrl}
        documentationLink={config.profile.documentationUrl}
      >
        <Typography>This page could not be found.</Typography>
      </EmptyPage>
    </BasePage>
  );
}

export default NotFoundPage;
