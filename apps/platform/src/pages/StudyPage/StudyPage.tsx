import { ReactElement } from "react";
import { PageMeta, ScrollToTop } from "ui";
import { Box, Tabs, Tab } from "@mui/material";
import { LoaderFunctionArgs, useLoaderData, useLocation, useParams, Link } from "react-router";
import Header from "./Header";
import NotFoundPage from "../NotFoundPage";
import STUDY_PAGE_QUERY from "./StudyPage.gql";
import Profile from "./Profile";
import { apolloClient } from "../../apolloClient";

export async function loader({ params }: LoaderFunctionArgs) {
  const { data } = await apolloClient.query({
    query: STUDY_PAGE_QUERY,
    variables: { studyId: params.studyId },
  });
  return data;
}

function StudyPage(): ReactElement {
  const location = useLocation();
  const { studyId } = useParams() as { studyId: string };
  const data = useLoaderData<typeof loader>();

  if (data && !data.study) {
    return <NotFoundPage />;
  }
  const study = data?.study;
  const studyType = study?.studyType;
  const projectId = study?.projectId;

  return (
    <>
      <PageMeta
        title={`${study?.id} profile page`}
        description={`Annotation information for ${study?.id}`}
        location={location}
      />
      <Header
        loading={false}
        studyId={studyId}
        backgroundTraits={study?.backgroundTraits}
        targetId={study?.target?.id}
        diseases={study?.diseases}
        projectId={projectId}
      />
      <ScrollToTop />

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={location.pathname}>
          <Tab
            label={<Box sx={{ textTransform: "capitalize" }}>Profile</Box>}
            value={`/study/${studyId}`}
            component={Link}
            to={`/study/${studyId}`}
          />
        </Tabs>
      </Box>
      <Profile
        studyId={studyId}
        studyType={studyType}
        projectId={projectId}
        diseases={study?.diseases}
      />
    </>
  );
}

export default StudyPage;
