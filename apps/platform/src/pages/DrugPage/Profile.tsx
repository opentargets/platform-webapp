import {
  PlatformApiProvider,
  SectionContainer,
  StickyProfileHeader,
  SummaryCategoryProvider,
  SummaryContainer,
  SectionsRenderer,
  SummaryRenderer,
  summaryUtils,
} from "ui";
import { gql } from "@apollo/client";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import type { ReactNode } from "react";
import ProfileHeader from "./ProfileHeader";
import { Drug, Widget } from "sections";

const DRUG = "drug";

const drugProfileWidgets = new Map<string, Widget>([
  [Drug.MechanismsOfAction.definition.id, Drug.MechanismsOfAction],
  [Drug.Indications.definition.id, Drug.Indications],
  [Drug.DrugWarnings.definition.id, Drug.DrugWarnings],
  [Drug.Pharmacogenomics.definition.id, Drug.Pharmacogenomics],
  [Drug.AdverseEvents.definition.id, Drug.AdverseEvents],
  [Drug.Bibliography.definition.id, Drug.Bibliography],
]);

export const drugProfileWidgetsSummaries = Array.from(drugProfileWidgets.values()).map(
  widget => widget.Summary
);

const DRUG_PROFILE_SUMMARY_FRAGMENT = summaryUtils.createSummaryFragment(
  drugProfileWidgetsSummaries,
  "Drug"
);
export const DRUG_PROFILE_QUERY = gql`
  query DrugProfileQuery($chemblId: String!) {
    drug(chemblId: $chemblId) {
      id
      ...DrugProfileHeaderFragment
      ...DrugProfileSummaryFragment
    }
  }
  ${ProfileHeader.fragments.profileHeader}
  ${DRUG_PROFILE_SUMMARY_FRAGMENT}
`;

const DRUG_WIDGETS = Array.from(drugProfileWidgets.values());

type ProfileProps = {
  chemblId: string;
  name: string;
  Icon?: IconProp;
  externalLinks?: ReactNode;
};

function Profile({ chemblId, name, Icon, externalLinks }: ProfileProps) {
  return (
    <PlatformApiProvider entity={DRUG} query={DRUG_PROFILE_QUERY} variables={{ chemblId }}>
      <ProfileHeader chemblId={chemblId} />
      <SummaryCategoryProvider>
        <StickyProfileHeader
          title={name}
          Icon={Icon}
          externalLinks={externalLinks}
          widgets={DRUG_WIDGETS}
        />
        <SummaryContainer>
          <SummaryRenderer widgets={DRUG_WIDGETS} />
        </SummaryContainer>
        <SectionContainer>
          <SectionsRenderer id={chemblId} label={name} entity={DRUG} widgets={DRUG_WIDGETS} />
        </SectionContainer>
      </SummaryCategoryProvider>
    </PlatformApiProvider>
  );
}

export default Profile;
