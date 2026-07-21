import { Suspense, lazy } from "react";
import { LoadingBackdrop } from "ui";

const DrugPage = lazy(() => import("./DrugPage"));

function DrugPageWrapper() {
  return (
    <Suspense fallback={<LoadingBackdrop />}>
      <DrugPage />
    </Suspense>
  );
}

export default DrugPageWrapper;
