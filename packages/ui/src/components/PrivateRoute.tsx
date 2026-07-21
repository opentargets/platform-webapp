import { Navigate } from "react-router";
import usePermissions from "../hooks/usePermissions";
import { ReactNode } from "react";

type PrivateRouteProps = {
  children: ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const { isPartnerPreview } = usePermissions();

  if (!isPartnerPreview) {
    return <Navigate to="/404" />;
  }

  return children;
}

export default PrivateRoute;
