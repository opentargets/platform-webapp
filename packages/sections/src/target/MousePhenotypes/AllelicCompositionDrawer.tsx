import { useState } from "react";

import { Drawer, Link as MuiLink, IconButton, Paper, Typography, ButtonBase } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link, PublicationsDrawer, MouseModelAllelicComposition } from "ui";

const useStyles = makeStyles(theme => ({
  drawerLink: {
    color: `${theme.palette.primary.main} !important`,
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
}));

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
  const classes = useStyles();
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
      <ButtonBase onClick={() => toggleOpen()} className={classes.drawerLink}>
        <Typography variant="body2">
          {biologicalModels.length} {biologicalModels.length === 1 ? "model" : "models"}
        </Typography>
      </ButtonBase>
      <Drawer
        classes={{ root: classes.backdrop, paper: classes.container }}
        open={open}
        onClose={() => close()}
        anchor="right"
      >
        <Typography className={classes.title}>
          Allelic composition
          <IconButton onClick={() => close()}>
            <FontAwesomeIcon icon={faXmark} />
          </IconButton>
        </Typography>
        {biologicalModels.map(model => (
          <Paper key={model.id} className={classes.paper} variant="outlined">
            <Model model={model} />
          </Paper>
        ))}
      </Drawer>
    </>
  );
}

export default AllelicCompositionDrawer;
