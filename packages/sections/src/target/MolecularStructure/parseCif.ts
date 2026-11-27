/*
Takes a CIF string and returns the parsed data as an object with an entry for
each data block in the file.

Notes:
  - all values in returned data are strings
  - a loop in the CIF file has a property for each header in the data - the
    value of the property is an array
  - does not vaildate the CIF file - assumes it is valid
  - no special handling of "?" for missing values or ." for intentionally
    omitted values (so these characters will appear as data values)
  - does not handle square brackets - which can be used for same/similar purpose
    to semicolons
  - assumes each data block has a block code (i.e. name) but I think codes are
    optional in CIF (i.e. can use just data_ for a block)
*/

export function parseCif(cifString: string) {
  const data = {};
  let blockData: {};
  let multilineMode = false;
  let multilineName: null | string;
  let multilineValue = "";
  let loopMode = false;
  let loopHeaders = [];
  let loopData = [];
  let loopRow = [];

  function closeLoopIfOpen() {
    if (loopMode) {
      for (const header of loopHeaders) {
        blockData[header] = [];
      }
      for (const row of loopData) {
        for (const [index, header] of loopHeaders.entries()) {
          blockData[header].push(row[index]);
        }
      }
    }
    loopMode = false;
    loopHeaders = [];
    loopData = [];
    loopRow = [];
  }

  function splitLoopValues(line) {
    const values = line.match(/(?:(?:[^\s"']+|'[^']+'|"[^"]+"))+/g);
    for (const [index, value] of values.entries()) {
      if (value[0] === "'" || value[0] === '"') {
        values[index] = value.slice(1, -1);
      }
    }
    return values;
  }

  function addLoopRowIfComplete() {
    if (loopRow.length === loopHeaders.length) {
      loopData.push(loopRow);
      loopRow = [];
    }
  }

  const lines = cifString.split(/\r?\n/);

  for (let line of lines) {
    // inside multiline value
    if (multilineMode) {
      if (line.startsWith(";")) {
        // close mulitline
        if (loopMode) {
          loopRow.push(multilineValue);
          addLoopRowIfComplete();
        } else {
          blockData[multilineName] = multilineValue;
        }
        multilineMode = false;
        multilineName = null;
        multilineValue = "";
      } else {
        // add to multiline value
        multilineValue += line;
      }
      continue;
    }

    // open multiline value
    if (line.startsWith(";")) {
      multilineMode = true;
      multilineValue = line.slice(1);
      continue;
    }

    // new block
    if (line.startsWith("data_")) {
      closeLoopIfOpen();
      blockData = {};
      data[line.replace("data_", "")] = blockData;
      continue;
    }

    // can safely trim whitespace now
    line = line.trim();

    // skip empty and comment lines
    if (!line || line.startsWith("#")) {
      continue;
    }

    if (line.startsWith("_")) {
      if (loopMode && loopData.length === 0) {
        loopHeaders.push(line);
      } else {
        // field - split at first space only since field value could be quoted with spaces
        closeLoopIfOpen();
        // (no space at all means the value is on the following lines)
        const firstSpace = line.search(/\s+/);
        const fieldName = firstSpace === -1 ? line : line.slice(0, firstSpace);
        let fieldValue = firstSpace === -1 ? "" : line.slice(firstSpace).trim();
        if (fieldValue) {
          const [start, end] = [fieldValue[0], fieldValue.at(-1)];
          if ((start === '"' && end === '"') || (start === "'" && end === "'")) {
            fieldValue = fieldValue.slice(1, -1);
          }
          blockData[fieldName] = fieldValue;
        } else {
          // multilinemode will be set to true next line
          multilineName = fieldName;
        }
      }
      continue;
    }

    // open loop
    if (line.startsWith("loop_")) {
      closeLoopIfOpen();
      loopMode = true;
      continue;
    }

    // inside a loop
    if (loopMode) {
      // must be values since know line does not start with "_" or "loop_"
      loopRow.push(...splitLoopValues(line));
      addLoopRowIfComplete();
      continue;
    }
  }

  closeLoopIfOpen();

  return data;
}
