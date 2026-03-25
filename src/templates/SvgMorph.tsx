import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
  random,
  AbsoluteFill,
} from "remotion";
import type { TemplateProps } from "../engine/schema";
import {
  fadeIn,
  scaleIn,
  rgba,
  hexToRgb,
  glowShadow,
  breathe,
  rotate,
  float,
} from "../lib/animations";

// ── Shape Point Type ──
interface Point {
  x: number;
  y: number;
}

// ── Helper: Convert hex color to RGB, then interpolate between colors ──
function interpolateColor(
  color1: string,
  color2: string,
  progress: number
): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * progress);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * progress);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * progress);
  return `rgb(${r},${g},${b})`;
}

// ── Preset Shapes: Generate 24 evenly-spaced points around the perimeter ──
function getShapePoints(shapeName: string, size: number): Point[] {
  const numPoints = 24;
  const points: Point[] = [];
  const radius = size / 2;

  switch (shapeName.toLowerCase()) {
    case "circle": {
      // Parametric circle: (cos(t), sin(t)) * r
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        points.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        });
      }
      break;
    }

    case "square": {
      // Square with rounded corners, distribute points evenly along edges
      const halfSize = size / 2;
      const cornerRadius = 16;
      const pointsPerEdge = numPoints / 4;

      // Top edge
      for (let i = 0; i < pointsPerEdge; i++) {
        const t = i / pointsPerEdge;
        points.push({
          x: -halfSize + t * size,
          y: -halfSize,
        });
      }

      // Right edge
      for (let i = 0; i < pointsPerEdge; i++) {
        const t = i / pointsPerEdge;
        points.push({
          x: halfSize,
          y: -halfSize + t * size,
        });
      }

      // Bottom edge
      for (let i = 0; i < pointsPerEdge; i++) {
        const t = i / pointsPerEdge;
        points.push({
          x: halfSize - t * size,
          y: halfSize,
        });
      }

      // Left edge
      for (let i = 0; i < pointsPerEdge; i++) {
        const t = i / pointsPerEdge;
        points.push({
          x: -halfSize,
          y: halfSize - t * size,
        });
      }
      break;
    }

    case "triangle": {
      // Equilateral triangle, points at top, bottom-left, bottom-right
      const h = (size * Math.sqrt(3)) / 2; // height
      const vertices = [
        { x: 0, y: -radius },
        { x: radius * 0.866, y: radius * 0.5 }, // ~120 degrees
        { x: -radius * 0.866, y: radius * 0.5 },
      ];

      // Distribute 24 points around the 3 edges
      for (let i = 0; i < numPoints; i++) {
        const edgeProgress = (i % (numPoints / 3)) / (numPoints / 3);
        const edgeIdx = Math.floor((i * 3) / numPoints);
        const nextIdx = (edgeIdx + 1) % 3;

        const curr = vertices[edgeIdx];
        const next = vertices[nextIdx];

        points.push({
          x: curr.x + (next.x - curr.x) * edgeProgress,
          y: curr.y + (next.y - curr.y) * edgeProgress,
        });
      }
      break;
    }

    case "star": {
      // 5-pointed star: 10 vertices (alternating inner/outer radius)
      const outerRadius = radius;
      const innerRadius = radius * 0.4;
      const starVertices = [];

      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        starVertices.push({
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r,
        });
      }

      // Distribute 24 points around star perimeter
      for (let i = 0; i < numPoints; i++) {
        const edgeProgress = (i % (numPoints / 10)) / (numPoints / 10);
        const edgeIdx = Math.floor((i * 10) / numPoints);
        const nextIdx = (edgeIdx + 1) % 10;

        const curr = starVertices[edgeIdx];
        const next = starVertices[nextIdx];

        points.push({
          x: curr.x + (next.x - curr.x) * edgeProgress,
          y: curr.y + (next.y - curr.y) * edgeProgress,
        });
      }
      break;
    }

    case "hexagon": {
      // Regular hexagon: 6 vertices
      const vertices = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        vertices.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        });
      }

      // Distribute 24 points around hexagon edges
      for (let i = 0; i < numPoints; i++) {
        const edgeProgress = (i % (numPoints / 6)) / (numPoints / 6);
        const edgeIdx = Math.floor((i * 6) / numPoints);
        const nextIdx = (edgeIdx + 1) % 6;

        const curr = vertices[edgeIdx];
        const next = vertices[nextIdx];

        points.push({
          x: curr.x + (next.x - curr.x) * edgeProgress,
          y: curr.y + (next.y - curr.y) * edgeProgress,
        });
      }
      break;
    }

    case "diamond": {
      // Diamond: rotated square (45 degrees)
      const vertices = [
        { x: 0, y: -radius },
        { x: radius, y: 0 },
        { x: 0, y: radius },
        { x: -radius, y: 0 },
      ];

      for (let i = 0; i < numPoints; i++) {
        const edgeProgress = (i % (numPoints / 4)) / (numPoints / 4);
        const edgeIdx = Math.floor((i * 4) / numPoints);
        const nextIdx = (edgeIdx + 1) % 4;

        const curr = vertices[edgeIdx];
        const next = vertices[nextIdx];

        points.push({
          x: curr.x + (next.x - curr.x) * edgeProgress,
          y: curr.y + (next.y - curr.y) * edgeProgress,
        });
      }
      break;
    }

    case "cross": {
      // Plus sign: 12 vertices forming a cross shape
      const armLength = radius * 0.6;
      const armWidth = radius * 0.3;

      const vertices = [
        // Top arm
        { x: -armWidth, y: -radius },
        { x: armWidth, y: -radius },
        { x: armWidth, y: -armLength },
        // Right arm
        { x: radius, y: -armWidth },
        { x: radius, y: armWidth },
        { x: armLength, y: armWidth },
        // Bottom arm
        { x: armWidth, y: radius },
        { x: -armWidth, y: radius },
        { x: -armWidth, y: armLength },
        // Left arm
        { x: -radius, y: armWidth },
        { x: -radius, y: -armWidth },
        { x: -armLength, y: -armWidth },
      ];

      for (let i = 0; i < numPoints; i++) {
        const edgeProgress = (i % (numPoints / 12)) / (numPoints / 12);
        const edgeIdx = Math.floor((i * 12) / numPoints);
        const nextIdx = (edgeIdx + 1) % 12;

        const curr = vertices[edgeIdx];
        const next = vertices[nextIdx];

        points.push({
          x: curr.x + (next.x - curr.x) * edgeProgress,
          y: curr.y + (next.y - curr.y) * edgeProgress,
        });
      }
      break;
    }

    case "heart": {
      // Heart shape approximation using parametric curve
      for (let i = 0; i < numPoints; i++) {
        const t = (i / numPoints) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y =
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t);

        // Scale to match size
        points.push({
          x: (x * radius) / 16,
          y: (y * radius) / 16,
        });
      }
      break;
    }

    default: {
      // Fallback to circle
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        points.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        });
      }
    }
  }

  return points;
}

