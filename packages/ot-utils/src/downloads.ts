import _ from "lodash";

const targetName = {
  id: "symbol",
  label: "Symbol",
  exportValue: (data) => data.target.approvedSymbol,
};

const diseaseName = {
  id: "disease",
  label: "Disease",
  exportValue: (data) => data.disease.name,
};

const asJSON = (columns, rows) => {
  const rowStrings = rows.map((row) =>
    columns.reduce((accumulator, newKey) => {
      if (newKey.exportValue === false) return accumulator;

      const newLabel = _.camelCase(newKey.exportLabel || newKey.label || newKey.id);

      accumulator[newLabel] = newKey.exportValue
        ? newKey.exportValue(row)
        : _.get(row, newKey.propertyPath || newKey.id, "");
      return accumulator;
    }, {})
  );

  return JSON.stringify(rowStrings);
};

const getHeaderString = ({ columns, quoteString, separator }) =>
  columns
    .reduce((headerString, column) => {
      if (column.exportValue === false) return headerString;

      const newLabel = quoteString(_.camelCase(column.exportLabel || column.label || column.id));

      headerString.push(newLabel);
      return headerString;
    }, [])
    .join(separator);

const asDSV = (columns, rows, separator = ",", quoteStrings = true) => {
  const quoteString = (d) => {
    let result = d;
    // converts arrays to strings
    if (Array.isArray(d)) {
      result = d.join(",");
    }
    return quoteStrings && typeof result === "string" ? `"${result}"` : result;
  };

  const lineSeparator = "\n";

  const headerString = getHeaderString({ columns, quoteString, separator });

  const rowStrings = rows
    .map((row) =>
      columns
        .reduce((rowString, column) => {
          if (column.exportValue === false) return rowString;

          const newValue = quoteString(
            column.exportValue
              ? column.exportValue(row)
              : _.get(row, column.propertyPath || column.id, "")
          );

          rowString.push(newValue);
          return rowString;
        }, [])
        .join(separator)
    )
    .join(lineSeparator);

  return [headerString, rowStrings].join(lineSeparator);
};

export const getRowsQuerySelector = (entityToGet) =>
  entityToGet === "target" ? "data.disease.associatedTargets" : "data.target.associatedDiseases";

export const getExportedColumns = (entityToGet, assocArr, prioArr, pinnedArr) => {
  const nameColumn = entityToGet === "target" ? targetName : diseaseName;
  let exportedColumns = [];

  if (pinnedArr.length > 0) {
    const isPinnedObj = [
      {
        id: "isPinned",
        exportValue: (data) =>
          pinnedArr.some((currentValue) => currentValue.id === data[entityToGet].id),
      },
    ];
    exportedColumns = [...exportedColumns, ...isPinnedObj];
  }

  const sources = assocArr.map(({ id }) => ({
    id,
    exportValue: (data) => {
      const datatypeScore = data.datasourceScores.find(
        (datasourceScore) => datasourceScore.componentId === id
      );
      return datatypeScore ? parseFloat(datatypeScore.score) : "No data";
    },
  }));

  exportedColumns = [...exportedColumns, ...sources];

  if (entityToGet === "target") {
    const prioritisationExportCols = prioArr.map(({ id }) => ({
      id,
      exportValue: (data) => {
        const prioritisationScore = data.target.prioritisation.items.find(
          (prioritisationItem) => prioritisationItem.key === id
        );
        return prioritisationScore ? parseFloat(prioritisationScore.value) : "No data";
      },
    }));

    exportedColumns = [...exportedColumns, ...prioritisationExportCols];
  }

  return [
    nameColumn,
    {
      id: "globalScore",
      label: "Global Score",
      exportValue: (data) => data.score,
    },
    ...exportedColumns,
  ];
};

export const getExportedPrioritisationColumns = (arr, pinnedArr, entityToGet) => {
  let exportedColumns = [];

  if (pinnedArr.length > 0) {
    const isPinnedObj = [
      {
        id: "isPinned",
        exportValue: (data) =>
          pinnedArr.some((currentValue) => currentValue.id === data[entityToGet].id),
      },
    ];
    exportedColumns = [...exportedColumns, ...isPinnedObj];
  }

  const prioritisationExportCols = arr.map(({ id }) => ({
    id,
    exportValue: (data) => {
      const prioritisationScore = data.target.prioritisation.items.find(
        (prioritisationItem) => prioritisationItem.key === id
      );
      return prioritisationScore ? parseFloat(prioritisationScore.value) : "No data";
    },
  }));

  exportedColumns = [...exportedColumns, ...prioritisationExportCols];

  return [
    targetName,
    {
      id: "globalScore",
      label: "Global Score",
      exportValue: (data) => data.score,
    },
    ...exportedColumns,
  ];
};

export const createBlob = (format) =>
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
  })[format];

export const getFilteredColumnArray = (selectArray, requestArray) => {
  const arr = selectArray.flatMap((ag) => requestArray.filter((e) => e.aggregation === ag));

  return arr.length > 0 ? arr : [];
};
