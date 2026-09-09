import {
  faChartBar,
  faDiagramProject,
  faDna,
  faMapPin,
  faPrescriptionBottleAlt,
  faStethoscope,
  faTag,
} from "@fortawesome/free-solid-svg-icons";
import { getStudyItemMetaData } from "@ot/utils";
import CREDIBLE_SETS_TOOLTIP_QUERY from "../queries/CredibleSetsTooltipQuery.gql";
import DISEASE_TOOLTIP_QUERY from "../queries/DiseaseTooltipQuery.gql";
import DRUG_TOOLTIP_QUERY from "../queries/DrugTooltipQuery.gql";
import STUDY_TOOLTIP_QUERY from "../queries/StudyTooltipQuery.gql";
import TARGET_TOOLTIP_QUERY from "../queries/TargetTooltipQuery.gql";
import VARIANT_TOOLTIP_QUERY from "../queries/VariantTooltipQuery.gql";

export function getQueryVariables(entity: string, id: string): Record<string, string> {
  switch (entity) {
    case "drug":
      return { chemblId: id };
    case "disease":
      return { efoId: id };
    case "target":
      return { ensgId: id };
    case "variant":
      return { variantId: id };
    case "study":
      return { studyId: id };
    case "credible-set":
      return { studyLocusId: id };
    default:
      return { id };
  }
}

export const getEntityQuery = (entity: string) => {
  switch (entity) {
    case "drug":
      return DRUG_TOOLTIP_QUERY;
    case "disease":
      return DISEASE_TOOLTIP_QUERY;
    case "study":
      return STUDY_TOOLTIP_QUERY;
    case "target":
      return TARGET_TOOLTIP_QUERY;
    case "variant":
      return VARIANT_TOOLTIP_QUERY;
    case "credible-set":
      return CREDIBLE_SETS_TOOLTIP_QUERY;
    default:
      return;
  }
};

export const getEntityIcon = (entity: string) => {
  switch (entity) {
    case "drug":
      return faPrescriptionBottleAlt;
    case "disease":
      return faStethoscope;
    case "study":
      return faChartBar;
    case "target":
      return faDna;
    case "variant":
      return faMapPin;
    case "credible-set":
      return faDiagramProject;
    default:
      return faTag;
  }
};

export const getEntityDescription = (entity, data) => {
  switch (entity) {
    case "drug":
      return getTrimmedDescription(data?.description);
    case "disease":
      return getTrimmedDescription(data?.description);
    case "study":
      return getStudyItemMetaData({
        studyType: data?.studyType,
        nSamples: data?.nSamples,
        credibleSetsCount: data?.credibleSets?.credibleSetsCount,
      });
    case "target":
      return getTrimmedDescription(data?.description[0] || "");
    case "variant":
      return getTrimmedDescription(data?.description);
    case "credible-set":
      return getCredibleSetsDescription({
        variantId: data?.variant.id,
        studyId: data?.study.id,
      });
    default:
      return "No description available.";
  }
};

const getTrimmedDescription = (description: string | null) => {
  if (!description || description.length < 1) return "No description available.";
  return description.substring(0, 150);
};

export const getCredibleSetsDescription = ({ variantId, studyId }): string => {
  let metaData = "";
  if (variantId) metaData += `Lead Variant: ${variantId}`;
  if (studyId) metaData += ` • Study ID: ${studyId}`;

  return metaData;
};
