import { useState, type ReactNode } from "react";
import {
  Link,
  SectionItem,
  ScientificNotation,
  DisplayVariantId,
  OtTableOffsetPagination,
  Tooltip,
  ClinvarStars,
  Navigate,
  Box,
  Chip,
} from "ui";

import { definition } from ".";
import Description from "./Description";
import QTL_CREDIBLE_SETS_QUERY from "./QTLCredibleSetsQuery.gql";
import { mantissaExponentComparator, variantComparator } from "@ot/utils";
import { credsetConfidenceMap, naLabel } from "@ot/constants";

type getColumnsType = {
  id: string;
  referenceAllele: string;
  alternateAllele: string;
};

function getColumns({ id, referenceAllele, alternateAllele }: getColumnsType) {
  return [
    {
      id: "studyLocusId",
      label: "Credible set",
      enableHiding: false,
      sticky: true,
      renderCell: ({ studyLocusId }) => <Navigate to={`/credible-set/${studyLocusId}`} />,
    },
    {
      id: "leadVariant",
      label: "Lead variant",
      enableHiding: false,
      comparator: variantComparator(d => d.variant),
      sortable: true,
      filterValue: ({ variant: v }) =>
        `${v?.chromosome}_${v?.position}_${v?.referenceAllele}_${v?.alternateAllele}`,
      renderCell: ({ variant }) => {
        if (!variant) return naLabel;
        const { variantId, referenceAllele, alternateAllele } = variant;
        const displayElement = (
          <DisplayVariantId
            variantId={variantId}
            referenceAllele={referenceAllele}
            alternateAllele={alternateAllele}
            expand={false}
          />
        );
        if (variantId === id) {
          return (
            <Box display="flex" alignItems="center" gap={0.5}>
              {displayElement}
              <Chip label="self" />
            </Box>
          );
        }
        return (
          <Link asyncTooltip to={`/variant/${variantId}`}>
            {displayElement}
          </Link>
        );
      },
      exportValue: ({ variant }) => variant?.variantId,
    },
    {
      id: "studyId",
      label: "Study",
      renderCell: ({ study }) => {
        if (!study) return naLabel;
        return (
          <Link asyncTooltip to={`../study/${study.id}`}>
            {study.id}
          </Link>
        );
      },
    },
    {
      id: "study.studyType",
      label: "Type",
      renderCell: ({ study, isTransQtl }) => {
        const type = study?.studyType;
        if (!type) return naLabel;
        return (
          <>
            {`${type.slice(0, -3)}${type.slice(-3).toUpperCase()}`}{" "}
            {isTransQtl && <Chip label="trans" />}
          </>
        );
      },
      exportValue: ({ study, isTrans }) => {
        const type = study?.studyType;
        if (!type) return null;
        return `${type.slice(0, -3)}${type.slice(-3).toUpperCase()}, isTrans:${isTrans}`;
      },
    },
    {
      id: "study.target.approvedSymbol",
      label: "Affected gene",
      renderCell: () => "?API?",
      exportValue: () => "?API?",
    },
    {
      id: "study",
      label: "Affected tissue/cell",
      renderCell: () => "?API?",
      exportValue: () => "?API?",
    },
    {
      id: "study.condition",
      label: "Condition",
      renderCell: ({ study }) => study?.condition || naLabel,
    },
    {
      id: "pValue",
      label: "P-value",
      numeric: true,
      comparator: (a, b) =>
        mantissaExponentComparator(
          a?.pValueMantissa,
          a?.pValueExponent,
          b?.pValueMantissa,
          b?.pValueExponent
        ),
      sortable: true,
      filterValue: false,
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
      filterValue: false,
      tooltip: "Beta with respect to the ALT allele",
      sortable: true,
      renderCell: ({ beta }) => {
        if (typeof beta !== "number") return naLabel;
        return beta.toPrecision(3);
      },
    },
    {
      id: "posteriorProbability",
      label: "Posterior probability",
      numeric: true,
      filterValue: false,
      sortable: true,
      comparator: (a, b) => {
        return (
          a?.locus?.rows?.[0]?.posteriorProbability - b?.locus?.rows?.[0]?.posteriorProbability
        );
      },
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
      renderCell: ({ locus }) =>
        locus.rows.length > 0 ? locus?.rows[0]?.posteriorProbability.toPrecision(3) : naLabel,
      exportValue: ({ locus }) =>
        locus.rows.length > 0 ? locus?.rows[0]?.posteriorProbability : naLabel,
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
      sortable: true,
      renderCell: ({ confidence }) => {
        if (!confidence) return naLabel;
        return (
          <Tooltip title={confidence} style="">
            <ClinvarStars num={credsetConfidenceMap[confidence]} />
          </Tooltip>
        );
      },
      filterValue: ({ confidence }) => credsetConfidenceMap[confidence],
    },
    {
      id: "finemappingMethod",
      label: "Fine-mapping method",
    },
    {
      id: "credibleSetSize",
      label: "Credible set size",
      numeric: true,
      comparator: (a, b) => a.locusSize?.count - b.locusSize?.count,
      sortable: true,
      filterValue: false,
      renderCell: ({ locusSize }) => {
        return typeof locusSize?.count === "number" ? locusSize.count.toLocaleString() : naLabel;
      },
      exportValue: ({ locusSize }) => locusSize?.count,
    },
  ];
}

type BodyProps = {
  id: string;
  entity: string;
};

function Body({ id, entity }: BodyProps): ReactNode {
  const variables = { variantId: id };
  const [request, setRequest] = useState<any>({ loading: true, data: null, error: null });

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
          <OtTableOffsetPagination
            dataDownloader
            dataDownloaderFileStem={`${id}-qtl-credible-sets-variant`}
            entity="variant"
            sectionName="qtlCredibleSets"
            setInitialRequestData={setRequest}
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
