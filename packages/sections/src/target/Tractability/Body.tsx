import { faCheckCircle, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import { v1 } from "uuid";
import { SectionItem, EllsWrapper } from "ui";
import { useQuery } from "@apollo/client";
import { GridLegacy, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { definition } from ".";
import Description from "./Description";
import TRACTABILITY_QUERY from "./TractabilityQuery.gql";
import type { TargetBodyProps } from "@ot/constants";

const modalities = [
  {
    modality: "SM",
    label: "Small molecule",
  },
  {
    modality: "AB",
    label: "Antibody",
  },
  {
    modality: "PR",
    label: "PROTAC",
  },
  {
    modality: "OC",
    label: "Other modalities",
  },
];

/**
 * Parse given data for the specified modality and return a list (divs)
 * @param {String} modality e.g. 'SM'
 * @param {Array} data the tractability data array returned by the API {value, modality, label(id)}
 * @returns
 */
function ModalityList({ modality, data }) {
  const theme = useTheme();
  return (
    <div data-testid={`tractability-modality-list-${modality.toLowerCase()}`}>
      {data
        .filter(d => d.modality === modality)
        .map(d => (
          <div
            key={v1()}
            data-testid={`tractability-item-${d.value ? "enabled" : "disabled"}`}
            style={{
              marginBottom: "0.35em",
              fontWeight: d.value ? "bold" : undefined,
              color: d.value ? undefined : theme.palette.grey[300],
            }}
          >
            <EllsWrapper title={d.label}>
              <span
                style={{
                  paddingRight: "0.5em",
                  float: "left",
                  color: d.value ? theme.palette.primary.main : undefined,
                }}
              >
                <FontAwesomeIcon icon={d.value ? faCheckCircle : faTimesCircle} size="lg" />
              </span>
              {d.label}
            </EllsWrapper>
          </div>
        ))}
    </div>
  );
}

type Props = TargetBodyProps;

function Body({ label: symbol, id: ensemblId, entity }: Props) {
  // const request = usePlatformApi(Summary.fragments.TractabilitySummaryFragment);

  const request = useQuery(TRACTABILITY_QUERY, {
    variables: { ensemblId },
  });

  return (
    <SectionItem
      definition={definition}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={symbol} />}
      showContentLoading={true}
      renderBody={() => (
        <GridLegacy data-testid="tractability-grid" container spacing={3}>
          {modalities.map(m => (
            <GridLegacy data-testid={`tractability-modality-${m.modality.toLowerCase()}`} item xs={6} sm={3} key={v1()}>
              <Typography data-testid={`tractability-modality-title-${m.modality.toLowerCase()}`} variant="subtitle1" gutterBottom>
                {m.label}
              </Typography>
              <ModalityList modality={m.modality} data={request.data?.target.tractability} />
            </GridLegacy>
          ))}
        </GridLegacy>
      )}
    />
  );
}

export default Body;
