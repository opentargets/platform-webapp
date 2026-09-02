import { Box, Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { useQuery } from "@apollo/client";
import { ChipList, SectionItem, PublicationsDrawer, OtTable } from "ui";

import { definition } from ".";
import Description from "./Description";
import { defaultRowsPerPageOptions, type TargetBodyProps} from "@ot/constants";

import HALLMARKS_QUERY from "./Hallmarks.gql";

const columns = [
  {
    id: "label",
    label: "Hallmark",
    enableHiding: false,
    renderCell: row => row.label,
    exportLabel: "Hallmark",
  },
  {
    id: "activity",
    label: "Effect",
    renderCell: row => row.activity,
    exportLabel: "Effect",
  },
  {
    id: "description",
    label: "Description",
    renderCell: row => row.description,
    exportLabel: "Description",
  },
  {
    id: "publications",
    label: "Publications",
    renderCell: ({ pmid }) => (
      <PublicationsDrawer
        entries={[
          {
            name: pmid,
            url: `http://europepmc.org/search?query=EXT_ID:${pmid}`,
            group: "literature",
          },
        ]}
      />
    ),
    exportLabel: "Literature (PubMed id)",
    exportValue: row => row.pmid,
  },
];

const useStyles = makeStyles({
  roleInCancerBox: {
    display: "flex",
    alignItems: "center",
    marginBottom: "2rem",
  },
  roleInCancerTitle: { marginRight: ".5rem !important" },
});

type Props = TargetBodyProps;

function Section({ id, label: symbol, entity }: Props) {
  const variables = { ensemblId: id };
  const classes = useStyles();
  const request = useQuery(HALLMARKS_QUERY, { variables });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => <Description symbol={symbol} />}
      renderBody={() => {
        if (request.data?.target.hallmarks === null) return null;
        const roleInCancer = request.data?.target.hallmarks.attributes
          .filter(a => a.name === "role in cancer")
          .map(r => ({
            label: r.description,
            url: `http://europepmc.org/search?query=EXT_ID:${r.pmid}`,
          }));
        const rows = request.data?.target.hallmarks.cancerHallmarks.map(r => ({
          label: r.label,
          activity: r.impact === "promotes" ? "promotes" : "suppresses",
          description: r.description,
          pmid: r.pmid,
        }));

        return (
          <>
            <Box data-testid="role-in-cancer" className={classes.roleInCancerBox}>
              <Typography className={classes.roleInCancerTitle}>Role in cancer:</Typography>
              <ChipList items={roleInCancer?.length > 0 ? roleInCancer : [{ label: "Unknown" }]} />
            </Box>
            <OtTable
              columns={columns}
              dataDownloader
              dataDownloaderFileStem={`${symbol}-hallmarks`}
              rows={rows}
              noWrap={false}
              rowsPerPageOptions={defaultRowsPerPageOptions}
              query={HALLMARKS_QUERY.loc.source.body}
              variables={variables}
              loading={request.loading}
            />
          </>
        );
      }}
    />
  );
}

export default Section;
