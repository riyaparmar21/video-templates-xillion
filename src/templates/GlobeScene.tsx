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

export const GlobeScene: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Params with defaults
  const rotationSpeed = params.rotationSpeed ?? 8; // degrees per second
  const glowColor = params.glowColor ?? palette.primary;
  const highlightRegions = params.highlightRegions ?? [];
  const title = params.title ?? undefined;
  const subtitle = params.subtitle ?? undefined;
  const style = params.style ?? "dots"; // "dots", "wireframe", "solid"

  // Globe dimensions
  const globeRadius = 180;
  const dotCount = style === "dots" ? 200 : 150;

  // Animation timeline
  const entranceFrame = 40; // entrance duration
  const globeEntranceOpacity = fadeIn(frame, 0, entranceFrame);
  const globeEntranceScale = scaleIn(frame, 0, 0.3, 1, entranceFrame);

  // Globe rotation
  const rotationY = rotate(frame, rotationSpeed, fps, 0);

  // Floating motion
  const globeFloat = float(frame, 60, 8, 0);

  // Generate globe dots using deterministic random positioning
  const generateGlobeDots = () => {
    const dots = [];
    for (let i = 0; i < dotCount; i++) {
      const seed = `globe-dot-${i}`;
      const phi = Math.acos(random(seed) * 2 - 1); // latitude
      const theta = random(seed + "-theta") * Math.PI * 2; // longitude

      // Convert spherical to cartesian coordinates
      const x = Math.sin(phi) * Math.cos(theta) * globeRadius;
      const y = Math.cos(phi) * globeRadius;
      const z = Math.sin(phi) * Math.sin(theta) * globeRadius;

      // Apply rotation
      const radians = (rotationY * Math.PI) / 180;
      const rotatedX =
        x * Math.cos(radians) - z * Math.sin(radians);
      const rotatedZ =
        x * Math.sin(radians) + z * Math.cos(radians);

      // Determine brightness based on z-depth (front is brighter)
      const depthFactor = (rotatedZ / globeRadius + 1) / 2;
      const brightness = 0.3 + depthFactor * 0.7;

      // Size varies slightly
      const size = 2 + random(seed + "-size") * 2;

      dots.push({
        x: rotatedX,
        y: y,
        z: rotatedZ,
        brightness,
        size,
        seed,
      });
    }

    // Sort by z-depth (back to front) for proper rendering
    dots.sort((a, b) => a.z - b.z);
    return dots;
  };

  // Generate wireframe lines (latitude and longitude)
  const generateWireframe = () => {
    const lines = [];
    const segmentCount = 8;

    // Latitude lines
    for (let lat = -Math.PI / 2; lat <= Math.PI / 2; lat += Math.PI / 4) {
      let points = [];
      for (let lon = 0; lon <= Math.PI * 2; lon += Math.PI / 16) {
        const x = Math.cos(lat) * Math.cos(lon) * globeRadius;
        const y = Math.sin(lat) * globeRadius;
        const z = Math.cos(lat) * Math.sin(lon) * globeRadius;

        const radians = (rotationY * Math.PI) / 180;
        const rotatedX =
          x * Math.cos(radians) - z * Math.sin(radians);
        const rotatedZ =
          x * Math.sin(radians) + z * Math.cos(radians);

        points.push({ x: rotatedX, y, z: rotatedZ });
      }
      lines.push(points);
    }

    // Longitude lines
    for (let lon = 0; lon < Math.PI * 2; lon += Math.PI / 8) {
      let points = [];
      for (let lat = -Math.PI / 2; lat <= Math.PI / 2; lat += Math.PI / 16) {
        const x = Math.cos(lat) * Math.cos(lon) * globeRadius;
        const y = Math.sin(lat) * globeRadius;
        const z = Math.cos(lat) * Math.sin(lon) * globeRadius;

        const radians = (rotationY * Math.PI) / 180;
        const rotatedX =
          x * Math.cos(radians) - z * Math.sin(radians);
        const rotatedZ =
          x * Math.sin(radians) + z * Math.cos(radians);

        points.push({ x: rotatedX, y, z: rotatedZ });
      }
      lines.push(points);
    }

    return lines;
  };

  const dots = generateGlobeDots();
  const wireframe = generateWireframe();

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
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

      {/* Ambient glow behind globe */}
      <div
        style={{
          position: "absolute",
          top: `calc(35% + ${globeFloat}px)`,
          left: "50%",
          width: "800px",
          height: "800px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${rgba(glowColor, 0.25)} 0%, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          filter: "blur(100px)",
          opacity: globeEntranceOpacity * pulseGlow(frame, 50, 0.3, 0.8),
        }}
      />

      {/* Horizon glow line at equator */}
      <div
        style={{
          position: "absolute",
          top: `calc(35% + ${globeFloat}px)`,
          left: "50%",
          width: `${globeRadius * 2.5}px`,
          height: "4px",
          background: `linear-gradient(90deg, transparent 0%, ${glowColor} 40%, ${glowColor} 60%, transparent 100%)`,
          transform: `translate(-50%, -50%) rotateX(${(frame * 0.2) % 360}deg)`,
          opacity: globeEntranceOpacity * 0.5,
          filter: "blur(2px)",
        }}
      />

      {/* Globe container */}
      <div
        style={{
          position: "absolute",
          top: `calc(35% + ${globeFloat}px)`,
          left: "50%",
          width: `${globeRadius * 2}px`,
          height: `${globeRadius * 2}px`,
          transform: `translate(-50%, -50%) scale(${globeEntranceScale})`,
          opacity: globeEntranceOpacity,
          perspective: "1200px",
        }}
      >
        {/* Solid style hemisphere */}
        {style === "solid" && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: `radial-gradient(circle at 30% 30%, ${rgba(glowColor, 0.6)}, ${rgba(palette.secondary, 0.4)})`,
              transform: `translate(-50%, -50%) rotateY(${rotationY}deg)`,
              boxShadow: depthShadow(glowColor, 0.5),
            }}
          />
        )}

        {/* Wireframe style */}
        {style === "wireframe" && (
          <svg
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "100%",
              height: "100%",
              transform: `translate(-50%, -50%)`,
            }}
            viewBox={`${-globeRadius * 1.2} ${-globeRadius * 1.2} ${globeRadius * 2.4} ${globeRadius * 2.4}`}
          >
            {wireframe.map((line, lineIdx) => {
              let pathData = "";
              line.forEach((point, ptIdx) => {
                const depthFactor = (point.z / globeRadius + 1) / 2;
                if (ptIdx === 0) {
                  pathData += `M ${point.x} ${point.y}`;
                } else {
                  pathData += ` L ${point.x} ${point.y}`;
                }
              });

              return (
                <path
                  key={lineIdx}
                  d={pathData}
                  stroke={glowColor}
                  strokeWidth="1"
                  fill="none"
                  opacity="0.4"
                />
              );
            })}
          </svg>
        )}

        {/* Dots style */}
        {style === "dots" &&
          dots.map((dot, idx) => (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                borderRadius: "50%",
                background: glowColor,
                transform: `translate(calc(-50% + ${dot.x}px), calc(-50% + ${dot.y}px))`,
                opacity: dot.brightness * globeEntranceOpacity * 0.8,
                boxShadow: `0 0 ${dot.size * dot.brightness}px ${rgba(glowColor, dot.brightness * 0.6)}`,
              }}
            />
          ))}
      </div>

      {/* Title below globe */}
      {title && (
        <div
          style={{
            position: "absolute",
            top: "65%",
            left: "50%",
            transform: `translate(-50%, -50%) translateY(${slideIn(frame, entranceFrame + 10, "up", 30, 25).y}px)`,
            fontSize: "48px",
            fontWeight: 700,
            color: palette.text,
            fontFamily: typography.heading,
            opacity: fadeIn(frame, entranceFrame + 10, 20),
            textAlign: "center",
            textShadow: glowShadow(glowColor, 0.3, 15),
          }}
        >
          {title}
        </div>
      )}

      {/* Subtitle below title */}
      {subtitle && (
        <div
          style={{
            position: "absolute",
            top: "72%",
            left: "50%",
            transform: `translate(-50%, -50%) translateY(${slideIn(frame, entranceFrame + 20, "up", 25, 25).y}px)`,
            fontSize: "24px",
            fontWeight: 400,
            color: rgba(palette.text, 0.6),
            fontFamily: typography.body,
            opacity: fadeIn(frame, entranceFrame + 20, 20),
            textAlign: "center",
            letterSpacing: "1px",
          }}
        >
          {subtitle}
        </div>
      )}

      {/* Rotating orbit accent ring (subtle) */}
      <div
        style={{
          position: "absolute",
          top: `calc(35% + ${globeFloat}px)`,
          left: "50%",
          width: `${globeRadius * 3}px`,
          height: `${globeRadius * 1.2}px`,
          borderRadius: "50%",
          border: `2px solid ${rgba(glowColor, 0.3)}`,
          transform: `translate(-50%, -50%) rotateX(65deg) rotateZ(${rotationY * 0.5}deg)`,
          opacity: globeEntranceOpacity * 0.4,
        }}
      />

      {/* Glow highlight accent */}
      <div
        style={{
          position: "absolute",
          top: `calc(35% + ${globeFloat}px)`,
          left: "50%",
          width: "300px",
          height: "200px",
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${rgba(glowColor, 0.3)}, transparent)`,
          transform: "translate(-50%, -50%)",
          filter: "blur(40px)",
          opacity: globeEntranceOpacity * pulseGlow(frame, 40, 0.2, 0.4),
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
