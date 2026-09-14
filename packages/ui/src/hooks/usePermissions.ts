import { getConfig } from "@ot/config";

interface Profile {
  isPartnerPreview?: boolean;
}

interface Permissions {
  isPartnerPreview: boolean;
}

function usePermissions(): Permissions {
  const config = getConfig();
  const profile = config.profile as Profile;

  return {
    isPartnerPreview: profile.isPartnerPreview ?? false,
  };
}

export default usePermissions;
