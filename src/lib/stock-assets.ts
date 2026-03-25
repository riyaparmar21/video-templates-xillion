/**
 * Stock Video/Image Asset Catalog for Remotion
 *
 * Auto-populated from downloaded Pixabay assets.
 * Provides typed access to background videos, overlay videos, and stock images.
 *
 * Usage in a Remotion component:
 *   import { OffthreadVideo, Img } from "remotion";
 *   import { backgroundVideos, overlayVideos, backgroundImages, overlayBlendStyles } from "../lib/stock-assets";
 *
 *   // Background video behind content
 *   <OffthreadVideo src={backgroundVideos.abstract[0].src} style={{ objectFit: "cover" }} />
 *
 *   // Overlay on top with blend mode
 *   <OffthreadVideo src={overlayVideos.lightLeak[0].src} style={{ ...overlayBlendStyles.lightLeak, objectFit: "cover" }} />
 */

import { staticFile } from "remotion";

// ── Types ──

export interface StockVideoAsset {
  id: number;
  src: string;
  width: number;
  height: number;
  duration: number;
  source: "pixabay" | "pexels";
  tags: string;
}

export interface StockImageAsset {
  id: number;
  src: string;
  width: number;
  height: number;
  source: "pixabay" | "pexels";
  tags: string;
}

// ── Background Videos ──

export const backgroundVideos = {
  abstract: [
    {
      id: 22908,
      src: staticFile("backgrounds/videos/pixabay-abstract-dark-background/pixabay-22908.mp4"),
      width: 1920,
      height: 1080,
      duration: 11,
      source: "pixabay" as const,
      tags: "abstract, dark, ink, watercolor",
    },
    {
      id: 4980,
      src: staticFile("backgrounds/videos/pixabay-abstract-dark-background/pixabay-4980.mp4"),
      width: 1920,
      height: 1080,
      duration: 29,
      source: "pixabay" as const,
      tags: "particles, lines, dark, space",
    },
  ],
  particles: [
    {
      id: 292875,
      src: staticFile("backgrounds/videos/pixabay-particles-floating-black/pixabay-292875.mp4"),
      width: 1920,
      height: 1080,
      duration: 22,
      source: "pixabay" as const,
      tags: "particles, floating, black",
    },
  ],
  nature: [
    {
      id: 1890,
      src: staticFile("backgrounds/videos/pixabay-ocean-waves-aerial/pixabay-1890.mp4"),
      width: 2720,
      height: 1434,
      duration: 34,
      source: "pixabay" as const,
      tags: "ocean, waves, aerial",
    },
  ],
  tech: [
    {
      id: 176794,
      src: staticFile("backgrounds/videos/pixabay-circuit-board-technology/pixabay-176794.mp4"),
      width: 1920,
      height: 1080,
      duration: 30,
      source: "pixabay" as const,
      tags: "circuit, board, technology",
    },
  ],
  transition: [
    {
      id: 21536,
      src: staticFile("backgrounds/videos/pixabay-ink-drop-water/pixabay-21536.mp4"),
      width: 3840,
      height: 2160,
      duration: 60,
      source: "pixabay" as const,
      tags: "ink, drop, water, transition",
    },
  ],
} satisfies Record<string, StockVideoAsset[]>;

// ── Overlay Videos (composited on top of content) ──

export const overlayVideos = {
  lightLeak: [
    {
      id: 270109,
      src: staticFile("backgrounds/videos/pixabay-light-leak-overlay/pixabay-270109.mp4"),
      width: 3840,
      height: 2160,
      duration: 7,
      source: "pixabay" as const,
      tags: "light leak, overlay, lens flare",
    },
  ],
  filmGrain: [
    {
      id: 257447,
      src: staticFile("backgrounds/videos/pixabay-film-grain-texture/pixabay-257447.mp4"),
      width: 3840,
      height: 2160,
      duration: 10,
      source: "pixabay" as const,
      tags: "film grain, texture, vintage",
    },
  ],
} satisfies Record<string, StockVideoAsset[]>;

// ── Background Images ──

