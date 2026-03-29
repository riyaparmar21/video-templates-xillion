import { DEFAULT_SAFE_AREA, MAX_ACCENT_WORDS } from "./defaults";
import type {
  HorizontalAlign,
  LayoutMode,
  MaskFrameMeta,
  MaskManifest,
  NormalizedAnchor,
  SpatialPlan,
  SpatialPlanBlock,
} from "./types";

const CLAMP_STYLE = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const sanitizeText = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

export const getBlockForFrame = (
  plan: SpatialPlan,
  frame: number,
): SpatialPlanBlock | null => {
  const match = plan.blocks.find(
    (block) => frame >= block.startFrame && frame <= block.endFrame,
  );

  if (match) {
    return match;
  }

  if (plan.blocks.length === 0) {
    return null;
  }

  if (frame < plan.blocks[0].startFrame) {
    return plan.blocks[0];
  }

  return plan.blocks[plan.blocks.length - 1];
};

export const resolveMaskSrcForFrame = (
  manifest: MaskManifest,
  frame: number,
): string | undefined => {
  if (manifest.frameCount <= 0) {
    return undefined;
  }

  const clampedFrame = Math.max(0, Math.min(frame, manifest.frameCount - 1));
  const index = manifest.maskStartIndex + clampedFrame;
  const padded = String(index).padStart(5, "0");

  return manifest.maskPattern.replace("%05d", padded).replace("%d", String(index));
};

export const getMaskMetaForFrame = (
  manifest: MaskManifest,
  frame: number,
): MaskFrameMeta | null => {
  if (manifest.frames && manifest.frames.length > 0) {
    const clampedFrame = Math.max(0, Math.min(frame, manifest.frames.length - 1));
    const meta = manifest.frames[clampedFrame];

    return {
      ...meta,
      maskSrc: meta.maskSrc ?? resolveMaskSrcForFrame(manifest, meta.frame),
    };
  }

  if (manifest.subjectTrack) {
    const clampedFrame = Math.max(0, Math.min(frame, manifest.frameCount - 1));
    return {
      frame: clampedFrame,
      hasSubject: manifest.subjectTrack.hasSubject,
      bbox: manifest.subjectTrack.bbox ?? null,
      faceSafe: manifest.subjectTrack.faceSafe ?? null,
      maskSrc: resolveMaskSrcForFrame(manifest, clampedFrame),
    };
  }

  if (manifest.frameCount <= 0) {
    return null;
  }

  const clampedFrame = Math.max(0, Math.min(frame, manifest.frameCount - 1));
  return {
    frame: clampedFrame,
    hasSubject: false,
    bbox: null,
    faceSafe: null,
    maskSrc: resolveMaskSrcForFrame(manifest, clampedFrame),
  };
};

export const resolveLayoutMode = (
  block: SpatialPlanBlock,
  maskMeta: MaskFrameMeta | null,
): LayoutMode => {
  if (!maskMeta?.hasSubject) {
    return block.layoutMode === "object-anchored" ? "object-anchored" : "front-only";
  }

  return block.layoutMode;
};

export const anchorToStyle = (
  anchor: NormalizedAnchor,
  align: HorizontalAlign,
  width: number,
  height: number,
) => {
  const left = `${clamp01(anchor.x) * width}px`;
  const top = `${clamp01(anchor.y) * height}px`;
  const translateX =
    align === "left" ? "0%" : align === "right" ? "-100%" : "-50%";

  return {
    left,
    top,
    transform: `translate(${translateX}, -50%)`,
  };
};

export const estimateHeroFontSize = (
  text: string,
  width: number,
  height: number,
  scale: number = 1,
): number => {
  const clean = sanitizeText(text);
  const charCount = Math.max(clean.length, 1);
  const vMin = Math.min(width, height);

  // Depth-caption hero text must be LARGE — it needs to extend beyond the
  // person's silhouette so parts peek above/beside their head. The mask
  // hides text behind the person; only the overflow is visible.

  // Short words (1-3 chars like "NO") — massive, fill the frame
  if (charCount <= 3) {
    return Math.min(width * 0.5, vMin * 0.7) * scale;
  }

  // Medium words (4-7 chars like "DEPTH") — big enough to extend past person
  if (charCount <= 7) {
    const base = vMin * 0.55;
    const adjusted = base - (charCount - 3) * vMin * 0.015;
    return Math.max(vMin * 0.35, adjusted) * scale;
  }

  // Longer text (8+ chars like "CAPTIONS") — still large for depth effect
  const base = vMin * 0.48;
  const adjusted = base - charCount * vMin * 0.008;
  return Math.max(200, adjusted) * scale;
};

