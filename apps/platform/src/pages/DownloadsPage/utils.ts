export const mapFile = (url) => {
  let format = "";
  const fileNameParts = url.split(".");

  if (fileNameParts[fileNameParts.length - 1].toLowerCase() === "gz") {
    fileNameParts.pop();
    format = "GZipped";
  }

  return [format, fileNameParts.pop().toUpperCase()].join(" ");
};

// export const mapIcon = name =>
// <FontAwesomeIcon
//   icon={
//     {
//       "Target list": faDna,
//       "Disease list": faStethoscope,
//     }[name] || faArchive
//   }
// />

export const buildSchema = (obj, delimiter = "") => {
  let schema = "";
  let descriptionArray = [];
  const DIVIDER = `\n${delimiter}│⎯`;
  const FIELD = getFieldProperty(obj);
  for (const column of obj[FIELD]) {
    const isPrimaryKey = isPrimaryColumn(column, obj.key);
    const dataType = getDataType(column);
    schema += `${DIVIDER}${column.name}${dataType}`;
    const descObj = {
      id: column["@id"],
      name: column.name,
      description: column.description,
    };
    descriptionArray.push(descObj);
    if (dataType.includes("Struct")) {
      const { schema: nestedSchema, descriptionArray: nestedDescriptionArray } =
        buildSchema(column, `${delimiter}│⎯`);
      schema += nestedSchema;
      descriptionArray = [...descriptionArray, ...nestedDescriptionArray];
    }
    if (isPrimaryKey) schema += `(primary key)`;
    if (isForeignColumn(column)) schema += `(foreign key)`;
  }
  return { schema, descriptionArray };
};

/**************************************************
 *       CHECK IF COLUMN ID IS PRIMARY KEY        *
 *       CHECKING IF ID EXIST IN THE OBJECT       *
 * @param                                         *
 *  columns: Record<string,unknown>               *
 *  primaryKeyObj: Array<Record<string,unknown>   *
 * @return:                                       *
 *  boolean                                       *
 **************************************************/

export const isPrimaryColumn = (column, primaryKey = {}) => {
  const primaryKeyArray = Array.isArray(primaryKey) ? primaryKey : [primaryKey];
  if (!primaryKeyArray.length) return false;
  return primaryKeyArray.some((e) => e["@id"] === column["@id"]);
};

/**************************************************
 *       CHECK IF COLUMN ID IS FOREIGN KEY        *
 * CHECK "references" KEY EXIST IN COLUMN OBJECT  *
 * "references" is field inside a single column-  *
 * -object, if key exist, it most likely means    *
 * it contains reference to the original location *
 * @param                                         *
 *  columns: Record<string,unknown>               *
 * @return:                                       *
 *  boolean | string                              *
 * @example                                       *
 *  "drug_molecule/id" -> foreign key             *
 *  false              -> no foreign key          *
 **************************************************/

export const isForeignColumn = (column) => {
  if (Object.hasOwn(column, "references")) {
    return column["references"]["field"]["@id"];
  }
  return false;
};

/********************************************************************
 *             RETURNS THE TYPE OF DATA COLUMN CONTAINS             *
 *             A COLUMN CAN BE A LIST OF THE GIVEN TYPE             *
 *           LIST IS DECIDED BY BOOLEAN FIELD "REPEATED"            *
 * IF COLUMN HAS FIELD "SUBFIELD", THEN IT IS STRUCT(CUSTOM OBJECT) *
 *   IF COLUMN HAS FIELD "DATATYPE", THEN DATATYPE IS A PRIMITIVE
 * @params                                                          *
 *  column: Record<string, unknown>                                 *
 * @returns                                                         *
 *  string
 * @example:
 *    []<Struct>  -> Array of object                                *
 *    <Text>  -> String                                             *
 ********************************************************************/

export const getDataType = (column) => {
  let dataType = "";
  const primitiveType = isPrimitive(column);
  const structType = isStruct(column);
  if (isTypeArray(column)) {
    dataType += "Array[";
  }
  if (primitiveType) {
    dataType += `${primitiveType}`;
  }
  if (structType) {
    dataType += `${structType}`;
  }
  if (isTypeArray(column)) {
    dataType += "]";
  }
  if (!dataType) return "<Unknown>";
  return dataType;
};

/***********************************
 * CHECK IF COLUMN IS A LIST/ARRAY  *
 * @params                          *
 *  column: Record<string, unknown> *
 * @returns                         *
 *  boolean                         *
 * @example                         *
 *  true -> is array                *
 *  false -> not an array           *
 ***********************************/

export const isTypeArray = (column) => {
  return Object.hasOwn(column, "repeated") && column.repeated;
};

/******************************************
 * CHECK IF COLUMN DATA TYPE IS PRIMITIVE *
 * @params                                *
 *  column: Record<string, unknown>       *
 * @returns                               *
 *  string                                *
 * @example                               *
 *  Text, Float, Boolean, Integer         *
 ******************************************/

export const isPrimitive = (column) => {
  if (Object.hasOwn(column, "dataType")) {
    const primitiveType = column.dataType.split(":");
    return primitiveType[1];
  }
  return false;
};

/******************************************
 * CHECK IF COLUMN DATA TYPE IS STRUCT    *
 * IF COLUMN CONTAINS KEY "subField"      *
 * @params                                *
 *  column: Record<string, unknown>       *
 * @returns                               *
 *  string | boolean                      *
 * @example                               *
 *  Struct -> column.subField exist       *
 *  false -> column.subField don't exist  *
 ******************************************/

