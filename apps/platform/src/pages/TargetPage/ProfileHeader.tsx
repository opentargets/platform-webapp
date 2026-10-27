import { useTheme } from "@mui/material/styles";
import type { TargetProfileHeaderFragment } from "@ot/constants";
import { clearDescriptionCodes } from "@ot/utils";
import {
  ProfileHeader as BaseProfileHeader,
  Box,
  Chip,
  ProfileChipList,
  Tooltip,
  usePlatformApi,
} from "ui";
import GenomicLocation from "ui/src/components/GenomicLocation";
import TargetDescription from "./TargetDescription";
import TARGET_PROFILE_HEADER_FRAGMENT from "./TargetProfileHeader.gql";

type Synonym = TargetProfileHeaderFragment["synonyms"][number];
type ParsedSynonym = { label: string; tooltip: string };

/*
 * Target synonyms from the API have a "label" and a "source"
 * and can be lister more than once, with different sources.
 * Parse synonyms to a unique list (label) where terms can have
 * multiple sources in a tooltip
 */
const parseSynonyms = (synonyms: Synonym[]): ParsedSynonym[] => {
  const sources: Record<string, string> = {
    HGNC: "HGNC",
    uniprot: "UniProt",
    NCBI_entrez: "Entrez",
  };
  // Synonyms needs to be sorted by source in specific order
  // (order converted to a map for convenience when doing the sort)
  const sortingOrder: Record<string, number> = Object.fromEntries(
    ["HGNC", "uniprot", "NCBI_entrez"].map((source, i) => [source, i])
  );
  const sortedSynonyms = synonyms
    .slice()
    .sort((a, b) => (sortingOrder[a.source] ?? 0) - (sortingOrder[b.source] ?? 0));

  const parsedSynonyms: { label: string; sources: string[] }[] = [];

  for (const s of sortedSynonyms) {
    const thisSyn = parsedSynonyms.find(
      (parsedSynonym) => parsedSynonym.label.toLowerCase() === s.label.toLowerCase()
    );
    if (!thisSyn) {
      parsedSynonyms.push({ label: s.label, sources: [s.source] });
    } else {
      // if synonym already in the list add the source to its tooltip
      thisSyn.sources.push(s.source);
    }
  }

  return parsedSynonyms.map((syn) => ({
    label: syn.label,
    tooltip: `Source: ${syn.sources.map((s) => sources[s] ?? s).join(", ")}`,
  }));
};

function ProfileHeader() {
  const { loading, error, data } = usePlatformApi();

  const theme = useTheme();

  // TODO: Errors!
  if (error) return null;

  const target: (TargetProfileHeaderFragment & { id: string }) | undefined = data?.target;

  const targetDescription = clearDescriptionCodes(
    target?.functionDescriptions,
    theme.palette.primary.main
  );
  const synonyms = parseSynonyms(target?.synonyms ?? []);

  // geneInfo currently holds the details for the "core essential" chip,
  // however in the future it will hold information to display other chips
  const geneInfo = [
    {
      label: "Core essential gene",
      tooltip: "Source: Cancer DepMap",
      isVisible: target?.isEssential,
    },
  ];

  return (
    <BaseProfileHeader>
      <>
        <TargetDescription
          loading={loading}
          descriptions={targetDescription}
          targetId={target?.id}
        />
        {geneInfo
          .filter((gi) => gi.isVisible)
          .map((e) => (
            <Box key={e.label} sx={{ mt: 2 }} component="span">
              <Tooltip title={e.tooltip}>
                <Chip
                  variant="filled"
                  size="small"
                  label={e.label}
                  sx={{
                    borderRadius: "4px",
                    backgroundColor: (theme) => theme.palette.primary.dark,
                    color: (theme) => theme.palette.primary.contrastText,
                  }}
                />
              </Tooltip>
            </Box>
          ))}
        <Box sx={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 2 }}>
          {target?.genomicLocation && (
            <GenomicLocation label="Gene body" geneLoc={target.genomicLocation} />
          )}
          {target?.canonicalTranscript && (
            <GenomicLocation label="Canonical transcript" geneLoc={target.canonicalTranscript} />
          )}
        </Box>
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
