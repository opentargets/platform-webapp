import { faPlay } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  defaultRowsPerPageOptions,
  InteractionSourceDatabase,
  type TargetInteractionsQuery,
  type TargetInteractionsQueryVariables,
} from "@ot/constants";
import type { Row as TableRow } from "@tanstack/react-table";
import type { MouseEvent } from "react";
import { useState } from "react";
import {
  DataTable,
  EllsWrapper,
  GridLegacy,
  Link,
  type OtTableColumn,
  OtTableServer,
  Tooltip,
  Typography,
} from "ui";
import { typedDocument } from "../../utils/typedDocument";
import { MethodIconArrow, MethodIconExpandArrow, MethodIconText } from "./custom/MethodIcons";
import INTERACTIONS_QUERY_DOCUMENT from "./InteractionsQuery.gql";

const INTERACTIONS_QUERY = typedDocument<TargetInteractionsQuery, TargetInteractionsQueryVariables>(
  INTERACTIONS_QUERY_DOCUMENT
);

type InteractionRow = NonNullable<
  TargetInteractionsQuery["target"]
>["interactions"]["rows"][number];

const onLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
  // handler to stop propagation of clicks on links in table rows
  // to avoid selection of a different row
  e.stopPropagation();
};

const interactionColumns: OtTableColumn<InteractionRow>[] = [
  {
    id: "targetB",
    label: (
      <>
        Interactor{" "}
        <MethodIconText notooltip enabled>
          B
        </MethodIconText>
        <br />
        <Typography variant="caption">Alt ID</Typography>
      </>
    ),
    exportLabel: "interactorB-AltId",
    renderCell: (row) => (
      <>
        <EllsWrapper title={row.targetB ? row.targetB.approvedSymbol : row.intB}>
          {row.targetB ? (
            <Link asyncTooltip to={`/target/${row.targetB.id}`} onClick={onLinkClick}>
              {row.targetB.approvedSymbol}
            </Link>
          ) : (
            <Link to={`http://uniprot.org/uniprot/${row.intB}`} onClick={onLinkClick} external>
              {row.intB}
            </Link>
          )}
        </EllsWrapper>
        {row.speciesB && row.speciesB?.mnemonic.toLowerCase() !== "human" ? (
          <Tooltip title={row.speciesB?.mnemonic} showHelpIcon />
        ) : null}
        <br />
        <EllsWrapper title={row.intB}>
          <Typography variant="caption">
            Alt ID:{" "}
            <Link to={`http://uniprot.org/uniprot/${row.intB}`} onClick={onLinkClick} external>
              {row.intB}
            </Link>
          </Typography>
        </EllsWrapper>
      </>
    ),
    exportValue: (row) => row.targetB?.approvedSymbol || row.intB,
    filterValue: (row) => `${row.targetB?.approvedSymbol} ${row.intB}`,
    width: "65%",
  },
  {
    id: "sizeEvidences",
    label: "Interaction evidence entries",
    renderCell: (row) => (
      <>
        {row.count}
        <span className="selected-evidence">
          <FontAwesomeIcon icon={faPlay} />
        </span>
      </>
    ),
    exportValue: (row) => row.count,
    width: "35%",
  },
];

