import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Box,
  ButtonBase,
  CircularProgress,
  Drawer,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { naLabel } from "@ot/constants";
import { europePmcSearchPOSTQuery } from "@ot/utils";
import { useEffect, useState } from "react";
import OtTable from "../OtTable/OtTable";
import PublicationWrapper from "./PublicationWrapper";

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
    maxWidth: "100%",
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
    const { baseUrl, formBody } = europePmcSearchPOSTQuery(entriesIds.filter((id) => id?.trim()));
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: formBody,
    };
    fetch(baseUrl, requestOptions)
      .then((response) => response.json())
      .then((data) => {
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
          <Typography>Loading Europe PMC search results</Typography>
        </Box>
      </Box>
    );

  const parsedPublications = publications.map((pub) => {
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
      renderCell: (publication) => {
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
      filterValue: (row) =>
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

  const entriesIds = entries.map((entry) => entry.name);

  const toggleDrawer = (event) => {
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
      <StyledButtonBase disableRipple onClick={toggleDrawer}>
        <Typography variant="body2">
          {" "}
          {customLabel ||
            (entries.length === 1 && singleEntryId
              ? entries[0].name
              : `${entries.length} ${entries.length === 1 ? "publication" : "publications"}`)}{" "}
        </Typography>
      </StyledButtonBase>

      <StyledDrawer
        anchor="right"
        open={open}
        onClose={closeDrawer}
        data-testid="publications-drawer"
      >
        <StyledPaperTitle elevation={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <StyledTitleCaption>{caption}</StyledTitleCaption>
            <IconButton onClick={closeDrawer}>
              <FontAwesomeIcon icon={faXmark} />
            </IconButton>
          </Box>
        </StyledPaperTitle>

        <StyledBody width={600} maxWidth="100%">
          {open && (
            <Box my={3} mx={3} p={3} pb={6} bgcolor="white">
              <PublicationsList entriesIds={entriesIds} symbol={symbol} name={name} />
            </Box>
          )}
        </StyledBody>
      </StyledDrawer>
    </>
  );
}

export default PublicationsDrawer;
