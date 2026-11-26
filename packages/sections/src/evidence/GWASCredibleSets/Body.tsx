import { useQuery } from "@apollo/client";
import {
  SectionItem,
  Link,
  PublicationsDrawer,
  OtTableServer,
  type OtTableColumn,
  ScientificNotation,
  ClinvarStars,
  Tooltip,
  Navigate,
  DisplayVariantId,
  L2GScoreIndicator,
} from "ui";

import {
  dataTypesMap,
  naLabel,
  credsetConfidenceLabels,
  fineMappingMethodLabels,
  type EvidenceBodyProps,
  type EvidenceGwasCredibleSets,
  type EvidenceGwasCredibleSetsSearch,
  EvidenceGwasCredibleSetsSearchField,
  type EvidenceGwasCredibleSetsSort,
  EvidenceGwasCredibleSetsSortField,
  SortDirection,
} from "@ot/constants";
import { definition } from ".";
import Description from "./Description";
import { typedDocument } from "../../utils/typedDocument";
import GWAS_CREDIBLE_SETS_QUERY_DOCUMENT from "./sectionQuery.gql";

type GwasCredibleSetsRow = Pick<
  EvidenceGwasCredibleSets,
  | "diseaseId"
  | "diseaseName"
  | "credibleSetId"
  | "leadVariantId"
  | "leadReferenceAllele"
  | "leadAlternateAllele"
  | "pValueMantissa"
  | "pValueExponent"
  | "beta"
  | "fineMappingMethod"
  | "confidence"
  | "studyId"
  | "traitFromSource"
  | "publicationFirstAuthor"
  | "publicationDate"
  | "pubmedId"
  | "nSamples"
  | "score"
>;

type QueryData = {
  disease?: {
    id: string;
    evidenceViews: { gwasCredibleSets: { count: number; rows: GwasCredibleSetsRow[] } };
  } | null;
};

type QueryVariables = {
  ensemblId: string;
  efoId: string;
  index: number;
  size: number;
  sort: EvidenceGwasCredibleSetsSort[];
  search?: EvidenceGwasCredibleSetsSearch;
};

const GWAS_CREDIBLE_SETS_QUERY = typedDocument<QueryData, QueryVariables>(
  GWAS_CREDIBLE_SETS_QUERY_DOCUMENT
);
const PAGE_SIZE = 10;
const DEFAULT_SORT = {
  id: "score",
  field: EvidenceGwasCredibleSetsSortField.Score,
  desc: true,
};

const fineMappingMethodLabel = (method: string) => fineMappingMethodLabels[method] ?? method;

