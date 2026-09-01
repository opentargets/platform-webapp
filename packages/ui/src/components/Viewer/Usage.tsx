import { faInfo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button, Typography } from "@mui/material";
import { useState } from "react";
import { Tooltip } from "ui";

// !!!!! ADD TYPES !!!!!

function Usage({ instructions }) {
  const [isClicked, setIsClicked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    setIsHovered(false);
    setIsClicked((prev) => !prev);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const tooltipOpen = isClicked || isHovered;

  const baseInstructions = {
    Rotate: "Drag",
    Move: "Ctrl + Drag",
    Zoom: "Ctrl + Scroll",
  };

  return (
    <div>
      <Tooltip
        open={tooltipOpen}
        slotProps={isClicked ? { tooltip: { sx: { borderColor: "#bbb" } } } : {}}
        title={
          <Box onClick={handleClick} sx={{ cursor: "pointer" }}>
            <table style={{ borderSpacing: "0.3rem 0" }}>
              <tbody>
                {Object.entries({ ...baseInstructions, ...instructions }).map(([label, text]) => (
                  <tr key={label}>
                    <Typography component="td" variant="caption">
                      <strong>{label}:</strong>
                    </Typography>
                    <Typography component="td" variant="caption">
                      {text}
                    </Typography>
                  </tr>
                ))}
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

export default Usage;
