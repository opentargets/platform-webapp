import type { Meta, StoryObj } from "@storybook/react";
import Link from "./Link";

const meta: Meta<typeof Link> = {
  title: "UI Components/Link",
  component: Link,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Link>;

// External link (using <a> tag - no RouterLink needed)
export const ExternalLink: Story = {
  args: {
    to: "https://www.opentargets.org",
    external: true,
    children: "Visit Open Targets",
  },
};

// External link opening in new tab
export const ExternalNewTab: Story = {
  args: {
    to: "https://www.opentargets.org",
    external: true,
    newTab: true,
    children: "Open in New Tab",
  },
};

// Internal link (RouterLink)
export const InternalLink: Story = {
  args: {
    to: "/target/ENSG00000139618",
    children: "Internal Route Link",
  },
};

// Link with static tooltip
export const WithTooltip: Story = {
  args: {
    to: "/target/ENSG00000139618",
    tooltip: "This is a helpful tooltip",
    children: "Hover for tooltip",
  },
};

// Link with async tooltip (fetches data from API on hover)
export const WithAsyncTooltip: Story = {
  args: {
    to: "/target/ENSG00000139618",
    asyncTooltip: true,
    children: "BRCA2 Gene",
  },
};
