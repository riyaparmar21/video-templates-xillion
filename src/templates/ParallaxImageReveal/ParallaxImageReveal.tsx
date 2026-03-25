import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
  Img,
  staticFile,
} from "remotion";
import { AbsoluteFill } from "remotion";

/* ── Types ── */
interface ParallaxImageRevealData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  durationFrames: number;

  /** Image source — URL, data URI, or public/ path via staticFile */
  image?: string;

  /**
   * Optional array of layer images for manual depth separation.
   * If omitted, the single `image` is auto-sliced into horizontal strips.
   */
  layers?: string[];

  /** Number of depth layers (2-6). Default 4. Ignored when `layers` is provided. */
  layerCount?: number;

  /** Direction of parallax drift: "up" | "down" | "left" | "right" | "diagonal" */
  direction?: string;

  /** Speed multiplier for drift: "slow" | "medium" | "fast". Default "medium" */
  speed?: string;

  /** Zoom mode: "in" (Ken Burns push-in), "out" (pull-out), "none". Default "in" */
  zoom?: string;

  /** Optional headline text overlaid in the center */
  headline?: string;

  /** Optional subtitle text below headline */
  subtitle?: string;

  /** Reveal style: "fade" | "split" | "iris" | "wipe". Default "fade" */
  revealStyle?: string;

  /** Background color fallback */
  bgColor?: string;
  textColor?: string;
  accentColor?: string;

  /** Enable subtle vignette overlay. Default true */
  vignette?: boolean;

  /** Enable light leak / lens flare overlay. Default true */
  lightLeak?: boolean;
}

interface Props {
  data: ParallaxImageRevealData;
}

