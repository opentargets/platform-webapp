import { Avatar, type SxProps, type Theme, Tooltip } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CATEGORY_ICONS, type Category } from "./Summary/categoryConfig";

type CategoryAvatarProps = {
  definition: { category?: Category | Category[] };
  hasData: boolean;
  error?: boolean;
  size?: number;
  shape?: "circular" | "square";
  className?: string;
  sx?: SxProps<Theme>;
};

function CategoryAvatar({
  definition,
  hasData,
  error,
  size = 40,
  shape = "circular",
  className,
  sx,
}: CategoryAvatarProps) {
  const categories: Category[] = definition.category
    ? ([] as Category[]).concat(definition.category)
    : [];
  const primary = categories[0];
  const icon = primary ? CATEGORY_ICONS[primary] : undefined;

  const avatar = (
    <Avatar
      variant={shape}
      className={className}
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        bgcolor: error ? "secondary.main" : hasData ? "primary.dark" : "grey.300",
        color: error || hasData ? "white" : "grey.600",
        ...sx,
      }}
    >
      {icon && <FontAwesomeIcon icon={icon} />}
    </Avatar>
  );

  return categories.length > 0 ? <Tooltip title={categories.join(", ")}>{avatar}</Tooltip> : avatar;
}

export default CategoryAvatar;
