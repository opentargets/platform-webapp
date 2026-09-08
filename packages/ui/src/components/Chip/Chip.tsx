import { Chip as MUIChip, styled } from "@mui/material";
import { ReactElement } from "react";

const StyledMUIChip = styled(MUIChip)({
  height: "20px",
  marginRight: "4px",
  marginBottom: "4px",
  maxWidth: "100%",
});

type ChipProps = {
  className?: string;
  disabled?: boolean;
  label: ReactElement;
  title?: string;
  "data-testid"?: string;
};

export default function Chip({ className, label, title, disabled, ...rest }: ChipProps): ReactElement {
  return (
    <StyledMUIChip
      className={className}
      label={label}
      title={title}
      variant="outlined"
      size="small"
      disabled={disabled}
      {...rest}
    />
  );
}
