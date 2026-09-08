import { useState } from "react";

import { Drawer, Link as MuiLink, IconButton, Paper, Typography, ButtonBase } from "@mui/material";
import { styled } from "@mui/material/styles";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link, PublicationsDrawer, MouseModelAllelicComposition } from "ui";

const StyledButtonBase = styled(ButtonBase)(({ theme }) => ({
  color: `${theme.palette.primary.main} !important`,
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  "& .MuiBackdrop-root": {
    opacity: "0 !important",
  },
  "& .MuiDrawer-paper": {
    backgroundColor: theme.palette.grey[300],
    display: "unset",
  },
}));

const StyledTitle = styled(Typography)({
  display: "flex",
  justifyContent: "space-between",
  backgroundColor: "white",
  borderBottom: "1px solid #ccc",
  fontSize: "1.2rem",
  fontWeight: "bold",
  padding: "1rem",
});

const StyledPaper = styled(Paper)({
  width: "420px",
  margin: "1rem",
  padding: "1rem",
});

function Model({ model }) {
  const { id, allelicComposition, geneticBackground, literature } = model;
  const entries = literature ? literature.map(lit => ({ name: lit })) : [];
  return (
    <>
      <Link external to={`https://identifiers.org/${id}`}>
        <MouseModelAllelicComposition
          allelicComposition={allelicComposition}
          geneticBackground={geneticBackground}
        />
      </Link>
      <div>
        <PublicationsDrawer entries={entries} caption="Allelic composition" singleEntryId={false} />
      </div>
    </>
  );
}

function AllelicCompositionDrawer({ biologicalModels }) {
  const [open, setOpen] = useState(false);

  function toggleOpen() {
    setOpen(!open);
  }

  function close() {
    setOpen(false);
  }

  if (biologicalModels.length === 0) {
    return "N/A";
  }

  return (
    <>
      <StyledButtonBase onClick={() => toggleOpen()}>
        <Typography variant="body2">
          {biologicalModels.length} {biologicalModels.length === 1 ? "model" : "models"}
        </Typography>
      </StyledButtonBase>
      <StyledDrawer open={open} onClose={() => close()} anchor="right">
        <StyledTitle>
          Allelic composition
          <IconButton onClick={() => close()}>
            <FontAwesomeIcon icon={faXmark} />
          </IconButton>
        </StyledTitle>
        {biologicalModels.map(model => (
          <StyledPaper key={model.id} variant="outlined">
            <Model model={model} />
          </StyledPaper>
        ))}
      </StyledDrawer>
    </>
  );
}

export default AllelicCompositionDrawer;
