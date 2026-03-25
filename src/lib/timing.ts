/**
 * Timing utilities — convert between ms ↔ frames, compute animation progress.
 *
 * Usage:
 *   import { msToFrame, animateRange } from "../lib/timing";
 */

/** Convert milliseconds → nearest frame number */
export function msToFrame(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

/** Convert frame number → milliseconds */
export function frameToMs(frame: number, fps: number): number {
  return (frame / fps) * 1000;
}

/** Convert seconds → frames */
export function secToFrame(sec: number, fps: number): number {
  return Math.round(sec * fps);
}

/**
 * Compute 0→1 progress for a frame within a time range (ms).
 * Returns clamped value: 0 before start, 1 after end.
 * Optionally pass an easing function (t => t).
 */
export function animateRange(
  frame: number,
  fps: number,
  startMs: number,
  endMs: number,
  easing: (t: number) => number = (t) => t
): number {
  const startFrame = msToFrame(startMs, fps);
  const endFrame = msToFrame(endMs, fps);
  if (frame <= startFrame) return 0;
  if (frame >= endFrame) return 1;
  const raw = (frame - startFrame) / (endFrame - startFrame);
  return easing(raw);
}

/**
 * Interpolate between two values over a time range (ms).
 * Convenience wrapper around animateRange.
 */
export function tweenRange(
  frame: number,
  fps: number,
  startMs: number,
  endMs: number,
  from: number,
  to: number,
  easing: (t: number) => number = (t) => t
): number {
  const t = animateRange(frame, fps, startMs, endMs, easing);
  return from + (to - from) * t;
}

/**
 * Check whether the current frame is within a ms time range (inclusive).
 */
export function isInRange(frame: number, fps: number, startMs: number, endMs: number): boolean {
  return frame >= msToFrame(startMs, fps) && frame <= msToFrame(endMs, fps);
}

/**
 * Stagger delay calculator — returns the start-frame offset for
 * item N out of total items within a window.
 */
export function staggerDelay(
  index: number,
  total: number,
  windowMs: number,
  fps: number
): number {
  if (total <= 1) return 0;
  const perItemMs = windowMs / (total - 1);
  return msToFrame(index * perItemMs, fps);
}
