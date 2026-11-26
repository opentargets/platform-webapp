import {
  Link,
  SectionItem,
  ScientificNotation,
  DisplayVariantId,
  OtTableServer,
  Tooltip,
  ClinvarStars,
  L2GScoreIndicator,
  Navigate,
  Box,
  Chip,
  Typography,
} from "ui";
import { definition } from ".";
import Description from "./Description";
import GWAS_CREDIBLE_SETS_TABLE_QUERY from "./GWASCredibleSetsTableQuery.gql";
import { Fragment } from "react/jsx-runtime";
import PheWasPlot from "./PheWasPlot";
import {
  credsetConfidenceLabels,
  fineMappingMethodLabels,
  naLabel,
  SortDirection,
  VariantCredibleSetsSearchField,
  VariantCredibleSetsSortField,
} from "@ot/constants";
import { useQuery } from "@apollo/client";
import GWAS_CREDIBLE_SETS_PLOT_QUERY from "./GWASCredibleSetsPlotQuery.gql";

type getColumnsType = {
  id: string;
  referenceAllele: string;
  alternateAllele: string;
};

const DEFAULT_SORT = {
  id: "l2gScore",
  field: VariantCredibleSetsSortField.TopL2GScore,
  desc: true,
};

function getColumns({ id, referenceAllele, alternateAllele }: getColumnsType) {
  return [
    {
      id: "credibleSetId",
      label: "Credible set",
      sticky: true,
      enableHiding: false,
      // For now add all search fields to first column - if move to column-based
      // search, move these fields to their corresponding columns
      searchFields: Object.values(VariantCredibleSetsSearchField),
      renderCell: ({ credibleSetId }) => <Navigate to={`/credible-set/${credibleSetId}`} />,
    },
    {
      id: "leadVariant",
      label: "Lead variant",
      enableHiding: false,
      sortField: VariantCredibleSetsSortField.LeadVariant,
      renderCell: ({ leadVariantId, leadReferenceAllele, leadAlternateAllele }) => {
        if (!leadVariantId) return naLabel;
        const displayElement = (
          <DisplayVariantId
            variantId={leadVariantId}
            referenceAllele={leadReferenceAllele}
            alternateAllele={leadAlternateAllele}
            expand={false}
          />
        );
        if (leadVariantId === id) {
          return (
            <Box display="flex" alignItems="center" gap={0.5}>
              {displayElement}
              <Chip label="self" />
            </Box>
          );
        }
        return (
          <Link asyncTooltip to={`/variant/${leadVariantId}`}>
            {displayElement}
          </Link>
        );
      },
      exportValue: ({ leadVariantId }) => leadVariantId,
    },
    {
      id: "trait",
      label: "Reported trait",
      renderCell: ({ traitFromSource }) => {
        if (!traitFromSource) return naLabel;
        return traitFromSource;
      },
      exportValue: ({ traitFromSource }) => traitFromSource,
    },
    {
      id: "disease",
      label: "Disease/phenotype",
      renderCell: ({ diseases = [] }) => {
        if (!diseases.length) return naLabel;
        return (
          <>
            {diseases.map(({ id: diseaseId, name }, index) => (
              <Fragment key={diseaseId || name}>
                {index > 0 && ", "}
                {diseaseId ? (
                  <Link asyncTooltip to={`../disease/${diseaseId}`}>
                    {name || diseaseId}
                  </Link>
                ) : (
                  name || naLabel
                )}
              </Fragment>
            ))}
          </>
        );
      },
      exportValue: ({ diseases = [] }) => diseases.map(({ name }) => name).join(", "),
    },
    {
      id: "studyId",
      label: "Study",
      renderCell: ({ studyId }) => {
        if (!studyId) return naLabel;
        return (
          <Link asyncTooltip to={`../study/${studyId}`}>
            {studyId}
          </Link>
        );
      },
      exportValue: ({ studyId }) => studyId,
    },
    {
      id: "pValue",
      label: "P-value",
      numeric: true,
      sortField: VariantCredibleSetsSortField.PValue,
      renderCell: ({ pValueMantissa, pValueExponent }) => {
        if (typeof pValueMantissa !== "number" || typeof pValueExponent !== "number")
          return naLabel;
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
      tooltip: "Beta with respect to the ALT allele",
      renderCell: ({ beta }) => {
        if (typeof beta !== "number") return naLabel;
        return beta.toPrecision(3);
      },
    },
    {
      id: "posteriorProbability",
      label: "Posterior probability",
      numeric: true,
      tooltip: (
        <>
          Posterior inclusion probability that the fixed page variant (
          <DisplayVariantId
            variantId={id}
            referenceAllele={referenceAllele}
            alternateAllele={alternateAllele}
            expand={false}
          />
          ) is causal.
        </>
      ),
      renderCell: ({ posteriorProbability }) =>
        typeof posteriorProbability === "number" ? posteriorProbability.toPrecision(3) : naLabel,
      exportValue: ({ posteriorProbability }) => posteriorProbability,
    },
    {
      id: "fineMappingMethod",
      label: "Fine-mapping method",
      renderCell: ({ fineMappingMethod }) =>
        fineMappingMethodLabels[fineMappingMethod] ?? fineMappingMethod ?? naLabel,
      exportValue: ({ fineMappingMethod }) =>
        fineMappingMethodLabels[fineMappingMethod] ?? fineMappingMethod,
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
          <Tooltip title={credsetConfidenceLabels[confidence]} style="">
            <ClinvarStars num={confidence} />
          </Tooltip>
        );
      },
    },
    {
      id: "topL2G",
      label: "Top L2G",
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
      sortField: DEFAULT_SORT.field,
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
      renderCell: ({ credibleSetId, topL2GGeneId, topL2GScore }) => {
        if (!topL2GGeneId || typeof topL2GScore !== "number") return naLabel;
        return (
          <L2GScoreIndicator
            score={topL2GScore}
            credibleSetId={credibleSetId}
            targetId={topL2GGeneId}
          />
        );
      },
      exportValue: ({ topL2GScore }) => topL2GScore,
    },
    {
      id: "credibleSetSize",
      label: "Credible set size",
      numeric: true,
      renderCell: ({ locusSize }) => {
        return typeof locusSize === "number" ? locusSize.toLocaleString() : naLabel;
      },
      exportValue: ({ locusSize }) => locusSize,
    },
  ];
}

