import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
  AbsoluteFill,
  Img,
  staticFile,
} from "remotion";

/* ─── Types ─── */
interface LogoStingerData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  durationFrames: number;
  logo: string;
  tagline?: string;
  style?: "particles" | "scale" | "blur" | "line";
  logoSize?: number;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
}

interface Props {
  data: LogoStingerData;
}

/* ─── Helpers ─── */
function resolveImg(src: string): string {
  if (!src) return "";
  if (src.startsWith("http") || src.startsWith("data:")) return src;
  try {
    return staticFile(src);
  } catch {
    // staticFile may throw if path is invalid — return raw path as fallback
    return src;
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/* ─── Converging Particles ─── */
const ConvergingParticles: React.FC<{
  frame: number;
  fps: number;
  revealFrame: number;
  color: string;
  width: number;
  height: number;
}> = ({ frame, fps, revealFrame, color, width, height }) => {
  const count = 80;
  const cx = width / 2;
  const cy = height / 2;
  const rgb = hexToRgb(color);

  const particles = React.useMemo(() => {
    const p = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + ((i * 137.508 * Math.PI) / 180); // golden angle spread
      const seed = ((i * 7919 + 1013) % 1000) / 1000;
      const startDist = 350 + seed * 500;
      const size = 4 + seed * 8;
      const convergeSpeed = 0.7 + seed * 0.6; // staggered convergence
      const brightness = 0.5 + seed * 0.5;
      p.push({ angle, startDist, size, convergeSpeed, brightness });
    }
    return p;
  }, []);

  return (
    <>
      {particles.map((p, i) => {
        // Before reveal: particles converge toward center
        // After reveal: particles burst outward
        const postReveal = frame - revealFrame;

        let dist: number;
        let opacity: number;
        let currentSize = p.size;

        if (frame < revealFrame) {
          // Converging phase: start far, accelerate toward center
          const t = interpolate(frame, [0, revealFrame], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          // Ease-in convergence (starts slow, accelerates)
          const eased = Math.pow(t, 1.5) * p.convergeSpeed;
          dist = p.startDist * (1 - Math.min(1, eased));

          // Fade in, then brighten as they get closer
          opacity = interpolate(frame, [0, 8, revealFrame - 5, revealFrame], [0, 0.4, 0.8, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }) * p.brightness;

          // Grow slightly as they converge
          currentSize = p.size * interpolate(t, [0, 1], [0.6, 1.2]);
        } else {
          // Explosion phase: burst outward fast
          const explodeT = interpolate(postReveal, [0, 12], [0, 1], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          dist = p.startDist * 2 * explodeT;

          opacity = interpolate(postReveal, [0, 3, 15], [1, 0.6, 0], {
            extrapolateRight: "clamp",
          }) * p.brightness;

          currentSize = p.size * interpolate(explodeT, [0, 1], [1.5, 0.5]);
        }

        const x = cx + Math.cos(p.angle) * dist;
        const y = cy + Math.sin(p.angle) * dist;

        if (opacity <= 0.01) return null;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - currentSize / 2,
              top: y - currentSize / 2,
              width: currentSize,
              height: currentSize,
              borderRadius: "50%",
              backgroundColor: color,
              opacity,
              boxShadow: `0 0 ${currentSize * 2}px ${currentSize}px rgba(${rgb.r},${rgb.g},${rgb.b},${opacity * 0.6})`,
            }}
          />
        );
      })}
    </>
  );
};

