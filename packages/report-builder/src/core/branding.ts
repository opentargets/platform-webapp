/**
 * Export branding: the organisation's name, logo, colours and fonts that the slides, paper,
 * working-PDF, Markdown and video exports (and their previews) draw. A host supplies a
 * `BrandingInput` on `ReportConfig.branding`; `resolveBranding` fills every gap from the neutral
 * defaults, derives tints and font stacks, and reads the logo's aspect ratio, so writers work
 * from one complete `ExportBranding`.
 *
 * Framework-free: lives in core so the React config and the export writers share one type.
 */

// ---------- types ----------

export interface BrandLogo {
  /** Inline SVG markup (crisp at any size), or a base64 `data:image/...` URL. */
  image: string;
  /** The same logo for dark backgrounds (statement slides); defaults to `image`. */
  imageOnDark?: string;
  /** width / height; read from the SVG viewBox or width/height when omitted (default 3). */
  aspect?: number;
  /** Alt text; defaults to the organisation name. */
  alt?: string;
}

/**
 * Slide palette. `*Soft` and `*Tint` are 50% and 30% mixes with white and are derived from
 * their base colour when not given.
 */
export interface SlideColors {
  heading: string; // headings, dark table headers, statement-slide background
  accent: string; // kicker, title-slide panel, "finding" tone
  accentSoft: string; // diagonal triangles, rule on dark slides
  accentTint: string; // entity chip, footer text and links on dark slides
  alert: string; // "warning" tone
  alertSoft: string; // "warning" tone on dark slides
  text: string; // body text
  textMuted: string; // footer, rail labels
  line: string; // table and chip borders
  panel: string; // figure placeholder background
  surface: string; // slide background
}

/** Paper, working PDF, DOCX and video palette. */
export interface DocumentColors {
  primary: string; // video kicker/accent
  primaryDark: string; // headings, links, table header text
  primaryLight: string; // table header background
  text: string;
  muted: string;
  border: string;
  finding: string; // callout tones
  warning: string;
  info: string;
}

export interface BrandFonts {
  heading: string; // family name
  body: string;
  mono: string;
  /** CSS stacks for HTML outputs; derived from the names when omitted. */
  headingStack: string;
  bodyStack: string;
  monoStack: string;
  /** Family names written into PPTX / DOCX, which can only use fonts installed on the reader's machine. Default: the names above. */
  office: { heading: string; body: string; mono: string };
}

export interface BrandWording {
  /** Soft label on the title slide when the report has no entity ("Platform report"). */
  reportKind: string;
  /** Narration of the video's closing scene. */
  endNarration: string;
}

export interface ExportBranding {
  /** Organisation name: PPTX company, logo alt text, "Open Targets 26.06" release labels. */
  organisation?: string;
  /** The product the data comes from: "Open Targets Platform" in bylines, footers and the video. */
  platform?: string;
  logo?: BrandLogo;
  slides: {
    colors: SlideColors;
    fonts: BrandFonts;
    /** Draw the diagonal panels on title and section slides. */
    decor: boolean;
  };
  document: {
    colors: DocumentColors;
    fonts: BrandFonts;
  };
  /** Stylesheet URLs (e.g. Google Fonts) linked from the print HTML so web fonts resolve. */
  fontStylesheets: string[];
  wording: BrandWording;
}

type FontsInput = Partial<Omit<BrandFonts, "office">> & { office?: Partial<BrandFonts["office"]> };

/** What a host passes: every field optional; see `resolveBranding` for the derivations. */
export interface BrandingInput {
  organisation?: string;
  platform?: string;
  logo?: BrandLogo;
  slides?: { colors?: Partial<SlideColors>; fonts?: FontsInput; decor?: boolean };
  document?: { colors?: Partial<DocumentColors>; fonts?: FontsInput };
  fontStylesheets?: string[];
  wording?: Partial<BrandWording>;
}

// ---------- colour helpers ----------

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

const toRgb = (hex: string): [number, number, number] | undefined => {
  const m = HEX.exec(hex.trim());
  if (!m) return undefined;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [Number.parseInt(h.slice(0, 2), 16), Number.parseInt(h.slice(2, 4), 16), Number.parseInt(h.slice(4, 6), 16)];
};

