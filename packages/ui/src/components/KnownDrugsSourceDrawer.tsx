import { faChevronDown, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  ButtonBase,
  Drawer,
  IconButton,
  List,
  ListItem,
  Paper,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import _ from "lodash";
import { type ReactNode, useState } from "react";

import { Link } from "ui";

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

const tableSourceLabel = (name: string) =>
  ({
    ATC: "ATC",
    ClinicalTrials: "ClinicalTrials.gov",
    DailyMed: "DailyMed",
    FDA: "FDA",
    EMA: "European Medicines Agency",
    INN: "International Nonproprietary Names",
    USAN: "United States Adopted Name",
  })[name];

const drawerSourceLabel = (name: string, url: string) => {
  if (name === "ClinicalTrials") {
    return url.split("%22")[1] || `${tableSourceLabel(name)} reference`;
  }
  if (name === "DailyMed") {
    return url.split("setid=")[1] || `${tableSourceLabel(name)} reference`;
  }
  if (name === "FDA") {
    return url.split("set_id:")[1] || `${tableSourceLabel(name)} reference`;
  }
  if (name === "ATC") {
    return url.split("code=")[1] || `${tableSourceLabel(name)} reference`;
  }
  return `${name} entry`;
};

type Reference = {
  __typename: string;
  name: string;
  url: string;
};

type KnownDrugsSourceDrawerProps = {
  references: Reference[];
};

function KnownDrugsSourceDrawer({ references }: KnownDrugsSourceDrawerProps): ReactNode {
  const [open, setOpen] = useState(false);

  if (references.length === 0) {
    return "N/A";
  }

  if (references.length === 1) {
    return (
      <Link external to={references[0].url}>
        {tableSourceLabel(references[0].name)}
      </Link>
    );
  }

  const groupedReferences: Record<string, Reference[]> = _.groupBy(references, "name");

  const toggleDrawer: React.MouseEventHandler = (event) => {
    if (
      event.type === "keydown" &&
      ((event as unknown as KeyboardEvent).key === "Tab" ||
        (event as unknown as KeyboardEvent).key === "Shift")
    ) {
      return;
    }

    setOpen(true);
  };

  const closeDrawer = () => {
    setOpen(false);
  };

  const drawerContent = (
    <>
      <StyledPaperTitle elevation={0}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <StyledTitleCaption>Records</StyledTitleCaption>
          <IconButton onClick={closeDrawer}>
            <FontAwesomeIcon icon={faXmark} />
          </IconButton>
        </Box>
      </StyledPaperTitle>

      <StyledBody>
        {Object.keys(groupedReferences).map((group) => (
          <StyledAccordion
            elevation={0}
            key={group}
            defaultExpanded={
              groupedReferences[group].length < 10 || Object.keys(groupedReferences).length === 1
            }
          >
            <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
              <StyledSummaryBox>
                <StyledAccordionTitle>{tableSourceLabel(group)}</StyledAccordionTitle>
                <StyledAccordionSubtitle>
                  {groupedReferences[group].length} references
                </StyledAccordionSubtitle>
              </StyledSummaryBox>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {groupedReferences[group].map((item: Reference) => (
                  <ListItem key={item.url}>
                    <Link external to={item.url}>
                      {drawerSourceLabel(item.name, item.url)}
                    </Link>
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
      <StyledButtonBase onClick={toggleDrawer}>
        <Typography variant="body2">{references.length} references </Typography>
      </StyledButtonBase>

      <StyledDrawer anchor="right" open={open} onClose={closeDrawer}>
        {drawerContent}
      </StyledDrawer>
    </>
  );
}

export default KnownDrugsSourceDrawer;
