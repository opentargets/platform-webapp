import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Menu, MenuItem, TextField, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { scroller } from "react-scroll";
import usePlatformApi from "../../hooks/usePlatformApi";
import CategoryAvatar from "../CategoryAvatar";
import type { Category } from "../Summary/categoryConfig";
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
  const { data, entity } = usePlatformApi();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [filterText, setFilterText] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  const ids = useMemo(() => widgets.map((widget) => widget.definition.id), [widgets]);
  const activeId = useActiveSection(ids);
  const activeWidget = widgets.find((widget) => widget.definition.id === activeId) ?? widgets[0];

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
  useEffect(() => {
    if (!isVisible || !activeId) return;
    window.history.replaceState(null, "", `#${activeId}`);
  }, [isVisible, activeId]);

  const filteredWidgets = widgets.filter((widget) =>
    widget.definition.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleSelect = (id: string) => {
    scroller.scrollTo(id, { duration: 500, smooth: true, offset: SCROLL_OFFSET });
    navigate({ hash: `#${id}` }, { replace: true, preventScrollReset: true });
    setAnchorEl(null);
    setFilterText("");
  };

  if (widgets.length === 0) return null;

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
