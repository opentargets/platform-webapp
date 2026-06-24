import { ReactElement } from "react";
import { Box } from "@mui/material";
import { useAssociationsFocus } from "../../../context/AssociationsFocusContext";

function RowInteractorsWrapper({
  rowId,
  children,
  parentTable,
}: {
  rowId: string;
  parentTable: string;
  children: ReactElement;
}): ReactElement {
  const focusState = useAssociationsFocus();
  const focusElement = focusState.filter(
    e => e.row === rowId && e.table === parentTable && e.interactors
  );

  if (focusState.length < 1 || focusElement.length < 1) {
    return <></>;
  }

  return <Box>{children}</Box>;
}

export default RowInteractorsWrapper;
