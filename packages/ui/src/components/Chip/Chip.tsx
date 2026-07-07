import classNames from "classnames";
import { makeStyles } from "@mui/styles";
import { Chip as MUIChip } from "@mui/material";
import { ReactElement } from "react";

const useStyles = makeStyles({
  chip: {
    height: "20px",
    marginRight: "4px",
    marginBottom: "4px",
    maxWidth: "100%",
  },
});

type ChipProps = {
  className?: string;
  disabled?: boolean;
  label: ReactElement;
  title?: string;
  "data-testid"?: string;
};

export default function Chip({ className, label, title, disabled, ...rest }: ChipProps): ReactElement {
  const classes = useStyles();
  return (
    <MUIChip
      className={classNames(classes.chip, className)}
      label={label}
      title={title}
      variant="outlined"
      size="small"
      disabled={disabled}
      {...rest}
    />
  );
}
