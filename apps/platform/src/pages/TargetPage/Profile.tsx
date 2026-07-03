import { gql } from "@apollo/client";
import {
  PlatformApiProvider,
  SectionContainer,
  SummaryContainer,
  summaryUtils,
  SectionsRenderer,
  SummaryRenderer,
} from "ui";
import { Target } from "sections";

import ProfileHeader from "./ProfileHeader";

const targetProfileWidgets = new Map<string, any>([
  [Target.Drugs.definition.id, Target.Drugs],
  [Target.Tractability.definition.id, Target.Tractability],
  [Target.Safety.definition.id, Target.Safety],
  [Target.Pharmacogenomics.definition.id, Target.Pharmacogenomics],
  [Target.QTLCredibleSets.definition.id, Target.QTLCredibleSets],
  [Target.ChemicalProbes.definition.id, Target.ChemicalProbes],
  [Target.BaselineExpression.definition.id, Target.BaselineExpression],
  [Target.DepMap.definition.id, Target.DepMap],
  [Target.SubcellularLocation.definition.id, Target.SubcellularLocation],
  [Target.GeneOntology.definition.id, Target.GeneOntology],
  [Target.GeneticConstraint.definition.id, Target.GeneticConstraint],
  [Target.MolecularStructure.definition.id, Target.MolecularStructure],
  [Target.MolecularInteractions.definition.id, Target.MolecularInteractions],
  [Target.Pathways.definition.id, Target.Pathways],
  [Target.CancerHallmarks.definition.id, Target.CancerHallmarks],
  [Target.MousePhenotypes.definition.id, Target.MousePhenotypes],
  [Target.ComparativeGenomics.definition.id, Target.ComparativeGenomics],
  [Target.Bibliography.definition.id, Target.Bibliography],
  // [Target.OverlappingVariants.definition.id, Target.OverlappingVariants],
]);

const TARGET_WIDGETS = Array.from(targetProfileWidgets.values());

const targetProfileWidgetsSummaries = Array.from(targetProfileWidgets.values()).map(
  widget => widget.Summary
);

const TARGET = "target";
const TARGET_PROFILE_SUMMARY_FRAGMENT = summaryUtils.createSummaryFragment(
  targetProfileWidgetsSummaries,
  "Target"
);
const TARGET_PROFILE_QUERY = gql`
  query TargetProfileQuery($ensgId: String!) {
    target(ensemblId: $ensgId) {
      id
      ...TargetProfileHeaderFragment
      ...TargetProfileSummaryFragment
    }
  }
  ${ProfileHeader.fragments.profileHeader}
  ${TARGET_PROFILE_SUMMARY_FRAGMENT}
`;

function Profile({ ensgId, symbol }: { ensgId: string; symbol: string }) {
  return (
    <PlatformApiProvider entity={TARGET} query={TARGET_PROFILE_QUERY} variables={{ ensgId }}>
      <ProfileHeader />
      <SummaryContainer>
        <SummaryRenderer widgets={TARGET_WIDGETS} />
      </SummaryContainer>
      <SectionContainer>
        <SectionsRenderer id={ensgId} label={symbol} entity={TARGET} widgets={TARGET_WIDGETS} />
      </SectionContainer>
    </PlatformApiProvider>
  );
}

export default Profile;
