import { useQuery } from "@apollo/client";
import {
  credsetConfidenceMap,
  naLabel,
  SortDirection,
  type StudyCredibleSet,
  type StudyCredibleSetsSearch,
  StudyCredibleSetsSearchField,
  type StudyCredibleSetsSort,
  StudyCredibleSetsSortField,
} from "@ot/constants";
import type { ReactElement } from "react";
import {
  ClinvarStars,
  DisplayVariantId,
  L2GScoreIndicator,
  Link,
  Navigate,
  type OtTableColumn,
  OtTableServer,
  ScientificNotation,
  SectionItem,
  Tooltip,
} from "ui";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import Description from "./Description";
import GWAS_CREDIBLE_SETS_QUERY_DOCUMENT from "./GWASCredibleSetsQuery.gql";

// import GWAS_CREDIBLE_SETS_PLOT_QUERY from "./GWASCredibleSetsPlotQuery.gql";
// import ManhattanPlot from "./ManhattanPlot";

type StudyRow = Pick<
  StudyCredibleSet,
  | "studyLocusId"
  | "leadVariantId"
  | "leadReferenceAllele"
  | "leadAlternateAllele"
  | "pValueMantissa"
  | "pValueExponent"
  | "beta"
  | "locusSize"
  | "finemappingMethod"
  | "confidence"
  | "topL2GGeneId"
  | "topL2GApprovedSymbol"
  | "topL2GScore"
>;

type QueryData = {
  study?: {
    id: string;
    credibleSetsView: { count: number; rows: StudyRow[] };
  } | null;
};

type QueryVariables = {
  studyId: string;
  index: number;
  size: number;
  sort: StudyCredibleSetsSort[];
  search?: StudyCredibleSetsSearch;
};

const GWAS_CREDIBLE_SETS_QUERY = typedDocument<QueryData, QueryVariables>(
  GWAS_CREDIBLE_SETS_QUERY_DOCUMENT
);

const PAGE_SIZE = 10;
const DEFAULT_SORT = {
  id: "pValue",
  field: StudyCredibleSetsSortField.PValue,
};