/* ─── Shockwave Ring ─── */
const ShockwaveRing: React.FC<{
  frame: number;
  revealFrame: number;
  color: string;
  width: number;
  height: number;
}> = ({ frame, revealFrame, color, width, height }) => {
  const postReveal = frame - revealFrame;
  if (postReveal < -1 || postReveal > 20) return null;

  const rgb = hexToRgb(color);
  const expandProgress = interpolate(postReveal, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const ringSize = expandProgress * Math.max(width, height) * 0.8;
  const ringOpacity = interpolate(postReveal, [0, 4, 18], [0, 0.7, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ringThickness = interpolate(expandProgress, [0, 1], [8, 2]);

  return (
    <div
      style={{
        position: "absolute",
        left: width / 2 - ringSize / 2,
        top: height / 2 - ringSize / 2,
        width: ringSize,
        height: ringSize,
        borderRadius: "50%",
        border: `${ringThickness}px solid rgba(${rgb.r},${rgb.g},${rgb.b},${ringOpacity})`,
        boxShadow: `0 0 30px 5px rgba(${rgb.r},${rgb.g},${rgb.b},${ringOpacity * 0.5}), inset 0 0 30px 5px rgba(${rgb.r},${rgb.g},${rgb.b},${ringOpacity * 0.3})`,
      }}
    />
  );
};

/* ─── Flash Overlay ─── */
const FlashOverlay: React.FC<{
  frame: number;
  revealFrame: number;
  color: string;
}> = ({ frame, revealFrame, color }) => {
  const postReveal = frame - revealFrame;
  if (postReveal < -1 || postReveal > 15) return null;

  const rgb = hexToRgb(color);
  const opacity = interpolate(postReveal, [-1, 1, 4, 15], [0, 0.85, 0.5, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${opacity * 0.9}) 0%, rgba(${rgb.r},${rgb.g},${rgb.b},${opacity * 0.6}) 30%, transparent 65%)`,
      }}
    />
  );
};

/* ─── Energy Build-up Glow ─── */
const EnergyGlow: React.FC<{
  frame: number;
  revealFrame: number;
  color: string;
  width: number;
  height: number;
}> = ({ frame, revealFrame, color, width, height }) => {
  if (frame > revealFrame + 5) return null;

  const rgb = hexToRgb(color);
  // Glow builds up as particles converge, peaks at reveal
  const intensity = interpolate(frame, [0, revealFrame * 0.5, revealFrame - 3, revealFrame], [0, 0.05, 0.15, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const size = interpolate(frame, [0, revealFrame], [50, 250], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: width / 2 - size,
        top: height / 2 - size,
        width: size * 2,
        height: size * 2,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(${rgb.r},${rgb.g},${rgb.b},${intensity}) 0%, rgba(${rgb.r},${rgb.g},${rgb.b},${intensity * 0.3}) 50%, transparent 70%)`,
        filter: "blur(20px)",
      }}
    />
  );
};

