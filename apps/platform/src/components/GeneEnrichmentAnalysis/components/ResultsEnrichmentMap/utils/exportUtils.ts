import type { Core as CytoscapeCore } from "cytoscape";

/**
 * Cytoscape JSON export format
 * Compatible with Cytoscape Desktop import
 */
export type CytoscapeJSONExport = Record<string, unknown>;

/**
 * Add white space padding around an image
 * @param imageDataUrl - Data URL of the image
 * @param paddingPx - Padding size in pixels
 * @param format - Image format ('png' or 'jpeg')
 * @returns Promise that resolves to padded image data URL
 */
async function addPaddingToImage(
  imageDataUrl: string,
  paddingPx: number = 40,
  format: "png" | "jpeg" = "png"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Set canvas size with padding
      canvas.width = img.width + paddingPx * 2;
      canvas.height = img.height + paddingPx * 2;

      // Fill with white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the original image in the center
      ctx.drawImage(img, paddingPx, paddingPx);

      // Convert back to data URL
      const paddedImageUrl = canvas.toDataURL(
        format === "jpeg" ? "image/jpeg" : "image/png",
        0.9
      );
      resolve(paddedImageUrl);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageDataUrl;
  });
}

/**
 * Export the network as a JPEG image with white space padding
 * @param cy - Cytoscape instance
 * @param filename - Output filename (without extension)
 * @param paddingPx - Padding size in pixels (default: 40)
 */
export async function exportAsJPEG(
  cy: CytoscapeCore,
  filename: string = "network",
  paddingPx: number = 40
): Promise<void> {
  try {
    const scale = 2; // Higher quality export
    const jpg = cy.jpeg({ quality: 0.9, scale, full: true });

    // Add padding to the image
    const paddedJpg = await addPaddingToImage(jpg, paddingPx, "jpeg");

    const link = document.createElement("a");
    link.href = paddedJpg;
    link.download = `${filename}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error exporting as JPEG:", error);
    throw new Error("Failed to export network as JPEG");
  }
}

/**
 * Export the network as Cytoscape-compatible JSON
 * This format can be imported into Cytoscape Desktop
 * Uses cy.json() which returns the complete graph state in Desktop-compatible format
 * @param cy - Cytoscape instance
 * @param filename - Output filename (without extension)
 */
export function exportAsCytoscapeJSON(cy: CytoscapeCore, filename: string = "network"): void {
  try {
    // Get the complete graph state in Cytoscape format
    const cytoscapeJSON = cy.json();

    // Download as JSON file
    const jsonString = JSON.stringify(cytoscapeJSON, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting as Cytoscape JSON:", error);
    throw new Error("Failed to export network as Cytoscape JSON");
  }
}

/**
 * Export the network as a PNG image with white space padding
 * @param cy - Cytoscape instance
 * @param filename - Output filename (without extension)
 * @param paddingPx - Padding size in pixels (default: 40)
 */
export async function exportAsPNG(
  cy: CytoscapeCore,
  filename: string = "network",
  paddingPx: number = 40
): Promise<void> {
  try {
    const scale = 2; // Higher quality export
    const png = cy.png({ scale, full: true });

    // Add padding to the image
    const paddedPng = await addPaddingToImage(png, paddingPx, "png");

    const link = document.createElement("a");
    link.href = paddedPng;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error exporting as PNG:", error);
    throw new Error("Failed to export network as PNG");
  }
}

/**
 * Copy network to clipboard as JSON (Cytoscape format)
 * Format is compatible with Cytoscape Desktop import
 * Uses cy.json() which returns the complete graph state
 * @param cy - Cytoscape instance
 */
export function copyNetworkToClipboard(cy: CytoscapeCore): void {
  try {
    // Get the complete graph state in Cytoscape format
    const cytoscapeJSON = cy.json();
    const jsonString = JSON.stringify(cytoscapeJSON, null, 2);

    navigator.clipboard.writeText(jsonString).then(() => {
      console.log("Network JSON copied to clipboard");
    }).catch((err) => {
      console.error("Failed to copy to clipboard:", err);
      throw new Error("Failed to copy network to clipboard");
    });
  } catch (error) {
    console.error("Error copying network to clipboard:", error);
    throw new Error("Failed to copy network to clipboard");
  }
}
