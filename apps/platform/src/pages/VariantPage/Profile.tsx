import { gql } from "@apollo/client";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import type { ReactNode } from "react";
import {
  PlatformApiProvider,
  SectionContainer,
  StickyProfileHeader,
  SummaryCategoryProvider,
  SummaryContainer,
  summaryUtils,
  SummaryRenderer,
  SectionsRenderer,
} from "ui";

import { Variant, Widget } from "sections";
import ProfileHeader from "./ProfileHeader";

const variantProfileWidgets = new Map<string, Widget>([
  [Variant.VariantEffect.definition.id, Variant.VariantEffect],
  [Variant.MolecularStructure.definition.id, Variant.MolecularStructure],
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

function Profile({ varId, Icon, externalLinks }: ProfileProps) {
  return (
    <PlatformApiProvider
      entity={VARIANT}
      query={VARIANT_PROFILE_QUERY}
      variables={{ variantId: varId }}
    >
      <ProfileHeader />
      <SummaryCategoryProvider>
        <StickyProfileHeader
          title={varId}
          Icon={Icon}
          externalLinks={externalLinks}
          widgets={VARIANT_WIDGETS}
        />
        <SummaryContainer>
          <SummaryRenderer widgets={VARIANT_WIDGETS} />
        </SummaryContainer>
        <SectionContainer>
          <SectionsRenderer
            widgets={VARIANT_WIDGETS}
            id={varId}
            entity={VARIANT}
            label={VARIANT}
          />
        </SectionContainer>
      </SummaryCategoryProvider>
    </PlatformApiProvider>
  );
}

export default Profile;
