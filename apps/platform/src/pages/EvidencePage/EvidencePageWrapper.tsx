import { Suspense, lazy } from "react";
import { LoadingBackdrop } from "ui";

const EvidencePage = lazy(() => import("./EvidencePage"));

function EvidencePageWrapper() {
  return (
    <Suspense fallback={<LoadingBackdrop />}>
      <EvidencePage />
    </Suspense>
  );
}

export default EvidencePageWrapper;
