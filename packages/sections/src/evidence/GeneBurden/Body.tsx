import { useQuery } from "@apollo/client";
import {
  Link,
  Tooltip,
  SectionItem,
  PublicationsDrawer,
  ScientificNotation,
  DirectionOfEffectIcon,
  DirectionOfEffectTooltip,
  OtTableServer,
  type OtTableColumn,
  Typography,
} from "ui";

import { definition } from ".";
import Description from "./Description";
import { epmcUrl } from "@ot/utils";
import {
  dataTypesMap,
  naLabel,
  type EvidenceBodyProps,
  type EvidenceGeneBurden,
  type EvidenceGeneBurdenSearch,
  EvidenceGeneBurdenSearchField,
  type EvidenceGeneBurdenSort,
  EvidenceGeneBurdenSortField,
  SortDirection,
} from "@ot/constants";
import { typedDocument } from "../../utils/typedDocument";

import GENE_BURDEN_QUERY_DOCUMENT from "./GeneBurdenQuery.gql";

type GeneBurdenRow = Pick<
  EvidenceGeneBurden,
  | "diseaseId"
  | "diseaseName"
  | "diseaseFromSource"
  | "targetId"
  | "targetFromSourceId"
  | "urls"
  | "directionOnTarget"
  | "directionOnTrait"
  | "allelicRequirements"
  | "ancestry"
  | "ancestryId"
  | "cohortId"
  | "projectId"
  | "statisticalMethod"
  | "statisticalMethodOverview"
  | "studyCases"
  | "studyCasesWithQualifyingVariants"
  | "studySampleSize"
  | "oddsRatio"
  | "oddsRatioConfidenceIntervalLower"
  | "oddsRatioConfidenceIntervalUpper"
  | "beta"
  | "betaConfidenceIntervalLower"
  | "betaConfidenceIntervalUpper"
  | "pValueMantissa"
  | "pValueExponent"
  | "literature"
>;

type QueryData = {
  disease?: {
    id: string;
    evidenceViews: { geneBurden: { count: number; rows: GeneBurdenRow[] } };
  } | null;
};

type QueryVariables = {
  ensemblId: string;
  efoId: string;
  index: number;
  size: number;
  sort: EvidenceGeneBurdenSort[];
  search?: EvidenceGeneBurdenSearch;
};

const GENE_BURDEN_QUERY = typedDocument<QueryData, QueryVariables>(GENE_BURDEN_QUERY_DOCUMENT);
const PAGE_SIZE = 10;
const DEFAULT_SORT = {
  id: "pValue",
  field: EvidenceGeneBurdenSortField.PValue,
  desc: false,
};

const getSource = (cohort?: string | null, project?: string | null) => {
  if (!cohort) return project;
  if (!project) return cohort;
  return `${cohort} (${project})`;
};

// Link-outs for projects whose evidence carries no `urls`; the rest (AstraZeneca,
// SCHEMA, BipEx, CVDI, ...) link to the `urls` the data provides
const projectLinks: Record<string, (targetId: string) => string> = {
  "Epi25 collaborative": (targetId) => `https://epi25.broadinstitute.org/gene/${targetId}`,
  "Autism Sequencing Consortium": (targetId) => `https://asc.broadinstitute.org/gene/${targetId}`,
  Genebass: (targetId) =>
    `https://app.genebass.org/gene/${targetId}?burdenSet=pLoF&phewasOpts=1&resultLayout=full`,
  "AMP-PD": () => "https://amp-pd.org/",
  FinnGen: (targetId) => `https://r12.finngen.fi/gene/${targetId}`,
};

const getSourceLink = (
  project: string | null | undefined,
  targetId: string,
  urls: GeneBurdenRow["urls"]
) => urls?.[0] ?? (project ? projectLinks[project]?.(targetId) : undefined) ?? "";

const formatCount = (value?: number | null) =>
  typeof value === "number" ? value.toLocaleString() : naLabel;

const formatWithCi = (value?: number | null, lower?: number | null, upper?: number | null) => {
  if (!value) return naLabel;
  const ci =
    lower && upper ? `(${parseFloat(lower.toFixed(3))}, ${parseFloat(upper.toFixed(3))})` : "";
  return `${parseFloat(value.toFixed(3))} ${ci}`;
};

