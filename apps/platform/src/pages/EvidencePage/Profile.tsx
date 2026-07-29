import { gql } from "@apollo/client";
import {
  PlatformApiProvider,
  SectionContainer,
  SummaryCategoryProvider,
  SummaryContainer,
  summaryUtils,
  SummaryRenderer,
  SectionsRenderer,
} from "ui";
import { Evidence, Widget } from "sections";

import ProfileHeader from "./ProfileHeader";

const evidenceProfileWidgets = new Map<string, Widget>([
  [Evidence.GWASCredibleSets.definition.id, Evidence.GWASCredibleSets],
  [Evidence.GeneBurden.definition.id, Evidence.GeneBurden],
  [Evidence.EVA.definition.id, Evidence.EVA],
  [Evidence.GenomicsEngland.definition.id, Evidence.GenomicsEngland],
  [Evidence.Gene2Phenotype.definition.id, Evidence.Gene2Phenotype],
  [Evidence.UniProtLiterature.definition.id, Evidence.UniProtLiterature],
  [Evidence.UniProtVariants.definition.id, Evidence.UniProtVariants],
  [Evidence.ClinGen.definition.id, Evidence.ClinGen],
  [Evidence.Orphanet.definition.id, Evidence.Orphanet],
  [Evidence.CancerGeneCensus.definition.id, Evidence.CancerGeneCensus],
  [Evidence.IntOgen.definition.id, Evidence.IntOgen],
  [Evidence.EVASomatic.definition.id, Evidence.EVASomatic],
  [Evidence.ClinicalPrecedence.definition.id, Evidence.ClinicalPrecedence],
  [Evidence.CRISPR.definition.id, Evidence.CRISPR],
  [Evidence.CRISPRScreen.definition.id, Evidence.CRISPRScreen],
  [Evidence.CancerBiomarkers.definition.id, Evidence.CancerBiomarkers],
  [Evidence.Reactome.definition.id, Evidence.Reactome],
  [Evidence.EuropePmc.definition.id, Evidence.EuropePmc],
  [Evidence.ExpressionAtlas.definition.id, Evidence.ExpressionAtlas],
  [Evidence.Impc.definition.id, Evidence.Impc],
  [Evidence.OTCRISPR.definition.id, Evidence.OTCRISPR],
  [Evidence.OTEncore.definition.id, Evidence.OTEncore],
  [Evidence.OTValidation.definition.id, Evidence.OTValidation],
]);

const EVIDENCE_WIDGETS = Array.from(evidenceProfileWidgets.values());

const evidenceProfileWidgetsSummaries = Array.from(evidenceProfileWidgets.values()).map(
  widget => widget.Summary
);

const DISEASE = "disease";

const EVIDENCE_PROFILE_SUMMARY_FRAGMENT = summaryUtils.createSummaryFragment(
  evidenceProfileWidgetsSummaries,
  "Disease",
  "EvidenceProfileSummaryFragment"
);

const EVIDENCE_PROFILE_QUERY = gql`
  query EvidenceProfileQuery($ensgId: String!, $efoId: String!) {
    target(ensemblId: $ensgId) {
      id
      approvedSymbol
      approvedName
      functionDescriptions
      synonyms {
        label
        source
      }
    }
    disease(efoId: $efoId) {
      id
      name
      description
      synonyms {
        terms
        relation
      }
      ...EvidenceProfileSummaryFragment
    }
  }
  ${EVIDENCE_PROFILE_SUMMARY_FRAGMENT}
`;

function Profile({
  ensgId,
  efoId,
  symbol,
  name,
}: {
  ensgId: string;
  efoId: string;
  symbol: string;
  name: string;
}) {
  const id = { ensgId, efoId };
  const label = { symbol, name };

  return (
    <PlatformApiProvider
      entity={DISEASE}
      query={EVIDENCE_PROFILE_QUERY}
      variables={{ ensgId, efoId }}
    >
      <ProfileHeader />

      <SummaryCategoryProvider>
        <SummaryContainer>
          <SummaryRenderer widgets={EVIDENCE_WIDGETS} />
        </SummaryContainer>

        <SectionContainer>
          <SectionsRenderer id={id} label={label} entity={DISEASE} widgets={EVIDENCE_WIDGETS} />
        </SectionContainer>
      </SummaryCategoryProvider>
    </PlatformApiProvider>
  );
}

export default Profile;
