import { Suspense, lazy } from "react";
import { LoadingBackdrop } from "ui";

const StudyPage = lazy(() => import("./StudyPage"));

function StudyPageWrapper() {
  return (
    <Suspense fallback={<LoadingBackdrop />}>
      <StudyPage />
    </Suspense>
  );
}

export default StudyPageWrapper;
