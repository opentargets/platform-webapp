import { Suspense, type ReactNode } from "react";
import { gql } from "@apollo/client";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import {
  PlatformApiProvider,
  SectionContainer,
  StickyProfileHeader,
  SummaryContainer,
  SummaryRenderer,
  SectionLoader,
  summaryUtils,
} from "ui";
import { Study } from "sections";
import ProfileHeader from "./StudyProfileHeader";

const SharedTraitStudiesSection = Study.SharedTraitStudies.getBodyComponent();
const GWASCredibleSetsSection = Study.GWASCredibleSets.getBodyComponent();
const QTLCredibleSetsSection = Study.QTLCredibleSets.getBodyComponent();

const summaries = [Study.GWASCredibleSets.Summary, Study.QTLCredibleSets.Summary];

const GWAS_STUDY_WIDGETS = [Study.GWASCredibleSets, Study.SharedTraitStudies];
const QTL_STUDY_WIDGETS = [Study.QTLCredibleSets];

const STUDY = "study";
const STUDY_PROFILE_SUMMARY_FRAGMENT = summaryUtils.createSummaryFragment(
  summaries,
  "Study",
  "StudyProfileSummaryFragment"
);
const STUDY_PROFILE_QUERY = gql`
  query StudyProfileQuery($studyId: String!, $diseaseIds: [String!]!) {
    study(studyId: $studyId) {
      id
      ...StudyProfileHeaderFragment
      ...StudyProfileSummaryFragment
    }
    # TODO: remove this once we have a proper shared trait studies section
    sharedTraitStudies: studies(diseaseIds: $diseaseIds, page: { size: 2, index: 0 }) {
      count
    }
  }
  ${ProfileHeader.fragments.profileHeader}
  ${STUDY_PROFILE_SUMMARY_FRAGMENT}
`;

type ProfileProps = {
  studyId: string;
  studyType: string;
  diseases: {
    id: string;
    name: string;
  }[];
  Icon?: IconProp;
  externalLinks?: ReactNode;
};

function Profile({ studyId, studyType, diseases, Icon, externalLinks }: ProfileProps) {
  const diseaseIds = diseases?.map(d => d.id) || [];

  return (
    <PlatformApiProvider
      entity={STUDY}
      query={STUDY_PROFILE_QUERY}
      variables={{
        studyId,
        diseaseIds,
      }}
    >
      <ProfileHeader />
      <StickyProfileHeader
        title={studyId}
        Icon={Icon}
        externalLinks={externalLinks}
        widgets={studyType === "gwas" ? GWAS_STUDY_WIDGETS : QTL_STUDY_WIDGETS}
      />

      <SummaryContainer>
        <SummaryRenderer
          widgets={studyType === "gwas" ? GWAS_STUDY_WIDGETS : QTL_STUDY_WIDGETS}
        />
      </SummaryContainer>

      <SectionContainer>
        {studyType === "gwas" && (
          <>
            <Suspense fallback={<SectionLoader />}>
              <GWASCredibleSetsSection id={studyId} entity={STUDY} />
            </Suspense>
            <Suspense fallback={<SectionLoader />}>
              <SharedTraitStudiesSection studyId={studyId} diseaseIds={diseaseIds} entity={STUDY} />
            </Suspense>
          </>
        )}
        {studyType !== "gwas" && (
          <Suspense fallback={<SectionLoader />}>
            <QTLCredibleSetsSection id={studyId} entity={STUDY} />
          </Suspense>
        )}
      </SectionContainer>
    </PlatformApiProvider>
  );
}

export default Profile;