const getColumns = (label: EvidenceBodyProps["label"]): OtTableColumn<GeneBurdenRow>[] => [
  {
    id: "diseaseName",
    label: "Disease/phenotype",
    // Attach the gene burden search fields to the first column.
    searchFields: [
      EvidenceGeneBurdenSearchField.DiseaseName,
      EvidenceGeneBurdenSearchField.DiseaseFromSource,
      EvidenceGeneBurdenSearchField.CohortId,
      EvidenceGeneBurdenSearchField.ProjectId,
      EvidenceGeneBurdenSearchField.Ancestry,
      EvidenceGeneBurdenSearchField.AncestryId,
      EvidenceGeneBurdenSearchField.StatisticalMethod,
      EvidenceGeneBurdenSearchField.AllelicRequirements,
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
    id: "cohortId",
    label: "Cohort/Project",
    renderCell: ({ cohortId, projectId, targetId, urls }) => {
      if (!cohortId && !projectId) return naLabel;
      // the getSource() function handles cases where cohortId==null or projectId==null
      const link = getSourceLink(projectId, targetId, urls);
      if (!link) return getSource(cohortId, projectId);
      return (
        <Link to={link} external>
          {getSource(cohortId, projectId)}
        </Link>
      );
    },
    exportValue: ({ cohortId, projectId }) => getSource(cohortId, projectId) ?? "",
  },
  {
    id: "ancestry",
    label: "Ancestry",
    renderCell: ({ ancestry, ancestryId }) => {
      if (!ancestry) return naLabel;
      if (!ancestryId) return ancestry;
      return (
        <Link to={`http://purl.obolibrary.org/obo/${ancestryId}`} external>
          {ancestry}
        </Link>
      );
    },
  },
  {
    id: "statisticalMethod",
    label: "Model",
    renderCell: ({ statisticalMethod, statisticalMethodOverview }) => (
      <Tooltip title={statisticalMethodOverview} showHelpIcon>
        {statisticalMethod}
      </Tooltip>
    ),
  },
  {
    id: "allelicRequirements",
    label: "Allelic Requirement",
    renderCell: ({ allelicRequirements }) => allelicRequirements[0] ?? naLabel,
    exportValue: ({ allelicRequirements }) => allelicRequirements.join(", "),
  },
  {
    id: "studyCasesWithQualifyingVariants",
    label: "Cases with QV",
    numeric: true,
    sortField: EvidenceGeneBurdenSortField.CasesWithQualifyingVariants,
    renderCell: ({ studyCasesWithQualifyingVariants }) =>
      formatCount(studyCasesWithQualifyingVariants),
  },
  {
    id: "studyCases",
    label: "Cases",
    numeric: true,
    sortField: EvidenceGeneBurdenSortField.Cases,
    renderCell: ({ studyCases }) => formatCount(studyCases),
  },
  {
    id: "studySampleSize",
    label: "Sample size",
    numeric: true,
    sortField: EvidenceGeneBurdenSortField.SampleSize,
    renderCell: ({ studySampleSize }) => formatCount(studySampleSize),
  },
  {
    id: "oddsRatio",
    label: "Odds Ratio (CI 95%)",
    numeric: true,
    sortField: EvidenceGeneBurdenSortField.OddsRatio,
    renderCell: ({ oddsRatio, oddsRatioConfidenceIntervalLower, oddsRatioConfidenceIntervalUpper }) =>
      formatWithCi(oddsRatio, oddsRatioConfidenceIntervalLower, oddsRatioConfidenceIntervalUpper),
  },
  {
    id: "beta",
    label: "Beta (CI 95%)",
    numeric: true,
    sortField: EvidenceGeneBurdenSortField.Beta,
    renderCell: ({ beta, betaConfidenceIntervalLower, betaConfidenceIntervalUpper }) =>
      formatWithCi(beta, betaConfidenceIntervalLower, betaConfidenceIntervalUpper),
  },
  {
    id: "directionOfVariantEffect",
    label: (
      <DirectionOfEffectTooltip docsUrl="https://platform-docs.opentargets.org/evidence#gene-burden"></DirectionOfEffectTooltip>
    ),
    renderCell: ({ directionOnTarget, directionOnTrait }) => {
      return (
        <DirectionOfEffectIcon variantEffect={directionOnTarget ?? ""} directionOnTrait={directionOnTrait ?? ""} />
      );
    },
  },
  {
    id: "pValue",
    label: (
      <>
        <i>p</i>-value
      </>
    ),
    numeric: true,
    sortField: DEFAULT_SORT.field,
    renderCell: ({ pValueMantissa, pValueExponent }) => {
      if (typeof pValueMantissa !== "number" || typeof pValueExponent !== "number") return naLabel;
      return <ScientificNotation number={[pValueMantissa, pValueExponent]} />;
    },
    exportValue: ({ pValueMantissa, pValueExponent }) => {
      if (typeof pValueMantissa !== "number" || typeof pValueExponent !== "number") return null;
      return `${pValueMantissa}x10${pValueExponent}`;
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

export function Body({ id, label, entity }: EvidenceBodyProps) {
  const { ensgId, efoId } = id;
  const variables = { ensemblId: ensgId, efoId };
  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(GENE_BURDEN_QUERY, {
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
      chipText={dataTypesMap.genetic_association}
      entity={entity}
      request={request}
      renderDescription={() => <Description symbol={label.symbol} diseaseName={label.name} />}
      renderBody={() => {
        return (
          <OtTableServer<GeneBurdenRow>
            query={GENE_BURDEN_QUERY}
            columns={columns}
            dataDownloader
            dataDownloaderFileStem={`geneburden-${ensgId}-${efoId}`}
            dataPath="disease.evidenceViews.geneBurden"
            pageSize={PAGE_SIZE}
            sortBy={DEFAULT_SORT.id}
            order={DEFAULT_SORT.desc ? "desc" : "asc"}
            variables={variables}
          />
        );
      }}
    />
  );
}

export default Body;
