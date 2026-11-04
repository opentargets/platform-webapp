import { useContext, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Box, useDebounce } from "ui";
import { DownloadsContext } from "../context/DownloadsContext";
import { textSearch } from "../context/downloadsActions";
import { CONTROL_BORDER, RADIUS } from "./tokens";

interface SearchFieldProps {
  width?: number | string;
}

const DEBOUNCE_MS = 250;

/**
 * Debounced free-text search over dataset names, ids and descriptions.
 * Typing updates the field at once; the reducer only hears about it after
 * a short pause.
 */
function SearchField({ width = 260 }: SearchFieldProps) {
  const { state, dispatch } = useContext(DownloadsContext);
  const [value, setValue] = useState(state.freeTextQuery);
  const debounced = useDebounce(value, DEBOUNCE_MS);
  const lastDispatched = useRef(state.freeTextQuery);

  useEffect(() => {
    if (debounced === lastDispatched.current) return;
    lastDispatched.current = debounced;
    dispatch(textSearch(debounced));
  }, [debounced, dispatch]);

  // Somebody else changed the query (e.g. "Clear all"): mirror it in the field
  useEffect(() => {
    if (state.freeTextQuery !== lastDispatched.current) {
      lastDispatched.current = state.freeTextQuery;
      setValue(state.freeTextQuery);
    }
  }, [state.freeTextQuery]);

  const filled = value.length > 0;

  const clear = () => {
    setValue("");
    lastDispatched.current = "";
    dispatch(textSearch(""));
  };

  return (
    <Box
      sx={theme => ({
        display: "flex",
        alignItems: "center",
        gap: 1,
        width,
        maxWidth: "100%",
        padding: "6px 10px",
        borderRadius: RADIUS,
        backgroundColor: "#fff",
        border: `1px solid ${filled ? theme.palette.primary.dark : CONTROL_BORDER}`,
        "&:focus-within": {
          outline: `2px solid ${theme.palette.primary.light}`,
          outlineOffset: 1,
        },
      })}
    >
      <Box
        component="span"
        aria-hidden
        sx={theme => ({ display: "inline-flex", flex: "none", fontSize: 12, color: theme.palette.grey[500] })}
      >
        <FontAwesomeIcon icon={faMagnifyingGlass} />
      </Box>
      <Box
        component="input"
        type="search"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Escape" && filled) clear();
        }}
        placeholder="Search datasets"
        aria-label="Search datasets"
        sx={theme => ({
          flex: 1,
          minWidth: 0,
          border: 0,
          outline: "none",
          background: "transparent",
          font: "inherit",
          fontSize: ".8125rem",
          lineHeight: 1.3,
          color: theme.palette.text.primary,
          "&::placeholder": { color: theme.palette.grey[500], opacity: 1 },
          "&::-webkit-search-cancel-button": { display: "none" },
        })}
      />
      {filled && (
        <Box
          component="button"
          type="button"
          onClick={clear}
          aria-label="Clear search"
          sx={theme => ({
            display: "inline-flex",
            border: 0,
            padding: 0,
            background: "none",
            cursor: "pointer",
            fontSize: ".8125rem",
            color: theme.palette.grey[600],
            "&:hover": { color: theme.palette.text.primary },
          })}
        >
          <FontAwesomeIcon icon={faXmark} />
        </Box>
      )}
    </Box>
  );
}

export default SearchField;
