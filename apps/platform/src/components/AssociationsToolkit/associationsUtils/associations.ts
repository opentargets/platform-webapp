import { ENTITIES } from "./index";
import { v1 } from "uuid";
import { ROW_METRICS } from "../static_datasets/rowMetrics";

// Type definitions
interface DataSource {
  componentId: string;
  score: number;
}

interface DatasourceScores {
  [key: string]: number;
}

interface Prioritisations {
  [key: string]: number;
}

interface PrioritisationItem {
  key: string;
  value: string;
}

interface Disease {
  id: string;
  name: string;
}

interface Target {
  id: string;
  approvedSymbol: string;
}

interface EmptyRow {
  dataSources: DatasourceScores;
  prioritisations: Prioritisations;
  score: number;
  disease: { id: string };
  target: { id: string };
}

interface AssociationRow {
  score: number;
  disease: Disease;
  target: Target;
  datasourceScores: DataSource[];
}

interface AssociatedTargetsData {
  rows: AssociationRow[];
  count: number;
}

interface AssociatedDiseasesData {
  rows: AssociationRow[];
  count: number;
}

interface PrioritisationData {
  items: PrioritisationItem[];
}

interface EntityData {
  [ENTITIES.DISEASE]: {
    disease: Disease;
    associatedTargets: AssociatedTargetsData;
  };
  [ENTITIES.TARGET]: {
    target: Target;
    associatedDiseases: AssociatedDiseasesData;
    prioritisation: PrioritisationData;
  };
}

type RowMetricsData = {
  [K in typeof ROW_METRICS[number]["id"]]?: number | null;
};

interface FormattedAssociationData extends RowMetricsData {
  score: number;
  id: string;
  targetSymbol: string;
  diseaseName: string;
  dataSources: DatasourceScores;
  disease?: Disease;
  target?: Target;
  prioritisations?: Prioritisations;
}

interface DataRowMetadata {
  targetSymbol: string;
  diseaseName: string;
  id?: string;
}

const getEmptyRow = (id: string): EmptyRow => ({
  dataSources: {},
  prioritisations: {},
  score: 0,
  disease: { id },
  target: { id },
});

/***********
 * HELPERS *
 ***********/

/**
 * Extracts and returns associated target rows from the disease data.
 * @param {EntityData} data - The data object containing disease associations.
 * @returns {AssociationRow[]} Associated target rows.
 */
export const diseaseAssociationsTargetSelector = (data: EntityData): AssociationRow[] =>
  data[ENTITIES.DISEASE].associatedTargets.rows;

/**
 * Extracts and returns associated disease rows from the target data.
 * @param {EntityData} data - The data object containing target associations.
 * @returns {AssociationRow[]} Associated disease rows.
 */
export const targetAssociationsDiseaseSelector = (data: EntityData): AssociationRow[] =>
  data[ENTITIES.TARGET].associatedDiseases.rows;

/**
 * Extracts and returns prioritisation items from the target data for disease prioritisation.
 * @param {EntityData} data - The data object containing prioritisation items.
 * @returns {PrioritisationItem[]} Prioritisation items.
 */
export const diseasePrioritisationTargetsSelector = (data: EntityData): PrioritisationItem[] =>
  data[ENTITIES.TARGET].prioritisation.items;

/**
 * Processes the prioritisation data and converts it into a key-value pair object.
 * @param {EntityData} data - The data object containing prioritisation items.
 * @returns {{ prioritisations: Prioritisations }} Key-value pair object with prioritisation keys and their respective scores.
 */
export const getPrioritisationData = (data: EntityData): { prioritisations: Prioritisations } => {
  const dataRows = diseasePrioritisationTargetsSelector(data);
  const prioritisations = dataRows.reduce(
    (acc: Prioritisations, curr) => ((acc[curr.key] = parseFloat(curr.value)), acc),
    {}
  );
  return { prioritisations };
};

