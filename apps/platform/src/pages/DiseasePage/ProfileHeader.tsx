import { usePlatformApi } from "ui";
import { ProfileDescription, ProfileHeader as BaseProfileHeader, ProfileChipList } from "ui";

import DISEASE_PROFILE_HEADER_FRAGMENT from "./ProfileHeader.gql";

/**
 * Disease synonyms are organized by "relation", each with a list of "terms".
 * The same term can appear under different relations.
 */
const parseSynonyms = diseaseSynonyms => {
  const t = [];
  diseaseSynonyms.forEach(s => {
    s.terms.forEach(syn => {
      const thisSyn = t.find(tItem => tItem.label === syn);
      if (!thisSyn) {
        // if the synonyms is not already in the list, we add it
        t.push({ label: syn, tooltip: [s.relation] });
      } else {
        // if it already exist, just add the relation to it
        // (i.e. it will have multiple relations)
        thisSyn.tooltip.push(s.relation);
      }
    });
  });
  // convert the tooltip array to a string for display in the Tooltip component
  t.map(tItem => {
    const syn = tItem;
    syn.tooltip = tItem.tooltip.join(", ");
    return syn;
  });
  return t;
};

function ProfileHeader() {
  const { loading, error, data } = usePlatformApi();
  const diseaseSynonyms = parseSynonyms(data?.disease.synonyms || []);

  // TODO: Errors!
  if (error) return null;

  return (
    <BaseProfileHeader>
      <ProfileDescription loading={loading}>{data?.disease.description}</ProfileDescription>
      {diseaseSynonyms.length > 0 ? (
        <ProfileChipList title="Synonyms" loading={loading}>
          {diseaseSynonyms}
        </ProfileChipList>
      ) : null}
    </BaseProfileHeader>
  );
}

ProfileHeader.fragments = {
  profileHeader: DISEASE_PROFILE_HEADER_FRAGMENT,
};

export default ProfileHeader;
