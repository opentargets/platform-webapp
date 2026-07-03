export function processData(
  data: BaselineExpressionRow[],
  datatypes: string[],
  groupByTissue: boolean
) {
  const [topLevelName, otherName] = groupByTissue ? ["tissue", "celltype"] : ["celltype", "tissue"];

  data = structuredClone(data);

  const firstLevel = []; // array of data rows - unique parent biosample ids
  const secondLevel = {}; // object of array of objects, top-level keys: biosampleIds, bottom-level keys: datatypeIds
  const thirdLevel = {}; // each entry is an array of data rows where datatypeId is always datatypes[0]
  const maxMedians = {}  // max median value for each datatype
 
  // 2nd and 3rd levels
  for (const row of data) {
    const topLevelBiosampleId = row[`${topLevelName}Biosample`]?.biosampleId;
    const otherBiosampleId = row[`${otherName}Biosample`]?.biosampleId;
    if (!topLevelBiosampleId) continue;
    if (!otherBiosampleId) {
      // 2nd level
      const topLevelBiosampleParentId = row[`${topLevelName}BiosampleParent`].biosampleId;
      secondLevel[topLevelBiosampleParentId] ??= {};
      const _secondLevelName = // will add to the original data row and the table row
        row[`${groupByTissue ? "tissue" : "celltype"}Biosample`].biosampleName;
      const _secondLevelId = row[`${groupByTissue ? "tissue" : "celltype"}Biosample`].biosampleId;
      row._secondLevelName = _secondLevelName;
      row._secondLevelId = _secondLevelId;
      if (!secondLevel[topLevelBiosampleParentId][topLevelBiosampleId]) {
        secondLevel[topLevelBiosampleParentId][topLevelBiosampleId] = {};
        Object.defineProperty(
          // so not enumerable
          secondLevel[topLevelBiosampleParentId][topLevelBiosampleId],
          "_secondLevelName",
          { value: _secondLevelName, writable: true }
        );
        Object.defineProperty(
          // so not enumerable
          secondLevel[topLevelBiosampleParentId][topLevelBiosampleId],
          "_secondLevelId",
          { value: _secondLevelId, writable: true }
        );
      }
      secondLevel[topLevelBiosampleParentId][topLevelBiosampleId][row.datatypeId] = row;
    } else {
      // 3rd level
      if (row.datatypeId !== datatypes[0]) {
        throw Error(`Expected all third level rows to have datatypeid '${datatypes[0]}'`);
      }
      thirdLevel[topLevelBiosampleId] ??= [];
      thirdLevel[topLevelBiosampleId].push(row);
    }
  }

  // convert 2nd level objects to arrays
  for (const [bioSampleId, obj] of Object.entries(secondLevel)) {
    secondLevel[bioSampleId] = Object.values(obj);
  }

  // add _normalisedMedian to each 2nd level object - normalised by max median per datatypeid
  {
    for (const datatype of datatypes) maxMedians[datatype] = 0;
    for (const arr of Object.values(secondLevel)) {
      for (const obj of arr) {
        for (const [datatypeId, row] of Object.entries(obj)) {
          if (maxMedians[datatypeId] < row.median) {
            maxMedians[datatypeId] = row.median;
          }
        }
      }
    }
    for (const arr of Object.values(secondLevel)) {
      for (const obj of arr) {
        for (const [datatypeId, row] of Object.entries(obj)) {
          row._normalisedMedian = row.median === null ? null : row.median / maxMedians[datatypeId];
        }
      }
    }
  }

  // 1st level and max specificity
  let maxSpecificity = {
    datatype: undefined,
    score: undefined,
    _firstLevelName: undefined,
    _firstLevelId: undefined,
  };
  for (const objects of Object.values(secondLevel)) {
    const firstLevelRow = {};
    for (const obj of objects) {
      for (const [datatypeId, row] of Object.entries(obj)) {
        const biosampleParent = row[`${groupByTissue ? "tissue" : "celltype"}BiosampleParent`];

        // create object if does not exist
        firstLevelRow[datatypeId] ??= {};

        // add first level name and id to first level row
        if (!firstLevelRow._firstLevelName) {
          Object.defineProperty(firstLevelRow, "_firstLevelName", {
            value: biosampleParent.biosampleName,
          });
          Object.defineProperty(firstLevelRow, "_firstLevelId", {
            value: biosampleParent.biosampleId,
          });
        }

        // also add first level name and id within per-datatype objects
        firstLevelRow[datatypeId]._firstLevelName ??= biosampleParent.biosampleName;
        firstLevelRow[datatypeId]._firstLevelId ??= biosampleParent.biosampleId;

        // units are same within a column
        firstLevelRow[datatypeId].unit ??= row.unit;

        // distribution score - same for all 2nd-level entries with same datatype
        firstLevelRow[datatypeId].distribution_score ??= row.distribution_score;

        // median
        const currentMedian = firstLevelRow[datatypeId]?.median;
        if (
          currentMedian === undefined ||
          (row.median !== null && (currentMedian === null || row.median > currentMedian))
        ) {
          firstLevelRow[datatypeId].median = row.median;
          firstLevelRow[datatypeId]._normalisedMedian = row._normalisedMedian;
          firstLevelRow[datatypeId]._secondLevelMedianName = row._secondLevelName;
          firstLevelRow[datatypeId]._secondLevelMedianId = row._secondLevelId;
        }

        // specificity
        const currentSpecificity = firstLevelRow[datatypeId].specificity_score;
        if (
          currentSpecificity === undefined ||
          (row.specificity_score !== null &&
            (currentSpecificity === null || row.specificity_score > currentSpecificity))
        ) {
          firstLevelRow[datatypeId].specificity_score = row.specificity_score;
          firstLevelRow[datatypeId]._secondLevelSpecificityName = row._secondLevelName;
          firstLevelRow[datatypeId]._secondLevelSpecificityId = row._secondLevelId;
          if (
            maxSpecificity.score === undefined ||
            (row.specificity_score !== null &&
              (maxSpecificity.score === null || row.specificity_score > maxSpecificity.score))
          ) {
            maxSpecificity = {
              datatype: datatypeId,
              score: row.specificity_score,
              _firstLevelName: firstLevelRow._firstLevelName,
              _firstLevelId: firstLevelRow._firstLevelId,
            };
          }
        }
      }
    }
    firstLevel.push(firstLevelRow);
  }
  Object.defineProperty(firstLevel, "_maxSpecificity", {
    value: maxSpecificity,
  });

  return { firstLevel, secondLevel, thirdLevel, maxMedians };
}
