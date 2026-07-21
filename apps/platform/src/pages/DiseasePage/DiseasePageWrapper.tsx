import { Suspense, lazy } from "react";
import { LoadingBackdrop } from "ui";

const DiseasePage = lazy(() => import("./DiseasePage"));

function DiseasePageWrapper() {
  return (
    <Suspense fallback={<LoadingBackdrop />}>
      <DiseasePage />
    </Suspense>
  );
}

export default DiseasePageWrapper;
