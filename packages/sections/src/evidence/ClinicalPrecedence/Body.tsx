import {
  Link,
  SectionItem,
  DirectionOfEffectIcon,
  DirectionOfEffectTooltip,
  OtTableServer,
  type OtTableColumn,
  ClinicalRecordDrawer,
  Box,
  Typography,
} from "ui";
import { useQuery } from "@apollo/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightToBracket } from "@fortawesome/free-solid-svg-icons";
import {
  clinicalStageCategories,
  naLabel,
  dataTypesMap,
  type EvidenceBodyProps,
  type EvidenceClinicalPrecedence,
  type EvidenceClinicalPrecedenceSort,
  EvidenceClinicalPrecedenceSortField,
  type EvidenceClinicalPrecedenceSearch,
  EvidenceClinicalPrecedenceSearchField,
  SortDirection,
} from "@ot/constants";
import Description from "./Description";
import { definition } from ".";
import { typedDocument } from "../../utils/typedDocument";
import CLINICAL_PRECEDENCE_QUERY_DOCUMENT from "./ClinicalPrecedence.gql";

type ClinicalPrecedenceRow = Pick<
  EvidenceClinicalPrecedence,
  | "diseaseId"
  | "diseaseName"
  | "targetId"
  | "targetApprovedSymbol"
  | "drugId"
  | "drugName"
  | "drugTargetIds"
  | "directionOnTarget"
  | "directionOnTrait"
  | "clinicalStage"
  | "clinicalReportId"
  | "studyStartDate"
>;

type QueryData = {
  disease?: {
    id: string;
    evidenceViews: { clinicalPrecedence: { count: number; rows: ClinicalPrecedenceRow[] } };
  } | null;
};

type QueryVariables = {
  ensemblId: string;
  efoId: string;
  index: number;
  size: number;
  sort: EvidenceClinicalPrecedenceSort[];
  search?: EvidenceClinicalPrecedenceSearch;
};

const CLINICAL_PRECEDENCE_QUERY = typedDocument<QueryData, QueryVariables>(
  CLINICAL_PRECEDENCE_QUERY_DOCUMENT
);
const PAGE_SIZE = 10;
// production sorted this table by clinical stage, latest stage first
const DEFAULT_SORT = {
  id: "clinicalStage",
  field: EvidenceClinicalPrecedenceSortField.ClinicalStage,
  desc: true,
};

type StageCategories = Record<string, { index: number; label: string } | undefined>;
const stageCategories: StageCategories = clinicalStageCategories;

const exportColumns: OtTableColumn<ClinicalPrecedenceRow>[] = [
  {
    id: "clinicalReportId",
    label: "clinicalReportId",
    exportValue: (row: ClinicalPrecedenceRow) => row.clinicalReportId,
  },
  {
    id: "diseaseId",
    label: "diseaseId",
    exportValue: (row: ClinicalPrecedenceRow) => row.diseaseId,
  },
  {
    id: "diseaseName",
    label: "diseaseName",
    exportValue: (row: ClinicalPrecedenceRow) => row.diseaseName,
  },
  {
    id: "targetId",
    label: "targetId",
    exportValue: (row: ClinicalPrecedenceRow) => row.targetId,
  },
  {
    id: "targetApprovedSymbol",
    label: "targetApprovedSymbol",
    exportValue: (row: ClinicalPrecedenceRow) => row.targetApprovedSymbol,
  },
  {
    id: "drugId",
    label: "drugId",
    exportValue: (row: ClinicalPrecedenceRow) => row.drugId,
  },
  {
    id: "drugName",
    label: "drugName",
    exportValue: (row: ClinicalPrecedenceRow) => row.drugName,
  },
  {
    id: "clinicalStage",
    label: "clinicalStage",
    exportValue: (row: ClinicalPrecedenceRow) => row.clinicalStage,
  },
  {
    id: "startDate",
    label: "startDate",
    exportValue: (row: ClinicalPrecedenceRow) => row.studyStartDate,
  },
];

