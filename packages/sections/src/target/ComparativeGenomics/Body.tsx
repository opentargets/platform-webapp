import { useQuery } from "@apollo/client";
import { faStar } from "@fortawesome/free-regular-svg-icons";
import { faStar as faStarSolid } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTheme } from "@mui/material/styles";
import {
  decimalPlaces,
  type TargetBodyProps,
  type TargetHomologuesQuery,
  type TargetHomologuesQueryVariables,
  VIEW,
} from "@ot/constants";
import { identifiersOrgLink } from "@ot/utils";
import type { CSSProperties } from "react";
import { Link, OtTable, type OtTableColumn, SectionItem, Tooltip } from "ui";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import ChimpanzeeIcon from "./ChimpanzeeIcon";
import ComparativeGenomicsPlot from "./ComparativeGenomicsPlot";
import COMP_GENOMICS_QUERY_DOCUMENT from "./CompGenomics.gql";
import Description from "./Description";
import DogIcon from "./DogIcon";
import FlyIcon from "./FlyIcon";
import FrogIcon from "./FrogIcon";
import GuineaPigIcon from "./GuineaPigIcon";
import HumanIcon from "./HumanIcon";
import MacaqueIcon from "./MacaqueIcon";
import MouseIcon from "./MouseIcon";
import PigIcon from "./PigIcon";
import RabbitIcon from "./RabbitIcon";
import RatIcon from "./RatIcon";
import WormIcon from "./WormIcon";
import ZebrafishIcon from "./ZebrafishIcon";

const COMP_GENOMICS_QUERY = typedDocument<TargetHomologuesQuery, TargetHomologuesQueryVariables>(
  COMP_GENOMICS_QUERY_DOCUMENT
);

type HomologueRow = NonNullable<TargetHomologuesQuery["target"]>["homologues"][number];

const VIEW_MODES = {
  default: "default",
  mouseOrthologMaxIdentityPercentage: "mouseOrthologMaxIdentityPercentage",
  paralogMaxIdentityPercentage: "paralogMaxIdentityPercentage",
};

// map species ids to species icon component
const speciesIcons: Record<string, () => JSX.Element> = {
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

const iconContainerStyle: CSSProperties = {
  display: "inline-block",
  textAlign: "right",
  width: "43px",
  marginRight: "5px",
};
const containerStyle: CSSProperties = { display: "inline-block", width: "16px" };

function getColumns(primaryColor: string): OtTableColumn<HomologueRow>[] {
  return [
    {
      id: "speciesName",
      label: "Species",
      enableHiding: false,
      renderCell: ({ speciesId, speciesName }) => {
        const SpeciesIcon = speciesIcons[speciesId];
        return (
          <>
            <span style={iconContainerStyle}>{SpeciesIcon ? <SpeciesIcon /> : null}</span>{" "}
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
          <span style={containerStyle}>
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
                    color={isHighConfidence === "1" ? primaryColor : undefined}
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

type Props = TargetBodyProps & {
  viewMode?: string;
};

function Body({ id: ensemblId, label: symbol, entity, viewMode = VIEW_MODES.default }: Props) {
  const theme = useTheme();
  const variables = { ensemblId };
  const request = useQuery(COMP_GENOMICS_QUERY, { variables });
  const columns = getColumns(theme.palette.primary.main);
  return (
    <SectionItem
      entity={entity}
      definition={definition}
      request={request}
      defaultView={VIEW.chart}
      renderDescription={() => <Description symbol={symbol} />}
      renderChart={() => (
        <ComparativeGenomicsPlot
          homologues={request.data?.target?.homologues}
          viewMode={viewMode}
          loading={request.loading}
          query={COMP_GENOMICS_QUERY_DOCUMENT.loc?.source.body}
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
          rows={request.data?.target?.homologues ?? []}
          query={COMP_GENOMICS_QUERY_DOCUMENT.loc?.source.body}
          variables={variables}
          loading={request.loading}
        />
      )}
    />
  );
}

export default Body;
