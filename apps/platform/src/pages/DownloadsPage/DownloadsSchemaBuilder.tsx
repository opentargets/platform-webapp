import { faKey, faNetworkWired } from "@fortawesome/free-solid-svg-icons";
import { Tooltip, Box } from "ui";
import { FontAwesomeIconPadded } from "ui/src/components/OtTable/otTableLayout";
import { getDataType, getFieldProperty, isForeignColumn, isPrimaryColumn } from "./utils";
import { styled } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const StickyLeftTh = styled("th")(({ theme }) => ({
  left: "0",
  position: "sticky",
  backgroundColor: theme.palette.grey[200],
  zIndex: 1,
  textAlign: "left",
  whiteSpace: "nowrap",
  mr: 2,
  borderRight: `1px solid ${theme.palette.grey[300]}`,
}));

const StickyTd = styled("td")(({ theme }) => ({
  left: "0",
  position: "sticky",
  backgroundColor: theme.palette.grey[200],
  zIndex: 1,
  borderRight: `1px solid ${theme.palette.grey[300]}`,
}));

const NoBorderTable = styled("table")(({ theme }) => ({
  border: "none",
  padding: 0,
  margin: 0,
  borderSpacing: 0,
  "& thead, & tbody": {
    "& tr": {
      "& td, & th": {
        padding: "3px 5px",
        textAlign: "left",
        whiteSpace: "nowrap",
        mr: 2,
      },
    },
  },
}));

function DownloadsSchemaBuilder({ data }) {
  const schema = buildSchema(data);
  return (
    <NoBorderTable data-testid="schema-table">
      <thead>
        <tr>
          <StickyLeftTh data-testid="schema-header">Column</StickyLeftTh>
          <th data-testid="schema-header">Data Type</th>
          {/* <td></td>
          <td></td> */}
          <th data-testid="schema-header">Description</th>
        </tr>
      </thead>
      <tbody>{schema}</tbody>
    </NoBorderTable>
  );
}

function buildSchema(obj, delimiter = "", path = "") {
  let schema = <></>;

  const DIVIDER = `${delimiter}│⎯`;
  const FIELD = getFieldProperty(obj);
  for (const column of obj[FIELD]) {
    let currentElement;
    const dataType = getDataType(column);
    const isPrimaryKey = isPrimaryColumn(column, obj.key);
    const isForeignKey = isForeignColumn(column);
    // dotted path of the column, e.g. `genomicLocation.chromosome`
    const columnPath = path ? `${path}.${column.name}` : column.name;

    currentElement = (
      <tr data-testid={`schema-row-${columnPath}`}>
        <StickyTd data-testid="schema-column-name">
          <Box sx={{ display: "flex", gap: 2 }}>
            {DIVIDER}
            {column.name} <PrimaryKeyIcon isPrimaryKey={isPrimaryKey} />{" "}
            <ForeignKeyIcon isForeignKey={isForeignKey} />
          </Box>
        </StickyTd>
        <Box component="td" data-testid="schema-column-type" sx={{ whiteSpace: "nowrap" }}>
          {dataType}
        </Box>
        <td data-testid="schema-column-description">
          <Box sx={{ whiteSpace: "nowrap" }}>{column.description}</Box>
        </td>
      </tr>
    );
    if (dataType.includes("Struct")) {
      const nestedSchema = buildSchema(column, `${delimiter}│⎯`, columnPath);
      currentElement = (
        <>
          {currentElement}
          {nestedSchema}
        </>
      );
    }
    schema = (
      <>
        {schema}
        {currentElement}
      </>
    );
  }
  return schema;
}

function PrimaryKeyIcon({ isPrimaryKey }) {
  if (!isPrimaryKey) return;
  return (
    <Tooltip
      title="Primary Key"
      slotProps={{ tooltip: { "data-testid": "schema-key-tooltip" } as object }}
    >
      <Box data-testid="schema-primary-key" sx={{ color: theme => theme.palette.primary.main }}>
        <FontAwesomeIcon icon={faKey} />
      </Box>
    </Tooltip>
  );
}

function ForeignKeyIcon({ isForeignKey }) {
  if (!isForeignKey) return;
  return (
    <Tooltip
      title={`Foreign Key: ${isForeignKey}`}
      slotProps={{ tooltip: { "data-testid": "schema-key-tooltip" } as object }}
    >
      <Box data-testid="schema-foreign-key" sx={{ color: theme => theme.palette.primary.light }}>
        <FontAwesomeIcon icon={faNetworkWired} />
      </Box>
    </Tooltip>
  );
}

export default DownloadsSchemaBuilder;
