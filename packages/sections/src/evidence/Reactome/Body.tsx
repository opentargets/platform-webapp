import { useQuery } from "@apollo/client";
import {
  Link,
  SectionItem,
  Tooltip,
  PublicationsDrawer,
  EllsWrapper,
  OtTableServer,
  type OtTableColumn,
  TableDrawer,
  Typography,
} from "ui";

import { definition } from ".";
import Description from "./Description";
import { epmcUrl, sentenceCase } from "@ot/utils";

import { typedDocument } from "../../utils/typedDocument";
import REACTOME_QUERY_DOCUMENT from "./sectionQuery.gql";
import {
  dataTypesMap,
  defaultRowsPerPageOptions,
  naLabel,
  type EvidenceBodyProps,
  type EvidenceReactome,
  type EvidenceReactomeSort,
  EvidenceReactomeSortField,
  type EvidenceReactomeSearch,
  EvidenceReactomeSearchField,
  SortDirection,
} from "@ot/constants";

type ReactomeRow = Pick<
  EvidenceReactome,
  | "score"
  | "diseaseId"
  | "diseaseName"
  | "diseaseFromSource"
  | "reactionName"
  | "reactionId"
  | "targetFromSourceId"
  | "pathways"
  | "targetModulation"
  | "variantAminoacidDescriptions"
  | "literature"
>;

type QueryData = {
  disease?: {
    id: string;
    evidenceViews: { reactome: { count: number; rows: ReactomeRow[] } };
  } | null;
};

type QueryVariables = {
  ensemblId: string;
  efoId: string;
  index: number;
  size: number;
  sort: EvidenceReactomeSort[];
  search?: EvidenceReactomeSearch;
};

const REACTOME_QUERY = typedDocument<QueryData, QueryVariables>(REACTOME_QUERY_DOCUMENT);
const PAGE_SIZE = 10;
// the view's only sort key is the evidence score
const DEFAULT_SORT = {
  id: "score",
  field: EvidenceReactomeSortField.Score,
  desc: true,
};

const getColumns = (label: EvidenceBodyProps["label"]): OtTableColumn<ReactomeRow>[] => [
  {
    id: "diseaseName",
    label: "Disease / phenotype",
    // Attach the Reactome search fields to the first column.
    searchFields: [
      EvidenceReactomeSearchField.DiseaseName,
      EvidenceReactomeSearchField.PathwayNames,
      EvidenceReactomeSearchField.ReactionName,
      EvidenceReactomeSearchField.TargetFromSourceId,
      EvidenceReactomeSearchField.TargetModulation,
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
          <EllsWrapper>{diseaseName}</EllsWrapper>
        </Link>
      </Tooltip>
    ),
    width: "18%",
  },
  {
    id: "pathways",
    label: "Pathway",
    renderCell: ({ pathways }) => {
      if (pathways.length === 0) {
        return naLabel;
      }
      if (pathways.length === 1) {
        return (
          <Link external to={`http://www.reactome.org/PathwayBrowser/#${pathways[0].id}`}>
            <EllsWrapper>{pathways[0].name ?? ""}</EllsWrapper>
          </Link>
        );
      }
      const refs = pathways.map(p => ({
        url: `http://www.reactome.org/PathwayBrowser/#${p.id}`,
        name: p.name ?? "",
        group: "Pathways",
      }));
      return <TableDrawer entries={refs} message={`${refs.length} pathways`} />;
    },
    exportValue: ({ pathways }) => pathways.map(p => p.name).join(", "),
    width: "17%",
  },
  {
    id: "reactionId",
    label: "Reaction",
    enableHiding: false,
    renderCell: ({ reactionName, reactionId }) =>
      reactionId ? (
        <Link external to={`https://identifiers.org/reactome/${reactionId}`}>
          <EllsWrapper>{reactionName ?? ""}</EllsWrapper>
        </Link>
      ) : (
        naLabel
      ),
    width: "17%",
  },
  {
    id: "targetFromSourceId",
    label: "Reported target",
    renderCell: ({ targetFromSourceId }) =>
      targetFromSourceId ? (
        <Link external to={`https://identifiers.org/uniprot/${targetFromSourceId}`}>
          <EllsWrapper>{targetFromSourceId}</EllsWrapper>
        </Link>
      ) : (
        naLabel
      ),
    width: "12%",
  },
  {
    id: "targetModulation",
    label: "Target modulation",
    renderCell: ({ targetModulation }) =>
      targetModulation ? <EllsWrapper>{sentenceCase(targetModulation) ?? ""}</EllsWrapper> : naLabel,
    exportValue: ({ targetModulation }) => sentenceCase(targetModulation ?? ""),
    width: "12%",
  },
  {
    id: "variantAminoacidDescriptions",
    label: "Amino acid variation",
    renderCell: ({ variantAminoacidDescriptions }) => {
      if (variantAminoacidDescriptions.length === 1) {
        return <EllsWrapper>{variantAminoacidDescriptions[0]}</EllsWrapper>;
      }
      if (variantAminoacidDescriptions.length > 1) {
        return (
          <TableDrawer
            entries={variantAminoacidDescriptions.map(d => ({
              name: d,
              group: "Amino acid variation",
            }))}
          />
        );
      }
      return naLabel;
    },
    exportValue: ({ variantAminoacidDescriptions }) => variantAminoacidDescriptions.join(", "),
    width: "12%",
  },
  {
    id: "score",
    label: "Score",
    tooltip: "Evidence score, from 0 to 1",
    numeric: true,
    sortField: DEFAULT_SORT.field,
    renderCell: ({ score }) => score.toFixed(2),
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
    width: "12%",
  },
];

function Body({ id, label, entity }: EvidenceBodyProps) {
  const { ensgId, efoId } = id;
  const variables = { ensemblId: ensgId, efoId };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(REACTOME_QUERY, {
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

  const columns = getColumns(label);

  return (
    <SectionItem
      definition={definition}
      chipText={dataTypesMap.affected_pathway}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} name={label.name} />}
      renderBody={() => (
        <OtTableServer<ReactomeRow>
          query={REACTOME_QUERY}
          columns={columns}
          dataDownloader
          dataDownloaderFileStem={`reactome-${ensgId}-${efoId}`}
          dataPath="disease.evidenceViews.reactome"
          pageSize={PAGE_SIZE}
          pageSizeOptions={defaultRowsPerPageOptions}
          sortBy={DEFAULT_SORT.id}
          order={DEFAULT_SORT.desc ? "desc" : "asc"}
          variables={variables}
        />
      )}
    />
  );
}

export default Body;
