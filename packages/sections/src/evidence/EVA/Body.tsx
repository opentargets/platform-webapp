import { useQuery } from "@apollo/client";
import {
  Link,
  SectionItem,
  Tooltip,
  LabelChip,
  PublicationsDrawer,
  ClinvarStars,
  DirectionOfEffectIcon,
  DirectionOfEffectTooltip,
  DisplayVariantId,
  OtTableServer,
  type OtTableColumn,
  Typography,
} from "ui";
import { epmcUrl, sentenceCase, identifiersOrgLink } from "@ot/utils";
import {
  dataTypesMap,
  clinvarStarMap,
  naLabel,
  variantConsequenceSource,
  type EvidenceBodyProps,
  type EvidenceEva,
  type EvidenceEvaSort,
  EvidenceEvaSortField,
  SortDirection,
} from "@ot/constants";
import { definition } from ".";
import Description from "./Description";
import { typedDocument } from "../../utils/typedDocument";
import CLINVAR_QUERY_DOCUMENT from "./ClinvarQuery.gql";

type ClinvarRow = Pick<
  EvidenceEva,
  | "score"
  | "diseaseId"
  | "diseaseName"
  | "diseaseFromSource"
  | "cohortPhenotypes"
  | "variantId"
  | "variantHgvsId"
  | "variantChromosome"
  | "variantPosition"
  | "variantReferenceAllele"
  | "variantAlternateAllele"
  | "variantRsId"
  | "variantFunctionalConsequenceId"
  | "variantFunctionalConsequenceLabel"
  | "directionOnTarget"
  | "directionOnTrait"
  | "studyId"
  | "clinicalSignificances"
  | "allelicRequirements"
  | "alleleOrigins"
  | "confidence"
  | "literature"
>;

type QueryData = {
  disease?: {
    id: string;
    evidenceViews: { eva: { count: number; rows: ClinvarRow[] } };
  } | null;
};

type QueryVariables = {
  ensemblId: string;
  efoId: string;
  index: number;
  size: number;
  sort: EvidenceEvaSort[];
};

const CLINVAR_QUERY = typedDocument<QueryData, QueryVariables>(CLINVAR_QUERY_DOCUMENT);
const PAGE_SIZE = 10;
// the view's only sort key is the evidence score
const DEFAULT_SORT = {
  id: "score",
  field: EvidenceEvaSortField.Score,
  desc: true,
};

// the view returns "SO_0001583", ProtVar and identifiers.org expect "SO:0001583"
const soId = (id: string) => id.replace("_", ":");
const PROTVAR_CONSEQUENCES = ["SO:0001583", "SO:0001587"];

const exportColumns: OtTableColumn<ClinvarRow>[] = [
  {
    id: "diseaseId",
    label: "diseaseId",
    exportValue: (row: ClinvarRow) => row.diseaseId,
  },
  {
    id: "diseaseName",
    label: "diseaseName",
    exportValue: (row: ClinvarRow) => row.diseaseName,
  },
  {
    id: "variantId",
    label: "variantId",
    exportValue: (row: ClinvarRow) => row.variantId,
  },
  {
    id: "variantRsId",
    label: "variantRsId",
    exportValue: (row: ClinvarRow) => row.variantRsId,
  },
  {
    id: "variantHgvsId",
    label: "variantHgvsId",
    exportValue: (row: ClinvarRow) => row.variantHgvsId,
  },
  {
    id: "variantConsequence",
    label: "variantConsequence",
    exportValue: (row: ClinvarRow) => row.variantFunctionalConsequenceLabel,
  },
  {
    id: "clinicalSignificances",
    label: "clinicalSignificances",
    exportValue: (row: ClinvarRow) => row.clinicalSignificances,
  },
  {
    id: "allelicRequirements",
    label: "allelicRequirements",
    exportValue: (row: ClinvarRow) => row.alleleOrigins,
  },
  {
    id: "reviewStatus",
    label: "reviewStatus",
    exportValue: (row: ClinvarRow) => row.confidence,
  },
];

