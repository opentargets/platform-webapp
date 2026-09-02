import { Autocomplete, Select as MuiSlect, Popper, styled } from "@mui/material";

export const Select = styled(MuiSlect)(({ theme }) => ({
  minWidth: "150px",
  maxWidth: "150px",
  background: `${theme.palette.grey[200]}`,
  display: "flex",
  boxShadow: "none",
  fontSize: "0.8rem",
  ".MuiOutlinedInput-notchedOutline": {
    // borderRight: 0,
    borderLeft: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 0,

    borderBottomLeftRadius: 0,
  },
}));

export const FacetsPopper = (props) => {
  return <Popper {...props} style={{ width: "360px" }} placement="bottom-start" />;
};

export const FacetsAutocomplete = styled(Autocomplete)(({ theme }) => ({
  minWidth: "240px",
  flexWrap: "nowrap",
  ".MuiAutocomplete-popper": {
    width: "2400px",
  },
  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
    borderRight: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  "& .MuiFormLabel-root": {
    fontSize: "0.8rem",
    lineHeight: "1.7em",
  },
}));

export const FacetListItemContainer = styled("div")({
  p: 10,
  m: 0,
  width: "100%",
  display: "flex",
  flexDirection: "column",
});

export const FacetListItemLabel = styled("div")({
  w: 1,
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "start",
  em: {
    fontWeight: "bold",
    fontStyle: "normal",
  },
});

export const FacetListItemCategory = styled("div")(({ theme }) => ({
  width: "100%",
  fontStyle: "italic",
  fontWeight: "bold",
  justifyContent: "end",
  textAlign: "end",
  color: theme.palette.primary.main,
}));
