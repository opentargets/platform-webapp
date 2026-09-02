import { useContext, useState } from "react";
import { Box, Dialog, DialogContent, DialogTitle, styled } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

import GlobalSearchList from "./GlobalSearchList";
import { defaultEntityFilterState, SearchContext, SearchInputProvider } from "./SearchContext";
import GlobalSearchInput from "./GlobalSearchInput";
import GlobalSearchFreeListItem from "./GlobalSearchFreeListItem";
import ErrorBoundary from "../ErrorBoundary";
import GlobalSearchEntityFilter from "./GlobalSearchEntityFilter";

const EscButton = styled("button")(({ theme }) => ({
  display: "block",
  alignSelf: "center",
  cursor: "pointer",
  padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
  margin: `0 ${theme.spacing(0.5)}`,
  borderRadius: theme.spacing(1),
  backgroundColor: theme.palette.grey[100],
  border: `1px solid ${theme.palette.grey[400]}`,
  "&:hover": {
    border: `1px solid ${theme.palette.primary.main}`,
    backgroundColor: `${theme.palette.primary.main.light}`,
  },
}));

function GlobalSearchDialog() {
  const { open, setOpen, setFilterState } = useContext(SearchContext);
  const [inputValue, setInputValue] = useState("");

  return (
    <Dialog
      open={open}
      role="searchbox"
      scroll="paper"
      tabIndex={0}
      onClose={() => {
        setOpen(false);
        setFilterState(defaultEntityFilterState);
      }}
      sx={{
        "& .MuiDialog-container": {
          alignItems: "start",
          "& .MuiPaper-root": {
            width: "80vw",
            maxWidth: "800px",
            borderRadius: theme => theme.spacing(0.5),
            margin: theme => theme.spacing(6),
          },
        },
      }}
    >
      <ErrorBoundary>
        <SearchInputProvider setValue={setInputValue}>
          <DialogTitle>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: theme => `${theme.spacing(3.5)}`,
                  color: theme => theme.palette.grey[500],
                }}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} size="xs" />
              </Box>
              <Box sx={{ display: "flex", flexGrow: "1" }}>
                <GlobalSearchInput />
              </Box>
              <Box>
                <EscButton
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setFilterState(defaultEntityFilterState);
                  }}
                >
                  esc
                </EscButton>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <GlobalSearchEntityFilter />
            <GlobalSearchFreeListItem />
            <GlobalSearchList inputValue={inputValue} />
          </DialogContent>
        </SearchInputProvider>
      </ErrorBoundary>
    </Dialog>
  );
}

export default GlobalSearchDialog;
