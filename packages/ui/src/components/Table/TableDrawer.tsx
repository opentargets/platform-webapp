import { useState } from "react";
import {
  AccordionSummary,
  AccordionDetails,
  Accordion,
  Box,
  IconButton,
  List,
  ListItem,
  Drawer,
  Typography,
  Paper,
  Button,
  ButtonBase,
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import { faXmark, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import _ from "lodash";
import { v1 } from "uuid";
import { naLabel } from "@ot/constants";

import Link from "../Link";

const sourceDrawerStyles = makeStyles(theme => ({
  drawerLink: {
    color: `${theme.palette.primary.main} !important`,
  },
  drawerBody: {
    overflowY: "overlay",
  },
  drawerModal: {
    "& .MuiBackdrop-root": {
      opacity: "0 !important",
    },
  },
  drawerPaper: {
    backgroundColor: theme.palette.grey[300],
  },
  drawerTitle: {
    borderBottom: "1px solid #ccc",
    padding: "1rem",
  },
  drawerTitleCaption: {
    color: theme.palette.grey[700],
    fontSize: "1.2rem",
    fontWeight: "bold",
  },
  AccordionExpanded: {
    margin: "1rem !important",
  },
  AccordionRoot: {
    border: "1px solid #ccc",
    margin: "1rem 1rem 0 1rem",
    padding: "1rem",
    "&::before": {
      backgroundColor: "transparent",
    },
  },
  AccordionSubtitle: {
    color: theme.palette.grey[400],
    fontSize: "0.8rem",
    fontStyle: "italic",
  },
  AccordionTitle: {
    color: theme.palette.grey[700],
    fontSize: "1rem",
    fontWeight: "bold",
  },
  summaryBoxRoot: {
    marginRight: "2rem",
  },
}));

function TableDrawer({ entries, message, caption = "Records", showSingle = true }) {
  const [open, setOpen] = useState(false);
  const classes = sourceDrawerStyles();

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
      entries[0].name ?? naLabel
    );
  }

  const toggleDrawer = event => {
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
      <Paper classes={{ root: classes.drawerTitle }} elevation={0}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography className={classes.drawerTitleCaption}>{caption}</Typography>
          <IconButton onClick={closeDrawer}>
            <FontAwesomeIcon icon={faXmark} />
          </IconButton>
        </Box>
      </Paper>

      <Box className={classes.drawerBody}>
        {Object.keys(groupedEntries).map(group => (
          <Accordion
            elevation={0}
            key={group}
            classes={{
              root: classes.AccordionRoot,
              expanded: classes.AccordionExpanded,
            }}
            defaultExpanded={
              groupedEntries[group].length < 10 || Object.keys(groupedEntries).length === 1
            }
          >
            <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
              <Box classes={{ root: classes.summaryBoxRoot }}>
                <Typography className={classes.AccordionTitle}>{group}</Typography>
                <Typography className={classes.AccordionSubtitle}>
                  {groupedEntries[group].length} {caption}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {groupedEntries[group].map(entry => (
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
          </Accordion>
        ))}
      </Box>
    </>
  );

  return (
    <>
      <ButtonBase data-testid="table-drawer" onClick={toggleDrawer} className={classes.drawerLink}>
        <Typography variant="body2"> {message || `${entries.length} entries`}</Typography>
      </ButtonBase>

      <Drawer
        anchor="right"
        classes={{ modal: classes.drawerModal, paper: classes.drawerPaper }}
        open={open}
        onClose={closeDrawer}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}

export default TableDrawer;
