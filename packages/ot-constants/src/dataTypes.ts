import { isPrivateDataType } from "./partnerPreviewUtils";

const dataTypes = [
  {
    id: "genetic_association",
    label: "Genetic association",
    isPrivate: isPrivateDataType("genetic_association"),
  },
  {
    id: "somatic_mutation",
    label: "Somatic mutations",
    isPrivate: isPrivateDataType("somatic_mutation"),
  },
  {
    id: "clinical",
    label: "Clinical",
    isPrivate: isPrivateDataType("clinical"),
  },
  {
    id: "affected_pathway",
    label: "Affected pathway",
    isPrivate: isPrivateDataType("affected_pathway"),
  },
  {
    id: "literature",
    label: "Literature",
    isPrivate: isPrivateDataType("literature"),
  },
  {
    id: "rna_expression",
    label: "RNA expression",
    isPrivate: isPrivateDataType("rna_expression"),
  },
  {
    id: "animal_model",
    label: "Animal model",
    isPrivate: isPrivateDataType("animal_model"),
  },
  {
    id: "ot_partner",
    label: "OTAR Projects",
    isPrivate: isPrivateDataType("ot_partner"),
  },
  {
    id: "ot_validation_lab",
    label: "OTAR Validation Lab",
    isPrivate: isPrivateDataType("ot_validation_lab"),
  },
];

const dataTypesMap = dataTypes.reduce((acc: Record<string, string>, dataType) => {
  acc[dataType.id] = dataType.label;
  return acc;
}, {});

export { dataTypesMap };

export default dataTypes;