/* ── Helpers ── */
function resolveImg(src: string): string {
  if (!src) return "";
  if (src.startsWith("http") || src.startsWith("data:")) return src;
  return staticFile(src);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/* ── Component ── */
export const ParallaxImageReveal: React.FC<Props> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const {
    width = 1080,
    height = 1920,
    durationFrames = 150,
    image,
    layers: manualLayers,
    layerCount: rawLayerCount = 4,
    direction = "up",
    speed = "medium",
    zoom = "in",
    headline,
    subtitle,
    revealStyle = "fade",
    bgColor = "#0A0A0A",
    textColor = "#FFFFFF",
    accentColor = "#FF6B35",
    vignette = true,
    lightLeak = true,
  } = data;

  const layerCount = Math.max(2, Math.min(6, rawLayerCount));
  const totalFrames = durationFrames || 150;

  // Speed multipliers
  const speedMult =
    speed === "slow" ? 0.4 : speed === "fast" ? 1.6 : 0.85;

  // Direction vector
  const dirMap: Record<string, { x: number; y: number }> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    diagonal: { x: -0.7, y: -0.7 },
  };
  const dir = dirMap[direction] || dirMap.up;

  // ── Reveal animation (first 30% of scene) ──
  const revealDuration = Math.floor(totalFrames * 0.25);
  const revealProgress = interpolate(frame, [0, revealDuration], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // ── Ken Burns zoom ──
  const zoomStart = zoom === "out" ? 1.18 : 1.0;
  const zoomEnd = zoom === "out" ? 1.0 : zoom === "in" ? 1.18 : 1.0;
  const globalScale = interpolate(frame, [0, totalFrames], [zoomStart, zoomEnd], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });

  // ── Exit fade (last 15%) ──
  const exitStart = Math.floor(totalFrames * 0.85);
  const exitOpacity = interpolate(frame, [exitStart, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Reveal clip path ──
  const revealClip = useMemo(() => {
    if (revealProgress >= 1) return "none";
    const p = revealProgress;
    switch (revealStyle) {
      case "iris":
        // Circle expanding from center
        const radius = p * 150; // percentage
        return `circle(${radius}% at 50% 50%)`;
      case "wipe":
        // Left-to-right wipe
        const edge = p * 120; // overshoot slightly
        return `inset(0 ${Math.max(0, 100 - edge)}% 0 0)`;
      case "split":
        // Vertical split from center
        const half = (1 - p) * 50;
        return `inset(0 ${half}% 0 ${half}%)`;
      case "fade":
      default:
        return "none";
    }
  }, [revealProgress, revealStyle]);

  const revealOpacity =
    revealStyle === "fade"
      ? interpolate(frame, [0, revealDuration * 0.6], [0, 1], {
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.quad),
        })
      : 1;

  // ── Build layers ──
  const resolvedImage = image ? resolveImg(image) : "";
  const hasImage = !!resolvedImage;

  return (
    <AbsoluteFill
      style={{
        background: bgColor,
        overflow: "hidden",
        opacity: exitOpacity,
      }}
    >
      {/* Image layers container */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          clipPath: revealClip !== "none" ? revealClip : undefined,
          opacity: revealOpacity,
          transform: `scale(${globalScale})`,
          transformOrigin: "50% 50%",
        }}
      >
        {/* Render depth layers back to front */}
        {Array.from({ length: layerCount }).map((_, layerIdx) => {
          // depthRatio: 0 = furthest back, 1 = closest foreground
          const depthRatio = layerIdx / Math.max(1, layerCount - 1);

          // Parallax: back layers move less, front layers move more
          const parallaxIntensity = 0.15 + depthRatio * 0.85;
          const driftX =
            frame * speedMult * parallaxIntensity * dir.x * 0.5;
          const driftY =
            frame * speedMult * parallaxIntensity * dir.y * 0.5;

          // Depth-of-field blur: back layers blurry, front sharp
          // Reduced base blur from 8→4 so images stay readable
          const blurAmount = interpolate(depthRatio, [0, 0.5, 1], [4, 1, 0], {
            extrapolateRight: "clamp",
          });

          // Layer entrance: stagger from back to front
          const entranceDelay = layerIdx * 4;
          const entranceProgress = spring({
            frame: Math.max(0, frame - entranceDelay),
            fps,
            config: { damping: 14, stiffness: 80, mass: 0.6 },
          });

          // Slight per-layer scale for depth pop
          const layerScale = interpolate(depthRatio, [0, 1], [1.0, 1.06]);

          // Layer brightness: back layers slightly darker
          const brightness = 0.7 + depthRatio * 0.3;

          // Calculate the vertical slice of the image this layer shows
          // Each layer clips a horizontal band to simulate depth separation
          const stripHeight = 100 / layerCount;
          const stripTop = layerIdx * stripHeight;

          return (
            <div
              key={`layer-${layerIdx}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                transform: `translate(${driftX}px, ${driftY}px) scale(${layerScale * entranceProgress})`,
                transformOrigin: "50% 50%",
                filter: `blur(${blurAmount * Math.max(0, 1 - revealProgress * 1.5)}px) brightness(${brightness})`,
                opacity: entranceProgress,
                overflow: "hidden",
              }}
            >
              {hasImage ? (
                // When we have an actual image, each layer shows it at a slightly
                // different position to create parallax depth from a single image
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    // Clip each layer to its depth strip for the separation effect
                    clipPath: `inset(${stripTop}% 0 ${Math.max(0, 100 - stripTop - stripHeight)}% 0)`,
                  }}
                >
                  <Img
                    src={resolvedImage}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              ) : (
                // Fallback: generate abstract gradient layers for visual demo
                <GradientLayer
                  layerIdx={layerIdx}
                  layerCount={layerCount}
                  depthRatio={depthRatio}
                  bgColor={bgColor}
                  accentColor={accentColor}
                  frame={frame}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Atmospheric light leak overlay */}
      {lightLeak && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: layerCount + 1,
            opacity: interpolate(
              Math.sin(frame / 40),
              [-1, 1],
              [0.02, 0.12],
            ),
            background: `radial-gradient(ellipse at ${
              30 + Math.sin(frame / 60) * 20
            }% ${20 + Math.cos(frame / 45) * 15}%, ${accentColor}44 0%, transparent 60%)`,
            mixBlendMode: "screen",
          }}
        />
      )}

      {/* Vignette */}
      {vignette && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(ellipse at 50% 50%, transparent 40%, ${bgColor}CC 100%)`,
            pointerEvents: "none",
            zIndex: layerCount + 2,
          }}
        />
      )}

      {/* Text overlay */}
      {(headline || subtitle) && (
        <TextOverlay
          headline={headline}
          subtitle={subtitle}
          textColor={textColor}
          accentColor={accentColor}
          frame={frame}
          fps={fps}
          totalFrames={totalFrames}
          revealDuration={revealDuration}
        />
      )}
    </AbsoluteFill>
  );
};