const columns: OtTableColumn<ClinicalPrecedenceRow>[] = [
  {
    id: "clinicalReportId",
    label: "Report",
    sticky: true,
    enableHiding: false,
    // Attach the clinical precedence search fields to the first column.
    searchFields: [
      EvidenceClinicalPrecedenceSearchField.DiseaseName,
      EvidenceClinicalPrecedenceSearchField.TargetApprovedSymbol,
      EvidenceClinicalPrecedenceSearchField.DrugTargetSymbols,
      EvidenceClinicalPrecedenceSearchField.DrugName,
      EvidenceClinicalPrecedenceSearchField.DirectionOnTarget,
      EvidenceClinicalPrecedenceSearchField.DirectionOnTrait,
      EvidenceClinicalPrecedenceSearchField.ClinicalStage,
      EvidenceClinicalPrecedenceSearchField.ClinicalReportId,
      EvidenceClinicalPrecedenceSearchField.StudyStartDate,
    ],
    renderCell: ({ clinicalReportId }) => {
      if (!clinicalReportId) return naLabel;
      return (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <ClinicalRecordDrawer recordId={clinicalReportId}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2">View</Typography>
              <FontAwesomeIcon size="sm" icon={faArrowRightToBracket} />
            </Box>
          </ClinicalRecordDrawer>
        </Box>
      );
    },
  },
  {
    id: "diseaseName",
    label: "Disease/phenotype",
    enableHiding: false,
    renderCell: ({ diseaseId, diseaseName }) => (
      <Link asyncTooltip to={`/disease/${diseaseId}`}>
        {diseaseName}
      </Link>
    ),
  },
  {
    id: "target",
    label: "Targets",
    enableHiding: false,
    renderCell: ({ targetId, targetApprovedSymbol, drugTargetIds }) => {
      const otherTargets = new Set(drugTargetIds.filter(drugTargetId => drugTargetId !== targetId));
      return (
        <>
          <Link asyncTooltip to={`/target/${targetId}`}>
            {targetApprovedSymbol}
          </Link>
          {otherTargets.size > 0
            ? ` and ${otherTargets.size} other target${otherTargets.size > 1 ? "s" : ""}`
            : null}
        </>
      );
    },
    exportValue: ({ targetApprovedSymbol }) => targetApprovedSymbol,
  },
  {
    id: "drugName",
    label: "Drug",
    enableHiding: false,
    renderCell: ({ drugId, drugName }) =>
      drugId ? (
        <Link asyncTooltip to={`/drug/${drugId}`}>
          {drugName}
        </Link>
      ) : (
        naLabel
      ),
  },
  {
    id: "directionOfVariantEffect",
    label: (
      <DirectionOfEffectTooltip docsUrl="https://platform-docs.opentargets.org/evidence#clinical-precedence"></DirectionOfEffectTooltip>
    ),
    renderCell: ({ directionOnTarget, directionOnTrait }) => {
      return (
        <Box sx={{ maxWidth: "140px" }}>
          <DirectionOfEffectIcon
            variantEffect={directionOnTarget ?? ""}
            directionOnTrait={directionOnTrait ?? ""}
          />
        </Box>
      );
    },
  },
  {
    id: "clinicalStage",
    label: "Stage",
    sortField: DEFAULT_SORT.field,
    renderCell: ({ clinicalStage }) =>
      (clinicalStage && stageCategories[clinicalStage]?.label) ?? naLabel,
    exportValue: ({ clinicalStage }) =>
      (clinicalStage && stageCategories[clinicalStage]?.label) ?? "",
  },
  {
    id: "studyStartDate",
    label: "Start Date",
    numeric: true,
    sortField: EvidenceClinicalPrecedenceSortField.StudyStartDate,
    renderCell: ({ studyStartDate }) =>
      studyStartDate ? new Date(studyStartDate).getFullYear() : naLabel,
    exportValue: ({ studyStartDate }) =>
      studyStartDate ? String(new Date(studyStartDate).getFullYear()) : "",
  },
];

function Body({ id, label, entity }: EvidenceBodyProps) {
  const variables = { ensemblId: id.ensgId, efoId: id.efoId };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(CLINICAL_PRECEDENCE_QUERY, {
    variables: {
      ...variables,
      index: 0,
      size: PAGE_SIZE,
      sort: [
        {
          key: DEFAULT_SORT.field,
          direction: DEFAULT_SORT.desc ? SortDirection.Descending : SortDirection.Ascending,
        },
      ],
    },
  });

  return (
    <SectionItem
      definition={definition}
      chipText={dataTypesMap.clinical}
      entity={entity}
      request={request}
      renderDescription={() => <Description symbol={label.symbol} name={label.name} />}
      renderBody={() => (
        <OtTableServer<ClinicalPrecedenceRow>
          query={CLINICAL_PRECEDENCE_QUERY}
          columns={columns}
          dataDownloader
          dataDownloaderColumns={exportColumns}
          dataDownloaderFileStem={`${id.ensgId}-${id.efoId}-clinical-precedence-evidence`}
          dataPath="disease.evidenceViews.clinicalPrecedence"
          pageSize={PAGE_SIZE}
          sortBy={DEFAULT_SORT.id}
          order={DEFAULT_SORT.desc ? "desc" : "asc"}
          variables={variables}
        />
      )}
    />
  );
}

export default Body;