const toHex = (rgb: [number, number, number]): string =>
  `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

/** `amount` of the colour over white: 0.5 → the 50% tint. Non-hex input is returned unchanged. */
export const tint = (hex: string, amount: number): string => {
  const rgb = toRgb(hex);
  if (!rgb) return hex;
  return toHex(rgb.map((v) => v * amount + 255 * (1 - amount)) as [number, number, number]);
};

/** Callout tones on a light (content) and a dark (statement) slide background. */
export const slideTones = (
  colors: SlideColors,
): Record<"finding" | "warning" | "info", { light: string; dark: string }> => ({
  finding: { light: colors.accent, dark: colors.accentSoft },
  warning: { light: colors.alert, dark: colors.alertSoft },
  info: { light: colors.text, dark: colors.line },
});

export const slideTone = (colors: SlideColors, tone: string | undefined, on: "light" | "dark"): string => {
  const tones = slideTones(colors);
  return (tones[(tone ?? "finding") as keyof typeof tones] ?? tones.finding)[on];
};

// ---------- font helpers ----------

const quote = (family: string) => (/[^a-z0-9-]/i.test(family) ? `"${family}"` : family);

const resolveFonts = (base: BrandFonts, input?: FontsInput): BrandFonts => {
  const heading = input?.heading ?? base.heading;
  const body = input?.body ?? base.body;
  const mono = input?.mono ?? base.mono;
  const custom = (key: "heading" | "body" | "mono") => input?.[key] !== undefined && input[key] !== base[key];
  const stack = (key: "heading" | "body" | "mono", name: string, generic: string) =>
    input?.[`${key}Stack`] ?? (custom(key) ? `${quote(name)}, ${generic}` : base[`${key}Stack`]);
  return {
    heading,
    body,
    mono,
    headingStack: stack("heading", heading, "Arial, sans-serif"),
    bodyStack: stack("body", body, "Arial, sans-serif"),
    monoStack: stack("mono", mono, "Menlo, monospace"),
    office: {
      heading: input?.office?.heading ?? (custom("heading") ? heading : base.office.heading),
      body: input?.office?.body ?? (custom("body") ? body : base.office.body),
      mono: input?.office?.mono ?? (custom("mono") ? mono : base.office.mono),
    },
  };
};

// ---------- logo helpers ----------

export const isSvgMarkup = (image: string): boolean => /^\s*<svg[\s>]/i.test(image);

/** width / height from an SVG's viewBox (else width/height attributes); undefined when unreadable. */
export const svgAspect = (svg: string): number | undefined => {
  const viewBox = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i.exec(svg);
  if (viewBox) {
    const w = Number.parseFloat(viewBox[1]);
    const h = Number.parseFloat(viewBox[2]);
    if (w > 0 && h > 0) return w / h;
  }
  const w = /<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i.exec(svg);
  const h = /<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i.exec(svg);
  if (w && h) {
    const ww = Number.parseFloat(w[1]);
    const hh = Number.parseFloat(h[1]);
    if (ww > 0 && hh > 0) return ww / hh;
  }
  return undefined;
};

const DEFAULT_LOGO_ASPECT = 3;

const resolveLogo = (logo: BrandLogo | undefined, organisation: string | undefined): BrandLogo | undefined => {
  if (!logo?.image) return undefined;
  const aspect = logo.aspect ?? (isSvgMarkup(logo.image) ? svgAspect(logo.image) : undefined) ?? DEFAULT_LOGO_ASPECT;
  return { ...logo, aspect, alt: logo.alt ?? organisation ?? "Logo", imageOnDark: logo.imageOnDark ?? logo.image };
};

/** The logo's width / height, or undefined when the branding has no logo. */
export const logoAspect = (branding: Pick<ExportBranding, "logo">): number | undefined =>
  branding.logo ? (branding.logo.aspect ?? DEFAULT_LOGO_ASPECT) : undefined;

// ---------- defaults ----------

/**
 * Neutral defaults: no organisation, logo or web fonts; a slate/blue palette; fonts every
 * machine has (Arial, Courier New) so office outputs render as previewed.
 */
export const defaultBranding = (): ExportBranding => {
  const arial = (): BrandFonts => ({
    heading: "Arial",
    body: "Arial",
    mono: "Courier New",
    headingStack: "Arial, Helvetica, sans-serif",
    bodyStack: "Arial, Helvetica, sans-serif",
    monoStack: '"Courier New", Menlo, monospace',
    office: { heading: "Arial", body: "Arial", mono: "Courier New" },
  });
  const heading = "#1f2937";
  const accent = "#2563eb";
  const alert = "#dc2626";
  const text = "#374151";
  return {
    slides: {
      colors: {
        heading,
        accent,
        accentSoft: tint(accent, 0.5),
        accentTint: tint(accent, 0.3),
        alert,
        alertSoft: tint(alert, 0.5),
        text,
        textMuted: tint(text, 0.5),
        line: tint(text, 0.3),
        panel: "#f3f4f6",
        surface: "#ffffff",
      },
      fonts: arial(),
      decor: true,
    },
    document: {
      colors: {
        primary: "#2563eb",
        primaryDark: "#1d4ed8",
        primaryLight: "#eff6ff",
        text: "#212121",
        muted: "#757575",
        border: "#e0e0e0",
        finding: "#2e7d32",
        warning: "#ed6c02",
        info: "#0288d1",
      },
      fonts: arial(),
    },
    fontStylesheets: [],
    wording: { reportKind: "Report", endNarration: "Explore the full data." },
  };
};

/**
 * A complete branding from a partial one: missing colours come from the defaults, tints from
 * their base colour, font stacks and office names from the family names, the logo's aspect
 * from its SVG, and wording from the platform name.
 */
export function resolveBranding(input?: BrandingInput): ExportBranding {
  const base = defaultBranding();
  const organisation = input?.organisation?.trim() || undefined;
  const platform = input?.platform?.trim() || undefined;

  const sc = input?.slides?.colors ?? {};
  const heading = sc.heading ?? base.slides.colors.heading;
  const accent = sc.accent ?? base.slides.colors.accent;
  const alert = sc.alert ?? base.slides.colors.alert;
  const text = sc.text ?? base.slides.colors.text;
  const slideColors: SlideColors = {
    heading,
    accent,
    accentSoft: sc.accentSoft ?? tint(accent, 0.5),
    accentTint: sc.accentTint ?? tint(accent, 0.3),
    alert,
    alertSoft: sc.alertSoft ?? tint(alert, 0.5),
    text,
    textMuted: sc.textMuted ?? tint(text, 0.5),
    line: sc.line ?? tint(text, 0.3),
    panel: sc.panel ?? base.slides.colors.panel,
    surface: sc.surface ?? base.slides.colors.surface,
  };

  const wording: BrandWording = {
    reportKind: input?.wording?.reportKind ?? (platform ? "Platform report" : base.wording.reportKind),
    endNarration: input?.wording?.endNarration ?? (platform ? `Explore the data on the ${platform}.` : base.wording.endNarration),
  };

  return {
    organisation,
    platform,
    logo: resolveLogo(input?.logo, organisation),
    slides: {
      colors: slideColors,
      fonts: resolveFonts(base.slides.fonts, input?.slides?.fonts),
      decor: input?.slides?.decor ?? base.slides.decor,
    },
    document: {
      colors: { ...base.document.colors, ...input?.document?.colors },
      fonts: resolveFonts(base.document.fonts, input?.document?.fonts),
    },
    fontStylesheets: input?.fontStylesheets ?? base.fontStylesheets,
    wording,
  };
}

// ---------- wording ----------

type Names = Pick<ExportBranding, "organisation" | "platform">;

/** "Open Targets 26.06", else the platform name: footers, methods tables, captions. */
export const releaseLabel = (b: Names, release?: string): string => {
  if (release) return b.organisation ? `${b.organisation} ${release}` : `Release ${release}`;
  return b.platform ?? b.organisation ?? "";
};

/** "Open Targets Platform 26.06": the video footer and title scene. */
export const platformLabel = (b: Names, release?: string): string => {
  if (!b.platform) return releaseLabel(b, release);
  return release ? `${b.platform} ${release}` : b.platform;
};

/** "Assembled from Open Targets Platform 26.06 · 2026-10-02": the paper byline. */
export const bylineText = (b: Names, release?: string, date?: string): string => {
  const source = b.platform
    ? `from ${b.platform}${release ? ` ${release}` : ""}`
    : release
      ? `from ${releaseLabel(b, release)}`
      : "";
  return [`Assembled${source ? ` ${source}` : ""}`, date].filter(Boolean).join(" · ");
};

/** The paper's "Data availability" paragraph. */
export const dataAvailabilityText = (b: Names, release?: string, date?: string): string => {
  const from = b.platform ? ` from the ${b.platform}` : "";
  const rel = release ? ` (release ${release})` : "";
  const on = date ? ` on ${date}` : "";
  const pages = b.platform ? "platform pages" : "source pages";
  return `All data were retrieved${from}${rel}${on}. Each figure and table can be reproduced from the ${pages} below.`;
};

/** PPTX subject / DOCX creator: "Open Targets Platform report". */
export const publisherLabel = (b: Names): string => b.platform ?? b.organisation ?? "";