const columns: OtTableColumn<StudyRow>[] = [
  {
    id: "studyLocusId",
    label: "Credible set",
    enableHiding: false,
    sticky: true,
    // For now, attach all search fields to the first column.
    searchFields: Object.values(StudyCredibleSetsSearchField),
    renderCell: ({ studyLocusId }) => <Navigate to={`/credible-set/${studyLocusId}`} />,
  },
  {
    id: "leadVariant",
    label: "Lead variant",
    enableHiding: false,
    sortField: StudyCredibleSetsSortField.LeadVariant,
    renderCell: ({ leadVariantId, leadReferenceAllele, leadAlternateAllele }) => {
      if (!leadVariantId) return naLabel;
      return (
        <Link asyncTooltip to={`/variant/${leadVariantId}`}>
          <DisplayVariantId
            variantId={leadVariantId}
            referenceAllele={leadReferenceAllele}
            alternateAllele={leadAlternateAllele}
            expand={false}
          />
        </Link>
      );
    },
    exportValue: ({ leadVariantId }) => leadVariantId,
  },
  {
    id: "pValue",
    label: "P-value",
    numeric: true,
    sortField: DEFAULT_SORT.field,
    renderCell: ({ pValueMantissa, pValueExponent }) => {
      if (typeof pValueMantissa !== "number" || typeof pValueExponent !== "number") return naLabel;
      return <ScientificNotation number={[pValueMantissa, pValueExponent]} dp={2} />;
    },
    exportValue: ({ pValueMantissa, pValueExponent }) => {
      if (typeof pValueMantissa !== "number" || typeof pValueExponent !== "number") return null;
      return `${pValueMantissa}x10${pValueExponent}`;
    },
  },
  {
    id: "beta",
    label: "Beta",
    numeric: true,
    sortField: StudyCredibleSetsSortField.Beta,
    tooltip: "Beta with respect to the ALT allele",
    renderCell: ({ beta }) => {
      if (typeof beta !== "number") return naLabel;
      return beta.toPrecision(3);
    },
  },
  {
    id: "finemappingMethod",
    label: "Fine-mapping method",
  },
  {
    id: "confidence",
    label: "Fine-mapping confidence",
    tooltip: (
      <>
        Fine-mapping confidence based on the suitability of the linkage-disequilibrium information
        and fine-mapping method. See{" "}
        <Link
          external
          to="https://platform-docs.opentargets.org/credible-set#credible-set-confidence"
        >
          here
        </Link>{" "}
        for more details.
      </>
    ),
    renderCell: ({ confidence }) => {
      if (!confidence) return naLabel;
      return (
        <Tooltip title={confidence} style="">
          <ClinvarStars num={credsetConfidenceMap[confidence]} />
        </Tooltip>
      );
    },
  },
  {
    id: "topL2G",
    label: "Top L2G",
    sortField: StudyCredibleSetsSortField.TopL2GApprovedSymbol,
    tooltip: (
      <>
        Top gene prioritised by our locus-to-gene model. See{" "}
        <Link external to="https://platform-docs.opentargets.org/gentropy/locus-to-gene-l2g">
          our documentation
        </Link>{" "}
        for more information.
      </>
    ),
    renderCell: ({ topL2GGeneId, topL2GApprovedSymbol }) => {
      if (!topL2GGeneId || !topL2GApprovedSymbol) return naLabel;
      return (
        <Link asyncTooltip to={`/target/${topL2GGeneId}`}>
          {topL2GApprovedSymbol}
        </Link>
      );
    },
    exportValue: ({ topL2GApprovedSymbol }) => topL2GApprovedSymbol,
  },
  {
    id: "l2gScore",
    label: "L2G score",
    sortField: StudyCredibleSetsSortField.TopL2GScore,
    tooltip: (
      <>
        Machine learning prediction linking a gene to a credible set using all features. Score range
        [0,1]. See{" "}
        <Link external to="https://platform-docs.opentargets.org/gentropy/locus-to-gene-l2g">
          our documentation
        </Link>{" "}
        for more information.
      </>
    ),
    renderCell: ({ studyLocusId, topL2GGeneId, topL2GScore }) => {
      if (!topL2GGeneId || typeof topL2GScore !== "number") return naLabel;
      return (
        <L2GScoreIndicator
          score={topL2GScore}
          studyLocusId={studyLocusId}
          targetId={topL2GGeneId}
        />
      );
    },
    exportValue: ({ topL2GScore }) => topL2GScore,
  },
  {
    id: "credibleSetSize",
    label: "Credible set size",
    sortField: StudyCredibleSetsSortField.LocusSize,
    numeric: true,
    renderCell: ({ locusSize }) => {
      return typeof locusSize === "number" ? locusSize.toLocaleString() : naLabel;
    },
    exportValue: ({ locusSize }) => locusSize,
  },
];

type BodyProps = {
  id: string;
  entity: string;
};

function Body({ id, entity }: BodyProps): ReactElement {
  const variables = { studyId: id };
  const request = useQuery(GWAS_CREDIBLE_SETS_QUERY, {
    variables: {
      ...variables,
      index: 0,
      size: PAGE_SIZE,
      sort: [{ key: DEFAULT_SORT.field, direction: SortDirection.Ascending }],
    },
  });
  // const plotRequest = useQuery(GWAS_CREDIBLE_SETS_PLOT_QUERY, {
  //   variables: { ...variables, page: { index: 0, size: 50000 } },
  // });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => <Description studyId={id} />}
      renderBody={() => (
        <>
          {/* Manhattan plot temporarily hidden.
          <Box my={3} ml={2}>
            <ManhattanPlot
              loading={plotRequest.loading}
              data={plotRequest.data?.study?.credibleSets?.rows}
            />
          </Box>
          */}
          <OtTableServer<StudyRow>
            dataDownloader
            dataDownloaderFileStem={`${id}-gwas-credible-sets-studies`}
            dataPath="study.credibleSetsView"
            pageSize={PAGE_SIZE}
            sortBy={DEFAULT_SORT.id}
            order="asc"
            columns={columns}
            query={GWAS_CREDIBLE_SETS_QUERY}
            variables={variables}
          />
        </>
      )}
    />
  );
}

export default Body;
