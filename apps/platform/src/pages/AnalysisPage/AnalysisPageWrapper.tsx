import { Suspense, lazy } from "react";
import { LoadingBackdrop } from "ui";

const AnalysisPage = lazy(() => import("./AnalysisPage"));

function AnalysisPageWrapper() {
  return (
    <Suspense fallback={<LoadingBackdrop />}>
      <AnalysisPage />
    </Suspense>
  );
}

export default AnalysisPageWrapper;
