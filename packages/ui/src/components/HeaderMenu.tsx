import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  ClickAwayListener,
  Fade,
  IconButton,
  MenuItem,
  MenuList,
  Paper,
  Popper,
  type PopperPlacementType,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { type KeyboardEvent, type MouseEvent, type ReactElement, useState } from "react";
import { v1 } from "uuid";
import Link from "./Link";
import PrivateWrapper from "./PrivateWrapper";

const StyledMenuLink = styled(Link)({
  width: "100%",
  paddingTop: "8px",
  paddingBottom: "8px",
  paddingLeft: "16px",
  paddingRight: "16px",
});

type HeaderMenuItem = {
  external: boolean;
  name: string;
  showOnlyPartner?: boolean;
  url: string;
};

type HeaderMenuProps = {
  items: HeaderMenuItem[];
  placement?: PopperPlacementType;
};

function HeaderMenu({ items, placement }: HeaderMenuProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<null | HTMLButtonElement>(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleMenuToggle = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(anchorEl === null ? event.currentTarget : null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleListKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Tab") {
      event.preventDefault();
      setAnchorEl(null);
    }
  };

  return (
    <>
      <IconButton
        sx={{ marginLeft: "20px" }}
        size="medium"
        color="inherit"
        aria-label="open header menu"
        aria-haspopup="true"
        onClick={handleMenuToggle}
      >
        <FontAwesomeIcon icon={isMenuOpen ? faXmark : faBars} size="xs" />
      </IconButton>

      <Popper
        open={isMenuOpen}
        anchorEl={anchorEl}
        role={undefined}
        transition
        // disablePortal
        placement={placement || "bottom-start"}
      >
        {({ TransitionProps }) => (
          // TODO: review props spreading
          // eslint-disable-next-line
          <Fade {...TransitionProps}>
            <Paper>
              <ClickAwayListener onClickAway={handleMenuClose}>
                <MenuList onKeyDown={handleListKeyDown}>
                  {items.map((item: HeaderMenuItem) => {
                    if (item.showOnlyPartner) {
                      return (
                        <PrivateWrapper key={v1()}>
                          <MenuItem
                            onClick={handleMenuClose}
                            dense
                            sx={{ paddingLeft: "0px", paddingRight: "0px" }}
                          >
                            <StyledMenuLink external={item.external} to={item.url} footer={false}>
                              {item.name}
                            </StyledMenuLink>
                          </MenuItem>
                        </PrivateWrapper>
                      );
                    }
                    return (
                      <MenuItem
                        onClick={handleMenuClose}
                        key={v1()}
                        dense
                        sx={{ paddingLeft: "0px", paddingRight: "0px" }}
                      >
                        <StyledMenuLink external={item.external} to={item.url} footer={false}>
                          {item.name}
                        </StyledMenuLink>
                      </MenuItem>
                    );
                  })}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  );
}

export default HeaderMenu;
