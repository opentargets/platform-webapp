import {
  faArrowAltCircleDown,
  faArrowAltCircleUp,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, ButtonBase, Divider, Drawer, IconButton, Paper, Typography } from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import { useState } from "react";
import { naLabel } from "@ot/constants";
import { v1 } from "uuid";
import Link from "./Link";
import OtTable from "./OtTable/OtTable";
import Tooltip from "./Tooltip";

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

const LABEL = {
  increased: {
    title: "Directionality: Increased",
    icon: faArrowAltCircleUp,
  },
  decreased: {
    title: "Directionality: Decreased",
    icon: faArrowAltCircleDown,
  },
  default: {
    title: naLabel,
  },
};

export function DirectionalityList({ variantAnnotation }) {
  const theme = useTheme();

  function getTooltipTitle(directionality) {
    if (!directionality) return LABEL.default.title;
    return LABEL[directionality].title;
  }

  const columns = [
    {
      id: "publications",
      label: " ",
      renderCell: ({ directionality, effectDescription, literature }) => (
        <Box key={v1()} sx={{ whiteSpace: "normal", display: "flex" }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: 1,
              mr: 1,
              mt: "2px",
              alignItems: "center",
              background: theme => theme.palette.grey[200],
              borderRadius: 4,
              // minWidth: "40px",
              maxWidth: "40px",
              height: "min-content",
            }}
          >
            <Tooltip title={getTooltipTitle(directionality)} style={{ background: `red` }}>
              <FontAwesomeIcon
                color={
                  directionality === "increased" ? theme.palette.primary.dark : theme.palette.grey[400]
                }
                icon={LABEL.increased.icon}
                size="lg"
              />
              <Box sx={{ mt: 1 }}>
                <FontAwesomeIcon
                  color={
                    directionality === "decreased"
                      ? theme.palette.primary.dark
                      : theme.palette.grey[400]
                  }
                  icon={LABEL.decreased.icon}
                  size="lg"
                />
              </Box>
            </Tooltip>
          </Box>
          <Box>
            <Box>
              <Box>
                <Box sx={{ typography: "subtitle2", fontWeight: "bold" }} component="span">
                  Description:{" "}
                </Box>

                {effectDescription}
              </Box>
              <Box sx={{ typography: "subtitle2", fontWeight: "bold" }} component="span">
                Publication:{" "}
              </Box>
              <Link external to={literature}>
                {literature}{" "}
              </Link>{" "}
            </Box>
          </Box>
        </Box>
      ),
      filterValue: ({ directionality, effectDescription, literature }) =>
        `${directionality} ${effectDescription} ${literature}`,
    },
  ];

  return <OtTable columns={columns} rows={variantAnnotation} showColumnVisibilityControl={false} />;
}

function DirectionalityDrawer({ variantAnnotation, customLabel, caption }) {
  const [open, setOpen] = useState(false);

  if (!variantAnnotation || !variantAnnotation.length) {
    return naLabel;
  }

  function toggleDrawer(event) {
    if (event.type === "keydown" && (event.key === "Tab" || event.key === "Shift")) {
      return;
    }
    setOpen(true);
  }

  function closeDrawer() {
    setOpen(false);
  }

  return (
    <>
      <StyledButtonBase disableRipple onClick={toggleDrawer}>
        <Typography variant="body2">
          {" "}
          {customLabel ||
            `${variantAnnotation.length} ${
              variantAnnotation.length === 1 ? "entry" : "entries"
            }`}{" "}
        </Typography>
      </StyledButtonBase>

      <StyledDrawer anchor="right" open={open} onClose={closeDrawer}>
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
              <DirectionalityList variantAnnotation={variantAnnotation} />
            </Box>
          )}
        </StyledBody>
      </StyledDrawer>
    </>
  );
}
export default DirectionalityDrawer;
