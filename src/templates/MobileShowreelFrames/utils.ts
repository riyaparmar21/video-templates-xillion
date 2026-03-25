/**
 * Deterministic PRNG & jitter utilities for MobileShowreelFrames.
 *
 * Uses mulberry32 — a fast 32-bit PRNG seeded per-card so every
 * render produces identical micro-jitter.
 */

/** Fast 32-bit seeded PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Per-frame deterministic jitter (x, y, rotation). */
export function jitterForFrame(
  seed: number,
  frame: number,
  scale = 1,
): { dx: number; dy: number; r: number } {
  const rnd = mulberry32(seed + frame);
  const dx = (rnd() - 0.5) * 2 * scale;
  const dy = (rnd() - 0.5) * 2 * scale;
  const r = (rnd() - 0.5) * 0.5; // degrees
  return { dx, dy, r };
}
