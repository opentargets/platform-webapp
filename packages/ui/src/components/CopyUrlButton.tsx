import { faLink } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconButton, Slide, Snackbar } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useState } from "react";
import { Tooltip } from "ui";

const StyledSnackbar = styled(Snackbar)({
  "& .MuiSnackbarContent-root": {
    padding: 0,
  },
  "& .MuiSnackbarContent-message": {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: ".75rem 1rem",
    width: "100%",
  },
});

type CopyUrlButtonProps = {
  tooltipTitle?: string;
};

function CopyUrlButton({ tooltipTitle = "Copy URL" }: CopyUrlButtonProps) {
  const [urlSnackbar, setUrlSnackbar] = useState(false);

  return (
    <>
      <Tooltip placement="bottom" title={tooltipTitle}>
        <IconButton
          onClick={() => {
            setUrlSnackbar(true);
            navigator.clipboard.writeText(window.location.href);
          }}
        >
          <FontAwesomeIcon size="xs" icon={faLink} />
        </IconButton>
      </Tooltip>

      <StyledSnackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        open={urlSnackbar}
        onClose={() => {
          setUrlSnackbar(false);
        }}
        autoHideDuration={2000}
        TransitionComponent={Slide}
        message="URL copied"
      />
    </>
  );
}
export default CopyUrlButton;
