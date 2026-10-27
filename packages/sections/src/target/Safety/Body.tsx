import { useQuery } from "@apollo/client";
import { faArrowAltCircleDown, faArrowAltCircleUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { Theme } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";
import {
  defaultRowsPerPageOptions,
  naLabel,
  type TargetBodyProps,
  type TargetSafetyQuery,
  type TargetSafetyQueryVariables,
} from "@ot/constants";
import {
  Link,
  OtTable,
  type OtTableColumn,
  PublicationsDrawer,
  SectionItem,
  TableDrawer,
  Tooltip,
} from "ui";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import Description from "./Description";
import SAFETY_QUERY_DOCUMENT from "./Safety.gql";
import SafetyStudiesDrawer from "./SafetyStudiesDrawer";

const SAFETY_QUERY = typedDocument<TargetSafetyQuery, TargetSafetyQueryVariables>(
  SAFETY_QUERY_DOCUMENT
);

type SafetyRow = NonNullable<TargetSafetyQuery["target"]>["safetyLiabilities"][number];
type SafetyEffect = SafetyRow["effects"][number];

function EffectTooltipContent({ effect }: { effect: SafetyEffect }) {
  return (
    <>
      <strong>Direction:</strong>
      <div style={{ marginBottom: "7px" }}>{effect.direction}</div>
      <strong>Dosing:</strong>
      <div>{effect.dosing}</div>
    </>
  );
}

function getColumns(theme: Theme, symbol: string): OtTableColumn<SafetyRow>[] {
  return [
    {
      id: "event",
      label: "Safety event",
      enableHiding: false,
      renderCell: ({ event, eventId }) =>
        eventId ? (
          <Link asyncTooltip to={`/disease/${eventId}`}>
            {event ?? naLabel}
          </Link>
        ) : (
          (event ?? naLabel)
        ),
    },
    {
      id: "biosamples",
      label: "Biosystems",
      filterValue: ({ biosamples }) => {
        if (biosamples?.length === 1) {
          const sample = biosamples[0];
          return `${sample.cellFormat} ${sample.cellLabel} ${sample.tissueLabel}`.trim();
        }
        return "biosamples";
      },
      renderCell: ({ biosamples }) => {
        if (biosamples.length === 0) return "N/A";
        const entries = biosamples.map(({ cellFormat, cellLabel, tissueLabel, tissueId }) => ({
          name:
            (cellFormat ? `${cellFormat}${cellLabel ? ` (${cellLabel})` : ""}` : tissueLabel) ??
            naLabel,
          url:
            cellFormat || !tissueId
              ? undefined
              : `https://identifiers.org/${tissueId.replace("_", ":")}`,
          group: cellFormat ? "Assay" : "Organ system",
        }));

        return (
          <TableDrawer
            message={`${entries.length} biosystems`}
            caption="Biosystems"
            entries={entries}
          />
        );
      },
    },
    {
      id: "dosing",
      label: "Dosing effects",
      renderCell: ({ effects }) => {
        const circleUpData = effects.find(
          (effect) => effect.direction === "Activation/Increase/Upregulation"
        );
        const circleDownData = effects.find(
          (effect) => effect.direction === "Inhibition/Decrease/Downregulation"
        );
        return (
          <>
            {circleUpData ? (
              <Tooltip title={<EffectTooltipContent effect={circleUpData} />}>
                <span style={{ marginRight: "10px" }}>
                  <FontAwesomeIcon
                    color={theme.palette.primary.main}
                    icon={faArrowAltCircleUp}
                    size="lg"
                  />
                </span>
              </Tooltip>
            ) : (
              <FontAwesomeIcon
                color={theme.palette.grey[300]}
                icon={faArrowAltCircleUp}
                size="lg"
                style={{ marginRight: "10px" }}
              />
            )}
            {circleDownData ? (
              <Tooltip title={<EffectTooltipContent effect={circleDownData} />}>
                <span>
                  <FontAwesomeIcon
                    color={theme.palette.primary.main}
                    icon={faArrowAltCircleDown}
                    size="lg"
                  />
                </span>
              </Tooltip>
            ) : (
              <FontAwesomeIcon
                color={theme.palette.grey[300]}
                icon={faArrowAltCircleDown}
                size="lg"
              />
            )}
          </>
        );
      },
    },
    {
      id: "studies",
      label: "Experimental studies",
      renderCell: ({ studies }) => {
        if (studies.length === 0) return "N/A";
        return <SafetyStudiesDrawer studies={studies} />;
      },
    },
    {
      id: "datasource",
      label: "Source",
      renderCell: ({ datasource, literature }) =>
        literature ? (
          <PublicationsDrawer entries={[{ name: literature }]} customLabel={datasource} />
        ) : (
          <Link external to={`https://www.clinpgx.org/search?query=${symbol}`}>
            {datasource}
          </Link>
        ),
    },
  ];
}

type Props = TargetBodyProps;

function Body({ id: ensemblId, label: symbol, entity }: Props) {
  const theme = useTheme();
  const variables = { ensemblId };
  const request = useQuery(SAFETY_QUERY, { variables });
  return (
    <SectionItem
      definition={definition}
      request={request}
      renderDescription={() => <Description symbol={symbol} />}
      entity={entity}
      renderBody={() => (
        <OtTable
          showGlobalFilter
          dataDownloader
          dataDownloaderFileStem={`${ensemblId}-safety-${entity}`}
          columns={getColumns(theme, symbol)}
          rows={request.data?.target?.safetyLiabilities ?? []}
          rowsPerPageOptions={defaultRowsPerPageOptions}
          query={SAFETY_QUERY_DOCUMENT.loc?.source.body}
          variables={variables}
          loading={request.loading}
        />
      )}
    />
  );
}

export default Body;
