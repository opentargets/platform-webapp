import { ReactElement, useState, MouseEvent, KeyboardEvent } from "react";
import { v1 } from "uuid";
import { Menu, MenuItem, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { faCaretDown, faCaretUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "./Link";

const StyledTrigger = styled("span")({
  display: "inline-flex",
  alignItems: "center",
  cursor: "pointer",
});

const StyledIcon = styled(FontAwesomeIcon)({
  marginLeft: "6px",
  fontSize: "0.75rem",
});

const StyledMenuLink = styled(Link)({
  width: "100%",
  color: "inherit",
});

type ToolsMenuItem = {
  name: string;
  url: string;
};

type ToolsMenuProps = {
  items: ToolsMenuItem[];
  className?: string;
};

function ToolsMenu({ items, className }: ToolsMenuProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleMenuToggle = (event: MouseEvent<HTMLSpanElement>) => {
    setAnchorEl(anchorEl === null ? event.currentTarget : null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleMenuToggle(event as unknown as MouseEvent<HTMLSpanElement>);
    }
  };

  return (
    <>
      <StyledTrigger
        role="button"
        tabIndex={0}
        onClick={handleMenuToggle}
        onKeyDown={handleKeyDown}
        className={className}
        aria-haspopup="true"
        aria-expanded={isMenuOpen}
        aria-label="open tools menu"
      >
        <Typography variant="body2">Tools</Typography>
        <StyledIcon icon={isMenuOpen ? faCaretUp : faCaretDown} />
      </StyledTrigger>

      <Menu anchorEl={anchorEl} open={isMenuOpen} onClose={handleMenuClose}>
        {items.map(item => (
          <MenuItem key={v1()} onClick={handleMenuClose} dense>
            <StyledMenuLink to={item.url} footer={false}>
              <Typography variant="body2">{item.name}</Typography>
            </StyledMenuLink>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default ToolsMenu;