const evidenceColumns = [
  {
    id: "interactionIdentifier",
    label: "ID",
    renderCell: (row) => (
      <Link
        to={`https://reactome.org/content/detail/${row.interactionIdentifier}`}
        onClick={onLinkClick}
        external
      >
        {row.interactionIdentifier}
      </Link>
    ),
    width: "25%",
  },
  {
    id: "interaction",
    label: (
      <>
        Interaction
        <br />
        <Typography variant="caption">Host organism</Typography>
      </>
    ),
    renderCell: (row) => (
      <>
        <EllsWrapper>{row.interactionTypeShortName}</EllsWrapper>
        <br />
        <EllsWrapper title={row.hostOrganismScientificName}>
          <Typography variant="caption">Organism: {row.hostOrganismScientificName}</Typography>
        </EllsWrapper>
      </>
    ),
    filterValue: (row) => `${row.interactionTypeShortName} ${row.hostOrganismScientificName}`,
    width: "30%",
  },
  {
    id: "methods",
    label: "Detection methods",
    renderCell: (row) => (
      <>
        <MethodIconText
          tooltip={row.participantDetectionMethodA.map((m) => m.shortName).join()}
          enabled
        >
          A
        </MethodIconText>
        <MethodIconArrow tooltip={row.interactionDetectionMethodShortName} enabled />
        <MethodIconText tooltip={row.participantDetectionMethodB[0].shortName} enabled>
          B
        </MethodIconText>
        <MethodIconExpandArrow tooltip={row.expansionMethodShortName} enabled />
      </>
    ),
    filterValue: (row) =>
      `${row.participantDetectionMethodA.map((m) => m.shortName).join(" ")} ${
        row.interactionDetectionMethodShortName
      } ${row.participantDetectionMethodB ? row.participantDetectionMethodB[0].shortName : ""} ${
        row.expansionMethodShortName
      }`,
    width: "25%",
  },
  {
    id: "pubmedId",
    label: "Publication",
    renderCell: (d) =>
      d.pubmedId && d.pubmedId.indexOf("unassigned") === -1 ? (
        <Link external to={`http://europepmc.org/abstract/MED/${d.pubmedId}`}>
          {d.pubmedId}
        </Link>
      ) : (
        d.pubmedId
      ),
    filterValue: (row) => row.pubmedId,
    width: "20%",
  },
];

const evidenceColsExport = [
  {
    label: "Interaction host organism",
    exportValue: (row) => row.hostOrganismScientificName,
  },
  {
    label: "detection method A",
    exportValue: (row) => row.participantDetectionMethodA.map((m) => m.shortName),
  },
  {
    label: "detection method short name",
    exportValue: (row) => row.interactionDetectionMethodShortName,
  },
  {
    label: "detection method B",
    exportValue: (row) => row.participantDetectionMethodB[0].shortName,
  },
  {
    label: "expansion method short name",
    exportValue: (row) => row.expansionMethodShortName,
  },
];

const id = InteractionSourceDatabase.Reactome;
const INTERACTORS_PAGE_SIZE = 10;

function ReactomeTab({ ensgId, symbol }: { ensgId: string; symbol: string }) {
  const [selected, setSelected] = useState<InteractionRow | null>(null);
  const evidence = selected?.evidences ?? [];
  const selectedIntB = selected?.targetB?.approvedSymbol || selected?.intB || "";
  const variables = { ensgId, sourceDatabase: id };
  return (
    <GridLegacy container spacing={10}>
      <GridLegacy item xs={12} md={5}>
        {/* table 1: interactions */}
        <Typography variant="h6" gutterBottom>
          Interactors of
          <br />
          {symbol}{" "}
          <MethodIconText notooltip enabled small>
            A
          </MethodIconText>{" "}
        </Typography>
        <OtTableServer<InteractionRow>
          columns={interactionColumns}
          query={INTERACTIONS_QUERY}
          variables={variables}
          dataPath="target.interactions"
          pageSize={INTERACTORS_PAGE_SIZE}
          dataDownloader
          dataDownloaderFileStem={`${symbol}-molecular-interactions-interactors`}
          getSelectedRows={(rows: TableRow<InteractionRow>[]) => {
            const row = rows[0]?.original;
            if (row) setSelected(row);
          }}
        />
      </GridLegacy>

      {/* table 2: evidence */}
      <GridLegacy item xs={12} md={7}>
        <Typography variant="h6" gutterBottom>
          Interaction evidence of
          <br />
          {symbol}{" "}
          <MethodIconText notooltip enabled small>
            A
          </MethodIconText>
          {` + ${selectedIntB} `}
          <MethodIconText notooltip enabled small>
            B
          </MethodIconText>
        </Typography>
        <DataTable
          showGlobalFilter
          columns={evidenceColumns}
          rows={evidence}
          dataDownloader
          dataDownloaderFileStem={`${symbol}-molecular-interactions-evidence`}
          dataDownloaderColumns={evidenceColsExport}
          fixed
          noWrapHeader={false}
          rowsPerPageOptions={defaultRowsPerPageOptions}
        />
      </GridLegacy>
    </GridLegacy>
  );
}

export default ReactomeTab;
