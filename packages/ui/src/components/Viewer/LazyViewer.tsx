import { lazy, Suspense } from "react";
import LoadingBackdrop from "../LoadingBackdrop";

const ViewerImpl = lazy(() => import("./Viewer"));

function Viewer(props) {
  const height = typeof props.height === "number" ? props.height : 400;
  return (
    <Suspense fallback={<LoadingBackdrop height={height} />}>
      <ViewerImpl {...props} />
    </Suspense>
  );
}

export default Viewer;
