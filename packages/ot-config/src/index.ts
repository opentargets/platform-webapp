export * from "./environment";
export * from "./theme";
export * from "./types";

// Add window augmentation
declare global {
  interface Window {
    configUrlApi?: string;
    configOTAiApi?: string;
    configPathwaysApi?: string;
    configProfile?: Record<string, unknown>;
    configGoogleTagManagerID?: string;
    configGeneticsPortalUrl?: string;
    gitVersion?: string;
  }
}
