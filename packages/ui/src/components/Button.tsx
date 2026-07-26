import { faCaretDown, faCaretUp, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button as MuiButton, type SxProps, styled, type Theme } from "@mui/material";
import type { MouseEventHandler } from "react";

type PopoverButtonProps = {
  popoverId?: string;
  open: boolean;
  icon: IconDefinition;
  label: string;
  handleClick: MouseEventHandler;
  testId?: string;
  ariaLabel?: string;
  disableElevation?: boolean;
  iconSize?:
    | "xs"
    | "sm"
    | "lg"
    | "xl"
    | "1x"
    | "2x"
    | "3x"
    | "4x"
    | "5x"
    | "6x"
    | "7x"
    | "8x"
    | "9x"
    | "10x";
  sx?: SxProps<Theme>;
};

// Swap point for a future design-system migration — currently a no-op wrapper
// around MuiButton (previously forced startIcon to a fixed 14px regardless of
// size="small"/"large", which only happened to match the "medium" default).
const Button = styled(MuiButton)({});

const ButtonPrimary = styled(Button)(({ theme }) => ({
  border: theme.palette.primary.dark,
  backgroundColor: theme.palette.primary.dark,
  color: theme.palette.primary.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.secondary.main,
  },
}));

const PopoverButton: React.FC<PopoverButtonProps> = ({
  popoverId,
  handleClick,
  open,
  icon,
  label,
  ariaLabel,
  disableElevation = false,
  iconSize,
  sx,
  testId,
}) => {
  return (
    <Button
      aria-describedby={popoverId}
      aria-label={ariaLabel}
      data-testid={testId}
      variant="text"
      onClick={handleClick}
      disableElevation={disableElevation}
      sx={sx ?? { height: 1 }}
    >
      <Box component="span" sx={{ mr: 1 }}>
        <FontAwesomeIcon icon={icon} size={iconSize} />
      </Box>
      {label}
      <Box component="span" sx={{ ml: 1 }}>
        {open ? <FontAwesomeIcon icon={faCaretUp} /> : <FontAwesomeIcon icon={faCaretDown} />}
      </Box>
    </Button>
  );
};

export { PopoverButton, ButtonPrimary, Button };
