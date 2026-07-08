import { useQuery } from "@apollo/client";
import { makeStyles } from "@mui/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar as faStarSolid } from "@fortawesome/free-solid-svg-icons";
import { faStar } from "@fortawesome/free-regular-svg-icons";
import { SectionItem, Link, Tooltip, OtTable } from "ui";
import ComparativeGenomicsPlot from "./ComparativeGenomicsPlot";

import { definition } from ".";
import Description from "./Description";
import COMP_GENOMICS_QUERY from "./CompGenomics.gql";
import ChimpanzeeIcon from "./ChimpanzeeIcon";
import HumanIcon from "./HumanIcon";
import RatIcon from "./RatIcon";
import FrogIcon from "./FrogIcon";
import DogIcon from "./DogIcon";
import FlyIcon from "./FlyIcon";
import RabbitIcon from "./RabbitIcon";
import MacaqueIcon from "./MacaqueIcon";
import PigIcon from "./PigIcon";
import WormIcon from "./WormIcon";
import ZebrafishIcon from "./ZebrafishIcon";
import GuineaPigIcon from "./GuineaPigIcon";
import MouseIcon from "./MouseIcon";

import { identifiersOrgLink } from "@ot/utils";
import { decimalPlaces, VIEW } from "@ot/constants";

const VIEW_MODES = {
  default: "default",
  mouseOrthologMaxIdentityPercentage: "mouseOrthologMaxIdentityPercentage",
  paralogMaxIdentityPercentage: "paralogMaxIdentityPercentage",
};

// map species ids to species icon component
const speciesIcons = {
  9598: ChimpanzeeIcon,
  10116: RatIcon,
  9606: HumanIcon,
  8364: FrogIcon,
  9615: DogIcon,
  7227: FlyIcon,
  9986: RabbitIcon,
  9544: MacaqueIcon,
  9823: PigIcon,
  6239: WormIcon,
  7955: ZebrafishIcon,
  10141: GuineaPigIcon,
  10090: MouseIcon,
};

const useStyles = makeStyles(theme => ({
  star: {
    color: theme.palette.primary.main,
  },
  iconContainer: {
    display: "inline-block",
    textAlign: "right",
    width: "43px",
    marginRight: "5px",
  },
  container: {
    display: "inline-block",
    width: "16px",
  },
}));

function getColumns(classes) {
  return [
    {
      id: "speciesName",
      label: "Species",
      enableHiding: false,
      renderCell: ({ speciesId, speciesName }) => {
        const SpeciesIcon = speciesIcons[speciesId];
        return (
          <>
            <span className={classes.iconContainer}>
              <SpeciesIcon />
            </span>{" "}
            {speciesName}
          </>
        );
      },
    },
    {
      id: "homologyType",
      label: "Homology type",
      renderCell: ({ isHighConfidence, homologyType }) => (
        <>
          <span className={classes.container}>
            {isHighConfidence === "NULL" ? null : (
              <Tooltip
                title={
                  isHighConfidence === "1"
                    ? "High confidence orthologue"
                    : "Low confidence orthologue"
                }
              >
                <span>
                  <FontAwesomeIcon
                    className={isHighConfidence === "1" ? classes.star : ""}
                    icon={isHighConfidence === "1" ? faStarSolid : faStar}
                  />
                </span>
              </Tooltip>
            )}
          </span>{" "}
          {homologyType.replaceAll("_", " ")}
        </>
      ),
    },
    {
      id: "targetGeneSymbol",
      label: "Homologue",
      enableHiding: false,
      renderCell: ({ targetGeneId, targetGeneSymbol }) => (
        <Link external to={identifiersOrgLink("ensembl", targetGeneId)}>
          {targetGeneSymbol || targetGeneId}
        </Link>
      ),
    },
    {
      id: "queryPercentageIdentity",
      label: `Query %id`,
      renderCell: ({ queryPercentageIdentity }) =>
        queryPercentageIdentity ? queryPercentageIdentity.toFixed(decimalPlaces) : "N/A",
    },
    {
      id: "targetPercentageIdentity",
      label: `Target %id`,
      renderCell: ({ targetPercentageIdentity }) =>
        targetPercentageIdentity ? targetPercentageIdentity.toFixed(decimalPlaces) : "N/A",
    },
  ];
}

type Props = {
  id: string;
  entity: string;
  label: string;
  viewMode?: string;
};

function Body({ id: ensemblId, label: symbol, entity, viewMode = VIEW_MODES.default }: Props) {
  const classes = useStyles();
  const variables = { ensemblId };
  const request = useQuery(COMP_GENOMICS_QUERY, { variables });
  const columns = getColumns(classes);
  return (
    <SectionItem
      entity={entity}
      definition={definition}
      request={request}
      defaultView={VIEW.chart}
      renderDescription={() => <Description symbol={symbol} />}
      renderChart={() => (
        <ComparativeGenomicsPlot
          homologues={request.data?.target.homologues}
          viewMode={viewMode}
          loading={request.loading}
          query={COMP_GENOMICS_QUERY.loc.source.body}
          variables={variables}
          columns={columns}
        />
      )}
      renderBody={() => (
        <OtTable
          showGlobalFilter
          dataDownloader
          dataDownloaderFileStem={`${ensemblId}-comparative-genomics-${entity}`}
          columns={columns}
          rows={request.data?.target.homologues}
          query={COMP_GENOMICS_QUERY.loc.source.body}
          variables={variables}
          loading={request.loading}
        />
      )}
    />
  );
}

export default Body;
