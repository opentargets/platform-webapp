import { useEffect, useContext } from "react";
import { Box, styled, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

import GlobalSearchDialog from "./GlobalSearchDialog";
import { SearchContext } from "./SearchContext";

const SearchButton = styled("button")(({ theme, isHomePage = false }) => ({
  cursor: "pointer",
  width: "100%",
  maxWidth: isHomePage ? "90%" : "400px",
  background: isHomePage ? "#F0F0F0" : theme.palette.secondary.main,
  color: isHomePage ? "inherit" : "white",
  borderRadius: theme.spacing(0.6),
  border: isHomePage ? `1px solid #F0F0F0` : `1px solid ${theme.palette.secondary.main}`,
  padding: isHomePage ? theme.spacing(1) : theme.spacing(0.3),
}));

function GlobalSearch({ isHomePage }) {
  const { setOpen } = useContext(SearchContext);
  const shortcutText = navigator?.platform.indexOf("Mac") > -1 ? "⌘ K" : "Ctrl+K";
  const searchButtonContainer = {
    width: 1,
    display: "flex",
    justifyContent: "center",
    ...(isHomePage && {
      margin: theme => `${theme.spacing(5)} 0 ${theme.spacing(5)}`,
    }),
  };

  function monitorCmdK(event) {
    // open on cmd + k
    if (event.metaKey === true && event.code === "KeyK") {
      event.stopPropagation();
      event.preventDefault();
      setOpen(true);
    }
  }

  useEffect(() => {
    document.addEventListener("keydown", monitorCmdK);
    return () => {
      document.removeEventListener("keydown", monitorCmdK);
    };
  }, []);

  return (
    <Box sx={searchButtonContainer}>
      <SearchButton
        isHomePage={isHomePage}
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            typography: "subtitle1",
            alignItems: "center",
            lineHeight: "normal",
          }}
        >
          <Box
            sx={{ paddingLeft: theme => theme.spacing(1), display: "flex", alignItems: "center" }}
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} size="xs" />
            <Typography data-testid="global-search-input-trigger" sx={{ ml: 2 }}>Search...</Typography>
          </Box>
          <Box
            sx={{
              typography: "caption",
              fontWeight: "bold",
              color: theme => (isHomePage ? theme.palette.text : "white"),
              backgroundColor: theme => (isHomePage ? "#CECECE" : "#235d89"),
              padding: theme => `${theme.spacing(0.2)} ${theme.spacing(1)}`,
              borderRadius: theme => theme.spacing(0.4),
            }}
          >
            {shortcutText}
          </Box>
        </Box>
      </SearchButton>

      <GlobalSearchDialog />
    </Box>
  );
}

export default GlobalSearch;
