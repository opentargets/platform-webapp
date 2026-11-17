interface BagPlusIconProps {
  size?: number;
}

/**
 * A shopping bag with a plus inside, for "add to bag" actions. Drawn here
 * because the free Font Awesome set has no bag-plus icon (only a cart one).
 * Takes the surrounding text colour.
 */
function BagPlusIcon({ size = 14 }: BagPlusIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      style={{ flex: "none" }}
    >
      {/* handle */}
      <path d="M5.5 5.25V4a2.5 2.5 0 0 1 5 0v1.25" />
      {/* body */}
      <rect x="2.25" y="5.25" width="11.5" height="9.5" rx="1.5" />
      {/* plus */}
      <path d="M8 7.75v4.5M5.75 10h4.5" />
    </svg>
  );
}

export default BagPlusIcon;
