import { useQuery } from "@apollo/client";
import { Typography } from "@mui/material";
import {
  Link,
  SectionItem,
  Tooltip,
  PublicationsDrawer,
  LabelChip,
  OtTable,
  DisplayVariantId,
} from "ui";
import { definition } from ".";
import Description from "./Description";
import { epmcUrl, identifiersOrgLink, nullishComparator, variantComparator } from "@ot/utils";
import {
  dataTypesMap,
  defaultRowsPerPageOptions,
  variantConsequenceSource,
  sectionsBaseSizeQuery,
  naLabel,, EvidenceBodyProps} from "@ot/constants";
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
      sortable: true,
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
          to={`http://www.ensembl.org/Homo_sapiens/Variation/Explore?v=${variantRsId}`}
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
export function Body({ id, label, entity }) {
  const { ensgId, efoId } = id;

  const variables = {
    ensemblId: ensgId,
    efoId,
    size: sectionsBaseSizeQuery,
  };
  const columns = getColumns(label);

  const request = useQuery(UNIPROT_VARIANTS_QUERY, {
    variables,
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
          <OtTable
            columns={columns}
            rows={request.data?.disease.uniprotVariantsSummary.rows}
            dataDownloader
            dataDownloaderFileStem={`UniProt-variants-${ensgId}-${efoId}`}
            showGlobalFilter
            rowsPerPageOptions={defaultRowsPerPageOptions}
            query={UNIPROT_VARIANTS_QUERY.loc.source.body}
            variables={variables}
            loading={request.loading}
          />
        );
      }}
    />
  );
}

export default Body;
