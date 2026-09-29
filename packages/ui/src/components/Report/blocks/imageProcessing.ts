export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;
const PNG_KEEP_LIMIT = 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/svg+xml,image/webp,image/gif";

export interface ProcessedImage {
  src: string; // data URL
  fileName: string;
}

const readAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This file couldn't be read as an image."));
    };
    img.src = url;
  });

const toBase64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

/**
 * Strip anything in an SVG that could execute or reach out: <script>,
 * <foreignObject>, on* handlers, javascript: URLs, and non-local hrefs.
 */
export const sanitizeSvg = (svgText: string): string => {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  if (doc.getElementsByTagName("parsererror").length > 0 || doc.documentElement.nodeName !== "svg") {
    throw new Error("This SVG couldn't be parsed.");
  }
  doc.querySelectorAll("script, foreignObject, iframe, embed, object").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
      } else if (name === "href" || name.endsWith(":href") || name === "src") {
        // Keep in-document refs (#id) and inline raster data; drop everything else
        if (!(value.startsWith("#") || /^data:image\/(png|jpe?g|gif|webp);/.test(value))) {
          el.removeAttribute(attr.name);
        }
      } else if (value.includes("javascript:")) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return new XMLSerializer().serializeToString(doc.documentElement);
};

const hasTransparency = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
};

/**
 * Read an image file into a storable data URL. Rasters are downscaled to 1600px
 * on the long edge and re-encoded as JPEG (PNGs with transparency stay PNG if
 * they come in under 1 MB); SVGs are sanitized.
 */
export const processImageFile = async (file: File): Promise<ProcessedImage> => {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Images must be 15 MB or smaller.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Only png, jpg and svg images are supported.");
  }
  const fileName = file.name || "pasted-image";

  if (file.type === "image/svg+xml") {
    const clean = sanitizeSvg(await readAsText(file));
    return { src: `data:image/svg+xml;base64,${toBase64(clean)}`, fileName };
  }

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't process images.");
  ctx.drawImage(img, 0, 0, width, height);

  if (file.type === "image/png" && hasTransparency(ctx, width, height)) {
    const png = canvas.toDataURL("image/png");
    if (png.length < PNG_KEEP_LIMIT) return { src: png, fileName };
  }

  // JPEG has no alpha: flatten onto white
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  return { src: canvas.toDataURL("image/jpeg", JPEG_QUALITY), fileName };
};