function getColumns(targetSymbol: string, targetId: string): OtTableColumn<GwasCredibleSetsRow>[] {
  return [
    {
      id: "credibleSetId",
      label: "Credible set",
      sticky: true,
      // Attach the GWAS credible sets search fields to the first column.
      searchFields: [
        EvidenceGwasCredibleSetsSearchField.LeadVariantId,
        EvidenceGwasCredibleSetsSearchField.TraitFromSource,
        EvidenceGwasCredibleSetsSearchField.DiseaseName,
        EvidenceGwasCredibleSetsSearchField.StudyId,
        EvidenceGwasCredibleSetsSearchField.FineMappingMethod,
        EvidenceGwasCredibleSetsSearchField.PublicationFirstAuthor,
        EvidenceGwasCredibleSetsSearchField.PublicationDate,
      ],
      renderCell: ({ credibleSetId }) => {
        if (!credibleSetId) return naLabel;
        return <Navigate to={`/credible-set/${credibleSetId}`} />;
      },
      exportValue: ({ credibleSetId }) => credibleSetId,
    },
    {
      id: "leadVariantId",
      label: "Lead Variant",
      sortField: EvidenceGwasCredibleSetsSortField.LeadVariant,
      renderCell: ({ leadVariantId, leadReferenceAllele, leadAlternateAllele }) => (
        <Link asyncTooltip to={`/variant/${leadVariantId}`}>
          <DisplayVariantId
            variantId={leadVariantId}
            referenceAllele={leadReferenceAllele}
            alternateAllele={leadAlternateAllele}
            expand={false}
          />
        </Link>
      ),
      exportValue: ({ leadVariantId }) => leadVariantId,
    },
    {
      id: "traitFromSource",
      label: "Reported trait",
      renderCell: ({ traitFromSource }) => traitFromSource,
    },
    {
      id: "diseaseName",
      label: "Disease/phenotype",
      renderCell: ({ diseaseId, diseaseName }) => (
        <Link asyncTooltip to={`/disease/${diseaseId}`}>
          {diseaseName}
        </Link>
      ),
      exportValue: ({ diseaseId, diseaseName }) => `${diseaseName} (${diseaseId})`,
    },
    {
      id: "studyId",
      label: "Study",
      renderCell: ({ studyId }) => (
        <Link asyncTooltip to={`/study/${studyId}`}>
          {studyId}
        </Link>
      ),
    },
    {
      id: "nSamples",
      label: "Sample size",
      numeric: true,
      sortField: EvidenceGwasCredibleSetsSortField.SampleSize,
      renderCell: ({ nSamples }) =>
        typeof nSamples === "number" ? nSamples.toLocaleString() : naLabel,
    },
    {
      id: "pValue",
      label: "P-value",
      sortField: EvidenceGwasCredibleSetsSortField.PValue,
      renderCell: ({ pValueMantissa, pValueExponent }) => {
        if (typeof pValueMantissa !== "number" || typeof pValueExponent !== "number")
          return naLabel;
        return <ScientificNotation number={[pValueMantissa, pValueExponent]} />;
      },
      exportValue: ({ pValueMantissa, pValueExponent }) => {
        if (typeof pValueMantissa !== "number" || typeof pValueExponent !== "number") return null;
        return `${pValueMantissa}x10${pValueExponent}`;
      },
    },
    {
      id: "beta",
      label: "Beta (CI 95%)",
      numeric: true,
      sortField: EvidenceGwasCredibleSetsSortField.Beta,
      renderCell: ({ beta }) => (beta ? beta.toFixed(3) : naLabel),
    },
    {
      id: "confidence",
      label: "Fine-mapping confidence",
      tooltip:
        "Fine-mapping confidence based on the quality of the linkage-disequilibrium information available and fine-mapping method",
      sortField: EvidenceGwasCredibleSetsSortField.Confidence,
      renderCell: ({ confidence }) => {
        if (!confidence) return naLabel;
        return (
          <Tooltip title={credsetConfidenceLabels[confidence]} style="">
            <ClinvarStars num={confidence} />
          </Tooltip>
        );
      },
      exportValue: ({ confidence }) => confidence,
    },
    {
      id: "fineMappingMethod",
      label: "Fine-mapping method",
      renderCell: ({ fineMappingMethod }) => fineMappingMethodLabel(fineMappingMethod),
      exportValue: ({ fineMappingMethod }) => fineMappingMethodLabel(fineMappingMethod),
    },
    {
      id: "score",
      label: "L2G score",
      tooltip: (
        <>
          Machine learning prediction linking a gene to a credible set using all features. Score
          range [0,1]. See{" "}
          <Link external to="https://platform-docs.opentargets.org/gentropy/locus-to-gene-l2g">
            our documentation
          </Link>{" "}
          for more information.
        </>
      ),
      sortField: DEFAULT_SORT.field,
      renderCell: ({ score, credibleSetId }) => {
        if (!score) return naLabel;
        return (
          <L2GScoreIndicator score={score} targetId={targetId} credibleSetId={credibleSetId} />
        );
      },
    },
    {
      id: "publication",
      label: "Publication",
      renderCell: ({ diseaseName, publicationFirstAuthor, publicationDate, pubmedId }) => {
        if (!publicationFirstAuthor) return naLabel;
        return (
          <PublicationsDrawer
            name={diseaseName}
            symbol={targetSymbol}
            entries={[{ name: pubmedId ?? "" }]}
            customLabel={`${publicationFirstAuthor} et al. (${new Date(
              publicationDate ?? ""
            ).getFullYear()})`}
          />
        );
      },
      exportValue: ({ pubmedId }) => pubmedId,
    },
  ];
}

function Body({ id, label, entity }: EvidenceBodyProps) {
  const { ensgId, efoId } = id;
  const variables = { ensemblId: ensgId, efoId };

  const columns = getColumns(label.symbol, ensgId);

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(GWAS_CREDIBLE_SETS_QUERY, {
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
      chipText={dataTypesMap.genetic_association}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} name={label.name} />}
      renderBody={() => (
        <OtTableServer<GwasCredibleSetsRow>
          query={GWAS_CREDIBLE_SETS_QUERY}
          columns={columns}
          dataDownloader
          dataDownloaderFileStem={`GWASassociations-${ensgId}-${efoId}`}
          dataPath="disease.evidenceViews.gwasCredibleSets"
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
