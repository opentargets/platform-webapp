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
    <NoBorderTable>
      <thead>
        <tr>
          <StickyLeftTh>Column</StickyLeftTh>
          <th>Data Type</th>
          {/* <td></td>
          <td></td> */}
          <th>Description</th>
        </tr>
      </thead>
      <tbody>{schema}</tbody>
    </NoBorderTable>
  );
}

function buildSchema(obj, delimiter = "") {
  let schema = <></>;

  const DIVIDER = `${delimiter}│⎯`;
  const FIELD = getFieldProperty(obj);
  for (const column of obj[FIELD]) {
    let currentElement;
    const dataType = getDataType(column);
    const isPrimaryKey = isPrimaryColumn(column, obj.key);
    const isForeignKey = isForeignColumn(column);

    currentElement = (
      <tr>
        <StickyTd>
          <Box sx={{ display: "flex", gap: 2 }}>
            {DIVIDER}
            {column.name} <PrimaryKeyIcon isPrimaryKey={isPrimaryKey} />{" "}
            <ForeignKeyIcon isForeignKey={isForeignKey} />
          </Box>
        </StickyTd>
        <Box component="td" sx={{ whiteSpace: "nowrap" }}>
          {dataType}
        </Box>
        <td>
          <Box sx={{ whiteSpace: "nowrap" }}>{column.description}</Box>
        </td>
      </tr>
    );
    if (dataType.includes("Struct")) {
      const nestedSchema = buildSchema(column, `${delimiter}│⎯`);
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
    <Tooltip title="Primary Key">
      <Box sx={{ color: theme => theme.palette.primary.main }}>
        <FontAwesomeIcon icon={faKey} />
      </Box>
    </Tooltip>
  );
}

function ForeignKeyIcon({ isForeignKey }) {
  if (!isForeignKey) return;
  return (
    <Tooltip title={`Foreign Key: ${isForeignKey}`}>
      <Box sx={{ color: theme => theme.palette.primary.light }}>
        <FontAwesomeIcon icon={faNetworkWired} />
      </Box>
    </Tooltip>
  );
}

export default DownloadsSchemaBuilder;
