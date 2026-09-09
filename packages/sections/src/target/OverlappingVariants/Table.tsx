import { OtTable, Link, Tooltip, DisplayVariantId, LabelChip, Typography, Box } from "ui";
import { useStateValue, useActions } from "./Context";
import { naLabel } from "@ot/constants";
import { variantComparator } from "@ot/utils";

export default function OverlappingVariantsTable() {
  const { state, filteredRows } = useStateValue();
  const { setHoveredRow, setUnhoveredRow } = useActions();

  const columns = [
    {
      id: "variant.id",
      label: "Variant",
      enableHiding: false,
      comparator: variantComparator(d => d?.variant),
      sortable: true,
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
      exportValue: ({ variant }) => variant?.id,
    },
    {
      id: "aminoAcidPosition",
      label: "Change",
      sortable: true,
      tooltip: (
        <>
          Amino acid change:
          <Box sx={{ mt: 0.5 }}>reference | start position | alternate</Box>
        </>
      ),
      comparator: (a, b) => a.aminoAcidPosition - b.aminoAcidPosition,
      renderCell: o => (
        <>
          {o.referenceAminoAcid}
          <Box component="span" sx={{ px: 0.15 }}>
            {o.aminoAcidPosition}
          </Box>
          {o.alternateAminoAcid}
        </>
      ),
    },
    {
      id: "datasources",
      label: "Evidence count",
      renderCell: ({ datasources }) => {
        if (datasources.length > 0) {
          return (
            <Box sx={{ display: "flex", gap: "5px" }}>
              {datasources.map(({ datasourceCount, datasourceNiceName }) => (
                <LabelChip
                  key={datasourceNiceName}
                  label={datasourceNiceName}
                  value={datasourceCount}
                />
              ))}
            </Box>
          );
        }
        return naLabel;
      },
    },
    // {
    //   id: "variantEffect",
    //   label: "Alpha Missense",
    //   renderCell: ({ variantEffect }) => variantEffect?.toFixed(2) ?? naLabel,
    // },
    // {
    //   id: "variantConsequences",
    //   label: "Most severe consequence",
    //   sortable: true,
    //   comparator: (a, b) =>
    //     a.variantConsequences[0].label.localeCompare(b.variantConsequences[0].label),
    //   renderCell: ({ variantConsequences }) => variantConsequences[0].label,
    // },
    {
      id: "diseases",
      label: "Disease/phenotype",
      // filterValue: ({ diseases }) => diseases.map(({ name }) => name).join(", "),
      renderCell: ({ diseases }) => {
        if (diseases.length === 0) return naLabel;
        const elements = [<Link to={`/disease/${diseases[0].id}`}>{diseases[0].name}</Link>];
        if (diseases.length > 1) {
          elements.push(", ", <Link to={`/disease/${diseases[1].id}`}>{diseases[1].name}</Link>);
          if (diseases.length > 2) {
            elements.push(
              <Tooltip
                title={diseases
                  .slice(2)
                  .map(({ id, name }) => <Link to={`/disease/${id}`}>{name}</Link>)
                  .reduce((accum, current) => {
                    accum.push(current, ", ");
                    return accum;
                  }, [])}
                showHelpIcon
              >
                <Typography variant="caption" ml={1}>
                  +{diseases.length - 2} more
                </Typography>
              </Tooltip>
            );
          }
        }
        return elements;
      },
    },
  ];

  function getEnteredRow(enteredRow) {
    setHoveredRow(enteredRow.original);
  }

  function getExitedRow(exitedRow) {
    setUnhoveredRow();
  }

  return (
    <Box
      onMouseLeave={() => {
        setUnhoveredRow();
      }}
    >
      <OtTable
        dataDownloader
        showGlobalFilter={false}
        sortBy="aminoAcidPosition"
        order="asc"
        columns={columns}
        rows={filteredRows}
        query={state.query}
        variables={state.variables}
        getEnteredRow={getEnteredRow}
        getExitedRow={getExitedRow}
      />
    </Box>
  );
}
