import { useState } from "react";
import { styled } from "@mui/material/styles";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Tooltip, Link, Drawer, IconButton, Paper, Typography, ButtonBase } from "ui";
import { sentenceCase } from "@ot/utils";
import {
  naLabel,
  type EvidenceCancerBiomarkersGeneExpression,
  type EvidenceCancerBiomarkersGeneticVariation,
} from "@ot/constants";

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
    backgroundColor: theme.palette.common.white,
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

// the view returns "SO_0001777" / "GO_0010628", identifiers.org expects "SO:0001777"
const curie = (id: string) => id.replace("_", ":");

type BiomarkersDrawerProps = {
  biomarkerName?: string | null;
  geneticVariations: EvidenceCancerBiomarkersGeneticVariation[];
  geneExpressions: EvidenceCancerBiomarkersGeneExpression[];
};

function BiomarkersDrawer({
  biomarkerName,
  geneticVariations,
  geneExpressions,
}: BiomarkersDrawerProps) {
  const [open, setOpen] = useState(false);

  function toggleOpen() {
    setOpen(!open);
  }

  function close() {
    setOpen(false);
  }

  if (geneticVariations.length === 0 && geneExpressions.length === 0) {
    return naLabel;
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
        {geneticVariations.length > 0 ? (
          <StyledPaper variant="outlined">
            <Typography variant="subtitle2" paragraph>
              Variant:
            </Typography>
            {geneticVariations.map(variant => (
              <StyledBiomarkerItem key={variant.name}>
                <div>
                  {variant.name} {variant.id ? `(ID: ${variant.id})` : null}
                </div>
                {variant.functionalConsequenceId ? (
                  <Link
                    external
                    to={`https://identifiers.org/${curie(variant.functionalConsequenceId)}`}
                  >
                    {sentenceCase(variant.functionalConsequenceLabel ?? "")}
                  </Link>
                ) : null}
              </StyledBiomarkerItem>
            ))}
          </StyledPaper>
        ) : null}
        {geneExpressions.length > 0 ? (
          <StyledPaper variant="outlined">
            <Typography variant="subtitle2" paragraph>
              Gene expression:
            </Typography>
            {geneExpressions.map(expression => (
              <StyledBiomarkerItem key={expression.name}>
                <div>{expression.name}</div>
                {expression.id ? (
                  <Link external to={`https://identifiers.org/${curie(expression.id)}`}>
                    {expression.label}
                  </Link>
                ) : null}
              </StyledBiomarkerItem>
            ))}
          </StyledPaper>
        ) : null}
      </StyledDrawer>
    </>
  );
}

export default BiomarkersDrawer;
