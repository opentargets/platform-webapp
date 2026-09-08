import { useQuery } from "@apollo/client";

import { SectionItem, Link, Tooltip, PublicationsDrawer, TableDrawer, OtTable } from "ui";
import { useTheme } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowAltCircleDown, faArrowAltCircleUp } from "@fortawesome/free-solid-svg-icons";

import SafetyStudiesDrawer from "./SafetyStudiesDrawer";
import { naLabel, defaultRowsPerPageOptions, type TargetBodyProps} from "@ot/constants";

import { definition } from ".";
import Description from "./Description";
import SAFETY_QUERY from "./Safety.gql";

function EffectTooltipContent({ effect }) {
  return (
    <>
      <strong>Direction:</strong>
      <div style={{ marginBottom: "7px" }}>{effect.direction}</div>
      <strong>Dosing:</strong>
      <div>{effect.dosing}</div>
    </>
  );
}

function getColumns(theme, symbol) {
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
          event ?? naLabel
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
        /* TODO: remove to handle only arrays */
        if (!biosamples) return "N/A";
        const entries = biosamples.map(({ cellFormat, cellLabel, tissueLabel, tissueId }) => ({
          name: cellFormat ? `${cellFormat}${cellLabel ? ` (${cellLabel})` : ""}` : tissueLabel,
          url:
            cellFormat || !tissueId
              ? null
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
        const circleUpData = effects
          ? effects.find(effect => effect.direction === "Activation/Increase/Upregulation")
          : null;
        const circleDownData = effects
          ? effects.find(effect => effect.direction === "Inhibition/Decrease/Downregulation")
          : null;
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
              <FontAwesomeIcon color={theme.palette.grey[300]} icon={faArrowAltCircleDown} size="lg" />
            )}
          </>
        );
      },
    },
    {
      id: "studies",
      label: "Experimental studies",
      renderCell: ({ studies }) => {
        /* TODO: remove to handle only arrays */
        if (!studies) return "N/A";
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
          rows={request.data?.target.safetyLiabilities}
          rowsPerPageOptions={defaultRowsPerPageOptions}
          query={SAFETY_QUERY.loc.source.body}
          variables={variables}
          loading={request.loading}
        />
      )}
    />
  );
}

export default Body;
