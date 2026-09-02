// Height (px) of the sticky profile header bar. Sections must scroll to this
// offset below the viewport top so they don't land underneath the pinned bar.
export const STICKY_HEADER_HEIGHT = 56;
export const SCROLL_OFFSET = -STICKY_HEADER_HEIGHT;

// DOM id of the profile tabs row (rendered at *Page.tsx level, above the
// entity header/sections). StickyProfileHeader reveals itself once this
// element scrolls out of view, so it must be tagged with this id.
export const PROFILE_TABS_SENTINEL_ID = "profile-tabs-sentinel";
