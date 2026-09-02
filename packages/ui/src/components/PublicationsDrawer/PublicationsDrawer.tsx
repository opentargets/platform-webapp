import { useState, useEffect } from "react";
import {
  Box,
  IconButton,
  Drawer,
  Typography,
  Paper,
  CircularProgress,
  ButtonBase,
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { naLabel } from "@ot/constants";
import { europePmcSearchPOSTQuery } from "@ot/utils";
import PublicationWrapper from "./PublicationWrapper";
import OtTable from "../OtTable/OtTable";

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
    maxWidth: "100%",
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

const listComponentStyles = makeStyles(theme => ({
  loader: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  AccordionSubtitle: {
    color: theme.palette.grey[400],
    fontSize: "0.8rem",
    fontStyle: "italic",
  },
  ListContent: {
    backgroundColor: "white",
  },
}));

export function PublicationsList({
  entriesIds,
  hideSearch = false,
  name,
  symbol,
  showRowsPerPageControl,
  showPaginationAlways,
}) {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // filter out empty ids - these will fetch irrelevant publications
    const { baseUrl, formBody } = europePmcSearchPOSTQuery(entriesIds.filter(id => id?.trim()));
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: formBody,
    };
    fetch(baseUrl, requestOptions)
      .then(response => response.json())
      .then(data => {
        setLoading(false);
        setPublications(data.resultList.result);
      });
  }, [entriesIds]);

  if (loading)
    return (
      <Box
        my={20}
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexDirection="column"
      >
        <CircularProgress size={60} />
        <Box mt={6}>
          <Typography className={listComponentStyles.AccordionSubtitle}>
            Loading Europe PMC search results
          </Typography>
        </Box>
      </Box>
    );

  const parsedPublications = publications.map(pub => {
    const row = {};
    row.europePmcId = pub.id;
    row.pmcId = pub.pmcid;
    row.fullTextOpen = !!(pub.inEPMC === "Y" || pub.inPMC === "Y");
    row.title = pub.title;
    row.year = pub.pubYear;
    row.abstract = pub.abstractText;
    row.isOpenAccess = pub.isOpenAccess !== "N";
    row.authors = pub.authorList?.author || [];
    row.journal = {
      ...pub.journalInfo,
      page: pub.pageInfo,
    };
    return row;
  });

  const columns = [
    {
      id: "publications",
      label: " ",
      renderCell: publication => {
        const {
          europePmcId,
          title,
          titleHtml,
          authors,
          journal,
          variant,
          abstract,
          fullTextOpen,
          source,
          patentDetails,
          pmcId,
          isOpenAccess,
        } = publication;
        return (
          <PublicationWrapper
            europePmcId={europePmcId}
            title={title}
            titleHtml={titleHtml}
            authors={authors}
            journal={journal}
            variant={variant}
            abstract={abstract}
            fullTextOpen={fullTextOpen}
            source={source}
            patentDetails={patentDetails}
            isOpenAccess={isOpenAccess}
            pmcId={pmcId}
            symbol={symbol}
            name={name}
          />
        );
      },
      filterValue: row =>
        `${row.journal.journal?.title} ${row?.title} ${row?.year}
        ${row.authors
          .reduce((acc, author) => {
            if (author.fullName) acc.push(author.fullName);
            return acc;
          }, [])
          .join(" ")}`,
    },
  ];

  return (
    <OtTable
      columns={columns}
      rows={parsedPublications}
      showGlobalFilter={!hideSearch}
      showColumnVisibilityControl={false}
      showRowsPerPageControl={showRowsPerPageControl}
      showPaginationAlways={showPaginationAlways}
    />
  );
}

function PublicationsDrawer({
  entries,
  customLabel,
  caption = "Publications",
  singleEntryId = true,
  symbol,
  name,
}) {
  const [open, setOpen] = useState(false);
  const classes = sourceDrawerStyles();

  const entriesIds = entries.map(entry => entry.name);

  const toggleDrawer = event => {
    if (event.type === "keydown" && (event.key === "Tab" || event.key === "Shift")) {
      return;
    }
    setOpen(true);
  };

  const closeDrawer = () => {
    setOpen(false);
  };

  if (entries.length === 0) {
    return naLabel;
  }

  return (
    <>
      <ButtonBase disableRipple onClick={toggleDrawer} className={classes.drawerLink}>
        <Typography variant="body2">
          {" "}
          {customLabel ||
            (entries.length === 1 && singleEntryId
              ? entries[0].name
              : `${entries.length} ${entries.length === 1 ? "publication" : "publications"}`)}{" "}
        </Typography>
      </ButtonBase>

      <Drawer
        anchor="right"
        classes={{ modal: classes.drawerModal, paper: classes.drawerPaper }}
        open={open}
        onClose={closeDrawer}
        data-testid="publications-drawer"
      >
        <Paper classes={{ root: classes.drawerTitle }} elevation={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography className={classes.drawerTitleCaption}>{caption}</Typography>
            <IconButton onClick={closeDrawer}>
              <FontAwesomeIcon icon={faXmark} />
            </IconButton>
          </Box>
        </Paper>

        <Box width={600} maxWidth="100%" className={classes.drawerBody}>
          {open && (
            <Box my={3} mx={3} p={3} pb={6} bgcolor="white">
              <PublicationsList entriesIds={entriesIds} symbol={symbol} name={name} />
            </Box>
          )}
        </Box>
      </Drawer>
    </>
  );
}

export default PublicationsDrawer;
