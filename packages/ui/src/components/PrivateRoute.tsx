import { Navigate, Outlet } from "react-router";
import usePermissions from "../hooks/usePermissions";

function PrivateRoute() {
  const { isPartnerPreview } = usePermissions();

  if (!isPartnerPreview) {
    return <Navigate to="/404" replace />;
  }

  return <Outlet />;
}

export default PrivateRoute;
