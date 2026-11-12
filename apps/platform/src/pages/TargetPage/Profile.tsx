import { gql } from "@apollo/client";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import type { ReactNode } from "react";
import { Target, type Widget } from "sections";
import {
  PlatformApiProvider,
  SectionContainer,
  SectionsRenderer,
  StickyProfileHeader,
  SummaryContainer,
  SummaryRenderer,
  summaryUtils,
} from "ui";

import ProfileHeader from "./ProfileHeader";

// Genomic region and Overlapping variants are not in this map: the API has no
// region query and no proteinCodingCoordinates on Target
const targetProfileWidgets = new Map<string, Widget>([
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
]);

const TARGET_WIDGETS = Array.from(targetProfileWidgets.values());

const targetProfileWidgetsSummaries = TARGET_WIDGETS.map((widget) => widget.Summary);

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

type ProfileProps = {
  ensgId: string;
  symbol: string;
  Icon?: IconProp;
  externalLinks?: ReactNode;
};

function Profile({ ensgId, symbol, Icon, externalLinks }: ProfileProps) {
  return (
    <PlatformApiProvider entity={TARGET} query={TARGET_PROFILE_QUERY} variables={{ ensgId }}>
      <ProfileHeader />
      <StickyProfileHeader
        title={symbol}
        Icon={Icon}
        externalLinks={externalLinks}
        widgets={TARGET_WIDGETS}
      />
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