/* ─── Line Style: Expanding Line ─── */
const ExpandingLine: React.FC<{
  frame: number;
  revealFrame: number;
  color: string;
  width: number;
}> = ({ frame, revealFrame, color, width }) => {
  const rgb = hexToRgb(color);

  // Line grows from center, then splits and fades
  const growProgress = interpolate(frame, [3, revealFrame * 0.7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const lineWidth = growProgress * width * 0.65;
  const lineHeight = interpolate(frame, [3, revealFrame * 0.5, revealFrame], [1, 3, 4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(frame, [revealFrame - 2, revealFrame + 8], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (fadeOut <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: lineWidth,
        height: lineHeight,
        transform: "translate(-50%, -50%)",
        backgroundColor: color,
        opacity: fadeOut,
        boxShadow: `0 0 20px 5px rgba(${rgb.r},${rgb.g},${rgb.b},0.6), 0 0 60px 15px rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`,
        borderRadius: lineHeight,
      }}
    />
  );
};

/* ─── Main Component ─── */
export const LogoStinger: React.FC<Props> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalFrames = data.durationFrames || Math.round((data.durationMs / 1000) * fps);
  const logo = resolveImg(data.logo || "");
  const tagline = data.tagline || "";
  const style = data.style || "particles";
  const logoSize = data.logoSize || 280;
  const bgColor = data.bgColor || "#0A0A0A";
  const textColor = data.textColor || "#FFFFFF";
  const accentColor = data.accentColor || "#7C3AED";
  const w = data.width || 1080;
  const h = data.height || 1920;

  const rgb = hexToRgb(accentColor);

  // Reveal moment — punchy, front-loaded at 40%
  const revealFrame = Math.round(totalFrames * 0.4);

  // Scene opacity
  const exitStart = totalFrames * 0.85;
  const sceneOpacity = interpolate(frame, [0, 3, exitStart, totalFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* ── Logo animation (all styles converge to logo appearing at revealFrame) ── */
  const logoSpring = spring({
    frame: Math.max(0, frame - revealFrame),
    fps,
    config: { damping: 10, stiffness: 120, mass: 0.4 },
  });

  let logoOpacity: number;
  let logoScale: number;
  let logoBlur: number;

  if (style === "scale") {
    logoOpacity = frame >= revealFrame ? logoSpring : 0;
    logoScale = frame >= revealFrame ? interpolate(logoSpring, [0, 1], [0.05, 1]) : 0;
    logoBlur = frame >= revealFrame ? interpolate(logoSpring, [0, 1], [25, 0]) : 25;
  } else if (style === "blur") {
    const blurProgress = interpolate(frame, [revealFrame - 8, revealFrame + 8], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
    logoOpacity = blurProgress;
    logoScale = interpolate(blurProgress, [0, 1], [1.4, 1]);
    logoBlur = interpolate(blurProgress, [0, 1], [35, 0]);
  } else if (style === "line") {
    logoOpacity = frame >= revealFrame ? logoSpring : 0;
    logoScale = frame >= revealFrame ? interpolate(logoSpring, [0, 1], [0.8, 1]) : 0;
    logoBlur = 0;
  } else {
    // particles (default)
    logoOpacity = frame >= revealFrame ? logoSpring : 0;
    logoScale = frame >= revealFrame ? interpolate(logoSpring, [0, 1], [0.3, 1]) : 0;
    logoBlur = frame >= revealFrame ? interpolate(logoSpring, [0, 1], [15, 0]) : 15;
  }

  // Tagline entrance
  const taglineDelay = revealFrame + 10;
  const taglineSpring = spring({
    frame: Math.max(0, frame - taglineDelay),
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.5 },
  });
  const taglineY = interpolate(taglineSpring, [0, 1], [25, 0]);

  // Post-reveal glow pulse
  const postRevealGlow = frame > revealFrame
    ? interpolate(
        Math.sin((frame - revealFrame) * 0.15) * 0.5 + 0.5,
        [0, 1],
        [0.15, 0.35]
      ) * interpolate(frame - revealFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" })
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, opacity: sceneOpacity }}>
      {/* ── Energy build-up glow ── */}
      <EnergyGlow
        frame={frame}
        revealFrame={revealFrame}
        color={accentColor}
        width={w}
        height={h}
      />

      {/* ── Converging particles (particles + scale styles) ── */}
      {(style === "particles" || style === "scale") && (
        <ConvergingParticles
          frame={frame}
          fps={fps}
          revealFrame={revealFrame}
          color={accentColor}
          width={w}
          height={h}
        />
      )}

      {/* ── Expanding line (line style) ── */}
      {style === "line" && (
        <ExpandingLine
          frame={frame}
          revealFrame={revealFrame}
          color={accentColor}
          width={w}
        />
      )}

      {/* ── Shockwave ring at reveal ── */}
      <ShockwaveRing
        frame={frame}
        revealFrame={revealFrame}
        color={accentColor}
        width={w}
        height={h}
      />

      {/* ── Flash overlay at reveal ── */}
      <FlashOverlay frame={frame} revealFrame={revealFrame} color={accentColor} />

      {/* ── Post-reveal accent glow behind logo ── */}
      {logoOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            left: w / 2 - logoSize * 1.2,
            top: h / 2 - logoSize * 1.2,
            width: logoSize * 2.4,
            height: logoSize * 2.4,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(${rgb.r},${rgb.g},${rgb.b},${postRevealGlow}) 0%, rgba(${rgb.r},${rgb.g},${rgb.b},${postRevealGlow * 0.4}) 40%, transparent 65%)`,
            filter: "blur(25px)",
          }}
        />
      )}

      {/* ── Logo + Tagline ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {logo ? (
          <Img
            src={logo}
            style={{
              width: logoSize,
              height: logoSize,
              objectFit: "contain",
              opacity: logoOpacity,
              transform: `scale(${logoScale})`,
              filter: `blur(${logoBlur}px)`,
            }}
          />
        ) : (
          /* Fallback: render logoText or tagline as text if no image available */
          <div
            style={{
              fontFamily: "Inter, Helvetica Neue, Arial, sans-serif",
              fontSize: logoSize * 0.3,
              fontWeight: 800,
              color: textColor,
              opacity: logoOpacity,
              transform: `scale(${logoScale})`,
              filter: `blur(${logoBlur}px)`,
              letterSpacing: 2,
            }}
          >
            {data.tagline || ""}
          </div>
        )}

        {tagline && (
          <div
            style={{
              marginTop: 35,
              fontSize: 28,
              fontWeight: 500,
              color: `${textColor}CC`,
              fontFamily: "Inter, Helvetica Neue, Arial, sans-serif",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              opacity: taglineSpring,
              transform: `translateY(${taglineY}px)`,
            }}
          >
            {tagline}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
