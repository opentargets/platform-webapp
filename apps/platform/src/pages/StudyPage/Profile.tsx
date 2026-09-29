import { Suspense } from "react";
import { gql } from "@apollo/client";
import {
  PlatformApiProvider,
  SectionContainer,
  SummaryContainer,
  SectionLoader,
  SectionBody,
  summaryUtils,
} from "ui";
import { Study } from "sections";
import ProfileHeader from "./StudyProfileHeader";

const SharedTraitStudiesSection = Study.SharedTraitStudies.getBodyComponent();
const GWASCredibleSetsSection = Study.GWASCredibleSets.getBodyComponent();
const QTLCredibleSetsSection = Study.QTLCredibleSets.getBodyComponent();

const summaries = [Study.GWASCredibleSets.Summary, Study.QTLCredibleSets.Summary];

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
};

function Profile({ studyId, studyType, diseases }: ProfileProps) {
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

      <SummaryContainer>
        {/* TODO: remove this, check the studyType property */}
        {studyType === "gwas" && (
          <>
            <Study.GWASCredibleSets.Summary />
            <Study.SharedTraitStudies.Summary />
          </>
        )}
        {studyType !== "gwas" && <Study.QTLCredibleSets.Summary />}
      </SummaryContainer>

      <SectionContainer>
        {studyType === "gwas" && (
          <>
            <Suspense fallback={<SectionLoader />}>
              <SectionBody Body={GWASCredibleSetsSection} id={studyId} entity={STUDY} />
            </Suspense>
            <Suspense fallback={<SectionLoader />}>
              <SectionBody
                Body={SharedTraitStudiesSection}
                studyId={studyId}
                diseaseIds={diseaseIds}
                entity={STUDY}
              />
            </Suspense>
          </>
        )}
        {studyType !== "gwas" && (
          <Suspense fallback={<SectionLoader />}>
            <SectionBody Body={QTLCredibleSetsSection} id={studyId} entity={STUDY} />
          </Suspense>
        )}
      </SectionContainer>
    </PlatformApiProvider>
  );
}

export default Profile;
