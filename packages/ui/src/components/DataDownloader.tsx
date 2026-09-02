import _ from "lodash";
import { useState } from "react";
import FileSaver from "file-saver";
import { makeStyles } from "@mui/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCode, faFileArrowDown, faTable } from "@fortawesome/free-solid-svg-icons";
import {
  Button,
  CircularProgress,
  Snackbar,
  Slide,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
} from "@mui/material";
import "graphiql/graphiql.min.css";
import ApiPlaygroundDrawer from "./ApiPlaygroundDrawer";

const asJSON = (columns, rows) => {
  const rowStrings = rows.map(row =>
    columns.reduce((accumulator, newKey) => {
      if (newKey.exportValue === false) return accumulator;

      const newLabel = _.camelCase(newKey.exportLabel || newKey.label || newKey.id);

      return {
        ...accumulator,
        [newLabel]: newKey.exportValue
          ? newKey.exportValue(row)
          : _.get(row, newKey.propertyPath || newKey.id, ""),
      };
    }, {})
  );

  return JSON.stringify(rowStrings);
};

const asDSV = (columns, rows, separator = ",", quoteStrings = true) => {
  const quoteString = d => {
    let result = d;
    // converts arrays to strings
    if (Array.isArray(d)) {
      result = d.join(",");
    }
    return quoteStrings && typeof result === "string" ? `"${result}"` : result;
  };

  const lineSeparator = "\n";

  const headerString = columns
    .reduce((accHeaderString, column) => {
      if (column.exportValue === false) return accHeaderString;

      const newLabel = quoteString(_.camelCase(column.exportLabel || column.label || column.id));

      return [...accHeaderString, newLabel];
    }, [])
    .join(separator);

  const rowStrings = rows
    .map(row =>
      columns
        .reduce((rowString, column) => {
          if (column.exportValue === false) return rowString;

          const newValue = quoteString(
            column.exportValue
              ? column.exportValue(row)
              : _.get(row, column.propertyPath || column.id, "")
          );

          return [...rowString, newValue];
        }, [])
        .join(separator)
    )
    .join(lineSeparator);

  return [headerString, rowStrings].join(lineSeparator);
};

const createBlob = format =>
  ({
    json: (columns, rows) =>
      new Blob([asJSON(columns, rows)], {
        type: "application/json;charset=utf-8",
      }),
    csv: (columns, rows) =>
      new Blob([asDSV(columns, rows)], {
        type: "text/csv;charset=utf-8",
      }),
    tsv: (columns, rows) =>
      new Blob([asDSV(columns, rows, "\t", false)], {
        type: "text/tab-separated-values;charset=utf-8",
      }),
  }[format]);

const styles = makeStyles(theme => ({
  messageProgress: {
    marginRight: "1rem",
    color: "white !important",
  },
  snackbarContentMessage: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    padding: ".75rem 1rem",
    width: "100%",
  },
  snackbarContentRoot: {
    padding: 0,
  },
}));

function DataDownloader({ columns, rows, fileStem, query, variables, btnLabel = "Export" }) {
  const [downloading, setDownloading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const classes = styles();
  const open = Boolean(anchorEl);

  const handleClickExportButton = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const downloadData = async (format, dataColumns, dataRows, dataFileStem) => {
    let allRows = dataRows;

    if (typeof dataRows === "function") {
      setDownloading(true);
      allRows = await dataRows();
      setDownloading(false);
    }

    if (!allRows || allRows.length === 0) {
      return;
    }

    const blob = createBlob(format)(dataColumns, allRows);

    FileSaver.saveAs(blob, `${dataFileStem}.${format}`, { autoBOM: false });
  };

  const handleClickDownloadJSON = async () => {
    downloadData("json", columns, rows, fileStem);
    handleClose();
  };

  const handleClickDownloadTSV = async () => {
    downloadData("tsv", columns, rows, fileStem);
    handleClose();
  };

  return (
    <>
      <Box data-testid="data-downloader">
        <Button
          aria-controls={open ? "basic-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          onClick={handleClickExportButton}
          sx={{ display: "flex", gap: 1 }}
          variant="outlined"
        >
          <FontAwesomeIcon icon={faFileArrowDown} /> {btnLabel}
        </Button>
      </Box>
      {query ? <ApiPlaygroundDrawer query={query} variables={variables} /> : null}

      <Menu id="export-data-menu" anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={handleClickDownloadJSON}>
          <ListItemIcon>
            <FontAwesomeIcon icon={faCode} size="sm" />
          </ListItemIcon>
          <ListItemText>
            <Typography noWrap variant="body2">
              Json
            </Typography>
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={handleClickDownloadTSV}>
          <ListItemIcon>
            <FontAwesomeIcon icon={faTable} size="sm" />
          </ListItemIcon>
          <ListItemText>
            <Typography noWrap variant="body2">
              TSV
            </Typography>
          </ListItemText>
        </MenuItem>
        <Box sx={{ typography: "caption", px: 2 }}>
          * Column settings and filters will not affect export
        </Box>
      </Menu>

      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        open={downloading}
        TransitionComponent={Slide}
        ContentProps={{
          classes: {
            root: classes.snackbarContentRoot,
            message: classes.snackbarContentMessage,
          },
        }}
        message={
          <>
            <CircularProgress className={classes.messageProgress} />
            Preparing data...
          </>
        }
      />
    </>
  );
}

export default DataDownloader;
