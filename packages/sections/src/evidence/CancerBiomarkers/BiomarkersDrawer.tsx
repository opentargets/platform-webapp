import { useState } from "react";
import { Drawer, IconButton, Paper, Typography, ButtonBase } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Tooltip, Link } from "ui";
import { sentenceCase } from "@ot/utils";

const useStyles = makeStyles(theme => ({
  drawerLink: {
    color: `${theme.palette.primary.main} !important`,
    maxWidth: "420px",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  backdrop: {
    "& .MuiBackdrop-root": {
      opacity: "0 !important",
    },
  },
  container: {
    backgroundColor: theme.palette.grey[300],
    display: "unset",
  },
  title: {
    display: "flex",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderBottom: "1px solid #ccc",
    fontSize: "1.2rem",
    fontWeight: "bold",
    padding: "1rem",
  },
  paper: {
    width: "420px",
    margin: "1rem",
    padding: "1rem",
  },
  biomarkerItem: { marginBottom: "8px" },
}));

function BiomarkersDrawer({ biomarkerName, biomarkers }) {
  const classes = useStyles();
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
        <ButtonBase onClick={() => toggleOpen()} className={classes.drawerLink}>
          <Typography variant="body2"> {biomarkerName}</Typography>
        </ButtonBase>
      </Tooltip>
      <Drawer
        classes={{ root: classes.backdrop, paper: classes.container }}
        open={open}
        onClose={() => close()}
        anchor="right"
      >
        <Typography className={classes.title}>
          Biomarker
          <IconButton onClick={() => close()}>
            <FontAwesomeIcon icon={faXmark} />
          </IconButton>
        </Typography>
        {biomarkers.geneticVariation ? (
          <Paper className={classes.paper} variant="outlined">
            <Typography variant="subtitle2" paragraph>
              Variant:
            </Typography>
            {biomarkers.geneticVariation.map(variant => (
              <div key={variant.name} className={classes.biomarkerItem}>
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
              </div>
            ))}
          </Paper>
        ) : null}
        {biomarkers.geneExpression && biomarkers.geneExpression.length > 0 ? (
          <Paper className={classes.paper} variant="outlined">
            <Typography variant="subtitle2" paragraph>
              Gene expression:
            </Typography>
            {biomarkers.geneExpression.map(expression => (
              <div key={expression.name} className={classes.biomarkerItem}>
                <div>{expression.name}</div>
                <Link external to={`https://identifiers.org/${expression.id.id}`}>
                  {expression.id.label}
                </Link>
              </div>
            ))}
          </Paper>
        ) : null}
      </Drawer>
    </>
  );
}

export default BiomarkersDrawer;
