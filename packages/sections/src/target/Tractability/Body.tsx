import { useQuery } from "@apollo/client";
import { faCheckCircle, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTheme } from "@mui/material/styles";
import type {
  TargetBodyProps,
  TargetTractabilityQuery,
  TargetTractabilityQueryVariables,
} from "@ot/constants";
import { EllsWrapper, GridLegacy, SectionItem, Typography } from "ui";
import { v1 } from "uuid";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import Description from "./Description";
import TRACTABILITY_QUERY_DOCUMENT from "./TractabilityQuery.gql";

const TRACTABILITY_QUERY = typedDocument<TargetTractabilityQuery, TargetTractabilityQueryVariables>(
  TRACTABILITY_QUERY_DOCUMENT
);

type TractabilityRow = NonNullable<TargetTractabilityQuery["target"]>["tractability"][number];

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
 * @param modality e.g. 'SM'
 * @param data the tractability data array returned by the API {value, modality, label(id)}
 */
function ModalityList({ modality, data }: { modality: string; data: TractabilityRow[] }) {
  const theme = useTheme();
  return (
    <div data-testid={`tractability-modality-list-${modality.toLowerCase()}`}>
      {data
        .filter((d) => d.modality === modality)
        .map((d) => (
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
          {modalities.map((m) => (
            <GridLegacy
              data-testid={`tractability-modality-${m.modality.toLowerCase()}`}
              item
              xs={6}
              sm={3}
              key={v1()}
            >
              <Typography
                data-testid={`tractability-modality-title-${m.modality.toLowerCase()}`}
                variant="subtitle1"
                gutterBottom
              >
                {m.label}
              </Typography>
              <ModalityList modality={m.modality} data={request.data?.target?.tractability ?? []} />
            </GridLegacy>
          ))}
        </GridLegacy>
      )}
    />
  );
}

export default Body;
