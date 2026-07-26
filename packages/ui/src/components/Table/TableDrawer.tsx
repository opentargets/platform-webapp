import { faChevronDown, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  ButtonBase,
  Drawer,
  IconButton,
  List,
  ListItem,
  Paper,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { naLabel } from "@ot/constants";
import _ from "lodash";
import { useState } from "react";
import { v1 } from "uuid";

import Link from "../Link";

const StyledButtonBase = styled(ButtonBase)(({ theme }) => ({
  color: `${theme.palette.primary.main} !important`,
}));

const StyledBody = styled(Box)({
  overflowY: "overlay",
});

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  "& .MuiBackdrop-root": {
    opacity: "0 !important",
  },
  "& .MuiDrawer-paper": {
    backgroundColor: theme.palette.grey[300],
  },
}));

const StyledPaperTitle = styled(Paper)({
  borderBottom: "1px solid #ccc",
  padding: "1rem",
});

const StyledTitleCaption = styled(Typography)(({ theme }) => ({
  color: theme.palette.grey[700],
  fontSize: "1.2rem",
  fontWeight: "bold",
}));

const StyledAccordion = styled(Accordion)({
  border: "1px solid #ccc",
  margin: "1rem 1rem 0 1rem",
  padding: "1rem",
  "&::before": {
    backgroundColor: "transparent",
  },
  "&.Mui-expanded": {
    margin: "1rem !important",
  },
});

const StyledSummaryBox = styled(Box)({
  marginRight: "2rem",
});

const StyledAccordionTitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.grey[700],
  fontSize: "1rem",
  fontWeight: "bold",
}));

const StyledAccordionSubtitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.grey[400],
  fontSize: "0.8rem",
  fontStyle: "italic",
}));

function TableDrawer({ entries, message, caption = "Records", showSingle = true }) {
  const [open, setOpen] = useState(false);

  if (entries.length === 0 && message) {
    return message;
  }

  if (entries.length === 0) {
    return naLabel;
  }

  if (entries.length === 1 && showSingle) {
    return entries[0].url ? (
      <Link external to={entries[0].url}>
        {entries[0].name}
      </Link>
    ) : (
      (entries[0].name ?? naLabel)
    );
  }

  const toggleDrawer = (event) => {
    if (event.type === "keydown" && (event.key === "Tab" || event.key === "Shift")) {
      return;
    }

    setOpen(true);
  };

  const closeDrawer = () => {
    setOpen(false);
  };

  const groupedEntries = _.groupBy(entries, "group");

  const drawerContent = (
    <>
      <StyledPaperTitle elevation={0}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <StyledTitleCaption>{caption}</StyledTitleCaption>
          <IconButton onClick={closeDrawer}>
            <FontAwesomeIcon icon={faXmark} />
          </IconButton>
        </Box>
      </StyledPaperTitle>

      <StyledBody>
        {Object.keys(groupedEntries).map((group) => (
          <StyledAccordion
            elevation={0}
            key={group}
            defaultExpanded={
              groupedEntries[group].length < 10 || Object.keys(groupedEntries).length === 1
            }
          >
            <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
              <StyledSummaryBox>
                <StyledAccordionTitle>{group}</StyledAccordionTitle>
                <StyledAccordionSubtitle>
                  {groupedEntries[group].length} {caption}
                </StyledAccordionSubtitle>
              </StyledSummaryBox>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {groupedEntries[group].map((entry) => (
                  <ListItem key={v1()}>
                    {entry.url ? (
                      <Link external to={entry.url}>
                        {entry.name}
                      </Link>
                    ) : (
                      entry.name
                    )}
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </StyledAccordion>
        ))}
      </StyledBody>
    </>
  );

  return (
    <>
      <StyledButtonBase data-testid="table-drawer" onClick={toggleDrawer}>
        <Typography variant="body2"> {message || `${entries.length} entries`}</Typography>
      </StyledButtonBase>

      <StyledDrawer anchor="right" open={open} onClose={closeDrawer}>
        {drawerContent}
      </StyledDrawer>
    </>
  );
}

export default TableDrawer;
