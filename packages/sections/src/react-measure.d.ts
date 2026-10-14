// react-measure ships no types; only the pieces used by the sections are declared
declare module "react-measure" {
  import type { ComponentType } from "react";

  export type ContentRect = {
    bounds: { top: number; left: number; width: number; height: number };
  };

  export type MeasuredComponentProps = {
    measureRef: (node: HTMLElement | null) => void;
    contentRect: ContentRect;
  };

  export function withContentRect(
    types: string | string[]
  ): <P extends MeasuredComponentProps>(
    component: ComponentType<P>
  ) => ComponentType<Omit<P, keyof MeasuredComponentProps>>;
}
