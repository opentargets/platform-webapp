import { Box, Chip, type SxProps, styled, type Theme, Tooltip } from "@mui/material";
import { naLabel } from "@ot/constants";
import type { ElementType, ReactElement } from "react";
import { v1 } from "uuid";

const StyledTooltip = styled(Tooltip)(({ theme }) => ({
  "& .MuiTooltip-tooltip": {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.grey[300]}`,
    color: theme.palette.text.primary,
  },
}));

const StyledChip = styled(Chip)({
  margin: "3px 5px 3px 0 !important",
}) as typeof Chip;

type ChipListItem = {
  customClass?: string;
  sx?: SxProps<Theme>;
  label: string;
  tooltip?: string;
  url?: string;
};

type ChipContainerProps = {
  children: ReactElement;
  item: ChipListItem;
};

type ChipListProps = {
  items?: ChipListItem[];
  small?: boolean;
};

function ChipContainer({ item, children }: ChipContainerProps): ReactElement {
  return item.tooltip ? (
    <StyledTooltip placement="top" title={item.tooltip}>
      {children}
    </StyledTooltip>
  ) : (
    children
  );
}

/**
 * Display a (horizontal) list of "chips".
 * Each chip can show an optional tooltip.
 * @param items Array of ChipListItems.
 * @param small Display each chip as size="small"
 */
function ChipList({ items, small }: ChipListProps): ReactElement[] | string {
  if (!items || items.length === 0) return naLabel;

  return items.map((item, index) => {
    const component: ElementType = item.url ? "a" : Box;
    return (
      <ChipContainer key={v1()} item={item}>
        <StyledChip
          data-testid={`chip-item-${index}`}
          component={component}
          href={item.url}
          className={item.customClass}
          sx={item.sx}
          clickable={!!item.url}
          target="_blank"
          noopener="true"
          noreferrer="true"
          color="primary"
          label={item.label}
          size={small ? "small" : "medium"}
        />
      </ChipContainer>
    );
  });
}

export default ChipList;
