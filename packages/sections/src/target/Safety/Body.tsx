import { useQuery } from "@apollo/client";

import { SectionItem, Link, Tooltip, PublicationsDrawer, TableDrawer, OtTable } from "ui";
import { makeStyles } from "@mui/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowAltCircleDown, faArrowAltCircleUp } from "@fortawesome/free-solid-svg-icons";

import SafetyStudiesDrawer from "./SafetyStudiesDrawer";
import { naLabel, defaultRowsPerPageOptions } from "@ot/constants";

import { definition } from ".";
import Description from "./Description";
import SAFETY_QUERY from "./Safety.gql";

const useStyles = makeStyles(theme => ({
  blue: {
    color: theme.palette.primary.main,
  },
  grey: {
    color: theme.palette.grey[300],
  },
  direction: {
    marginBottom: "7px",
  },
  circleUp: {
    marginRight: "10px",
  },
}));

function EffectTooltipContent({ classes, effect }) {
  return (
    <>
      <strong>Direction:</strong>
      <div className={classes.direction}>{effect.direction}</div>
      <strong>Dosing:</strong>
      <div>{effect.dosing}</div>
    </>
  );
}

function getColumns(classes, symbol) {
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
              <Tooltip title={<EffectTooltipContent classes={classes} effect={circleUpData} />}>
                <span className={classes.circleUp}>
                  <FontAwesomeIcon className={classes.blue} icon={faArrowAltCircleUp} size="lg" />
                </span>
              </Tooltip>
            ) : (
              <FontAwesomeIcon
                className={`${classes.circleUp} ${classes.grey}`}
                icon={faArrowAltCircleUp}
                size="lg"
              />
            )}
            {circleDownData ? (
              <Tooltip title={<EffectTooltipContent classes={classes} effect={circleDownData} />}>
                <span>
                  <FontAwesomeIcon className={classes.blue} icon={faArrowAltCircleDown} size="lg" />
                </span>
              </Tooltip>
            ) : (
              <FontAwesomeIcon className={classes.grey} icon={faArrowAltCircleDown} size="lg" />
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

type Props = {
  id: string;
  entity: string;
  label: string;
};

function Body({ id: ensemblId, label: symbol, entity }: Props) {
  const classes = useStyles();
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
          columns={getColumns(classes, symbol)}
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
