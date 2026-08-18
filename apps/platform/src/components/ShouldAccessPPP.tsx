import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  DialogContentText,
  Button,
  Snackbar,
  styled,
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import { useLocation } from "react-router";
import { isOnPublic, testPPPaccess } from "@ot/utils";
import { PPP_WEB_URL } from "@ot/constants";

const FOURTEEN = 14;

const useStyles = makeStyles(theme => ({
  paper: {
    padding: "1em 1em 2em",
    borderRadius: "12px",
  },
  actions: {
    "@media (max-width: 767px)": {
      flexDirection: "column",
    },
  },
  button: {
    "@media (max-width: 767px)": {
      minHeight: "auto",
      height: "100%",
      width: "100%",
      margin: "0 !important",
      marginTop: "0.3em !important",
    },
  },
}));

const PrimaryButton = styled(Button)`
  border: none;
  color: white;
`;

function ShouldAccessPPP() {
  const location = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const classes = useStyles();

  const shouldShowPopupAfterFixedDays = (DAYS: number) => {
    const currentDate = new Date();
    const oldDateObject = JSON.parse(localStorage.getItem("ppp-reminder-closed-on") || "{}");
    if (!oldDateObject.date) return true;
    const oldDate = new Date(oldDateObject.date);
    const diffInTime = Math.abs(currentDate.getTime() - oldDate.getTime());
    const diffInDays = Math.floor(diffInTime / (1000 * 3600 * 24));
    if (diffInDays >= DAYS) return true;
    return false;
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const remindMeLater = () => {
    handleCloseDialog();
    localStorage.setItem("ppp-reminder-closed-on", JSON.stringify({ date: new Date() }));
    setSnackbarOpen(true);
  };

  const checkPPPaccess = () => {
    testPPPaccess()
      .then(response => {
        if (response.status === 200) handleOpenDialog();
      })
      .catch(() => {
        console.log("Does not have access to Partner Preview Platform");
      });
  };

  useEffect(() => {
    if (isOnPublic() && shouldShowPopupAfterFixedDays(FOURTEEN)) checkPPPaccess();
  }, []);

  const goToPPP = () => {
    window.location.href = `${PPP_WEB_URL}${location.pathname}`;
  };
  
  return (
    <>
      <Dialog
        onClose={handleCloseDialog}
        aria-labelledby="ppp-reminder"
        open={dialogOpen}
        classes={{
          paper: classes.paper,
        }}
      >
        <DialogTitle>Looks like you are part of the Open Targets Consortium!</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            We are pleased to inform you that you have access to our exclusive Partner Preview
            Platform &#40;PPP&#41;. This will have pre-publication data from OTAR projects in
            addition to all the publicly available data, providing early access to the latest
            features, updates, and innovations before they are made available to the public.
          </DialogContentText>
        </DialogContent>
        <DialogActions className={classes.actions}>
          <Button className={classes.button} onClick={remindMeLater} variant="outlined">
            Remind me later
          </Button>
          <PrimaryButton
            className={classes.button}
            onClick={goToPPP}
            variant="contained"
            color="primary"
          >
            Continue on Partner Preview Platform
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        onClose={handleCloseSnackbar}
        message="We will remind you in a couple of weeks"
        autoHideDuration={3000}
      />
    </>
  );
}

export default ShouldAccessPPP;