export const isStruct = (column) => {
  if (Object.hasOwn(column, "subField")) {
    return "Struct";
  }
  return false;
};

/*************************************************************
 *  CHECK IF COLUMN IS FIRST LEVEL COLUMN OR NESTED OBJECT   *
 * IF COLUMN HAS KEY CALLED "SUBFIELD" IT IS A NESTED OBJECT *
 * @params                                                   *
 *  column: Record<string, unknown>                          *
 * @return                                                   *
 *  string <field | subfield>                                *
 *************************************************************/

export const getFieldProperty = (column) => {
  if (Object.hasOwn(column, "subField")) {
    return "subField";
  }
  if (Object.hasOwn(column, "field")) {
    return "field";
  }
  return;
};

/**********************************************
 * REMOVE CATEGORIES FROM DESCRIPTION         *
 *    AND ADD IT TO COLUMN OBJECT             *
 * @param                                     *
 *  column: Record<string, unknown>           *
 *  column: {...otherKeys,
 *            description:"desc [Target]" }   *
 * @return                                    *
 *  column: Record<string, unknown>           *
 * @example                                   *
 *  column: {...otherKeys,                    *
 *            description:"desc",             *
 *            category: [Target] }            *
 *********************************************/

export const addCategoriesToData = (data) => {
  const results = new Set();
  const newData = [];
  for (const item of data) {
    const categories = item.description.match(/\[(.*?)\]/);
    item.categories = [];
    if (categories && categories[0] !== "[]") {
      item.categories = [...categories[1].split(", ")];
      item.description = item.description.replace(categories[0], "");
      results.add(...categories[1].split(","));
    }
    newData.push(item);
  }
  return { allDisplayRows: newData, allUniqueCategories: [...results] };
};

/************************************
 * RETURN ALL ROWS TO DISPLAY ON UI *
 *     SORT THEM ALPHABETICALLY     *
 ************************************/

export function prepareDataRows(data) {
  if (!data) return [];
  const fileSetRows = getFileSetsRows(data);
  const recordSetRows = getRecordSetsRows(data);
  const newRows = [];
  for (const fileRow of fileSetRows) {
    const recordRow = recordSetRows.find(
      (e) => `${e["@id"]}-fileset` === fileRow["@id"]
    );
    if (!recordRow) {
      console.log("No matching FileSet for RecordSet: ", fileRow);
      newRows.push({ ...fileRow });
    } else {
      newRows.push({ ...fileRow, description: recordRow.description });
    }
  }
  return newRows;
}

export function getFileSetsRows(data) {
  if (!data) return [];
  return data.distribution
    .filter((e) => e["@type"] === "cr:FileSet")
    .sort((a, b) => {
      if (a.name > b.name) return 1;
      else if (a.name < b.name) return -1;
      return 0;
    });
}

export function getRecordSetsRows(data) {
  if (!data) return [];
  return data.recordSet
    .filter((e) => e["@type"] === "cr:RecordSet")
    .sort((a, b) => {
      if (a.name > b.name) return 1;
      else if (a.name < b.name) return -1;
      return 0;
    });
}

/***************************************************
 * RETURN ROWS FROM DATA THAT CONTAINS INFORMATION *
 *         ABOUT SCHEMA AND DATA SET INFO          *
 ***************************************************/

export function getSchemaRows(data) {
  if (!data) return [];
  return data.recordSet;
}

/********************************************
 * FILTER AND RETURN LIST ITEM THAT MATCHES *
 *              THE TEXT QUERY              *
 *     KEYS TO FILTER ARE NAME AND DSEC     *
 ********************************************/

export function filterDownloadCardsForTextSearch(freeQueryText, data) {
  if (!freeQueryText || !data || !data.length) return;
  return data.filter(
    (e) =>
      e.description.toLowerCase().includes(freeQueryText.toLowerCase()) ||
      e.name.toLowerCase().includes(freeQueryText.toLowerCase())
  );
}

/**********************************************
 * FILTER AND RETURN LIST ITEM WHOSE CATEGORY *
 *          MATCHES THE SELECTED FILTERS      *
 ********************************************/

export function filterDownloadCardsForFilter(values, data) {
  if (!values || !values.length || !data || !data.length) return;
  const filteredValues = data.filter((item) =>
    item.categories.some((e) => values.includes(e))
  );
  return filteredValues;
}

/****************************************************************************************************
 * GOES THROUGH FILE OBJECT TYPE IN DATA AND GET THE LOCATION URL ASSOCIATED TO THEM                *
 * @param                                                                                           *
 *  data : Record<string,unknown>                                                                   *
 * @return                                                                                          *
 *  locationObj : Record<string, string>                                                            *
 * @example:                                                                                        *
 *  @input                                                                                          *
 *  data: { "distribution": [{                                                                      *
 *         "@type": "cr:FileObject",                                                                *
 *         "@id": "ftp-location",                                                                   *
 *         "contentUrl": "ftp://ftp.ebi.ac.uk/pub/databases/opentargets/platform/25.06/output", }]} *
 * @output: {                                                                                       *
 * "ftp-location": "ftp://ftp.ebi.ac.uk/pub/databases/opentargets/platform/25.06/output"}           *
 ***************************************************************************************************/

export function getAllLocationUrl(data) {
  if (!data) return "";
  const locationObj = {};
  const locationArray = data.distribution.filter(
    (e) => e["@type"] === "cr:FileObject"
  );
  locationArray.map((e) => {
    locationObj[e["@id"]] = e.contentUrl;
  });
  return locationObj;
}
