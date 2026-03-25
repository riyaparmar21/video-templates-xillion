/**
 * Transition layer — handles entrance/exit effects between scenes.
 * This is the SOLE authority for scene-level fading.
 * Templates should NOT apply their own scene opacity.
 *
 * - isFirst: skip entrance fade (first scene starts immediately)
 * - isLast:  skip exit fade (last scene holds until master outro)
 */
import React from "react";
import {
  useCurrentFrame,
  interpolate,
  Easing,
  AbsoluteFill,
} from "remotion";
import type { TransitionType } from "./schema";

interface TransitionWrapperProps {
  type: TransitionType;
  durationFrames: number; // overlap frames for transition
  sceneDurationFrames: number;
  isFirst?: boolean;
  isLast?: boolean;
  children: React.ReactNode;
}

export const TransitionWrapper: React.FC<TransitionWrapperProps> = ({
  type,
  durationFrames,
  sceneDurationFrames,
  isFirst = false,
  isLast = false,
  children,
}) => {
  const frame = useCurrentFrame();

  if (type === "none" || durationFrames <= 0) {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  // Entrance opacity: fade in over first N frames (skip for first scene)
  const enterOpacity = isFirst
    ? 1
    : interpolate(frame, [0, durationFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });

  // Exit opacity: fade out over last N frames (skip for last scene)
  const exitStart = sceneDurationFrames - durationFrames;
  const exitOpacity = isLast
    ? 1
    : interpolate(
        frame,
        [exitStart, sceneDurationFrames],
        [1, 0],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.in(Easing.cubic),
        }
      );

  const opacity = Math.min(enterOpacity, exitOpacity);

  // Direction-based transforms
  let enterTransform = "";
  let exitTransform = "";

  switch (type) {
    case "wipe_left": {
      const enterX = isFirst
        ? 0
        : interpolate(frame, [0, durationFrames], [100, 0], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
      const exitX = isLast
        ? 0
        : interpolate(frame, [exitStart, sceneDurationFrames], [0, -100], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.cubic),
          });
      enterTransform = !isFirst && frame <= durationFrames ? `translateX(${enterX}%)` : "";
      exitTransform = !isLast && frame >= exitStart ? `translateX(${exitX}%)` : "";
      break;
    }
    case "wipe_right": {
      const enterX = isFirst
        ? 0
        : interpolate(frame, [0, durationFrames], [-100, 0], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
      const exitX = isLast
        ? 0
        : interpolate(frame, [exitStart, sceneDurationFrames], [0, 100], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.cubic),
          });
      enterTransform = !isFirst && frame <= durationFrames ? `translateX(${enterX}%)` : "";
      exitTransform = !isLast && frame >= exitStart ? `translateX(${exitX}%)` : "";
      break;
    }
    case "slide_up": {
      const enterY = isFirst
        ? 0
        : interpolate(frame, [0, durationFrames], [100, 0], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
      const exitY = isLast
        ? 0
        : interpolate(frame, [exitStart, sceneDurationFrames], [0, -100], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.cubic),
          });
      enterTransform = !isFirst && frame <= durationFrames ? `translateY(${enterY}%)` : "";
      exitTransform = !isLast && frame >= exitStart ? `translateY(${exitY}%)` : "";
      break;
    }
    case "slide_down": {
      const enterY = isFirst
        ? 0
        : interpolate(frame, [0, durationFrames], [-100, 0], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
      const exitY = isLast
        ? 0
        : interpolate(frame, [exitStart, sceneDurationFrames], [0, 100], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.cubic),
          });
      enterTransform = !isFirst && frame <= durationFrames ? `translateY(${enterY}%)` : "";
      exitTransform = !isLast && frame >= exitStart ? `translateY(${exitY}%)` : "";
      break;
    }
    case "zoom_in": {
      const enterScale = isFirst
        ? 1
        : interpolate(frame, [0, durationFrames], [0.8, 1], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
      const exitScale = isLast
        ? 1
        : interpolate(frame, [exitStart, sceneDurationFrames], [1, 1.2], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.cubic),
          });
      enterTransform = !isFirst && frame <= durationFrames ? `scale(${enterScale})` : "";
      exitTransform = !isLast && frame >= exitStart ? `scale(${exitScale})` : "";
      break;
    }
    case "zoom_out": {
      const enterScale = isFirst
        ? 1
        : interpolate(frame, [0, durationFrames], [1.2, 1], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
      const exitScale = isLast
        ? 1
        : interpolate(frame, [exitStart, sceneDurationFrames], [1, 0.8], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.cubic),
          });
      enterTransform = !isFirst && frame <= durationFrames ? `scale(${enterScale})` : "";
      exitTransform = !isLast && frame >= exitStart ? `scale(${exitScale})` : "";
      break;
    }
    case "crossfade":
    default:
      // Pure opacity, no transform
      break;
  }

  const activeTransform =
    !isFirst && frame <= durationFrames
      ? enterTransform
      : !isLast && frame >= exitStart
        ? exitTransform
        : "";

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: activeTransform || undefined,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
