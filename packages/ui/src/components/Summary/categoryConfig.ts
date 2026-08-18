import {
  faBullseye,
  faDisease,
  faPills,
  faLink,
  faDna,
  faVial,
  faBook,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export const CATEGORIES = [
  "Target",
  "Disease",
  "Drug",
  "Target-Disease",
  "Target-Variant",
  "Disease-Variant",
  "Literature",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_ICONS: Record<Category, IconDefinition> = {
  Target: faBullseye,
  Disease: faDisease,
  Drug: faPills,
  "Target-Disease": faLink,
  "Target-Variant": faDna,
  "Disease-Variant": faVial,
  Literature: faBook,
};

export function primaryCategory(definition: {
  category?: Category | Category[];
}): Category | undefined {
  const category = definition.category;
  return Array.isArray(category) ? category[0] : category;
}
