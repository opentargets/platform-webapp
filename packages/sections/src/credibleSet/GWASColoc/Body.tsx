import {
  Link,
  SectionItem,
  // DisplayVariantId,
  ScientificNotation,
  OtTableServer,
  type OtTableColumn,
  Tooltip,
  Navigate,
} from "ui";
import {
  type CredibleSetColocalisation,
  type CredibleSetColocalisationsSearch,
  CredibleSetColocalisationsSearchField,
  type CredibleSetColocalisationsSort,
  CredibleSetColocalisationsSortField,
  naLabel,
  SortDirection,
} from "@ot/constants";
import { definition } from ".";
import Description from "./Description";
import GWAS_COLOC_QUERY_DOCUMENT from "./GWASColocQuery.gql";
import { typedDocument } from "../../utils/typedDocument";
import { getStudyCategory } from "@ot/utils";
import type { ReactElement } from "react";
import { useQuery } from "@apollo/client";

type ColocalisationRow = Pick<
  CredibleSetColocalisation,
  | "otherCredibleSetId"
  | "studyId"
  | "projectId"
  | "traitFromSource"
  | "publicationFirstAuthor"
  | "leadVariantId"
  | "pValueMantissa"
  | "pValueExponent"
  | "numberColocalisingVariants"
  | "colocalisationMethod"
  | "h3"
  | "h4"
  | "clpp"
  | "betaRatioSignAverage"
>;

type QueryData = {
  credibleSet?: {
    credibleSetId: string;
    colocalisationView: { count: number; rows: ColocalisationRow[] };
  } | null;
};

type QueryVariables = {
  credibleSetId: string;
  index: number;
  size: number;
  sort: CredibleSetColocalisationsSort[];
  search?: CredibleSetColocalisationsSearch;
};

const GWAS_COLOC_QUERY = typedDocument<QueryData, QueryVariables>(GWAS_COLOC_QUERY_DOCUMENT);
const PAGE_SIZE = 10;
const DEFAULT_SORT = {
  id: "h4",
  field: CredibleSetColocalisationsSortField.H4,
  desc: true,
};

const columns: OtTableColumn<ColocalisationRow>[] = [
  {
    id: "otherCredibleSetId",
    label: "Credible set",
    enableHiding: false,
    sticky: true,
    // Attach the GWAS search fields to the first column; gene/tissue fields are for molQTL.
    searchFields: [
      CredibleSetColocalisationsSearchField.StudyId,
      CredibleSetColocalisationsSearchField.TraitFromSource,
      CredibleSetColocalisationsSearchField.PublicationFirstAuthor,
      CredibleSetColocalisationsSearchField.LeadVariantId,
    ],
    renderCell: ({ otherCredibleSetId }) => {
      if (!otherCredibleSetId) return naLabel;
      return <Navigate to={`/credible-set/${otherCredibleSetId}`} />;
    },
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
  },
  {
    id: "traitFromSource",
    label: "Reported trait",
    renderCell: ({ traitFromSource }) => traitFromSource || naLabel,
  },
  {
    id: "publicationFirstAuthor",
    label: "First author",
    renderCell: ({ projectId, publicationFirstAuthor }) =>
      getStudyCategory(projectId) === "FINNGEN"
        ? "FinnGen"
        : publicationFirstAuthor || naLabel,
    exportValue: ({ publicationFirstAuthor }) => publicationFirstAuthor,
  },
  {
    id: "leadVariantId",
    label: "Lead Variant",
    sortField: CredibleSetColocalisationsSortField.LeadVariant,
    renderCell: ({ leadVariantId }) => {
      if (!leadVariantId) return naLabel;
      return (
        <Link asyncTooltip to={`/variant/${leadVariantId}`}>
          {/* Restore DisplayVariantId when colocalisationView exposes the lead alleles.
          <DisplayVariantId
            variantId={leadVariantId}
            referenceAllele={leadReferenceAllele}
            alternateAllele={leadAlternateAllele}
            expand={false}
          />
          */}
          {leadVariantId}
        </Link>
      );
    },
    exportValue: ({ leadVariantId }) => leadVariantId,
  },
  {
    id: "pValue",
    label: "P-Value",
    numeric: true,
    sortField: CredibleSetColocalisationsSortField.PValue,
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
    id: "numberColocalisingVariants",
    label: "Colocalising Variants (n)",
    numeric: true,
    renderCell: ({ numberColocalisingVariants }) => {
      return typeof numberColocalisingVariants === "number"
        ? numberColocalisingVariants.toLocaleString()
        : naLabel;
    },
    sortField: CredibleSetColocalisationsSortField.NumberColocalisingVariants,
  },
  {
    id: "betaRatioSignAverage",
    label: "Directionality",
    tooltip: "Effect directionality based on the ratio of betas between the two credible sets",
    renderCell: ({ betaRatioSignAverage }) => {
      if (betaRatioSignAverage == null) return naLabel;
      let category = "Inconclusive";
      if (betaRatioSignAverage <= -0.99) category = "Opposite";
      else if (betaRatioSignAverage >= 0.99) category = "Same";
      const displayValue =
        Math.abs(betaRatioSignAverage) === 1
          ? betaRatioSignAverage
          : betaRatioSignAverage.toFixed(2);
      return <Tooltip title={`Beta ratio sign average: ${displayValue}`}>{category}</Tooltip>;
    },
    sortable: false,
    exportValue: ({ betaRatioSignAverage }) => {
      if (betaRatioSignAverage == null) return null;
      if (betaRatioSignAverage <= -0.99) return "Opposite";
      else if (betaRatioSignAverage >= 0.99) return "Same";
      return "Inconclusive";
    },
  },
  {
    id: "h3",
    label: "H3",
    numeric: true,
    tooltip: (
      <>
        Posterior probability that the signals <b>do not</b> colocalise
      </>
    ),
    sortField: CredibleSetColocalisationsSortField.H3,
    renderCell: ({ h3 }) => {
      if (typeof h3 !== "number") return naLabel;
      return h3.toFixed(3);
    },
  },
  {
    id: "h4",
    label: "H4",
    numeric: true,
    tooltip: "Posterior probability that the signals colocalise",
    sortField: DEFAULT_SORT.field,
    renderCell: ({ h4 }) => {
      if (typeof h4 !== "number") return naLabel;
      return h4.toFixed(3);
    },
  },
  {
    id: "clpp",
    label: "CLPP",
    tooltip:
      "The sum of the products of the fine-mapping posterior probabilities for overlapping variants between two study loci",
    numeric: true,
    sortField: CredibleSetColocalisationsSortField.Clpp,
    renderCell: ({ clpp }) => {
      if (typeof clpp !== "number") return naLabel;
      return clpp.toFixed(3);
    },
  },
];

type BodyProps = {
  id: string;
  entity: string;
};

function Body({ id, entity }: BodyProps): ReactElement {
  const variables = { credibleSetId: id };
  const request = useQuery(GWAS_COLOC_QUERY, {
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
      renderDescription={() => <Description />}
      renderBody={() => {
        return (
          <OtTableServer<ColocalisationRow>
            dataDownloader
            dataDownloaderFileStem={`${id}-credibleSets`}
            dataPath="credibleSet.colocalisationView"
            pageSize={PAGE_SIZE}
            sortBy={DEFAULT_SORT.id}
            order={DEFAULT_SORT.desc ? "desc" : "asc"}
            columns={columns}
            query={GWAS_COLOC_QUERY}
            variables={variables}
          />
        );
      }}
    />
  );
}

export default Body;
