import { useQuery } from "@apollo/client";
import {
  Link,
  SectionItem,
  Tooltip,
  PublicationsDrawer,
  LabelChip,
  OtTableServer,
  DisplayVariantId,
  Typography,
} from "ui";
import { definition } from ".";
import Description from "./Description";
import { epmcUrl, identifiersOrgLink, nullishComparator, variantComparator } from "@ot/utils";
import {
  dataTypesMap,
  defaultRowsPerPageOptions,
  variantConsequenceSource,
  naLabel, EvidenceBodyProps} from "@ot/constants";
import UNIPROT_VARIANTS_QUERY from "./UniprotVariantsQuery.gql";

function getColumns(label) {
  return [
    {
      id: "disease.name",
      label: "Disease/phenotype",
      enableHiding: false,
      renderCell: ({ disease, diseaseFromSource }) => (
        <Tooltip
          title={
            <>
              <Typography variant="subtitle2" display="block" align="center">
                Reported disease or phenotype:
              </Typography>
              <Typography variant="caption" display="block" align="center">
                {diseaseFromSource}
              </Typography>
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
      id: "targetFromSourceId",
      label: "Reported protein",
      renderCell: ({ targetFromSourceId }) => (
        <Link external to={identifiersOrgLink("uniprot", targetFromSourceId)}>
          {targetFromSourceId}
        </Link>
      ),
    },
    {
      id: "variant.id",
      label: "Variant",
      enableHiding: false,
      comparator: nullishComparator(variantComparator(), d => d?.variant),
      filterValue: ({ variant: v }) =>
        `${v?.chromosome}_${v?.position}_${v?.referenceAllele}_${v?.alternateAllele}`,
      renderCell: ({ variant: v }) => {
        if (!v) return naLabel;
        return (
          <Link to={`/variant/${v.id}`}>
            <DisplayVariantId
              variantId={v.id}
              referenceAllele={v.referenceAllele}
              alternateAllele={v.alternateAllele}
              expand={false}
            />
          </Link>
        );
      },
    },
    {
      id: "variantRsId",
      label: "rsID",
      renderCell: ({ variantRsId }) => (
        <Link
          external
          to={`https://www.ensembl.org/Homo_sapiens/Variation/Explore?v=${variantRsId}`}
        >
          {variantRsId}
        </Link>
      ),
    },
    {
      id: "aminoAcidConsequence",
      label: "Amino acid",
      renderCell: ({ variant }) => {
        if (!variant) return naLabel;
        const aaConsequences = variant.transcriptConsequences
          ?.filter(d => d.aminoAcidChange != null)
          .map(d => d.aminoAcidChange);
        if (aaConsequences?.length) {
          return aaConsequences.join(", ");
        }
        return naLabel;
      },
      exportValue: ({ variant }) => {
        if (!variant) return null;
        return variant.transcriptConsequences
          ?.filter(d => d.aminoAcidChange != null)
          .map(d => d.aminoAcidChange)
          .join(", ");
      }
    },
    {
      id: "variantConsequence",
      label: "Variant Consequence",
      renderCell: ({ variantRsId }) => {
        if (!variantRsId) return null;
        return (
          <div style={{ display: "flex", gap: "5px" }}>
            <LabelChip
              label={variantConsequenceSource.ProtVar.label}
              to={`https://www.ebi.ac.uk/ProtVar/query?search=${variantRsId}`}
              tooltip={variantConsequenceSource.ProtVar.tooltip}
            />
          </div>
        );
      },
      exportValue: ({ variantRsId }) => {
        if (!variantRsId) return null;
        return `https://www.ebi.ac.uk/ProtVar/query?search=${variantRsId}`;
      },
    },
    {
      id: "confidence",
      label: "Confidence",
    },
    {
      id: "literature",
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

export function Body({ id, label, entity }: Props) {
  const { ensgId, efoId } = id;

  const variables = { ensemblId: ensgId, efoId };
  const columns = getColumns(label);

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(UNIPROT_VARIANTS_QUERY, {
    variables: { ...variables, index: 0, size: PAGE_SIZE },
  });

  return (
    <SectionItem
      definition={definition}
      chipText={dataTypesMap.genetic_association}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} diseaseName={label.name} />}
      renderBody={() => {
        return (
          <OtTableServer
            query={UNIPROT_VARIANTS_QUERY}
            columns={columns}
            dataDownloader
            dataDownloaderFileStem={`UniProt-variants-${ensgId}-${efoId}`}
            dataPath="disease.uniprotVariantsSummary"
            pageSize={PAGE_SIZE}
            pageSizeOptions={defaultRowsPerPageOptions}
            showGlobalFilter={false}
            variables={variables}
          />
        );
      }}
    />
  );
}

export default Body;