/**
 * Processes data source scores and converts them into a key-value pair object.
 * @param {AssociationRow} data - The data object containing data source scores.
 * @returns {DatasourceScores} Key-value pair object with component IDs and their respective scores.
 */
export const getDataSourcesData = (data: AssociationRow): DatasourceScores => {
  const sources = data.datasourceScores.reduce(
    (acc: DatasourceScores, curr) => ((acc[curr.componentId] = curr.score), acc),
    {}
  );
  return sources;
};

/**
 * Retrieves metadata for a given row based on the fixed entity type.
 * @param {EntityData} parentEntity - The parent entity object.
 * @param {AssociationRow} row - The current row object.
 * @param {string} fixedEntity - The fixed entity type.
 * @returns {DataRowMetadata} Metadata object containing target symbol, disease name, and ID.
 */
export const getDataRowMetadata = (
  parentEntity: EntityData,
  row: AssociationRow,
  fixedEntity: string
): DataRowMetadata => {
  let targetSymbol: string;
  let diseaseName: string;
  let id: string | undefined;
  switch (fixedEntity) {
    case ENTITIES.DISEASE:
      id = row.target.id;
      targetSymbol = row.target.approvedSymbol;
      diseaseName = parentEntity[ENTITIES.DISEASE].name;
      break;
    case ENTITIES.TARGET:
      id = row.disease.id;
      targetSymbol = parentEntity[ENTITIES.TARGET].approvedSymbol;
      diseaseName = row.disease.name;
      break;
    default:
      targetSymbol = "";
      diseaseName = "";
  }
  return { targetSymbol, diseaseName, id };
};

/**
 * Returns the total count of associated diseases or targets based on the fixed entity type.
 * @param {string} fixedEntity - The fixed entity type.
 * @param {EntityData} data - The data object containing associations count.
 * @returns {number} The total count of associated diseases or targets.
 */
export const getAllDataCount = (fixedEntity: string, data: EntityData): number => {
  switch (fixedEntity) {
    case ENTITIES.TARGET:
      return data[ENTITIES.TARGET].associatedDiseases.count;
    case ENTITIES.DISEASE:
      return data[ENTITIES.DISEASE].associatedTargets.count;
    default:
      return 0;
  }
};

/**
 * Aggregates and formats association data based on the fixed entity type.
 * @param {string} fixedEntity - The fixed entity type.
 * @param {EntityData | null} data - The data object containing association data.
 * @returns {FormattedAssociationData[]} Formatted association data.
 */
export const getAssociationsData = (
  fixedEntity: string,
  data: EntityData | null
): FormattedAssociationData[] => {
  if (!data) return [];
  const withPrioritisation = fixedEntity === ENTITIES.DISEASE;
  const dataRows =
    fixedEntity === ENTITIES.DISEASE
      ? diseaseAssociationsTargetSelector(data)
      : targetAssociationsDiseaseSelector(data);

  return dataRows.map(row => {
    const dataSources = getDataSourcesData(row);
    const { targetSymbol, diseaseName, id } = getDataRowMetadata(data, row, fixedEntity);
    const rowMetrics = Object.fromEntries(
      ROW_METRICS.map(m => [m.id, (row as any)[m.dataField ?? m.id] ?? null])
    );
    return {
      score: row.score,
      ...rowMetrics,
      id: id!,
      targetSymbol,
      diseaseName,
      dataSources,
      ...(!withPrioritisation && { disease: row.disease }),
      ...(withPrioritisation && { target: row.target }),
      ...(withPrioritisation && getPrioritisationData(row)),
    };
  });
};

/**
 * Generates an array of empty rows for initial loading.
 * @param {number} [rowCount=10] - The number of empty rows to generate.
 * @returns {EmptyRow[]} Array of empty rows.
 */
export const getInitialLoadingData = (rowCount: number = 10): EmptyRow[] => {
  const arr: EmptyRow[] = [];
  for (let i = 0; i < rowCount; i++) {
    arr.push(getEmptyRow(v1()));
  }
  return arr;
};
