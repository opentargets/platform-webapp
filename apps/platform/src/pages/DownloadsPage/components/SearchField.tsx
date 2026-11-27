import { useContext, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Box } from "ui";
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
  const lastDispatched = useRef(state.freeTextQuery);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const cancelPending = () => clearTimeout(timer.current);
  useEffect(() => cancelPending, []);

  // Somebody else changed the query (e.g. "Clear all"): mirror it in the field
  useEffect(() => {
    if (state.freeTextQuery !== lastDispatched.current) {
      cancelPending();
      lastDispatched.current = state.freeTextQuery;
      setValue(state.freeTextQuery);
    }
  }, [state.freeTextQuery]);

  // Schedule from the keystroke itself (not from a debounced value) so that
  // clearing and retyping the same text still reaches the reducer
  const handleChange = (next: string) => {
    setValue(next);
    cancelPending();
    timer.current = setTimeout(() => {
      if (next === lastDispatched.current) return;
      lastDispatched.current = next;
      dispatch(textSearch(next));
    }, DEBOUNCE_MS);
  };

  const filled = value.length > 0;

  const clear = () => {
    cancelPending();
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
        onChange={e => handleChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Escape" && filled) clear();
        }}
        placeholder="Search datasets"
        aria-label="Search datasets"
        data-testid="search-input"
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
          data-testid="search-clear"
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
