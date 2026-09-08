import { Chip as MUIChip, styled } from "@mui/material";

const StyledMUIChip = styled(MUIChip)({
  height: "20px",
  marginLeft: "4px",
  marginBottom: "4px",
  maxWidth: "100%",
  backgroundColor: "#fafafa",
});

type NewChipProps = {
  className: string;
};

function NewChip({ className }: NewChipProps) {
  return <StyledMUIChip className={className} label="new" variant="outlined" size="small" />;
}

export default NewChip;
