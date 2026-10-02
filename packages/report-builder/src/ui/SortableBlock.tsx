import React, { createContext, ReactNode, useContext, useMemo } from "react";
import { Box, BoxProps } from "@mui/material";
import { useSortable } from "@dnd-kit/react/sortable";

interface SortableBlockValue {
  handleRef: (element: Element | null) => void;
  isDragging: boolean;
}

const SortableBlockContext = createContext<SortableBlockValue>({
  handleRef: () => {},
  isDragging: false,
});

/** The drag handle ref and drag state of the enclosing SortableBlock */
export const useSortableBlock = () => useContext(SortableBlockContext);

type SortableBlockProps = Omit<BoxProps, "ref"> & {
  id: string;
  index: number;
  children: ReactNode;
};

/**
 * One sortable item in the report list: the block plus everything that belongs
 * under it (inline inspector, insert slot). dnd-kit moves the sortable element in
 * the DOM while dragging, so it must wrap all of these; with the slot outside, the
 * slots were left behind and blocks ended up with no space between them until a
 * reload.
 */
export const SortableBlock: React.FC<SortableBlockProps> = ({ id, index, children, ...boxProps }) => {
  const { ref, handleRef, isDragging } = useSortable({ id, index });
  const value = useMemo(() => ({ handleRef, isDragging }), [handleRef, isDragging]);

  return (
    <Box ref={ref} {...boxProps}>
      <SortableBlockContext.Provider value={value}>{children}</SortableBlockContext.Provider>
    </Box>
  );
};

export default SortableBlock;
