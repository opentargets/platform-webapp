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
  Typography,
} from "ui";
import { epmcUrl, sentenceCase, identifiersOrgLink } from "@ot/utils";
import { dataTypesMap, clinvarStarMap, naLabel, variantConsequenceSource, type EvidenceBodyProps} from "@ot/constants";
import { definition } from ".";
import Description from "./Description";
import CLINVAR_QUERY from "./ClinvarQuery.gql";

const exportColumns = [
  {
    label: "diseaseId",
    exportValue: row => row.disease.id,
  },
  {
    label: "diseaseName",
    exportValue: row => row.disease.name,
  },
  {
    label: "variantId",
    exportValue: row => row.variant?.id,
  },
  {
    label: "variantRsId",
    exportValue: row => row.variantRsId,
  },
  {
    label: "variantHgvsId",
    exportValue: row => row.variantHgvsId,
  },
  {
    label: "variantConsequence",
    exportValue: row => row.variantFunctionalConsequence,
  },
  {
    label: "clinicalSignificances",
    exportValue: row => row.clinicalSignificances,
  },
  {
    label: "allelicRequirements",
    exportValue: row => row.alleleOrigins,
  },
  {
    label: "reviewStatus",
    exportValue: row => row.confidence,
  },
];

function getColumns(label) {
  return [
    {
      id: "disease.name",
      label: "Disease/phenotype",
      renderCell: ({ disease, diseaseFromSource, cohortPhenotypes }) => (
        <Tooltip
          title={
            <>
              <Typography variant="subtitle2" display="block" align="center">
                Reported disease or phenotype:
              </Typography>
              <Typography variant="caption" display="block" align="center" gutterBottom>
                {diseaseFromSource}
              </Typography>

              {cohortPhenotypes?.length > 1 ? (
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
          <Link asyncTooltip to={`/disease/${disease.id}`}>
            {disease.name}
          </Link>
        </Tooltip>
      ),
    },
    {
      id: "variantId",
      label: "Variant",
      enableHiding: false,
      renderCell: ({ variant }) => {
        if (!variant) return naLabel;
        const { id: variantId, referenceAllele, alternateAllele } = variant;
        return (
          <Link asyncTooltip to={`/variant/${variantId}`}>
            <DisplayVariantId
              variantId={variantId}
              referenceAllele={referenceAllele}
              alternateAllele={alternateAllele}
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
      renderCell: ({ variant }) => variant?.hgvsId || naLabel,
      filterValue: ({ variant }) => `${variant?.hgvsId}`,
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
      renderCell: ({ variantFunctionalConsequence, variant }) => {
        if (!variantFunctionalConsequence) return naLabel;
        const {
          chromosome,
          position,
          referenceAllele,
          alternateAllele
        } = variant ?? {};
        return (
          <div style={{ display: "flex", gap: "5px" }}>
            {variantFunctionalConsequence && (
              <LabelChip
                label={variantConsequenceSource.VEP.label}
                value={sentenceCase(variantFunctionalConsequence.label)}
                tooltip={variantConsequenceSource.VEP.tooltip}
                to={identifiersOrgLink("SO", variantFunctionalConsequence.id.slice(3))}
              />
            )}
            {variant &&
              (variantFunctionalConsequence.id === "SO:0001583" ||
                variantFunctionalConsequence.id === "SO:0001587") && (
              <LabelChip
                label={variantConsequenceSource.ProtVar.label}
                to={`https://www.ebi.ac.uk/ProtVar/query?chromosome=${chromosome}&genomic_position=${position}&reference_allele=${referenceAllele}&alternative_allele=${alternateAllele}`}
                tooltip={variantConsequenceSource.ProtVar.tooltip}
              />
            )}
          </div>
        );
      },
      filterValue: ({ variantFunctionalConsequence }) => (
        sentenceCase(variantFunctionalConsequence?.label ?? "")
      ),
    },
    {
      id: "directionOfVariantEffect",
      label: (
        <DirectionOfEffectTooltip docsUrl="https://platform-docs.opentargets.org/evidence#clinvar"></DirectionOfEffectTooltip>
      ),
      renderCell: ({ directionOnTarget, directionOnTrait }) => {
        return (
          <DirectionOfEffectIcon
            variantEffect={directionOnTarget}
            directionOnTrait={directionOnTrait}
          />
        );
      },
    },
    {
      id: "clinicalSignificances",
      filterValue: ({ clinicalSignificances }) => clinicalSignificances.join(),
      label: "Clinical significance",
      renderCell: ({ clinicalSignificances }) => {
        if (!clinicalSignificances) return naLabel;
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
    },
    {
      id: "allelicRequirements",
      label: "Allele origin",
      renderCell: ({ alleleOrigins, allelicRequirements }) => {
        if (!alleleOrigins || alleleOrigins.length === 0) return naLabel;

        if (allelicRequirements)
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
      filterValue: ({ alleleOrigins }) => (alleleOrigins ? alleleOrigins.join() : ""),
    },
    {
      id: "confidence",
      label: "Review status",
      renderCell: ({ confidence }) => (
        <Tooltip title={confidence}>
          <span>
            <ClinvarStars num={clinvarStarMap[confidence]} />
          </span>
        </Tooltip>
      ),
    },
    {
      label: "Literature",
      renderCell: ({ literature }) => {
        const literatureList =
          literature?.reduce((acc, id) => {
            if (id !== "NA") {
              acc.push({
                name: id,
                url: epmcUrl(id),
                group: "literature",
              });
            }
            return acc;
          }, []) || [];

        return (
          <PublicationsDrawer entries={literatureList} symbol={label.symbol} name={label.name} />
        );
      },
    },
  ];
}

type Props = EvidenceBodyProps;

const PAGE_SIZE = 10;

function Body({ id, label, entity }: Props) {
  const { ensgId: ensemblId, efoId } = id;
  const variables = { ensemblId, efoId };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(CLINVAR_QUERY, {
    variables: { ...variables, index: 0, size: PAGE_SIZE },
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
        <OtTableServer
          query={CLINVAR_QUERY}
          columns={columns}
          dataDownloader
          dataDownloaderColumns={exportColumns}
          dataDownloaderFileStem="eva-evidence"
          dataPath="disease.eva"
          pageSize={PAGE_SIZE}
          showGlobalFilter={false}
          variables={variables}
        />
      )}
    />
  );
}

export default Body;
