import { useState } from "react";
import { Drawer, IconButton, Paper, Typography, ButtonBase } from "@mui/material";
import { styled } from "@mui/material/styles";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Tooltip, Link } from "ui";
import { sentenceCase } from "@ot/utils";

const StyledButtonBase = styled(ButtonBase)(({ theme }) => ({
  color: `${theme.palette.primary.main} !important`,
  maxWidth: "420px",
  overflow: "hidden",
  textOverflow: "ellipsis",
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

const StyledBiomarkerItem = styled("div")({
  marginBottom: "8px",
});

function BiomarkersDrawer({ biomarkerName, biomarkers }) {
  const [open, setOpen] = useState(false);

  function toggleOpen() {
    setOpen(!open);
  }

  function close() {
    setOpen(false);
  }

  if (biomarkers.length === 0) {
    return "N/A";
  }

  return (
    <>
      <Tooltip title={biomarkerName}>
        <StyledButtonBase onClick={() => toggleOpen()}>
          <Typography variant="body2"> {biomarkerName}</Typography>
        </StyledButtonBase>
      </Tooltip>
      <StyledDrawer open={open} onClose={() => close()} anchor="right">
        <StyledTitle>
          Biomarker
          <IconButton onClick={() => close()}>
            <FontAwesomeIcon icon={faXmark} />
          </IconButton>
        </StyledTitle>
        {biomarkers.geneticVariation ? (
          <StyledPaper variant="outlined">
            <Typography variant="subtitle2" paragraph>
              Variant:
            </Typography>
            {biomarkers.geneticVariation.map(variant => (
              <StyledBiomarkerItem key={variant.name}>
                <div>
                  {variant.name}{" "}
                  {variant.geneticVariationId ? `(ID: ${variant.geneticVariationId})` : null}
                </div>
                {variant.functionalConsequenceId ? (
                  <Link
                    external
                    to={`https://identifiers.org/${variant.functionalConsequenceId.id}`}
                  >
                    {sentenceCase(variant.functionalConsequenceId.label)}
                  </Link>
                ) : null}
              </StyledBiomarkerItem>
            ))}
          </StyledPaper>
        ) : null}
        {biomarkers.geneExpression && biomarkers.geneExpression.length > 0 ? (
          <StyledPaper variant="outlined">
            <Typography variant="subtitle2" paragraph>
              Gene expression:
            </Typography>
            {biomarkers.geneExpression.map(expression => (
              <StyledBiomarkerItem key={expression.name}>
                <div>{expression.name}</div>
                <Link external to={`https://identifiers.org/${expression.id.id}`}>
                  {expression.id.label}
                </Link>
              </StyledBiomarkerItem>
            ))}
          </StyledPaper>
        ) : null}
      </StyledDrawer>
    </>
  );
}

export default BiomarkersDrawer;