export const backgroundImages = {
  darkTexture: [
    {
      id: 1846865,
      src: staticFile("backgrounds/images/pixabay-dark-texture-abstract/pixabay-1846865.jpg"),
      width: 4256,
      height: 2832,
      source: "pixabay" as const,
      tags: "dark, texture, abstract",
    },
    {
      id: 7470781,
      src: staticFile("backgrounds/images/pixabay-dark-texture-abstract/pixabay-7470781.jpg"),
      width: 6000,
      height: 4000,
      source: "pixabay" as const,
      tags: "dark, texture, abstract",
    },
  ],
  mountain: [
    {
      id: 6199355,
      src: staticFile("backgrounds/images/pixabay-mountain-landscape-dramatic/pixabay-6199355.jpg"),
      width: 5568,
      height: 3712,
      source: "pixabay" as const,
      tags: "mountain, landscape, dramatic",
    },
    {
      id: 532857,
      src: staticFile("backgrounds/images/pixabay-mountain-landscape-dramatic/pixabay-532857.jpg"),
      width: 5616,
      height: 3744,
      source: "pixabay" as const,
      tags: "mountain, landscape, dramatic",
    },
  ],
  techNeon: [
    {
      id: 3233076,
      src: staticFile("backgrounds/images/pixabay-technology-abstract-neon/pixabay-3233076.jpg"),
      width: 3815,
      height: 2454,
      source: "pixabay" as const,
      tags: "technology, abstract, neon",
    },
    {
      id: 3233226,
      src: staticFile("backgrounds/images/pixabay-technology-abstract-neon/pixabay-3233226.jpg"),
      width: 1814,
      height: 2573,
      source: "pixabay" as const,
      tags: "technology, abstract, neon",
    },
  ],
} satisfies Record<string, StockImageAsset[]>;

// ── Helpers ──

/** Get a background video by category, with optional index */
export function getBackgroundVideo(
  category: keyof typeof backgroundVideos,
  index: number = 0
): StockVideoAsset {
  const videos = backgroundVideos[category];
  return videos[index % videos.length];
}

/** Get an overlay video by type */
export function getOverlayVideo(
  type: keyof typeof overlayVideos,
  index: number = 0
): StockVideoAsset {
  const videos = overlayVideos[type];
  return videos[index % videos.length];
}

/** Get a background image by category */
export function getBackgroundImage(
  category: keyof typeof backgroundImages,
  index: number = 0
): StockImageAsset {
  const images = backgroundImages[category];
  return images[index % images.length];
}

/** All available background video categories */
export const bgVideoCategories = Object.keys(backgroundVideos) as (keyof typeof backgroundVideos)[];

/** All available overlay types */
export const overlayTypes = Object.keys(overlayVideos) as (keyof typeof overlayVideos)[];

/** All available background image categories */
export const bgImageCategories = Object.keys(backgroundImages) as (keyof typeof backgroundImages)[];

/**
 * CSS styles for overlay blend modes.
 * Apply these to an OffthreadVideo/Img sitting above your main content.
 *
 * Example:
 *   <AbsoluteFill style={overlayBlendStyles.lightLeak}>
 *     <OffthreadVideo src={overlayVideos.lightLeak[0].src} />
 *   </AbsoluteFill>
 */
export const overlayBlendStyles = {
  /** Screen blend — black becomes transparent. Good for light leaks, particles */
  lightLeak: {
    mixBlendMode: "screen" as const,
    opacity: 0.6,
    pointerEvents: "none" as const,
  },
  /** Overlay blend — adds subtle texture without washing out. Good for film grain */
  filmGrain: {
    mixBlendMode: "overlay" as const,
    opacity: 0.3,
    pointerEvents: "none" as const,
  },
  /** Screen blend, higher opacity. Good for bright particles */
  particles: {
    mixBlendMode: "screen" as const,
    opacity: 0.8,
    pointerEvents: "none" as const,
  },
  /** Soft light for dust/haze */
  dust: {
    mixBlendMode: "soft-light" as const,
    opacity: 0.4,
    pointerEvents: "none" as const,
  },
};
