export function getStudyCategory(projectId) {
  if (!projectId) return "";
  if (projectId === "GCST") return "GWAS";
  if (projectId.startsWith("FINNGEN")) return "FINNGEN";
  return "QTL";
}

export const getStudyTypeDisplay = (studyType) => {
  if (studyType) return studyType?.replace(/(qtl|gwas)/gi, (match) => match.toUpperCase());
  return studyType;
};

export const getStudyItemMetaData = ({ studyType, credibleSetsCount, nSamples }) => {
  let metaData = "";
  if (studyType) metaData += `Study type: ${getStudyTypeDisplay(studyType)}`;
  if (credibleSetsCount > -1)
    metaData += ` • Credible sets count: ${credibleSetsCount.toLocaleString()}`;
  if (studyType) metaData += ` • Sample size: ${nSamples.toLocaleString()}`;

  return metaData;
};
