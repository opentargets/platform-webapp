import { useQuery } from "@apollo/client";
import { Typography } from "@mui/material";
import { Link, SectionItem, Tooltip, ClinvarStars, OtTable } from "ui";

import { definition } from ".";
import Description from "./Description";
import CHEMICAL_PROBES_QUERY from "./ChemicalProbes.gql";
import { naLabel, defaultRowsPerPageOptions, TargetBodyProps} from "@ot/constants";
import _ from "lodash";

/**
 * Style the tooltips as "label: value" with a bold label
 */
function TooltipStyledLabel({ label, value }) {
  return (
    <Typography variant="body2">
      <span style={{ fontWeight: "bold" }}>{label}:</span> {value}
    </Typography>
  );
}

const columns = [
  {
    id: "id",
    label: "Probe ID",
    enableHiding: false,
    renderCell: row => {
      // link to drug page if drugid is available; also add tooltip with control if available
      const c = row.drugId ? (
        <Link asyncTooltip to={`/drug/${row.drugId}`}>
          {row.id}
        </Link>
      ) : (
        <span>{row.id}</span>
      );
      return row.control ? (
        <Tooltip title={<TooltipStyledLabel label="Control" value={row.control} />} showHelpIcon>
          {c}
        </Tooltip>
      ) : (
        c
      );
    },
    exportValue: row => row.id,
    filterValue: row => row.id,
    width: "25%",
  },
  {
    id: "isHighQuality",
    label: "Quality",
    renderCell: row => (
      <Tooltip title={row.isHighQuality ? "High quality" : "Low quality"}>
        <span>
          <ClinvarStars num={row.isHighQuality ? 1 : 0} length={1} />
        </span>
      </Tooltip>
    ),
    exportValue: row => (row.isHighQuality ? "high" : "low"),
    filterValue: row => (row.isHighQuality ? 1 : 0),
    tooltip:
      "Chemical probes selection based on the union of following criteria: compound belongs to one of the high-quality probe sets; use in Cells or Organisms rating ≥ 75%; P&D approved experimental probe; not labelled as obsolete.",
    width: "12%",
  },
  {
    id: "mechanismOfAction",
    label: "Mechanism of action",
    renderCell: row => row.mechanismOfAction?.join(", ") || naLabel,
    exportValue: row => row.mechanismOfAction?.join(", "),
    filterValue: row => row.mechanismOfAction?.join(", ") || naLabel,
    width: "25%",
  },
  {
    id: "origin",
    label: "Probe origin",
    renderCell: row => row.origin?.join(", ") || naLabel,
    exportValue: row => row.origin?.join(", "),
    filterValue: row => row.origin?.join(", ") || naLabel,
    width: "25%",
  },
  {
    id: "probesDrugsScore",
    label: "Score",
    renderCell: row => row.probesDrugsScore || naLabel,
    exportValue: row => row.probesDrugsScore || naLabel,
    filterValue: row => row.probesDrugsScore,
    width: "13%",
  },
];

type Props = TargetBodyProps;

function Body({ id, label: symbol, entity }: Props) {
  const variables = { ensemblId: id };
  const request = useQuery(CHEMICAL_PROBES_QUERY, { variables });

  return (
    <SectionItem
      definition={definition}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={symbol} />}
      renderBody={() => {
        // sort probes manually as we need a custom sort based score, quality and origin
        const sortedProbes = _.orderBy(
          request.data?.target.chemicalProbes,
          [
            "probesDrugsScore",
            "isHighQuality",
            p => p.origin?.map(o => o.toLowerCase()).includes("experimental"),
          ],
          ["desc", "desc", "desc"]
        );

        return request.data?.target.chemicalProbes?.length > 0 ? (
          <OtTable
            columns={columns}
            rows={sortedProbes}
            showGlobalFilter
            dataDownloader
            dataDownloaderFileStem={`${symbol}-chemical-probes`}
            fixed
            rowsPerPageOptions={defaultRowsPerPageOptions}
            noWrap={false}
            noWrapHeader={false}
            query={CHEMICAL_PROBES_QUERY.loc.source.body}
            variables={variables}
            loading={request.loading}
          />
        ) : null;
      }}
    />
  );
}

export default Body;
