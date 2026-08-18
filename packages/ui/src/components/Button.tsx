import { faCaretDown, faCaretUp, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button as MuiButton, type SxProps, styled, type Theme } from "@mui/material";
import type { ComponentType, MouseEventHandler } from "react";

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
  as?: ComponentType<React.ComponentProps<typeof MuiButton>>;
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

// The app theme forces a 1px grey border onto every MuiButton root by default
// (see ot-config's theme.ts). This variant hides that border until hover, for
// toolbar-style trigger buttons where a permanent border doesn't read as
// intentional but a hover affordance still should.
const ButtonNoBorder = styled(Button)({
  border: "1px solid transparent",
  "&:hover": {
    border: "1px solid rgb(196,196,196)",
  },
});

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
  as: ButtonComponent = Button,
}) => {
  return (
    <ButtonComponent
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
    </ButtonComponent>
  );
};

export { PopoverButton, ButtonPrimary, Button, ButtonNoBorder };
