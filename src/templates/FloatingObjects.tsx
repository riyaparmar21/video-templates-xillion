import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
  random,
} from "remotion";
import { AbsoluteFill } from "remotion";
import type { TemplateProps } from "../engine/schema";
import {
  fadeIn,
  slideIn,
  scaleIn,
  blurIn,
  springIn,
  float,
  breathe,
  shimmer,
  rotate,
  pulseGlow,
  staggerDelay,
  staggerProgress,
  rgba,
  metallicGradient,
  glowShadow,
  depthShadow,
  glassStyle,
} from "../lib/animations";

export const FloatingObjects: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Params with defaults
  const objectType = params.objectType ?? "circles";
  const count = Math.max(3, Math.min(12, params.count ?? 6));
  const colors = params.colors ?? [palette.primary, palette.accent, palette.secondary];
  const speed = params.speed ?? "medium";
  const size = params.size ?? "medium";
  const label = params.label ?? undefined;

  // Speed multipliers
  const speedMultiplier = speed === "slow" ? 0.5 : speed === "fast" ? 1.8 : 1;

  // Size ranges
  const sizeRange = size === "small" ? [20, 40] : size === "large" ? [60, 100] : [40, 70];

  // Generate deterministic objects
  const objects = Array.from({ length: count }, (_, i) => {
    const seed = `float-obj-${i}`;
    const depthLevel = random(seed + "-depth");
    const startX = (random(seed + "-x") * 1080 - 200) * (depthLevel > 0.5 ? 1.2 : 0.8);
    const startY = (random(seed + "-y") * 1920 - 200) * (depthLevel > 0.5 ? 1.2 : 0.8);
    const objSize = sizeRange[0] + random(seed + "-size") * (sizeRange[1] - sizeRange[0]);
    const colorIdx = Math.floor(random(seed + "-color") * colors.length);
    const rotationSpeed = 20 + random(seed + "-rotation") * 40;
    const floatSpeed = 25 + random(seed + "-float") * 25;
    const direction = Math.floor(random(seed + "-dir") * 4);

    return {
      id: i,
      startX,
      startY,
      size: objSize,
      color: colors[colorIdx],
      depthLevel,
      rotationSpeed,
      floatSpeed,
      direction,
      seed,
    };
  });

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        overflow: "hidden",
      }}
    >
      {/* Full-screen ambient glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        background: `
          radial-gradient(ellipse 80% 60% at 50% 45%, ${rgba(palette.primary, 0.12)} 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 30% 70%, ${rgba(palette.accent, 0.07)} 0%, transparent 55%),
          radial-gradient(ellipse 50% 35% at 75% 25%, ${rgba(palette.secondary, 0.05)} 0%, transparent 55%)
        `,
        pointerEvents: "none",
      }} />

      {/* Vignette */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        background: `radial-gradient(ellipse 65% 55% at 50% 45%, transparent 30%, ${rgba(palette.background, 0.7)} 100%)`,
        pointerEvents: "none",
      }} />

      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "600px",
          background: `radial-gradient(circle, ${rgba(palette.primary, 0.1)} 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      {/* Render objects */}
      {objects.map((obj) => {
        const delay = staggerDelay(obj.id, count, 20);
        const progress = staggerProgress(frame, obj.id, count, 20, 25);
        const depth = obj.depthLevel;
        const depthOpacity = 0.4 + depth * 0.6;
        const depthScale = 0.6 + depth * 0.4;

        // Entrance animation
        const enterOpacity = fadeIn(frame, delay, 15);
        const enterScale = scaleIn(frame, delay, 0.3, 1, 20);
        const enterSlide = slideIn(
          frame,
          delay,
          ["up", "down", "left", "right"][obj.direction] as
            | "up"
            | "down"
            | "left"
            | "right",
          100,
          20
        );

        // Continuous motion
        const floatY = float(frame - delay, obj.floatSpeed, 15, random(obj.seed + "-offset"));
        const rotationDeg = rotate(frame - delay, obj.rotationSpeed, fps, 0);
        const breatheVal = breathe(frame - delay, obj.floatSpeed + 10, 0.08);

        // Parallax motion
        const parallaxX = (frame * speedMultiplier * depth) % 100;
        const parallaxY = ((frame * speedMultiplier * depth) / 1.5) % 100;

        // Position calculation
        const x =
          obj.startX +
          enterSlide.x +
          parallaxX * 2 * (depth > 0.5 ? 1 : -1) +
          float(frame - delay, obj.floatSpeed * 2, 8, random(obj.seed + "-drift"));
        const y =
          obj.startY +
          enterSlide.y +
          floatY +
          float(frame - delay, obj.floatSpeed * 1.5, 8, random(obj.seed + "-drift2"));

        // Determine shape rendering
        const shapeComponent = (() => {
          if (objectType === "coins") {
            return (
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: obj.size,
                  height: obj.size,
                  borderRadius: "50%",
                  background: metallicGradient(obj.color, 45),
                  boxShadow: depthShadow(obj.color, 0.5),
                  transform: `scale(${enterScale * breatheVal * depthScale}) rotateY(${rotationDeg}deg)`,
                  opacity: enterOpacity * depthOpacity,
                }}
              />
            );
          } else if (objectType === "diamonds") {
            return (
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: obj.size,
                  height: obj.size,
                  background: `linear-gradient(135deg, ${obj.color}, ${rgba(obj.color, 0.6)})`,
                  transform: `scale(${enterScale * breatheVal * depthScale}) rotate(45deg) rotateZ(${rotationDeg}deg)`,
                  opacity: enterOpacity * depthOpacity,
                  boxShadow: glowShadow(obj.color, 0.4),
                }}
              />
            );
          } else if (objectType === "bars") {
            return (
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: obj.size * 0.4,
                  height: obj.size,
                  background: `linear-gradient(90deg, ${rgba(obj.color, 0.7)}, ${obj.color})`,
                  transform: `scale(${enterScale * breatheVal * depthScale}) rotateZ(${rotationDeg}deg)`,
                  opacity: enterOpacity * depthOpacity,
                  boxShadow: glowShadow(obj.color, 0.3),
                }}
              />
            );
          } else if (objectType === "stars") {
            return (
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: 0,
                  height: 0,
                  borderLeft: `${obj.size / 2}px solid transparent`,
                  borderRight: `${obj.size / 2}px solid transparent`,
                  borderBottom: `${(obj.size * 0.8) / 2}px solid ${obj.color}`,
                  transform: `scale(${enterScale * breatheVal * depthScale}) rotateZ(${rotationDeg}deg)`,
                  opacity: enterOpacity * depthOpacity,
                  filter: `drop-shadow(0 0 8px ${rgba(obj.color, 0.6)})`,
                }}
              />
            );
          } else {
            // Default circles
            return (
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: obj.size,
                  height: obj.size,
                  borderRadius: "50%",
                  background: `radial-gradient(circle at 35% 35%, ${rgba(obj.color, 0.9)}, ${obj.color})`,
                  transform: `scale(${enterScale * breatheVal * depthScale}) rotateZ(${rotationDeg}deg)`,
                  opacity: enterOpacity * depthOpacity,
                  boxShadow: glowShadow(obj.color, pulseGlow(frame, 30, 0.2, 0.6), 20),
                }}
              />
            );
          }
        })();

        return (
          <div key={obj.id} style={{ pointerEvents: "none" }}>
            {shapeComponent}
          </div>
        );
      })}

      {/* Optional label */}
      {label && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) translateY(${float(frame, 40, 5)})`,
            fontSize: "32px",
            fontWeight: 600,
            color: palette.text,
            fontFamily: typography.heading,
            opacity: fadeIn(frame, 30, 20),
            textAlign: "center",
            zIndex: 10,
          }}
        >
          {label}
        </div>
      )}
    </AbsoluteFill>
  );
};
