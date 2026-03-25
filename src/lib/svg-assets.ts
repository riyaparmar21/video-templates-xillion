/**
 * SVG Asset Loader for Remotion
 *
 * Loads SVGs from assets/svg/ and provides them as inline React elements
 * for use in Remotion compositions. Supports:
 * - Loading by category + name (e.g., "geometric/star-5")
 * - Listing available SVGs from the manifest
 * - Inline SVG rendering with customizable color, size, stroke-width
 * - Stroke animation helpers (dasharray/dashoffset for draw-on effects)
 */

import { staticFile } from "remotion";
import manifest from "../../assets/svg/manifest.json";

// ── Types ──

export interface SvgIconInfo {
  name: string;
  file: string;
  path: string;
  viewBox: string;
  elements: number;
  elementTypes: string[];
  hasAnimatablePaths: boolean;
  fileSize: number;
}

export interface SvgCategory {
  count: number;
  icons: SvgIconInfo[];
}

export type SvgManifest = typeof manifest;

// ── Manifest Access ──

/** Get all category names */
export function getCategories(): string[] {
  return Object.keys(manifest.categories);
}

/** Get all icons in a category */
export function getIconsByCategory(category: string): SvgIconInfo[] {
  const cat = (manifest.categories as Record<string, SvgCategory>)[category];
  return cat ? cat.icons : [];
}

/** Get a specific icon's info */
export function getIconInfo(
  category: string,
  name: string
): SvgIconInfo | undefined {
  const icons = getIconsByCategory(category);
  return icons.find((i) => i.name === name);
}

/** Get all icons across all categories */
export function getAllIcons(): SvgIconInfo[] {
  return Object.values(manifest.categories as Record<string, SvgCategory>)
    .flatMap((cat) => cat.icons);
}

/** Get a random icon from a category */
export function getRandomIcon(
  category: string,
  seed: string | number = "default"
): SvgIconInfo | undefined {
  const icons = getIconsByCategory(category);
  if (icons.length === 0) return undefined;
  // Deterministic random using simple hash (Remotion-safe, no Math.random)
  const hash = String(seed)
    .split("")
    .reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
  const index = Math.abs(hash) % icons.length;
  return icons[index];
}

/**
 * Get the staticFile path for an SVG icon.
 * Use this with Remotion's <Img> component or as an img src.
 *
 * Usage in Remotion:
 *   <Img src={getSvgPath("geometric", "star-5")} />
 */
export function getSvgPath(category: string, name: string): string {
  return staticFile(`svg/${category}/${name}.svg`);
}

/**
 * Get SVG paths for stroke animation.
 * Returns the total path length estimate for use with stroke-dasharray/dashoffset.
 *
 * In your Remotion component:
 *   const progress = interpolate(frame, [0, 30], [0, 1]);
 *   style={{
 *     strokeDasharray: totalLength,
 *     strokeDashoffset: totalLength * (1 - progress),
 *   }}
 */
export function getStrokeAnimationStyle(
  totalLength: number,
  progress: number
): React.CSSProperties {
  return {
    strokeDasharray: totalLength,
    strokeDashoffset: totalLength * (1 - Math.min(1, Math.max(0, progress))),
  };
}

// ── Quick lookup maps ──

/** Map of category -> icon names for quick iteration */
export function getCategoryMap(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const [cat, data] of Object.entries(
    manifest.categories as Record<string, SvgCategory>
  )) {
    map[cat] = data.icons.map((i) => i.name);
  }
  return map;
}

/** Total number of SVGs in the library */
export const totalIcons: number = manifest.totalCount;
