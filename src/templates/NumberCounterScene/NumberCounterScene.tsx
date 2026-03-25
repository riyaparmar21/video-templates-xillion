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
interface NumberCounterSceneData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  durationFrames: number;
  target: number;
  prefix?: string;
  suffix?: string;
  label?: string;
  decimals?: number;
  fontSize?: number;
  particleCount?: number;
  glowColor?: string;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
}

interface Props {
  data: NumberCounterSceneData;
}

/* ─── Sub-components ─── */
const Particles: React.FC<{
  count: number;
  frame: number;
  totalFrames: number;
  color: string;
  width: number;
  height: number;
}> = ({ count, frame, totalFrames, color, width, height }) => {
  const exitStart = totalFrames * 0.85;
  const exitOp = interpolate(frame, [exitStart, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const particles = React.useMemo(() => {
    const p = [];
    for (let i = 0; i < count; i++) {
      const seed = ((i * 7919 + 1013) % 1000) / 1000;
      const seed2 = ((i * 6271 + 3571) % 1000) / 1000;
      const seed3 = ((i * 4177 + 7127) % 1000) / 1000;
      p.push({
        x: seed * width,
        y: seed2 * height,
        size: 2 + seed3 * 4,
        speed: 0.3 + seed * 0.7,
        phase: seed2 * Math.PI * 2,
        delay: seed3 * 0.5,
      });
    }
    return p;
  }, [count, width, height]);

  return (
    <>
      {particles.map((p, i) => {
        const t = frame / totalFrames;
        const fadeIn = interpolate(t, [p.delay, p.delay + 0.1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const drift = Math.sin(frame * 0.02 * p.speed + p.phase) * 30;
        const rise = -frame * p.speed * 0.8;
        const flicker = 0.3 + 0.7 * Math.sin(frame * 0.05 + p.phase);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x + drift,
              top: p.y + rise,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: color,
              opacity: fadeIn * flicker * exitOp * 0.6,
              filter: `blur(${p.size > 4 ? 1 : 0}px)`,
            }}
          />
        );
      })}
    </>
  );
};

const LightBurst: React.FC<{
  frame: number;
  fps: number;
  triggerFrame: number;
  color: string;
  totalFrames: number;
}> = ({ frame, fps, triggerFrame, color, totalFrames }) => {
  if (frame < triggerFrame) return null;

  const burstProgress = spring({
    frame: frame - triggerFrame,
    fps,
    config: { damping: 20, stiffness: 60, mass: 0.8 },
  });

  const burstOpacity = interpolate(
    frame - triggerFrame,
    [0, 8, 25],
    [0, 0.8, 0],
    { extrapolateRight: "clamp" }
  );

  const scale = interpolate(burstProgress, [0, 1], [0.2, 2.5]);

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 400,
        height: 400,
        marginLeft: -200,
        marginTop: -200,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}88 0%, ${color}44 30%, transparent 70%)`,
        opacity: burstOpacity,
        transform: `scale(${scale})`,
      }}
    />
  );
};

/* ─── Main Component ─── */
export const NumberCounterScene: React.FC<Props> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalFrames = data.durationFrames || Math.round((data.durationMs / 1000) * fps);
  const target = data.target || 100;
  const prefix = data.prefix || "";
  const suffix = data.suffix || "";
  const label = data.label || "";
  const decimals = data.decimals || 0;
  const fontSize = data.fontSize || 320;
  const particleCount = data.particleCount ?? 40;
  const glowColor = data.glowColor || data.accentColor || "#FF6B35";
  const bgColor = data.bgColor || "#0A0A0A";
  const textColor = data.textColor || "#FFFFFF";

  // Count-up timing: 0-40% of duration (fast, punchy count)
  const countEnd = totalFrames * 0.4;
  const countProgress = interpolate(frame, [8, countEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Spring bounce at the end
  const bounceFrame = Math.round(countEnd);
  const bounce = spring({
    frame: Math.max(0, frame - bounceFrame),
    fps,
    config: { damping: 8, stiffness: 120, mass: 0.4 },
  });
  const bounceScale = frame >= bounceFrame
    ? interpolate(bounce, [0, 1], [1.08, 1])
    : 1;

  // Current number value
  const currentValue = countProgress * target;
  const displayValue = decimals > 0
    ? currentValue.toFixed(decimals)
    : Math.round(currentValue).toLocaleString();

  // Entrance
  const entranceScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.6 },
  });

  // Exit fade
  const exitStart = totalFrames * 0.85;
  const sceneOpacity = interpolate(frame, [0, 6, exitStart, totalFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Glow intensity increases as count progresses
  const glowIntensity = interpolate(countProgress, [0, 0.8, 1], [0, 0.3, 0.8], {
    extrapolateRight: "clamp",
  });

  // Label entrance (delayed)
  const labelEntrance = spring({
    frame: Math.max(0, frame - 15),
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.5 },
  });
  const labelY = interpolate(labelEntrance, [0, 1], [30, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, opacity: sceneOpacity }}>
      {/* Background particles */}
      {particleCount > 0 && (
        <Particles
          count={particleCount}
          frame={frame}
          totalFrames={totalFrames}
          color={glowColor}
          width={data.width || 1080}
          height={data.height || 1920}
        />
      )}

      {/* Radial glow behind number */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 600,
          height: 600,
          marginLeft: -300,
          marginTop: -300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor}${Math.round(glowIntensity * 40).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />

      {/* Light burst on count complete */}
      <LightBurst
        frame={frame}
        fps={fps}
        triggerFrame={bounceFrame}
        color={glowColor}
        totalFrames={totalFrames}
      />

      {/* Number display */}
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
        <div
          style={{
            transform: `scale(${entranceScale * bounceScale})`,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
          }}
        >
          {prefix && (
            <span
              style={{
                fontSize: fontSize * 0.4,
                fontWeight: 700,
                color: glowColor,
                fontFamily: "Inter, Helvetica Neue, Arial, sans-serif",
                marginRight: 8,
              }}
            >
              {prefix}
            </span>
          )}
          <span
            style={{
              fontSize,
              fontWeight: 900,
              color: textColor,
              fontFamily: "Inter, Helvetica Neue, Arial, sans-serif",
              lineHeight: 1,
              textShadow: `0 0 ${40 * glowIntensity}px ${glowColor}88, 0 0 ${80 * glowIntensity}px ${glowColor}44`,
              letterSpacing: "-0.02em",
            }}
          >
            {displayValue}
          </span>
          {suffix && (
            <span
              style={{
                fontSize: fontSize * 0.55,
                fontWeight: 700,
                color: glowColor,
                fontFamily: "Inter, Helvetica Neue, Arial, sans-serif",
                marginLeft: 4,
                alignSelf: "flex-end",
                marginBottom: fontSize * 0.08,
              }}
            >
              {suffix}
            </span>
          )}
        </div>

        {/* Label */}
        {label && (
          <div
            style={{
              marginTop: 30,
              fontSize: 36,
              fontWeight: 600,
              color: `${textColor}BB`,
              fontFamily: "Inter, Helvetica Neue, Arial, sans-serif",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity: labelEntrance,
              transform: `translateY(${labelY}px)`,
            }}
          >
            {label}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
