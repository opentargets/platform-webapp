import { useQuery } from "@apollo/client";
import {
  Link,
  SectionItem,
  Tooltip,
  PublicationsDrawer,
  OtTableServer,
  type OtTableColumn,
  Typography,
} from "ui";

import { definition } from ".";
import Description from "./Description";
import { epmcUrl, identifiersOrgLink, sentenceCase } from "@ot/utils";
import {
  dataTypesMap,
  naLabel,
  type EvidenceBodyProps,
  type EvidenceUniprotLiterature,
  type EvidenceUniprotLiteratureSearch,
  EvidenceUniprotLiteratureSearchField,
} from "@ot/constants";
import { typedDocument } from "../../utils/typedDocument";
import UNIPROT_LITERATURE_QUERY_DOCUMENT from "./UniprotLiteratureQuery.gql";

type UniprotLiteratureRow = Pick<
  EvidenceUniprotLiterature,
  | "diseaseId"
  | "diseaseName"
  | "diseaseFromSource"
  | "targetFromSourceId"
  | "literature"
  | "confidence"
>;

type QueryData = {
  disease?: {
    id: string;
    evidenceViews: { uniprotLiterature: { count: number; rows: UniprotLiteratureRow[] } };
  } | null;
};

type QueryVariables = {
  ensemblId: string;
  efoId: string;
  index: number;
  size: number;
  search?: EvidenceUniprotLiteratureSearch;
};

// The API has no sort for UniProt literature other than its score, which is its default order.
const UNIPROT_LITERATURE_QUERY = typedDocument<QueryData, QueryVariables>(
  UNIPROT_LITERATURE_QUERY_DOCUMENT
);
const PAGE_SIZE = 10;

const getColumns = (label: EvidenceBodyProps["label"]): OtTableColumn<UniprotLiteratureRow>[] => [
  {
    id: "diseaseName",
    label: "Disease/phenotype",
    enableHiding: false,
    // Attach the UniProt literature search fields to the first column.
    searchFields: [
      EvidenceUniprotLiteratureSearchField.DiseaseName,
      EvidenceUniprotLiteratureSearchField.DiseaseFromSource,
      EvidenceUniprotLiteratureSearchField.TargetFromSourceId,
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
    id: "targetFromSourceId",
    label: "Reported protein",
    enableHiding: false,
    renderCell: ({ targetFromSourceId }) =>
      targetFromSourceId ? (
        <Link external to={identifiersOrgLink("uniprot", targetFromSourceId)}>
          {targetFromSourceId}
        </Link>
      ) : (
        naLabel
      ),
  },
  {
    id: "confidence",
    label: "Confidence",
    renderCell: ({ confidence }) => (confidence ? sentenceCase(confidence) : naLabel),
  },
  {
    id: "literature",
    label: "Literature",
    renderCell: ({ literature }) => {
      const literatureList = literature
        .filter(id => id !== "NA")
        .map(id => ({
          name: id,
          url: epmcUrl(id),
          group: "literature",
        }));

      return (
        <PublicationsDrawer entries={literatureList} symbol={label.symbol} name={label.name} />
      );
    },
    exportValue: ({ literature }) => literature.join(", "),
  },
];

function Body({ id, label, entity }: EvidenceBodyProps) {
  const { ensgId, efoId } = id;

  const variables = { ensemblId: ensgId, efoId };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(UNIPROT_LITERATURE_QUERY, {
    variables: { ...variables, index: 0, size: PAGE_SIZE },
  });

  const columns = getColumns(label);

  return (
    <SectionItem
      definition={definition}
      chipText={dataTypesMap.genetic_association}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} diseaseName={label.name} />}
      renderBody={() => {
        return (
          <OtTableServer<UniprotLiteratureRow>
            query={UNIPROT_LITERATURE_QUERY}
            columns={columns}
            dataDownloader
            dataDownloaderFileStem={`UniProtLiterature-${ensgId}-${efoId}`}
            dataPath="disease.evidenceViews.uniprotLiterature"
            pageSize={PAGE_SIZE}
            variables={variables}
          />
        );
      }}
    />
  );
}

export default Body;
