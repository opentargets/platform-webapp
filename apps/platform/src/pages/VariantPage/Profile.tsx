import { gql } from "@apollo/client";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import type { ReactNode } from "react";
import {
  PlatformApiProvider,
  SectionContainer,
  StickyProfileHeader,
  SummaryContainer,
  summaryUtils,
  SummaryRenderer,
  SectionsRenderer,
  DisplayVariantId,
  usePlatformApi,
} from "ui";

import { Variant, Widget } from "sections";
import ProfileHeader from "./ProfileHeader";

const variantProfileWidgets = new Map<string, Widget>([
  [Variant.VariantEffect.definition.id, Variant.VariantEffect],
  [Variant.MolecularStructure.definition.id, Variant.MolecularStructure],
  [Variant.VariantGenomicRegion.definition.id, Variant.VariantGenomicRegion],
  [Variant.VariantEffectPredictor.definition.id, Variant.VariantEffectPredictor],
  [Variant.EVA.definition.id, Variant.EVA],
  [Variant.UniProtVariants.definition.id, Variant.UniProtVariants],
  [Variant.GWASCredibleSets.definition.id, Variant.GWASCredibleSets],
  [Variant.QTLCredibleSets.definition.id, Variant.QTLCredibleSets],
  [Variant.EnhancerToGenePredictions.definition.id, Variant.EnhancerToGenePredictions],
  [Variant.Pharmacogenomics.definition.id, Variant.Pharmacogenomics],
]);

const VARIANT_WIDGETS = Array.from(variantProfileWidgets.values());

const variantProfileWidgetsSummaries = Array.from(variantProfileWidgets.values()).map(
  widget => widget.Summary
);

const VARIANT = "variant";
const VARIANT_PROFILE_SUMMARY_FRAGMENT = summaryUtils.createSummaryFragment(
  variantProfileWidgetsSummaries,
  "Variant"
);
const VARIANT_PROFILE_QUERY = gql`
  query VariantProfileQuery($variantId: String!) {
    variant(variantId: $variantId) {
      id
      ...VariantProfileHeaderFragment
      ...VariantProfileSummaryFragment
    }
  }
  ${ProfileHeader.fragments.profileHeader}
  ${VARIANT_PROFILE_SUMMARY_FRAGMENT}
`;

type ProfileProps = {
  varId: string;
  Icon?: IconProp;
  externalLinks?: ReactNode;
};

// wrapper component for the sticky header so it can use usePlatformApi
function VariantStickyProfileHeader({ varId, Icon, externalLinks }: ProfileProps) {
  const { data } = usePlatformApi();

  return (
    <StickyProfileHeader
      title={
        <DisplayVariantId
          variantId={varId}
          referenceAllele={data?.variant?.referenceAllele ?? ""}
          alternateAllele={data?.variant?.alternateAllele ?? ""}
        />
      }
      Icon={Icon}
      externalLinks={externalLinks}
      widgets={VARIANT_WIDGETS}
    />
  );
}

function Profile({ varId, Icon, externalLinks }: ProfileProps) {
  return (
    <PlatformApiProvider
      entity={VARIANT}
      query={VARIANT_PROFILE_QUERY}
      variables={{ variantId: varId }}
    >
      <ProfileHeader />
      <VariantStickyProfileHeader varId={varId} Icon={Icon} externalLinks={externalLinks} />
      <SummaryContainer>
        <SummaryRenderer widgets={VARIANT_WIDGETS} />
      </SummaryContainer>
      <SectionContainer>
        <SectionsRenderer widgets={VARIANT_WIDGETS} id={varId} entity={VARIANT} label={VARIANT} />
      </SectionContainer>
    </PlatformApiProvider>
  );
}

export default Profile;
