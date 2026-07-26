import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfo } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@mui/material";
import { Tooltip, Box, Typography } from "ui";

function InfoPopper() {
  const [isClicked, setIsClicked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    setIsHovered(false);
    setIsClicked(prev => !prev);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const tooltipOpen = isClicked || isHovered;

  return (
    <div>
      <Tooltip
        open={tooltipOpen}
        slotProps={isClicked ? { tooltip: { sx: { borderColor: "#bbb" } } } : {}}
        title={
          <Box onClick={handleClick} sx={{ cursor: "pointer" }}>
            <table style={{ borderSpacing: "0.3rem 0" }}>
              <tbody>
                <tr>
                  <Typography component="td" variant="caption">
                    <strong>Rotate:</strong>
                  </Typography>
                  <Typography component="td" variant="caption">
                    Drag
                  </Typography>
                </tr>
                <tr>
                  <Typography component="td" variant="caption">
                    <strong>Move:</strong>
                  </Typography>
                  <Typography component="td" variant="caption">
                    Ctrl + Drag
                  </Typography>
                </tr>
                <tr>
                  <Typography component="td" variant="caption">
                    <strong>Zoom:</strong>
                  </Typography>
                  <Typography component="td" variant="caption">
                    Ctrl + Scroll
                  </Typography>
                </tr>
                <tr>
                  <Typography component="td" variant="caption">
                    <strong>Reset:</strong>
                  </Typography>
                  <Typography component="td" variant="caption">
                    Double click
                  </Typography>
                </tr>
              </tbody>
            </table>
          </Box>
        }
        disableFocusListener
        disableTouchListener
        placement="top-end"
      >
        <Button
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          sx={{
            bgcolor: "white",
            "&:hover": {
              bgcolor: "#f8f8f8d8",
            },
          }}
        >
          <FontAwesomeIcon icon={faInfo} />
        </Button>
      </Tooltip>
    </div>
  );
}

export default InfoPopper;
