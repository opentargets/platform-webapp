import { ReactElement, useState, MouseEvent, KeyboardEvent } from "react";
import { v1 } from "uuid";
import { Menu, MenuItem, Typography } from "@mui/material";
import { faCaretDown, faCaretUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { makeStyles } from "@mui/styles";
import classNames from "classnames";
import Link from "./Link";

const useStyles = makeStyles(() => ({
  trigger: {
    display: "inline-flex",
    alignItems: "center",
    cursor: "pointer",
  },
  icon: {
    marginLeft: "6px",
    fontSize: "0.75rem",
  },
  menuLink: {
    width: "100%",
    color: "inherit",
  },
}));

type ToolsMenuItem = {
  name: string;
  url: string;
};

type ToolsMenuProps = {
  items: ToolsMenuItem[];
  className?: string;
};

function ToolsMenu({ items, className }: ToolsMenuProps): ReactElement {
  const classes = useStyles();
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
      <span
        role="button"
        tabIndex={0}
        onClick={handleMenuToggle}
        onKeyDown={handleKeyDown}
        className={classNames(classes.trigger, className)}
        aria-haspopup="true"
        aria-expanded={isMenuOpen}
        aria-label="open tools menu"
      >
        <Typography variant="body2">Tools</Typography>
        <FontAwesomeIcon className={classes.icon} icon={isMenuOpen ? faCaretUp : faCaretDown} />
      </span>

      <Menu anchorEl={anchorEl} open={isMenuOpen} onClose={handleMenuClose}>
        {items.map(item => (
          <MenuItem key={v1()} onClick={handleMenuClose} dense>
            <Link to={item.url} className={classes.menuLink} footer={false}>
              <Typography variant="body2">{item.name}</Typography>
            </Link>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default ToolsMenu;
