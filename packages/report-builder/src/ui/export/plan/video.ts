import type { RichTextDoc } from "../../../core";
import type {
  CollectHooks,
  ExportDocument,
  ExportWarning,
  FigureAsset,
  TableData,
  VideoPlan,
  VideoScene,
  VideoSceneKind,
  VideoSceneOverride,
  VideoSettings,
} from "../types";

export const DEFAULT_MIN_DURATION_S = 3;
export const MAX_VIDEO_S = 90;
export const END_NARRATION = "Explore the data on the Open Targets Platform.";

// ---------- TipTap → narration text ----------

type Node = RichTextDoc;

const endSentence = (text: string): string => (/[.!?…:;]$/.test(text) ? text : `${text}.`);

const inlineText = (nodes: Node[] | undefined): string =>
  (nodes ?? [])
    .map((n) => (n.type === "text" ? n.text ?? "" : n.type === "hardBreak" ? " " : inlineText(n.content)))
    .join("");

const blockTexts = (node: Node): string[] => {
  switch (node.type) {
    case "text":
      return [node.text ?? ""];
    case "paragraph":
    case "heading":
      return [inlineText(node.content)];
    case "bulletList":
    case "orderedList":
      // Each list item reads as its own sentence
      return (node.content ?? []).map((item) => {
        const text = (item.content ?? []).flatMap(blockTexts).join(" ").replace(/\s+/g, " ").trim();
        return text ? endSentence(text) : "";
      });
    default:
      return (node.content ?? []).flatMap(blockTexts);
  }
};

/** TipTap JSON → one line of narration: blocks joined with spaces, list items as sentences, marks dropped. */
export function toNarrationText(doc: RichTextDoc | null | undefined): string {
  if (!doc) return "";
  return blockTexts(doc)
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
}

// ---------- plan ----------

/** Stable scene ids: one scene per block, plus the auto title and end scenes. */
export const sceneIdFor = (blockId: string | null, kind: VideoSceneKind): string =>
  blockId ? `scene-${blockId}` : `scene-${kind}`;

const overrideKey = (o: { blockId: string | null; kind: VideoSceneKind }) => o.blockId ?? `auto:${o.kind}`;

interface Candidate {
  override: VideoSceneOverride; // defaults, used when the scene is new
  kicker?: string;
  subtitle?: string;
  tone?: VideoScene["tone"];
  asset?: FigureAsset;
  table?: TableData;
  missing?: boolean;
}

const newOverride = (
  blockId: string | null,
  kind: VideoSceneKind,
  title: string,
  narration: string
): VideoSceneOverride => ({
  sceneId: sceneIdFor(blockId, kind),
  blockId,
  kind,
  include: true,
  title,
  narration,
  hotspots: [],
});

/** "platform.opentargets.org/target/ENSG…" — the deep link as it reads on screen. */
export const displayLink = (url: string): string => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

export const releaseText = (release?: string): string =>
  release ? `Open Targets Platform ${release}` : "Open Targets Platform";

function candidatesFor(doc: ExportDocument, entityDeepLink?: CollectHooks["entityDeepLink"]): Candidate[] {
  const out: Candidate[] = [];
  const entityLabel = doc.entity?.label ?? doc.entity?.id;

  out.push({
    override: newOverride(null, "title", doc.title, doc.description?.trim() ?? ""),
    kicker: doc.entity?.type ? `${doc.entity.type} report` : "Report",
    subtitle: [entityLabel, releaseText(doc.dataRelease)].filter(Boolean).join(" · "),
  });

  let kicker: string | undefined;
  let pendingNarration: string[] = [];
  let lastFigure: Candidate | undefined;

  doc.nodes.forEach((node) => {
    switch (node.type) {
      case "chapter":
        kicker = node.title || kicker;
        return;
      case "heading":
        kicker = node.text || kicker;
        return;
      case "prose": {
        const text = toNarrationText(node.doc);
        if (!text) return;
        if (node.tone === "finding") {
          out.push({ override: newOverride(node.id, "statement", text, text), kicker: kicker ?? "Finding", tone: "finding" });
          kicker = undefined;
        } else {
          pendingNarration.push(text);
        }
        return;
      }
      case "figure":
      case "table": {
        const candidate: Candidate = {
          override: newOverride(node.id, "figure", node.takeaway?.trim() || node.title, pendingNarration.join(" ")),
          kicker,
          asset: node.type === "figure" ? node.asset : undefined,
          table: node.type === "table" ? node.data : undefined,
          missing: node.type === "figure" && node.asset.kind === "missing",
        };
        out.push(candidate);
        pendingNarration = [];
        kicker = undefined;
        lastFigure = candidate;
        return;
      }
      default:
        // dataSource, divider: not part of the video
        return;
    }
  });
  // Text after the last figure narrates that figure
  if (pendingNarration.length && lastFigure) {
    const o = lastFigure.override;
    o.narration = [o.narration, ...pendingNarration].filter(Boolean).join(" ");
  }

  const link = entityDeepLink?.(doc.entity) ?? "";
  out.push({
    override: newOverride(null, "end", "Explore the data", END_NARRATION),
    kicker: doc.title,
    subtitle: displayLink(link),
  });
  return out;
}

