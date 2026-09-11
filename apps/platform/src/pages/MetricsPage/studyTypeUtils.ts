import type { MetricRow } from "./MetricsPage";

export type StudyTypeCount = { name: string; category: string; count: number };

const studyTypeColors = ["#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951", "#ff8ab7", "#a463f2", "#97bbf5", "#9c6b4e", "#9498a0"];
// const studyTypeColors = ["#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951", "#ff8ab7"];

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