// ── Morph interpolation between two point arrays ──
function morphPoints(
  fromPoints: Point[],
  toPoints: Point[],
  progress: number
): Point[] {
  const result: Point[] = [];
  const length = Math.min(fromPoints.length, toPoints.length);

  for (let i = 0; i < length; i++) {
    const from = fromPoints[i];
    const to = toPoints[i];

    result.push({
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
    });
  }

  return result;
}

// ── Convert points array to SVG polygon points string ──
function pointsToSvgString(points: Point[]): string {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

export const SvgMorph: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // ── Extract parameters with defaults ──
  const title = (params.title as string) || "";
  const subtitle = (params.subtitle as string) || "";
  const shapes = (params.shapes as string[]) || [
    "circle",
    "square",
    "triangle",
    "star",
    "hexagon",
  ];
  const morphSpeed = (params.morphSpeed as number) || 1;
  const glowEnabled = params.glowEnabled !== false;
  const trailEnabled = params.trailEnabled !== false;
  const size = (params.size as number) || 300;
  const centerText = (params.centerText as string) || "";

  // ── Morphing logic ──
  const totalShapes = shapes.length;
  const framesPerShape = Math.floor(
    (sceneDurationFrames / totalShapes) / morphSpeed
  );
  const currentShapeIdx = Math.min(
    Math.floor(frame / framesPerShape),
    totalShapes - 1
  );
  const nextShapeIdx = Math.min(currentShapeIdx + 1, totalShapes - 1);
  const localFrame = frame - currentShapeIdx * framesPerShape;
  const morphDuration = framesPerShape * 0.8;

  const morphProgress = interpolate(
    localFrame,
    [0, morphDuration],
    [0, 1],
    {
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    }
  );

  // ── Get shape points ──
  const fromPoints = getShapePoints(shapes[currentShapeIdx], size);
  const toPoints = getShapePoints(shapes[nextShapeIdx], size);
  const currentPoints = morphPoints(fromPoints, toPoints, morphProgress);

  // ── Ghost trail effect ──
  const trailProgress = Math.max(
    0,
    morphProgress - 0.3
  );
  const trailFromPoints = getShapePoints(shapes[currentShapeIdx], size * 0.9);
  const trailToPoints = getShapePoints(shapes[nextShapeIdx], size * 0.9);
  const trailPoints = morphPoints(trailFromPoints, trailToPoints, Math.max(0, morphProgress - 0.25));

  // ── Color palette cycling ──
  const colorPalette = [
    palette.primary,
    palette.secondary,
    palette.accent,
  ];
  const colorIdx1 = currentShapeIdx % colorPalette.length;
  const colorIdx2 = nextShapeIdx % colorPalette.length;
  const shapeFill = interpolateColor(
    colorPalette[colorIdx1],
    colorPalette[colorIdx2],
    morphProgress
  );

  // ── Entrance animations ──
  const entranceScale = scaleIn(frame, 0, 0.6, 1, 30);
  const entranceOpacity = fadeIn(frame, 0, 20);
  const breatheScale = breathe(frame, 50, 0.03);
  const rotateAngle = rotate(frame, 8, fps, 0);
  const floatY = float(frame, 60, 3, random("morph-float"));

  // ── Particle generation for orbiting effect ──
  const particleCount = 10;
  const particles: Array<{
    id: number;
    angle: number;
    distance: number;
    size: number;
  }> = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    angle: (i / particleCount) * Math.PI * 2,
    distance: size / 2 + 80,
    size: 4 + random(`particle-${i}-size`) * 6,
  }));

  // ── Glow intensity ──
  const glowIntensity = glowEnabled ? 0.6 : 0;

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Background glow aura */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${entranceScale})`,
          width: "600px",
          height: "600px",
          background: `radial-gradient(circle, ${rgba(palette.primary, 0.15)} 0%, transparent 70%)`,
          filter: "blur(80px)",
          opacity: entranceOpacity * 0.7,
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* Orbiting particles */}
      {trailEnabled &&
        particles.map((particle) => {
          const particleAngle = particle.angle + rotate(frame, 30, fps, 0) * (Math.PI / 180);
          const particleX = Math.cos(particleAngle) * particle.distance;
          const particleY = Math.sin(particleAngle) * particle.distance;
          const particleOpacity = entranceOpacity * 0.4;

          return (
            <div
              key={particle.id}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(calc(-50% + ${particleX}px), calc(-50% + ${particleY}px))`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                borderRadius: "50%",
                background: rgba(palette.accent, particleOpacity),
                boxShadow: glowShadow(palette.accent, particleOpacity * 0.5, 6),
                zIndex: 2,
                pointerEvents: "none",
              }}
            />
          );
        })}

      {/* Ghost trail shape */}
      {trailEnabled && trailProgress > 0 && (
        <svg
          viewBox={`${-size}px ${-size}px ${size * 2}px ${size * 2}px`}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: `${size * 1.8}px`,
            height: `${size * 1.8}px`,
            transform: `translate(-50%, -50%) translate(0, ${floatY * 0.5}px) scale(${entranceScale * breatheScale}) rotate(${rotateAngle * 0.3}deg)`,
            opacity: entranceOpacity * (1 - morphProgress) * 0.2,
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          <defs>
            <filter id="morph-trail-glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <polygon
            points={pointsToSvgString(trailPoints)}
            fill={rgba(shapeFill, 0.3)}
            filter="url(#morph-trail-glow)"
          />
        </svg>
      )}

      {/* Main morphing shape */}
      <svg
        viewBox={`${-size}px ${-size}px ${size * 2}px ${size * 2}px`}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: `${size * 1.8}px`,
          height: `${size * 1.8}px`,
          transform: `translate(-50%, -50%) translate(0, ${floatY}px) scale(${entranceScale * breatheScale}) rotate(${rotateAngle}deg)`,
          opacity: entranceOpacity,
          zIndex: 3,
          pointerEvents: "none",
        }}
      >
        <defs>
          {/* Glow filter */}
          <filter id="morph-glow">
            <feGaussianBlur stdDeviation={glowIntensity * 4} result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradient fill */}
          <defs>
            <linearGradient id="morph-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={shapeFill} stopOpacity="1" />
              <stop offset="100%" stopColor={rgba(shapeFill, 0.7)} stopOpacity="1" />
            </linearGradient>
          </defs>
        </defs>

        {/* Polygon shape */}
        <polygon
          points={pointsToSvgString(currentPoints)}
          fill="url(#morph-gradient)"
          filter={glowEnabled ? "url(#morph-glow)" : undefined}
        />
      </svg>

      {/* Center text (optional) */}
      {centerText && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) translate(0, ${floatY * 0.3}px)`,
            fontSize: "28px",
            fontWeight: 700,
            color: palette.text,
            fontFamily: typography.heading,
            opacity: entranceOpacity,
            textAlign: "center",
            zIndex: 5,
            pointerEvents: "none",
            textShadow: glowShadow(palette.primary, 0.4, 12),
          }}
        >
          {centerText}
        </div>
      )}

      {/* Title */}
      {title && (
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "50%",
            transform: `translate(-50%, 0) translate(0, ${floatY * 0.2}px)`,
            fontSize: "48px",
            fontWeight: 700,
            color: palette.text,
            fontFamily: typography.heading,
            opacity: entranceOpacity,
            textAlign: "center",
            maxWidth: "90%",
            zIndex: 4,
            pointerEvents: "none",
            textShadow: glowShadow(palette.primary, 0.3, 10),
          }}
        >
          {title}
        </div>
      )}

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            left: "50%",
            transform: `translate(-50%, 0) translate(0, ${-floatY * 0.2}px)`,
            fontSize: "24px",
            fontWeight: 400,
            color: rgba(palette.text, 0.8),
            fontFamily: typography.body,
            opacity: entranceOpacity,
            textAlign: "center",
            maxWidth: "90%",
            zIndex: 4,
            pointerEvents: "none",
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
};
