import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Dialog, DialogContent, DialogTitle, styled } from "@mui/material";
import { useContext, useState } from "react";
import ErrorBoundary from "../ErrorBoundary";
import GlobalSearchEntityFilter from "./GlobalSearchEntityFilter";
import GlobalSearchFreeListItem from "./GlobalSearchFreeListItem";
import GlobalSearchInput from "./GlobalSearchInput";
import GlobalSearchList from "./GlobalSearchList";
import { defaultEntityFilterState, SearchContext, SearchInputProvider } from "./SearchContext";

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
      scroll="paper"
      tabIndex={0}
      onClose={() => {
        setOpen(false);
        setFilterState(defaultEntityFilterState);
      }}
      // MUI v7 restricts Dialog's own `role` prop to "dialog" | "alertdialog"
      // (both a TS type and a runtime PropTypes.oneOf check), but this dialog
      // is intentionally exposed as a searchbox for accessibility. `role`
      // ends up on the Paper slot internally regardless of which path sets
      // it, so overriding it via slotProps.paper reaches the same DOM
      // element without going through Dialog's own restricted prop.
      slotProps={{ paper: { role: "searchbox" } }}
      sx={{
        "& .MuiDialog-container": {
          alignItems: "start",
          "& .MuiPaper-root": {
            width: "80vw",
            maxWidth: "800px",
            borderRadius: (theme) => theme.spacing(0.5),
            margin: (theme) => theme.spacing(6),
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
                  fontSize: (theme) => `${theme.spacing(3.5)}`,
                  color: (theme) => theme.palette.grey[500],
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
