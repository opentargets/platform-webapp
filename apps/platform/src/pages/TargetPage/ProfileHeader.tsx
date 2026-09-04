import {
  usePlatformApi,
  ProfileHeader as BaseProfileHeader,
  ProfileChipList,
  Field,
  Tooltip,
} from "ui";
import { useTheme } from "@mui/material/styles";
import TargetDescription from "./TargetDescription";

import { clearDescriptionCodes } from "@ot/utils";

import TARGET_PROFILE_HEADER_FRAGMENT from "./TargetProfileHeader.gql";
import { Box, Typography } from "@mui/material";
import { getGenomicLocation, GenomicLocationPresentationType } from "@ot/constants";
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

  const { genomicLocation, canonicalTranscript } = data?.target ?? {};

  return (
    <BaseProfileHeader>
      <>
        <TargetDescription
          loading={loading}
          descriptions={targetDescription}
          targetId={data?.target.id}
        />
        {/* { genomicLocation && 
          <Field loading={loading} title="Full gene body">
            <GenomicLocation
              geneLoc={genomicLocation}
              type={GenomicLocationPresentationType.BODY}
            />
          </Field>
        }
        {canonicalTranscript && (
          <Field loading={loading} title="Canonical Transcript">
            <GenomicLocation
              geneLoc={canonicalTranscript}
              type={GenomicLocationPresentationType.BODY}
            />
          </Field>
        )} */}
        {/* <GenomicLocation geneLoc={data?.target.genomicLocation} /> */}
        {genomicLocation && (
          <>
            <Field loading={loading} title="Position">
              GRCh38 | Chr{genomicLocation.chromosome} (
                {genomicLocation.strand === "+" || genomicLocation.strand > 0 ? "+" : "-"}
              )
            </Field>
            <table style={{ borderCollapse: "collapse", marginLeft: "1rem" }}>
              <tr>
                <td style={{ padding: "0 6px 0 0" }}>
                  <Typography variant="body2">
                    Full gene body:
                  </Typography>
                </td>
                <td style={{ padding: 0 }}>
                  <Typography variant="body2" sx={{ fontVariant: "common-ligatures tabular-nums" }}>
                    {genomicLocation.start.toLocaleString()}-
                    {genomicLocation.end.toLocaleString()}
                  </Typography>
                </td>
              </tr>
              {canonicalTranscript && (
                <tr>
                  <td style={{ padding: "1px 6px 0 0" }}>
                    <Typography variant="body2">
                      Canonical transcript:
                    </Typography>
                  </td>
                  <td style={{ padding: 0 }}>
                    <Typography variant="body2" sx={{ fontVariant: "common-ligatures tabular-nums" }}>
                      {canonicalTranscript.start.toLocaleString()}-
                      {canonicalTranscript.end.toLocaleString()}
                    </Typography>
                  </td>
                </tr>
              )}
            </table>
          </>
        )}
        {geneInfo
          .filter(gi => gi.isVisible)
          .map(e => (
            <Box
              key={e.label}
              sx={{
                whiteSpace: "nowrap",
                p: "1px 5px",
                color: theme => theme.palette.grey[600],
                border: theme => `1px solid ${theme.palette.grey[600]}`,
                borderRadius: "5px",
                width: "min-content",
                mt: 1,
                typography: "body2",
              }}
            >
              <Tooltip title={e.tooltip}>{e.label}</Tooltip>
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
