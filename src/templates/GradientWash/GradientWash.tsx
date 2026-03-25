import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
  AbsoluteFill,
} from "remotion";

/* ─── Types ─── */
interface GradientWashData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  durationFrames: number;
  colors?: string[];
  style?: "radial" | "linear" | "mesh" | "aurora";
  speed?: "slow" | "medium" | "fast";
  text?: string;
  textSize?: number;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
}

interface Props {
  data: GradientWashData;
}

/* ─── Helpers ─── */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r},${g},${bl})`;
}

/* ─── Sub-components ─── */
const TextOverlay: React.FC<{
  text: string;
  textColor: string;
  textSize: number;
  frame: number;
  fps: number;
  totalFrames: number;
}> = ({ text, textColor, textSize, frame, fps, totalFrames }) => {
  const entrance = spring({
    frame: Math.max(0, frame - Math.round(totalFrames * 0.15)),
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.6 },
  });
  const exitStart = totalFrames * 0.85;
  const exitOpacity = interpolate(frame, [exitStart, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = entrance * exitOpacity;
  const y = interpolate(entrance, [0, 1], [30, 0]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: "15%",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          fontSize: textSize,
          fontWeight: 700,
          color: textColor,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          textShadow: "0 2px 30px rgba(0,0,0,0.5)",
          fontFamily: "Inter, Helvetica Neue, Arial, sans-serif",
          textAlign: "center",
          padding: "0 60px",
        }}
      >
        {text}
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
export const GradientWash: React.FC<Props> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalFrames = data.durationFrames || Math.round((data.durationMs / 1000) * fps);
  const colors = data.colors || ["#FF6B35", "#7C3AED", "#06B6D4", "#EC4899"];
  const style = data.style || "radial";
  const speed = data.speed || "medium";
  const text = data.text || "";
  const textSize = data.textSize || 48;
  const textColor = data.textColor || "#FFFFFF";

  // Speed multiplier
  const speedMul = speed === "slow" ? 0.5 : speed === "fast" ? 2.0 : 1.0;
  const t = (frame / totalFrames) * speedMul;

  // Exit fade (last 15%)
  const exitStart = totalFrames * 0.85;
  const sceneOpacity = interpolate(frame, [0, 8, exitStart, totalFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Smooth cycling through colors
  const colorCount = colors.length;
  const cyclePos = (t * 2) % colorCount;
  const idx0 = Math.floor(cyclePos) % colorCount;
  const idx1 = (idx0 + 1) % colorCount;
  const idx2 = (idx0 + 2) % colorCount;
  const idx3 = (idx0 + 3) % colorCount;
  const frac = cyclePos - Math.floor(cyclePos);

  const c0 = lerpColor(colors[idx0], colors[idx1], frac);
  const c1 = lerpColor(colors[idx1], colors[idx2], frac);
  const c2 = lerpColor(colors[idx2], colors[idx3 % colorCount], frac);
  const c3 = lerpColor(colors[idx3 % colorCount], colors[idx0], frac);

  // Animated positions for gradient stops
  const phase = t * Math.PI * 2;
  const px0 = 50 + 40 * Math.sin(phase);
  const py0 = 50 + 40 * Math.cos(phase);
  const px1 = 50 + 40 * Math.cos(phase * 0.7 + 1);
  const py1 = 50 + 40 * Math.sin(phase * 0.7 + 1);
  const px2 = 50 + 35 * Math.sin(phase * 0.5 + 2.5);
  const py2 = 50 + 35 * Math.cos(phase * 0.5 + 2.5);

  let backgroundStyle: React.CSSProperties = {};

  if (style === "radial") {
    backgroundStyle = {
      background: [
        `radial-gradient(ellipse at ${px0}% ${py0}%, ${c0} 0%, transparent 60%)`,
        `radial-gradient(ellipse at ${px1}% ${py1}%, ${c1} 0%, transparent 60%)`,
        `radial-gradient(ellipse at ${px2}% ${py2}%, ${c2} 0%, transparent 55%)`,
        `radial-gradient(ellipse at 50% 50%, ${c3} 0%, transparent 70%)`,
        `linear-gradient(135deg, ${colors[0]}22 0%, ${colors[colorCount - 1]}22 100%)`,
      ].join(", "),
      backgroundColor: "#0A0A0A",
    };
  } else if (style === "linear") {
    const angle = interpolate(frame, [0, totalFrames], [0, 360], {
      extrapolateRight: "clamp",
    });
    backgroundStyle = {
      background: `linear-gradient(${angle}deg, ${c0} 0%, ${c1} 33%, ${c2} 66%, ${c3} 100%)`,
    };
  } else if (style === "mesh") {
    backgroundStyle = {
      background: [
        `radial-gradient(circle at ${px0}% ${py0}%, ${c0} 0%, transparent 50%)`,
        `radial-gradient(circle at ${100 - px1}% ${py1}%, ${c1} 0%, transparent 50%)`,
        `radial-gradient(circle at ${px2}% ${100 - py2}%, ${c2} 0%, transparent 50%)`,
        `radial-gradient(circle at ${50 + 20 * Math.sin(phase * 1.3)}% ${50 + 20 * Math.cos(phase * 0.8)}%, ${c3} 0%, transparent 45%)`,
      ].join(", "),
      backgroundColor: "#0A0A0A",
    };
  } else {
    // aurora
    const wave1 = 50 + 30 * Math.sin(phase * 0.6);
    const wave2 = 50 + 25 * Math.sin(phase * 0.8 + 1.5);
    const wave3 = 50 + 20 * Math.sin(phase * 1.0 + 3.0);
    backgroundStyle = {
      background: [
        `linear-gradient(180deg, transparent 0%, transparent ${wave1 - 25}%, ${c0}88 ${wave1}%, transparent ${wave1 + 25}%, transparent 100%)`,
        `linear-gradient(180deg, transparent 0%, transparent ${wave2 - 20}%, ${c1}66 ${wave2}%, transparent ${wave2 + 20}%, transparent 100%)`,
        `linear-gradient(180deg, transparent 0%, transparent ${wave3 - 15}%, ${c2}44 ${wave3}%, transparent ${wave3 + 15}%, transparent 100%)`,
      ].join(", "),
      backgroundColor: "#050510",
    };
  }

  // Grain overlay for cinematic feel
  const grainSeed = (frame * 1234567) % 100;

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* Main gradient */}
      <AbsoluteFill style={backgroundStyle} />

      {/* Soft vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      {/* Film grain overlay */}
      <AbsoluteFill
        style={{
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='${grainSeed}'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "256px 256px",
        }}
      />

      {/* Optional text overlay */}
      {text && (
        <TextOverlay
          text={text}
          textColor={textColor}
          textSize={textSize}
          frame={frame}
          fps={fps}
          totalFrames={totalFrames}
        />
      )}
    </AbsoluteFill>
  );
};
