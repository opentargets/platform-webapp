import { useState } from "react";
import { Drawer, IconButton, Paper, Typography, Link as MUILink, ButtonBase } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

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
    margin: "1.5rem",
    padding: "1rem",
  },
}));

function SafetyStudiesDrawer({ studies }) {
  const classes = useStyles();
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
      <ButtonBase data-testid="safety-studies-drawer" onClick={toggleOpen} className={classes.drawerLink}>
        <Typography variant="body2">{studies.length} studies</Typography>
      </ButtonBase>

      <Drawer
        classes={{ root: classes.backdrop, paper: classes.container }}
        open={open}
        onClose={() => close()}
        anchor="right"
      >
        <Typography className={classes.title}>
          Experimental studies
          <IconButton onClick={() => close()}>
            <FontAwesomeIcon icon={faXmark} />
          </IconButton>
        </Typography>
        {studies.map(study => (
          <Paper key={study.name} className={classes.paper} variant="outlined">
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
          </Paper>
        ))}
      </Drawer>
    </>
  );
}

export default SafetyStudiesDrawer;
