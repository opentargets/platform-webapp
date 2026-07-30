import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { styled } from "@mui/material/styles";

const StyledA = styled("a")(({ theme }) => ({
  display: "block",
  textDecoration: "none",
  outline: "none",
  color: "inherit",
  "&:hover": {
    color: theme.palette.primary.light,
  },
  maxWidth: "100%",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

export const EmailLink = ({ href, label, icon }) => {
  return (
    <StyledA href={href}>
      {icon && <FontAwesomeIcon style={{ marginRight: "10px" }} icon={icon} size="lg" />}
      {label}
    </StyledA>
  );
};
