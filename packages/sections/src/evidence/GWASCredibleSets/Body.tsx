import { useQuery } from "@apollo/client";
import {
  SectionItem,
  Link,
  PublicationsDrawer,
  OtTable,
  ScientificNotation,
  ClinvarStars,
  Tooltip,
  Navigate,
  DisplayVariantId,
  L2GScoreIndicator,
} from "ui";
import { variantComparator, mantissaExponentComparator } from "@ot/utils";

import { dataTypesMap, naLabel, sectionsBaseSizeQuery, credsetConfidenceMap, EvidenceBodyProps} from "@ot/constants";
import { definition } from ".";
import Description from "./Description";
import GWAS_CREDIBLE_SETS_QUERY from "./sectionQuery.gql";

function getColumns(targetSymbol, targetId) {
  return [
    {
      id: "credibleSet",
      label: "Credible set",
      sticky: true,
      renderCell: ({ credibleSet }) => {
        return <Navigate to={`/credible-set/${credibleSet?.studyLocusId}`} />;
      },
      exportValue: ({ credibleSet }) => credibleSet?.studyLocusId,
    },
    {
      id: "variantId",
      label: "Lead Variant",
      sortable: true,
      comparator: variantComparator(d => d?.credibleSet?.variant),
      renderCell: ({ credibleSet }) => {
        const v = credibleSet?.variant;
        if (!v) return naLabel;
        return (
          <Link asyncTooltip to={`/variant/${v.id}`}>
            <DisplayVariantId
              variantId={v.id}
              referenceAllele={v.referenceAllele}
              alternateAllele={v.alternateAllele}
              expand={false}
            />
          </Link>
        );
      },
      filterValue: ({ credibleSet: { variant: v } }) =>
        `${v?.chromosome}_${v?.position}_${v?.referenceAllele}_${v?.alternateAllele}`,
      exportValue: ({ credibleSet: { variant: v } }) =>
        `${v?.chromosome}_${v?.position}_${v?.referenceAllele}_${v?.alternateAllele}`,
    },
    {
      id: "trait",
      label: "Reported trait",
      renderCell: ({ credibleSet }) => credibleSet?.study.traitFromSource,
      exportValue: ({ credibleSet }) => credibleSet?.study.traitFromSource,
    },
    {
      id: "disease",
      label: "Disease/phenotype",
      renderCell: ({ disease }) => (
        <Link asyncTooltip to={`/disease/${disease.id}`}>
          {disease.name}
        </Link>
      ),
      filterValue: ({ disease }) => disease.name,
      exportValue: ({ disease }) => `${disease.name} (${disease.id})`,
    },
    {
      id: "study",
      label: "Study",
      renderCell: ({ credibleSet }) => {
        return (
          <Link asyncTooltip to={`/study/${credibleSet?.study.id}`}>
            {credibleSet?.study.id}
          </Link>
        );
      },
      exportValue: ({ credibleSet }) => credibleSet?.study.id,
    },
    {
      id: "nSamples",
      label: "Sample size",
      numeric: true,
      sortable: true,
      renderCell: ({ credibleSet }) =>
        credibleSet?.study.nSamples
          ? parseInt(credibleSet?.study.nSamples, 10).toLocaleString()
          : naLabel,
      filterValue: ({ credibleSet }) => parseInt(credibleSet?.study.nSamples, 10).toLocaleString(),
      exportValue: ({ credibleSet }) => credibleSet?.study.nSamples,
    },
    {
      id: "pValue",
      label: "P-value",
      comparator: (a, b) => {
        return mantissaExponentComparator(
          a?.credibleSet?.pValueMantissa,
          a?.credibleSet?.pValueExponent,
          b?.credibleSet?.pValueMantissa,
          b?.credibleSet?.pValueExponent
        );
      },
      sortable: true,
      filterValue: false,
      renderCell: ({ credibleSet }) => {
        const { pValueMantissa, pValueExponent } = credibleSet ?? {};
        if (typeof pValueMantissa !== "number" || typeof pValueExponent !== "number")
          return naLabel;
        return <ScientificNotation number={[pValueMantissa, pValueExponent]} />;
      },
      exportValue: ({ credibleSet }) => {
        const { pValueMantissa, pValueExponent } = credibleSet ?? {};
        if (typeof pValueMantissa !== "number" || typeof pValueExponent !== "number") return null;
        return `${pValueMantissa}x10${pValueExponent}`;
      },
    },
    {
      id: "credibleSet.beta",
      label: "Beta (CI 95%)",
      numeric: true,
      sortable: true,
      renderCell: ({ credibleSet }) => {
        return credibleSet?.beta ? credibleSet.beta.toFixed(3) : naLabel;
      },
    },
    {
      id: "confidence",
      label: "Fine-mapping confidence",
      sortable: true,
      tooltip:
        "Fine-mapping confidence based on the quality of the linkage-disequilibrium information available and fine-mapping method",
      renderCell: ({ credibleSet }) => {
        if (!credibleSet?.confidence) return naLabel;
        return (
          <Tooltip title={credibleSet?.confidence} style="">
            <ClinvarStars num={credsetConfidenceMap[credibleSet?.confidence]} />
          </Tooltip>
        );
      },
      filterValue: ({ credibleSet }) => credsetConfidenceMap[credibleSet?.confidence],
      exportValue: ({ credibleSet }) => credibleSet?.confidence,
    },
    {
      id: "finemappingMethod",
      label: "Fine-mapping method",
      renderCell: ({ credibleSet }) => credibleSet?.finemappingMethod || naLabel,
      exportValue: ({ credibleSet }) => credibleSet?.finemappingMethod,
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
      sortable: true,
      renderCell: ({ score, credibleSet }) => {
        if (!score) return naLabel;
        return (
          <L2GScoreIndicator
            score={score}
            targetId={targetId}
            studyLocusId={credibleSet?.studyLocusId}
          />
        );
      },
    },
    {
      id: "publication",
      label: "Publication",
      renderCell: ({ credibleSet, disease }) => {
        const { publicationFirstAuthor, publicationDate, pubmedId } = credibleSet?.study ?? {};
        if (!publicationFirstAuthor) return naLabel;
        return (
          <PublicationsDrawer
            name={disease.name}
            symbol={targetSymbol}
            entries={[{ name: pubmedId }]}
            customLabel={`${publicationFirstAuthor} et al. (${new Date(
              publicationDate
            ).getFullYear()})`}
          />
        );
      },
      filterValue: ({ literature, publicationYear, publicationFirstAuthor }) =>
        `${literature} ${publicationYear} ${publicationFirstAuthor}`,
      exportValue: ({ credibleSet }) => credibleSet?.study.pubmedId,
    },
  ];
}

type Props = EvidenceBodyProps;

function Body({ id, label, entity }: Props) {
  const { ensgId, efoId } = id;
  const variables = { ensemblId: ensgId, efoId, size: sectionsBaseSizeQuery };

  const columns = getColumns(label.symbol, ensgId);

  const request = useQuery(GWAS_CREDIBLE_SETS_QUERY, {
    variables,
  });

  return (
    <SectionItem
      definition={definition}
      chipText={dataTypesMap.genetic_association}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} name={label.name} />}
      renderBody={() => (
        <OtTable
          columns={columns}
          dataDownloader
          dataDownloaderFileStem={`GWASassociations-${ensgId}-${efoId}`}
          order="desc"
          rows={request.data?.disease.gwasCredibleSets.rows}
          showGlobalFilter
          sortBy="score"
          query={GWAS_CREDIBLE_SETS_QUERY.loc.source.body}
          variables={variables}
          loading={request.loading}
        />
      )}
    />
  );
}

export default Body;
