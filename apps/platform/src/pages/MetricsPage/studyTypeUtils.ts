import type { MetricRow } from "./MetricsPage";
import { CATEGORICAL_SCHEME_BASE } from "@ot/constants";

export type StudyTypeCount = { name: string; category: string; count: number };

const studyTypeColors = CATEGORICAL_SCHEME_BASE;

export function formatStudyType(name: string) {
  return name.replaceAll(/(gwas|qtl)/gi, (match) => match.toUpperCase());
}

export function getStudyTypeOrder(data: MetricRow[]) {
  const studyTypes = data
    .filter(
      (row) =>
        row.dataset === "study" &&
        row.kind === "grouping" &&
        row.metric === "studyType" &&
        row.group_value
    )
    .sort((a, b) => b.value - a.value)
    .map((row) => getStudyTypeCategory(row.group_value));
  const orderedStudyTypes = ["gwas", ...studyTypes.filter((studyType) => studyType !== "gwas")];

  return new Map(orderedStudyTypes.map((studyType, index) => [studyType, index]));
}

export function getStudyTypeCategory(name: string) {
  return name.split("-")[1] ?? name;
}

export function getStudyTypeColor(category: string, studyTypeOrder: Map<string, number>) {
  const index = getStudyTypeRank(category, studyTypeOrder);
  return studyTypeColors[index % studyTypeColors.length];
}

export function getStudyTypeRank(category: string, studyTypeOrder: Map<string, number>) {
  return studyTypeOrder.get(category) ?? studyTypeColors.length;
}