export const estimateSupportFontSize = (
  text: string,
  width: number,
  height: number,
  large: boolean = false,
): number => {
  const normalized = Math.max(sanitizeText(text).length, 1);
  const base = large ? width * 0.06 : width * 0.045;
  const adjusted = base - normalized * width * 0.00055;
  return Math.max(34, Math.min(adjusted, height * 0.075));
};

export const getBlockProgress = (block: SpatialPlanBlock, frame: number): number => {
  const span = Math.max(1, block.endFrame - block.startFrame + 1);
  return Math.max(0, Math.min(1, (frame - block.startFrame) / span));
};

export const splitSupportText = (
  text: string,
  maxWordsPerLine: number = 4,
): string[] => {
  const words = sanitizeText(text).split(" ").filter(Boolean);
  if (words.length <= maxWordsPerLine) {
    return words.length ? [words.join(" ")] : [];
  }

  const lines: string[] = [];
  for (let index = 0; index < words.length; index += maxWordsPerLine) {
    lines.push(words.slice(index, index + maxWordsPerLine).join(" "));
  }

  return lines.slice(0, 3);
};

export const getHeroLines = (block: SpatialPlanBlock): string[] => {
  const hero = sanitizeText(block.heroText);
  const alt = sanitizeText(block.heroTextAlt ?? "");

  if (block.rearVariant === "split" && alt) {
    return [hero, alt];
  }

  if (block.rearVariant === "stack") {
    const combined = [hero, alt].filter(Boolean).join(" ");
    const words = combined.split(" ").filter(Boolean);
    if (words.length > 1) {
      return words.slice(0, 3);
    }
  }

  return hero ? [hero] : [];
};

export const getRearTransform = (
  block: SpatialPlanBlock,
  frame: number,
): string => {
  const progress = getBlockProgress(block, frame);
  const driftX = interpolateValue(progress, 0, 1, -16, 12);
  const driftY = interpolateValue(progress, 0, 1, 12, -8);
  const rotation = block.rearRotation ?? 0;
  const skew = block.rearSkew ?? 0;
  const scale = interpolateValue(progress, 0, 1, 0.86, block.rearScale ?? 1);
  return `translate(${driftX}px, ${driftY}px) scale(${scale}) rotate(${rotation}deg) skewY(${skew}deg)`;
};

export const getOrbitWordPlacements = (
  text: string,
  anchor: NormalizedAnchor,
  width: number,
  height: number,
  frame: number,
  radius: number,
) => {
  const words = sanitizeText(text).split(" ").filter(Boolean);
  const centerX = clamp01(anchor.x) * width;
  const centerY = clamp01(anchor.y) * height;

  return words.map((word, index) => {
    const step = (Math.PI * 2) / Math.max(words.length, 1);
    const angle = index * step + frame * 0.01;
    const orbitX = centerX + Math.cos(angle) * radius;
    const orbitY = centerY + Math.sin(angle) * radius;
    const opacity = 0.38 + ((index % 3) * 0.16);

    return {
      word,
      x: orbitX,
      y: orbitY,
      rotation: (angle * 180) / Math.PI + 90,
      opacity,
      blur: index % 2 === 0 ? 0 : 3,
    };
  });
};

export const getAccentWordPlacements = (
  block: SpatialPlanBlock,
  width: number,
  height: number,
  frame: number,
) => {
  const words = (block.accentWords ?? block.emphasisWords ?? [])
    .map((word) => sanitizeText(word))
    .filter(Boolean);

  return words.slice(0, MAX_ACCENT_WORDS).map((word, index) => {
    const phase = frame * 0.018 + index * 1.4;
    const baseX = clamp01(block.rearAnchor.x + (index % 2 === 0 ? -0.18 : 0.18));
    const baseY = clamp01(block.rearAnchor.y + (index < 2 ? -0.1 : 0.12));

    return {
      word,
      x: baseX * width + Math.cos(phase) * 14,
      y: baseY * height + Math.sin(phase * 1.1) * 10,
      rotation: Math.sin(phase) * 10,
      opacity: 0.22 + index * 0.08,
    };
  });
};

export const getEffectiveSafeArea = (safeArea?: Partial<typeof DEFAULT_SAFE_AREA>) => ({
  top: safeArea?.top ?? DEFAULT_SAFE_AREA.top,
  right: safeArea?.right ?? DEFAULT_SAFE_AREA.right,
  bottom: safeArea?.bottom ?? DEFAULT_SAFE_AREA.bottom,
  left: safeArea?.left ?? DEFAULT_SAFE_AREA.left,
});

const interpolateValue = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
) => {
  if (inMax === inMin) {
    return outMax;
  }

  const normalized = (value - inMin) / (inMax - inMin);
  return outMin + (outMax - outMin) * normalized;
};

export { CLAMP_STYLE };
