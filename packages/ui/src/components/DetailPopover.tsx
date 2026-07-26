import { faCaretDown, faCaretRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Popover, Typography } from "@mui/material";
import { type ReactNode, useState } from "react";

type DetailPopoverProps = {
  title: string;
  children: ReactNode;
  popoverId?: string;
};

export default function DetailPopover({
  title,
  children,
  popoverId = "simple-popover",
}: DetailPopoverProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? popoverId : undefined;

  return (
    <>
      <Typography
        variant="subtitle2"
        component="span"
        sx={{
          display: "inline",
          cursor: "pointer",
          mr: 0.5,
          fontWeight: 600,
          color: "secondary.main",
        }}
        data-testid="detail-popover-trigger"
        aria-roledescription="button"
        aria-describedby={id}
        onClick={handleClick}
      >
        {title} <FontAwesomeIcon icon={open ? faCaretDown : faCaretRight} />
      </Typography>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        elevation={1}
        disableScrollLock
        transitionDuration={0}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <Box data-testid="detail-popover-content" p={2}>
          {children}
        </Box>
      </Popover>
    </>
  );
}
