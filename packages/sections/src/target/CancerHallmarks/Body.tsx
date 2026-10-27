import { useQuery } from "@apollo/client";
import {
  defaultRowsPerPageOptions,
  type TargetBodyProps,
  type TargetHallmarksQuery,
  type TargetHallmarksQueryVariables,
} from "@ot/constants";
import {
  Box,
  ChipList,
  OtTable,
  type OtTableColumn,
  PublicationsDrawer,
  SectionItem,
  Typography,
} from "ui";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import Description from "./Description";
import HALLMARKS_QUERY_DOCUMENT from "./Hallmarks.gql";

const HALLMARKS_QUERY = typedDocument<TargetHallmarksQuery, TargetHallmarksQueryVariables>(
  HALLMARKS_QUERY_DOCUMENT
);

type HallmarkRow = {
  label: string;
  activity: string;
  description: string;
  pmid: number;
};

const columns: OtTableColumn<HallmarkRow>[] = [
  {
    id: "label",
    label: "Hallmark",
    enableHiding: false,
    renderCell: (row) => row.label,
    exportLabel: "Hallmark",
  },
  {
    id: "activity",
    label: "Effect",
    renderCell: (row) => row.activity,
    exportLabel: "Effect",
  },
  {
    id: "description",
    label: "Description",
    renderCell: (row) => row.description,
    exportLabel: "Description",
  },
  {
    id: "publications",
    label: "Publications",
    renderCell: ({ pmid }) => (
      <PublicationsDrawer
        entries={[
          {
            name: String(pmid),
            url: `http://europepmc.org/search?query=EXT_ID:${pmid}`,
            group: "literature",
          },
        ]}
      />
    ),
    exportLabel: "Literature (PubMed id)",
    exportValue: (row) => row.pmid,
  },
];

type Props = TargetBodyProps;

function Section({ id, label: symbol, entity }: Props) {
  const variables = { ensemblId: id };
  const request = useQuery(HALLMARKS_QUERY, { variables });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => <Description symbol={symbol} />}
      renderBody={() => {
        const hallmarks = request.data?.target?.hallmarks;
        if (!hallmarks) return null;
        const roleInCancer = hallmarks.attributes
          .filter((a) => a.name === "role in cancer")
          .map((r) => ({
            label: r.description,
            url: `http://europepmc.org/search?query=EXT_ID:${r.pmid}`,
          }));
        const rows: HallmarkRow[] = hallmarks.cancerHallmarks.map((r) => ({
          label: r.label,
          activity: r.impact === "promotes" ? "promotes" : "suppresses",
          description: r.description,
          pmid: r.pmid,
        }));

        return (
          <>
            <Box
              data-testid="role-in-cancer"
              sx={{ display: "flex", alignItems: "center", marginBottom: "2rem" }}
            >
              <Typography sx={{ marginRight: ".5rem !important" }}>Role in cancer:</Typography>
              <ChipList items={roleInCancer.length > 0 ? roleInCancer : [{ label: "Unknown" }]} />
            </Box>
            <OtTable
              columns={columns}
              dataDownloader
              dataDownloaderFileStem={`${symbol}-hallmarks`}
              rows={rows}
              noWrap={false}
              rowsPerPageOptions={defaultRowsPerPageOptions}
              query={HALLMARKS_QUERY_DOCUMENT.loc?.source.body}
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
