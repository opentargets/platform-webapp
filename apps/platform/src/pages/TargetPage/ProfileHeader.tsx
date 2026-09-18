import {
  usePlatformApi,
  ProfileHeader as BaseProfileHeader,
  ProfileChipList,
  Field,
  Tooltip,
  Box,
  Chip,
} from "ui";
import { useTheme } from "@mui/material/styles";
import TargetDescription from "./TargetDescription";

import { clearDescriptionCodes } from "@ot/utils";

import TARGET_PROFILE_HEADER_FRAGMENT from "./TargetProfileHeader.gql";
import { getGenomicLocation } from "@ot/constants";
import GenomicLocation from "ui/src/components/GenomicLocation";

/*
 * Target synonyms from the API have a "label" and a "source"
 * and can be lister more than once, with different sources.
 * Parse synonyms to a unique list (label) where terms can have
 * multiple sources in a tooltip
 */
const parseSynonyms = synonyms => {
  const sources = {
    HGNC: "HGNC",
    uniprot: "UniProt",
    NCBI_entrez: "Entrez",
  };
  // Synonyms needs to be sorted by source in specific order
  // (order converted to a map for convenience when doing the sort)
  const sortingOrder = ["HGNC", "uniprot", "NCBI_entrez"].reduce(
    (acc, a, i) => ({ ...acc, [a]: i }),
    {}
  );
  const sortedSynonyms = synonyms
    .slice()
    .sort((a, b) => sortingOrder[a.source] - sortingOrder[b.source]);

  const parsedSynonyms = [];

  sortedSynonyms.forEach(s => {
    const thisSyn = parsedSynonyms.find(
      parsedSynonym => parsedSynonym.label.toLowerCase() === s.label.toLowerCase()
    );
    if (!thisSyn) {
      parsedSynonyms.push({ label: s.label, tooltip: [s.source] });
    } else {
      // if synonym already in the list add the source to its tooltip
      thisSyn.tooltip.push(s.source);
    }
  });

  parsedSynonyms.forEach(syn => {
    syn.tooltip = `Source: ${syn.tooltip.map(s => sources[s]).join(", ")}`;
  });

  return parsedSynonyms;
};

function ProfileHeader() {
  const { loading, error, data } = usePlatformApi();

  const theme = useTheme();

  // TODO: Errors!
  if (error) return null;

  const targetDescription = clearDescriptionCodes(
    data?.target.functionDescriptions,
    theme.palette.primary.main
  );
  const synonyms = parseSynonyms(data?.target.synonyms || []);

  // geneInfo currently holds the details for the "core essential" chip,
  // however in the future it will hold information to display other chips
  const geneInfo = [
    {
      label: "Core essential gene",
      tooltip: "Source: Cancer DepMap",
      isVisible: data?.target.isEssential,
    },
  ];

  return (
    <BaseProfileHeader>
      <>
        <TargetDescription
          loading={loading}
          descriptions={targetDescription}
          targetId={data?.target.id}
        />
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          {data?.target.genomicLocation && (
            <GenomicLocation label="Gene body" geneLoc={data?.target.genomicLocation} />
          )}
          {data?.target.canonicalTranscript && (
            <GenomicLocation
              label="Canonical transcript"
              geneLoc={data?.target.canonicalTranscript}
            />
          )}
        </Box>
        {geneInfo
          .filter(gi => gi.isVisible)
          .map(e => (
            <Box key={e.label} sx={{ mt: 1 }} component="span">
              <Tooltip title={e.tooltip}>
                <Chip
                  variant="filled"
                  size="small"
                  label={e.label}
                  sx={{
                    borderRadius: "4px",
                    backgroundColor: theme => theme.palette.primary.dark,
                    color: theme => theme.palette.primary.contrastText,
                  }}
                />
              </Tooltip>
            </Box>
          ))}
      </>
      <ProfileChipList title="Synonyms" loading={loading}>
        {synonyms}
      </ProfileChipList>
    </BaseProfileHeader>
  );
}

ProfileHeader.fragments = {
  profileHeader: TARGET_PROFILE_HEADER_FRAGMENT,
};

export default ProfileHeader;
