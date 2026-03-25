/**
 * Shared animation utilities for all templates.
 * Every helper is pure: (frame, config) → value.
 */
import { interpolate, Easing, spring } from "remotion";

// ── Entrance Animations ──

/** Fade from 0→1 over `duration` frames, starting at `delay`. */
export function fadeIn(
  frame: number,
  delay = 0,
  duration = 15
): number {
  const f = Math.max(0, frame - delay);
  return interpolate(f, [0, duration], [0, 1], {
    extrapolateRight: "clamp",
  });
}

/** Fade from 1→0 ending at `totalFrames`. */
export function fadeOut(
  frame: number,
  totalFrames: number,
  duration = 15
): number {
  return interpolate(frame, [totalFrames - duration, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** Combined fade-in/fade-out for a scene. */
export function sceneOpacity(
  frame: number,
  totalFrames: number,
  fadeInDur = 15,
  fadeOutDur = 15
): number {
  const fi = fadeIn(frame, 0, fadeInDur);
  const fo = fadeOut(frame, totalFrames, fadeOutDur);
  return Math.min(fi, fo);
}

/** Slide in from a direction. Returns {x, y} offset in px. */
export function slideIn(
  frame: number,
  delay = 0,
  direction: "up" | "down" | "left" | "right" = "up",
  distance = 60,
  duration = 25
): { x: number; y: number } {
  const f = Math.max(0, frame - delay);
  const progress = interpolate(f, [0, duration], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const remaining = distance * (1 - progress);

  switch (direction) {
    case "up":
      return { x: 0, y: remaining };
    case "down":
      return { x: 0, y: -remaining };
    case "left":
      return { x: remaining, y: 0 };
    case "right":
      return { x: -remaining, y: 0 };
  }
}

/** Scale entrance from `from` to `to`. */
export function scaleIn(
  frame: number,
  delay = 0,
  from = 0.85,
  to = 1,
  duration = 20
): number {
  const f = Math.max(0, frame - delay);
  return interpolate(f, [0, duration], [from, to], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

/** Blur entrance: returns blur px (starts blurry, ends sharp). */
export function blurIn(
  frame: number,
  delay = 0,
  maxBlur = 8,
  duration = 14
): number {
  const f = Math.max(0, frame - delay);
  return interpolate(f, [0, duration], [maxBlur, 0], {
    extrapolateRight: "clamp",
  });
}

/** Spring-based entrance. Returns 0→1 with overshoot. */
export function springIn(
  frame: number,
  fps: number,
  delay = 0,
  config?: { damping?: number; stiffness?: number; mass?: number }
): number {
  return spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: {
      damping: config?.damping ?? 12,
      stiffness: config?.stiffness ?? 100,
      mass: config?.mass ?? 0.5,
    },
  });
}

// ── Continuous Motion ──

/** Gentle floating oscillation. */
export function float(
  frame: number,
  speed = 30,
  amplitude = 4,
  offset = 0
): number {
  return Math.sin((frame + offset) / speed) * amplitude;
}

/** Breathing scale pulse. Returns scale factor around 1. */
export function breathe(
  frame: number,
  speed = 40,
  intensity = 0.02,
  offset = 0
): number {
  return 1 + Math.sin((frame + offset) / speed) * intensity;
}

/** Shimmer position for gradient animation. Returns 0-100 percentage. */
export function shimmer(
  frame: number,
  speed = 15,
  offset = 0
): number {
  return 50 + Math.sin((frame + offset) / speed) * 30;
}

/** Continuous rotation in degrees. */
export function rotate(
  frame: number,
  degreesPerSecond = 12,
  fps = 30,
  offset = 0
): number {
  return ((frame + offset) / fps) * degreesPerSecond;
}

/** Pulsing glow intensity 0.3–1. */
export function pulseGlow(
  frame: number,
  speed = 25,
  min = 0.3,
  max = 1,
  offset = 0
): number {
  const t = (Math.sin((frame + offset) / speed) + 1) / 2;
  return min + t * (max - min);
}

// ── Stagger Utilities ──

/** Stagger delay for item at `index` out of `total` items. */
export function staggerDelay(
  index: number,
  total: number,
  spreadFrames = 30
): number {
  return Math.round((index / Math.max(1, total - 1)) * spreadFrames);
}

/** Get entrance progress for a staggered item (0→1). */
export function staggerProgress(
  frame: number,
  index: number,
  total: number,
  spreadFrames = 30,
  itemDuration = 15
): number {
  const delay = staggerDelay(index, total, spreadFrames);
  const f = Math.max(0, frame - delay);
  return interpolate(f, [0, itemDuration], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

// ── Color Utilities ──

/** Parse hex to {r,g,b}. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/** Create rgba string from hex + alpha. */
export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Metallic gradient string for gold/silver effects. */
export function metallicGradient(
  baseColor: string,
  angle = 135
): string {
  const { r, g, b } = hexToRgb(baseColor);
  const lighter = `rgb(${Math.min(255, r + 40)},${Math.min(255, g + 40)},${Math.min(255, b + 20)})`;
  const darker = `rgb(${Math.max(0, r - 50)},${Math.max(0, g - 60)},${Math.max(0, b - 30)})`;
  return `linear-gradient(${angle}deg, ${baseColor} 0%, ${lighter} 40%, ${baseColor} 60%, ${darker} 100%)`;
}

// ── CSS Helper Builders ──

/** Glow text-shadow. */
export function glowShadow(color: string, intensity = 0.5, size = 20): string {
  return `0 0 ${size}px ${rgba(color, intensity)}, 0 0 ${size * 2}px ${rgba(color, intensity * 0.5)}`;
}

/** Depth box-shadow. */
export function depthShadow(color: string, intensity = 0.4): string {
  return `0 8px 32px ${rgba(color, intensity)}, 0 2px 8px ${rgba(color, intensity * 0.5)}`;
}

/** Glassmorphism backdrop style. */
export function glassStyle(
  bgAlpha = 0.15,
  blur = 20,
  borderAlpha = 0.2
): React.CSSProperties {
  return {
    background: `rgba(255,255,255,${bgAlpha})`,
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    border: `1px solid rgba(255,255,255,${borderAlpha})`,
    borderRadius: 16,
  };
}
