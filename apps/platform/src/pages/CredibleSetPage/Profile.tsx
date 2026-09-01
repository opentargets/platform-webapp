import { gql } from "@apollo/client";
import {
  PlatformApiProvider,
  SectionContainer,
  SummaryContainer,
  summaryUtils,
  SummaryRenderer,
  SectionsRenderer,
  SectionLoader,
} from "ui";

import ProfileHeader from "./ProfileHeader";
import { CredibleSet, Widget } from "sections";
import { Suspense } from "react";

const CREDIBLE_SET = "credibleSet";

const credibleSetProfileWidgets = new Map<string, Widget>([
  // [CredibleSet.GenTrackTestNew.definition.id, CredibleSet.GenTrackTestNew],
  // [CredibleSet.GenTrackTest.definition.id, CredibleSet.GenTrackTest],
  // [CredibleSet.SummaryTracks.definition.id, CredibleSet.SummaryTracks],
  [CredibleSet.BrowserView.definition.id, CredibleSet.BrowserView],
  [CredibleSet.Locus2Gene.definition.id, CredibleSet.Locus2Gene],
  [CredibleSet.EnhancerToGenePredictions.definition.id, CredibleSet.EnhancerToGenePredictions],
  [CredibleSet.GWASColoc.definition.id, CredibleSet.GWASColoc],
  [CredibleSet.MolQTLColoc.definition.id, CredibleSet.MolQTLColoc],
]);

const CREDIBLE_SET_WIDGETS = Array.from(credibleSetProfileWidgets.values());

const credibleSetProfileWidgetsSummaries = Array.from(credibleSetProfileWidgets.values()).map(
  widget => widget.Summary
);

type ProfileProps = {
  studyLocusId: string;
  variantId: string;
};

const CREDIBLE_SET_PROFILE_SUMMARY_FRAGMENT = summaryUtils.createSummaryFragment(
  credibleSetProfileWidgetsSummaries,
  "CredibleSet",
  "CredibleSetProfileSummaryFragment"
);

const CREDIBLE_SET_PROFILE_QUERY = gql`
  query CredibleSetProfileQuery($studyLocusId: String!, $variantIds: [String!]!) {
    credibleSet(studyLocusId: $studyLocusId) {
      studyLocusId
      ...CredibleSetProfileHeaderFragment
      ...CredibleSetProfileSummaryFragment
    }
  }
  ${ProfileHeader.fragments.profileHeader}
  ${CREDIBLE_SET_PROFILE_SUMMARY_FRAGMENT}
`;

const VariantsSection = CredibleSet.Variants.getBodyComponent();

function Profile({ studyLocusId, variantId }: ProfileProps) {
  return (
    <PlatformApiProvider
      entity={CREDIBLE_SET}
      query={CREDIBLE_SET_PROFILE_QUERY}
      variables={{ studyLocusId: studyLocusId, variantIds: [variantId] }}
    >
      <ProfileHeader />

      <SummaryContainer>
        {/* TODO: remove this once we have a proper variants section. look at the parent prop */}
        <CredibleSet.Variants.Summary />
        <SummaryRenderer widgets={CREDIBLE_SET_WIDGETS} />
      </SummaryContainer>

      <SectionContainer>
        {/* TODO: remove this once we have a proper variants section. look at the parent prop */}
        <Suspense fallback={<SectionLoader />}>
          <VariantsSection id={studyLocusId} leadVariantId={variantId} entity={CREDIBLE_SET} />
        </Suspense>
        <SectionsRenderer
          id={studyLocusId}
          label={CREDIBLE_SET}
          entity={CREDIBLE_SET}
          widgets={CREDIBLE_SET_WIDGETS}
        />
      </SectionContainer>
    </PlatformApiProvider>
  );
}

export default Profile;
