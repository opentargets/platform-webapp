import { useQuery } from "@apollo/client";
import { type ReactNode } from "react";
import {
  Link,
  SectionItem,
  ScientificNotation,
  DisplayVariantId,
  OtTableServer,
  type OtTableColumn,
  Tooltip,
  ClinvarStars,
  Navigate,
  Box,
  Chip,
} from "ui";

import { definition } from ".";
import Description from "./Description";
import QTL_CREDIBLE_SETS_QUERY from "./QTLCredibleSetsQuery.gql";
import {
  credsetConfidenceLabels,
  fineMappingMethodLabels,
  naLabel,
  SortDirection,
  type VariantCredibleSet,
  VariantCredibleSetsSearchField,
  VariantCredibleSetsSortField,
} from "@ot/constants";

const DEFAULT_SORT = {
  id: "pValue",
  field: VariantCredibleSetsSortField.PValue,
  desc: false,
};

type getColumnsType = {
  id: string;
  referenceAllele: string;
  alternateAllele: string;
};

function getColumns({
  id,
  referenceAllele,
  alternateAllele,
}: getColumnsType): OtTableColumn<VariantCredibleSet>[] {
  return [
    {
      id: "credibleSetId",
      label: "Credible set",
      enableHiding: false,
      sticky: true,
      // For now, attach all QTL search fields to the first column.
      searchFields: [
        VariantCredibleSetsSearchField.LeadVariantId,
        VariantCredibleSetsSearchField.StudyId,
        VariantCredibleSetsSearchField.StudyTargetApprovedSymbol,
        VariantCredibleSetsSearchField.StudyTargetId,
        VariantCredibleSetsSearchField.BiosampleName,
        VariantCredibleSetsSearchField.BiosampleId,
        VariantCredibleSetsSearchField.Condition,
        VariantCredibleSetsSearchField.FineMappingMethod,
      ],
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
      id: "studyId",
      label: "Study",
      renderCell: ({ studyId }) => {
        if (!studyId) return naLabel;
        return (
          <Link asyncTooltip to={`/study/${studyId}`}>
            {studyId}
          </Link>
        );
      },
    },
    {
      id: "studyType",
      label: "Type",
      renderCell: ({ studyType, isTransQtl }) => (
        <>
          {`${studyType.slice(0, -3)}${studyType.slice(-3).toUpperCase()}`}{" "}
          {isTransQtl && <Chip label="trans" />}
        </>
      ),
      exportValue: ({ studyType, isTransQtl }) =>
        `${studyType.slice(0, -3)}${studyType.slice(-3).toUpperCase()}, isTrans:${isTransQtl ?? naLabel}`,
    },
    {
      id: "studyTargetApprovedSymbol",
      label: "Affected gene",
      renderCell: ({ studyTargetId, studyTargetApprovedSymbol }) => {
        if (!studyTargetId) return studyTargetApprovedSymbol || naLabel;
        return (
          <Link asyncTooltip to={`/target/${studyTargetId}`}>
            {studyTargetApprovedSymbol || studyTargetId}
          </Link>
        );
      },
      exportValue: ({ studyTargetApprovedSymbol, studyTargetId }) =>
        studyTargetApprovedSymbol || studyTargetId,
    },
    {
      id: "biosampleName",
      label: "Affected tissue/cell",
      renderCell: ({ biosampleId, biosampleName }) => {
        if (!biosampleId) return biosampleName || naLabel;
        return (
          <Link external to={`https://www.ebi.ac.uk/ols4/search?q=${biosampleId}`}>
            {biosampleName || biosampleId}
          </Link>
        );
      },
      exportValue: ({ biosampleName, biosampleId }) => biosampleName || biosampleId,
    },
    {
      id: "condition",
      label: "Condition",
      renderCell: ({ condition }) => condition || naLabel,
    },
    {
      id: "pValue",
      label: "P-value",
      numeric: true,
      sortField: DEFAULT_SORT.field,
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
      sortField: VariantCredibleSetsSortField.Beta,
      renderCell: ({ beta }) => {
        if (typeof beta !== "number") return naLabel;
        return beta.toPrecision(3);
      },
    },
    {
      id: "posteriorProbability",
      label: "Posterior probability",
      numeric: true,
      sortField: VariantCredibleSetsSortField.PosteriorProbability,
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
        if (confidence == null) return naLabel;
        return (
          <Tooltip title={credsetConfidenceLabels[confidence]} style="">
            <ClinvarStars num={confidence} />
          </Tooltip>
        );
      },
    },
    {
      id: "fineMappingMethod",
      label: "Fine-mapping method",
      renderCell: ({ fineMappingMethod }) =>
        fineMappingMethodLabels[fineMappingMethod] ?? fineMappingMethod,
      exportValue: ({ fineMappingMethod }) =>
        fineMappingMethodLabels[fineMappingMethod] ?? fineMappingMethod,
    },
    {
      id: "credibleSetSize",
      label: "Credible set size",
      numeric: true,
      sortField: VariantCredibleSetsSortField.CredibleSetSize,
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

function Body({ id, entity }: BodyProps): ReactNode {
  const variables = { variantId: id };
  const request = useQuery(QTL_CREDIBLE_SETS_QUERY, {
    variables: {
      ...variables,
      index: 0,
      size: PAGE_SIZE,
      sort: [{ key: DEFAULT_SORT.field, direction: SortDirection.Ascending }],
    },
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => (
        <Description
          variantId={id}
          referenceAllele={request.data?.variant?.referenceAllele}
          alternateAllele={request.data?.variant?.alternateAllele}
        />
      )}
      renderBody={() => {
        return (
          <OtTableServer<VariantCredibleSet>
            dataDownloader
            dataDownloaderFileStem={`${id}-qtl-credible-sets-variant`}
            dataPath="variant.qtlCredibleSets"
            pageSize={PAGE_SIZE}
            sortBy={DEFAULT_SORT.id}
            order={DEFAULT_SORT.desc ? "desc" : "asc"}
            columns={getColumns({
              id,
              referenceAllele: request.data?.variant.referenceAllele,
              alternateAllele: request.data?.variant.alternateAllele,
            })}
            query={QTL_CREDIBLE_SETS_QUERY}
            variables={variables}
          />
        );
      }}
    />
  );
}

export default Body;
