import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Menu, MenuItem, TextField, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { scroller } from "react-scroll";
import usePlatformApi from "../../hooks/usePlatformApi";
import CategoryAvatar from "../CategoryAvatar";
import Chip from "../Chip/Chip";
import { CATEGORY_ICONS, primaryCategory, type Category } from "../Summary/categoryConfig";
import { useSummaryCategory } from "../Summary/SummaryCategoryContext";
import {
  PROFILE_TABS_SENTINEL_ID,
  SCROLL_OFFSET,
  STICKY_HEADER_HEIGHT,
} from "../Section/scrollOffset";
import useActiveSection from "../../hooks/useActiveSection";
import useScrollToHashOnMount from "../../hooks/useScrollToHashOnMount";
import { AnimatedWidgetName, StickyBar, WidgetSelector } from "./StickyProfileHeader.styles";

type WidgetDefinition = {
  id: string;
  name: string;
  shortName?: string;
  hasData: (data: any) => boolean | undefined;
  isPrivate?: boolean;
  category?: Category | Category[];
};

type StickyProfileHeaderProps = {
  title: string;
  Icon?: IconProp;
  externalLinks?: ReactNode;
  widgets: { definition: WidgetDefinition }[];
};

function StickyProfileHeader({
  title,
  Icon,
  externalLinks,
  widgets,
}: StickyProfileHeaderProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, entity } = usePlatformApi();
  const { activeCategory, setActiveCategory } = useSummaryCategory();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [filterText, setFilterText] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  // Keep the nav in sync with the category filter applied to the Summary/
  // Section widgets below - a hidden widget shouldn't be selectable or
  // trackable as the "active" one.
  const categoryWidgets = useMemo(
    () =>
      activeCategory === "All"
        ? widgets
        : widgets.filter((widget) => primaryCategory(widget.definition) === activeCategory),
    [widgets, activeCategory]
  );

  const ids = useMemo(() => categoryWidgets.map((widget) => widget.definition.id), [categoryWidgets]);
  const activeId = useActiveSection(ids);
  const activeWidget =
    categoryWidgets.find((widget) => widget.definition.id === activeId) ?? categoryWidgets[0];

  const entityData = data?.[entity];

  useScrollToHashOnMount(ids);

  useEffect(() => {
    const sentinel = document.getElementById(PROFILE_TABS_SENTINEL_ID);
    if (!sentinel) return undefined;

    const observer = new IntersectionObserver(([entry]) => setIsVisible(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, []);

  // Keep the URL shareable to whichever widget is in view, but only once the
  // user has actually scrolled into the sections (don't stamp a hash while
  // still at the top of the page). Uses raw history.replaceState rather than
  // navigate() - this fires on every section crossing while scrolling, and
  // navigate() re-renders the whole matched route tree on each call, which
  // is both wasteful and was surfacing an unrelated remount bug in one of
  // the section bodies.
  //
  // hasBeenVisible guards the "clear the hash" branch below so it only
  // fires once the user has actually scrolled down into the sections at
  // least once - otherwise a deep link (page loaded with a hash already in
  // the URL) would have its hash stripped in the instant before the
  // sentinel's IntersectionObserver reports its first isVisible=true.
  const hasBeenVisible = useRef(false);
  useEffect(() => {
    if (isVisible) {
      hasBeenVisible.current = true;
      if (activeId) window.history.replaceState(null, "", `#${activeId}`);
    } else if (hasBeenVisible.current && window.location.hash) {
      // Scrolled back above the sticky trigger - clear the section hash so
      // a refresh lands at the top of the page instead of re-scrolling
      // into whichever section was last active.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [isVisible, activeId]);

  const filteredWidgets = categoryWidgets.filter((widget) =>
    widget.definition.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleSelect = (id: string) => {
    scroller.scrollTo(id, { duration: 500, smooth: true, offset: SCROLL_OFFSET });
    // Preserve the existing search params (e.g. ?category=) - navigate()
    // with only `hash` set would otherwise drop them.
    navigate(
      { hash: `#${id}`, search: location.search },
      { replace: true, preventScrollReset: true }
    );
    setAnchorEl(null);
    setFilterText("");
  };

  if (categoryWidgets.length === 0) return null;

  const activeHasData = entityData ? !!activeWidget.definition.hasData(entityData) : true;

  return (
    <>
      {isVisible && (
        <StickyBar sx={{ height: STICKY_HEADER_HEIGHT }} data-testid="sticky-profile-header">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
            {Icon && <FontAwesomeIcon icon={Icon} size="sm" color={theme.palette.primary.dark} />}
            <Typography variant="subtitle1" fontWeight="bold" color="primary.dark" noWrap>
              {title}
            </Typography>
            {externalLinks && (
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ "& > :not(:first-of-type):before": { content: '" | "' } }}
              >
                {externalLinks}
              </Typography>
            )}
          </Box>

          <WidgetSelector onClick={(event) => setAnchorEl(event.currentTarget)}>
            <CategoryAvatar definition={activeWidget.definition} hasData={activeHasData} size={24} />
            <AnimatedWidgetName key={activeId} variant="body2" noWrap>
              {activeWidget.definition.name}
            </AnimatedWidgetName>
            <FontAwesomeIcon icon={faChevronDown} size="xs" />
          </WidgetSelector>

          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
            <TextField
              autoFocus
              size="small"
              placeholder="Filter widgets..."
              value={filterText}
              onChange={(event) => setFilterText(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              sx={{ px: 1.5, pb: 1, width: "100%" }}
            />
            {activeCategory !== "All" && (
              <Box sx={{ px: 1.5, pb: 1 }}>
                <Chip
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                      <FontAwesomeIcon icon={CATEGORY_ICONS[activeCategory]} style={{ fontSize: 12 }} />
                      {activeCategory}
                    </Box>
                  }
                  variant="filled"
                  onDelete={() => setActiveCategory("All")}
                  sx={{
                    height: 26,
                    borderRadius: 2,
                    fontSize: "0.7rem",
                    bgcolor: "primary.dark",
                    color: "common.white",
                    "& .MuiChip-deleteIcon": { color: "common.white" },
                  }}
                />
              </Box>
            )}
            {filteredWidgets.map((widget) => {
              const hasData = entityData ? !!widget.definition.hasData(entityData) : true;
              return (
                <MenuItem
                  key={widget.definition.id}
                  selected={widget.definition.id === activeId}
                  disabled={!hasData}
                  onClick={() => handleSelect(widget.definition.id)}
                >
                  <CategoryAvatar
                    definition={widget.definition}
                    hasData={hasData}
                    size={20}
                    sx={{ mr: 1 }}
                  />
                  {widget.definition.name}
                </MenuItem>
              );
            })}
          </Menu>
        </StickyBar>
      )}
    </>
  );
}

export default StickyProfileHeader;
