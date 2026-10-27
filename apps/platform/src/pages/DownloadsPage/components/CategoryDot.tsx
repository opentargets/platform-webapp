import { Box } from "ui";
import { getCategoryColor } from "../categoryColors";

interface CategoryDotProps {
  category: string;
  size?: number;
}

/** The small filled circle in a dataset's category colour, shared by cards, chips, rows and legends. */
function CategoryDot({ category, size = 8 }: CategoryDotProps) {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: getCategoryColor(category),
        flex: "none",
      }}
    />
  );
}

export default CategoryDot;
