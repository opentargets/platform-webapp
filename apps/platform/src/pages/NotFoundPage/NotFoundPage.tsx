import { Typography } from "@mui/material";

import { EmptyPage, PageMeta } from "ui";
import { getConfig } from "@ot/config";

const config = getConfig();

function NotFoundPage() {
  return (
    <>
      <PageMeta />
      <EmptyPage
        communityLink={config.profile.communityUrl}
        documentationLink={config.profile.documentationUrl}
      >
        <Typography>This page could not be found.</Typography>
      </EmptyPage>
    </>
  );
}

export default NotFoundPage;
