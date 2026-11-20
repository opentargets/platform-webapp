import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { styled } from "@mui/material/styles";
import { useState } from "react";
import { ButtonBase, Drawer, IconButton, Paper, Typography } from "ui";

const StyledButtonBase = styled(ButtonBase)(({ theme }) => ({
  color: `${theme.palette.primary.main} !important`,
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  "& .MuiBackdrop-root": {
    opacity: "0 !important",
  },
  "& .MuiDrawer-paper": {
    backgroundColor: theme.palette.common.white,
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
  margin: "1.5rem",
  padding: "1rem",
});

type Study = { name?: string | null; type?: string | null; description?: string | null };

function SafetyStudiesDrawer({ studies }: { studies: Study[] }) {
  const [open, setOpen] = useState(false);

  function toggleOpen() {
    setOpen(!open);
  }

  function close() {
    setOpen(false);
  }

  if (studies.length === 0) {
    return "N/A";
  }

  return (
    <>
      <StyledButtonBase data-testid="safety-studies-drawer" onClick={toggleOpen}>
        <Typography variant="body2">{studies.length} studies</Typography>
      </StyledButtonBase>

      <StyledDrawer open={open} onClose={() => close()} anchor="right">
        <StyledTitle>
          Experimental studies
          <IconButton onClick={() => close()}>
            <FontAwesomeIcon icon={faXmark} />
          </IconButton>
        </StyledTitle>
        {studies.map((study) => (
          <StyledPaper key={study.name ?? study.description} variant="outlined">
            <Typography variant="h6" gutterBottom>
              Study:
            </Typography>
            <div>{study.name}</div>
            <Typography variant="h6" gutterBottom>
              Type:
            </Typography>
            <div>{study.type}</div>
            <Typography variant="h6" gutterBottom>
              Description:
            </Typography>
            <div>{study.description}</div>
          </StyledPaper>
        ))}
      </StyledDrawer>
    </>
  );
}

export default SafetyStudiesDrawer;
