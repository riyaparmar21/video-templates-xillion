import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  random,
} from 'remotion';
import { AbsoluteFill } from 'remotion';
import { TemplateProps } from '../engine/schema';
import {
  fadeIn,
  rgba,
  hexToRgb,
  glowShadow,
  float,
  breathe,
  pulseGlow,
} from '../lib/animations';

/**
 * Simulates audio data using layered sine waves for realistic frequency visualization
 */
function simulateAudio(
  frame: number,
  barIndex: number,
  total: number,
  intensity: number
): number {
  const bass: number = Math.sin(frame * 0.05 + barIndex * 0.1) * 0.4;
  const mid: number = Math.sin(frame * 0.12 + barIndex * 0.3) * 0.3;
  const treble: number = Math.sin(frame * 0.25 + barIndex * 0.8) * 0.2;
  const noise: number = Math.sin(frame * 0.7 + barIndex * 2.1) * 0.1;

  // Bass frequencies concentrated on left, treble on right
  const freqWeight: number = barIndex / total;
  const value: number =
    bass * (1 - freqWeight) +
    mid * 0.5 +
    treble * freqWeight +
    noise * intensity;

  return Math.max(0.05, Math.min(1, (value + 1) / 2));
}

/**
 * Bars preset - Classic equalizer visualization
 */