type BodyProps = {
  id: string;
  entity: string;
};

const PAGE_SIZE = 10;

function Body({ id, entity }: BodyProps) {
  const variables = { variantId: id };
  const request = useQuery(GWAS_CREDIBLE_SETS_TABLE_QUERY, {
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
      entity={entity}
      request={request}
      renderDescription={() => (
        <Description
          variantId={request.data?.variant.variantId}
          referenceAllele={request.data?.variant.referenceAllele}
          alternateAllele={request.data?.variant.alternateAllele}
        />
      )}
      renderChart={() => (
        <Box mb={1} ml={2}>
          <Plot variantId={id} />
        </Box>
      )}
      renderBody={() => {
        const columns = getColumns({
          id,
          referenceAllele: request.data?.variant.referenceAllele,
          alternateAllele: request.data?.variant.alternateAllele,
        });
        return (
          <OtTableServer
            dataDownloader
            dataDownloaderFileStem={`${id}-gwas-credible-sets-variant`}
            dataPath="variant.credibleSetsView"
            pageSize={PAGE_SIZE}
            columns={columns}
            query={GWAS_CREDIBLE_SETS_TABLE_QUERY}
            variables={variables}
            sortBy={DEFAULT_SORT.id}
            order={DEFAULT_SORT.desc ? "desc" : "asc"}
          />
        );
      }}
    />
  );
}

function Plot({ variantId }: { variantId: string }) {
  const { data, loading, error } = useQuery(GWAS_CREDIBLE_SETS_PLOT_QUERY, {
    variables: { variantId },
  });

  if (error) {
    return (
      <Typography  align="center" mt={1}>
        Unable to load the GWAS credible sets plot
      </Typography>
    );
  }

  return (
    <PheWasPlot
      loading={loading}
      data={data?.variant?.credibleSetsView?.rows}
      pageId={variantId}
      pageReferenceAllele={data?.variant?.referenceAllele}
      pageAlternateAllele={data?.variant?.alternateAllele}
    />
  );
}

export default Body;
