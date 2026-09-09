import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { GridLegacy, IconButton } from "@mui/material";
import { useEffect, useState } from "react";

import useDebounce from "../../hooks/useDebounce";
import { StyledGlobalFilterInput } from "./tableStyles";

function GlobalFilter({ onGlobalFilterChange }) {
  const [inputValue, setInputValue] = useState("");
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
