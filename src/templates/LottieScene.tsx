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
  scaleIn,
  rgba,
  hexToRgb,
  glowShadow,
  depthShadow,
  float,
  breathe,
  rotate,
  springIn,
  staggerDelay,
  pulseGlow,
} from "../lib/animations";

export const LottieScene: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Params with defaults
  const preset = (params.preset as string) || "confetti";
  const title = (params.title as string) || "";
  const subtitle = (params.subtitle as string) || "";
  const intensity = (params.intensity as number) || 1;
  const looping = params.looping !== false;
  const primaryColor = (params.primaryColor as string) || palette.primary;
  const secondaryColor = (params.secondaryColor as string) || palette.secondary;

  // Calculate normalized frame for looping
  const loopDuration = looping ? sceneDurationFrames : sceneDurationFrames + 1000;
  const normalizedFrame = looping ? frame % loopDuration : frame;

  // ─────────────────────────────────────────────────────────────────
  // CONFETTI PRESET
  // ─────────────────────────────────────────────────────────────────
  const renderConfetti = (): JSX.Element => {
    const particleCount = Math.floor(35 * intensity);
    const particles = Array.from({ length: particleCount }, (_, i) => {
      const seed = `confetti-${i}`;
      const startX = random(seed + "-x") * width;
      const startY = -20;
      const endY = height + 40;
      const duration = 80 + random(seed + "-dur") * 40;
      const delay = Math.round(random(seed + "-delay") * 40);
      const rotationSpeed = 180 + random(seed + "-rot") * 540;
      const drift = (random(seed + "-drift") - 0.5) * width * 0.3;
      const colorIdx = Math.floor(random(seed + "-color") * 3);
      const colors = [primaryColor, secondaryColor, palette.accent];
      const size = 6 + random(seed + "-size") * 10;

      return {
        id: i,
        startX,
        startY,
        endY,
        duration,
        delay,
        rotationSpeed,
        drift,
        color: colors[colorIdx],
        size,
        seed,
      };
    });

    return (
      <>
        {particles.map((p) => {
          const frameInParticle = Math.max(0, normalizedFrame - p.delay);
          const isActive = frameInParticle < p.duration;
          const progress = isActive ? frameInParticle / p.duration : 1;
          const opacity = isActive ? 1 - Math.pow(progress, 2) : 0;
          const y = p.startY + (p.endY - p.startY) * progress;
          const x = p.startX + p.drift * Math.sin(progress * Math.PI);
          const rotation = (frameInParticle / fps) * p.rotationSpeed;

          return (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${x}px`,
                top: `${y}px`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: p.color,
                opacity: opacity,
                transform: `rotate(${rotation}deg)`,
                pointerEvents: "none",
              }}
            />
          );
        })}
      </>
    );
  };

  // ─────────────────────────────────────────────────────────────────
  // CHECKMARK PRESET
  // ─────────────────────────────────────────────────────────────────
  const renderCheckmark = (): JSX.Element => {
    const centerX = width / 2;
    const centerY = height / 2;
    const circleRadius = 80 * intensity;
    const checkmarkStrokeWidth = 8 * intensity;

    // Circle drawing: frames 0-20
    const circleProgress = Math.min(1, normalizedFrame / 20);
    const circleDashOffset =
      Math.PI * 2 * circleRadius * (1 - circleProgress);

    // Checkmark drawing: frames 15-35
    const checkProgress = Math.max(
      0,
      Math.min(1, (normalizedFrame - 15) / 20)
    );
    const checkDashOffset = 180 * (1 - checkProgress);

    // Pulse after frame 35
    const pulseStart = 35;
    const pulseFade = normalizedFrame > pulseStart ? 1 : 0;
    const pulseScale = 1 + breathe(normalizedFrame - pulseStart, 20, 0.05);

    return (
      <svg
        width={width}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      >
        {/* Circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={circleRadius}
          stroke={primaryColor}
          strokeWidth={checkmarkStrokeWidth}
          fill="none"
          strokeDasharray={Math.PI * 2 * circleRadius}
          strokeDashoffset={circleDashOffset}
          strokeLinecap="round"
          opacity={Math.min(1, normalizedFrame / 25)}
        />

        {/* Checkmark */}
        <g
          opacity={Math.max(circleProgress, checkProgress)}
          transform={`translate(${centerX}, ${centerY}) scale(${pulseFade > 0 ? pulseScale : 1})`}
          transformOrigin={`0 0`}
          style={{
            transformBox: "fill-box",
          }}
        >
          <polyline
            points={`${-circleRadius * 0.3},${circleRadius * 0.2} ${-circleRadius * 0.05},${circleRadius * 0.45} ${circleRadius * 0.4},${-circleRadius * 0.25}`}
            stroke={primaryColor}
            strokeWidth={checkmarkStrokeWidth}
            fill="none"
            strokeDasharray="180"
            strokeDashoffset={checkDashOffset}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Glow effect */}
        {normalizedFrame > 30 && (
          <circle
            cx={centerX}
            cy={centerY}
            r={circleRadius}
            stroke={primaryColor}
            strokeWidth={2}
            fill="none"
            opacity={pulseGlow(normalizedFrame - 30, 20, 0.1, 0.4)}
            filter="blur(2px)"
          />
        )}
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────
  // LOADING PRESET
  // ─────────────────────────────────────────────────────────────────
  const renderLoading = (): JSX.Element => {
    const centerX = width / 2;
    const centerY = height / 2;
    const dotRadius = 8 * intensity;
    const orbitRadius = 60 * intensity;
    const dotCount = 3;

    const dots = Array.from({ length: dotCount }, (_, i) => {
      const staggerFrames = 5;
      const bounceHeight = 30 * intensity;
      const delay = i * staggerFrames;
      const frameInDot = (normalizedFrame - delay + dotCount * staggerFrames) %
        (dotCount * staggerFrames);
      const progress = frameInDot / staggerFrames;

      // Spring bounce
      const bounceY = spring({
        frame: frameInDot,
        fps,
        config: {
          damping: 10,
          stiffness: 200,
          mass: 0.5,
        },
      });
      const yOffset = (1 - bounceY) * bounceHeight;

      return {
        id: i,
        index: i,
        angle: (i / dotCount) * Math.PI * 2,
        yOffset,
        opacity: 1,
      };
    });

    return (
      <svg
        width={width}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      >
        {/* Spinner track */}
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius}
          stroke={rgba(primaryColor, 0.15)}
          strokeWidth={3}
          fill="none"
        />

        {/* Bouncing dots */}
        {dots.map((d) => {
          const x =
            centerX + Math.cos(d.angle) * orbitRadius;
          const y = centerY + Math.sin(d.angle) * orbitRadius - d.yOffset;

          return (
            <circle
              key={d.id}
              cx={x}
              cy={y}
              r={dotRadius}
              fill={primaryColor}
              opacity={d.opacity}
            />
          );
        })}

        {/* Rotating spinner overlay */}
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius}
          stroke={primaryColor}
          strokeWidth={3}
          fill="none"
          strokeDasharray={`${(Math.PI * 2 * orbitRadius) / 4} ${(Math.PI * 2 * orbitRadius * 3) / 4}`}
          strokeDashoffset={rotate(normalizedFrame, 360, fps) * 2}
          strokeLinecap="round"
          opacity={0.6}
        />
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────
  // CELEBRATION PRESET
  // ─────────────────────────────────────────────────────────────────
  const renderCelebration = (): JSX.Element => {
    const centerX = width / 2;
    const centerY = height / 2;
    const particleCount = Math.floor(25 * intensity);
    const burstDuration = 40;

    // Burst phase particles
    const burstParticles = Array.from(
      { length: particleCount },
      (_, i) => {
        const seed = `burst-${i}`;
        const angle = (i / particleCount) * Math.PI * 2;
        const speed = 4 + random(seed + "-speed") * 6;
        const distance = speed * burstDuration;
        const size = 4 + random(seed + "-size") * 12;
        const colorIdx = Math.floor(random(seed + "-color") * 3);
        const colors = [primaryColor, secondaryColor, palette.accent];

        return {
          id: i,
          angle,
          distance,
          size,
          color: colors[colorIdx],
          seed,
        };
      }
    );

    return (
      <>
        {/* Burst particles */}
        {burstParticles.map((p) => {
          const isBurstPhase = normalizedFrame < burstDuration;
          const progress = isBurstPhase
            ? normalizedFrame / burstDuration
            : 1;
          const distance = p.distance * progress;
          const opacity = isBurstPhase
            ? 1 - Math.pow(progress, 1.5)
            : 0;

          const x = centerX + Math.cos(p.angle) * distance;
          const y = centerY + Math.sin(p.angle) * distance;

          return (
            <div
              key={`burst-${p.id}`}
              style={{
                position: "absolute",
                left: `${x}px`,
                top: `${y}px`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: p.color,
                borderRadius: "50%",
                opacity: opacity,
                pointerEvents: "none",
              }}
            />
          );
        })}

        {/* Confetti rain after burst */}
        {normalizedFrame > burstDuration && renderConfetti()}

        {/* Center glow pulse */}
        <div
          style={{
            position: "absolute",
            left: `${centerX}px`,
            top: `${centerY}px`,
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${rgba(primaryColor, 0.6)} 0%, transparent 70%)`,
            transform: "translate(-50%, -50%)",
            opacity: Math.max(0, 1 - normalizedFrame / burstDuration),
            filter: `blur(${20 + (normalizedFrame / burstDuration) * 30}px)`,
            pointerEvents: "none",
          }}
        />
      </>
    );
  };

  // ─────────────────────────────────────────────────────────────────
  // WAVES PRESET
  // ─────────────────────────────────────────────────────────────────
  const renderWaves = (): JSX.Element => {
    const waveCount = 6;
    const waveHeight = height / (waveCount + 1);
    const amplitude = 30 * intensity;
    const frequency = 0.02;
    const phase = (normalizedFrame / fps) * 2;

    const waves = Array.from({ length: waveCount }, (_, i) => {
      const seedPhase = (i / waveCount) * Math.PI;
      const t = (primaryColor: string, alpha: number): string =>
        rgba(primaryColor, alpha);

      // Gradient from primary to secondary
      const ratio = i / (waveCount - 1);
      const startRgb = hexToRgb(primaryColor);
      const endRgb = hexToRgb(secondaryColor);
      const currentRgb = {
        r: Math.round(startRgb.r + (endRgb.r - startRgb.r) * ratio),
        g: Math.round(startRgb.g + (endRgb.g - startRgb.g) * ratio),
        b: Math.round(startRgb.b + (endRgb.b - startRgb.b) * ratio),
      };
      const waveColor = `rgb(${currentRgb.r},${currentRgb.g},${currentRgb.b})`;

      return {
        id: i,
        yOffset: waveHeight * (i + 1),
        phase: seedPhase,
        color: waveColor,
      };
    });

    return (
      <svg
        width={width}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      >
        {waves.map((w) => {
          const points: string[] = [];
          for (let x = 0; x <= width; x += 20) {
            const y =
              w.yOffset +
              Math.sin(x * frequency + phase + w.phase) * amplitude;
            points.push(`${x},${y}`);
          }
          points.push(`${width},${height}`);
          points.push("0," + height);

          return (
            <polyline
              key={w.id}
              points={points.join(" ")}
              fill={w.color}
              stroke="none"
              opacity={0.6 + (w.id / waveCount) * 0.4}
            />
          );
        })}
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────
  // PULSE RINGS PRESET
  // ─────────────────────────────────────────────────────────────────
  const renderPulseRings = (): JSX.Element => {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 3;
    const ringSpawnInterval = 15;
    const ringDuration = 60;
    const maxRings = Math.ceil(sceneDurationFrames / ringSpawnInterval);

    const rings: Array<{
      id: number;
      birthFrame: number;
    }> = [];
    for (let i = 0; i < maxRings; i++) {
      const birthFrame = i * ringSpawnInterval;
      if (birthFrame <= normalizedFrame) {
        rings.push({
          id: i,
          birthFrame,
        });
      }
    }

    return (
      <svg
        width={width}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      >
        {rings.map((r) => {
          const age = normalizedFrame - r.birthFrame;
          const progress = Math.min(1, age / ringDuration);
          const radius = maxRadius * progress;
          const opacity = 1 - Math.pow(progress, 0.6);

          return (
            <circle
              key={r.id}
              cx={centerX}
              cy={centerY}
              r={radius}
              stroke={primaryColor}
              strokeWidth={3}
              fill="none"
              opacity={opacity}
            />
          );
        })}
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────
  // BOUNCE DOTS PRESET
  // ─────────────────────────────────────────────────────────────────
  const renderBounceDots = (): JSX.Element => {
    const gridSize = 5;
    const dotRadius = 8 * intensity;
    const spacing = 80 * intensity;
    const totalWidth = (gridSize - 1) * spacing;
    const totalHeight = (gridSize - 1) * spacing;
    const startX = (width - totalWidth) / 2;
    const startY = (height - totalHeight) / 2;
    const waveAmplitude = 40 * intensity;
    const waveFrequency = 0.08;

    const dots: Array<{
      row: number;
      col: number;
    }> = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        dots.push({ row, col });
      }
    }

    return (
      <>
        {dots.map((d) => {
          const x = startX + d.col * spacing;
          const baseY = startY + d.row * spacing;
          const phaseOffset =
            (d.row + d.col) * 0.3;
          const yOffset =
            Math.sin(
              (normalizedFrame / fps) * 3 + phaseOffset
            ) * waveAmplitude;
          const y = baseY + yOffset;

          return (
            <div
              key={`dot-${d.row}-${d.col}`}
              style={{
                position: "absolute",
                left: `${x}px`,
                top: `${y}px`,
                width: `${dotRadius * 2}px`,
                height: `${dotRadius * 2}px`,
                borderRadius: "50%",
                background: primaryColor,
                transform: "translate(-50%, -50%)",
                opacity: 0.7 + (Math.sin((normalizedFrame / fps) * 2 + phaseOffset) + 1) * 0.15,
                pointerEvents: "none",
              }}
            />
          );
        })}
      </>
    );
  };

  // ─────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────
  const renderPreset = (): JSX.Element => {
    switch (preset) {
      case "checkmark":
        return renderCheckmark();
      case "loading":
        return renderLoading();
      case "celebration":
        return renderCelebration();
      case "waves":
        return renderWaves();
      case "pulse_rings":
        return renderPulseRings();
      case "bounce_dots":
        return renderBounceDots();
      case "confetti":
      default:
        return renderConfetti();
    }
  };

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        overflow: "hidden",
      }}
    >
      {/* Background subtle glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "800px",
          height: "800px",
          background: `radial-gradient(circle, ${rgba(primaryColor, 0.08)} 0%, transparent 60%)`,
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      {/* Main animation content */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {renderPreset()}
      </div>

      {/* Title overlay */}
      {title && (
        <div
          style={{
            position: "absolute",
            top: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "48px",
            fontWeight: 700,
            color: palette.text,
            fontFamily: typography.heading,
            opacity: fadeIn(frame, 10, 20),
            textAlign: "center",
            zIndex: 10,
            maxWidth: "90%",
          }}
        >
          {title}
        </div>
      )}

      {/* Subtitle overlay */}
      {subtitle && (
        <div
          style={{
            position: "absolute",
            bottom: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "20px",
            fontWeight: 400,
            color: rgba(palette.text, 0.8),
            fontFamily: typography.body,
            opacity: fadeIn(frame, 20, 15),
            textAlign: "center",
            zIndex: 10,
            maxWidth: "90%",
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
};