function getColumns(label: EvidenceBodyProps["label"]): OtTableColumn<ClinvarRow>[] {
  return [
    {
      id: "diseaseName",
      label: "Disease/phenotype",
      renderCell: ({ diseaseId, diseaseName, diseaseFromSource, cohortPhenotypes }) => (
        <Tooltip
          title={
            <>
              <Typography variant="subtitle2" display="block" align="center">
                Reported disease or phenotype:
              </Typography>
              <Typography variant="caption" display="block" align="center" gutterBottom>
                {diseaseFromSource}
              </Typography>

              {cohortPhenotypes.length > 1 ? (
                <>
                  <Typography variant="subtitle2" display="block" align="center">
                    All reported phenotypes:
                  </Typography>
                  <Typography variant="caption" display="block">
                    {cohortPhenotypes.map(cp => (
                      <div key={cp}>{cp}</div>
                    ))}
                  </Typography>
                </>
              ) : (
                ""
              )}
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
      id: "variantId",
      label: "Variant",
      enableHiding: false,
      renderCell: ({ variantId, variantReferenceAllele, variantAlternateAllele }) => {
        if (!variantId) return naLabel;
        return (
          <Link asyncTooltip to={`/variant/${variantId}`}>
            <DisplayVariantId
              variantId={variantId}
              referenceAllele={variantReferenceAllele ?? ""}
              alternateAllele={variantAlternateAllele ?? ""}
              expand={false}
            />
          </Link>
        );
      },
    },
    {
      id: "variantRsId",
      label: "rsID",
      renderCell: ({ variantRsId }) =>
        variantRsId ? (
          <Link
            external
            to={`https://www.ensembl.org/Homo_sapiens/Variation/Explore?v=${variantRsId}`}
          >
            {variantRsId}
          </Link>
        ) : (
          naLabel
        ),
    },
    {
      id: "variantHgvsId",
      label: "HGVS ID",
      renderCell: ({ variantHgvsId }) => variantHgvsId || naLabel,
    },
    {
      id: "studyId",
      label: "ClinVar ID",
      renderCell: ({ studyId }) =>
        studyId ? (
          <Link external to={`https://www.ncbi.nlm.nih.gov/clinvar/${studyId}`}>
            {studyId}
          </Link>
        ) : (
          naLabel
        ),
    },
    {
      id: "variantConsequence",
      label: "Variant Consequence",
      renderCell: ({
        variantFunctionalConsequenceId,
        variantFunctionalConsequenceLabel,
        variantId,
        variantChromosome,
        variantPosition,
        variantReferenceAllele,
        variantAlternateAllele,
      }) => {
        if (!variantFunctionalConsequenceId) return naLabel;
        const consequenceId = soId(variantFunctionalConsequenceId);
        return (
          <div style={{ display: "flex", gap: "5px" }}>
            <LabelChip
              label={variantConsequenceSource.VEP.label}
              value={sentenceCase(variantFunctionalConsequenceLabel) ?? undefined}
              tooltip={variantConsequenceSource.VEP.tooltip}
              to={identifiersOrgLink("SO", consequenceId.slice(3))}
            />
            {variantId && PROTVAR_CONSEQUENCES.includes(consequenceId) && (
              <LabelChip
                label={variantConsequenceSource.ProtVar.label}
                to={`https://www.ebi.ac.uk/ProtVar/query?chromosome=${variantChromosome}&genomic_position=${variantPosition}&reference_allele=${variantReferenceAllele}&alternative_allele=${variantAlternateAllele}`}
                tooltip={variantConsequenceSource.ProtVar.tooltip}
              />
            )}
          </div>
        );
      },
      exportValue: ({ variantFunctionalConsequenceLabel }) =>
        sentenceCase(variantFunctionalConsequenceLabel ?? ""),
    },
    {
      id: "directionOfVariantEffect",
      label: (
        <DirectionOfEffectTooltip docsUrl="https://platform-docs.opentargets.org/evidence#clinvar"></DirectionOfEffectTooltip>
      ),
      exportLabel: "Direction of effect",
      exportValue: ({ directionOnTarget, directionOnTrait }) =>
        [directionOnTarget, directionOnTrait].filter(Boolean).join(", "),
      renderCell: ({ directionOnTarget, directionOnTrait }) => {
        return (
          <DirectionOfEffectIcon
            variantEffect={directionOnTarget ?? ""}
            directionOnTrait={directionOnTrait ?? ""}
          />
        );
      },
    },
    {
      id: "clinicalSignificances",
      label: "Clinical significance",
      renderCell: ({ clinicalSignificances }) => {
        if (clinicalSignificances.length === 0) return naLabel;
        if (clinicalSignificances.length === 1) return sentenceCase(clinicalSignificances[0]);
        return (
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
            }}
          >
            {clinicalSignificances.map(clinicalSignificance => (
              <li key={clinicalSignificance}>{sentenceCase(clinicalSignificance)}</li>
            ))}
          </ul>
        );
      },
      exportValue: ({ clinicalSignificances }) => clinicalSignificances.join(", "),
    },
    {
      id: "allelicRequirements",
      label: "Allele origin",
      renderCell: ({ alleleOrigins, allelicRequirements }) => {
        if (alleleOrigins.length === 0) return naLabel;

        if (allelicRequirements.length > 0)
          return (
            <Tooltip
              title={
                <>
                  <Typography variant="subtitle2" display="block" align="center">
                    Allelic requirements:
                  </Typography>
                  {allelicRequirements.map(r => (
                    <Typography variant="caption" key={r}>
                      {r}
                    </Typography>
                  ))}
                </>
              }
              showHelpIcon
            >
              {alleleOrigins.map(a => sentenceCase(a)).join("; ")}
            </Tooltip>
          );

        return alleleOrigins.map(a => sentenceCase(a)).join("; ");
      },
      exportValue: ({ alleleOrigins }) => alleleOrigins.join(", "),
    },
    {
      id: "confidence",
      label: "Review status",
      renderCell: ({ confidence }) =>
        confidence ? (
          <Tooltip title={confidence}>
            <span>
              <ClinvarStars num={clinvarStarMap[confidence]} />
            </span>
          </Tooltip>
        ) : (
          naLabel
        ),
    },
    {
      id: "score",
      label: "Score",
      tooltip: "Evidence score, from 0 to 1",
      numeric: true,
      sortField: DEFAULT_SORT.field,
      renderCell: ({ score }) => score.toFixed(2),
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
    },
  ];
}

function Body({ id, label, entity }: EvidenceBodyProps) {
  const { ensgId: ensemblId, efoId } = id;
  const variables = { ensemblId, efoId };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(CLINVAR_QUERY, {
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
      renderDescription={() => <Description symbol={label.symbol} name={label.name} />}
      renderBody={() => (
        <OtTableServer<ClinvarRow>
          query={CLINVAR_QUERY}
          columns={columns}
          dataDownloader
          dataDownloaderColumns={exportColumns}
          dataDownloaderFileStem="eva-evidence"
          dataPath="disease.evidenceViews.eva"
          pageSize={PAGE_SIZE}
          sortBy={DEFAULT_SORT.id}
          order={DEFAULT_SORT.desc ? "desc" : "asc"}
          // no search on the ClinVar view: a browser search would fetch every row
          showGlobalFilter={false}
          variables={variables}
        />
      )}
    />
  );
}

export default Body;