function BarVisualizer(props: {
  frame: number;
  width: number;
  height: number;
  barCount: number;
  intensity: number;
  mirror: boolean;
  colorMode: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}): React.ReactElement {
  const {
    frame,
    width,
    height,
    barCount,
    intensity,
    mirror,
    colorMode,
    primaryColor,
    secondaryColor,
    accentColor,
  } = props;

  const barWidth: number = width / (barCount * 1.5);
  const gap: number = barWidth * 0.3;
  const maxBarHeight: number = height * 0.6;
  const baseY: number = height * 0.7;

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingBottom: '100px',
      }}
    >
      {Array.from({ length: barCount }).map((_, i: number) => {
        const audioValue: number = simulateAudio(frame, i, barCount, intensity);
        const barHeight: number = audioValue * maxBarHeight;

        const hue: number = (i / barCount) * 360;
        let fillColor: string = primaryColor;
        let glowColor: string = primaryColor;

        if (colorMode === 'rainbow') {
          fillColor = `hsl(${hue}, 100%, 50%)`;
          glowColor = `hsl(${hue}, 100%, 60%)`;
        } else if (colorMode === 'solid') {
          fillColor = primaryColor;
          glowColor = primaryColor;
        } else {
          // gradient mode
          const position: number = i / barCount;
          if (position < 0.5) {
            const t: number = position * 2;
            const r1 = hexToRgb(primaryColor);
            const r2 = hexToRgb(secondaryColor);
            const r: number = Math.round(
              r1.r * (1 - t) + r2.r * t
            );
            const g: number = Math.round(
              r1.g * (1 - t) + r2.g * t
            );
            const b: number = Math.round(
              r1.b * (1 - t) + r2.b * t
            );
            fillColor = `rgb(${r}, ${g}, ${b})`;
            glowColor = `rgb(${r}, ${g}, ${b})`;
          } else {
            const t: number = (position - 0.5) * 2;
            const r2 = hexToRgb(secondaryColor);
            const r3 = hexToRgb(accentColor);
            const r: number = Math.round(
              r2.r * (1 - t) + r3.r * t
            );
            const g: number = Math.round(
              r2.g * (1 - t) + r3.g * t
            );
            const b: number = Math.round(
              r2.b * (1 - t) + r3.b * t
            );
            fillColor = `rgb(${r}, ${g}, ${b})`;
            glowColor = `rgb(${r}, ${g}, ${b})`;
          }
        }

        const boxShadow: string = glowShadow(glowColor, 0.8);

        return (
          <div
            key={i}
            style={{
              width: barWidth - gap,
              height: barHeight,
              backgroundColor: fillColor,
              margin: `0 ${gap / 2}px`,
              borderRadius: '4px',
              boxShadow: boxShadow,
              transform: `scaleY(${audioValue})`,
              transformOrigin: 'bottom',
              transition: 'all 50ms ease-out',
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Circular preset - Radial equalizer visualization
 */
function CircularVisualizer(props: {
  frame: number;
  width: number;
  height: number;
  barCount: number;
  intensity: number;
  colorMode: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}): React.ReactElement {
  const {
    frame,
    width,
    height,
    barCount,
    intensity,
    colorMode,
    primaryColor,
    secondaryColor,
    accentColor,
  } = props;

  const centerX: number = width / 2;
  const centerY: number = height / 2;
  const radius: number = Math.min(width, height) / 3;
  const barLength: number = height * 0.25;

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {Array.from({ length: barCount }).map((_, i: number) => {
        const angle: number = (i / barCount) * 360;
        const audioValue: number = simulateAudio(frame, i, barCount, intensity);
        const scaledHeight: number = audioValue * barLength;

        const hue: number = (i / barCount) * 360;
        let fillColor: string = primaryColor;
        let glowColor: string = primaryColor;

        if (colorMode === 'rainbow') {
          fillColor = `hsl(${hue}, 100%, 50%)`;
          glowColor = `hsl(${hue}, 100%, 60%)`;
        } else if (colorMode === 'solid') {
          fillColor = primaryColor;
          glowColor = primaryColor;
        } else {
          const position: number = i / barCount;
          if (position < 0.5) {
            const t: number = position * 2;
            const r1 = hexToRgb(primaryColor);
            const r2 = hexToRgb(secondaryColor);
            const r: number = Math.round(
              r1.r * (1 - t) + r2.r * t
            );
            const g: number = Math.round(
              r1.g * (1 - t) + r2.g * t
            );
            const b: number = Math.round(
              r1.b * (1 - t) + r2.b * t
            );
            fillColor = `rgb(${r}, ${g}, ${b})`;
            glowColor = `rgb(${r}, ${g}, ${b})`;
          } else {
            const t: number = (position - 0.5) * 2;
            const r2 = hexToRgb(secondaryColor);
            const r3 = hexToRgb(accentColor);
            const r: number = Math.round(
              r2.r * (1 - t) + r3.r * t
            );
            const g: number = Math.round(
              r2.g * (1 - t) + r3.g * t
            );
            const b: number = Math.round(
              r2.b * (1 - t) + r3.b * t
            );
            fillColor = `rgb(${r}, ${g}, ${b})`;
            glowColor = `rgb(${r}, ${g}, ${b})`;
          }
        }

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${centerX}px`,
              top: `${centerY}px`,
              width: '8px',
              height: `${scaledHeight}px`,
              backgroundColor: fillColor,
              borderRadius: '4px',
              boxShadow: glowShadow(glowColor, 0.8),
              transform: `rotate(${angle}deg) translateY(-${
                radius + scaledHeight / 2
              }px)`,
              transformOrigin: '0 0',
              opacity: 0.9,
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Wave preset - Continuous SVG waveform visualization
 */
function WaveVisualizer(props: {
  frame: number;
  width: number;
  height: number;
  barCount: number;
  intensity: number;
  primaryColor: string;
  accentColor: string;
}): React.ReactElement {
  const { frame, width, height, barCount, intensity, primaryColor, accentColor } =
    props;

  const baselineY: number = height / 2;
  const amplitude: number = height * 0.25;
  const pointSpacing: number = width / barCount;

  const points: Array<[number, number]> = Array.from({
    length: barCount + 1,
  }).map((_, i: number): [number, number] => {
    const x: number = i * pointSpacing;
    const audioValue: number = simulateAudio(
      frame,
      i,
      barCount,
      intensity
    );
    const y: number = baselineY - audioValue * amplitude;
    return [x, y];
  });

  let pathD: string = `M 0 ${baselineY}`;
  for (let i: number = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const midX: number = (x0 + x1) / 2;
    const midY: number = (y0 + y1) / 2;
    pathD += ` Q ${x0} ${y0} ${midX} ${midY}`;
  }
  pathD += ` L ${width} ${baselineY}`;

  return (
    <svg
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Filled area */}
      <defs>
        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={primaryColor} stopOpacity={0.6} />
          <stop offset="100%" stopColor={primaryColor} stopOpacity={0.1} />
        </linearGradient>
      </defs>
      <path
        d={pathD}
        fill="url(#waveGradient)"
        stroke="none"
      />
      {/* Stroke line */}
      <path
        d={pathD.replace('M 0', 'M 0').replace('L ' + width, '')}
        fill="none"
        stroke={accentColor}
        strokeWidth={2}
        opacity={0.8}
        style={{
          filter: glowShadow(accentColor, 0.6),
        }}
      />
    </svg>
  );
}

/**
 * Spectrum preset - Filled area chart visualization
 */
function SpectrumVisualizer(props: {
  frame: number;
  width: number;
  height: number;
  barCount: number;
  intensity: number;
  primaryColor: string;
  accentColor: string;
}): React.ReactElement {
  const { frame, width, height, barCount, intensity, primaryColor, accentColor } =
    props;

  const baselineY: number = height * 0.75;
  const layers: number = 3;

  return (
    <svg
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
      }}
    >
      <defs>
        <linearGradient id="spectrumGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={accentColor} stopOpacity={0.8} />
          <stop offset="100%" stopColor={primaryColor} stopOpacity={0.2} />
        </linearGradient>
      </defs>

      {Array.from({ length: layers }).map((_, layerIndex: number) => {
        const layerOffset: number = (layerIndex / layers) * height * 0.1;
        const layerSpeed: number = 0.02 + layerIndex * 0.01;
        const pointSpacing: number = width / barCount;

        let pathD: string = `M 0 ${baselineY}`;

        for (let i: number = 0; i <= barCount; i++) {
          const x: number = i * pointSpacing;
          const audioValue: number = simulateAudio(
            frame + layerIndex * 10,
            i,
            barCount,
            intensity * (1 - layerIndex * 0.2)
          );
          const y: number =
            baselineY -
            audioValue * height * 0.15 -
            layerOffset;
          pathD += ` L ${x} ${y}`;
        }

        pathD += ` L ${width} ${baselineY} Z`;

        return (
          <path
            key={layerIndex}
            d={pathD}
            fill="url(#spectrumGradient)"
            opacity={0.6 - layerIndex * 0.1}
          />
        );
      })}
    </svg>
  );
}

/**
 * Pulse preset - Central pulsing circle with ripples
 */
function PulseVisualizer(props: {
  frame: number;
  width: number;
  height: number;
  barCount: number;
  intensity: number;
  primaryColor: string;
  accentColor: string;
}): React.ReactElement {
  const { frame, width, height, barCount, intensity, primaryColor, accentColor } =
    props;

  const centerX: number = width / 2;
  const centerY: number = height / 2;
  const baseRadius: number = 50;

  // Calculate average audio value for bass-weighted beat
  let totalAudio: number = 0;
  for (let i: number = 0; i < barCount; i++) {
    const weight: number = Math.exp(-i / 10); // Exponential weight favoring lower frequencies
    totalAudio += simulateAudio(frame, i, barCount, intensity) * weight;
  }
  const avgAudio: number = totalAudio / barCount;

  const pulseScale: number = interpolate(
    avgAudio,
    [0, 1],
    [1, 1.5],
    { easing: Easing.ease }
  );

  const rippleCount: number = 3;

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Ripples */}
      {Array.from({ length: rippleCount }).map((_, i: number) => {
        const delay: number = i * 8;
        const offset: number = (frame - delay) % 60;
        const progress: number = offset / 60;
        const rippleRadius: number =
          baseRadius + progress * 150 + avgAudio * 50;
        const rippleOpacity: number = Math.max(
          0,
          1 - progress
        );

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${centerX}px`,
              top: `${centerY}px`,
              width: `${rippleRadius * 2}px`,
              height: `${rippleRadius * 2}px`,
              borderRadius: '50%',
              border: `2px solid ${accentColor}`,
              transform: 'translate(-50%, -50%)',
              opacity: rippleOpacity,
              boxShadow: glowShadow(accentColor, 0.5),
            }}
          />
        );
      })}

      {/* Central circle */}
      <div
        style={{
          position: 'absolute',
          width: `${baseRadius * 2 * pulseScale}px`,
          height: `${baseRadius * 2 * pulseScale}px`,
          borderRadius: '50%',
          backgroundColor: primaryColor,
          boxShadow: `${glowShadow(primaryColor, 1)}, inset 0 0 20px rgba(0,0,0,0.3)`,
          opacity: avgAudio,
        }}
      />
    </div>
  );
}

/**
 * Main AudioWaveform component
 */
export const AudioWaveform: React.FC<TemplateProps> = (props: TemplateProps) => {
  const frame: number = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Extract parameters with defaults
  const preset: string = (props.params?.preset as string) || 'bars';
  const title: string = (props.params?.title as string) || '';
  const subtitle: string = (props.params?.subtitle as string) || '';
  const barCount: number = (props.params?.barCount as number) || 32;
  const intensity: number = (props.params?.intensity as number) || 1;
  const mirror: boolean = props.params?.mirror !== false;
  const colorMode: string = (props.params?.colorMode as string) || 'gradient';

  // Color palette
  const palette = props.palette || {
    primary: '#00FF88',
    secondary: '#FF00FF',
    accent: '#00FFFF',
  };

  const primaryColor: string = palette.primary;
  const secondaryColor: string = palette.secondary;
  const accentColor: string = palette.accent;

  const sceneFadeIn: number = fadeIn(frame, fps, 0.5);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0e27',
        background: 'radial-gradient(circle at center, #1a1f3a 0%, #0a0e27 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Main visualization */}
      <div
        style={{
          width: '100%',
          height: '100%',
          filter: `brightness(${interpolate(sceneFadeIn, [0, 1], [0.5, 1])})`,
        }}
      >
        {preset === 'bars' && (
          <BarVisualizer
            frame={frame}
            width={width}
            height={height}
            barCount={barCount}
            intensity={intensity}
            mirror={mirror}
            colorMode={colorMode}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            accentColor={accentColor}
          />
        )}

        {preset === 'circular' && (
          <CircularVisualizer
            frame={frame}
            width={width}
            height={height}
            barCount={barCount}
            intensity={intensity}
            colorMode={colorMode}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            accentColor={accentColor}
          />
        )}

        {preset === 'wave' && (
          <WaveVisualizer
            frame={frame}
            width={width}
            height={height}
            barCount={barCount}
            intensity={intensity}
            primaryColor={primaryColor}
            accentColor={accentColor}
          />
        )}

        {preset === 'spectrum' && (
          <SpectrumVisualizer
            frame={frame}
            width={width}
            height={height}
            barCount={barCount}
            intensity={intensity}
            primaryColor={primaryColor}
            accentColor={accentColor}
          />
        )}

        {preset === 'pulse' && (
          <PulseVisualizer
            frame={frame}
            width={width}
            height={height}
            barCount={barCount}
            intensity={intensity}
            primaryColor={primaryColor}
            accentColor={accentColor}
          />
        )}

        {/* Subtle reflection at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '100px',
            background: `linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.4))`,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Title and Subtitle Overlay */}
      {(title || subtitle) && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            padding: '40px',
            pointerEvents: 'none',
          }}
        >
          {title && (
            <h1
              style={{
                fontSize: '64px',
                fontWeight: 'bold',
                color: primaryColor,
                margin: 0,
                marginBottom: '20px',
                textShadow: `0 0 20px ${primaryColor}, 0 0 40px ${accentColor}`,
              }}
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <p
              style={{
                fontSize: '32px',
                fontWeight: '300',
                color: accentColor,
                margin: 0,
                textShadow: `0 0 10px ${accentColor}`,
                opacity: 0.8,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};
