import { useQuery } from "@apollo/client";
import {
  Link,
  Tooltip,
  SectionItem,
  PublicationsDrawer,
  OtTableServer,
  type OtTableColumn,
  TableDrawer,
  Typography,
} from "ui";

import {
  defaultRowsPerPageOptions,
  naLabel,
  type EvidenceBodyProps,
  type EvidenceCancerBiomarkers,
  type EvidenceCancerBiomarkersSearch,
  EvidenceCancerBiomarkersSearchField,
} from "@ot/constants";
import { epmcUrl } from "@ot/utils";
import Description from "./Description";
import BiomarkersDrawer from "./BiomarkersDrawer";
import { definition } from ".";

import { typedDocument } from "../../utils/typedDocument";
import CANCER_BIOMARKERS_EVIDENCE_QUERY_DOCUMENT from "./CancerBiomarkersEvidence.gql";

type CancerBiomarkersRow = Pick<
  EvidenceCancerBiomarkers,
  | "diseaseId"
  | "diseaseName"
  | "diseaseFromSource"
  | "biomarkerName"
  | "biomarkerGeneticVariations"
  | "biomarkerGeneExpressions"
  | "drugId"
  | "drugName"
  | "drugFromSource"
  | "drugResponseId"
  | "drugResponseName"
  | "confidence"
  | "literature"
  | "urls"
>;

type QueryData = {
  disease?: {
    id: string;
    evidenceViews: { cancerBiomarkers: { count: number; rows: CancerBiomarkersRow[] } };
  } | null;
};

type QueryVariables = {
  ensemblId: string;
  efoId: string;
  index: number;
  size: number;
  search?: EvidenceCancerBiomarkersSearch;
};

const CANCER_BIOMARKERS_EVIDENCE_QUERY = typedDocument<QueryData, QueryVariables>(
  CANCER_BIOMARKERS_EVIDENCE_QUERY_DOCUMENT
);
const PAGE_SIZE = 10;

const getColumns = (label: EvidenceBodyProps["label"]): OtTableColumn<CancerBiomarkersRow>[] => [
  {
    id: "diseaseName",
    label: "Disease",
    // Attach the cancer biomarkers search fields to the first column.
    searchFields: [
      EvidenceCancerBiomarkersSearchField.DiseaseName,
      EvidenceCancerBiomarkersSearchField.BiomarkerName,
      EvidenceCancerBiomarkersSearchField.DrugName,
      EvidenceCancerBiomarkersSearchField.DrugFromSource,
      EvidenceCancerBiomarkersSearchField.DrugResponseName,
      EvidenceCancerBiomarkersSearchField.Confidence,
    ],
    renderCell: ({ diseaseId, diseaseName, diseaseFromSource }) => (
      <Tooltip
        title={
          <>
            <Typography variant="subtitle2" display="block" align="center">
              Reported disease or phenotype:
            </Typography>
            <Typography variant="caption" display="block" align="center">
              {diseaseFromSource}
            </Typography>
          </>
        }
        showHelpIcon
      >
        <Link asyncTooltip to={`/disease/${diseaseId}`}>
          {diseaseName}
        </Link>
      </Tooltip>
    ),
  },
  {
    id: "biomarkerName",
    label: "Biomarker",
    enableHiding: false,
    renderCell: ({ biomarkerName, biomarkerGeneticVariations, biomarkerGeneExpressions }) => (
      <BiomarkersDrawer
        biomarkerName={biomarkerName}
        geneticVariations={biomarkerGeneticVariations}
        geneExpressions={biomarkerGeneExpressions}
      />
    ),
  },
  {
    id: "drug",
    label: "Reported drug",
    renderCell: ({ drugId, drugName, drugFromSource }) =>
      drugId ? <Link to={`/drug/${drugId}`}>{drugName}</Link> : drugFromSource,
    exportValue: ({ drugName, drugFromSource }) => drugName ?? drugFromSource ?? "",
  },
  {
    id: "drugResponse",
    label: "Drug response",
    // the response name is only set when the response is a disease, e.g. "drug resistance"
    renderCell: ({ drugResponseId, drugResponseName }) =>
      drugResponseId && drugResponseName ? (
        <Link to={`/disease/${drugResponseId}`}>{drugResponseName}</Link>
      ) : (
        naLabel
      ),
    exportValue: ({ drugResponseName }) => drugResponseName ?? "",
  },
  {
    id: "confidence",
    label: "Source",
    renderCell: ({ confidence, urls }) => {
      const entries = urls.map(url => ({
        url: url.url ?? "",
        name: url.niceName ?? "",
        group: "Sources",
      }));
      return <TableDrawer entries={entries} message={confidence} />;
    },
  },
  {
    id: "literature",
    label: "Literature",
    renderCell: ({ literature }) => {
      const entries = literature.map(id => ({
        name: id,
        url: epmcUrl(id),
        group: "literature",
      }));

      return <PublicationsDrawer entries={entries} symbol={label.symbol} name={label.name} />;
    },
    exportValue: ({ literature }) => literature.join(", "),
  },
];

function Body({ id, label, entity }: EvidenceBodyProps) {
  const { ensgId, efoId } = id;

  const variables = { ensemblId: ensgId, efoId };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(CANCER_BIOMARKERS_EVIDENCE_QUERY, {
    variables: { ...variables, index: 0, size: PAGE_SIZE },
  });

  const columns = getColumns(label);

  return (
    <SectionItem
      definition={definition}
      chipText={definition.dataType}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} diseaseName={label.name} />}
      renderBody={() => {
        return (
          <OtTableServer<CancerBiomarkersRow>
            query={CANCER_BIOMARKERS_EVIDENCE_QUERY}
            columns={columns}
            dataDownloader
            dataDownloaderFileStem={`cancer-biomarker-${ensgId}-${efoId}`}
            dataPath="disease.evidenceViews.cancerBiomarkers"
            pageSize={PAGE_SIZE}
            pageSizeOptions={defaultRowsPerPageOptions}
            variables={variables}
          />
        );
      }}
    />
  );
}

export default Body;