/* ── Gradient fallback layer (no image provided) ── */
const GradientLayer: React.FC<{
  layerIdx: number;
  layerCount: number;
  depthRatio: number;
  bgColor: string;
  accentColor: string;
  frame: number;
}> = ({ layerIdx, layerCount, depthRatio, bgColor, accentColor, frame }) => {
  // Generate a rich abstract gradient that shifts over time
  const hueShift = layerIdx * (360 / layerCount);
  const drift = Math.sin(frame / (30 + layerIdx * 10)) * 20;

  return (
    <div
      style={{
        position: "absolute",
        top: "-10%",
        left: "-10%",
        width: "120%",
        height: "120%",
        background: `
          radial-gradient(
            ellipse at ${50 + drift}% ${40 + Math.cos(frame / 25 + layerIdx) * 15}%,
            ${accentColor}${Math.round(20 + depthRatio * 30).toString(16).padStart(2, "0")} 0%,
            transparent 50%
          ),
          radial-gradient(
            circle at ${30 + layerIdx * 15}% ${60 - layerIdx * 10}%,
            ${bgColor} 0%,
            transparent 70%
          )
        `,
        opacity: 0.4 + depthRatio * 0.6,
      }}
    />
  );
};

/* ── Text overlay with cinematic entrance ── */
const TextOverlay: React.FC<{
  headline?: string;
  subtitle?: string;
  textColor: string;
  accentColor: string;
  frame: number;
  fps: number;
  totalFrames: number;
  revealDuration: number;
}> = ({
  headline,
  subtitle,
  textColor,
  accentColor,
  frame,
  fps,
  totalFrames,
  revealDuration,
}) => {
  // Text appears after image reveal completes
  const textDelay = Math.floor(revealDuration * 0.8);

  const headlineProgress = spring({
    frame: Math.max(0, frame - textDelay),
    fps,
    config: { damping: 15, stiffness: 80, mass: 0.8 },
  });

  const subtitleProgress = spring({
    frame: Math.max(0, frame - textDelay - 8),
    fps,
    config: { damping: 15, stiffness: 80, mass: 0.8 },
  });

  const headlineY = interpolate(headlineProgress, [0, 1], [40, 0]);
  const subtitleY = interpolate(subtitleProgress, [0, 1], [30, 0]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "0 60px",
      }}
    >
      {/* Dark scrim behind text for readability on busy images */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: 0,
          right: 0,
          bottom: "30%",
          background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.65) 25%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.65) 75%, transparent 100%)",
          opacity: Math.max(headlineProgress, subtitleProgress),
          pointerEvents: "none",
        }}
      />
      {headline && (
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: textColor,
            textAlign: "center",
            lineHeight: 1.1,
            opacity: headlineProgress,
            transform: `translateY(${headlineY}px)`,
            textShadow: `0 4px 30px rgba(0,0,0,0.8), 0 0 60px ${accentColor}33`,
            letterSpacing: "-1px",
          }}
        >
          {headline}
        </div>
      )}
      {subtitle && (
        <div
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: textColor,
            textAlign: "center",
            marginTop: 20,
            opacity: subtitleProgress * 0.85,
            transform: `translateY(${subtitleY}px)`,
            textShadow: "0 2px 20px rgba(0,0,0,0.7)",
            letterSpacing: "2px",
            textTransform: "uppercase" as const,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};
