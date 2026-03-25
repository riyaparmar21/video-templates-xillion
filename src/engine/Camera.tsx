/**
 * Camera system — wraps children with global camera effects.
 * Ken Burns zoom, punch zoom, and screen shake.
 */
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
} from "remotion";
import type { CameraConfig } from "./schema";

interface CameraProps {
  config: CameraConfig;
  children: React.ReactNode;
}

export const Camera: React.FC<CameraProps> = ({ config, children }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Ken Burns: slow global zoom ──
  let kenBurns = 1;
  if (config.kenBurns) {
    kenBurns = interpolate(
      frame,
      [0, durationInFrames],
      [1, config.kenBurnsScale],
      { extrapolateRight: "clamp" }
    );
  }

  // ── Punch Zoom: periodic accent ──
  let punch = 1;
  if (config.punchZoom) {
    const interval = fps * config.punchInterval;
    const punchDuration = 12;
    const frameInPunch = frame % interval;
    if (frameInPunch < punchDuration) {
      punch = interpolate(
        frameInPunch,
        [0, 4, punchDuration],
        [1, config.punchScale, 1],
        { extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
      );
    }
  }

  // ── Screen Shake ──
  let shakeX = 0;
  let shakeY = 0;
  if (config.shake) {
    const intensity = config.shakeIntensity;
    // Deterministic pseudo-random using frame number
    shakeX = Math.sin(frame * 7.3) * intensity;
    shakeY = Math.cos(frame * 11.7) * intensity;
  }

  const totalScale = kenBurns * punch;
  const transform = `scale(${totalScale}) translate(${shakeX}px, ${shakeY}px)`;

  return (
    <AbsoluteFill
      style={{
        transform,
        willChange: "transform",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
