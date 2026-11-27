import { useQuery } from "@apollo/client";
import { v1 } from "uuid";
import {
  ChipList,
  Link,
  SectionItem,
  Tooltip,
  ScientificNotation,
  OtTableServer,
  type OtTableColumn,
  Box,
  List,
  ListItem,
  Typography,
} from "ui";

import { definition } from ".";
import methods from "./methods";
import Description from "./Description";
import { epmcUrl, sentenceCase } from "@ot/utils";
import {
  dataTypesMap,
  naLabel,
  type EvidenceBodyProps,
  type EvidenceIntogen,
  type EvidenceIntogenMutatedSamples,
  type EvidenceIntogenSort,
  EvidenceIntogenSortField,
  type EvidenceIntogenSearch,
  EvidenceIntogenSearchField,
  SortDirection,
} from "@ot/constants";
import { typedDocument } from "../../utils/typedDocument";
import INTOGEN_QUERY_DOCUMENT from "./sectionQuery.gql";

type IntOgenRow = Pick<
  EvidenceIntogen,
  | "diseaseId"
  | "diseaseName"
  | "diseaseFromSource"
  | "targetApprovedSymbol"
  | "mutatedSamples"
  | "resourceScore"
  | "significantDriverMethods"
  | "cohortId"
  | "cohortShortName"
  | "cohortDescription"
>;

type QueryData = {
  disease?: {
    id: string;
    evidenceViews: { intogen: { count: number; rows: IntOgenRow[] } };
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
  sort: EvidenceIntogenSort[];
  search?: EvidenceIntogenSearch;
};

const INTOGEN_QUERY = typedDocument<QueryData, QueryVariables>(INTOGEN_QUERY_DOCUMENT);
const PAGE_SIZE = 10;
// production sorted this table by the combined p-value, ascending
const DEFAULT_SORT = {
  id: "resourceScore",
  field: EvidenceIntogenSortField.PValue,
  desc: false,
};

const driverMethods: Record<string, { description: string } | undefined> = methods;

const intOgenUrl = (id: string, approvedSymbol: string) =>
  `https://www.intogen.org/search?gene=${approvedSymbol}&cohort=${id}`;

const samplePercent = (item: EvidenceIntogenMutatedSamples) =>
  ((item.numberMutatedSamples ?? 0) / (item.numberSamplesTested ?? 1)) * 100;

const columns: OtTableColumn<IntOgenRow>[] = [
  {
    id: "diseaseName",
    label: "Disease/phenotype",
    // Attach the IntOGen search fields to the first column.
    searchFields: [
      EvidenceIntogenSearchField.DiseaseName,
      EvidenceIntogenSearchField.CohortShortName,
      EvidenceIntogenSearchField.CohortDescription,
    ],
    renderCell: ({ diseaseId, diseaseName, diseaseFromSource }) => (
      <Tooltip
        title={
          <>
            <Typography variant="subtitle2" display="block" align="center">
              Reported disease or phenotype:
            </Typography>
            <Typography variant="caption" display="block" align="center">
              {sentenceCase(diseaseFromSource ?? "")}
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
    id: "mutatedSamples",
    label: "Mutated / Total samples",
    renderCell: ({ mutatedSamples }) => (
      <List style={{ padding: 0 }}>
        {mutatedSamples
          .slice()
          .sort((a, b) => samplePercent(b) - samplePercent(a))
          .map(item => {
            const percent = samplePercent(item);

            return (
              <ListItem key={v1()} style={{ padding: ".25rem 0" }}>
                {percent < 5 ? parseFloat(percent.toFixed(2)).toString() : Math.round(percent)}%
                <Typography variant="caption" style={{ marginLeft: ".33rem" }}>
                  ({item.numberMutatedSamples}/{item.numberSamplesTested})
                </Typography>
              </ListItem>
            );
          })}
      </List>
    ),
    exportValue: ({ mutatedSamples }) =>
      mutatedSamples
        .map(item => `${item.numberMutatedSamples}/${item.numberSamplesTested}`)
        .join(", "),
  },
  {
    id: "resourceScore",
    label: (
      <span>
        Combined <i>p</i>-value
      </span>
    ),

    tooltip: (
      <>
        Visit the{" "}
        <Link external to="https://www.intogen.org/faq">
          IntOGen FAQ
        </Link>{" "}
        for more information.
      </>
    ),
    numeric: true,
    sortField: DEFAULT_SORT.field,
    renderCell: ({ resourceScore }) =>
      resourceScore != null ? <ScientificNotation number={resourceScore} /> : naLabel,
  },
  {
    id: "significantDriverMethods",
    label: "Cancer driver methods",
    tooltip: (
      <>
        The current version of the intOGen pipeline uses seven methods to identify cancer driver
        genes from somatic point mutations - HotMAPS, dNDScv, smRegions, CBaSE, FML, MutPanning, and
        CLUSTL. The pipeline also uses a combination of methods. For further information on the
        methods, please{" "}
        <Link to={methods.columnTooltip.url} external>
          click here
        </Link>{" "}
        visit the intOGen FAQ.
      </>
    ),
    renderCell: ({ significantDriverMethods }) =>
      significantDriverMethods.length > 0 ? (
        <ChipList
          items={significantDriverMethods.map(am => ({
            label: am,
            tooltip: driverMethods[am]?.description,
          }))}
        />
      ) : (
        naLabel
      ),
    exportValue: ({ significantDriverMethods }) => significantDriverMethods.join(", "),
  },
  {
    id: "cohortShortName",
    label: "Cohort Information",
    enableHiding: false,
    renderCell: ({ cohortId, cohortShortName, cohortDescription, targetApprovedSymbol }) =>
      cohortShortName && cohortDescription ? (
        <>
          <Link external to={intOgenUrl(cohortId ?? "", targetApprovedSymbol)}>
            {cohortShortName}
          </Link>{" "}
          {cohortDescription}
        </>
      ) : (
        naLabel
      ),
    exportValue: ({ cohortShortName, cohortDescription }) =>
      `${cohortShortName} ${cohortDescription}`,
  },
];

function Body({ id, label, entity }: EvidenceBodyProps) {
  const { ensgId, efoId } = id;
  const variables = { ensemblId: ensgId, efoId };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(INTOGEN_QUERY, {
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
      chipText={dataTypesMap.somatic_mutation}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} name={label.name} />}
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
            <OtTableServer<IntOgenRow>
              query={INTOGEN_QUERY}
              columns={columns}
              dataDownloader
              dataDownloaderFileStem={`intOGen-${ensgId}-${efoId}`}
              dataPath="disease.evidenceViews.intogen"
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
