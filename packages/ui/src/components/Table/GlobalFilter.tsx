import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { GridLegacy, IconButton } from "@mui/material";
import { useEffect, useState } from "react";

import useDebounce from "../../hooks/useDebounce";
import { StyledGlobalFilterInput } from "./tableStyles";

// `initialValue`: the table's current filter (e.g. restored in a report), so the box shows it
function GlobalFilter({ onGlobalFilterChange, initialValue = "" }) {
  const [inputValue, setInputValue] = useState(initialValue);
  const debouncedInputValue = useDebounce(inputValue, 300);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleInputClean = () => {
    setInputValue("");
  };

  useEffect(
    () => {
      onGlobalFilterChange(debouncedInputValue);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedInputValue]
  );

  return (
    <GridLegacy container>
      <GridLegacy item xs={12}>
        <StyledGlobalFilterInput
          autoComplete="off"
          startAdornment={<FontAwesomeIcon icon={faMagnifyingGlass} />}
          endAdornment={
            !!inputValue && (
              <IconButton onClick={handleInputClean}>
                <FontAwesomeIcon icon={faXmark} />
              </IconButton>
            )
          }
          placeholder="Search"
          label="Filter"
          onChange={handleInputChange}
          value={inputValue}
        />
      </GridLegacy>
    </GridLegacy>
  );
}

export default GlobalFilter;
