import { Suspense, lazy } from "react";
import { useLocation } from "react-router-dom";
import { LoadingBackdrop, BasePage } from "ui";

const ProjectPage = lazy(() => import("./ProjectsPage"));

function ProjectsPageWrapper() {
  const location = useLocation();
  return (
    <BasePage
      title="Projects page | Open Targets Platform"
      description="Projects page | Open Targets Platform"
      location={location}
    >
      <Suspense fallback={<LoadingBackdrop />}>
        <ProjectPage />
      </Suspense>
    </BasePage>
  );
}

export default ProjectsPageWrapper;
