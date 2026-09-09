import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Input, InputAdornment } from "@mui/material";
import { type ReactElement, useEffect, useState } from "react";
import useDebounce from "../../hooks/useDebounce";
import type { OtTableSearchProps } from "./table.types";

/****************************************
 *      OT TABLE SEARCH COMPONENT       *
 * REDUCE RERENDER, ACCEPTS SETSTATE FN *
 *         SET DEBOUNCED VALUE          *
 ****************************************/

function OtTableSearch({
  setGlobalSearchTerm,
  placeholderText = "Search all columns...",
}: OtTableSearchProps): ReactElement {
  const [globalFilter, setGlobalFilter] = useState("");

  const debouncedTableSearchValue = useDebounce(globalFilter, 300);

  useEffect(() => {
    setGlobalSearchTerm(debouncedTableSearchValue);
  }, [debouncedTableSearchValue]);

  return (
    <Input
      inputProps={{
        "data-testid": "table-search-input",
      }}
      sx={{ width: 1 }}
      value={globalFilter ?? ""}
      onChange={(e) => setGlobalFilter(e.target.value)}
      placeholder={placeholderText}
      startAdornment={
        <InputAdornment position="start">
          <FontAwesomeIcon icon={faMagnifyingGlass} />
        </InputAdornment>
      }
    />
  );
}
export default OtTableSearch;
