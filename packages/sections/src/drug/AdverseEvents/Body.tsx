import { useQuery } from "@apollo/client";
import { useTheme } from "@mui/material/styles";
import type {
  AdverseEventsQuery,
  AdverseEventsQueryVariables,
  DrugBodyProps,
} from "@ot/constants";
import _ from "lodash";
import { Link, type OtTableColumn, OtTableServer, SectionItem, Typography } from "ui";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import ADVERSE_EVENTS_QUERY_DOCUMENT from "./AdverseEventsQuery.gql";
import Description from "./Description";

const ADVERSE_EVENTS_QUERY = typedDocument<AdverseEventsQuery, AdverseEventsQueryVariables>(
  ADVERSE_EVENTS_QUERY_DOCUMENT
);

type AdverseEventRow = NonNullable<
  NonNullable<AdverseEventsQuery["drug"]>["adverseEvents"]
>["rows"][number];

const PAGE_SIZE = 10;

const levelBarContainerStyle = { display: "flex", alignItems: "center" };

const getColumns = (
  critVal: number,
  maxLlr: number,
  primaryColor: string
): OtTableColumn<AdverseEventRow>[] => [
  {
    id: "name",
    label: "Adverse event (MedDRA)",
    renderCell: (d) =>
      d.meddraCode ? (
        <Link to={`https://identifiers.org/meddra:${d.meddraCode}`} external>
          <Typography variant="body2" noWrap display="block" title={_.upperFirst(d.name)}>
            {_.upperFirst(d.name)}
          </Typography>
        </Link>
      ) : (
        _.upperFirst(d.name)
      ),
    width: "30%",
  },
  {
    id: "count",
    label: "Number of reported events",
    numeric: true,
    width: "25%",
  },
  {
    id: "llr",
    label: `Log likelihood ratio (CV = ${critVal.toFixed(2)})`,
    renderCell: (d) => {
      const w = ((d.logLR / maxLlr) * 85).toFixed(2); // scale to max 85% of the width to allows space for label
      return (
        <div style={levelBarContainerStyle}>
          <div
            style={{
              backgroundColor: primaryColor,
              borderRight: `1px solid ${primaryColor}`,
              height: "10px",
              marginRight: "5px",
              width: `${w}%`,
            }}
          />
          <div>{d.logLR.toFixed(2)}</div>
        </div>
      );
    },
    filterValue: (d) => d.logLR.toFixed(2),
    exportValue: (d) => d.logLR.toFixed(2),
    width: "45%",
  },
];

type Props = DrugBodyProps;

function Body({ id: chemblId, label: name, entity }: Props) {
  const theme = useTheme();
  const variables = { chemblId };
  // first page only: drives the section loading/error state and provides the
  // critical value and the largest LLR, the table fetches the same page from the
  // Apollo cache and then paginates on its own
  const request = useQuery(ADVERSE_EVENTS_QUERY, {
    variables: { ...variables, index: 0, size: PAGE_SIZE },
  });

  return (
    <SectionItem
      definition={definition}
      request={request}
      entity={entity}
      showContentLoading={true}
      renderDescription={() => <Description name={name} />}
      renderBody={() => {
        // TODO: Change GraphQL schema to have a maxLlr field instead of having
        // to get the first item of adverse events to get the largest llr since
        // items are sorted in decreasing llr order.
        const maxLlr = request.data?.drug?.maxLlr?.rows[0]?.logLR ?? 0;
        const criticalValue = request.data?.drug?.adverseEvents?.stats.criticalValue ?? 0;

        return (
          <OtTableServer<AdverseEventRow>
            columns={getColumns(criticalValue, maxLlr, theme.palette.primary.main)}
            query={ADVERSE_EVENTS_QUERY}
            variables={variables}
            dataPath="drug.adverseEvents"
            pageSize={PAGE_SIZE}
            pageSizeOptions={[10, 25, 50, 100]}
            dataDownloader
            dataDownloaderFileStem={`${name}-adverse-events`}
          />
        );
      }}
    />
  );
}

export default Body;
