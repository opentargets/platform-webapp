import { useQuery } from "@apollo/client";
import { v1 } from "uuid";

import {
  ChipList,
  Link,
  SectionItem,
  PublicationsDrawer,
  OtTableServer,
  type OtTableColumn,
  Box,
  List,
  ListItem,
  Typography,
} from "ui";

import {
  dataTypesMap,
  naLabel,
  type EvidenceBodyProps,
  type EvidenceCancerGeneCensus,
  type EvidenceCancerGeneCensusMutation,
  type EvidenceCancerGeneCensusSort,
  EvidenceCancerGeneCensusSortField,
  type EvidenceCancerGeneCensusSearch,
  EvidenceCancerGeneCensusSearchField,
  SortDirection,
} from "@ot/constants";
import Description from "./Description";
import { epmcUrl, identifiersOrgLink, sentenceCase } from "@ot/utils";

import { definition } from ".";

import { typedDocument } from "../../utils/typedDocument";
import CANCER_GENE_CENSUS_QUERY_DOCUMENT from "./sectionQuery.gql";

type CancerGeneCensusRow = Pick<
  EvidenceCancerGeneCensus,
  "diseaseId" | "diseaseName" | "mutatedSamples" | "literature"
>;

type QueryData = {
  disease?: {
    id: string;
    evidenceViews: { cancerGeneCensus: { count: number; rows: CancerGeneCensusRow[] } };
  } | null;
  target?: {
    id: string;
    hallmarks: { attributes: { description: string; pmid?: number | null; name: string }[] };
  } | null;
};

type QueryVariables = {
  ensemblId: string;
  efoId: string;
  index: number;
  size: number;
  sort: EvidenceCancerGeneCensusSort[];
  search?: EvidenceCancerGeneCensusSearch;
};

const CANCER_GENE_CENSUS_QUERY = typedDocument<QueryData, QueryVariables>(
  CANCER_GENE_CENSUS_QUERY_DOCUMENT
);
const PAGE_SIZE = 10;
// production sorted this table by mutated samples, ascending
const DEFAULT_SORT = {
  id: "mutatedSamples",
  field: EvidenceCancerGeneCensusSortField.MutatedSamples,
  desc: false,
};

const samplePercent = (item: EvidenceCancerGeneCensusMutation) =>
  ((item.numberSamplesWithMutationType ?? 0) / (item.numberSamplesTested ?? 1)) * 100;

const sortBySamplePercent = (mutatedSamples: EvidenceCancerGeneCensusMutation[]) =>
  mutatedSamples.slice().sort((a, b) => samplePercent(b) - samplePercent(a));

const getColumns = (
  label: EvidenceBodyProps["label"]
): OtTableColumn<CancerGeneCensusRow>[] => [
  {
    id: "diseaseName",
    label: "Disease/phenotype",
    enableHiding: false,
    // Attach the Cancer Gene Census search fields to the first column.
    searchFields: [
      EvidenceCancerGeneCensusSearchField.DiseaseName,
      EvidenceCancerGeneCensusSearchField.MutationTypes,
      EvidenceCancerGeneCensusSearchField.Literature,
    ],
    renderCell: ({ diseaseId, diseaseName }) => (
      <Link asyncTooltip to={`/disease/${diseaseId}`}>
        {diseaseName}
      </Link>
    ),
  },
  {
    id: "mutationType",
    label: "Mutation type",
    enableHiding: false,
    renderCell: ({ mutatedSamples }) => {
      if (mutatedSamples.length === 0) return naLabel;
      return (
        <List style={{ padding: 0 }}>
          {sortBySamplePercent(mutatedSamples).map(mutatedSample => (
            <ListItem key={mutatedSample.functionalConsequenceId} style={{ padding: ".25rem 0" }}>
              <Link
                external
                to={identifiersOrgLink(
                  "SO",
                  (mutatedSample.functionalConsequenceId ?? "").slice(3)
                )}
              >
                {sentenceCase(mutatedSample.functionalConsequenceLabel ?? "")}
              </Link>
            </ListItem>
          ))}
        </List>
      );
    },
    exportValue: ({ mutatedSamples }) =>
      mutatedSamples
        .map(mutatedSample => sentenceCase(mutatedSample.functionalConsequenceLabel ?? ""))
        .join(", "),
  },
  {
    id: "mutatedSamples",
    label: "Mutated / Total samples",
    sortField: DEFAULT_SORT.field,
    renderCell: ({ mutatedSamples }) => {
      if (mutatedSamples.length === 0) return naLabel;
      return (
        <List style={{ padding: 0 }}>
          {sortBySamplePercent(mutatedSamples).map(item => {
            const percent = samplePercent(item);

            return (
              <ListItem key={v1()} style={{ padding: ".25rem 0" }}>
                {percent < 5 ? parseFloat(percent.toFixed(2)).toString() : Math.round(percent)}%
                <Typography variant="caption" style={{ marginLeft: ".33rem" }}>
                  ({item.numberSamplesWithMutationType}/{item.numberSamplesTested})
                </Typography>
              </ListItem>
            );
          })}
        </List>
      );
    },
    exportValue: ({ mutatedSamples }) =>
      mutatedSamples
        .map(item => `${item.numberSamplesWithMutationType}/${item.numberSamplesTested}`)
        .join(", "),
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
  const request = useQuery(CANCER_GENE_CENSUS_QUERY, {
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
      chipText={dataTypesMap.somatic_mutation}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} diseaseName={label.name} />}
      renderBody={() => {
        const attributes = request.data?.target?.hallmarks.attributes ?? [];
        const roleInCancerItems =
          attributes.length > 0
            ? attributes
                .filter(attribute => attribute.name === "role in cancer")
                .map(attribute => ({
                  label: attribute.description,
                  url: epmcUrl(String(attribute.pmid)),
                }))
            : [{ label: "Unknown" }];

        return (
          <>
            <Box
              data-testid="role-in-cancer"
              sx={{ display: "flex", alignItems: "center", marginBottom: "2rem" }}
            >
              <Typography sx={{ marginRight: ".5rem !important" }}>
                <b>{label.symbol}</b> role in cancer:
              </Typography>
              <ChipList items={roleInCancerItems} />
            </Box>
            <OtTableServer<CancerGeneCensusRow>
              query={CANCER_GENE_CENSUS_QUERY}
              columns={columns}
              dataDownloader
              dataDownloaderFileStem={`cancer-gene-census-${ensgId}-${efoId}`}
              dataPath="disease.evidenceViews.cancerGeneCensus"
              pageSize={PAGE_SIZE}
              sortBy={DEFAULT_SORT.id}
              order={DEFAULT_SORT.desc ? "desc" : "asc"}
              variables={variables}
            />
          </>
        );
      }}
    />
  );
}

export default Body;
