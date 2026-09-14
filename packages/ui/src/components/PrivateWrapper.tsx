import type { ReactNode } from "react";
import usePermissions from "../hooks/usePermissions";

type PrivateWrapperProps = {
  children: ReactNode;
};

function PrivateWrapper({ children }: PrivateWrapperProps): ReactNode {
  const { isPartnerPreview } = usePermissions();

  return isPartnerPreview ? children : null;
}

export default PrivateWrapper;
