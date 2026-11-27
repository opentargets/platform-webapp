import { useQuery } from "@apollo/client";
import {
  SectionItem,
  ChipList,
  Tooltip,
  Link,
  PublicationsDrawer,
  ClinvarStars,
  DirectionOfEffectIcon,
  DirectionOfEffectTooltip,
  DisplayVariantId,
  OtTableServer,
  type OtTableColumn,
  Box,
  Typography,
} from "ui";
import { epmcUrl, sentenceCase } from "@ot/utils";

import {
  dataTypesMap,
  clinvarStarMap,
  naLabel,
  type EvidenceBodyProps,
  type EvidenceEvaSomatic,
} from "@ot/constants";
import Description from "./Description";
import { typedDocument } from "../../utils/typedDocument";
import EVA_SOMATIC_QUERY_DOCUMENT from "./EvaSomaticQuery.gql";
import { definition } from ".";

type EvaSomaticRow = Pick<
  EvidenceEvaSomatic,
  | "diseaseId"
  | "diseaseName"
  | "diseaseFromSource"
  | "cohortPhenotypes"
  | "variantId"
  | "variantHgvsId"
  | "variantReferenceAllele"
  | "variantAlternateAllele"
  | "variantRsId"
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
    evidenceViews: { evaSomatic: { count: number; rows: EvaSomaticRow[] } };
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
};

const EVA_SOMATIC_QUERY = typedDocument<QueryData, QueryVariables>(EVA_SOMATIC_QUERY_DOCUMENT);
const PAGE_SIZE = 10;

const getColumns = (label: EvidenceBodyProps["label"]): OtTableColumn<EvaSomaticRow>[] => [
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
        <Link external to={`https://identifiers.org/clinvar.record/${studyId}`}>
          {studyId}
        </Link>
      ) : (
        naLabel
      ),
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
    id: "directionOfVariantEffect",
    label: (
      <DirectionOfEffectTooltip docsUrl="https://platform-docs.opentargets.org/evidence#clinvar-somatic"></DirectionOfEffectTooltip>
    ),
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

const exportColumns: OtTableColumn<EvaSomaticRow>[] = [
  {
    id: "diseaseId",
    label: "diseaseId",
    exportValue: (row: EvaSomaticRow) => row.diseaseId,
  },
  {
    id: "diseaseName",
    label: "diseaseName",
    exportValue: (row: EvaSomaticRow) => row.diseaseName,
  },
  {
    id: "variantId",
    label: "variantId",
    exportValue: (row: EvaSomaticRow) => row.variantId,
  },
  {
    id: "variantRsId",
    label: "variantRsId",
    exportValue: (row: EvaSomaticRow) => row.variantRsId,
  },
  {
    id: "variantHgvsId",
    label: "variantHgvsId",
    exportValue: (row: EvaSomaticRow) => row.variantHgvsId,
  },
  {
    id: "clinicalSignificances",
    label: "clinicalSignificances",
    exportValue: (row: EvaSomaticRow) => row.clinicalSignificances,
  },
  {
    id: "allelicRequirements",
    label: "allelicRequirements",
    exportValue: (row: EvaSomaticRow) => row.allelicRequirements,
  },
  {
    id: "reviewStatus",
    label: "reviewStatus",
    exportValue: (row: EvaSomaticRow) => row.confidence,
  },
  {
    id: "literature",
    label: "literature",
    exportValue: (row: EvaSomaticRow) => row.literature,
  },
];

function Body({ id, label, entity }: EvidenceBodyProps) {
  const { ensgId: ensemblId, efoId } = id;
  const variables = { ensemblId, efoId };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(EVA_SOMATIC_QUERY, {
    variables: { ...variables, index: 0, size: PAGE_SIZE },
  });

  const columns = getColumns(label);

  function getRoleInCancer() {
    if (!request.data) return null;

    const attributes = request.data.target?.hallmarks.attributes ?? [];
    let roleInCancerItems: { label: string; url?: string }[] = [{ label: "Unknown" }];
    if (attributes.length > 0) {
      roleInCancerItems = attributes
        .filter(attribute => attribute.name === "role in cancer")
        .map(attribute => ({
          label: attribute.description,
          url: epmcUrl(String(attribute.pmid)),
        }));
    }

    return (
      <>
        <Typography sx={{ marginRight: ".5rem !important" }}>
          <b>{label.symbol}</b> role in cancer:
        </Typography>
        <ChipList items={roleInCancerItems} />
      </>
    );
  }

  return (
    <SectionItem
      definition={definition}
      chipText={dataTypesMap.somatic_mutation}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} name={label.name} />}
      renderBody={() => (
        <>
          <Box
              data-testid="role-in-cancer"
              sx={{ display: "flex", alignItems: "center", marginBottom: "2rem" }}
            >
            {getRoleInCancer()}
          </Box>

          <OtTableServer<EvaSomaticRow>
            query={EVA_SOMATIC_QUERY}
            columns={columns}
            dataDownloader
            dataDownloaderColumns={exportColumns}
            dataDownloaderFileStem="eva_somatic-evidence"
            dataPath="disease.evidenceViews.evaSomatic"
            pageSize={PAGE_SIZE}
            // no search on the ClinVar somatic view: a browser search would fetch every row
            showGlobalFilter={false}
            variables={variables}
          />
        </>
      )}
    />
  );
}

export default Body;