/**
 * IR + VideoSettings → scenes (excluded ones too, flagged by `include`). Overrides are matched by block id; new blocks get a new override
 * appended in report order, deleted blocks drop theirs. The title scene stays first and the end
 * scene last. Pure: the caller persists `overrides` when they differ from the stored ones.
 */
export function planVideo(doc: ExportDocument, settings: VideoSettings, opts: { hooks?: CollectHooks } = {}): VideoPlan {
  const candidates = candidatesFor(doc, opts.hooks?.entityDeepLink);
  const byKey = new Map(candidates.map((c) => [overrideKey(c.override), c]));

  const kept: VideoSceneOverride[] = [];
  const seen = new Set<string>();
  settings.scenes.forEach((o) => {
    const key = overrideKey(o);
    const candidate = byKey.get(key);
    if (!candidate || seen.has(key)) return;
    seen.add(key);
    // A block whose scene kind changed (e.g. a callout's tone) starts over from the new defaults
    kept.push(candidate.override.kind === o.kind ? { ...o, sceneId: candidate.override.sceneId } : candidate.override);
  });
  candidates.forEach((c) => {
    if (!seen.has(overrideKey(c.override))) kept.push(c.override);
  });
  const overrides = [
    ...kept.filter((o) => o.kind === "title"),
    ...kept.filter((o) => o.kind !== "title" && o.kind !== "end"),
    ...kept.filter((o) => o.kind === "end"),
  ];

  const scenes: VideoScene[] = overrides.map((o) => {
    const c = byKey.get(overrideKey(o))!;
    return {
      ...o,
      // The end card is switched by `endCard` (step 3 and its row in step 2)
      include: o.kind === "end" ? settings.endCard : o.include,
      minDurationS: o.minDurationS ?? DEFAULT_MIN_DURATION_S,
      kicker: c.kicker,
      subtitle: c.subtitle,
      tone: c.tone,
      asset: c.asset,
      table: c.table,
      missing: c.missing,
    };
  });

  const warnings: ExportWarning[] = [];
  scenes.forEach((s) => {
    if (!s.include || s.kind !== "figure") return;
    if (s.missing) {
      const reason = s.asset?.kind === "missing" ? ` (${s.asset.reason})` : "";
      warnings.push({
        nodeId: s.blockId ?? undefined,
        severity: "warn",
        code: "FIGURE_MISSING",
        message: `“${s.title}” could not be rendered${reason}; the scene shows a placeholder.`,
      });
    }
    if (!s.narration.trim()) {
      warnings.push({
        nodeId: s.blockId ?? undefined,
        severity: "info",
        code: "NO_NARRATION",
        message: `No narration: the scene lasts ${s.minDurationS} s.`,
      });
    }
  });

  return { scenes, overrides, warnings, title: doc.title, dataRelease: doc.dataRelease };
}

/** Warnings that need runtime facts: scene durations (timing) and the current figure image hashes. */
export function runtimeVideoWarnings(
  scenes: VideoScene[],
  durations: Record<string, number>,
  imageHashes: Record<string, string | undefined>
): ExportWarning[] {
  const warnings: ExportWarning[] = [];
  const included = scenes.filter((s) => s.include);
  const total = included.reduce((sum, s) => sum + (durations[s.sceneId] ?? s.minDurationS), 0);
  if (total > MAX_VIDEO_S) {
    warnings.push({
      severity: "warn",
      code: "LONG_VIDEO",
      message: `The video is ${Math.round(total)} s long; social platforms work best under ${MAX_VIDEO_S} s. Exclude scenes or shorten narration.`,
    });
  }
  included.forEach((s) => {
    if (hotspotImageChanged(s, imageHashes[s.sceneId])) {
      warnings.push({
        nodeId: s.blockId ?? undefined,
        severity: "warn",
        code: "HOTSPOT_IMAGE_CHANGED",
        message: "The figure has changed since these hotspots were drawn. Check their positions.",
      });
    }
  });
  return warnings;
}

export const hotspotImageChanged = (scene: Pick<VideoScene, "hotspots" | "imageHash">, currentHash?: string) =>
  scene.hotspots.length > 0 && !!currentHash && !!scene.imageHash && scene.imageHash !== currentHash;

/** Overrides equal as stored data (drives "persist the reconciled list only when it changed"). */
export const sameOverrides = (a: VideoSceneOverride[], b: VideoSceneOverride[]): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
