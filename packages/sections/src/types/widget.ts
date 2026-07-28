import { ComponentType } from 'react';
import type { Category } from 'ui';

/**
 * Generic widget interface for profile sections
 * Used across different entity types (Drug, Target, Disease, etc.)
 */
export interface Widget {
  definition: {
    id: string;
    name: string;
    shortName: string;
    hasData: (data: any) => boolean | undefined;
    isPrivate?: boolean;
    category?: Category | Category[];
  };
  Summary: ComponentType<any>;
  getBodyComponent: () => ComponentType<any>;
}

/**
 * Widget definition interface
 * Can be used independently when only the definition is needed
 */
export interface WidgetDefinition {
  id: string;
  name: string;
  shortName: string;
  hasData: (data: any) => boolean | undefined;
  isPrivate: boolean;
  category?: Category | Category[];
}

/**
 * Summary widget interface
 * Used when only the summary component is needed
 */
export interface SummaryWidget {
  definition: WidgetDefinition;
  Summary: ComponentType<any>;
}

/**
 * Body widget interface
 * Used when only the body component is needed
 */
export interface BodyWidget {
  definition: WidgetDefinition;
  getBodyComponent: () => ComponentType<any>;
} 