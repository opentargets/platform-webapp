import React from "react";

/**
 * Component Registry
 * 
 * Maintains a registry of section components that can be lazy-loaded on demand.
 * Allows reports to work even if components aren't currently loaded in memory.
 */

export interface ComponentManifest {
  id: string;
  path: string; // Relative path from sections root: "disease/Ontology", "variant/EnhancerToGenePredictions"
  type: "disease" | "drug" | "target" | "variant" | "evidence" | "credibleSet" | "study" | "common";
  exportName: string; // Name of the export: "default" or "Body" or "Section"
}

/**
 * Global component manifest - maps section IDs to their import paths
 * This allows components to be lazy-loaded on demand
 */
const componentManifest = new Map<string, ComponentManifest>();

/**
 * Cache for dynamically imported components
 */
const componentCache = new Map<string, React.ComponentType<any>>();

/**
 * Register a component in the manifest
 * Should be called once during app initialization
 */
export const registerComponentManifest = (manifest: ComponentManifest) => {
  componentManifest.set(manifest.id, manifest);
};

/**
 * Register multiple components at once
 */
export const registerComponentManifests = (manifests: ComponentManifest[]) => {
  manifests.forEach(manifest => componentManifest.set(manifest.id, manifest));
};

/**
 * Get component from cache or import it dynamically
 * Returns null if component can't be loaded
 */
export const getComponentAsync = async (
  sectionId: string
): Promise<React.ComponentType<any> | null> => {
  // Check cache first
  if (componentCache.has(sectionId)) {
    return componentCache.get(sectionId)!;
  }

  // Look up in manifest
  const manifest = componentManifest.get(sectionId);
  if (!manifest) {
    console.warn(`Component manifest not found for section: ${sectionId}`);
    return null;
  }

  try {
    // Dynamically import the component
    // This uses the manifest path to construct the correct import path
    const module = await import(
      /* webpackChunkName: "[request]" */
      `../../../sections/src/${manifest.path}/Body`
    );

    const component = manifest.exportName === "default" 
      ? module.default 
      : module[manifest.exportName];

    if (!component) {
      console.warn(
        `Export '${manifest.exportName}' not found in ${manifest.path}/Body`
      );
      return null;
    }

    // Cache the component
    componentCache.set(sectionId, component);
    return component;
  } catch (error) {
    console.error(`Failed to load component for section ${sectionId}:`, error);
    return null;
  }
};

/**
 * Get component synchronously from cache (returns null if not loaded)
 * Use this only if you're sure the component is already cached
 */
export const getComponentSync = (sectionId: string): React.ComponentType<any> | null => {
  return componentCache.get(sectionId) || null;
};

/**
 * Pre-load components for a report
 * Useful for loading all components needed for a report before rendering
 */
export const preloadComponentsForReport = async (
  sectionIds: string[]
): Promise<void> => {
  const promises = sectionIds
    .filter(id => !componentCache.has(id)) // Only load uncached components
    .map(id => getComponentAsync(id));

  await Promise.all(promises);
};

/**
 * Get manifest for a section (for offline/export scenarios)
 */
export const getComponentManifest = (sectionId: string): ComponentManifest | null => {
  return componentManifest.get(sectionId) || null;
};

/**
 * Get all registered manifests
 */
export const getAllComponentManifests = (): ComponentManifest[] => {
  return Array.from(componentManifest.values());
};

/**
 * Save component manifest to localStorage for offline access
 * Useful for export/sharing reports
 */
export const exportComponentManifest = (): string => {
  const manifests = getAllComponentManifests();
  return JSON.stringify(manifests, null, 2);
};

/**
 * Load component manifest from JSON
 * Useful for importing reports that list required components
 */
export const importComponentManifest = (json: string): void => {
  try {
    const manifests: ComponentManifest[] = JSON.parse(json);
    registerComponentManifests(manifests);
  } catch (error) {
    console.error("Failed to import component manifest:", error);
  }
};

/**
 * Clear the component cache (useful for testing)
 */
export const clearComponentCache = (): void => {
  componentCache.clear();
};
